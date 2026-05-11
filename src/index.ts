require('dotenv').config();
import SPPClient from "./clients/SPPClient";
// // export the client class if a user wants to build services manually
// export default SPPClient;//export all services
// export * from "./services/index.js"
// // Export error classes for consumer error handling
// export { type SPPErrorDetail } from "./clients/errors";
// export type { RefreshTokenResponse, SPPClientOptions } from "./clients/SPPClient.js";
// export {
//   SPPAuthError,
//   SPPBusinessError,
//   SPPRequestError,
//   SPPResponseError,
//   SPPApiError
// } from './clients/errors';
// // export status codes (e.g., for consumer-side logic or tests)
// export { SPPStatus, SPPStatusInfo } from "./utils/errorCodes.js";
// //export types
// export * from './types/index.js';

import express, { Request, Response, NextFunction } from 'express';
import axios from "axios";

// ----- GLOBAL IN-MEMORY TOKEN STORE (MCP MVP) -----
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

const app = express();
const PORT = 3030;

app.use(express.json());

// ----- SIGNIN ROUTE (SPP OAUTH) -----
app.get('/signin', (req: Request, res: Response) => {
  const client = new SPPClient({});
  const authUrl = client.getAuthUrl();
  console.log(`[SPP-AUTH] Redirecting user to: ${authUrl}`);
  res.redirect(authUrl);
});

// Simple error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ----- OAUTH2 CALLBACK (GET): TOKEN EXCHANGE AND STORAGE -----
app.get('/callback/spp', async (req: Request, res: Response) => {
  const code = req.query.code;
  if (!code) {
    res.status(400).send('Missing ?code in query');
    return;
  }
  try {
    // Exchange code for tokens
    const sppUrl = process.env.SPP_URL;
    const clientId = process.env.SPP_CLIENT_ID;
    const clientSecret = process.env.SPP_CLIENT_SECRET;
    const callbackUrl = process.env.SPP_CALLBACK_URL;
    const tokenResp = await axios.post(
      `${sppUrl}/login/oauth2/v1/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: callbackUrl as string,
      }),
      {
        auth: { username: clientId as string, password: clientSecret as string },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    const { access_token, refresh_token, expires_in } = tokenResp.data;
    tokenStore.set(access_token, refresh_token);
    console.log(`[SPP-AUTH] Auth success. Access token expires in ${expires_in || 'unknown'}s.`);
    res.send(`<h3>Authentication successful.</h3><p>You can now access SPP endpoints. <a href="/projects">Try /projects</a></p>`);
  } catch (err: any) {
    console.error('[SPP-AUTH] Error exchanging code for token:', err?.response?.data || err);
    res.status(500).send('Failed to exchange code for tokens. See server logs.');
  }
});

// (Legacy POST handler left in place, if needed)
app.post('/callback/spp', (req: Request, res: Response) => {
  console.log('Received /callback/spp payload:', req.body);
  res.status(200).json({ status: 'received' });
});

// ---- TEST ENDPOINT FOR SPP PROJECTS ----
app.get('/projects', async (req: Request, res: Response) => {
  try {
    const { accessToken, refreshToken } = tokenStore.get();
    if (!accessToken || !refreshToken) {
      res.status(401).json({ success: false, error: 'Not authenticated. Please visit /signin.' });
      return;
    }
    const client = new SPPClient({
      sppUrl: process.env.SPP_URL as string,
      clientId: process.env.SPP_CLIENT_ID as string,
      clientSecret: process.env.SPP_CLIENT_SECRET as string,
      callbackUrl: process.env.SPP_CALLBACK_URL as string,
      accessToken,
      refreshToken,
      logging: true,
      onRefresh: async ({ access_token, refresh_token }) => {
        tokenStore.set(access_token, refresh_token);
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
      if (typeof err.code === 'string' && /^4\\d\\d$/.test(err.code)) status = Number(err.code);
      else if (typeof err.code === 'number' && err.code >= 400 && err.code < 600) status = err.code;
    }
    if ((detail && detail.code == '2') || (err.name && err.name.includes('SPPAuthError'))) {
      status = 401;
      error = 'Not authenticated or token expired. Please visit /signin.';
      console.log('[SPP-AUTH] Auth failure: token likely missing or expired.');
    }
    res.status(status).json({ success: false, error, detail });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('[SPP-AUTH] To begin authentication, visit: ' + process.env.APP_BASE_URL + ':' + PORT + '/signin');
});
