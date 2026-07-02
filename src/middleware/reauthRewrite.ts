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

  // Intercept writeHead — defer it so we can rewrite status/headers if needed
  (res as any).writeHead = (statusCode: number, headersOrReason?: any, headers?: any): Response => {
    capturedStatusCode = statusCode;
    capturedHeaders = (typeof headersOrReason === 'object' && headersOrReason !== null)
      ? headersOrReason
      : headers;
    return res;
  };

  (res as any).write = (chunk: any): boolean => {
    const buf = toBuffer(chunk);
    if (buf.length > 0) chunks.push(buf);
    return true;
  };

  (res as any).end = (chunk?: any, encoding?: any, callback?: any): Response => {
    const buf = toBuffer(chunk);
    if (buf.length > 0) chunks.push(buf);

    res.writeHead = originalWriteHead;
    res.write = originalWrite;
    res.end = originalEnd;

    const body = Buffer.concat(chunks).toString('utf8');
    const enc = typeof encoding === 'string' ? encoding : undefined;
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
