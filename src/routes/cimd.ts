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
import { isIP } from 'node:net';
import { Agent } from 'undici';
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

function isDisallowedIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number);
    const [a, b] = octets;
    if (a === undefined || b === undefined) return true;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
    if (a === 0) return true; // "this network"
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === '::1') return true; // loopback
    // Link-local range is fe80::/10: first 10 bits fixed means the first
    // hextet must fall in 0xfe80-0xfebf inclusive. String-prefix matching
    // (e.g. `startsWith('fe80:')`) misses in-range values like `fe90::1` or
    // `febf::ffff`, so parse the first hextet as a number and range-check it.
    // The first hextet is never elided by `::` abbreviation unless the
    // address itself starts with `::` (e.g. `::1`, `::2`), in which case the
    // first hextet is implicitly 0 — well outside the link-local range.
    const firstHextetRaw = lower.split(':')[0] ?? '';
    const firstHextet = firstHextetRaw === '' ? '0' : firstHextetRaw;
    const firstHextetValue = parseInt(firstHextet, 16);
    if (Number.isNaN(firstHextetValue)) return true; // unparseable — fail closed
    if (firstHextetValue >= 0xfe80 && firstHextetValue <= 0xfebf) return true; // link-local fe80::/10
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local (RFC4193)
    if (lower.startsWith('::ffff:')) {
      // IPv4-mapped IPv6 — re-check the embedded v4 address.
      const v4 = lower.replace('::ffff:', '');
      return isIP(v4) === 4 ? isDisallowedIp(v4) : true;
    }
    return false;
  }
  return true; // unresolvable/unknown — fail closed
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

function isValidCimdDocument(doc: unknown, expectedClientId: string): doc is CimdClient {
  if (typeof doc !== 'object' || doc === null) return false;
  const d = doc as Record<string, unknown>;
  if (d.client_id !== expectedClientId) return false;
  if (typeof d.client_name !== 'string' || d.client_name.length === 0) return false;
  if (!Array.isArray(d.redirect_uris) || d.redirect_uris.length === 0) return false;
  if (!d.redirect_uris.every((u) => typeof u === 'string')) return false;
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
