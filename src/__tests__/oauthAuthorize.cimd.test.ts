import { Request, Response } from 'express';

jest.mock('../routes/cimd', () => ({
  resolveCimdClient: jest.fn(),
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
});
