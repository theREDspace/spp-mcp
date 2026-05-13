import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import axios from "axios";
import healthHandler from './routes/health';
import signinHandler from './routes/signin';
import getProjectsHandler from './routes/projects';
import getBookingsHandler from './routes/bookings';
import { callbackSppGetHandler, callbackSppPostHandler } from './routes/callbackSpp';
import instructionsHandler from './routes/instructions';
import { initializeMcpTransport } from './mcp/transport';

const app = express();
const PORT = 3030;

app.use(express.json());

// ----- SIGNIN ROUTE (SPP OAUTH) -----
app.get('/signin', signinHandler);

// Simple error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.get('/health', healthHandler);

// ----- OAUTH2 CALLBACK (GET and POST) ----
app.get('/callback/spp', callbackSppGetHandler);
app.post('/callback/spp', callbackSppPostHandler);

// ---- /projects endpoint ----
app.get('/projects', getProjectsHandler);

// ---- /bookings endpoint ----
app.get('/bookings', getBookingsHandler);

// ---- /instructions endpoint ----
app.get('/instructions', instructionsHandler);

// ---- Startup: init MCP then start listening ----
async function startServer() {
  try {
    const mcpRouter = await initializeMcpTransport();
    // Mount at both /mcp and /mcp/ to handle clients with or without trailing slash
    app.use('/mcp', mcpRouter);
    app.use('/mcp/', mcpRouter);
    console.log('[MCP] Server mounted at /mcp');

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`[SPP-AUTH] Sign-in: ${process.env.APP_BASE_URL}:${PORT}/signin`);
      console.log(`[MCP] Endpoint: ${process.env.APP_BASE_URL}:${PORT}/mcp`);
    });
  } catch (err) {
    console.error('[ERROR] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
