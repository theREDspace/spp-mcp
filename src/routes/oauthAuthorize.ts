import { Request, Response } from 'express';
import { pendingAuthRequests } from './oauthState';
import { getClient } from './clientRegistry';
import { load as loadConfig } from '../config';

/**
 * GET /oauth/authorize
 *
 * 1. Validate proxy client_id (registered via /oauth/register).
 * 2. Stash the client's redirect_uri + PKCE challenge under `state` so the
 *    callback can relay back and /oauth/token can verify the code_verifier.
 * 3. Rewrite redirect_uri to SPP_CALLBACK_URL, strip PKCE, swap client_id for
 *    SPP_CLIENT_ID, and redirect to SPP's real /authorize.
 */
export function oauthAuthorizeHandler(req: Request, res: Response) {
  const config = loadConfig();
  const sppUrl = config.SPP_URL.replace(/\/$/, '');
  const callbackUrl = config.SPP_CALLBACK_URL;
  const sppClientId = config.SPP_CLIENT_ID;

  const params = new URLSearchParams(req.query as Record<string, string>);
  const clientRedirectUri = params.get('redirect_uri');
  const state = params.get('state');
  const proxyClientId = params.get('client_id') || undefined;

  if (proxyClientId && !getClient(proxyClientId)) {
    res.status(400).send('Unknown client_id. Register via /oauth/register first.');
    return;
  }

  if (state && clientRedirectUri) {
    const cc = params.get('code_challenge') || undefined;
    const ccm = params.get('code_challenge_method');
    const entry: import('./oauthState').PendingAuthEntry = {
      clientRedirectUri,
      createdAt: Date.now(),
      ...(cc !== undefined ? { codeChallenge: cc } : {}),
      ...(ccm === 'S256' || ccm === 'plain' ? { codeChallengeMethod: ccm } : {}),
      ...(proxyClientId !== undefined ? { clientId: proxyClientId } : {}),
    };
    pendingAuthRequests.set(state, entry);
  }

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
