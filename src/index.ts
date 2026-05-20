import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import healthHandler from './routes/health';
import { oauthProtectedResourceHandler, oauthAuthorizationServerHandler } from './routes/wellKnown';
import { oauthAuthorizeHandler } from './routes/oauthAuthorize';
import { callbackSppGetHandler } from './routes/callbackSpp';
import { oauthTokenHandler } from './routes/oauthToken';
import { oauthRegisterHandler } from './routes/oauthRegister';
import { bearerAuthMiddleware } from './middleware/bearerAuth';
import { initializeMcpTransport } from './mcp/transport';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3030;

app.use(express.json());
// Required for /oauth/token to parse application/x-www-form-urlencoded bodies
app.use(express.urlencoded({ extended: false }));

// ---- Discovery endpoints (unauthenticated — RFC 9728 / MCP auth spec) ----
app.get('/.well-known/oauth-protected-resource', oauthProtectedResourceHandler);
app.get('/.well-known/oauth-authorization-server', oauthAuthorizationServerHandler);

// ---- OAuth proxy routes (unauthenticated) ----
// /oauth/authorize  — swaps client's redirect_uri with SPP_CALLBACK_URL, forwards to SPP
// /callback/spp     — receives SPP's callback, relays to SPP_FORWARD_CALLBACK_URL
// /oauth/token      — swaps client's redirect_uri with SPP_CALLBACK_URL, proxies token exchange
app.get('/oauth/authorize', oauthAuthorizeHandler);
app.get('/callback/spp', callbackSppGetHandler);
app.post('/oauth/token', oauthTokenHandler);
app.post('/oauth/register', oauthRegisterHandler);

// ---- Health (unauthenticated) ----
app.get('/health', healthHandler);

// ---- Simple error handler middleware ----
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ---- Startup: init MCP transport then start listening ----
async function startServer() {
  try {
    const mcpRouter = await initializeMcpTransport();

    // Bearer auth applied to all /mcp routes
    app.use('/mcp', bearerAuthMiddleware, mcpRouter);
    app.use('/mcp/', bearerAuthMiddleware, mcpRouter);
    console.log('[MCP] Server mounted at /mcp');

    app.listen(PORT, () => {
      const baseUrl = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
      console.log(`Server listening on port ${PORT}`);
      console.log(`[MCP]  Endpoint:              ${baseUrl}/mcp`);
      console.log(`[AUTH] Protected resource:     ${baseUrl}/.well-known/oauth-protected-resource`);
      console.log(`[AUTH] Auth server metadata:   ${baseUrl}/.well-known/oauth-authorization-server`);
      console.log(`[AUTH] Authorize proxy:        ${baseUrl}/oauth/authorize`);
      console.log(`[AUTH] Token proxy:            ${baseUrl}/oauth/token`);
      console.log(`[AUTH] SPP callback relay:     ${baseUrl}/callback/spp`);
      // Forwarding callback disabled (no SPP_FORWARD_CALLBACK_URL in use).
    });
  } catch (err) {
    console.error('[ERROR] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
