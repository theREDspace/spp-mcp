import { Request, Response } from 'express';

jest.mock('../routes/cimd', () => ({
  resolveCimdClient: jest.fn(),
}));
// clientRegistry is file-backed (data/clients.json) — mock it so DCR-path
// tests don't write to the real project directory.
jest.mock('../routes/clientRegistry', () => ({
  getClient: jest.fn(),
}));

function makeReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}

function makeRes(): Response & { _status?: number; _redirect?: string; _sent?: string } {
  const res: any = {};
  res.status = (code: number) => {
    res._status = code;
    return res;
  };
  res.send = (body: string) => {
    res._sent = body;
    return res;
  };
  res.redirect = (url: string) => {
    res._redirect = url;
    return res;
  };
  return res;
}

describe('oauthAuthorizeHandler with CIMD client_id', () => {
  beforeEach(() => {
    // loadConfig() validates the entire env schema on every call (Task 4
    // discovered this the hard way for transport.ts) — set every required
    // field, not just the ones oauthAuthorizeHandler itself reads.
    process.env.SPP_URL = 'https://spp.example.com';
    process.env.SPP_CALLBACK_URL = 'https://proxy.example.com/callback/spp';
    process.env.SPP_CLIENT_ID = 'spp-client-id';
    process.env.SPP_CLIENT_SECRET = 'spp-secret';
    process.env.SPP_NAMESPACE = 'test-namespace';
    process.env.SPP_KEY = 'test-key';
    jest.resetModules();
  });

  it('accepts a CIMD client_id whose document lists the request redirect_uri', async () => {
    const { resolveCimdClient } = require('../routes/cimd');
    (resolveCimdClient as jest.Mock).mockResolvedValue({
      client_id: 'https://app.example.com/client.json',
      client_name: 'Example',
      redirect_uris: ['http://127.0.0.1:3000/callback'],
    });
    const { oauthAuthorizeHandler } = require('../routes/oauthAuthorize');

    const req = makeReq({
      client_id: 'https://app.example.com/client.json',
      redirect_uri: 'http://127.0.0.1:3000/callback',
      state: 'abc',
      response_type: 'code',
    });
    const res = makeRes();

    await oauthAuthorizeHandler(req, res);
    expect(res._status).toBeUndefined();
    expect(res._redirect).toContain('spp.example.com');
  });

  it('rejects a CIMD client whose document does not list the request redirect_uri', async () => {
    const { resolveCimdClient } = require('../routes/cimd');
    (resolveCimdClient as jest.Mock).mockResolvedValue({
      client_id: 'https://app.example.com/client.json',
      client_name: 'Example',
      redirect_uris: ['http://127.0.0.1:9999/other-callback'],
    });
    const { oauthAuthorizeHandler } = require('../routes/oauthAuthorize');

    const req = makeReq({
      client_id: 'https://app.example.com/client.json',
      redirect_uri: 'http://127.0.0.1:3000/callback',
      state: 'abc',
      response_type: 'code',
    });
    const res = makeRes();

    await oauthAuthorizeHandler(req, res);
    expect(res._status).toBe(400);
  });

  it('falls back to the DCR clientRegistry lookup for a non-URL client_id (regression)', async () => {
    const { resolveCimdClient } = require('../routes/cimd');
    (resolveCimdClient as jest.Mock).mockResolvedValue(null);
    const { oauthAuthorizeHandler } = require('../routes/oauthAuthorize');

    const req = makeReq({
      client_id: 'mcp-unknown-client',
      redirect_uri: 'http://127.0.0.1:3000/callback',
      state: 'abc',
      response_type: 'code',
    });
    const res = makeRes();

    await oauthAuthorizeHandler(req, res);
    // Unknown DCR client_id must still be rejected exactly as before this change.
    expect(res._status).toBe(400);
    expect(res._sent).toContain('Unknown client_id');
  });

  it('rejects a request with no client_id at all (critical fix regression)', async () => {
    // Omitting client_id previously skipped BOTH the CIMD and DCR validation
    // below, left redirect_uri completely unvalidated, and produced a
    // pendingAuthRequests entry with no clientId — silently defeating the
    // proxyClientId binding check in oauthToken.ts. Any registered DCR
    // client could then redeem a code that was never bound to them.
    const { oauthAuthorizeHandler } = require('../routes/oauthAuthorize');
    const { pendingAuthRequests } = require('../routes/oauthState');

    const req = makeReq({
      redirect_uri: 'https://attacker.example/cb',
      state: 'no-client-id-state',
      response_type: 'code',
    });
    const res = makeRes();

    await oauthAuthorizeHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._redirect).toBeUndefined();
    expect(pendingAuthRequests.get('no-client-id-state')).toBeUndefined();
  });

  it('rejects a DCR client_id paired with a redirect_uri not on file for it', async () => {
    // client_ids are public — without this check, anyone could pair a known,
    // legitimate client_id with their own redirect_uri and have the
    // resulting code delivered to them instead of the real client.
    const { resolveCimdClient } = require('../routes/cimd');
    (resolveCimdClient as jest.Mock).mockResolvedValue(null);
    const { getClient } = require('../routes/clientRegistry');
    (getClient as jest.Mock).mockReturnValue({
      client_id: 'mcp-registered-client',
      client_secret_hash: 'irrelevant',
      redirect_uris: ['https://legit-client.example/cb'],
      token_endpoint_auth_method: 'client_secret_post',
      created_at: Date.now(),
    });
    const { oauthAuthorizeHandler } = require('../routes/oauthAuthorize');

    const req = makeReq({
      client_id: 'mcp-registered-client',
      redirect_uri: 'https://attacker.example/cb', // not in the client's registered list
      state: 'dcr-mismatch-state',
      response_type: 'code',
    });
    const res = makeRes();

    await oauthAuthorizeHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._sent).toContain('redirect_uri');
  });

  it('accepts a DCR client_id paired with its own registered redirect_uri', async () => {
    const { resolveCimdClient } = require('../routes/cimd');
    (resolveCimdClient as jest.Mock).mockResolvedValue(null);
    const { getClient } = require('../routes/clientRegistry');
    (getClient as jest.Mock).mockReturnValue({
      client_id: 'mcp-registered-client',
      client_secret_hash: 'irrelevant',
      redirect_uris: ['https://legit-client.example/cb'],
      token_endpoint_auth_method: 'client_secret_post',
      created_at: Date.now(),
    });
    const { oauthAuthorizeHandler } = require('../routes/oauthAuthorize');

    const req = makeReq({
      client_id: 'mcp-registered-client',
      redirect_uri: 'https://legit-client.example/cb',
      state: 'dcr-match-state',
      response_type: 'code',
    });
    const res = makeRes();

    await oauthAuthorizeHandler(req, res);
    expect(res._status).toBeUndefined();
    expect(res._redirect).toContain('spp.example.com');
  });

  it('rejects code_challenge_method=plain outright at /authorize (RFC 7636 §4.4 invalid_request)', async () => {
    // 'plain' means verifier === challenge, and challenge arrives in a GET
    // query string — recoverable from browser history/Referer/proxy logs.
    // Silently dropping the method (storing the challenge but not the weak
    // method) would let the flow proceed through a full SPP login and only
    // fail later at /oauth/token with a misleading "PKCE verification
    // failed" — indistinguishable from a genuine mismatch. Reject here
    // instead, before any redirect to SPP, and don't store a pending entry.
    const { resolveCimdClient } = require('../routes/cimd');
    (resolveCimdClient as jest.Mock).mockResolvedValue({
      client_id: 'https://app.example.com/client.json',
      client_name: 'Example',
      redirect_uris: ['http://127.0.0.1:3000/callback'],
    });
    const { oauthAuthorizeHandler } = require('../routes/oauthAuthorize');
    const { pendingAuthRequests } = require('../routes/oauthState');

    const req = makeReq({
      client_id: 'https://app.example.com/client.json',
      redirect_uri: 'http://127.0.0.1:3000/callback',
      state: 'plain-method-state',
      response_type: 'code',
      code_challenge: 'some-plain-text-value',
      code_challenge_method: 'plain',
    });
    const res = makeRes();

    await oauthAuthorizeHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._redirect).toBeUndefined();
    expect(pendingAuthRequests.get('plain-method-state')).toBeUndefined();
  });

  it('accepts an omitted code_challenge_method (implicit S256 default)', async () => {
    const { resolveCimdClient } = require('../routes/cimd');
    (resolveCimdClient as jest.Mock).mockResolvedValue({
      client_id: 'https://app.example.com/client.json',
      client_name: 'Example',
      redirect_uris: ['http://127.0.0.1:3000/callback'],
    });
    const { oauthAuthorizeHandler } = require('../routes/oauthAuthorize');
    const { pendingAuthRequests } = require('../routes/oauthState');

    const req = makeReq({
      client_id: 'https://app.example.com/client.json',
      redirect_uri: 'http://127.0.0.1:3000/callback',
      state: 'implicit-s256-state',
      response_type: 'code',
      code_challenge: 'a-real-s256-challenge',
    });
    const res = makeRes();

    await oauthAuthorizeHandler(req, res);
    expect(res._status).toBeUndefined();
    const entry = pendingAuthRequests.get('implicit-s256-state');
    expect(entry?.codeChallenge).toBe('a-real-s256-challenge');
  });
});
