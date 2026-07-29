import { Request, Response } from 'express';
import { createClient } from './clientRegistry';
import { isValidRedirectUri } from './redirectUri';

/**
 * POST /oauth/register — RFC 7591 Dynamic Client Registration.
 *
 * Issues a NEW per-client client_id/client_secret on every call. The proxy
 * holds these locally (data/clients.json) and translates incoming auth at
 * /oauth/token into the single upstream SPP credential pair. This prevents
 * leaking SPP_CLIENT_SECRET to MCP clients.
 *
 * Gate registration with REGISTRATION_SECRET in any non-trivial deployment.
 */
export function oauthRegisterHandler(req: Request, res: Response) {
  const registrationSecret = process.env.REGISTRATION_SECRET;
  if (registrationSecret) {
    const auth = req.headers.authorization || '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (provided !== registrationSecret) {
      res.status(401).json({
        error: 'unauthorized_client',
        error_description: 'Invalid or missing registration secret.',
      });
      return;
    }
  }

  const body = (req.body || {}) as Record<string, unknown>;

  // Registered redirect_uris are later matched at /oauth/authorize and then
  // used as the target of a redirect carrying an authorization code, so they
  // must be real absolute https (or loopback-http) URLs — not bare strings or
  // `javascript:`/`data:` schemes. Reject the registration outright rather
  // than silently filtering bad entries, so a client that sent a
  // typo'd/unsupported redirect_uri finds out now instead of failing opaquely
  // at /authorize. Same validator the CIMD path uses (routes/redirectUri.ts).
  const rawRedirectUris = Array.isArray(body.redirect_uris) ? (body.redirect_uris as unknown[]) : [];
  const invalid = rawRedirectUris.filter((u) => !isValidRedirectUri(u));
  if (invalid.length > 0) {
    res.status(400).json({
      error: 'invalid_redirect_uri',
      error_description:
        'redirect_uris must be absolute https URLs (or http on loopback: localhost, 127.0.0.1, [::1]).',
    });
    return;
  }

  const { record, client_secret } = createClient({
    client_name: typeof body.client_name === 'string' ? body.client_name : undefined,
    redirect_uris: rawRedirectUris.filter(isValidRedirectUri),
    token_endpoint_auth_method:
      typeof body.token_endpoint_auth_method === 'string'
        ? body.token_endpoint_auth_method
        : undefined,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  res.status(201).json({
    client_id: record.client_id,
    client_secret,
    client_id_issued_at: Math.floor(record.created_at / 1000),
    client_secret_expires_at: 0, // never expires
    client_name: record.client_name,
    redirect_uris: record.redirect_uris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: record.token_endpoint_auth_method,
  });
}
