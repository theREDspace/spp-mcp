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

export function reauthRewriteMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const chunks: Buffer[] = [];
  const originalEnd = res.end.bind(res);
  const originalWrite = res.write.bind(res);

  (res as any).write = (chunk: any): boolean => {
    if (chunk != null) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    return true;
  };

  (res as any).end = (chunk?: any): Response => {
    if (chunk != null) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }

    res.write = originalWrite;
    res.end = originalEnd;

    const body = Buffer.concat(chunks).toString('utf8');

    if (isAuthErrorBody(body)) {
      const challenge = buildBearerChallenge([
        'error="invalid_token"',
        'error_description="Access token rejected by upstream"',
      ]);
      res
        .status(401)
        .set('WWW-Authenticate', challenge)
        .json({
          error: 'invalid_token',
          error_description: 'SPP access token was rejected. The client should refresh or re-authenticate.',
        });
      return res;
    }

    originalEnd.call(res, body);
    return res;
  };

  next();
}
