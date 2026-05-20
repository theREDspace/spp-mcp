# Redspace SPP MCP Server

An HTTP MCP server for SuiteProjects Pro. It wraps the OAuth dance, proxies auth calls back to SPP, and exposes the tools that agents actually need.

If you only read one thing, read this: the server wants a public callback URL, a valid SPP OAuth app, and a client that can speak MCP over HTTP.

## What It Does

- Exposes `/mcp` as the MCP endpoint
- Proxies SPP OAuth discovery and token exchange
- Supports project, user, booking, time entry, and timesheet tools
- Provides an optional guarded `/oauth/register` endpoint for MCP clients that need dynamic registration

See the full question map in [questions.md](./questions.md).

## Prerequisites

- Node.js 20+ recommended
- Access to a SuiteProjects Pro environment
- An ngrok account or another public tunnel provider
- A SuiteProjects Pro API Integration app

## Install

```bash
npm install
```

Copy the sample env file and fill in the blanks:

```bash
cp .env.sample .env
```

At minimum, set:

```env
SPP_URL=https://your-spp-instance
SPP_CLIENT_ID=...
SPP_CLIENT_SECRET=...
SPP_CALLBACK_URL=https://your-ngrok-domain/callback/spp
APP_BASE_URL=https://your-ngrok-domain
```

Optional, but recommended if you expose the server publicly:

```env
REGISTRATION_SECRET=some-long-random-string
```

If you use `SPPClient` directly, also make sure `SPP_NAMESPACE` and `SPP_KEY` are set wherever your runtime loads env vars.

## Create The SPP App

1. Create a new API Integration app in SuiteProjects Pro.
2. Register the callback URL shown in your `.env` file, for example `https://your-ngrok-domain/callback/spp`.
3. Copy the app's client ID and client secret into `.env`.
4. Keep the app on the same SPP environment you point `SPP_URL` at.

This repo strips PKCE for SPP because the integration app flow does not support it.

## Run Locally

```bash
npm run dev
```

The server listens on port `3030` by default.

For a production-style run:

```bash
npm run build
npm start
```

## Use Ngrok

MCP clients need a URL they can reach from the outside world. ngrok is the easiest way to give the server one.

```bash
ngrok http 3030
```

Then update `.env` with the generated HTTPS URL:

```env
APP_BASE_URL=https://xxxx.ngrok-free.dev
SPP_CALLBACK_URL=https://xxxx.ngrok-free.dev/callback/spp
```

Restart the server after changing env vars.

## Test With MCP Inspector

Before wiring a real client, test the server with MCP Inspector.

```bash
npx @modelcontextprotocol/inspector
```

Point Inspector at:

- Server URL: `https://xxxx.ngrok-free.dev/mcp`
- Auth: OAuth

If login fails, check these first:

- `APP_BASE_URL` matches the public URL
- `SPP_CALLBACK_URL` is registered in SPP exactly as written
- the ngrok tunnel is still alive

## Client Setup

Use the guides below for client-specific setup:

- [Claude Desktop](./docs/clients/claude-desktop.md)
- [OpenCode](./docs/clients/opencode.md)
- [Copilot CLI](./docs/clients/copilot-cli.md)

If your client can only launch local stdio servers, use an MCP bridge like `mcp-remote` against the public `/mcp` URL.

The client docs include copy-paste config examples for each setup.

## Troubleshooting

- `401` on `/mcp`: your client is not sending a valid bearer token
- OAuth loops: the callback URL in SPP and `.env` do not match
- Empty or broken XML responses: check `SPP_NAMESPACE` and `SPP_KEY`
- Registration errors: set `REGISTRATION_SECRET` when exposing `/oauth/register` publicly

## Useful Endpoints

- `GET /health`
- `GET /.well-known/oauth-protected-resource`
- `GET /.well-known/oauth-authorization-server`
- `GET /oauth/authorize`
- `POST /oauth/token`
- `GET /callback/spp`
- `POST /oauth/register`

## Development Notes

- MCP tools live in `src/mcp/tools/`
- OAuth proxy routes live in `src/routes/`
- SPP API access goes through `src/clients/SPPClient.ts`
