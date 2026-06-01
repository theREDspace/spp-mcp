/**
 * In-memory store mapping OAuth `state` → context needed for the callback
 * (the client's original `redirect_uri`, optional PKCE challenge, etc.).
 *
 * Single-instance deployment, so an in-memory Map is sufficient. Entries are
 * evicted after `STATE_TTL_MS` to prevent unbounded growth from abandoned flows.
 */

export interface PendingAuthEntry {
  clientRedirectUri: string;
  codeChallenge?: string | undefined;
  codeChallengeMethod?: 'S256' | 'plain' | undefined;
  clientId?: string | undefined;
  createdAt: number;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

class TtlMap<V extends { createdAt: number }> {
  private store = new Map<string, V>();

  set(key: string, value: V) {
    this.store.set(key, value);
    this.sweep();
  }

  get(key: string): V | undefined {
    this.sweep();
    return this.store.get(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  private sweep() {
    const cutoff = Date.now() - STATE_TTL_MS;
    for (const [k, v] of this.store) {
      if (v.createdAt < cutoff) this.store.delete(k);
    }
  }
}

export const pendingAuthRequests = new TtlMap<PendingAuthEntry>();
