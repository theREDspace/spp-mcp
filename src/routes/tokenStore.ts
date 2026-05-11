// Canonical singleton token store module (not a re-export)

const tokenStore = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  set(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    console.log(`[SPP-AUTH] Tokens updated. accessToken: ${access.slice(0,7)}..., refreshToken: ${refresh.slice(0,7)}...`);
  },
  get() {
    return { accessToken: this.accessToken, refreshToken: this.refreshToken };
  },
};

export default tokenStore;
