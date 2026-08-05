# Architecture & Operations

This document covers what the code cannot state about itself: how a request moves
through the server, where state lives, what breaks it, and what to know before
changing it. Read [`CLAUDE.md`](../CLAUDE.md) first for the project overview and
configuration reference, and [`README.md`](../README.md) for setup and deployment.

## What this server is

An HTTP MCP server that sits between MCP clients (Claude Desktop, MCP Inspector,
Copilot CLI, OpenCode) and SuiteProjects Pro. It does two jobs:

1. **OAuth proxy.** SPP's OAuth app holds one client ID and secret. MCP clients
   need their own credentials and expect OAuth 2.1 with PKCE. The proxy issues
   per-client credentials and translates them to the single upstream pair, so
   `SPP_CLIENT_SECRET` never leaves this server.
2. **Tool surface.** It exposes SPP's XML business-object API as MCP tools and
   resources, with schema discovery so an agent can find its way around without
   hardcoded knowledge of SPP.

The server **never stores user credentials**. Access tokens arrive on each request
as a Bearer token and are passed straight through to SPP. Token validation is SPP's
job — if SPP rejects a token, the tool surfaces an auth error. This is why there is
no session store and no token database.

## Request lifecycle

Middleware order in [`src/index.ts`](../src/index.ts) is load-bearing. Top to
bottom, every request passes through:

