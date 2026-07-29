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
 *
 * ── Why this is a deny-list, unlike the SSRF IP check in cimd.ts ──
 * The SSRF check uses a fail-closed allow-list (only public `unicast`),
 * because the set of non-public IP ranges is finite and enumerable, so an
 * allow-list is both possible and strictly safer. The opposite is true here:
 * RFC 8252 §7.1 sanctions private-use URI schemes for native apps, and every
 * native app invents its own (`cursor://`, `vscode://`, `com.example.app:/`).
 * That set is unbounded, so an allow-list of schemes would reject legitimate
 * clients — which is exactly the regression this module originally shipped.
 * What IS finite is the set of schemes a browser will execute or use to reach
 * local resources, so those are denied and everything else absolute is
 * allowed.
 */

/** Hosts for which plaintext `http:` is acceptable (RFC 8252 §7.3 native apps). */
function isLoopbackHost(hostname: string): boolean {
  const h = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

/**
 * Schemes that execute script in a browser context, or address local/browser
 * -internal resources. `new URL()` normalizes the scheme to lowercase, so a
 * lowercase comparison also covers `JavaScript:` / `DATA:` obfuscation, and
 * URL parsing itself rejects control characters inside the scheme.
 */
const DENIED_SCHEMES = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
  'about:',
  'filesystem:',
  'view-source:',
  'jar:',
  'chrome:',
  'chrome-extension:',
  'moz-extension:',
  'resource:',
]);

/**
 * A redirect_uri must be an absolute URI that is one of:
 *   - `https:` — any host;
 *   - `http:` — loopback only (`localhost`, `127.0.0.1`, `[::1]`), per RFC
 *     8252 §7.3, so an authorization code is never sent over cleartext to a
 *     remote host;
 *   - a private-use scheme (`cursor://…`, `com.example.app:/oauth`), per RFC
 *     8252 §7.1 — the common case for native/desktop MCP clients.
 *
 * Rejected: script/local-resource schemes (see `DENIED_SCHEMES`), plaintext
 * `http:` to a non-loopback host, relative or unparseable strings, and a bare
 * scheme with neither host nor path (useless as a redirect target).
 */
export function isValidRedirectUri(u: unknown): u is string {
  if (typeof u !== 'string' || u.length === 0) return false;

  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return false; // relative, or not a URI at all
  }

  if (DENIED_SCHEMES.has(parsed.protocol)) return false;
  if (parsed.protocol === 'https:') return true;
  if (parsed.protocol === 'http:') return isLoopbackHost(parsed.hostname);

  // Private-use / custom scheme: require something to actually redirect to.
  return parsed.hostname.length > 0 || parsed.pathname.length > 1;
}
