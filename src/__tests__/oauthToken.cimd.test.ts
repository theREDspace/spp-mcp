const resolveCimdClientMock = jest.fn();
jest.mock('../routes/cimd', () => ({
  resolveCimdClient: (...args: unknown[]) => resolveCimdClientMock(...args),
}));
const axiosPostMock = jest.fn().mockResolvedValue({ status: 200, data: { access_token: 'tok' } });
jest.mock('axios', () => ({
  post: (...args: unknown[]) => axiosPostMock(...args),
}));
// clientRegistry is file-backed (data/clients.json) — mock it so DCR-path
// tests don't write to the real project directory.
jest.mock('../routes/clientRegistry', () => ({
  getClient: jest.fn(),
  verifyClientSecret: jest.fn(),
  extractClientCredentials: jest.requireActual('../routes/clientRegistry').extractClientCredentials,
}));

import { Request, Response } from 'express';
import { codeBindings } from '../routes/oauthState';
import { getClient as getClientMock, verifyClientSecret as verifyClientSecretMock } from '../routes/clientRegistry';

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
    resolveCimdClientMock.mockReset().mockResolvedValue(null);
    axiosPostMock.mockClear();
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

describe('oauthTokenHandler CIMD PKCE enforcement (critical fix regression)', () => {
  beforeEach(() => {
    process.env.SPP_URL = 'https://spp.example.com';
    process.env.SPP_CALLBACK_URL = 'https://proxy.example.com/callback/spp';
    process.env.SPP_CLIENT_ID = 'spp-client-id';
    process.env.SPP_CLIENT_SECRET = 'spp-secret';
    process.env.SPP_NAMESPACE = 'test-namespace';
    process.env.SPP_KEY = 'test-key';
    resolveCimdClientMock.mockReset();
    axiosPostMock.mockClear();
  });

  it('rejects a CIMD client_id redeeming a code with no PKCE binding at all', async () => {
    resolveCimdClientMock.mockResolvedValue({
      client_id: 'https://app.example.com/client.json',
      client_name: 'CIMD Client',
      redirect_uris: ['http://127.0.0.1/cb'],
    });
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'authorization_code',
      code: 'no-binding-code-1',
      client_id: 'https://app.example.com/client.json',
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._json?.error).toBe('invalid_grant');
    expect(axiosPostMock).not.toHaveBeenCalled();
  });

  it('rejects a CIMD client_id redeeming a code whose binding has no codeChallenge', async () => {
    resolveCimdClientMock.mockResolvedValue({
      client_id: 'https://app.example.com/client.json',
      client_name: 'CIMD Client',
      redirect_uris: ['http://127.0.0.1/cb'],
    });
    codeBindings.set('no-pkce-code', {
      clientRedirectUri: 'http://127.0.0.1/cb',
      proxyClientId: 'https://app.example.com/client.json',
      createdAt: Date.now(),
      // no codeChallenge — this is exactly the gap the fix closes: PKCE was
      // never required at /authorize for CIMD clients, and without this
      // check the entire PKCE-and-binding block was skipped.
    });
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'authorization_code',
      code: 'no-pkce-code',
      client_id: 'https://app.example.com/client.json',
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._json?.error).toBe('invalid_grant');
    expect(axiosPostMock).not.toHaveBeenCalled();
  });

  it('rejects redemption by different credentials than the code was bound to, even with no PKCE', async () => {
    // The proxyClientId binding check must fire regardless of whether PKCE
    // was used — previously nested inside `if (binding?.codeChallenge)`, so
    // a no-PKCE code was never checked against who's redeeming it.
    resolveCimdClientMock.mockResolvedValue(null);
    (getClientMock as jest.Mock).mockReturnValue({
      client_id: 'attacker-client-id',
      client_secret_hash: 'irrelevant',
      redirect_uris: [],
      token_endpoint_auth_method: 'client_secret_post',
      created_at: Date.now(),
    });
    (verifyClientSecretMock as jest.Mock).mockReturnValue(true); // attacker's own, valid secret

    codeBindings.set('cross-client-code', {
      clientRedirectUri: 'http://127.0.0.1/cb',
      proxyClientId: 'original-client-id', // code was minted for a DIFFERENT client
      createdAt: Date.now(),
    });

    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'authorization_code',
      code: 'cross-client-code',
      client_id: 'attacker-client-id',
      client_secret: 'attackers-own-valid-secret',
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._json?.error).toBe('invalid_grant');
    expect(axiosPostMock).not.toHaveBeenCalled();
  });
});
