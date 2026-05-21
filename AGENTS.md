---
applyTo: '**'
---

# SPP-MCP Agent Guidance

This file is for OpenCode-type agents, NOT humans. Maintain/expand only with repo-specific facts that will materially improve future agent actions. Exclude generic Node.js/TypeScript advice.

## Launch & Local Setup
- Clone, `npm install` to set up deps.
- Populate `.env` (see below for keys); copy `.env.sample` as needed.
- Build with `npm run build` (outputs to `dist/`).
- Local dev: `npm run dev` (runs via ts-node-dev).
- Production: `npm start` (runs `node dist/index.js` after build).

## Required Environment Variables
- `.env` keys (**all required for server+SPPClient to function locally or in CI**):
  - `SPP_URL`              — SPP API base URL
  - `SPP_CLIENT_ID`        — OAuth2 client ID (from SPP)
  - `SPP_CLIENT_SECRET`    — OAuth2 client secret (from SPP)
  - `SPP_CALLBACK_URL`     — OAuth2 callback URL (publicly reachable)
  - `SPP_NAMESPACE`        — SPP API namespace (required for XML API)
  - `SPP_KEY`              — SPP API key (required for XML API)

## Entrypoints & Core Modules
- Main entry: `src/index.ts` (Express HTTP server, listen 3030 default; see root-level README for route docs)
- Main API Client: `src/clients/SPPClient.ts` (all SPP API access _must_ use this class; handles OAuth2 and exposes integration methods)
- Express routes: `/health`, `/callback/spp` as direct HTTP endpoints
- Error handling: use `src/clients/errors.ts`
- Other core modules for extension: `src/services/` (BOService, etc), `src/utils/Logger.ts`

## Agent Guidance
- Do NOT access SPP APIs directly; always use SPPClient for OAuth2 and API operations
- Validate env vars before launching or running tests
- For test/fake/mock data: extend or wrap SPPClient (do not hack its internals)
- If refactoring auth flow, ensure Express callback logic stays in sync with SPPClient expectations
- Project is single-package (not a monorepo)

## Anything not covered here is standard for a modern TypeScript/Express/Node repo. Prioritize executable code, not prose.
