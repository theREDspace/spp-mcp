import { Request, Response } from 'express';

export default function healthHandler(_req: Request, res: Response) {
  res.json({ status: 'ok' });
}
