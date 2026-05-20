# Claude Desktop

Claude Desktop works well with this server when you point it at the public MCP endpoint.

## Before You Start

- Run the server locally
- Expose it with ngrok
- Make sure `APP_BASE_URL` and `SPP_CALLBACK_URL` use the ngrok HTTPS URL

## Recommended Setup

If your Claude setup uses `mcp-remote`, add this server entry:

```json
{
  "mcpServers": {
    "redspace-spp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-ngrok-domain/mcp"
      ]
    }
  }
}
```

If your Claude setup supports remote MCP directly, add the server URL:

```text
https://your-ngrok-domain/mcp
```

If your Claude setup expects a local command instead of a remote URL, use an MCP bridge such as `mcp-remote` and point it at the same `/mcp` endpoint.

## Tips

- Use OAuth, not a static token
- Keep `REGISTRATION_SECRET` enabled if the server is reachable from outside your machine
- If auth gets stuck, compare the callback URL in Claude, ngrok, and SuiteProjects Pro
