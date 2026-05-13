import SPPClient from '../../clients/SPPClient';
import tokenStore from '../../routes/tokenStore';
import type { ToolResponse } from '../tools/types';

export function getAuthUrl() {
  return new SPPClient({}).getAuthUrl();
}

export function getAuthenticatedClient(): SPPClient | null {
  const { accessToken, refreshToken } = tokenStore.get();
  if (!accessToken || !refreshToken) {
    return null;
  }
  return new SPPClient({
    sppUrl: process.env.SPP_URL as string,
    clientId: process.env.SPP_CLIENT_ID as string,
    clientSecret: process.env.SPP_CLIENT_SECRET as string,
    callbackUrl: process.env.SPP_CALLBACK_URL as string,
    accessToken,
    refreshToken,
    onRefresh: async ({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
      tokenStore.set(access_token, refresh_token);
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
