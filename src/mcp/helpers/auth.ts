import SPPClient from '../../clients/SPPClient';
import emailTokenStore, { SppTokenData } from '../../services/EmailTokenStore';
import type { ToolResponse } from '../tools/types';

// NOTE: All functions expect "email" to be explicitly provided and enforced upstream (middleware/context)!

export function getAuthUrl() {
  return new SPPClient({}).getAuthUrl();
}

// Now expects email to be passed in context!!
export function getAuthenticatedClient(email: string | undefined | null): SPPClient | null {
  if (!email) return null;
  const tokenData = emailTokenStore.get(email);
  if (!tokenData || !tokenData.accessToken || !tokenData.refreshToken) {
    return null;
  }
  return new SPPClient({
    sppUrl: process.env.SPP_URL as string,
    clientId: process.env.SPP_CLIENT_ID as string,
    clientSecret: process.env.SPP_CLIENT_SECRET as string,
    callbackUrl: process.env.SPP_CALLBACK_URL as string,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    onRefresh: async ({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
      // Re-read current token data from store to avoid spreading stale snapshot
      const current = emailTokenStore.get(email) ?? tokenData;
      emailTokenStore.set(email, {
        ...current,
        accessToken: access_token,
        refreshToken: refresh_token,
      });
    },
  });
}

export function authRequiredResponse(): ToolResponse {
  const auth_url = getAuthUrl();
  return {
    content: [
      {
        type: 'text',
        text: [
          '🔒 Authentication required.',
          '',
          `Please authenticate by clicking the link below, then **retry your original request**:`,
          '',
          auth_url,
          '',
          'Once you have signed in, simply repeat what you asked me to do and I will proceed automatically.',
        ].join('\n')
      }
    ]
  };
}

export function isAuthError(err: any) {
  return err?.name?.includes('SPPAuthError') || err?.detail?.code === '2';
}
