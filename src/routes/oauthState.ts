/**
 * In-memory store mapping OAuth `state` → client's original `redirect_uri`.
 * Used by /oauth/authorize (store) and /callback/spp (retrieve & delete).
 */
export const pendingAuthRequests = new Map<string, string>();
