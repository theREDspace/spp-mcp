# Redspace SPP MCP Server

An HTTP MCP (Model Context Protocol) server for Oracle NetSuite SuiteProjects Pro
(SPP). It acts as an OAuth 2.1 proxy in front of SPP's OAuth app and exposes SPP's
business-object model to MCP clients as generic CRUD tools with schema discovery.

- **Port:** 3030
- **MCP endpoint:** `/mcp`
- **Protocol revisions:** `2026-07-28` and the legacy `initialize` era, served side by side
- **Runtime:** Node 20+, TypeScript, ESM

| I want to… | Go to |
|---|---|
| Run it locally | [Quick start](#quick-start) |
| Deploy to production | [Deployment](#deployment) |
| Understand how it works | [`docs/architecture.md`](./docs/architecture.md) |
| Connect a specific client | [`docs/clients/`](./docs/clients/) |
| Know what users can ask it | [`questions.md`](./questions.md) |
| Add or change a tool | [`docs/architecture.md`](./docs/architecture.md#business-object-layer) |

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/theREDspace/spp-mcp.git && cd spp-mcp && npm install
```

### 2. Create an SPP API Integration app

In SuiteProjects Pro, create an API Integration application and register your
callback URL as its `redirect_uri`. This must match `SPP_CALLBACK_URL` exactly — a
mismatch is the most common cause of OAuth loops.

### 3. Configure the environment

```bash
cp .env.sample .env
```

Fill in the values from [Configuration](#configuration) below. The server validates
everything at startup and refuses to boot with a readable list of what is wrong, so
you will not get far with a bad `.env`.

### 4. Expose the server publicly

SPP must be able to reach your callback URL, so local development needs a tunnel:

```bash
ngrok http 3030
```

Then set `APP_BASE_URL` and `SPP_CALLBACK_URL` to the ngrok HTTPS URL and update
the callback in your SPP app config to match.

### 5. Run

```bash
npm run dev
```

For a production-style run:

```bash
npm run build && npm start
```

`npm run build` type-checks with `tsc --noEmit`, regenerates the derived BO registry,
and bundles to `dist/` with esbuild. It will fail on a type error rather than emit
broken output.

### 6. Confirm it works

```bash
curl http://localhost:3030/health
```

Expect `{"status":"ok"}`. Then point [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
at `https://your-ngrok-domain/mcp` with OAuth enabled and complete a login:

```bash
npx @modelcontextprotocol/inspector
```

---

## Configuration

Every variable is validated by a Zod schema in [`src/config.ts`](./src/config.ts).

### Required

| Variable | Description |
|---|---|
| `SPP_URL` | SuiteProjects Pro instance URL. Must be a valid URL. |
| `SPP_CLIENT_ID` | OAuth2 client ID from your SPP API Integration app. |
| `SPP_CLIENT_SECRET` | OAuth2 client secret. Never leaves this server. |
| `SPP_CALLBACK_URL` | OAuth callback, e.g. `https://your-domain/callback/spp`. Must be registered in the SPP app. |
| `SPP_NAMESPACE` | SPP XML API namespace. Wrong values produce empty or malformed responses rather than clear errors. |
| `SPP_KEY` | SPP XML API key. Same caveat. |

### Strongly recommended

| Variable | Default | Description |
|---|---|---|
| `APP_BASE_URL` | `http://localhost:3030` | Public URL of this server. Used in all `/.well-known` metadata and as the default for `ALLOWED_ORIGIN_HOSTS`. |
| `REGISTRATION_SECRET` | unset | Gates `POST /oauth/register`. Minimum 8 characters. **Unset means anyone can mint valid proxy client credentials** — treat that as development-only. |
| `NODE_ENV` | `development` | `development`, `test`, or `production`. Production excludes the `echo` debug tool and enables the `TRUST_PROXY` default. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3030` | HTTP listen port. |
| `MCP_LEGACY` | `serve` | `serve` or `reject`. Whether to serve pre-`2026-07-28` clients. See [retiring the legacy leg](./docs/architecture.md#retiring-the-legacy-leg). |
| `ALLOWED_ORIGIN_HOSTS` | `APP_BASE_URL`'s host | Comma-separated hostnames (no scheme or port) for `Origin` validation on `/mcp`. Set explicitly only if a browser-based client is served from a different origin; non-browser clients send no `Origin` and always pass. |
| `CIMD_ALLOWED_HOSTS` | any `https` host | Comma-separated hostname allowlist for Client ID Metadata Document fetches. Private, loopback, and link-local ranges are blocked regardless of this setting. |
| `SPP_FORWARD_CALLBACK_URL` | unset | Fallback for `/callback/spp` when the `state` entry is gone. Relays SPP **error** responses only — never a code. |
| `CORS_ORIGINS` | reflect any origin | Comma-separated allowed origins. |
| `TRUST_PROXY` | `1` in production | Express `trust proxy` value. Required behind a reverse proxy so rate limiting sees real client IPs. |
| `OAUTH_RATE_LIMIT_PER_MIN` | `30` | Requests per minute per IP on `/oauth/*` and `/callback/spp`. |
| `CLIENT_REGISTRY_PATH` | `data/clients.json` | DCR client registry path. **Resolved relative to the process working directory.** |

| `MUTEX_ID_ENABLED` | `false` | Adds a `mutex_id` to Timesheet creation for idempotency. Only the literal `TRUE` (any case, trimmed) enables it. |

> **Behavior change in the commit that fixed this.** `MUTEX_ID_ENABLED` used to be
> read straight off `process.env` and tested for truthiness, so `FALSE` — a
> non-empty string — *enabled* the feature just like `TRUE`. It is now parsed
> properly. **If your `.env` says `FALSE` and you relied on the old behavior, change
> it to `TRUE`**, or the mutex ID will stop being sent after you deploy.

---

## Deployment

Production runs on a single EC2 instance under pm2. There is no CI/CD pipeline —
deployment is manual, from the box.

```bash
ssh ec2-user@100.53.3.98
```

Then, in the `spp` directory:

```bash
cd spp && git pull && npm run build && pm2 stop spp-mcp && pm2 start spp-mcp
```

Or step by step, if you want to check each stage:

```bash
cd spp
git pull
npm run build
pm2 stop spp-mcp
pm2 start spp-mcp
```

### Notes on deploying

- **`npm run build` fails on type errors** and will not overwrite `dist/`. If it
  fails, the running service is still on the old build — fix the error before
  stopping pm2, and you avoid downtime entirely.
- **Run `npm install` first if dependencies changed.** `git pull` updates
  `package.json` but does not install anything.
- **Do not delete `data/clients.json`.** It holds every registered OAuth client and
  is `.gitignore`d, so `git pull` leaves it alone — but a fresh clone or a wiped
  working directory loses it, and then every MCP client must reconnect manually.
- **Deploy when nobody is mid-login.** Pending OAuth flows live in memory with a
  10-minute TTL, so a restart makes any in-flight login fail and need restarting.
  Established connections are unaffected — tokens live in the client.
- **`.env` is not in git.** Configuration changes are made on the box directly.

### Verifying a deploy

```bash
pm2 status spp-mcp && curl -s http://localhost:3030/health && pm2 logs spp-mcp --lines 40
```

Startup logs every mounted endpoint plus the active `Origin` validation hosts, so a
misconfiguration is visible immediately. A climbing pm2 restart count means the
process is crashing — `uncaughtException` deliberately exits so pm2 can restart it
cleanly.

### Rolling back

```bash
cd spp && git log --oneline -5
```

Then check out the last known-good commit and rebuild:

```bash
git checkout <commit> && npm run build && pm2 restart spp-mcp
```

---

## Endpoints

Verified against [`src/index.ts`](./src/index.ts). Substitute your `APP_BASE_URL`
for `<base>`; production is `http://100.53.3.98:3030`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/mcp` | Bearer | All MCP traffic. Both protocol eras. |
| `GET`/`DELETE` | `/mcp` | Bearer | `405`, except legacy `DELETE` which is a no-op `200`. |
| `GET` | `/health` | none | Liveness. Returns `{"status":"ok"}`. |
| `GET` | `/.well-known/oauth-protected-resource` | none | RFC 9728 resource metadata. |
| `GET` | `/.well-known/oauth-authorization-server` | none | RFC 8414 AS metadata. |
| `GET` | `/.well-known/openid-configuration` | none | Same handler as above, for clients that only look here. |
| `GET` | `/oauth/authorize` | none | Authorization proxy. Requires `client_id`, `state`, `redirect_uri`, and `code_challenge`. |
| `GET` | `/callback/spp` | none | Receives SPP's callback, relays to the client's `redirect_uri`. |
| `POST` | `/oauth/token` | client creds | Token proxy. Verifies PKCE, swaps in the SPP credentials. |
| `POST` | `/oauth/register` | `REGISTRATION_SECRET` | RFC 7591 Dynamic Client Registration. |

---

## Tools and resources

Eleven tools in production, plus `echo` outside production. Full schemas are
available at runtime via `tools/list`.

### Discovery

| Tool | Purpose |
|---|---|
| `list_object_types` | Every supported business object, curated and derived. |
| `describe_object_type` | Fields, canonical and alternate IDs, required fields, examples for one BO. Reports whether metadata is `curated`, `derived`, or `passthrough`. |

### Generic CRUD

Works against **any** business object — curated, derived, or unknown.

| Tool | Purpose |
|---|---|
| `generic_read` | One record by canonical or alternate ID. |
| `generic_list` | List and search with filters. |
| `generic_batch_list` | Multiple filter objects in one call. |
| `generic_add` | Create one record, or a batch. |
| `generic_update` | Update one record, or a batch. |
| `generic_delete` | Delete one record, or a batch. |

### Composite and utility

| Tool | Purpose |
|---|---|
| `move_hierarchy_records` | Move records between nodes of the same hierarchy. Sequential per record, so capped per call. |
| `whoami` | The authenticated user's identity. Use instead of `generic_list("User")`. |
| `get_user_profile` | Public profile for a user by ID. Excludes passwords, SSN, and compensation. |
| `echo` | Debug only. Excluded when `NODE_ENV=production`. |

### MCP resources

Clients supporting resources should prefer these over spending tool calls on
discovery. All are cacheable for one hour.

| URI | Contents |
|---|---|
| `bo://catalog` | Every supported BO name with a summary. |
| `bo://schema/{objectType}` | Full schema for one BO. |
| `bo://semantic-patterns` | Curated intent → query-pattern mappings. |

---

## Security

- **Credentials are never stored here.** Access tokens arrive as Bearer tokens per
  request and pass straight through to SPP. There is no session or token store.
- **`SPP_CLIENT_SECRET` never reaches an MCP client.** Clients get their own proxy
  credentials; the proxy substitutes the upstream pair.
- **PKCE is mandatory for every client**, `S256` only. `plain` is rejected.
- **Set `REGISTRATION_SECRET`** on anything reachable from the internet.
- **Keep `.env` and `data/clients.json` out of git.** Both are `.gitignore`d.
- Rotate `SPP_KEY` and the OAuth client secret on the normal schedule for your org.

### Compatibility note on the OAuth proxy

The `/mcp` transport is backward compatible; **the OAuth proxy is not.** The
following are hard `400`s, and a client that previously succeeded by omitting them
will now fail: missing `client_id`, missing `state`, missing `code_challenge`, a
`plain` PKCE method, or an unregistered `redirect_uri`. All are required by OAuth
2.1 and the MCP authorization spec, so conforming clients are unaffected.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| `401` on `/mcp` | Is the client sending a valid Bearer token? Has the SPP session expired? |
| OAuth loops | `SPP_CALLBACK_URL` must match the SPP app config and `.env` exactly. |
| `400` at `/oauth/authorize` | Missing `client_id`, `state`, or `code_challenge`; `plain` PKCE; or an unregistered `redirect_uri`. |
| Login fails right after a deploy | Pending flows are in-memory with a 10-minute TTL. Restart the login. |
| Every client suddenly needs to re-register | `data/clients.json` was lost. |
| Empty or malformed XML from SPP | `SPP_NAMESPACE` and `SPP_KEY`. |
| `403` from `/mcp` in a browser client | Add its hostname to `ALLOWED_ORIGIN_HOSTS`. |
| Rate limiting hits the wrong clients | Set `TRUST_PROXY` correctly for your proxy topology. |
| Registration rejected | `REGISTRATION_SECRET` must be supplied by the client. |

---

## Development

```bash
npm run dev            # nodemon + ts-node, watches src/
npm test               # Jest, 24 test files / 218 tests
npm run build          # tsc --noEmit, regenerate registry, bundle to dist/
npm start              # run dist/index.js
npm run gen:registry   # regenerate the derived BO registry (also runs on prebuild)
```

There is **no CI** — `.github/` holds only a Copilot memory file. Run `npm test` and
`npm run build` yourself before pushing.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | Request lifecycle, the two protocol eras, OAuth proxy flow, BO registry, where state lives, gotchas. **Start here.** |
| [`CLAUDE.md`](./CLAUDE.md) | Guidance for AI coding agents. |
| [`questions.md`](./questions.md) | What users can actually ask, mapped to tool calls. |
| [`docs/agentUserContext.md`](./docs/agentUserContext.md) | Resolving user context in tools ("my timesheet"). |
| [`docs/token-lifetimes.md`](./docs/token-lifetimes.md) | Observed SPP token lifetimes and how to re-measure. |
| [`docs/clients/claude-desktop.md`](./docs/clients/claude-desktop.md) | Claude Desktop setup. |
| [`docs/clients/copilot-cli.md`](./docs/clients/copilot-cli.md) | Copilot CLI setup. |
| [`docs/clients/opencode.md`](./docs/clients/opencode.md) | OpenCode setup. |
| [`CHANGELOG.md`](./CHANGELOG.md) | What changed and why. |
| [`docs/superpowers/specs/`](./docs/superpowers/specs/) | Design specs for past work. |
| [`docs/superpowers/plans/`](./docs/superpowers/plans/) | Implementation plans for past work. |
| [Issues](https://github.com/theREDspace/spp-mcp/issues) | Bugs and feature requests. |
