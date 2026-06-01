import { Request, Response } from 'express';
import { pendingAuthRequests } from './oauthState';

/**
 * GET /callback/spp
 *
 * Authorization code relay: SPP redirects here after the user authenticates.
 * We look up the client's original redirect_uri (stored during /oauth/authorize)
 * using the `state` param, then forward all query params there.
 */
export function callbackSppGetHandler(req: Request, res: Response) {
  const state = req.query.state as string | undefined;
  console.log('[OAUTH-RELAY] callback received', {
    statePresent: Boolean(state),
    codePresent: typeof req.query.code === 'string' && req.query.code.length > 0,
    error: req.query.error || null,
  });

  if (!state) {
    res.status(400).send('Missing state parameter in SPP callback.');
    return;
  }

  const entry = pendingAuthRequests.get(state);
  if (!entry) {
    // Fallback to env var if state not found (e.g. server restarted mid-flow)
    const fallback = (process.env.SPP_FORWARD_CALLBACK_URL || '').replace(/\/$/, '');
    if (!fallback) {
      res.status(400).send(
        'Could not determine client redirect URI. State not found and SPP_FORWARD_CALLBACK_URL not set.'
      );
      return;
    }
    const params = new URLSearchParams(req.query as Record<string, string>);
    console.log(`[OAUTH-RELAY] State not found, using fallback → ${fallback}`);
    res.redirect(`${fallback}?${params.toString()}`);
    return;
  }

  const clientRedirectUri = entry.clientRedirectUri;
  // Note: we DON'T delete the entry yet — /oauth/token still needs the PKCE challenge
  // to validate the code_verifier. Entry will be evicted by TTL.

  const params = new URLSearchParams(req.query as Record<string, string>);
  const redirectTo = `${clientRedirectUri}?${params.toString()}`;

  console.log('[OAUTH-RELAY] Relaying SPP callback', {
    clientRedirectUri,
    stateMatched: true,
  });
  res.redirect(redirectTo);
}
