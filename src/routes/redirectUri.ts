/**
 * Shared redirect_uri validation for BOTH client-registration mechanisms
 * (CIMD documents and DCR /oauth/register).
 *
 * This lives in its own module deliberately: CIMD and DCR validating
 * redirect_uris differently is what produced two separate review findings
 * (CIMD accepting non-URL strings, then DCR accepting them after a
 * membership check was added). One implementation, both callers.
 *
 * A validated redirect_uri ends up in an HTTP redirect carrying an
 * authorization code (see callbackSpp.ts), and it originates from
 * attacker-authorable input in both paths — a self-hosted CIMD document, or
 * an unauthenticated /oauth/register call when REGISTRATION_SECRET is unset.
 */

/** Hosts for which plaintext `http:` is acceptable (RFC 8252 §7.3 native apps). */
function isLoopbackHost(hostname: string): boolean {
  const h = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

/**
 * A redirect_uri must be an absolute `https:` URL, or an `http:` URL on
 * loopback only. Anything else — `javascript:`, `data:`, a bare string, or
 * plaintext `http:` to a public host (which would carry the authorization
 * code in cleartext) — is rejected.
 */
export function isValidRedirectUri(u: unknown): u is string {
  if (typeof u !== 'string' || u.length === 0) return false;
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return false;
  }
  if (parsed.protocol === 'https:') return true;
  if (parsed.protocol === 'http:') return isLoopbackHost(parsed.hostname);
  return false;
}
