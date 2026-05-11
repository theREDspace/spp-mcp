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
    res.json({ success: true, loginUrl: authUrl });
  }
}
