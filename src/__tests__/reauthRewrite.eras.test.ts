import http, { type Server } from 'node:http';
import express from 'express';

jest.mock('../clients/SPPClient', () => {
  // Use the real SPPAuthError class (not just an object with `name` set to
  // the string 'SPPAuthError') — fail() in src/mcp/helpers/toolResult.ts
  // branches on `error instanceof SPPAuthError`, so a duck-typed Error would
  // silently fall through to the generic TOOL_ERROR path and this test would
  // pass or fail for the wrong reason.
  const { SPPAuthError } = jest.requireActual('../clients/errors');
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      // whoami() is the simplest tool call path; make it always throw the
      // same SPPAuthError shape wrapTool/classifySppError already handle.
      whoami: jest.fn().mockRejectedValue(
        new SPPAuthError({ code: 'AUTH_INVALID', message: 'token expired' })
      ),
    })),
  };
});

async function withFullStack(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.APP_BASE_URL = 'https://example.com';
  // loadConfig() (called inside transport.ts's router to read MCP_LEGACY)
  // validates the entire env schema on every call — set every required
  // field, not just APP_BASE_URL (which config.ts treats as optional anyway).
  Object.assign(process.env, {
    SPP_URL: 'https://spp.example.com',
    SPP_CLIENT_ID: 'test-client-id',
    SPP_CLIENT_SECRET: 'test-client-secret',
    SPP_CALLBACK_URL: 'https://spp.example.com/callback',
    SPP_NAMESPACE: 'test-namespace',
    SPP_KEY: 'test-key',
  });
  const { initializeMcpTransport } = await import('../mcp/transport');
  const { bearerAuthMiddleware } = await import('../middleware/bearerAuth');
  const { reauthRewriteMiddleware } = await import('../middleware/reauthRewrite');
  const app = express();
  app.use(express.json());
  const router = await initializeMcpTransport();
  app.use('/mcp', bearerAuthMiddleware, reauthRewriteMiddleware, router);
  const server: Server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('failed to bind test server');
  const baseUrl = `http://127.0.0.1:${address.port}/mcp`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

describe('forced-reauthentication parity across legacy and modern legs', () => {
  it('legacy tools/call surfaces an expired SPP token as HTTP 401 + WWW-Authenticate', async () => {
    await withFullStack(async (baseUrl) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: 'Bearer expired-token',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'whoami', arguments: {} },
        }),
      });
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain('error="invalid_token"');
    });
  });

  it('modern tools/call surfaces an expired SPP token as HTTP 401 + WWW-Authenticate identically', async () => {
    await withFullStack(async (baseUrl) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: 'Bearer expired-token',
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/call',
          'Mcp-Name': 'whoami',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'whoami',
            arguments: {},
            _meta: {
              'io.modelcontextprotocol/protocolVersion': '2026-07-28',
              'io.modelcontextprotocol/clientInfo': { name: 'parity-test', version: '0.0.0' },
              'io.modelcontextprotocol/clientCapabilities': {},
            },
          },
        }),
      });
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain('error="invalid_token"');
    });
  });
});
