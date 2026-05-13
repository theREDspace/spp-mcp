// StateStore.ts: Ephemeral, secure mapping from OAuth state param to user email. In-memory only - for distributed or prod, use Redis.

class StateStore {
  private store = new Map<string, { email: string, issued: number }>();
  // Default TTL of 10 minutes
  private ttl = 10 * 60 * 1000;

  set(state: string, email: string) {
    this.store.set(state, { email, issued: Date.now() });
  }

  get(state: string): string | null {
    const entry = this.store.get(state);
    if (!entry) return null;
    if (Date.now() - entry.issued > this.ttl) {
      this.store.delete(state);
      return null;
    }
    return entry.email;
  }

  delete(state: string) {
    this.store.delete(state);
  }
}

const stateStore = new StateStore();
export default stateStore;