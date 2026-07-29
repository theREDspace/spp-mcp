const resolveCimdClientMock = jest.fn();
jest.mock('../routes/cimd', () => ({
  resolveCimdClient: (...args: unknown[]) => resolveCimdClientMock(...args),
}));
const axiosPostMock = jest
  .fn()
  .mockResolvedValue({ status: 200, data: { access_token: 'VICTIM_TOKEN' } });
jest.mock('axios', () => ({
  post: (...args: unknown[]) => axiosPostMock(...args),
}));
jest.mock('../routes/clientRegistry', () => ({
  getClient: jest.fn(),
  verifyClientSecret: jest.fn(),
  extractClientCredentials: jest.requireActual('../routes/clientRegistry').extractClientCredentials,
}));

import { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { codeBindings } from '../routes/oauthState';
import {
  getClient as getClientMock,
  verifyClientSecret as verifyClientSecretMock,
} from '../routes/clientRegistry';

function makeReq(body: Record<string, string>): Request {
  return { body, headers: {} } as unknown as Request;
}
function makeRes(): Response & { _status?: number; _json?: any } {
  const res: any = {};
  res.status = (c: number) => {
    res._status = c;
    return res;
  };
  res.json = (b: any) => {
    res._json = b;
    return res;
  };
  res.setHeader = () => res;
  return res;
}

const VERIFIER = 'a'.repeat(64);
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url');

describe('oauthTokenHandler requires a code binding (unbound codes are not redeemable)', () => {
  beforeEach(() => {
    process.env.SPP_URL = 'https://spp.example.com';
    process.env.SPP_CALLBACK_URL = 'https://proxy.example.com/callback/spp';
    process.env.SPP_CLIENT_ID = 'spp-client-id';
    process.env.SPP_CLIENT_SECRET = 'spp-secret';
    process.env.SPP_NAMESPACE = 'ns';
    process.env.SPP_KEY = 'k';
    resolveCimdClientMock.mockReset().mockResolvedValue(null);
    axiosPostMock.mockClear();
    (getClientMock as jest.Mock).mockReturnValue({
      client_id: 'attacker-client',
      client_secret_hash: 'x',
      redirect_uris: ['https://attacker.example/cb'],
      token_endpoint_auth_method: 'client_secret_post',
      created_at: Date.now(),
    });
    (verifyClientSecretMock as jest.Mock).mockReturnValue(true);
  });

  // Before this guard existed, every control at the token endpoint was written
  // as `binding?.x && ...` / `if (binding?.codeChallenge)`, so a MISSING
  // binding meant "no constraints to enforce" rather than "reject". Verified
  // exploitable: this exact request returned 200 with the victim's
  // access_token. A code reaches the unbound state two ways — the codeBindings
  // TTL expiring before redemption (an attacker holding a code simply waits),
  // and callbackSpp's SPP_FORWARD_CALLBACK_URL fallback, which relayed a code
  // without ever binding it.
  it('rejects an authorization_code with no binding, even with fully valid client credentials', async () => {
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'authorization_code',
      code: 'VICTIM_CODE_NEVER_BOUND',
      client_id: 'attacker-client',
      client_secret: 'attackers-own-valid-secret',
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._json?.error).toBe('invalid_grant');
    // The decisive assertion: nothing was ever forwarded upstream, so no SPP
    // token could have been minted for the victim.
    expect(axiosPostMock).not.toHaveBeenCalled();
  });

  it('rejects a bound code presented by a different client than it was issued to', async () => {
    codeBindings.set('bound-to-someone-else', {
      clientRedirectUri: 'https://legit.example/cb',
      proxyClientId: 'the-legit-client',
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
      createdAt: Date.now(),
    });
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'authorization_code',
      code: 'bound-to-someone-else',
      client_id: 'attacker-client',
      client_secret: 'attackers-own-valid-secret',
      code_verifier: VERIFIER,
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._json?.error_description).toMatch(/different client/i);
    expect(axiosPostMock).not.toHaveBeenCalled();
  });

  it('rejects a bound code whose binding carries no PKCE challenge (PKCE now universal)', async () => {
    // PKCE is required for every client, not just secret-less CIMD ones —
    // OAuth 2.1 / the MCP auth spec mandate it, and leaving it optional for
    // DCR clients is what made the earlier code-injection findings reachable.
    codeBindings.set('no-pkce-dcr-code', {
      clientRedirectUri: 'https://attacker.example/cb',
      proxyClientId: 'attacker-client',
      createdAt: Date.now(),
    });
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'authorization_code',
      code: 'no-pkce-dcr-code',
      client_id: 'attacker-client',
      client_secret: 'attackers-own-valid-secret',
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._json?.error_description).toMatch(/PKCE is required/i);
    expect(axiosPostMock).not.toHaveBeenCalled();
  });

  it('rejects a presented redirect_uri that does not match the authorization request', async () => {
    codeBindings.set('redirect-mismatch-code', {
      clientRedirectUri: 'https://attacker.example/cb',
      proxyClientId: 'attacker-client',
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
      createdAt: Date.now(),
    });
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'authorization_code',
      code: 'redirect-mismatch-code',
      client_id: 'attacker-client',
      client_secret: 'attackers-own-valid-secret',
      code_verifier: VERIFIER,
      redirect_uri: 'https://somewhere-else.example/cb',
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._json?.error_description).toMatch(/redirect_uri/i);
    expect(axiosPostMock).not.toHaveBeenCalled();
  });

  it('accepts a fully valid, bound, PKCE-verified redemption (happy path still works)', async () => {
    codeBindings.set('good-code', {
      clientRedirectUri: 'https://attacker.example/cb',
      proxyClientId: 'attacker-client',
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
      createdAt: Date.now(),
    });
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'authorization_code',
      code: 'good-code',
      client_id: 'attacker-client',
      client_secret: 'attackers-own-valid-secret',
      code_verifier: VERIFIER,
      redirect_uri: 'https://attacker.example/cb',
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);

    expect(res._status).toBe(200);
    expect(axiosPostMock).toHaveBeenCalledTimes(1);
    // Single-use: the binding is consumed, so a replay of the same code fails.
    expect(codeBindings.get('good-code')).toBeUndefined();
  });

  it('leaves the refresh_token grant unaffected by authorization_code binding rules', async () => {
    const { oauthTokenHandler } = require('../routes/oauthToken');
    const req = makeReq({
      grant_type: 'refresh_token',
      refresh_token: 'rt',
      client_id: 'attacker-client',
      client_secret: 'attackers-own-valid-secret',
    });
    const res = makeRes();
    await oauthTokenHandler(req, res);

    expect(res._status).toBe(200);
    expect(axiosPostMock).toHaveBeenCalledTimes(1);
  });
});
