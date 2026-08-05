/**
 * Turns a tool-level auth failure into a transport-level 401 so clients
 * re-authenticate on their own.
 *
 * The problem: when an SPP token expires, tools return an AUTH_ERROR *result*.
 * At the HTTP layer that is a perfectly successful 200, so a client has no reason
 * to refresh anything and the user just sees an error where their data should be.
 *
 * The fix: buffer the /mcp response, look for an AUTH_ERROR payload (in a single
 * response or any element of a batch), and if present replace the whole thing with
 * a 401 carrying a spec-compliant WWW-Authenticate challenge. Clients that
 * understand the challenge re-authenticate silently.
 *
 * This means overriding `writeHead`, `write`, and `end`, which makes the middleware
 * sensitive to how downstream code produces responses. Two constraints follow:
 *
 * - SSE responses must never be buffered — an open stream would hang forever — and
 *   stream detection has to check both `writeHead` headers and `setHeader`, since
 *   Node permits either shape.
 * - Both transport eras must behave identically here. `reauthRewrite.eras.test.ts`
 *   pins that parity; run it after touching anything in this file.
 */
import { Request, Response, NextFunction } from 'express';
import { buildBearerChallenge } from '../utils/authChallenge';
import { AUTH_ERROR_TYPE } from '../mcp/helpers/toolResult';

function hasAuthError(result: any): boolean {
  if (!result?.isError) return false;
  if (result.structuredContent?.type === AUTH_ERROR_TYPE) return true;
  const textContent = (result.content ?? []).find((c: any) => c.type === 'text');
  if (!textContent) return false;
  try {
    const inner = JSON.parse(textContent.text);
    return inner?.type === AUTH_ERROR_TYPE;
  } catch {
    return false;
  }
}

function isAuthErrorBody(body: string): boolean {
  try {
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed)) {
      return parsed.some((item) => hasAuthError(item?.result));
    }
    return hasAuthError(parsed?.result);
  } catch {
    return false;
  }
}

function toBuffer(chunk: any): Buffer {
  if (chunk == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  return Buffer.from(String(chunk));
}

export function reauthRewriteMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const chunks: Buffer[] = [];
  let capturedStatusCode: number | undefined;
  let capturedHeaders: Record<string, string | string[] | number> | undefined;

  const originalWriteHead = res.writeHead.bind(res);
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  let isEventStream = false;

  /**
   * True when the response is (or is becoming) an SSE stream, which must never
   * be buffered — buffering an open stream hangs the request forever.
   *
   * Checks BOTH sources deliberately. The headers handed to `writeHead` are the
   * path the MCP SDK's Node adapter currently takes, but Node also permits
   * `res.setHeader('Content-Type', …)` followed by `res.write(…)` with no
   * explicit `writeHead` (headers are then sent implicitly on first write). In
   * that shape `capturedHeaders` is never populated, so relying on it alone
   * would silently buffer the stream. `subscriptions/listen` is served over SSE
   * regardless of `responseMode: 'json'`, so this path is reachable.
   */
  const detectEventStream = (): boolean => {
    const fromWriteHead = capturedHeaders?.['Content-Type'] ?? capturedHeaders?.['content-type'];
    if (typeof fromWriteHead === 'string' && fromWriteHead.startsWith('text/event-stream')) return true;
    const fromSetHeader = typeof res.getHeader === 'function' ? res.getHeader('content-type') : undefined;
    return typeof fromSetHeader === 'string' && fromSetHeader.startsWith('text/event-stream');
  };

  /** Stop intercepting and hand control back to Node's real methods. */
  const restoreOriginals = (): void => {
    res.writeHead = originalWriteHead;
    res.write = originalWrite;
    res.end = originalEnd;
  };

  // Intercept writeHead — defer it so we can rewrite status/headers if needed
  (res as any).writeHead = (statusCode: number, headersOrReason?: any, headers?: any): Response => {
    capturedStatusCode = statusCode;
    capturedHeaders = (typeof headersOrReason === 'object' && headersOrReason !== null)
      ? headersOrReason
      : headers;
    if (detectEventStream()) {
      isEventStream = true;
      originalWriteHead(statusCode, capturedHeaders);
    }
    return res;
  };

  (res as any).write = (chunk: any): boolean => {
    // Re-check on first write: the Content-Type may have been set via
    // setHeader() with no writeHead() call, in which case writeHead's check
    // never ran and buffering here would hang an SSE stream.
    if (!isEventStream && detectEventStream()) {
      isEventStream = true;
      restoreOriginals();
      // Flush anything already buffered, in order, before this chunk.
      for (const buffered of chunks) originalWrite(buffered);
      chunks.length = 0;
      return originalWrite(chunk);
    }
    if (isEventStream) return originalWrite(chunk);
    const buf = toBuffer(chunk);
    if (buf.length > 0) chunks.push(buf);
    return true;
  };

  (res as any).end = (chunk?: any, encoding?: any, callback?: any): Response => {
    if (isEventStream || detectEventStream()) {
      restoreOriginals();
      // Flush anything buffered before the stream was recognized, matching the
      // write interceptor. Only reachable if a non-SSE write preceded a
      // setHeader to text/event-stream, but silently dropping already-buffered
      // bytes would be a data-loss bug rather than a passthrough.
      for (const buffered of chunks) originalWrite(buffered);
      chunks.length = 0;
      return originalEnd(chunk, encoding, callback);
    }

    const buf = toBuffer(chunk);
    if (buf.length > 0) chunks.push(buf);

    restoreOriginals();

    const body = Buffer.concat(chunks).toString('utf8');
    const enc = (typeof encoding === 'string' ? encoding : 'utf8') as BufferEncoding;
    const cb = typeof encoding === 'function' ? encoding : (typeof callback === 'function' ? callback : undefined);

    if (isAuthErrorBody(body)) {
      const challenge = buildBearerChallenge([
        'error="invalid_token"',
        'error_description="Access token rejected by upstream"',
      ]);
      res.writeHead(401, {
        'WWW-Authenticate': challenge,
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          error: 'invalid_token',
          error_description: 'SPP access token was rejected. The client should refresh or re-authenticate.',
        }),
        enc,
        cb,
      );
      return res;
    }

    if (capturedStatusCode !== undefined) {
      res.writeHead(capturedStatusCode, capturedHeaders ?? {});
    }
    res.end(body, enc, cb);
    return res;
  };

  next();
}
