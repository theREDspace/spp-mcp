import { Request, Response } from 'express';

/**
 * GET /.well-known/oauth-protected-resource
 *
 * RFC 9728 Protected Resource Metadata.
 * Tells the MCP Client which authorization server to use and what scopes are available.
 * The authorization_servers entry points back to THIS server so we can proxy the AS
 * metadata (since SPP may not expose its own /.well-known/oauth-authorization-server).
 */
export function oauthProtectedResourceHandler(_req: Request, res: Response) {
  const serverUrl = (process.env.APP_BASE_URL || 'http://localhost:3030').replace(/\/$/, '');

  res.json({
    resource: `${serverUrl}/mcp`,
    authorization_servers: [serverUrl],
    scopes_supported: ['xml', 'rest'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${serverUrl}/health`,
  });
}

/**
 * GET /.well-known/oauth-authorization-server
 *
 * OAuth 2.0 Authorization Server Metadata (RFC 8414).
 * Proxies SPP's OAuth endpoints so MCP clients can auto-discover them even if
 * SPP does not expose its own /.well-known document.
 *
 * NOTE: registration_endpoint is intentionally omitted — we do not support
 * Dynamic Client Registration. Clients must be pre-registered with SPP.
 */
export function oauthAuthorizationServerHandler(_req: Request, res: Response) {
  const sppUrl = (process.env.SPP_URL || '').replace(/\/$/, '');
  const serverUrl = (process.env.APP_BASE_URL || 'http://localhost:3030').replace(/\/$/, '');

  res.json({
    issuer: serverUrl,
    // authorization_endpoint points directly to SPP so the MCP client opens SPP's
    // real login page. SPP_CALLBACK_URL must be registered as the redirect_uri in
    // the SPP OAuth app — MCP Inspector must be configured to use it as well.
    authorization_endpoint: `${serverUrl}/oauth/authorize`,
    // token_endpoint is proxied through this server so we can swap the MCP client's
    // redirect_uri for SPP_CALLBACK_URL before forwarding to SPP.
    token_endpoint: `${serverUrl}/oauth/token`,
    registration_endpoint: `${serverUrl}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    scopes_supported: ['xml', 'rest'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
  });
}
