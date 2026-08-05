# Documentation Handover — Design

**Date:** 2026-08-05
**Context:** The primary maintainer is leaving in two weeks. The goal is that someone
new can run, deploy, and extend this server without access to the author.

## Problem

Source-level documentation is good — roughly 154 files carry doc comments, and the
OAuth proxy modules explain their reasoning rather than restating their code. The
problem is the repository's prose layer. Several root-level documents describe a
version of this server that no longer exists, and a newcomer has no way to tell
which documents are current.

Concretely:

| File | Defect |
|---|---|
| `spp_mcp_server.manifest.json` | Advertises `get_signin_url`, `get_auth_instructions`, `list_projects`, `list_bookings`. None of these tools exist. Machine-consumable, so the damage is not limited to human readers. |
| `README.mcp_specialist_agent.md` | Scaffolding artifact. Describes stdio/SSE transports the server does not use, a Python SDK, and a manifest file absent from the repo. |
| `backlog.md` | Proposes per-domain tools (`list_invoices`, `list_customers`, …). Every "Why It Fails" premise is false now that `generic_list`/`generic_read` reach every registered BO. |
| `CHANGELOG.md` | Frozen on the long-merged `feature/generic-bo-tools` branch. Names a tool `generic_batchList`; the real name is `generic_batch_list`. |
| `AGENTS.md` | Claims dev runs on `ts-node-dev` (it is `nodemon` + `ts-node --esm`), lists 6 of 15 environment variables, names 2 of 9 routes. |
| `README.md` | Documents 8 of 15 config variables. Omits `MCP_LEGACY`, `ALLOWED_ORIGIN_HOSTS`, `CIMD_ALLOWED_HOSTS`, `TRUST_PROXY`, `CORS_ORIGINS`, `OAUTH_RATE_LIMIT_PER_MIN`, `CLIENT_REGISTRY_PATH`. Labels the BO tools a "Feature Branch" though they are on `main`. No deployment instructions. |

`docs/clients/*` and `docs/token-lifetimes.md` are accurate but orphaned — nothing
links to them, so a newcomer is unlikely to find them.

Nothing in the repository records the operational knowledge that lives only in the
author's head: how to deploy, what the in-memory OAuth stores mean for a restart,
and which on-disk file must survive a redeploy.

## Approach

Four changes, in order of value to the person inheriting this.

### 1. Prune

Delete `spp_mcp_server.manifest.json`, `README.mcp_specialist_agent.md`, and
`backlog.md`. Git history preserves all three, so nothing is lost that cannot be
recovered. Deletion is preferred over an `docs/archive/` directory, which readers
tend to mistake for current material.

Rewrite `CHANGELOG.md` as a genuine `2.0.0` entry covering the generic BO tools,
the `2026-07-28` protocol migration, and the OAuth 2.1 hardening.

Reduce `AGENTS.md` to a pointer at `CLAUDE.md`. The two files were duplicating
each other's content and had already drifted; a pointer cannot drift.

### 2. Rewrite the README

- Complete environment-variable table, derived from `src/config.ts`, marking
  required versus optional and stating every default.
- The real tool inventory: 11 tools in production, plus `echo` outside production.
- The three MCP resources (`bo://catalog`, `bo://schema/{objectType}`,
  `bo://semantic-patterns`).
- Endpoint table verified line by line against `src/index.ts`.
- A **Deployment** section with the exact production commands.
- Links to `docs/clients/*`, `docs/token-lifetimes.md`, and the new architecture doc.

### 3. Add `docs/architecture.md`

The handover document proper. It covers what the code cannot state about itself:

- Request lifecycle, in the middleware order `src/index.ts` actually applies.
- The dual-era `/mcp` transport, and how to retire the legacy leg via `MCP_LEGACY`.
- The OAuth proxy flow, including that `oauthState` and `codeBindings` are
  in-memory with 10-minute TTLs. A restart mid-flow breaks that client's login.
  This is a deploy-time consequence recorded nowhere else.
- `data/clients.json` (mode `0600`) is the only on-disk state. If a redeploy loses
  it, every registered client must re-register.
- The derived-plus-curated registry merge and when to run `npm run gen:registry`.
- That there is no CI: `.github/` holds only a Copilot memory file, so the 23 test
  files have only ever run on a developer's machine.

### 4. Fill source-level gaps

File-level headers on the modules lacking them: `src/mcp/transport.ts`,
`src/middleware/reauthRewrite.ts`, the six `generic*` tools, and
`src/utils/authChallenge.ts`. Correct the header comment in
`src/utils/DataExtractor.ts`, which claims the file is `src/clients/SPPClient.ts`.

This is deliberately narrow. The existing doc comments are good; a blanket JSDoc
pass would add volume without adding understanding.

## Out of scope

- **`.env.sample`** cannot be edited. A built-in protection blocks all `.env*`
  files, and it is not overridable from project settings. It is the file most
  likely to have drifted from `src/config.ts`, so the required additions are
  handed to the maintainer to apply manually.
- **Adding CI.** A real gap, but it is code and configuration, not documentation.
  The architecture doc names it so it is not lost.
- **Refactoring.** No source behavior changes. The only source edits are comments.

## Success criteria

- No document in the repository names a tool or route that does not exist.
- Every command in the README has been executed and observed to work.
- A newcomer can deploy to production from the README alone.
- `npm test` and `npm run build` pass unchanged.
