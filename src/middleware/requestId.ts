import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Adds a stable request id (X-Request-Id) to every request and echoes it
 * in the response. Logs and downstream errors can include `req.requestId` to
 * correlate a single user action across MCP tool calls, OAuth proxy hops,
 * and SPP API requests.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('X-Request-Id');
  const id = incoming && /^[A-Za-z0-9._-]{1,128}$/.test(incoming) ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
