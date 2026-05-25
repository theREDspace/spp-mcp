import { Request, Response } from 'express';
import axios from 'axios';

/**
 * POST /oauth/token
 *
 * Token endpoint proxy: receives the MCP client's code-exchange or
 * refresh-token request, replaces its redirect_uri with our fixed
 * SPP_CALLBACK_URL (required to match what was used in the /authorize step),
 * forwards to SPP's token endpoint, and returns the response verbatim.
 *
 * This is necessary because the MCP client sends its own redirect_uri in
 * the token exchange, but SPP will reject it unless it matches the registered
 * redirect_uri (SPP_CALLBACK_URL). This server never stores the returned tokens.
 */
export async function oauthTokenHandler(req: Request, res: Response) {
  const sppUrl = (process.env.SPP_URL || '').replace(/\/$/, '');
  const callbackUrl = process.env.SPP_CALLBACK_URL;

  if (!sppUrl) {
    res.status(500).json({ error: 'server_error', error_description: 'SPP_URL is not set.' });
    return;
  }
  if (!callbackUrl) {
    res.status(500).json({ error: 'server_error', error_description: 'SPP_CALLBACK_URL is not set.' });
    return;
  }

  // Clone the body and replace redirect_uri with our registered one
  const body: Record<string, string> = { ...req.body };
  const grantType = body.grant_type || 'unknown';
  const authMethod = req.headers.authorization ? 'client_secret_basic' : 'client_secret_post_or_public';
  console.log('[OAUTH-TOKEN] Incoming token request', {
    grantType,
    authMethod,
    hasRefreshToken: Boolean(body.refresh_token),
    hasCode: Boolean(body.code),
    hasRedirectUri: Boolean(body.redirect_uri),
    hasCodeVerifier: Boolean(body.code_verifier),
  });

  if (body.redirect_uri) {
    console.log(`[OAUTH-TOKEN] Replacing redirect_uri: ${body.redirect_uri} → ${callbackUrl}`);
    body.redirect_uri = callbackUrl;
  }

  // Strip PKCE code_verifier — SPP does not support PKCE
  if (body.code_verifier) {
    console.log('[OAUTH-TOKEN] Stripping code_verifier (PKCE not supported by SPP)');
    delete body.code_verifier;
  }

  try {
    const tokenUrl = `${sppUrl}/login/oauth2/v1/token`;

    const response = await axios.post(
      tokenUrl,
      new URLSearchParams(body).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Forward Authorization header (client_secret_basic) if present
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
        // Pass all status codes through — don't throw on 4xx
        validateStatus: () => true,
      }
    );

    console.log(`[OAUTH-TOKEN] SPP responded with ${response.status}`);
    if (response.status >= 400) {
      console.log('[OAUTH-TOKEN] SPP error response', response.data);
    } else {
      console.log('[OAUTH-TOKEN] Token response shape', {
        grantType,
        hasAccessToken: Boolean(response.data?.access_token),
        hasRefreshToken: Boolean(response.data?.refresh_token),
        expiresIn: response.data?.expires_in ?? null,
        tokenType: response.data?.token_type ?? null,
      });
    }
    res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error('[OAUTH-TOKEN] Error proxying token request:', err.message);
    res.status(502).json({
      error: 'server_error',
      error_description: 'Failed to reach SPP token endpoint.',
    });
  }
}
