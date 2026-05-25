import { Request, Response, NextFunction } from 'express';

function getResourceMetadataUrl(): string {
  const serverUrl = (process.env.APP_BASE_URL || 'http://localhost:3030').replace(/\/$/, '');
  return `${serverUrl}/.well-known/oauth-protected-resource`;
}

function buildBearerChallenge(extra: string[] = []): string {
  const metadataUrl = getResourceMetadataUrl();
  const parts = [
    'Bearer realm="spp-mcp"',
    `resource_metadata="${metadataUrl}"`,
    ...extra,
  ];
  return parts.join(', ');
}

/**
 * Bearer token authentication middleware for MCP routes.
 *
 * - Extracts the Bearer token from the Authorization header.
 * - Attaches it to req.bearerToken for downstream use.
 * - Returns 401 with a spec-compliant WWW-Authenticate header on failure.
 *
 * The server does NOT validate the token itself — it passes it through to SPP
 * on each API call (passthrough validation). If SPP rejects the token, the tool
 * will surface an auth error.
 */
export function bearerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const metadataUrl = getResourceMetadataUrl();
    res.set('WWW-Authenticate', buildBearerChallenge());
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Bearer token required. Fetch the resource metadata to start the OAuth flow.',
      resource_metadata: metadataUrl,
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    const metadataUrl = getResourceMetadataUrl();
    res.set('WWW-Authenticate', buildBearerChallenge(['error="invalid_token"']));
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Bearer token is empty.',
      resource_metadata: metadataUrl,
    });
    return;
  }

  (req as any).bearerToken = token;
  next();
}
