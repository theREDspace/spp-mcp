import { Request, Response } from 'express';
import axios from 'axios';
import { codeBindings } from './oauthState';
import { extractClientCredentials, verifyClientSecret, getClient } from './clientRegistry';
import { resolveCimdClient } from './cimd';
import { verifyPkce } from './pkce';
import { load as loadConfig } from '../config';

/**
 * POST /oauth/token
 *
 * 1. Authenticate the proxy client (basic or post) against data/clients.json.
 *    Clients registered with token_endpoint_auth_method=none skip the secret check.
 * 2. For authorization_code: look up the code binding, verify the PKCE
 *    code_verifier against the stored challenge, then strip both.
 * 3. Swap proxy client_id for SPP_CLIENT_ID and authenticate upstream with
 *    SPP_CLIENT_SECRET via Basic auth. SPP never sees the proxy creds.
 * 4. Forward the body to SPP and return the response verbatim.
 */
export async function oauthTokenHandler(req: Request, res: Response) {
  const config = loadConfig();
  const sppUrl = config.SPP_URL.replace(/\/$/, '');
  const callbackUrl = config.SPP_CALLBACK_URL;
  const sppClientId = config.SPP_CLIENT_ID;
  const sppClientSecret = config.SPP_CLIENT_SECRET;  const body: Record<string, string> = { ...(req.body || {}) };
  const grantType = body.grant_type || 'unknown';

  // ── Authenticate the proxy client ─────────────────────────────────────
  const creds = extractClientCredentials(req.headers.authorization, body);
  if (!creds) {
    res.status(401).json({ error: 'invalid_client', error_description: 'Missing client credentials.' });
    return;
  }
  // CIMD clients are public by construction — their client_id IS a self-hosted
  // metadata URL, so they hold no secret. PKCE (enforced unconditionally for
  // every authorization_code redemption below) is their proof of possession.
  // Everyone else authenticates with the secret they registered via DCR.
  const cimdClient = await resolveCimdClient(creds.client_id);
  if (!cimdClient) {
    const clientRecord = getClient(creds.client_id);
    if (!clientRecord) {
      res.status(401).json({ error: 'invalid_client', error_description: 'Unknown client_id.' });
      return;
    }
    if (clientRecord.token_endpoint_auth_method !== 'none') {
      if (!creds.client_secret || !verifyClientSecret(creds.client_id, creds.client_secret)) {
        res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client_secret.' });
        return;
      }
    }
  }
  // Don't forward proxy client creds upstream.
  delete body.client_id;
  delete body.client_secret;

  // ── PKCE termination for authorization_code ───────────────────────────
  if (grantType === 'authorization_code') {
    const code = body.code;
    if (!code) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Missing code.' });
      return;
    }
    const binding = codeBindings.get(code);

    // A MISSING binding must be a rejection, not an absence of constraints.
    // Every check below is guarded on `binding` being present, so treating
    // "no binding" as "nothing to enforce" made any unbound code redeemable
    // by any registered client (verified: 200 + the victim's access_token).
    // Two ways a code reaches that state: the codeBindings TTL expiring
    // before redemption (an attacker holding a code just waits), and
    // callbackSpp.ts's SPP_FORWARD_CALLBACK_URL fallback, which relays a code
    // without ever binding it. Our own /callback/spp binds every code it
    // relays on the normal path, so no binding means the code is stale, was
    // never issued through this proxy, or came via that fallback — none of
    // which we can safely honour. The client re-runs the flow.
    if (!binding) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Unknown, expired, or already-redeemed authorization code.',
      });
      return;
    }

    // Bind the code to the client_id that originally requested it. Not nested
    // under the PKCE check: a code minted for one client must never be
    // redeemable by different credentials, PKCE or not. `proxyClientId` is
    // always set now that /oauth/authorize requires client_id, but keep the
    // explicit absence check — an unattributable code is not redeemable.
    if (!binding.proxyClientId || binding.proxyClientId !== creds.client_id) {
      res
        .status(400)
        .json({ error: 'invalid_grant', error_description: 'Code was issued to a different client.' });
      return;
    }

    // Per RFC 6749 §4.1.3, if redirect_uri was included at /authorize it must
    // be presented again here and match.
    if (body.redirect_uri && body.redirect_uri !== binding.clientRedirectUri) {
      res
        .status(400)
        .json({ error: 'invalid_grant', error_description: 'redirect_uri does not match the authorization request.' });
      return;
    }

    // PKCE is required for EVERY client, not just secret-less CIMD ones.
    // OAuth 2.1 and the MCP authorization spec both mandate it, and
    // wellKnown.ts already advertises code_challenge_methods_supported:
    // ['S256'], so any conforming client already sends it. Leaving it
    // optional for DCR clients is what made the preceding rounds of
    // authorization-code-injection findings reachable in the first place.
    if (!binding.codeChallenge) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'PKCE is required: this code was issued without a code_challenge.',
      });
      return;
    }
    const verifier = body.code_verifier;
    if (!verifier) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier required.' });
      return;
    }
    const method = binding.codeChallengeMethod || 'S256';
    if (!verifyPkce(verifier, binding.codeChallenge, method)) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed.' });
      return;
    }

    codeBindings.delete(code);
    delete body.code_verifier;
  }

  // Rewrite redirect_uri to the one SPP knows about.
  if (body.redirect_uri) body.redirect_uri = callbackUrl;

  // ── Forward to SPP authenticated as the upstream OAuth app ────────────
  const upstreamBasic = Buffer.from(`${sppClientId}:${sppClientSecret}`).toString('base64');

  console.log('[OAUTH-TOKEN] forwarding to SPP', {
    grantType,
    proxyClientId: creds.client_id,
    hasRefreshToken: Boolean(body.refresh_token),
    hasCode: Boolean(body.code),
  });

  try {
    const response = await axios.post(
      `${sppUrl}/login/oauth2/v1/token`,
      new URLSearchParams(body).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${upstreamBasic}`,
        },
        validateStatus: () => true,
      }
    );

    if (response.status >= 400) {
      console.log('[OAUTH-TOKEN] SPP error response', response.status, response.data);
    } else {
      console.log('[OAUTH-TOKEN] SPP success', {
        grantType,
        hasAccessToken: Boolean(response.data?.access_token),
        hasRefreshToken: Boolean(response.data?.refresh_token),
        expiresIn: response.data?.expires_in ?? null,
      });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.status(response.status).json(response.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[OAUTH-TOKEN] Error proxying token request:', msg);
    res.status(502).json({ error: 'server_error', error_description: 'Failed to reach SPP token endpoint.' });
  }
}
