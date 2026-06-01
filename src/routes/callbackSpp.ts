import { Request, Response } from 'express';
import { pendingAuthRequests, codeBindings } from './oauthState';

/**
 * GET /callback/spp
 *
 * SPP redirects here with `code` + `state` after the user authenticates.
 * We:
 *  1. Look up the pending entry by `state` to recover the client's redirect_uri
 *     and PKCE challenge.
 *  2. Bind `code → { codeChallenge, proxyClientId }` so /oauth/token can
 *     validate the verifier when the client exchanges the code.
 *  3. Relay all query params back to the client's original redirect_uri.
 */
export function callbackSppGetHandler(req: Request, res: Response) {
  const state = req.query.state as string | undefined;
  const code = req.query.code as string | undefined;

  console.log('[OAUTH-RELAY] callback received', {
    statePresent: Boolean(state),
    codePresent: Boolean(code),
    error: req.query.error || null,
  });

  if (!state) {
    res.status(400).send('Missing state parameter in SPP callback.');
    return;
  }

  const entry = pendingAuthRequests.get(state);
  if (!entry) {
    const fallback = (process.env.SPP_FORWARD_CALLBACK_URL || '').replace(/\/$/, '');
    if (!fallback) {
      res
        .status(400)
        .send('Could not determine client redirect URI. State not found and SPP_FORWARD_CALLBACK_URL not set.');
      return;
    }
    const params = new URLSearchParams(req.query as Record<string, string>);
    console.log(`[OAUTH-RELAY] State not found, using fallback → ${fallback}`);
    res.redirect(`${fallback}?${params.toString()}`);
    return;
  }

  // Bind code → PKCE/client info for /oauth/token to consume.
  if (code) {
    const binding: import('./oauthState').CodeBinding = {
      clientRedirectUri: entry.clientRedirectUri,
      createdAt: Date.now(),
      ...(entry.codeChallenge !== undefined ? { codeChallenge: entry.codeChallenge } : {}),
      ...(entry.codeChallengeMethod !== undefined ? { codeChallengeMethod: entry.codeChallengeMethod } : {}),
      ...(entry.clientId !== undefined ? { proxyClientId: entry.clientId } : {}),
    };
    codeBindings.set(code, binding);
  }
  // Don't delete pending entry — TTL will clean it up; state may be replayed
  // by the client before code exchange in some flows.

  const params = new URLSearchParams(req.query as Record<string, string>);
  res.redirect(`${entry.clientRedirectUri}?${params.toString()}`);
}
