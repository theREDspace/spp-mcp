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
