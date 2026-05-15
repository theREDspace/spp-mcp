import { Request, Response } from 'express';

/**
 * GET /callback/spp
 *
 * Authorization code relay: SPP redirects here after the user authenticates.
 * We forward ALL query params (code, state, error, etc.) unchanged to
 * SPP_FORWARD_CALLBACK_URL — the URL the MCP client (e.g. MCP Inspector)
 * is actually listening on.
 *
 * The MCP client then exchanges the code directly with SPP's token endpoint.
 * This server never touches tokens or credentials.
 */
export function callbackSppGetHandler(req: Request, res: Response) {
  // Middleman proxy/forward logic removed. Handler now disables SPP forwarding by default.
  res.status(501).send('SPP forwarding callback is not supported. No SPP_FORWARD_CALLBACK_URL; flow not proxied.');
  return;
}
  const forwardUrl = (process.env.SPP_FORWARD_CALLBACK_URL || '').replace(/\/$/, '');

  if (!forwardUrl) {
    console.error('[OAUTH-RELAY] SPP_FORWARD_CALLBACK_URL is not set.');
    res.status(500).send(
      'Server misconfiguration: SPP_FORWARD_CALLBACK_URL is not set. ' +
      'Set it to your MCP client\'s callback URL (e.g. http://localhost:6274/oauth/callback).'
    );
    return;
  }

  const params = new URLSearchParams(req.query as Record<string, string>);
  const redirectTo = `${forwardUrl}?${params.toString()}`;

  console.log(`[OAUTH-RELAY] Relaying SPP callback → ${forwardUrl}`);
  res.redirect(redirectTo);
}
