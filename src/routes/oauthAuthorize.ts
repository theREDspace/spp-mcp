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

  if (proxyClientId) {
    const cimdClient = await resolveCimdClient(proxyClientId);
    if (cimdClient) {
      if (!clientRedirectUri || !cimdClient.redirect_uris.includes(clientRedirectUri)) {
        res.status(400).send('redirect_uri is not registered in the Client ID Metadata Document.');
        return;
      }
    } else if (!getClient(proxyClientId)) {
      res.status(400).send('Unknown client_id. Register via /oauth/register first.');
      return;
    }
  }

  if (state && clientRedirectUri) {
    const cc = params.get('code_challenge') || undefined;
    const ccm = params.get('code_challenge_method');
    const entry: import('./oauthState').PendingAuthEntry = {
      clientRedirectUri,
      createdAt: Date.now(),
      ...(cc !== undefined ? { codeChallenge: cc } : {}),
      // 'plain' means verifier === challenge, and challenge arrives in a GET
      // query string — recoverable from browser history, Referer headers, or
      // proxy/access logs. That makes a leaked code's verifier trivially
      // available too, defeating the only protection the secret-less CIMD
      // path relies on. Only S256 is advertised (wellKnown.ts's
      // code_challenge_methods_supported), so only S256 is accepted here.
      ...(ccm === 'S256' ? { codeChallengeMethod: ccm } : {}),
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
