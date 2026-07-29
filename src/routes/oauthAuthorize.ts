import { Request, Response } from 'express';
import { pendingAuthRequests } from './oauthState';
import { getClient } from './clientRegistry';
import { resolveCimdClient } from './cimd';
import { load as loadConfig } from '../config';

/**
 * GET /oauth/authorize
 *
 * 1. Validate the client_id — either a Client ID Metadata Document URL
 *    (https, resolved and validated against the request's redirect_uri) or a
 *    proxy client_id registered via /oauth/register (DCR).
 * 2. Stash the client's redirect_uri + PKCE challenge under `state` so the
 *    callback can relay back and /oauth/token can verify the code_verifier.
 * 3. Rewrite redirect_uri to SPP_CALLBACK_URL, strip PKCE, swap client_id for
 *    SPP_CLIENT_ID, and redirect to SPP's real /authorize.
 */
export async function oauthAuthorizeHandler(req: Request, res: Response): Promise<void> {
  const config = loadConfig();
  const sppUrl = config.SPP_URL.replace(/\/$/, '');
  const callbackUrl = config.SPP_CALLBACK_URL;
  const sppClientId = config.SPP_CLIENT_ID;

  const params = new URLSearchParams(req.query as Record<string, string>);
  const clientRedirectUri = params.get('redirect_uri');
  const state = params.get('state');
  const proxyClientId = params.get('client_id') || undefined;

  // client_id is REQUIRED (RFC 6749 §4.1.1), not merely conditionally
  // checked. Making it optional here meant that omitting it skipped BOTH the
  // CIMD and DCR validation below, left redirect_uri completely unvalidated,
  // and produced a pendingAuthRequests entry with no `clientId` — which
  // means the eventual CodeBinding has no `proxyClientId` either, so the
  // client-binding check in oauthToken.ts silently no-ops (its guard is
  // `binding.proxyClientId && ...`, vacuously false when unset). That
  // combination lets anyone with their own valid (self-registered) DCR
  // credentials redeem a code that was never bound to them at all.
  if (!proxyClientId) {
    res.status(400).send('Missing client_id.');
    return;
  }

  const cimdClient = await resolveCimdClient(proxyClientId);
  if (cimdClient) {
    if (!clientRedirectUri || !cimdClient.redirect_uris.includes(clientRedirectUri)) {
      res.status(400).send('redirect_uri is not registered in the Client ID Metadata Document.');
      return;
    }
  } else {
    const dcrClient = getClient(proxyClientId);
    if (!dcrClient) {
      res.status(400).send('Unknown client_id. Register via /oauth/register first.');
      return;
    }
    // client_ids are public (sent in the initial request itself), so without
    // this check anyone could pair a known, legitimate client_id with their
    // OWN redirect_uri and have the resulting code delivered straight to
    // them instead of the real client — redemption would still fail (they
    // lack that client's secret), but the code itself would leak.
    if (!clientRedirectUri || !dcrClient.redirect_uris.includes(clientRedirectUri)) {
      res.status(400).send('redirect_uri is not registered for this client_id.');
      return;
    }
  }

  const cc = params.get('code_challenge') || undefined;
  const ccm = params.get('code_challenge_method') || undefined;

  // PKCE is required for every client (OAuth 2.1 / MCP authorization spec),
  // and /oauth/token now enforces it unconditionally. Reject here rather than
  // letting the user complete a full SPP login and only discover the problem
  // at the token exchange — failing late is what made the previous 'plain'
  // handling produce a misleading "PKCE verification failed" downstream.
  if (cc === undefined) {
    res.status(400).send('Missing code_challenge. PKCE (S256) is required.');
    return;
  }
  // An unsupported method (e.g. 'plain') is rejected outright, not silently
  // dropped (RFC 7636 §4.4 wants invalid_request at the authorization
  // endpoint). Omitted is fine — S256 is the default and the only value
  // advertised in code_challenge_methods_supported.
  if (ccm !== undefined && ccm !== 'S256') {
    res.status(400).send('Unsupported code_challenge_method. Only S256 is supported.');
    return;
  }

  // `state` is what carries the PKCE challenge and client binding through to
  // the callback. Without it we cannot bind the eventual code to this client
  // at all, and /oauth/token rejects unbound codes — so require it here
  // instead of silently issuing a code that can never be redeemed.
  if (!state) {
    res.status(400).send('Missing state.');
    return;
  }

  const entry: import('./oauthState').PendingAuthEntry = {
    clientRedirectUri,
    createdAt: Date.now(),
    codeChallenge: cc,
    ...(ccm === 'S256' ? { codeChallengeMethod: ccm } : {}),
    clientId: proxyClientId,
  };
  pendingAuthRequests.set(state, entry);

  console.log('[OAUTH-PROXY] authorize request', {
    statePresent: Boolean(state),
    originalRedirectUri: clientRedirectUri || null,
    rewrittenRedirectUri: callbackUrl,
    hasCodeChallenge: params.has('code_challenge'),
    proxyClientId: proxyClientId || null,
  });

  params.set('redirect_uri', callbackUrl);
  params.set('client_id', sppClientId);
  // PKCE terminates here; SPP does not support it for API Integration apps.
  params.delete('code_challenge');
  params.delete('code_challenge_method');

  res.redirect(`${sppUrl}/login/oauth2/v1/authorize?${params.toString()}`);
}
