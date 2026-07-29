/**
 * OAuth Client ID Metadata Documents (CIMD) — MCP spec revision 2026-07-28
 * (draft-ietf-oauth-client-id-metadata-document-00), as the alternative to
 * Dynamic Client Registration for clients this authorization server proxy
 * has no pre-existing relationship with.
 *
 * A `client_id` that is itself an https URL with a path component is treated
 * as a CIMD reference: fetch that URL, validate the document, and treat its
 * contents as the client's registration.
 *
 * SSRF hardening is mandatory here: we are making a server-side fetch of an
 * attacker-controllable URL. Block loopback/private/link-local/multicast
 * ranges *after* DNS resolution (not just string-matching the hostname),
 * require https, follow zero redirects, cap the response body size, and
 * apply a hard timeout.
 */
import { lookup } from 'node:dns/promises';
import { Agent } from 'undici';
import ipaddr from 'ipaddr.js';
import { load as loadConfig } from '../config';

export interface CimdClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
}

const MAX_BODY_BYTES = 1_000_000; // 1 MB
const FETCH_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  client: CimdClient;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Evict expired entries on every access (same sweep-on-access convention as
 * the OAuth proxy's `TtlMap` in `oauthState.ts`). `client_id` is
 * attacker-supplied, so without this the cache grows unboundedly for the
 * lifetime of the process — expiry was previously checked only on a cache
 * hit for the SAME key, never proactively.
 */
function sweepExpiredCacheEntries(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function isUrlFormClientId(clientId: string): URL | null {
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!url.pathname || url.pathname === '/') return null;
  return url;
}

/**
 * Fail-closed allowlist: block everything except genuine public unicast
 * addresses, using `ipaddr.js`'s range classification rather than a
 * hand-rolled denylist.
 *
 * A hand-rolled per-range string/octet matcher was tried twice in this
 * module's history and found newly-broken both times (an IPv6 `fe80::/10`
 * range treated as a literal string prefix, then a follow-up review that
 * additionally found CGNAT `100.64.0.0/10` — reachable via real
 * publicly-trusted TLS certs, e.g. Tailscale's `*.ts.net` — the IPv6
 * unspecified address `::`, and the NAT64 `64:ff9b::/96` prefix all slipping
 * through unblocked). Denylists only cover the ranges someone thought to
 * enumerate; an allowlist on a well-maintained library's classification is
 * structurally safer here — anything not explicitly recognized as public
 * `unicast` is blocked, including ranges nobody thought to name.
 * `ipaddr.js`'s `process()` also transparently unwraps IPv4-mapped IPv6
 * addresses (`::ffff:127.0.0.1`) to their embedded IPv4 form before
 * classifying, so that case needs no special-casing here either.
 */
function isDisallowedIp(address: string): boolean {
  try {
    return ipaddr.process(address).range() !== 'unicast';
  } catch {
    return true; // unparseable — fail closed
  }
}

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

/**
 * Resolve `hostname` via DNS exactly once and validate every returned address
 * against the SSRF blocklist. Returns the validated addresses on success, or
 * `null` if disallowed/unresolvable.
 *
 * IMPORTANT (DNS-rebinding / TOCTOU): this is the ONLY DNS resolution that
 * happens for a given CIMD fetch. The addresses returned here MUST be reused
 * (via a pinned `connect.lookup`) for the actual `fetch()` call rather than
 * letting undici re-resolve the hostname independently — otherwise a
 * malicious/short-TTL DNS server could return a benign IP here and a
 * private/internal IP for the real connection, bypassing this check entirely.
 */
async function resolveAndValidateHost(hostname: string): Promise<ResolvedAddress[] | null> {
  const config = loadConfig();
  const allowlist = (config.CIMD_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(hostname)) return null;

  // `URL#hostname` serializes an IPv6 host with its enclosing brackets (e.g.
  // `[fe80::1]`), but `dns.lookup`/`isIP` expect the bare address — strip them
  // so IPv6-literal hosts are actually resolved/checked rather than treated
  // as an unresolvable hostname.
  const lookupHost =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

  let addresses: { address: string; family: number }[];
  try {
    const result = await lookup(lookupHost, { all: true, verbatim: true });
    addresses = Array.isArray(result) ? result : [result];
  } catch {
    return null; // DNS failure — fail closed
  }
  if (addresses.length === 0) return null;
  if (!addresses.every((a) => !isDisallowedIp(a.address))) return null;

  return addresses.map((a) => ({
    address: a.address,
    family: (a.family === 6 ? 6 : 4) as 4 | 6,
  }));
}

/**
 * Build an undici `Agent` whose `connect.lookup` unconditionally returns the
 * already-validated `addresses` — no further DNS resolution occurs for
 * connections made through it. TLS SNI/certificate hostname validation and
 * the HTTP `Host` header are unaffected: those are driven by the URL/hostname
 * passed to `fetch()`, not by this connector, so virtual-hosting and
 * certificate checks against the real hostname still work correctly. This
 * closes the DNS-rebinding TOCTOU gap: the IP address that was checked is
 * exactly the IP address that gets connected to.
 */
function pinnedDispatcher(addresses: ResolvedAddress[]): Agent {
  return new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => {
        callback(null, addresses.map((a) => ({ address: a.address, family: a.family })));
      },
    },
  });
}

