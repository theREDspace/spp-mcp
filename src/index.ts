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
import { originValidation } from '@modelcontextprotocol/express';
import { load as loadConfig } from './config';
import healthHandler from './routes/health';
import { oauthProtectedResourceHandler, oauthAuthorizationServerHandler } from './routes/wellKnown';
import { oauthAuthorizeHandler } from './routes/oauthAuthorize';
import { callbackSppGetHandler } from './routes/callbackSpp';
import { oauthTokenHandler } from './routes/oauthToken';
import { oauthRegisterHandler } from './routes/oauthRegister';
import { bearerAuthMiddleware } from './middleware/bearerAuth';
import { reauthRewriteMiddleware } from './middleware/reauthRewrite';
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
    // Mcp-Session-Id is deliberately absent here while still being accepted in
    // allowedHeaders (legacy clients may send one; we ignore it). Confirmed in
    // the SDK rather than assumed: every emission site is guarded by
    // `this.sessionId !== undefined`, and `sessionId` is only ever assigned
    // from `this.sessionIdGenerator?.()`. Neither leg passes a
    // sessionIdGenerator — the legacy leg constructs
    // NodeStreamableHTTPServerTransport with only `enableJsonResponse`, and the
    // 2026-07-28 revision removed protocol-level sessions outright — so the
    // header is never emitted and there is nothing for a browser to read.
    exposedHeaders: ['WWW-Authenticate', 'X-Request-Id'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Mcp-Session-Id',
      'MCP-Protocol-Version',
      'Mcp-Method',
      'Mcp-Name',
      'X-Request-Id',
    ],
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

/**
 * Origin hostnames to allow when ALLOWED_ORIGIN_HOSTS is unset: the host of
 * APP_BASE_URL, which is the one origin a same-origin browser client would be
 * served from. Returns [] when APP_BASE_URL is unset or unparseable, in which
 * case Origin validation cannot be derived and is skipped (with a warning).
 */
function defaultOriginHosts(appBaseUrl: string | undefined): string[] {
  if (!appBaseUrl) return [];
  try {
    return [new URL(appBaseUrl).hostname];
  } catch {
    return [];
  }
}

async function startServer() {
  try {
    const mcpRouter = await initializeMcpTransport();

    // ---- Origin validation on /mcp (MCP's DNS-rebinding-protection MUST) ----
    // Defaults to APP_BASE_URL's own host rather than being skipped when
    // ALLOWED_ORIGIN_HOSTS is unset: leaving it off by default meant every
    // deployment shipped with none of this protection, so the conformance item
    // was not actually delivered. Non-browser MCP clients (Claude Desktop,
    // CLIs) send no Origin header at all and always pass, so the default only
    // affects browser-based clients — and a browser page on an unrelated
    // origin hitting this endpoint is precisely the attack being blocked.
    // Cross-origin browser clients must be named explicitly in
    // ALLOWED_ORIGIN_HOSTS.
    const configuredOriginHosts = (config.ALLOWED_ORIGIN_HOSTS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allowedOriginHosts =
      configuredOriginHosts.length > 0 ? configuredOriginHosts : defaultOriginHosts(config.APP_BASE_URL);
    if (allowedOriginHosts.length > 0) {
      app.use('/mcp', originValidation(allowedOriginHosts));
      console.log(
        `[MCP] Origin validation active for: ${allowedOriginHosts.join(', ')}` +
          (configuredOriginHosts.length > 0 ? '' : ' (derived from APP_BASE_URL)')
      );
    } else {
      console.warn(
        '[MCP] Origin validation DISABLED — set ALLOWED_ORIGIN_HOSTS or APP_BASE_URL to enable ' +
          'DNS-rebinding protection on /mcp.'
      );
    }

    // Bearer auth applied to all /mcp routes (express normalizes trailing slash)
    app.use('/mcp', bearerAuthMiddleware, reauthRewriteMiddleware, mcpRouter);
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
