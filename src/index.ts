import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = 3030;

app.use(express.json());

// Simple error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/callback/spp', (req: Request, res: Response) => {
  console.log('Received /callback/spp payload:', req.body);
  res.status(200).json({ status: 'received' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
