# Auto Re-auth on Expired Token — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make expired SPP tokens trigger a transport-level 401 + `WWW-Authenticate` so `mcp-remote`/Claude auto-refresh silently, without the user ever needing to manually re-authenticate.

**Architecture:** A response-rewrite middleware sits between `bearerAuth` and the MCP transport on `/mcp`. It intercepts `res.end`, buffers the response body, and rewrites to 401 + `WWW-Authenticate` if the body is a JSON-RPC tool result with `type: AUTH_ERROR`. All other responses pass through untouched. Shared auth-challenge helpers are extracted into a dedicated module so the 401 header emitted here is byte-identical to the one `bearerAuth` already emits.

**Tech Stack:** TypeScript, Express, Jest + ts-jest (no supertest — unit tests drive Express handlers directly via mock req/res).

## Global Constraints

- TypeScript strict mode — no `any` except where narrowing against Express internals requires it.
- `npm test` must stay green at every commit.
- Do not change the JSON-RPC response shape for non-auth errors — only `AUTH_ERROR` triggers a rewrite.
- `AUTH_ERROR_TYPE` is the single source of truth for the string `'AUTH_ERROR'` — never use the literal in two places.
- All new files under `src/` must use named exports (no default exports for utilities/middleware).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/authChallenge.ts` | **Create** | `getResourceMetadataUrl()` and `buildBearerChallenge()` — shared, tested, single source of truth for the WWW-Authenticate header value |
| `src/middleware/bearerAuth.ts` | **Modify** | Remove the private copies of those two functions; import from `authChallenge` |
| `src/mcp/helpers/toolResult.ts` | **Modify** | Export `AUTH_ERROR_TYPE = 'AUTH_ERROR'`; use it inside `fail()` instead of the string literal |
| `src/middleware/reauthRewrite.ts` | **Create** | `reauthRewriteMiddleware` — buffers `res.end`, detects `AUTH_ERROR`, rewrites to 401 |
| `src/index.ts` | **Modify** | Mount `reauthRewriteMiddleware` on `/mcp` between `bearerAuth` and the MCP router |
| `src/__tests__/authChallenge.test.ts` | **Create** | Unit tests for the two helper functions |
| `src/__tests__/reauthRewrite.test.ts` | **Create** | Unit tests for the middleware: AUTH_ERROR → 401, pass-through cases, batch, non-JSON |
| `docs/clients/claude-desktop.md` | **Modify** | Lead with native remote connector; add `~/.mcp-auth` troubleshooting note |
| `docs/token-lifetimes.md` | **Create** | Investigation steps + findings for SPP refresh-token lifetime |

---

## Task 1: Extract auth-challenge helpers into a shared module

**Files:**
- Create: `src/utils/authChallenge.ts`
- Modify: `src/middleware/bearerAuth.ts`
- Test: `src/__tests__/authChallenge.test.ts`

**Interfaces:**
- Produces:
  - `getResourceMetadataUrl(): string` — returns `${APP_BASE_URL}/.well-known/oauth-protected-resource`
  - `buildBearerChallenge(extra?: string[]): string` — returns the full `Bearer realm=... resource_metadata=...` challenge string

- [ ] **Step 1: Write failing tests for the two helpers**

Create `src/__tests__/authChallenge.test.ts`:

```typescript
import { getResourceMetadataUrl, buildBearerChallenge } from '../utils/authChallenge';

describe('getResourceMetadataUrl', () => {
  const originalEnv = process.env.APP_BASE_URL;

  afterEach(() => {
    process.env.APP_BASE_URL = originalEnv;
  });

  it('uses APP_BASE_URL when set', () => {
    process.env.APP_BASE_URL = 'https://example.com';
    expect(getResourceMetadataUrl()).toBe(
      'https://example.com/.well-known/oauth-protected-resource'
    );
  });

  it('strips trailing slash from APP_BASE_URL', () => {
    process.env.APP_BASE_URL = 'https://example.com/';
    expect(getResourceMetadataUrl()).toBe(
      'https://example.com/.well-known/oauth-protected-resource'
    );
  });

  it('falls back to localhost:3030 when APP_BASE_URL is not set', () => {
    delete process.env.APP_BASE_URL;
    expect(getResourceMetadataUrl()).toBe(
      'http://localhost:3030/.well-known/oauth-protected-resource'
    );
  });
});

