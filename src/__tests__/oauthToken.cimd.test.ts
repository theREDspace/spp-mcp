jest.mock('../routes/cimd', () => ({
  resolveCimdClient: jest.fn().mockResolvedValue(null),
}));
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ status: 200, data: { access_token: 'tok' } }),
}));

import { Request, Response } from 'express';

function makeReq(body: Record<string, string>, authHeader?: string): Request {
  return { body, headers: { authorization: authHeader } } as unknown as Request;
}

function makeRes(): Response & { _status?: number; _json?: any } {
  const res: any = {};
  res.status = (code: number) => {
    res._status = code;
    return res;
  };
  res.json = (body: any) => {
    res._json = body;
    return res;
  };
  res.setHeader = () => res;
  return res;
}

describe('oauthTokenHandler falls back to DCR when resolveCimdClient returns null', () => {
  beforeEach(() => {
    // loadConfig() validates the entire env schema on every call — set every
    // required field, not just the ones oauthTokenHandler itself reads.
    process.env.SPP_URL = 'https://spp.example.com';
    process.env.SPP_CALLBACK_URL = 'https://proxy.example.com/callback/spp';
    process.env.SPP_CLIENT_ID = 'spp-client-id';
    process.env.SPP_CLIENT_SECRET = 'spp-secret';
    process.env.SPP_NAMESPACE = 'test-namespace';
    process.env.SPP_KEY = 'test-key';
  });

  it('401s an unknown, non-CIMD client_id exactly as before this change', async () => {
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq(
      { grant_type: 'refresh_token', refresh_token: 'abc' },
      'Basic ' + Buffer.from('unknown-client:secret').toString('base64')
    );
    const res = makeRes();
    await oauthTokenHandler(req, res);
    expect(res._status).toBe(401);
    expect(res._json?.error).toBe('invalid_client');
  });
});
