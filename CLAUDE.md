# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An HTTP MCP server for SuiteProjects Pro. Wraps OAuth2, proxies SPP API calls, and exposes tools for projects, users, bookings, time entries, and timesheets.

- **Port:** 3030
- **MCP Endpoint:** `/mcp`
- **Language:** TypeScript (Node 20+)
- **Key Library:** `@modelcontextprotocol/express`, `axios`, `fast-xml-parser`

## Development

### Common Commands

```bash
npm run dev           # Dev mode (hot reload with ts-node-dev)
npm run build         # TypeScript compile + esbuild
npm start             # Production start from dist/
npm test              # Run Jest tests
npx jest path/to/file.test.ts  # Single test file
```

### Prerequisites & Setup

1. Copy `.env.sample` to `.env` and fill in required variables:
   - `SPP_URL` — SuiteProjects Pro instance URL
   - `SPP_CLIENT_ID`, `SPP_CLIENT_SECRET` — OAuth app credentials
   - `SPP_CALLBACK_URL` — OAuth callback (e.g., `https://your-ngrok-domain/callback/spp`)
   - `APP_BASE_URL` — Public server URL for MCP clients
   - `SPP_NAMESPACE`, `SPP_KEY` — Required for SPP API calls
   - `REGISTRATION_SECRET` — Optional, but **strongly recommended for any reachable deployment**. Leaving it unset makes `/oauth/register` an open endpoint, so anyone can mint valid proxy client credentials. Obtaining such credentials is step one of several authorization-code interception chains, so treat "unset" as development-only.
   - `MCP_LEGACY` — `serve` (default) or `reject`. Controls whether `/mcp` still serves clients using the pre-2026-07-28 `initialize` handshake alongside modern clients. Flip to `reject` only once logs show no legacy-era traffic (the server logs every legacy-served request).
   - `ALLOWED_ORIGIN_HOSTS` — comma-separated hostnames (no scheme/port) for `Origin` header validation on `/mcp`, per MCP's DNS-rebinding-protection requirement. **Defaults to `APP_BASE_URL`'s host** when unset, so the protection is on by default; validation is skipped entirely (with a startup warning) only when neither is set. Non-browser MCP clients send no `Origin` and always pass — set this explicitly if a browser-based client is served from a different origin.
   - `CIMD_ALLOWED_HOSTS` — optional comma-separated hostname allowlist restricting which hosts `/oauth/authorize` and `/oauth/token` will fetch Client ID Metadata Documents from. Leave unset to allow any `https` host, subject to the built-in SSRF blocking (private/loopback/link-local ranges are always rejected regardless of this setting).

2. Create a SuiteProjects Pro API Integration app and register the callback URL

3. Use ngrok for public tunnel in dev/test:
   ```bash
   ngrok http 3030
   # Then update APP_BASE_URL and SPP_CALLBACK_URL in .env
   ```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Point to `https://your-ngrok-domain/mcp` with OAuth auth.

## Architecture

### Entry Point
- `src/index.ts` — Express server setup, auth middleware, route registration

### Core Layers

**API Client** — `src/clients/SPPClient.ts`
- Single source for all SPP API access
- Handles OAuth2, XML parsing, error handling
- Never call SPP directly; always go through `SPPClient`

**Routes** — `src/routes/`
- `/mcp` — MCP protocol endpoint
- `/health` — Health check
- `/callback/spp` — OAuth2 callback
- `/oauth/authorize`, `/oauth/token`, `/oauth/register` — OAuth proxy

**MCP Tools** — `src/mcp/tools/`
- Each tool is a standalone module: `listProjects.ts`, `addTimeEntry.ts`, etc.
- `src/mcp/tools/index.ts` — Tool registry
- `src/mcp/tools/types.ts` — Shared types and response structures

### Protocol Revision

