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
import { load as loadConfig } from './config';
import healthHandler from './routes/health';
import { oauthProtectedResourceHandler, oauthAuthorizationServerHandler } from './routes/wellKnown';
import { oauthAuthorizeHandler } from './routes/oauthAuthorize';
import { callbackSppGetHandler } from './routes/callbackSpp';
import { oauthTokenHandler } from './routes/oauthToken';
import { oauthRegisterHandler } from './routes/oauthRegister';
import { bearerAuthMiddleware } from './middleware/bearerAuth';
import { requestIdMiddleware } from './middleware/requestId';
import { initializeMcpTransport } from './mcp/transport';

// Validate + freeze config before any module reads process.env directly.
const config = loadConfig();

const app = express();
const PORT = config.PORT;

// In production, the app typically runs behind a reverse proxy (nginx, ALB, etc.)
// that sets X-Forwarded-For. Trust proxy must be configured so Express and
// express-rate-limit correctly identify the real client IP.
// TRUST_PROXY defaults to '1' (trust one hop) in production when not explicitly set.
const trustProxy = config.TRUST_PROXY ?? (config.NODE_ENV === 'production' ? '1' : undefined);
if (trustProxy) {
  app.set('trust proxy', trustProxy);
}

// Stable per-request id for log correlation, propagated end-to-end.
app.use(requestIdMiddleware);

// ---- CORS — narrow to comma-separated CORS_ORIGINS, default reflect-origin ----
const corsOrigins = (config.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: false,
    exposedHeaders: ['Mcp-Session-Id', 'WWW-Authenticate', 'X-Request-Id'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'MCP-Protocol-Version', 'X-Request-Id'],
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
const oauthLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.OAUTH_RATE_LIMIT_PER_MIN,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Suppress the X-Forwarded-For validation error that crashes the process when
  // trust proxy is misconfigured. The correct fix is TRUST_PROXY in .env, but
  // we must never let a rate-limit misconfiguration kill the server.
  validate: { xForwardedForHeader: false },
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

async function startServer() {
  try {
    const mcpRouter = await initializeMcpTransport();

    // Bearer auth applied to all /mcp routes (express normalizes trailing slash)
    app.use('/mcp', bearerAuthMiddleware, mcpRouter);
    console.log('[MCP] Server mounted at /mcp');

    // ---- Error handler middleware (registered last so it catches all routes) ----
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error(`[ERROR] reqId=${req.requestId || '-'}`, err.stack || err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', request_id: req.requestId });
      }
    });

    app.listen(PORT, () => {
      const baseUrl = (config.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
      console.log(`Server listening on port ${PORT}`);
      console.log(`[MCP]  Endpoint:              ${baseUrl}/mcp`);
      console.log(`[AUTH] Protected resource:     ${baseUrl}/.well-known/oauth-protected-resource`);
      console.log(`[AUTH] Auth server metadata:   ${baseUrl}/.well-known/oauth-authorization-server`);
      console.log(`[AUTH] Authorize proxy:        ${baseUrl}/oauth/authorize`);
      console.log(`[AUTH] Token proxy:            ${baseUrl}/oauth/token`);
      console.log(`[AUTH] SPP callback relay:     ${baseUrl}/callback/spp`);
    });
  } catch (err) {
    console.error('[ERROR] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
