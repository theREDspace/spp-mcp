import http, { type Server } from 'node:http';
import express from 'express';

async function withTestServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const { initializeMcpTransport } = await import('../mcp/transport');
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

function modernEnvelope(method: string, params: Record<string, unknown> = {}) {
  return {
    jsonrpc: '2.0',
    id: 1,
    method,
    params: {
      ...params,
      _meta: {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientInfo': { name: 'eras-test', version: '0.0.0' },
        'io.modelcontextprotocol/clientCapabilities': {},
      },
    },
  };
}

describe('dual-era /mcp routing (MCP_LEGACY=serve, the default)', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.MCP_LEGACY;
    // SPPClient's constructor throws if SPP_URL is unset (src/clients/SPPClient.ts:35-38).
    // buildServer() constructs one per request regardless of which tool (if any)
    // is called, so every request through this transport needs it set — this bit
    // Task 3's characterization test too; see that task's report for the discovery.
    //
    // This task's router additionally calls config.load() per request (to read
    // MCP_LEGACY), which validates the *entire* env schema (src/config.ts), not
    // just SPP_URL — the legacy-only Task 3 router never called load() at all.
    // Same root cause as the SPP_URL note above (a downstream construct/validate
    // step throwing on env it doesn't actually need for these test requests), so
    // the full minimal-valid set is provided here rather than escalating.
    Object.assign(process.env, {
      SPP_URL: 'https://spp.example.com',
      SPP_CLIENT_ID: 'test-client-id',
      SPP_CLIENT_SECRET: 'test-client-secret',
      SPP_CALLBACK_URL: 'https://spp.example.com/callback/spp',
      SPP_NAMESPACE: 'test-namespace',
      SPP_KEY: 'test-key',
    });
  });

  it('legacy initialize still returns JSON, not SSE', async () => {
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
            clientInfo: { name: 'eras-test', version: '0.0.0' },
          },
        }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(res.headers.get('content-type')).not.toContain('text/event-stream');
    });
  });

  it('a modern server/discover request routes to the modern leg', async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'server/discover',
        },
        body: JSON.stringify(modernEnvelope('server/discover')),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.result?.supportedVersions).toContain('2026-07-28');
      expect(body.result?.capabilities?.tools).toBeDefined();
      expect(body.result?.capabilities?.resources).toBeDefined();
      expect(body.result?.instructions).toEqual(expect.any(String));
      expect(body.result?._meta?.['io.modelcontextprotocol/serverInfo']?.name).toBeDefined();
      expect(body.result?.ttlMs).toBe(3_600_000);
      expect(body.result?.cacheScope).toBe('public');
    });
  });

  it('modern tools/list is name-sorted, carries cache hints, and carries annotations', async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/list',
        },
        body: JSON.stringify(modernEnvelope('tools/list')),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      const names: string[] = body.result.tools.map((t: any) => t.name);
      const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      expect(names).toEqual(sorted);
      expect(body.result.ttlMs).toBe(3_600_000);
      expect(body.result.cacheScope).toBe('public');
      const deleteTool = body.result.tools.find((t: any) => t.name === 'generic_delete');
      expect(deleteTool.annotations.destructiveHint).toBe(true);
    });
  });

  it('GET /mcp returns 405', async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(baseUrl, { method: 'GET' });
      expect(res.status).toBe(405);
    });
  });

  it('DELETE /mcp returns 200 while MCP_LEGACY=serve', async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(baseUrl, { method: 'DELETE' });
      expect(res.status).toBe(200);
    });
  });
});

describe('dual-era /mcp routing (MCP_LEGACY=reject)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.MCP_LEGACY = 'reject';
    Object.assign(process.env, {
      SPP_URL: 'https://spp.example.com',
      SPP_CLIENT_ID: 'test-client-id',
      SPP_CLIENT_SECRET: 'test-client-secret',
      SPP_CALLBACK_URL: 'https://spp.example.com/callback/spp',
      SPP_NAMESPACE: 'test-namespace',
      SPP_KEY: 'test-key',
    });
  });

  afterEach(() => {
    delete process.env.MCP_LEGACY;
  });

  it('a legacy initialize is rejected with UnsupportedProtocolVersionError naming 2026-07-28', async () => {
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
            clientInfo: { name: 'eras-test', version: '0.0.0' },
          },
        }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error?.data?.supported).toContain('2026-07-28');
    });
  });

  it('DELETE /mcp returns 405 while MCP_LEGACY=reject', async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(baseUrl, { method: 'DELETE' });
      expect(res.status).toBe(405);
    });
  });
});
