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
    if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return true; // link-local
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

async function hostIsAllowed(hostname: string): Promise<boolean> {
  const config = loadConfig();
  const allowlist = (config.CIMD_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(hostname)) return false;

  let addresses: { address: string }[];
  try {
    const result = await lookup(hostname, { all: true, verbatim: true });
    addresses = Array.isArray(result) ? result : [result];
  } catch {
    return false; // DNS failure — fail closed
  }
  if (addresses.length === 0) return false;
  return addresses.every((a) => !isDisallowedIp(a.address));
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

export async function resolveCimdClient(clientId: string): Promise<CimdClient | null> {
  const url = isUrlFormClientId(clientId);
  if (!url) return null;

  const cached = cache.get(clientId);
  if (cached && cached.expiresAt > Date.now()) return cached.client;

  const allowed = await hostIsAllowed(url.hostname);
  if (!allowed) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      redirect: 'manual',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    if (response.redirected) return null;
    if ((response.status >= 300 && response.status < 400)) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('json')) {
      // Some hosts omit/mislabel content-type for static JSON files; only hard-reject
      // obviously non-JSON types, and let JSON.parse below be the final arbiter.
      if (contentType.includes('html') || contentType.includes('text/plain')) return null;
    }

    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;

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
  }
}

/** Reset the in-memory cache; intended for tests only. */
export function _resetCimdCacheForTests(): void {
  cache.clear();
}
