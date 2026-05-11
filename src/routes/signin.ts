import { Request, Response } from 'express';
import SPPClient from '../clients/SPPClient';

export default function signinHandler(req: Request, res: Response) {
  const client = new SPPClient({});
  const authUrl = client.getAuthUrl();
  // Allow optional redirect (default off)
  if (req.query.redirect === 'true') {
    console.log(`[SPP-AUTH] Redirecting user to: ${authUrl}`);
    res.redirect(authUrl);
  } else {
    console.log(`[SPP-AUTH] Login URL generated: ${authUrl}`);
    const appBaseUrl = process.env.APP_BASE_URL || "";
res.json({
  success: true,
  auth_url: authUrl,
  absolute_auth_url: authUrl,
  signin_route: `${appBaseUrl}/signin`,
  note: "Click the URL above to authenticate via Redspace SPP. Once complete, retry your previous request."
});
  }
}
