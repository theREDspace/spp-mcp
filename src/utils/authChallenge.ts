/**
 * Builds the `WWW-Authenticate` challenge sent with every 401 from /mcp.
 *
 * The `resource_metadata` parameter (RFC 9728) is what lets a client discover where
 * to authenticate without being preconfigured — it points at this server's
 * protected-resource document, which in turn names the authorization server. This
 * is the mechanism the automatic re-auth flow depends on, so both bearerAuth and
 * reauthRewrite emit challenges from here rather than assembling their own.
 */
export function getResourceMetadataUrl(): string {
  const serverUrl = (process.env.APP_BASE_URL || 'http://localhost:3030').replace(/\/$/, '');
  return `${serverUrl}/.well-known/oauth-protected-resource`;
}

export function buildBearerChallenge(extra: string[] = []): string {
  const metadataUrl = getResourceMetadataUrl();
  const parts = [
    'Bearer realm="spp-mcp"',
    `resource_metadata="${metadataUrl}"`,
    ...extra,
  ];
  return parts.join(', ');
}
