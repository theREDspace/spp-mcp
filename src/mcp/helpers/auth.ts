import SPPClient from '../../clients/SPPClient';

/**
 * Creates an authenticated SPPClient from a Bearer token.
 * The token is provided by the MCP Client — the server never holds credentials.
 */
export function getAuthenticatedClient(token: string | undefined | null): SPPClient | null {
  if (!token) return null;
  return new SPPClient({
    sppUrl: process.env.SPP_URL as string,
    accessToken: token,
  });
}

export function isAuthError(err: any): boolean {
  return (
    err?.name?.includes('SPPAuthError') ||
    err?.detail?.code === '2' ||
    err?.detail?.code === String(2)
  );
}