| Order | Layer | Notes |
|---|---|---|
| 1 | `requestIdMiddleware` | Assigns `X-Request-Id`, echoed in the response. Every log line can be correlated to one user action across MCP, OAuth, and SPP hops. |
| 2 | `cors` | Reflects any origin unless `CORS_ORIGINS` narrows it. `Mcp-Session-Id` is accepted but never emitted — neither transport leg generates session IDs. |
| 3 | Security headers | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`. Deliberately hand-rolled to avoid a helmet dependency. |
| 4 | Body parsers | JSON and urlencoded, both capped at 1 MB. |
| 5 | `oauthLimiter` | Rate limit on `/oauth/*` and `/callback/spp` only. `OAUTH_RATE_LIMIT_PER_MIN` per minute, default 30. |
| 6 | Route handlers | Discovery, OAuth proxy, and `/health` are all unauthenticated. |
| 7 | `originValidation` | `/mcp` only. DNS-rebinding protection. |
| 8 | `bearerAuthMiddleware` | `/mcp` only. Extracts the Bearer token; `401` with a `WWW-Authenticate` challenge if absent. |
| 9 | `reauthRewriteMiddleware` | `/mcp` only. See [Automatic re-authentication](#automatic-re-authentication). |
| 10 | `mcpRouter` | The MCP transport. |
| 11 | Error handler | Registered last so it catches everything. Returns `500` with the request ID, never a stack trace. |

`trust proxy` is set to `1` in production when `TRUST_PROXY` is unset, because the
server normally runs behind a reverse proxy. Get this wrong and the rate limiter
sees the proxy's IP for every client. The limiter's `xForwardedForHeader`
validation is deliberately disabled — a misconfiguration here used to crash the
process, and a rate-limit problem must never take the server down.

## The two MCP protocol eras

[`src/mcp/transport.ts`](../src/mcp/transport.ts) serves two protocol revisions on
the same `/mcp` endpoint:

- **Modern** — revision `2026-07-28`. Stateless, per-request `_meta` envelope, no
  protocol-level sessions.
- **Legacy** — the `initialize`-handshake era that preceded it.

`POST /mcp` classifies each request with the SDK's `isLegacyRequest()` and routes
accordingly. `GET /mcp` returns `405` in both eras. `DELETE /mcp` is a no-op `200`
in the legacy era (the client is signalling end-of-session, which stateless mode
ignores) and `405` otherwise.

Both legs call the same `buildServer()` factory. **Keep it that way.** The reason it
exists is that tools, resources, capabilities, and cache hints registered in one
leg but not the other produce a server that behaves differently depending on which
client connected — a class of bug that is extremely hard to reproduce.

### Retiring the legacy leg

`MCP_LEGACY` defaults to `serve`. Every legacy-served request logs
`[MCP] serving legacy-era request` with the client info. To retire the leg:

1. Grep production logs for that line over a representative period.
2. If nothing appears, set `MCP_LEGACY=reject` and restart.
3. Once it has been `reject` for a while with no complaints, delete `handleLegacy()`
   and the `isLegacyRequest()` branch.

Do not skip step 1. The log line exists specifically so this decision is made on
evidence rather than a guess about what clients are in the field.

## OAuth proxy flow

```
MCP client                 This server                      SPP
    |                          |                             |
    |-- GET /oauth/authorize -->|                            |
    |   client_id, state,       | validate client_id (CIMD    |
    |   redirect_uri,           |   or DCR registry)          |
    |   code_challenge (S256)   | validate redirect_uri       |
    |                           | store state -> {redirect_uri,|
    |                           |   challenge, client_id}     |
    |                           |-- redirect to SPP /authorize->|
    |                           |   (SPP_CLIENT_ID,            |
    |                           |    SPP_CALLBACK_URL,         |
    |                           |    PKCE stripped)            |
    |                           |                             |
    |                           |<-- GET /callback/spp --------|
    |                           |    code, state              |
    |                           | look up state               |
    |                           | bind code -> {challenge,     |
    |                           |   proxyClientId}            |
    |<-- redirect to client's --|                             |
    |    original redirect_uri  |                             |
    |                           |                             |
    |-- POST /oauth/token ----->|                             |
    |   code, code_verifier     | authenticate proxy client   |
    |                           | verify PKCE against binding |
    |                           | swap in SPP_CLIENT_ID/SECRET|
    |                           |-- POST SPP /token ---------->|
    |<-- token response verbatim|<----------------------------|
```

Two things make this more than a dumb relay. The proxy **substitutes credentials**,
so SPP only ever sees one client and MCP clients never see the SPP secret. And it
**terminates PKCE itself**, because SPP does not implement it — the challenge is
stripped before the upstream redirect and verified locally at token exchange.

### Client registration: two paths

- **DCR** (`POST /oauth/register`, RFC 7591) issues a fresh `client_id` and
  `client_secret` per call, persisted to `data/clients.json`. **Set
  `REGISTRATION_SECRET` on anything reachable.** Unset, this endpoint lets anyone
  mint valid proxy credentials, which is step one of several authorization-code
  interception chains.
- **CIMD** ([`src/routes/cimd.ts`](../src/routes/cimd.ts)) treats an `https`
  `client_id` with a path as a URL to fetch and use as the registration. This means
  a server-side fetch of an attacker-controllable URL, so the SSRF blocking in that
  file is not optional decoration. It blocks loopback, private, link-local,
  multicast, CGNAT, `::`, and NAT64 ranges regardless of `CIMD_ALLOWED_HOSTS`,
  enforces the body cap while streaming, and pins the fetch to the DNS resolution
  it already validated to close a rebinding TOCTOU. If you touch this file, read
  the header comment first — every mitigation there is the result of a specific
  finding.

`redirect_uri` validation is shared by both paths via
[`src/routes/redirectUri.ts`](../src/routes/redirectUri.ts). It lives in its own
module because CIMD and DCR having separate implementations is exactly what
produced two separate review findings. One implementation, both callers — please
keep it that way.

## Automatic re-authentication

When an SPP token expires, tools return an `AUTH_ERROR` result. A tool-level error
is a `200` at the HTTP layer, so a client has no reason to re-authenticate.

`reauthRewriteMiddleware` buffers the `/mcp` response, detects an `AUTH_ERROR`
payload, and rewrites it into a `401` with a spec-compliant `WWW-Authenticate`
challenge. Clients that understand the challenge silently re-authenticate instead
of showing the user an error.

Buffering is skipped for SSE responses — buffering a stream would hold it open
indefinitely. This middleware overrides `write`, `end`, and `writeHead`, so it is
sensitive to how responses are produced; the `reauthRewrite.eras.test.ts` parity
test exists to catch breakage in either transport leg.

See [`docs/token-lifetimes.md`](./token-lifetimes.md) for observed SPP token
lifetimes and how to re-measure them.

## Business-object layer

```
tool (generic_list, …)
  → registry (merged schema)      src/services/registry.ts
  → BOService                     src/services/BOService.ts
  → SPPClient                     src/clients/SPPClient.ts
  → XmlBuilder / DataExtractor    src/utils/
  → SPP XML API (POST /api.pl)
```

SPP's API is XML over a single `POST /api.pl` endpoint. `XmlBuilder` constructs
request documents and `DataExtractor` unwraps responses, including per-block write
statuses — an SPP write can partially succeed, and each `<Add>`/`<Modify>`/
`<Delete>` block carries its own status code.

`SPP_NAMESPACE` and `SPP_KEY` are injected into the XML auth block on every call.
If they are wrong you get empty or malformed responses rather than a clear error,
which is the single most common source of confusing failures here.

### The registry merge

There are two schema sources, merged by `src/services/registry.ts`:

- **Derived** — [`boSchemaRegistry.derived.ts`](../src/services/boSchemaRegistry.derived.ts),
  auto-generated, 3,760 lines, complete field lists. Never edit by hand;
  regenerate with `npm run gen:registry` (this also runs automatically on
  `prebuild`).
- **Curated** — [`boSchemaRegistry.ts`](../src/services/boSchemaRegistry.ts),
  hand-written metadata: canonical and alternate IDs, required fields,
  relationships, examples. Field lists here may be partial.

Fields are **unioned** with curated definitions winning per field; all other
curated metadata wins wholesale. The union matters: a partial curated field list
that shadowed the full derived one caused strict validation to reject real SPP
fields such as `User.hierarchy_node_ids`.

Validation is source-aware — strict for curated BOs, passthrough for derived and
unknown ones. That is what lets `generic_*` reach a BO nobody has curated yet.

### Adding a business object

Most BOs need no work: they are already in the derived registry and `generic_*`
reaches them. Add a curated entry only to improve agent ergonomics — required
fields, examples, relationships. If the BO is user-bound (like `Timesheet` or
`TimeEntry`), add it to the guard list in
[`src/mcp/helpers/agentUserContext.ts`](../src/mcp/helpers/agentUserContext.ts) so
"my timesheet" resolves to the caller. See
[`docs/agentUserContext.md`](./agentUserContext.md).

If a BO's XML type name or filter element name differs from its `BOName` key, add
it to the mapping tables in [`XmlBuilder.ts`](../src/utils/XmlBuilder.ts) — SPP is
not consistent about this.

## State: where it lives and what loses it

| State | Location | Lost on restart? |
|---|---|---|
| Pending auth requests (`state` → redirect_uri + PKCE challenge) | In-memory `TtlMap`, 10 min TTL | **Yes** |
| Code bindings (`code` → challenge + client) | In-memory `TtlMap`, 10 min TTL | **Yes** |
| Registered DCR clients | `data/clients.json`, mode `0600` | No, if the file survives |
| Project stage labels | In-memory cache, short TTL | Yes, harmless — refetched |
| Access and refresh tokens | Held by the MCP client | N/A — never stored here |

Three consequences worth internalizing:

1. **A restart mid-OAuth-flow breaks that client's login.** The `state` entry is
   gone, so `/callback/spp` refuses to relay the code and the client must start
   over. This is intentional: a code with no server-side binding is not redeemable,
   because treating it as unconstrained would mean an unbound code is accepted.
   The user-visible effect is one failed login attempt, not a broken client — but
   deploy when nobody is mid-login if you can.
2. **`data/clients.json` must survive redeploys.** Lose it and every DCR client
   must re-register, which for most MCP clients means the user reconnects manually.
   It is `.gitignore`d, lives under the repo working directory, and `git pull`
   does not touch it — but a fresh clone or a wiped working directory does.
3. **It is all single-instance.** In-memory maps mean you cannot run two replicas
   behind a load balancer without moving `oauthState` to shared storage. This is a
   deliberate simplification, not an oversight — but it is a hard constraint on
   scaling.

## Configuration

`src/config.ts` validates the environment once with Zod, freezes it, and throws a
readable error listing every problem at startup. Adding a variable means adding it
there.

Two caveats the header comment does not mention:

- **Not every module uses it.** `SPPClient`, `wellKnown.ts`, `callbackSpp.ts`,
  `clientRegistry.ts`, `authChallenge.ts`, and others still read `process.env`
  directly. Migrating them is a worthwhile cleanup, but until then, adding a
  variable to `config.ts` alone does not guarantee it is what a given module reads.
- **`MUTEX_ID_ENABLED` is parsed explicitly, and must stay that way.** It reaches
  the schema as a string and is compared against `'TRUE'`. It was previously read
  straight off `process.env` and tested for truthiness, so `MUTEX_ID_ENABLED=FALSE`
  *enabled* the feature — a non-empty string is truthy — and only unset or empty
  disabled it. `.env.sample` shipped `FALSE` under a comment recommending `TRUE`,
  so the file said one thing, recommended another, and did a third. Note that
  `z.coerce.boolean()` would reintroduce the bug verbatim, since
  `Boolean('FALSE') === true`; `config.test.ts` pins the parsing against exactly
  that regression.

`CLIENT_REGISTRY_PATH` resolves **relative to the process working directory**, as
does the `package.json` fallback in `identity.ts`. The process must therefore start
with its working directory at the repo root. pm2 does this correctly when started
from that directory; be aware of it if you ever change how the process is launched.

## Testing

24 test files, 218 tests, under Jest with ts-jest: `npm test`.

The suite concentrates on the security-critical and easy-to-regress areas rather
than aiming at uniform coverage — PKCE, redirect_uri validation, CIMD and its SSRF
blocking, code bindings, origin validation, the client registry, and cross-era
transport parity. `transport.characterization.test.ts` pins current transport
behavior so refactors have to be deliberate about changing it.

**There is no CI.** `.github/` contains only a Copilot memory file — no workflows.
Every test run in this project's history happened on a developer's machine. Anyone
inheriting this should treat adding a workflow that runs `npm test` and
`npm run build` on pull requests as the first infrastructure task; the suite is
good enough to be worth enforcing, and nothing is enforcing it.

`jest.config.cjs` sets `testPathIgnorePatterns` for `node_modules`, `dist`, and
`.claude`. That last one is not incidental: without it, `testRegex` also matches git
worktree copies under `.claude/worktrees/`, so the suite runs twice and tests from
whatever branch that worktree holds execute alongside the real ones — able to fail
the run, or to mask a real failure. If you add another worktree location, add it
there too.

## Gotchas

- **`request.headers` is a `Headers` object on the modern leg**, not Express's
  plain object. `.get('authorization')` is required; `.headers.authorization`
  returns `undefined` silently and permanently.
- **`identity.ts` resolves `package.json` via `process.cwd()`, not
  `import.meta.url`**, because ts-jest transpiles the file to CommonJS where
  `import.meta` is a syntax error regardless of whether the code path runs.
- **PKCE `plain` is rejected outright** and kept out of the TypeScript types so it
  cannot be reintroduced accidentally. Its challenge travels in a GET query string,
  so a leaked challenge is a leaked verifier.
- **`genericAdd` sets `destructiveHint: false` explicitly.** The spec defaults it to
  `true` for any non-read-only tool, so a pure create that omits it is treated by
  conformant clients exactly like `generic_delete`.
- **The `echo` tool is excluded when `NODE_ENV=production`** — see
  [`src/mcp/tools/index.ts`](../src/mcp/tools/index.ts).
- **Server-generated fields are never required on add payloads**, even when the
  registry marks them required, because registry entries describe records read back
  from SPP rather than records being created. See
  [`normalizeAndValidateBOInput.ts`](../src/utils/normalizeAndValidateBOInput.ts).
- **`uncaughtException` and `unhandledRejection` exit the process.** This is
  deliberate — a supervisor restarting cleanly beats a wedged process serving
  errors. It does mean pm2 restart counts are the signal to watch for instability.
