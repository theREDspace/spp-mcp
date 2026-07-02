# Auto Re-auth on Expired Token — Design Spec

**Date:** 2026-07-02
**Status:** Approved

## Problem

When a user's SPP access token expires, every tool call silently fails with an `AUTH_ERROR` tool result inside an HTTP 200. `mcp-remote` and Claude Desktop have no signal to trigger a token refresh — so the session is permanently broken until the user manually re-adds the connector or clears `~/.mcp-auth`. Non-technical users have no way to recover.

## Goal

Make expired-token recovery invisible to the user wherever possible:

- **Tier 1 — silent refresh (target: ~100% of expiries):** server emits a transport-level 401; `mcp-remote` silently exchanges its refresh token for a new access token; tool retries. User sees nothing.
- **Tier 2 — browser re-login (fallback):** only when the refresh token itself is also dead. User opens SPP in a browser once, then returns to a working session.

## Approach: Reactive Response Rewrite (Approach 1)

A **response-rewrite middleware** wraps the MCP transport response. It buffers the JSON-RPC body the transport writes, inspects it, and — if it is a tool error of type `AUTH_ERROR` — discards the 200 and sends a **401 + `WWW-Authenticate`** instead. All other responses flush unchanged.

This approach was chosen over alternatives because:
- Zero latency on the happy path (nothing changes unless auth fails).
- Cannot fire on `initialize` or `tools/list` — those never call SPP, so they can never produce `AUTH_ERROR`. Opening Claude without using the MCP never triggers a prompt.
- No extra SPP round-trip (unlike proactive token validation).
- Does not depend on SDK internals (unlike re-throwing from inside the transport handler).

## Architecture

```
POST /mcp → bearerAuth → [ReauthRewriteMiddleware] → MCP transport → wrapTool → SPPClient
                              ↑________ inspects buffered response ____________________|
```

### Data flow — expired access token

1. `POST /mcp` with stale token → `bearerAuth` passes (token is non-empty).
2. Tool runs → `SPPClient.callSPPXML` detects `Auth.status != 0` → throws `SPPAuthError`.
3. `wrapTool` catches it → `fail()` → JSON-RPC **200** with `{ type: "AUTH_ERROR", ... }`.
4. `ReauthRewriteMiddleware` sees `AUTH_ERROR` → sends **401 + `WWW-Authenticate`** instead.
5. `mcp-remote` receives 401 → silently runs `grant_type=refresh_token` against `/oauth/token` → gets a fresh access token → retries the tool call → succeeds. **User sees nothing.**
6. Only if the refresh token is also dead → `mcp-remote` opens the browser for a fresh SPP login.

## New & Changed Files

| File | Change |
|------|--------|
| `src/utils/authChallenge.ts` | **New.** Extracts `buildBearerChallenge` and `getResourceMetadataUrl` from `bearerAuth.ts` so the 401 emitted by the rewriter is byte-identical to the one `bearerAuth` emits. |
| `src/middleware/reauthRewrite.ts` | **New.** The buffering middleware. Intercepts `res.write`/`res.end`, parses the body on flush, rewrites to 401 if `AUTH_ERROR`, otherwise passes through. |
| `src/mcp/helpers/toolResult.ts` | **Minor.** Export `AUTH_ERROR_TYPE = 'AUTH_ERROR'` constant so the rewriter keys on it without magic strings. |
| `src/middleware/bearerAuth.ts` | **Minor.** Import `buildBearerChallenge`/`getResourceMetadataUrl` from the new shared module. |
| `src/index.ts` | **Minor.** Mount `reauthRewriteMiddleware` on `/mcp` between `bearerAuth` and the MCP router. |

## Guardrails

- **Only `AUTH_ERROR` triggers a 401.** `PERMISSION_DENIED`, `NOT_FOUND`, `RATE_LIMITED`, `INVALID_INPUT` — all pass through as-is. Only a genuine rejected token causes re-auth.
- **Never rewrites a successful response.** `isError: false` → untouched.
- **Fails open.** Non-JSON body, parse failure, or any ambiguity → original response flushes unchanged. A bad rewriter can never break a good response.
- **Batch-correct.** A dead token fails every sub-call, so converting the whole HTTP response to 401 is the right behavior for batch requests too.
- **No idle nag.** `initialize` and `tools/list` never call SPP → never produce `AUTH_ERROR` → opening Claude without using the MCP can never trigger a login prompt.

## Scope-C Extras

### Verify SPP refresh-token lifetime
Before shipping, confirm how long SPP refresh tokens live:
1. Do a fresh OAuth login; capture `expires_in` and `refresh_token` from the token response (the `[OAUTH-TOKEN]` log already records `expiresIn` and `hasRefreshToken`).
2. Check the OAuth app settings in SuiteProjects Pro admin for session/refresh duration.
3. Run an empirical test: let the access token expire, make a tool call (should silent-refresh), then let it sit long enough to see if the refresh token also expires.
4. Document the findings in `docs/token-lifetimes.md` so support can answer "how often will users need to re-login?".

### Delivery hardening for non-technical users
Update `docs/clients/claude-desktop.md` to:
- Lead with the **native remote connector** method (add URL directly in Claude Desktop UI) instead of the `mcp-remote` JSON config. Native connectors have a built-in Connect button, cleaner silent-refresh, and no `~/.mcp-auth` cache to get stuck.
- Keep `mcp-remote` as a fallback section for users on older Claude Desktop versions.
- Add a troubleshooting entry: *"Auth prompt never appeared / tools fail silently"* → clear `~/.mcp-auth` and restart Claude Desktop.

## Testing Plan

### Unit — `reauthRewriteMiddleware`
- `AUTH_ERROR` tool result body → response is 401 + correct `WWW-Authenticate` header.
- `isError: false` body → response passes through as 200.
- `PERMISSION_DENIED` body → passes through as 200.
- Non-JSON body → passes through unchanged.
- Batch request containing an `AUTH_ERROR` → 401.

### Integration
- Mock SPP to return `Auth.status = 1` → `POST /mcp` tool call returns 401 with `WWW-Authenticate: Bearer realm="spp-mcp", resource_metadata="..."`.
- Mock SPP to return valid data → `POST /mcp` returns 200.

### Regression
- Full existing test suite stays green.
- Verify `bearerAuth` still emits the same 401 on missing/empty token.

## Out of Scope

- Server-side token storage or server-driven refresh (breaks the stateless passthrough model).
- Retry logic inside the server — the client (`mcp-remote` / Claude) owns retries.
- Changing SPP token lifetimes.
