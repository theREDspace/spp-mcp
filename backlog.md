# Backlog

Items deferred from current implementation. Each entry includes context, constraints, and enough detail for an agent to implement without needing prior conversation history.

---

## BACKLOG-001: Persist tokens to SQLite (replace in-memory EmailTokenStore)

**File:** `src/services/EmailTokenStore.ts`
**Priority:** High

**Context:**
Tokens are currently stored in a `Map<string, SppTokenData>` in process memory. They are lost on every server restart, requiring all users to re-authenticate.

**What to implement:**
- Replace the in-memory `Map` with a SQLite-backed store using `better-sqlite3` (or `@databases/sqlite`).
- DB file path should be configurable via `TOKENS_DB_PATH` env var, defaulting to `data/tokens.db`.
- Encrypt token values at rest using AES-256-GCM. Encryption key from `TOKEN_ENCRYPTION_KEY` env var (required, fail at startup if missing).
- Schema: one table `user_tokens` with columns: `email TEXT PRIMARY KEY`, `access_token TEXT`, `refresh_token TEXT`, `expires_at INTEGER`, `updated_at INTEGER`.
- Keep the same public interface: `set(email, data)`, `get(email)`, `delete(email)`, `has(email)`, `allEmails()`.
- Ensure `data/` directory is gitignored.
- Add `TOKEN_ENCRYPTION_KEY` and `TOKENS_DB_PATH` to `.env.sample`.

**Constraints:**
- Do not change callers — interface must remain identical to current `EmailTokenStore`.
- Single-instance only (no WAL or multi-writer needed).
- Do not use an ORM.

---

## BACKLOG-002: Persist OAuth state→email mapping to SQLite (replace in-memory StateStore)

**File:** `src/services/StateStore.ts`
**Priority:** High — must be done alongside BACKLOG-001

**Context:**
`StateStore` maps ephemeral OAuth `state` params to user emails. Currently in-memory with a 10-minute TTL. Lost on restart, meaning any in-flight OAuth login is broken if the server restarts mid-flow.

**What to implement:**
- Replace the in-memory `Map` with a SQLite table `pending_auth` in the same DB used by BACKLOG-001.
- Schema: `state TEXT PRIMARY KEY`, `email TEXT NOT NULL`, `issued_at INTEGER NOT NULL`.
- TTL enforcement: on `get(state)`, check `issued_at + ttl > now`. If expired, delete and return `null`.
- Add a periodic cleanup job (e.g., every 15 minutes) to purge expired rows.
- Keep the same public interface: `set(state, email)`, `get(state)`, `delete(state)`.

**Constraints:**
- Reuse the same DB connection/file as BACKLOG-001.
- State values are single-use — delete immediately after `get()` returns a valid result (already done in callback handler).

---

## BACKLOG-003: Token expiry and proactive refresh

**Files:** `src/services/EmailTokenStore.ts`, `src/mcp/helpers/auth.ts`
**Priority:** Medium

**Context:**
`SppTokenData` stores `expiresAt` (epoch ms) but nothing checks it before using a token. A user with an expired access token will hit a 401 from SPP mid-request and rely on the reactive retry in `SPPClient`. This works but causes one wasted API call per expiry event.

**What to implement:**
- In `getAuthenticatedClient(email)` in `src/mcp/helpers/auth.ts`, before returning the client, check if `expiresAt` is within 5 minutes of now.
- If so, call `client.refreshUserToken(refreshToken)` proactively and update the store before returning the client.
- Handle refresh failure gracefully: if refresh throws, return `null` so the tool returns `authRequiredResponse()`.

---

## BACKLOG-004: Token revocation endpoint

**Priority:** Low

**Context:**
There is currently no way to revoke a user's stored tokens without restarting the server or manually editing the DB.

**What to implement:**
- Add `DELETE /auth/:email` Express route (admin-only or protected by a shared secret via `ADMIN_SECRET` env var in `Authorization: Bearer` header).
- Handler calls `emailTokenStore.delete(email)` and returns `204`.
- Document in README.

---

## BACKLOG-005: Replace `getSigninUrl` tool with per-user OAuth link using StateStore

**File:** `src/mcp/tools/getSigninUrl.ts`
**Priority:** Medium

**Context:**
`getSigninUrl` currently returns a static auth URL with no `state` parameter. The per-user flow requires a `state`→`email` mapping to be created at link-generation time so the callback can tie the token to the correct user.

**What to implement:**
- In the tool handler, read `email` from `_ctx.email`.
- Generate a `state` value (`crypto.randomUUID()`).
- Call `stateStore.set(state, email)`.
- Append `&state=${state}` to the SPP auth URL returned by `SPPClient.getAuthUrl()`.
- Update `SPPClient.getAuthUrl()` to accept an optional `state` param and include it in the URL.

**Constraints:**
- The `state` value must be URL-encoded when appended.
- Do not hardcode the state into the base `getAuthUrl()` — keep it optional.

---

## BACKLOG-006: `authRequiredResponse()` should embed a state-bearing sign-in URL

**File:** `src/mcp/helpers/auth.ts`
**Priority:** Medium — depends on BACKLOG-005

**Context:**
`authRequiredResponse()` calls `getAuthUrl()` which returns a URL without a `state` param. When a user clicks it, the callback has no state to look up, so it cannot associate the token with the user's email.

**What to implement:**
- Accept `email` as a parameter: `authRequiredResponse(email: string)`.
- Internally call `stateStore.set(state, email)` and embed the state in the URL (same as BACKLOG-005).
- Update all callers to pass `_ctx.email` (or `email` from context).

---

## BACKLOG-007: Structured logging with request correlation IDs

**Priority:** Low

**Context:**
All logging is `console.log`/`console.error` with no correlation between a request's middleware log and its tool handler log.

**What to implement:**
- Generate a `requestId` (`crypto.randomUUID()`) in the email middleware and attach to `req`.
- Pass `requestId` into tool context alongside `email`.
- Prefix all log lines for a given request with `[reqId=...]`.
- Consider replacing raw `console` calls with the existing `Logger` utility (`src/utils/Logger.ts`).
