import 'dotenv/config';
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  // Exit so a supervisor (systemd, pm2, docker) can restart the process cleanly.
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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

// Trust X-Forwarded-* when running behind a reverse proxy / load balancer.
// Required for express-rate-limit to see real client IPs.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

// ---- CORS — narrow to comma-separated CORS_ORIGINS, default reflect-origin ----
// MCP clients are typically same-origin or use the streamable HTTP transport
// from a tool that doesn't need CORS, but Inspector in the browser does.
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: false,
    exposedHeaders: ['Mcp-Session-Id', 'WWW-Authenticate'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'MCP-Protocol-Version'],
  })
);

// ---- Conservative security headers (no helmet dependency) ----
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ---- Rate limit OAuth proxy endpoints ----
// These accept unauthenticated POST traffic and forward to SPP; cap them to
// blunt brute-force / DCR-spam attempts. /mcp is bearer-auth'd so we leave it.
const oauthLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.OAUTH_RATE_LIMIT_PER_MIN || 30),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(['/oauth/token', '/oauth/register', '/oauth/authorize', '/callback/spp'], oauthLimiter);

// ---- Discovery endpoints (unauthenticated — RFC 9728 / MCP auth spec) ----
app.get('/.well-known/oauth-protected-resource', oauthProtectedResourceHandler);
app.get('/.well-known/oauth-authorization-server', oauthAuthorizationServerHandler);
app.get('/.well-known/openid-configuration', oauthAuthorizationServerHandler);

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

// ---- Startup: init MCP transport then start listening ----
import { validateEnvVars } from './utils/validateEnvVars.js';

async function startServer() {
  try {
    // Check all critical env vars
    validateEnvVars([
      'SPP_URL',
      'SPP_CLIENT_ID',
      'SPP_CLIENT_SECRET',
      'SPP_CALLBACK_URL',
      'SPP_NAMESPACE',
      'SPP_KEY',
    ]);

    const mcpRouter = await initializeMcpTransport();

    // Bearer auth applied to all /mcp routes (express normalizes trailing slash)
    app.use('/mcp', bearerAuthMiddleware, mcpRouter);
    console.log('[MCP] Server mounted at /mcp');

    // ---- Error handler middleware (registered last so it catches all routes) ----
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err.stack || err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

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
