import { Request, Response } from 'express';
import SPPClient from '../clients/SPPClient';
import { Booking } from '../types/Booking';

import tokenStore from './tokenStore'; // Singleton, always valid instance

// GET /bookings handler
export default async function getBookingsHandler(req: Request, res: Response) {
  try {
    const { accessToken, refreshToken } = tokenStore.get();
    if (!accessToken || !refreshToken) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        message: 'You must authenticate before accessing this endpoint. Use /signin to get an auth URL and ask your user to complete login.',
        signin_url: '/signin',
        docs: '/instructions'
      });
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
    const bookings: Booking[] = await client.list('Booking', {}, 100, 0);
    res.json({ success: true, bookings });
  } catch (err: any) {
    console.error('Error in /bookings:', err);
    let status = 500;
    let error = err?.message || 'Unknown error';
    let detail = err?.detail || undefined;
    if (err?.code) {
      if (typeof err.code === 'string' && /^4\d\d$/.test(err.code)) status = Number(err.code);
      else if (typeof err.code === 'number' && err.code >= 400 && err.code < 600) status = err.code;
    }
    if ((detail && detail.code == '2') || (err.name && err.name.includes('SPPAuthError'))) {
      status = 401;
      error = 'Not authenticated or token expired. Please visit /signin.';
      console.log('[SPP-AUTH] Auth failure: token likely missing or expired.');
    }
    res.status(status).json({ success: false, error, detail });
  }
}
