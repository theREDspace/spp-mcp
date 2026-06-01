# Redspace SPP MCP Server

An HTTP MCP (Model Context Protocol) server for NetSuite SuiteProjects Pro. It wraps NetSuite's OAuth dance, exposes both SPP and generic business object (BO) CRUD operations, and provides agent tools for seamless integration and workflow automation.

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/theREDspace/spp-mcp.git
cd spp-mcp
npm install
```

### 2. Configure the Environment
All credentials are configured via the `.env` file. Copy `.env.sample` and fill out the required values:

```bash
cp .env.sample .env
```

Edit `.env` and set:
- **SPP_URL**: Your SuiteProjects Pro environment URL
- **SPP_CLIENT_ID / SPP_CLIENT_SECRET**: OAuth2 credentials from SPP
- **SPP_CALLBACK_URL**: Public OAuth2 callback (must be reachable by SPP)
- **SPP_FORWARD_CALLBACK_URL**: Local endpoint to relay OAuth callbacks (for local dev)
- **SPP_NAMESPACE, SPP_KEY**: SPP API namespace and key (XML API)
- **APP_BASE_URL**: Public URL for this MCP server
- **MUTEX_ID_ENABLED**, **REGISTRATION_SECRET**: Optional advanced features (see `.env.sample` for guidance)

### 3. Build & Run
- **Development:** (hot reload, best for local work)
    ```bash
    npm run dev
    ```
- **Production:**
    ```bash
    npm run build
    npm start
    ```
- MCP endpoint will be available at: `http://localhost:3030/mcp` (or as set in your config)

### 4. Healthcheck
Check that the app is running:
```bash
curl http://localhost:3030/health
```

---

## ☁️ Production Deployment & Endpoints
The server is deployed and accessible at the following production endpoints:

| Service                  | URL                                                         |
|--------------------------|-------------------------------------------------------------|
| MCP Endpoint             | http://100.53.3.98:3030/mcp                                 |
| Health Check             | http://100.53.3.98:3030/health                              |
| OAuth2 Protected Resource| http://100.53.3.98:3030/.well-known/oauth-protected-resource|
| OAuth Server Metadata    | http://100.53.3.98:3030/.well-known/oauth-authorization-server|
| Authorize Proxy          | http://100.53.3.98:3030/oauth/authorize                     |
| Token Proxy              | http://100.53.3.98:3030/oauth/token                         |
| SPP Callback Relay       | http://100.53.3.98:3030/callback/spp                        |

- Update your `.env` accordingly if using in a deployed/production environment.
- For development/testing: See above run instructions; endpoints use `localhost` by default.

---

## 💡 What Can I Ask This App?
A full guide to answerable questions can be found in [`questions.md`](./questions.md):
- Project search and discovery
- People, assignments, and user profiles
- Time tracking and timesheets
- Resource bookings and utilization
- Project tasks and milestones
- Multi-tool and composite questions

> **Example questions:**
> - "Find the project called Acme Redesign"
> - "What did I log this week?"
> - "Show my rejected timesheets from Q1 2026"
> - "Who is assigned to project X?"

Read the [full question map](./questions.md) for more.

---

## 🔑 Credentials & Security
- Never commit secrets — keep `.env` out of version control.
- SPP keys should be secured and rotated as needed.
- `SPP_CLIENT_ID`/`SECRET` are used for OAuth2 flows vis-à-vis NetSuite SPP.
- Set `REGISTRATION_SECRET` to restrict `/oauth/register` endpoint (recommended for non-private deployments).

---

## 🛠️ Key Endpoints
- `/mcp`           — Main MCP agent endpoint (all agent/BO actions)
- `/health`        — Health check
- `/oauth/*`       — OAuth2 proxy endpoints
- [Full endpoint details in code, see `src/index.ts`]
- See actual URLs above for current production server endpoints.

---

## 👩‍💻 Client Tools & Agent Context
For writing agent-facing tools and understanding user context resolution (how questions map to the right user), see [`docs/agentUserContext.md`](./docs/agentUserContext.md).

---

## 🧑‍💻 Generic BO Tools (Feature Branch)
This branch supports **dynamic business object CRUD** for all SPP objects (Project, User, Task, etc) through the generic MCP APIs:
- Use `list_object_types` and `describe_object_type` for discovery
- Try tools like `generic_read`, `generic_list`, `generic_add`, etc.

See [`src/services/boSchemaRegistry.ts`] in source for details.

---

## 📄 Further Docs
- [`questions.md`](./questions.md) — Map of answerable questions
- [`docs/agentUserContext.md`](./docs/agentUserContext.md) — Agent/user mapping for tool authors
- (`.env.sample`) — All config variables annotated
- [Issues](https://github.com/theREDspace/spp-mcp/issues) — Project issues/feature requests

---

For questions, see [`questions.md`](./questions.md). For help authoring agent tools, see [`docs/agentUserContext.md`](./docs/agentUserContext.md).

---
