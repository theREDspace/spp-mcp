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
    // SPPClient's constructor throws if SPP_URL is unset (src/clients/SPPClient.ts:35-38).
    // buildServer() constructs one per request regardless of whether the tool
    // being called ever uses it, so every request through this transport needs
    // it set even for requests (like initialize) that never touch SPP.
    process.env.SPP_URL = 'https://spp.example.com';
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
