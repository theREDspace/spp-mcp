import { Request, Response } from 'express';

/**
 * POST /oauth/register
 *
 * Stub Dynamic Client Registration (RFC 7591) endpoint.
 *
 * MCP clients like mcp-remote require DCR to obtain a client_id before
 * starting the OAuth flow. Since our SPP OAuth app is pre-registered, we
 * simply return the existing credentials to any caller.
 *
 * This effectively makes the SPP app a "shared" OAuth client for all MCP
 * consumers — which is fine for internal/dev use.
 *
 * SECURITY: This endpoint returns SPP_CLIENT_SECRET to callers.
 * To restrict access, set REGISTRATION_SECRET in your environment.
 * When set, callers must supply it as: Authorization: Bearer <REGISTRATION_SECRET>
 * When unset, any caller can retrieve the credentials (acceptable on private networks).
 */
export function oauthRegisterHandler(req: Request, res: Response) {
  const clientId = process.env.SPP_CLIENT_ID;
  const clientSecret = process.env.SPP_CLIENT_SECRET;
  const registrationSecret = process.env.REGISTRATION_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'SPP_CLIENT_ID or SPP_CLIENT_SECRET not configured.',
    });
    return;
  }

  // Optional bearer-token guard — enabled when REGISTRATION_SECRET is set in env
  if (registrationSecret) {
    const authHeader = req.headers.authorization || '';
    const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (provided !== registrationSecret) {
      res.status(401).json({
        error: 'unauthorized_client',
        error_description: 'Invalid or missing registration secret.',
      });
      return;
    }
  }

  // Prevent credentials from being stored in caches, logs, or browser history
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  res.status(201).json({
    client_id: clientId,
    client_secret: clientSecret,
    client_name: req.body?.client_name || 'mcp-client',
    redirect_uris: req.body?.redirect_uris || [],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
  });
}
