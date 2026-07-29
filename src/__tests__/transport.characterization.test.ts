import http, { type Server } from 'node:http';
import express from 'express';
import { initializeMcpTransport } from '../mcp/transport';

async function withTestServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = express();
  app.use(express.json());
  const router = await initializeMcpTransport();
  app.use('/mcp', router);
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

describe('legacy /mcp transport (characterization — captures current behavior)', () => {
  beforeAll(() => {
    // The router now reads config.load() (added in Task 4, to check
    // MCP_LEGACY) on every POST/DELETE, and load() validates the entire env
    // schema, not just SPP_URL — so every field src/config.ts requires must
    // be set here, matching the same "minimal valid config" set used by
    // src/__tests__/config.test.ts's setMinimal() helper. In a real
    // deployment this is a non-issue (index.ts calls load() once at startup
    // before accepting any traffic), but this test exercises
    // initializeMcpTransport() in isolation, so it must supply a complete
    // env itself.
    Object.assign(process.env, {
      SPP_URL: 'https://spp.example.com',
      SPP_CLIENT_ID: 'test-client-id',
      SPP_CLIENT_SECRET: 'test-client-secret',
      SPP_CALLBACK_URL: 'https://spp.example.com/callback',
      SPP_NAMESPACE: 'test-namespace',
      SPP_KEY: 'test-key',
    });
  });

  it('responds to a legacy initialize request with a valid InitializeResult', async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'characterization-test', version: '0.0.0' },
          },
        }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
      const body = (await res.json()) as any;
      expect(body.jsonrpc).toBe('2.0');
      expect(body.result?.serverInfo?.name).toBeDefined();
      expect(typeof body.result?.protocolVersion).toBe('string');
    });
  });

  it('DELETE /mcp returns 200 (no-op)', async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(baseUrl, { method: 'DELETE' });
      expect(res.status).toBe(200);
    });
  });
});