describe('buildBearerChallenge', () => {
  beforeEach(() => {
    process.env.APP_BASE_URL = 'https://example.com';
  });

  it('returns base challenge with no extras', () => {
    expect(buildBearerChallenge()).toBe(
      'Bearer realm="spp-mcp", resource_metadata="https://example.com/.well-known/oauth-protected-resource"'
    );
  });

  it('appends extra parts', () => {
    expect(buildBearerChallenge(['error="invalid_token"'])).toBe(
      'Bearer realm="spp-mcp", resource_metadata="https://example.com/.well-known/oauth-protected-resource", error="invalid_token"'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/__tests__/authChallenge.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../utils/authChallenge'`

- [ ] **Step 3: Create `src/utils/authChallenge.ts`**

```typescript
export function getResourceMetadataUrl(): string {
  const serverUrl = (process.env.APP_BASE_URL || 'http://localhost:3030').replace(/\/$/, '');
  return `${serverUrl}/.well-known/oauth-protected-resource`;
}

export function buildBearerChallenge(extra: string[] = []): string {
  const metadataUrl = getResourceMetadataUrl();
  const parts = [
    'Bearer realm="spp-mcp"',
    `resource_metadata="${metadataUrl}"`,
    ...extra,
  ];
  return parts.join(', ');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/authChallenge.test.ts --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Update `bearerAuth.ts` to import from the new module**

Open `src/middleware/bearerAuth.ts`. Remove the two private function definitions (`getResourceMetadataUrl` and `buildBearerChallenge`) and add an import at the top:

```typescript
import { getResourceMetadataUrl, buildBearerChallenge } from '../utils/authChallenge';
```

The rest of `bearerAuth.ts` is unchanged — it already calls these two functions by name.

- [ ] **Step 6: Run full test suite to verify no regressions**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/authChallenge.ts src/middleware/bearerAuth.ts src/__tests__/authChallenge.test.ts
git commit -m "refactor: extract auth-challenge helpers into shared module"
```

---

## Task 2: Export `AUTH_ERROR_TYPE` constant from toolResult

**Files:**
- Modify: `src/mcp/helpers/toolResult.ts`
- Test: `src/__tests__/toolResult.test.ts`

**Interfaces:**
- Produces: `AUTH_ERROR_TYPE: 'AUTH_ERROR'` — exported constant used by both `fail()` and the rewrite middleware

- [ ] **Step 1: Write a failing test**

Create `src/__tests__/toolResult.test.ts`:

```typescript
import { AUTH_ERROR_TYPE, fail, ok } from '../mcp/helpers/toolResult';
import { SPPAuthError } from '../clients/errors';
import { SPPStatus } from '../utils/errorCodes';

describe('AUTH_ERROR_TYPE', () => {
  it('is exported and equals AUTH_ERROR', () => {
    expect(AUTH_ERROR_TYPE).toBe('AUTH_ERROR');
  });
});

describe('fail()', () => {
  it('sets type to AUTH_ERROR_TYPE for SPPAuthError', () => {
    const err = new SPPAuthError({ code: String(SPPStatus.AuthInvalid), message: 'expired' });
    const result = fail(err);
    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.content[0].text);
    expect(payload.type).toBe(AUTH_ERROR_TYPE);
  });

  it('does not set AUTH_ERROR type for generic errors', () => {
    const result = fail(new Error('something else'));
    const payload = JSON.parse(result.content[0].text);
    expect(payload.type).not.toBe(AUTH_ERROR_TYPE);
  });
});

describe('ok()', () => {
  it('sets isError to false', () => {
    expect(ok({ foo: 'bar' }).isError).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/__tests__/toolResult.test.ts --no-coverage
```

Expected: FAIL — `AUTH_ERROR_TYPE is not exported`

- [ ] **Step 3: Add the export to `toolResult.ts`**

Open `src/mcp/helpers/toolResult.ts`. Add this line near the top, after the imports:

```typescript
export const AUTH_ERROR_TYPE = 'AUTH_ERROR' as const;
```

Then find the line inside `fail()` that reads:

```typescript
if (error instanceof SPPAuthError) {
    payload.type = 'AUTH_ERROR';
```

Replace the string literal with the constant:

```typescript
if (error instanceof SPPAuthError) {
    payload.type = AUTH_ERROR_TYPE;
```

Also find the `classifySppError` function's auth-ish cases and replace the `'AUTH_ERROR'` literal there too:

```typescript
    case String(SPPStatus.AuthInvalid):
    case String(SPPStatus.LoggedOut):
    case String(SPPStatus.AuthFailed):
    case String(SPPStatus.AuthFailedRetry):
    case String(SPPStatus.InvalidUidSession):
      return {
        kind: AUTH_ERROR_TYPE,
        hint: 'The SPP access token was rejected. Refresh the OAuth token and retry.',
      };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/toolResult.test.ts --no-coverage
```

Expected: PASS — 4 tests

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/mcp/helpers/toolResult.ts src/__tests__/toolResult.test.ts
git commit -m "feat: export AUTH_ERROR_TYPE constant from toolResult"
```

---

## Task 3: Build `reauthRewriteMiddleware`

**Files:**
- Create: `src/middleware/reauthRewrite.ts`
- Test: `src/__tests__/reauthRewrite.test.ts`

**Interfaces:**
- Consumes:
  - `buildBearerChallenge(extra?: string[]): string` from `src/utils/authChallenge.ts`
  - `AUTH_ERROR_TYPE: 'AUTH_ERROR'` from `src/mcp/helpers/toolResult.ts`
- Produces:
  - `reauthRewriteMiddleware(req, res, next): void` — Express middleware

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/reauthRewrite.test.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { reauthRewriteMiddleware } from '../middleware/reauthRewrite';

// Helpers to build mock Express req/res objects
function makeRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: string | undefined;

  const res = {
    statusCode,
    headersSent: false,
    write: jest.fn(),
    end: jest.fn(),
    status(code: number) { res.statusCode = code; return res; },
    set(k: string, v: string) { headers[k] = v; return res; },
    json(data: any) {
      body = JSON.stringify(data);
      res.end(body);
      return res;
    },
    _headers: headers,
    _body: () => body,
    _status: () => res.statusCode,
  } as any;
  return res;
}

function makeReq() {
  return {} as Request;
}

function makeNext(): NextFunction {
  return jest.fn();
}

// Builds a JSON-RPC tool result envelope
function mcpResult(type: string, isError: boolean): object {
  const payload = { type, error: 'test message' };
  return {
    jsonrpc: '2.0',
    id: 1,
    result: {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      structuredContent: payload,
      isError,
    },
  };
}

function runMiddleware(bodyToSend: any): { res: any; next: NextFunction } {
  const req = makeReq();
  const res = makeRes();
  const next = makeNext();

  reauthRewriteMiddleware(req, res, next);
  expect(next).toHaveBeenCalled();

  // Simulate the transport calling res.end() with the body
  res.end(JSON.stringify(bodyToSend));

  return { res, next };
}

describe('reauthRewriteMiddleware', () => {
  beforeEach(() => {
    process.env.APP_BASE_URL = 'https://example.com';
  });

  it('rewrites AUTH_ERROR result to 401 with WWW-Authenticate header', () => {
    const body = mcpResult('AUTH_ERROR', true);
    const { res } = runMiddleware(body);

    expect(res._status()).toBe(401);
    expect(res._headers['WWW-Authenticate']).toContain('Bearer realm="spp-mcp"');
    expect(res._headers['WWW-Authenticate']).toContain('resource_metadata=');
    expect(res._headers['WWW-Authenticate']).toContain('invalid_token');
  });

  it('passes through a successful result (isError: false) unchanged', () => {
    const body = mcpResult('SOME_TYPE', false);
    const { res } = runMiddleware(body);

    // Should not rewrite — original end was called, status stays 200
    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('passes through PERMISSION_DENIED error unchanged', () => {
    const body = mcpResult('PERMISSION_DENIED', true);
    const { res } = runMiddleware(body);

    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('passes through non-JSON body unchanged', () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    reauthRewriteMiddleware(req, res, next);
    res.end('not json at all');

    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('rewrites batch response containing an AUTH_ERROR to 401', () => {
    const batch = [
      mcpResult('AUTH_ERROR', true),
      mcpResult('AUTH_ERROR', true),
    ];
    const { res } = runMiddleware(batch);

    expect(res._status()).toBe(401);
    expect(res._headers['WWW-Authenticate']).toContain('Bearer realm="spp-mcp"');
  });

  it('passes through batch with no AUTH_ERROR unchanged', () => {
    const batch = [
      mcpResult('NOT_FOUND', true),
      mcpResult('PERMISSION_DENIED', true),
    ];
    const { res } = runMiddleware(batch);

    expect(res._status()).toBe(200);
    expect(res._headers['WWW-Authenticate']).toBeUndefined();
  });

  it('calls next()', () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    reauthRewriteMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/__tests__/reauthRewrite.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../middleware/reauthRewrite'`

- [ ] **Step 3: Create `src/middleware/reauthRewrite.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { buildBearerChallenge } from '../utils/authChallenge';
import { AUTH_ERROR_TYPE } from '../mcp/helpers/toolResult';

function hasAuthError(result: any): boolean {
  if (!result?.isError) return false;
  if (result.structuredContent?.type === AUTH_ERROR_TYPE) return true;
  const textContent = (result.content ?? []).find((c: any) => c.type === 'text');
  if (!textContent) return false;
  try {
    const inner = JSON.parse(textContent.text);
    return inner?.type === AUTH_ERROR_TYPE;
  } catch {
    return false;
  }
}

function isAuthErrorBody(body: string): boolean {
  try {
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed)) {
      return parsed.some((item) => hasAuthError(item?.result));
    }
    return hasAuthError(parsed?.result);
  } catch {
    return false;
  }
}

export function reauthRewriteMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const chunks: Buffer[] = [];
  const originalEnd = res.end.bind(res);
  const originalWrite = res.write.bind(res);

  (res as any).write = (chunk: any): boolean => {
    if (chunk != null) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    return true;
  };

  (res as any).end = (chunk?: any): Response => {
    if (chunk != null) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }

    res.write = originalWrite;
    res.end = originalEnd;

    const body = Buffer.concat(chunks).toString('utf8');

    if (isAuthErrorBody(body)) {
      const challenge = buildBearerChallenge([
        'error="invalid_token"',
        'error_description="Access token rejected by upstream"',
      ]);
      res
        .status(401)
        .set('WWW-Authenticate', challenge)
        .json({
          error: 'invalid_token',
          error_description: 'SPP access token was rejected. The client should refresh or re-authenticate.',
        });
      return res;
    }

    originalEnd.call(res, body);
    return res;
  };

  next();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/reauthRewrite.test.ts --no-coverage
```

Expected: PASS — 7 tests

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/middleware/reauthRewrite.ts src/__tests__/reauthRewrite.test.ts
git commit -m "feat: add reauthRewriteMiddleware — rewrite AUTH_ERROR to 401"
```

---

## Task 4: Wire middleware into the server

**Files:**
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `reauthRewriteMiddleware` from `src/middleware/reauthRewrite.ts`

- [ ] **Step 1: Add the import to `src/index.ts`**

Open `src/index.ts`. Add this import alongside the other middleware imports:

```typescript
import { reauthRewriteMiddleware } from './middleware/reauthRewrite';
```

- [ ] **Step 2: Mount the middleware on `/mcp`**

Find the line in `startServer()` that reads:

```typescript
app.use('/mcp', bearerAuthMiddleware, mcpRouter);
```

Replace it with:

```typescript
app.use('/mcp', bearerAuthMiddleware, reauthRewriteMiddleware, mcpRouter);
```

The order matters: `bearerAuth` (rejects missing tokens) → `reauthRewrite` (buffers for auth-error rewrite) → `mcpRouter` (runs the tool).

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 4: Smoke-test manually**

Start the server:

```bash
npm run dev
```

In a second terminal, call `/mcp` with a clearly fake token to verify the middleware is in the chain and does NOT interfere with normal auth errors (missing token should still return 401 from `bearerAuth`, not from the rewriter):

```bash
curl -s -X POST http://localhost:3030/mcp \
  -H 'Content-Type: application/json' \
  -d '{}' | jq .
```

Expected: 401 from `bearerAuth` (no Bearer token at all — this path bypasses the rewriter entirely and is handled upstream).

Then verify the health endpoint still works:

```bash
curl -s http://localhost:3030/health | jq .
```

Expected: `{ "status": "ok" }` (or similar)

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire reauthRewriteMiddleware into /mcp route"
```

---

## Task 5: Verify SPP refresh-token lifetime

**Files:**
- Create: `docs/token-lifetimes.md`

This task is an investigation + documentation task, not a code change.

- [ ] **Step 1: Do a fresh OAuth login and capture token metadata**

With the server running and ngrok active, connect a new MCP client (or use MCP Inspector) and complete a full OAuth flow. Watch the server logs for the `[OAUTH-TOKEN] SPP success` line, which records:

```
{ grantType: 'authorization_code', hasAccessToken: true, hasRefreshToken: true, expiresIn: <N> }
```

Note `expiresIn` — this is the access token lifetime in seconds.

- [ ] **Step 2: Check SPP OAuth app settings**

In the SuiteProjects Pro admin panel, navigate to the OAuth app config and look for:
- Session timeout / access token expiry
- Refresh token expiry / sliding window settings

Document exact values found.

- [ ] **Step 3: Empirical refresh test**

Wait for the access token to expire (`expiresIn` seconds after login). Then invoke any MCP tool. Watch the server logs:

- You should see `[OAUTH-TOKEN] forwarding to SPP { grantType: 'refresh_token', ... }` — this is `mcp-remote` doing the silent refresh after receiving the 401.
- The tool call should succeed without any user prompt.

If the silent refresh fires and the tool succeeds: **Tier 1 is working.**

- [ ] **Step 4: Create `docs/token-lifetimes.md` with findings**

```markdown
# SPP Token Lifetimes

## Access Token

- **Lifetime:** [fill in from expiresIn, e.g. 3600 seconds / 1 hour]
- **Source:** `[OAUTH-TOKEN]` log + SPP admin panel

## Refresh Token

- **Lifetime:** [fill in from SPP admin panel]
- **Behaviour:** [sliding window / absolute expiry / other]
- **Source:** SPP OAuth app settings

## Observed Behaviour

- Silent refresh (Tier 1): [confirmed / not confirmed] on [date]
- Browser re-login required (Tier 2): expected when refresh token expires after [X days/hours of inactivity]

## User Impact

- Users who use the MCP at least once every [refresh token lifetime]: never see a login prompt.
- Users who are inactive longer than that: see a browser login prompt once per [period].
```

- [ ] **Step 5: Commit**

```bash
git add docs/token-lifetimes.md
git commit -m "docs: add SPP token lifetime findings"
```

---

## Task 6: Update Claude Desktop docs

**Files:**
- Modify: `docs/clients/claude-desktop.md`

- [ ] **Step 1: Rewrite `docs/clients/claude-desktop.md`**

Replace the full contents with:

```markdown
# Claude Desktop

## Recommended Setup — Native Remote Connector

Claude Desktop supports remote MCP servers directly. This is the simplest setup and provides the best authentication experience, including automatic token refresh.

1. Make sure the server is running and publicly reachable (e.g. via ngrok).
2. Ensure `APP_BASE_URL` and `SPP_CALLBACK_URL` in `.env` use the public HTTPS URL.
3. In Claude Desktop, go to **Settings → Connectors → Add custom connector**.
4. Enter the server URL: `https://your-domain/mcp`
5. Click **Connect** — a browser tab opens for SPP login. Complete it once.

That's it. Claude Desktop handles token refresh automatically. You will not be prompted to log in again unless your SPP session expires completely.

## Fallback Setup — mcp-remote (older Claude Desktop versions)

If your version of Claude Desktop does not support native remote connectors, use `mcp-remote`:

```json
{
  "mcpServers": {
    "redspace-spp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-domain/mcp"]
    }
  }
}
```

Add this to your `claude_desktop_config.json` and restart Claude Desktop. On first launch, `mcp-remote` opens a browser tab for login.

## Tips

- Keep `REGISTRATION_SECRET` set if the server is reachable from outside your machine.
- If the ngrok URL changes, update `APP_BASE_URL` and `SPP_CALLBACK_URL` in `.env` and restart the server.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Auth prompt never appeared / tools fail silently | You are using the `mcp-remote` config. Clear its token cache: `rm -rf ~/.mcp-auth` then fully quit and reopen Claude Desktop. |
| OAuth loops / callback error | `SPP_CALLBACK_URL` must match the URL registered in the SuiteProjects Pro OAuth app exactly. |
| `401` on every tool call after re-login | Token refresh is working. If it keeps looping, check `docs/token-lifetimes.md` for refresh token expiry. |
| Empty/broken XML responses | `SPP_NAMESPACE` and `SPP_KEY` are not set correctly in `.env`. |
```

- [ ] **Step 2: Run full test suite one last time**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add docs/clients/claude-desktop.md
git commit -m "docs: lead with native remote connector; add mcp-remote auth troubleshooting"
```
