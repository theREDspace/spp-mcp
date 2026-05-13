// EmailTokenStore.ts: Secure, per-user (by email) token storage. Recommended: replace with encrypted DB for production.

interface SppTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

class EmailTokenStore {
  private store = new Map<string, SppTokenData>();

  set(email: string, tokenData: SppTokenData) {
    this.store.set(email.toLowerCase().trim(), tokenData);
  }

  get(email: string): SppTokenData | undefined {
    return this.store.get(email.toLowerCase().trim());
  }

  delete(email: string) {
    this.store.delete(email.toLowerCase().trim());
  }

  has(email: string) {
    return this.store.has(email.toLowerCase().trim());
  }

  // Optionally: list all emails (for admin/debug)
  allEmails(): string[] {
    return Array.from(this.store.keys());
  }
}

const emailTokenStore = new EmailTokenStore();
export default emailTokenStore;
export type { SppTokenData };