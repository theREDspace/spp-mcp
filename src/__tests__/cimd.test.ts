import { isIP } from 'node:net';

// resolveCimdClient() resolves DNS for real (via node:dns/promises `lookup`) so
// that the SSRF check inspects actual IP addresses rather than trusting a
// hostname string — that's the whole point of the hardening. But the fixture
// hostnames used below (e.g. app.example.com, cache-test.example.com) are not
// real, resolvable domains, and depending on live DNS/network access to reach
// example.com's real infrastructure would make these tests flaky and
// network-dependent. We mock only DNS resolution, faithfully reproducing
// Node's real behavior for IP-literal hostnames (lookup of an IP literal
// simply returns that same address — verified against the real
// node:dns/promises behavior) and resolving any other hostname to a fixed,
// public, non-blocked IP. The SSRF-blocking logic under test (isDisallowedIp /
// hostIsAllowed in ../routes/cimd) runs completely unmodified against these
// resolved addresses.
jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(async (hostname: string) => {
    const version = isIP(hostname);
    if (version) {
      return [{ address: hostname, family: version }];
    }
    return [{ address: '93.184.216.34', family: 4 }]; // benign public IP (example.com)
  }),
}));

import { resolveCimdClient, _resetCimdCacheForTests } from '../routes/cimd';

