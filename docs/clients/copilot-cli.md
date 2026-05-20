# Copilot CLI

Copilot CLI can use the same MCP server once it has a reachable `/mcp` endpoint.

## Before You Start

- Run the server locally
- Expose it with ngrok
- Use the ngrok URL in `APP_BASE_URL` and `SPP_CALLBACK_URL`

## Connection Shape

Use the remote MCP endpoint:

```text
https://your-ngrok-domain/mcp
```

If your Copilot CLI setup only accepts a local executable, route the connection through an MCP bridge and target the same remote URL.

If your version supports remote MCP config, use the same URL and OAuth settings as OpenCode.

## Notes

- Keep OAuth enabled
- Verify the server in MCP Inspector first
- If Copilot cannot finish the auth flow, the callback URL is usually the culprit
