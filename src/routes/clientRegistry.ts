/**
 * File-backed registry of OAuth clients registered via /oauth/register.
 *
 * Each MCP client (Inspector, Claude Desktop, mcp-remote, etc.) calls DCR once
 * and gets its own proxy credentials. The proxy translates those to the single
 * SPP_CLIENT_ID / SPP_CLIENT_SECRET upstream so SPP never sees per-client creds.
 *
 * Single-instance deployment, so a JSON file at data/clients.json is enough.
 * File is created with mode 0o600 on first write. No encryption: anyone with
 * filesystem access to the server already has the SPP secret too.
 */
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import { dirname, resolve } from 'path';

export interface RegisteredClient {
  client_id: string;
  /** SHA-256(client_secret), hex. Plaintext secret is shown only at registration time. */
  client_secret_hash: string;
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method: 'client_secret_basic' | 'client_secret_post' | 'none';
  created_at: number;
}

const FILE = resolve(process.env.CLIENT_REGISTRY_PATH || 'data/clients.json');

let cache: Map<string, RegisteredClient> | null = null;

function load(): Map<string, RegisteredClient> {
  if (cache) return cache;
  cache = new Map();
  if (existsSync(FILE)) {
    try {
      const raw = JSON.parse(readFileSync(FILE, 'utf8')) as RegisteredClient[];
      for (const c of raw) cache.set(c.client_id, c);
    } catch (e) {
      console.error('[CLIENT-REGISTRY] Failed to parse', FILE, e);
    }
  }
  return cache;
}

function persist() {
  const all = Array.from(load().values());
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(all, null, 2), { mode: 0o600 });
  try {
    chmodSync(FILE, 0o600);
  } catch {
    /* best-effort on platforms without POSIX perms */
  }
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function createClient(input: {
  client_name?: string | undefined;
  redirect_uris?: string[] | undefined;
  token_endpoint_auth_method?: string | undefined;
}): { record: RegisteredClient; client_secret: string } {
  const client_id = `mcp-${randomBytes(16).toString('hex')}`;
  const client_secret = randomBytes(32).toString('base64url');
  const method =
    input.token_endpoint_auth_method === 'client_secret_post' ||
    input.token_endpoint_auth_method === 'none'
      ? input.token_endpoint_auth_method
      : 'client_secret_basic';

  const record: RegisteredClient = {
    client_id,
    client_secret_hash: sha256Hex(client_secret),
    redirect_uris: input.redirect_uris ?? [],
    token_endpoint_auth_method: method,
    created_at: Date.now(),
    ...(input.client_name ? { client_name: input.client_name } : {}),
  };
  load().set(client_id, record);
  persist();
  return { record, client_secret };
}

export function getClient(client_id: string): RegisteredClient | undefined {
  return load().get(client_id);
}

/** Constant-time client_secret verification. */
export function verifyClientSecret(client_id: string, client_secret: string): boolean {
  const rec = getClient(client_id);
  if (!rec) return false;
  const a = Buffer.from(rec.client_secret_hash, 'hex');
  const b = Buffer.from(sha256Hex(client_secret), 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Parse Authorization header or POST body for client credentials per RFC 6749 §2.3.1.
 * Returns null if no credentials present, or a parse error if malformed.
 */
export function extractClientCredentials(
  authHeader: string | undefined,
  body: Record<string, unknown>
): { client_id: string; client_secret?: string | undefined } | null {
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8');
      const idx = decoded.indexOf(':');
      if (idx === -1) return null;
      const cid = decodeURIComponent(decoded.slice(0, idx));
      const sec = decodeURIComponent(decoded.slice(idx + 1));
      return { client_id: cid, client_secret: sec };
    } catch {
      return null;
    }
  }
  if (typeof body.client_id === 'string') {
    const out: { client_id: string; client_secret?: string | undefined } = {
      client_id: body.client_id,
    };
    if (typeof body.client_secret === 'string') out.client_secret = body.client_secret;
    return out;
  }
  return null;
}