describe('resolveCimdClient', () => {
  const realFetch = global.fetch;

  // resolveCimdClient() reads config.CIMD_ALLOWED_HOSTS via config.load(), which
  // validates the full app config schema (SPP_* fields required). These aren't
  // relevant to CIMD itself but must be present for load() to succeed — same
  // pattern used by other test files that exercise config-backed modules
  // (see transport.characterization.test.ts).
  beforeAll(() => {
    Object.assign(process.env, {
      SPP_URL: 'https://spp.example.com',
      SPP_CLIENT_ID: 'cid',
      SPP_CLIENT_SECRET: 'csecret',
      SPP_CALLBACK_URL: 'https://spp.example.com/callback',
      SPP_NAMESPACE: 'ns',
      SPP_KEY: 'key',
    });
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
    // The cache is module-level state keyed by client_id; several tests below
    // reuse the same fixture client_id URL, so it must be cleared between
    // tests to keep them independent (the brief's implementation exports
    // _resetCimdCacheForTests() for exactly this purpose).
    _resetCimdCacheForTests();
  });

  it('returns null for a non-URL client_id', async () => {
    const result = await resolveCimdClient('mcp-abc123');
    expect(result).toBeNull();
  });

  it('returns null for an http:// (non-https) client_id', async () => {
    const result = await resolveCimdClient('http://example.com/client.json');
    expect(result).toBeNull();
  });

  it('returns null for a https URL with no path component', async () => {
    const result = await resolveCimdClient('https://example.com');
    expect(result).toBeNull();
  });

  it('rejects a loopback host before ever calling fetch', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;
    const result = await resolveCimdClient('https://127.0.0.1/client.json');
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a link-local (169.254.0.0/16) host before ever calling fetch', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;
    const result = await resolveCimdClient('https://169.254.169.254/client.json');
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects an RFC1918 private host before ever calling fetch', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;
    const result = await resolveCimdClient('https://10.0.0.5/client.json');
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Regression coverage for the fe80::/10 CIDR-boundary bug: the old check
  // was `lower.startsWith('fe80:')`, a literal string-prefix match that only
  // catches addresses starting with the exact group `fe80`. The real
  // link-local range fe80::/10 covers first-hextet values 0xfe80-0xfebf
  // inclusive, so `fe90::1` and `febf::ffff` are genuinely link-local but
  // were NOT caught by the old prefix check (and would fall through to
  // "allowed"). These two hosts sit outside the old buggy match but inside
  // the correct range, so they only pass with the range-based fix.
  it.each(['fe90::1', 'febf::ffff'])(
    'rejects a link-local IPv6 host (%s) that the old fe80:-prefix check would have missed',
    async (addr) => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as any;
      const result = await resolveCimdClient(`https://[${addr}]/client.json`);
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it('rejects a link-local IPv6 host at the exact lower bound (fe80::1) before ever calling fetch', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;
    const result = await resolveCimdClient('https://[fe80::1]/client.json');
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Boundary sanity check: addresses just outside the fe80::/10 range on
  // either side must NOT be blocked by the link-local check itself. fe7f::1
  // is one hextet below the range; fec0::1 is one hextet above it (and isn't
  // caught by the separate fc/fd unique-local check either, since it starts
  // with `fec0`, not `fc`/`fd`). Both should proceed to fetch.
  it.each(['fe7f::1', 'fec0::1'])(
    'does not block %s via the link-local check (falls through to fetch)',
    async (addr) => {
      const url = `https://[${addr}]/client.json`;
      const doc = { client_id: url, client_name: 'Edge Client', redirect_uris: ['http://127.0.0.1/cb'] };
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify(doc),
      });
      global.fetch = fetchSpy as any;

      const result = await resolveCimdClient(url);
      expect(result).toEqual(doc);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    },
  );

  it('fetches, validates, and returns a well-formed metadata document', async () => {
    const url = 'https://app.example.com/oauth/client-metadata.json';
    const doc = {
      client_id: url,
      client_name: 'Example MCP Client',
      redirect_uris: ['http://127.0.0.1:3000/callback'],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      redirected: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(doc),
    }) as any;

    const result = await resolveCimdClient(url);
    expect(result).toEqual(doc);
  });

  it('rejects a document whose client_id does not match the fetch URL', async () => {
    const url = 'https://app.example.com/oauth/client-metadata.json';
    const doc = {
      client_id: 'https://different.example.com/other.json',
      client_name: 'Example',
      redirect_uris: ['http://127.0.0.1:3000/callback'],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      redirected: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(doc),
    }) as any;

    const result = await resolveCimdClient(url);
    expect(result).toBeNull();
  });

  it('rejects a document missing a required field', async () => {
    const url = 'https://app.example.com/oauth/client-metadata.json';
    const doc = { client_id: url, client_name: 'Example' }; // missing redirect_uris
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      redirected: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(doc),
    }) as any;

    const result = await resolveCimdClient(url);
    expect(result).toBeNull();
  });

  it('rejects a response that redirected', async () => {
    const url = 'https://app.example.com/oauth/client-metadata.json';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      redirected: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ client_id: url, client_name: 'x', redirect_uris: [] }),
    }) as any;

    const result = await resolveCimdClient(url);
    expect(result).toBeNull();
  });

  it('rejects a non-JSON body', async () => {
    const url = 'https://app.example.com/oauth/client-metadata.json';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      redirected: false,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>not json</html>',
    }) as any;

    const result = await resolveCimdClient(url);
    expect(result).toBeNull();
  });

  it('rejects an oversized response body', async () => {
    const url = 'https://app.example.com/oauth/client-metadata.json';
    const huge = 'x'.repeat(2_000_000);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      redirected: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ client_id: url, client_name: huge, redirect_uris: [] }),
    }) as any;

    const result = await resolveCimdClient(url);
    expect(result).toBeNull();
  });

  it('aborts a streamed response as soon as the running size exceeds the cap, without reading to completion', async () => {
    const url = 'https://app.example.com/oauth/client-metadata.json';
    // Each chunk is 400_000 bytes; three chunks (1.2MB) exceed MAX_BODY_BYTES
    // (1MB) on the second chunk already (800_000 > ... no — cumulative:
    // chunk1=400_000, chunk2=800_000, chunk3=1_200_000 > 1_000_000). The cap
    // should trip while reading chunk 3, so chunk 4 (a sentinel) must never
    // be consumed if the implementation truly streams-and-aborts rather than
    // buffering everything first.
    const chunkSize = 400_000;
    const chunks = [
      new Uint8Array(chunkSize),
      new Uint8Array(chunkSize),
      new Uint8Array(chunkSize),
      new Uint8Array(chunkSize), // sentinel — must not be read
    ];
    let readCount = 0;
    const cancelSpy = jest.fn().mockResolvedValue(undefined);
    const reader = {
      read: jest.fn(async () => {
        if (readCount >= chunks.length) return { done: true, value: undefined };
        const value = chunks[readCount];
        readCount += 1;
        return { done: false, value };
      }),
      cancel: cancelSpy,
      releaseLock: jest.fn(),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      redirected: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: { getReader: () => reader },
      // If the implementation regresses to buffering via response.text(),
      // this would throw/be unused — text() is intentionally not provided
      // so a regression to the old buffered path fails loudly instead of
      // silently passing.
    }) as any;

    const result = await resolveCimdClient(url);

    expect(result).toBeNull();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    // Only 3 of the 4 chunks should have been read before the cap tripped —
    // proof the sentinel 4th chunk was never consumed (i.e. no full buffering).
    expect(reader.read).toHaveBeenCalledTimes(3);
  });

  it('caches a resolved document and does not re-fetch on the second call', async () => {
    const url = 'https://cache-test.example.com/oauth/client-metadata.json';
    const doc = { client_id: url, client_name: 'Cached Client', redirect_uris: ['http://127.0.0.1/cb'] };
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      redirected: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(doc),
    });
    global.fetch = fetchSpy as any;

    const first = await resolveCimdClient(url);
    const second = await resolveCimdClient(url);
    expect(first).toEqual(doc);
    expect(second).toEqual(doc);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
