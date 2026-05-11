import { Request, Response } from 'express';
import axios from 'axios';

import tokenStore from './tokenStore'; // Singleton, always valid instance

// GET handler for /callback/spp
export async function callbackSppGetHandler(req: Request, res: Response) {
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
}

// POST handler for /callback/spp
export function callbackSppPostHandler(req: Request, res: Response) {
  console.log('Received /callback/spp payload:', req.body);
  res.status(200).json({ status: 'received' });
}
