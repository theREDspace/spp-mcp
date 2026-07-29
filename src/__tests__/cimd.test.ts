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