/**
 * A `redirect_uri` accepted here is later compared against the client's
 * request `redirect_uri` param and, on a match, ends up in an HTTP redirect
 * (see `callbackSpp.ts`). The CIMD document is entirely attacker-authored
 * (fetched from a URL the caller chooses), so an entry that isn't a genuine
 * absolute http(s) URL — e.g. `javascript:...`, `data:...`, or a bare string
 * with no scheme — must not be accepted as a valid redirect target.
 */
function isValidRedirectUri(u: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' || parsed.protocol === 'http:';
}

function isValidCimdDocument(doc: unknown, expectedClientId: string): doc is CimdClient {
  if (typeof doc !== 'object' || doc === null) return false;
  const d = doc as Record<string, unknown>;
  if (d.client_id !== expectedClientId) return false;
  if (typeof d.client_name !== 'string' || d.client_name.length === 0) return false;
  if (!Array.isArray(d.redirect_uris) || d.redirect_uris.length === 0) return false;
  if (!d.redirect_uris.every((u) => typeof u === 'string' && isValidRedirectUri(u))) return false;
  return true;
}

/**
 * Read a fetch Response body as UTF-8 text, enforcing MAX_BODY_BYTES while
 * streaming rather than after fully buffering. Aborts and cancels the
 * underlying stream as soon as the running byte count exceeds the cap, so a
 * malicious/oversized host response never gets fully read into memory.
 */
async function readBodyWithCap(response: Response): Promise<string | null> {
  if (!response.body) {
    // Environments without a streamable body (shouldn't happen with
    // undici/Node fetch, but guard defensively) fall back to a buffered read.
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
        if (total > MAX_BODY_BYTES) {
          await reader.cancel().catch(() => {});
          return null;
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

export async function resolveCimdClient(clientId: string): Promise<CimdClient | null> {
  const url = isUrlFormClientId(clientId);
  if (!url) return null;

  sweepExpiredCacheEntries();
  const cached = cache.get(clientId);
  if (cached && cached.expiresAt > Date.now()) return cached.client;

  const validatedAddresses = await resolveAndValidateHost(url.hostname);
  if (!validatedAddresses) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const dispatcher = pinnedDispatcher(validatedAddresses);
  try {
    // `dispatcher` is a Node/undici-specific extension of the Fetch API's
    // RequestInit that isn't part of the lib.dom.d.ts typing TypeScript
    // resolves globalThis.fetch's options against, so it's typed explicitly
    // here even though Node's runtime fetch honors it (verified experimentally
    // against a live network target: pinning `connect.lookup` to a
    // deliberately wrong IP made the fetch fail to connect, while pinning it
    // to the real resolved IP succeeded).
    const requestInit: RequestInit & { dispatcher: Agent } = {
      redirect: 'manual',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      // Pin the connection to the exact address(es) validated above — do not
      // let fetch/undici re-resolve DNS independently (see
      // resolveAndValidateHost's doc comment for why).
      dispatcher,
    };
    const response = await fetch(url.toString(), requestInit);
    if (!response.ok) return null;
    if (response.redirected) return null;
    if ((response.status >= 300 && response.status < 400)) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('json')) {
      // Some hosts omit/mislabel content-type for static JSON files; only hard-reject
      // obviously non-JSON types, and let JSON.parse below be the final arbiter.
      if (contentType.includes('html') || contentType.includes('text/plain')) return null;
    }

    const text = await readBodyWithCap(response);
    if (text === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }

    if (!isValidCimdDocument(parsed, clientId)) return null;

    cache.set(clientId, { client: parsed, expiresAt: Date.now() + CACHE_TTL_MS });
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    void dispatcher.close().catch(() => {});
  }
}

/** Reset the in-memory cache; intended for tests only. */
export function _resetCimdCacheForTests(): void {
  cache.clear();
}
