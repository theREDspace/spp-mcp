import { Request, Response, NextFunction } from 'express';
import { reauthRewriteMiddleware } from '../middleware/reauthRewrite';

// Helpers to build mock Express req/res objects
function makeRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: string | undefined;
  let writeHeadCalled = false;
  let writeHeadStatus: number | undefined;

  const res = {
    statusCode,
    headersSent: false,
    write: jest.fn(),
    end: jest.fn(),
    writeHead(code: number, hdrs?: any) {
      writeHeadCalled = true;
      writeHeadStatus = code;
      res.statusCode = code;
      if (hdrs) Object.assign(headers, hdrs);
      return res;
    },
    set(k: string, v: string) { headers[k] = v; return res; },
    json(data: any) {
      body = JSON.stringify(data);
      res.end(body);
      return res;
    },
    _headers: headers,
    _body: () => body,
    _status: () => res.statusCode,
    _writeHeadCalled: () => writeHeadCalled,
    _writeHeadStatus: () => writeHeadStatus,
  } as any;
  return res;
}

function makeReq() {
  return {} as Request;
}

function makeNext(): NextFunction {
  return jest.fn();
}

// Builds a JSON-RPC tool result envelope
function mcpResult(type: string, isError: boolean): object {
  const payload = { type, error: 'test message' };
  return {
    jsonrpc: '2.0',
    id: 1,
    result: {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      structuredContent: payload,
      isError,
    },
  };
}

function runMiddleware(bodyToSend: any): { res: any; next: NextFunction } {
  const req = makeReq();
  const res = makeRes();
  const next = makeNext();

  reauthRewriteMiddleware(req, res, next);
  expect(next).toHaveBeenCalled();

  // Simulate the transport calling res.end() with the body
  res.end(JSON.stringify(bodyToSend));

  return { res, next };
}

describe('reauthRewriteMiddleware', () => {
  beforeEach(() => {
    process.env.APP_BASE_URL = 'https://example.com';
  });

  it('rewrites AUTH_ERROR result to 401 with WWW-Authenticate header', () => {
    const body = mcpResult('AUTH_ERROR', true);
    const { res } = runMiddleware(body);

    expect(res._status()).toBe(401);
    expect(res._headers['WWW-Authenticate']).toContain('Bearer realm="spp-mcp"');
    expect(res._headers['WWW-Authenticate']).toContain('resource_metadata=');
    expect(res._headers['WWW-Authenticate']).toContain('invalid_token');
  });

  it('passes through a successful result (isError: false) unchanged', () => {
    const body = mcpResult('SOME_TYPE', false);
    const { res } = runMiddleware(body);

    // Should not rewrite — original end was called, status stays 200
    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('passes through PERMISSION_DENIED error unchanged', () => {
    const body = mcpResult('PERMISSION_DENIED', true);
    const { res } = runMiddleware(body);

    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('passes through non-JSON body unchanged', () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    reauthRewriteMiddleware(req, res, next);
    res.end('not json at all');

    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('rewrites batch response containing an AUTH_ERROR to 401', () => {
    const batch = [
      mcpResult('AUTH_ERROR', true),
      mcpResult('AUTH_ERROR', true),
    ];
    const { res } = runMiddleware(batch);

    expect(res._status()).toBe(401);
    expect(res._headers['WWW-Authenticate']).toContain('Bearer realm="spp-mcp"');
  });

  it('passes through batch with no AUTH_ERROR unchanged', () => {
    const batch = [
      mcpResult('NOT_FOUND', true),
      mcpResult('PERMISSION_DENIED', true),
    ];
    const { res } = runMiddleware(batch);

    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('calls next()', () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    reauthRewriteMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('handles real Hono call sequence: writeHead → write(Uint8Array) → end()', () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    reauthRewriteMiddleware(req, res, next);

    const body = mcpResult('AUTH_ERROR', true);
    const encoded = new TextEncoder().encode(JSON.stringify(body));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(new Uint8Array(encoded));
    res.end();

    expect(res._status()).toBe(401);
    expect(res._headers['WWW-Authenticate']).toContain('Bearer realm="spp-mcp"');
  });

  it('passes through Uint8Array body for non-auth result', () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    reauthRewriteMiddleware(req, res, next);

    const body = mcpResult('NOT_FOUND', true);
    const encoded = new TextEncoder().encode(JSON.stringify(body));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(new Uint8Array(encoded));
    res.end();

    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('rewrites mixed batch (AUTH_ERROR + success) to 401', () => {
    const batch = [
      mcpResult('AUTH_ERROR', true),
      mcpResult('SOME_TYPE', false),
    ];
    const { res } = runMiddleware(batch);

    expect(res._status()).toBe(401);
    expect(res._headers['WWW-Authenticate']).toContain('Bearer realm="spp-mcp"');
  });
});
