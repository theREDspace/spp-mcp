# Changelog

This project does not tag releases. The version in `package.json` is the current
version, and it is what the server advertises to MCP clients via
`src/mcp/identity.ts`. Entries below are grouped by the work that produced them,
newest first.

## 2.0.0 — current

### MCP protocol revision 2026-07-28

- `/mcp` now serves protocol revision `2026-07-28` (stateless, per-request `_meta`
  envelope) alongside the legacy `initialize`-handshake era, routed by the SDK's
  `isLegacyRequest()` classifier in `src/mcp/transport.ts`. Both legs share one
  `buildServer()` factory, so tools, resources, capabilities, and cache hints
  cannot drift between eras.
- `MCP_LEGACY` (`serve` | `reject`, default `serve`) controls whether the legacy
  leg is served. Every legacy-served request is logged so the flip to `reject` can
  be timed by evidence.
- Added tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`,
  `openWorldHint`) and deterministic `tools/list` ordering.
- Added `server/discover` and cache hints (1 hour, public scope) on the discovery
  methods so capable clients stop re-fetching the catalog.
- `GET /mcp` returns `405` in both eras: the legacy era never exposed SSE over GET
  here, and `2026-07-28` removes the GET stream endpoint outright.
- Upgraded the MCP SDK to 2.0.0 GA.

### OAuth 2.1 hardening

This is a **compatibility break in the OAuth proxy only**; the `/mcp` transport
remains backward compatible. Each item below is a new hard `400`.

- PKCE is required for every client, not only secret-less ones. `code_challenge`
  is mandatory at `/oauth/authorize` and verified at `/oauth/token`. Only `S256` is
  accepted — `plain` is rejected, because its challenge travels in a GET query
  string, so a leaked challenge is a leaked verifier.
- `client_id` and `state` are required at `/oauth/authorize`. Both are
  load-bearing: `state` carries the PKCE challenge and client binding through to
  the callback, and without `client_id` a code cannot be bound to a client at all.
- `redirect_uri` must be pre-registered, and is now validated identically for CIMD
  and DCR clients through a single shared validator (`src/routes/redirectUri.ts`).
  Script and local-resource schemes (`javascript:`, `data:`, `file:`, `blob:`) and
  OS-handler redirect schemes are rejected; loopback `http` (RFC 8252 §7.3) and
  private-use schemes such as `cursor://` (RFC 8252 §7.1) are accepted.
- An authorization code with no server-side binding is never redeemable. Bindings
  expire after 10 minutes, and a code whose binding is missing or expired is
  rejected rather than treated as unconstrained. As a consequence `/callback/spp`
  refuses to relay a `code` whose `state` entry is gone — for example after a
  process restart — and the client must restart the flow.
- Added `Origin` header validation on `/mcp` for DNS-rebinding protection, via
  `ALLOWED_ORIGIN_HOSTS`. It defaults to `APP_BASE_URL`'s host, so the protection
  is on by default rather than opt-in.
- OAuth metadata now advertises PKCE support, as MCP 2025-11-25 requires.

### Client ID Metadata Documents

- Added CIMD support (`draft-ietf-oauth-client-id-metadata-document-00`) as the
  alternative to Dynamic Client Registration for clients this proxy has no prior
  relationship with. An `https` `client_id` with a path component is fetched and
  its contents treated as the client's registration.
- The fetch is SSRF-hardened: loopback, private, link-local, multicast, CGNAT,
  `::`, and NAT64 ranges are blocked; the body size cap is enforced while
  streaming; and the fetch is pinned to the already-validated DNS resolution to
  close a rebinding TOCTOU. `CIMD_ALLOWED_HOSTS` optionally narrows to a hostname
  allowlist.

### Automatic re-authentication

- Added `reauthRewriteMiddleware`, which rewrites a tool-level `AUTH_ERROR` result
  into a transport-level `401` with a spec-compliant `WWW-Authenticate` challenge.
  Clients that understand the challenge re-authenticate on their own instead of
  surfacing an error to the user. Buffering is skipped for SSE responses.

### Universal business-object access

- Generic CRUD tools for every registered business object: `generic_read`,
  `generic_list`, `generic_batch_list`, `generic_add`, `generic_update`,
  `generic_delete`.
- Discovery tools `list_object_types` and `describe_object_type`, plus the
  `bo://catalog`, `bo://schema/{objectType}`, and `bo://semantic-patterns` MCP
  resources, so clients can pre-fetch and cache discovery data rather than
  spending tool calls on it.
- Registry is the merge of an auto-generated schema
  (`boSchemaRegistry.derived.ts`, regenerate with `npm run gen:registry`) and a
  hand-curated one (`boSchemaRegistry.ts`). Curated metadata wins; field lists are
  unioned, so a partial curated list can no longer shadow the full derived one.
- Validation is source-aware: strict for curated BOs, passthrough for derived and
  unknown ones.
- Added `move_hierarchy_records` for composite hierarchy moves, capped per call
  because the move is sequential per record.

### Operational

- Configuration is validated once at startup by a Zod schema in `src/config.ts`
  and frozen, replacing scattered `process.env` reads.
- Added per-request `X-Request-Id` correlation, rate limiting on the OAuth proxy
  endpoints, `trust proxy` handling for reverse-proxied deployments, conservative
  security headers, and a narrowable CORS origin list.
- `uncaughtException` and `unhandledRejection` now exit the process so a
  supervisor (pm2, systemd) restarts it cleanly rather than leaving it wedged.
