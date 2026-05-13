import { Request, Response } from 'express';
import axios from 'axios';

import stateStore from '../services/StateStore';
import emailTokenStore, { SppTokenData } from '../services/EmailTokenStore';
import SPPClient from '../clients/SPPClient';

// GET handler for /callback/spp
export async function callbackSppGetHandler(req: Request, res: Response) {
  const code = req.query.code;
  const state = req.query.state as string | undefined;
  if (!code || !state) {
    res.status(400).send('Missing ?code or ?state in query');
    return;
  }

  // Look up the email for this state, then delete the mapping (single-use)
  const email = stateStore.get(state);
  stateStore.delete(state);
  if (!email) {
    res.status(400).send('Invalid or expired authentication state. Please restart login.');
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

    // Confirm token is for intended user (whoami)
    const client = new SPPClient({
      sppUrl: sppUrl as string,
      clientId: clientId as string,
      clientSecret: clientSecret as string,
      callbackUrl: callbackUrl as string,
      accessToken: access_token,
      refreshToken: refresh_token,
    });
    const me = await client.whoami();
    const returnedEmail = me?.addr?.email?.toLowerCase();
    if (!returnedEmail || returnedEmail !== email.toLowerCase()) {
      res.status(400).send(`Authenticated SPP account email (${returnedEmail}) does not match expected email (${email}). Please log in with the correct SPP account.`);
      return;
    }

    // Save tokens by email
    emailTokenStore.set(email, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (Number(expires_in) * 1000),
    });

    const safeEmail = email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    console.log(`[SPP-AUTH] Auth success for ${email}. Access token expires in ${expires_in || 'unknown'}s.`);
    res.send(`<h3>Authentication successful (${safeEmail}).</h3><p>You can now access SPP endpoints. <a href="/projects">Try /projects</a></p>`);
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
