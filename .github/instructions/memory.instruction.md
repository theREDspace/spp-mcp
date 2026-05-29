---
applyTo: '**'
---

# Project memory for SPP-MCP

- The app has two running instances:
  
  **Local/dev (via ngrok):**
  - Ngrok public URL: `https://drearily-anime-wrench.ngrok-free.dev` → forwards to `http://localhost:3030`
  - User account for ngrok: reginaldo.santos@redspace.com (Plan: Free)
  - Web interface available at `http://127.0.0.1:4040`
  - Use this ngrok URL to give agents and users access to local API endpoints from external/internet environments.
  - When documenting or sharing links for agent/client use in dev, always use the ngrok forwarding address.
  - API base for external agents/users: `https://drearily-anime-wrench.ngrok-free.dev`

  **Production:**
  - [MCP] Endpoint:              `http://100.53.3.98:3030/mcp`
  - [AUTH] Protected resource:   `http://100.53.3.98:3030/.well-known/oauth-protected-resource`
  - [AUTH] Auth server metadata: `http://100.53.3.98:3030/.well-known/oauth-authorization-server`
  - [AUTH] Authorize proxy:      `http://100.53.3.98:3030/oauth/authorize`
  - [AUTH] Token proxy:          `http://100.53.3.98:3030/oauth/token`
  - [AUTH] SPP callback relay:   `http://100.53.3.98:3030/callback/spp`

- Reference the correct endpoint (ngrok for dev, 100.53.3.98 for prod) based on environment.