`/mcp` serves MCP protocol revision `2026-07-28` (modern, stateless, per-request `_meta` envelope) and the legacy `initialize`-handshake era side by side on the same endpoint, routed in `src/mcp/transport.ts` by the SDK's `isLegacyRequest()` classifier. Both legs share one server-construction factory (`buildServer()` in that file) so tools, resources, capabilities, and cache hints can never drift between eras. See `MCP_LEGACY` above for how legacy support is eventually retired.

### OAuth Proxy Requirements

> **Compatibility break — OAuth proxy only.** The dual-era `/mcp` transport is backward compatible; **the OAuth proxy is not.** The requirements below are new hard `400`s. A client that previously completed authorization by omitting `client_id`, `state`, or `code_challenge` will now fail at `/oauth/authorize`, and a DCR client whose `redirect_uri` was never registered will fail there too. All are mandated by OAuth 2.1 / the MCP authorization spec, so conforming MCP clients are unaffected — but this belongs in release notes.

The proxy enforces these on every authorization-code flow:

- **PKCE is required for every client**, not just secret-less CIMD ones. `code_challenge` is mandatory at `/oauth/authorize` and verified at `/oauth/token`. Only `S256` is accepted (`plain` is rejected outright — its challenge travels in a GET query string, so a leaked challenge is a leaked verifier).
- **`client_id` and `state` are required** at `/oauth/authorize`. Both are load-bearing: `state` carries the PKCE challenge and the client binding through to the callback, and without `client_id` the code cannot be bound to a client at all.
- **`redirect_uri` must be pre-registered** and is matched for both CIMD and DCR clients. Accepted forms (single shared validator, `src/routes/redirectUri.ts`, used by both registration paths): absolute `https`; `http` on loopback only (`localhost`, `127.0.0.1`, `[::1]`) per RFC 8252 §7.3; and private-use schemes such as `cursor://…` or `com.example.app:/oauth` per RFC 8252 §7.1, which is what most native/desktop MCP clients use. Script- and local-resource schemes (`javascript:`, `data:`, `file:`, `blob:`, …) are rejected.
- **A code with no server-side binding is never redeemable.** `codeBindings` entries expire after 10 minutes; a code whose binding is missing or expired is rejected rather than being treated as unconstrained. Consequently `/callback/spp` refuses to relay a `code` when its `state` entry is gone (e.g. lost across a restart) — the client must restart the flow. `SPP_FORWARD_CALLBACK_URL` still relays SPP *error* responses, which carry no credential.

**Services** — `src/services/`
- Business logic for projects, bookings, users, timesheets, time entries
- Consumed by MCP tools

**Types** — `src/types/`
- Business objects and API schemas (generated from SPP)
- Do not edit directly if auto-generated

**Middleware** — `src/middleware/`
- `bearerAuth.ts` — OAuth token validation

**Utils** — `src/utils/`
- `Logger.ts` — Centralized logging
- Env validation helpers

### Data Flow

1. Client sends MCP request → Bearer token validated by middleware
2. MCP tool handler routes request to service
3. Service calls `SPPClient` for SPP API access
4. Response is parsed, validated, and returned to client

## Key Conventions

- **SPP API:** Always use `SPPClient`; never call SPP directly
- **Env Vars:** Validate all critical vars before startup (see `.env.sample`)
- **Logging:** Use `Logger` utility; do not use `console.*`
- **Testing:** Jest + `ts-jest` preset; add tests as needed
- **Types:** Business objects in `src/types/`; avoid modifying if auto-generated
- **OAuth:** All clients must use OAuth2; static tokens not supported

## Troubleshooting

| Issue | Check |
|-------|-------|
| `401` on `/mcp` | Client sending valid bearer token? |
| OAuth loops | `SPP_CALLBACK_URL` matches in SPP app config and `.env` |
| Empty/broken XML | `SPP_NAMESPACE` and `SPP_KEY` set correctly |
| Registration errors | `REGISTRATION_SECRET` set for public `/oauth/register` |

## Client Integration

See `docs/clients/` for setup guides:
- Claude Desktop
- OpenCode
- Copilot CLI

Each includes environment config examples.

---

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->
