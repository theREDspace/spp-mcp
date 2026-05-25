import { Request, Response } from 'express';
import { pendingAuthRequests } from './oauthState';

/**
 * GET /oauth/authorize
 *
 * Authorization proxy: receives the MCP client's authorization request,
 * replaces its redirect_uri with our fixed SPP_CALLBACK_URL (the one registered
 * in the SPP OAuth app), then forwards to SPP's real /authorize endpoint.
 *
 * This lets any MCP client use any redirect_uri while SPP only ever sees the
 * one URI it has registered.
 */
export function oauthAuthorizeHandler(req: Request, res: Response) {
  const sppUrl = (process.env.SPP_URL || '').replace(/\/$/, '');
  const callbackUrl = process.env.SPP_CALLBACK_URL;

  if (!sppUrl) {
    res.status(500).send('Server misconfiguration: SPP_URL is not set.');
    return;
  }
  if (!callbackUrl) {
    res.status(500).send('Server misconfiguration: SPP_CALLBACK_URL is not set.');
    return;
  }

  // Take all query params from the client, override redirect_uri with our fixed one
  const params = new URLSearchParams(req.query as Record<string, string>);

  // Remember the client's original redirect_uri so /callback/spp can relay back
  const clientRedirectUri = params.get('redirect_uri');
  const state = params.get('state');
  if (state && clientRedirectUri) {
    pendingAuthRequests.set(state, clientRedirectUri);
  }

  console.log('[OAUTH-PROXY] authorize request', {
    statePresent: Boolean(state),
    originalRedirectUri: clientRedirectUri || null,
    rewrittenRedirectUri: callbackUrl,
    hasCodeChallenge: params.has('code_challenge'),
    clientIdPresent: Boolean(params.get('client_id')),
  });

  params.set('redirect_uri', callbackUrl);

  // Strip PKCE — SPP does not support it for API Integration apps
  params.delete('code_challenge');
  params.delete('code_challenge_method');
  console.log('[OAUTH-PROXY] Stripped PKCE params (not supported by SPP)');

  const sppAuthorizeUrl = `${sppUrl}/login/oauth2/v1/authorize?${params.toString()}`;

  console.log(`[OAUTH-PROXY] authorize → SPP (redirect_uri overridden to ${callbackUrl})`);
  res.redirect(sppAuthorizeUrl);
}
