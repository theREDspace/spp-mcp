import { Request, Response } from 'express';
import SPPClient from '../clients/SPPClient';
import emailTokenStore from '../services/EmailTokenStore';

// GET /projects handler
export default async function getProjectsHandler(req: Request, res: Response) {
  const email = (req as any).email as string | undefined;
  const tokenData = email ? emailTokenStore.get(email) : undefined;
  try {
    if (!tokenData?.accessToken || !tokenData?.refreshToken) {
      const appBaseUrl = process.env.APP_BASE_URL || "";
      res.status(401).json({
        success: false,
        auth_required: true,
        error: "Authentication required",
        message: "Authentication with Redspace SPP is required for this action. Please authenticate by clicking the provided URL, then retry your request.",
        auth_url: `${appBaseUrl}/signin`,
        docs: `${appBaseUrl}/instructions`
      });
      return;
    }
    const client = new SPPClient({
      sppUrl: process.env.SPP_URL as string,
      clientId: process.env.SPP_CLIENT_ID as string,
      clientSecret: process.env.SPP_CLIENT_SECRET as string,
      callbackUrl: process.env.SPP_CALLBACK_URL as string,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      logging: true,
      onRefresh: async ({ access_token, refresh_token }) => {
        if (email) {
          const current = emailTokenStore.get(email) ?? tokenData;
          emailTokenStore.set(email, { ...current, accessToken: access_token, refreshToken: refresh_token });
        }
        console.log('[SPP-AUTH] Token auto-refreshed and stored');
      },
    });
    const projects = await client.list('Project', {}, 100, 0);
    res.json({ success: true, projects });
  } catch (err: any) {
    console.error('Error in /projects:', err);
    let status = 500;
    let error = err?.message || 'Unknown error';
    let detail = err?.detail || undefined;
    if (err?.code) {
      if (typeof err.code === 'string' && /^4\d\d$/.test(err.code)) status = Number(err.code);
      else if (typeof err.code === 'number' && err.code >= 400 && err.code < 600) status = err.code;
    }
    if ((detail && detail.code == '2') || (err.name && err.name.includes('SPPAuthError'))) {
      status = 401;
      const appBaseUrl = process.env.APP_BASE_URL || "";
      error = 'Not authenticated or token expired.';
      detail = {
        auth_required: true,
        message: 'Your authentication with Redspace SPP has expired or is missing. Please re-authenticate using the link provided, then retry your request.',
        auth_url: `${appBaseUrl}/signin`,
        docs: `${appBaseUrl}/instructions`
      };
      console.log('[SPP-AUTH] Auth failure: token likely missing or expired.');
    }
    res.status(status).json({ success: false, error, detail });
  }
}
