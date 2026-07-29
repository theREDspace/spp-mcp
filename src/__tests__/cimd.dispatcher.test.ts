// Integration test for the DNS-pinning mechanism itself.
//
// Deliberately does NOT mock `undici` or `fetch`: cimd.test.ts mocks fetch, so
// nothing there exercises the real `undiciFetch` + `dispatcher` pairing — the
// exact thing the import was switched to undici's fetch for. If undici ever
// stopped honouring `connect.lookup`, the DNS-rebinding TOCTOU gap would
// reopen and every mocked test would still pass. This file is the guard.
//
// It tests `pinnedDispatcher` directly rather than going through
// `resolveCimdClient`, because the SSRF check correctly refuses loopback
// addresses — so a local test server is unreachable through the full path by
// design. The mechanism under test (does the pinned lookup actually determine
// the TCP target?) is fully covered either way.
import http, { type Server } from 'node:http';
import { fetch as undiciFetch } from 'undici';
import { pinnedDispatcher } from '../routes/cimd';

// The "wrong" pin is IPv6 loopback while the test server binds IPv4-only, so
// the connect is refused immediately and deterministically. A non-routable
// public address (TEST-NET-3) would also never reach the server, but it hangs
// on SYN retransmit rather than failing fast, which just makes the test slow
// and timing-dependent.
const WRONG_PIN = { address: '::1', family: 6 } as const;

describe('pinnedDispatcher (real undici fetch, no mocks)', () => {
  let server: Server;
  let port: number;
  let hits: string[];

  beforeAll(async () => {
    hits = [];
    server = http.createServer((req, res) => {
      hits.push(req.headers.host ?? '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('failed to bind test server');
    port = addr.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  beforeEach(() => {
    hits = [];
  });

  it('routes the connection to the pinned address, not to the URL hostname', async () => {
    // The hostname is deliberately non-resolvable (.invalid, RFC 2606). If
    // undici were resolving DNS itself instead of using our pinned lookup,
    // this could not connect at all — so a 200 here proves the pin is what
    // determined the TCP target.
    const dispatcher = pinnedDispatcher([{ address: '127.0.0.1', family: 4 }]);
    try {
      const res = await undiciFetch(`http://pinned-target.invalid:${port}/doc`, { dispatcher });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ ok: true });
      // Host header still carries the original hostname, which is what keeps
      // TLS SNI / virtual-hosting correct in the real https path.
      expect(hits).toEqual([`pinned-target.invalid:${port}`]);
    } finally {
      await dispatcher.close().catch(() => {});
    }
  });

  it('cannot reach the local server when pinned to a different address', async () => {
    // Identical URL (so identical port), only the pin differs. Whatever error
    // surfaces, the decisive assertion is that our server was never contacted:
    // the pinned address, not the URL, decided where the socket went.
    const dispatcher = pinnedDispatcher([{ ...WRONG_PIN }]);
    try {
      await expect(
        undiciFetch(`http://pinned-target.invalid:${port}/doc`, {
          dispatcher,
          signal: AbortSignal.timeout(3_000),
        })
      ).rejects.toThrow();
    } finally {
      await dispatcher.close().catch(() => {});
    }
    expect(hits).toEqual([]);
  }, 10_000);
});
