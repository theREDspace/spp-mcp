import http, { type Server } from 'node:http';
import express from 'express';
import { originValidation } from '@modelcontextprotocol/express';

async function withOriginGuardServer(
  allowedHostnames: string[],
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = express();
  app.use(originValidation(allowedHostnames));
  app.post('/mcp', (_req, res) => res.status(200).json({ ok: true }));
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

describe('Origin validation on /mcp', () => {
  it('passes a request with no Origin header', async () => {
    await withOriginGuardServer(['localhost'], async (baseUrl) => {
      const res = await fetch(baseUrl, { method: 'POST' });
      expect(res.status).toBe(200);
    });
  });

  it('passes a request from an allowed Origin', async () => {
    await withOriginGuardServer(['localhost'], async (baseUrl) => {
      const res = await fetch(baseUrl, { method: 'POST', headers: { Origin: 'http://localhost:1234' } });
      expect(res.status).toBe(200);
    });
  });

  it('rejects a request from a disallowed Origin with 403', async () => {
    await withOriginGuardServer(['localhost'], async (baseUrl) => {
      const res = await fetch(baseUrl, { method: 'POST', headers: { Origin: 'https://evil.example.com' } });
      expect(res.status).toBe(403);
    });
  });
});
