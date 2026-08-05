# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An HTTP MCP server for SuiteProjects Pro. Acts as an OAuth 2.1 proxy in front of SPP's OAuth app and exposes SPP's business-object model as generic CRUD tools (`generic_read`, `generic_list`, `generic_add`, …) plus schema-discovery tools and `bo://` resources. There are no per-domain tools — a "project" or "timesheet" query is a `generic_*` call with `objectType` set.

- **Port:** 3030
- **MCP Endpoint:** `/mcp`
- **Language:** TypeScript (Node 20+)
- **Key Library:** `@modelcontextprotocol/express`, `axios`, `fast-xml-parser`

**Read [`docs/architecture.md`](docs/architecture.md) before making non-trivial changes.** It covers the request lifecycle, the dual-era transport, the OAuth proxy flow, the registry merge, where state lives, and the gotchas that have already caused bugs here.

## Development

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

### Protocol Revision

`/mcp` serves MCP protocol revision `2026-07-28` (modern, stateless, per-request `_meta` envelope) and the legacy `initialize`-handshake era side by side on the same endpoint, routed in `src/mcp/transport.ts` by the SDK's `isLegacyRequest()` classifier. Both legs share one server-construction factory (`buildServer()` in that file) so tools, resources, capabilities, and cache hints can never drift between eras. See `MCP_LEGACY` above for how legacy support is eventually retired.

### OAuth Proxy Requirements

> **Compatibility break — OAuth proxy only.** The dual-era `/mcp` transport is backward compatible; **the OAuth proxy is not.** The requirements below are new hard `400`s. A client that previously completed authorization by omitting `client_id`, `state`, or `code_challenge` will now fail at `/oauth/authorize`, and a DCR client whose `redirect_uri` was never registered will fail there too. All are mandated by OAuth 2.1 / the MCP authorization spec, so conforming MCP clients are unaffected — but this belongs in release notes.

The proxy enforces these on every authorization-code flow:

- **PKCE is required for every client**, not just secret-less CIMD ones. `code_challenge` is mandatory at `/oauth/authorize` and verified at `/oauth/token`. Only `S256` is accepted (`plain` is rejected outright — its challenge travels in a GET query string, so a leaked challenge is a leaked verifier).
- **`client_id` and `state` are required** at `/oauth/authorize`. Both are load-bearing: `state` carries the PKCE challenge and the client binding through to the callback, and without `client_id` the code cannot be bound to a client at all.
- **`redirect_uri` must be pre-registered** and is matched for both CIMD and DCR clients. Accepted forms (single shared validator, `src/routes/redirectUri.ts`, used by both registration paths): absolute `https`; `http` on loopback only (`localhost`, `127.0.0.1`, `[::1]`) per RFC 8252 §7.3; and private-use schemes such as `cursor://…` or `com.example.app:/oauth` per RFC 8252 §7.1, which is what most native/desktop MCP clients use. Script- and local-resource schemes (`javascript:`, `data:`, `file:`, `blob:`, …) are rejected.
- **A code with no server-side binding is never redeemable.** `codeBindings` entries expire after 10 minutes; a code whose binding is missing or expired is rejected rather than being treated as unconstrained. Consequently `/callback/spp` refuses to relay a `code` when its `state` entry is gone (e.g. lost across a restart) — the client must restart the flow. `SPP_FORWARD_CALLBACK_URL` still relays SPP *error* responses, which carry no credential.

## Troubleshooting

| Issue | Check |
|-------|-------|
| `401` on `/mcp` | Client sending valid bearer token? |
| OAuth loops | `SPP_CALLBACK_URL` matches in SPP app config and `.env` |
| Empty/broken XML | `SPP_NAMESPACE` and `SPP_KEY` set correctly |
| Registration errors | `REGISTRATION_SECRET` set for public `/oauth/register` |

See [`README.md`](README.md#troubleshooting) for the fuller table and [`README.md`](README.md#deployment) for deployment.

---

## RTK Commands

For token-optimized commands using Rust Token Killer (RTK), see the `/rtk-guide` skill — always prefix with `rtk` (e.g., `rtk jest`, `rtk git log`) for 60-90% token savings on common workflows.
