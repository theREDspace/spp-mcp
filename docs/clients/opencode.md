# OpenCode

OpenCode can connect to the same remote MCP endpoint used by the other clients.

## Before You Start

- Start this server locally
- Run ngrok so the server has a public HTTPS URL
- Confirm the SPP app callback points to `/callback/spp`

## Connection Shape

Use the public MCP URL:

```text
https://your-ngrok-domain/mcp
```

Example `opencode` config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "redspace-spp": {
      "type": "remote",
      "url": "https://your-ngrok-domain/mcp",
      "oauth": {
        "clientId": "some-id",
        "clientSecret": "some-secret"
      },
      "enabled": true,
      "headers": {
        "ngrok-skip-browser-warning": "true"
      }
    }
  }
}
```

Depending on your OpenCode version, you can either:

- add the remote URL directly
- or launch it through an MCP bridge such as `mcp-remote`

## Notes

- OAuth is required for the tool calls
- `REGISTRATION_SECRET` is recommended when the server is not private
- If a tool is missing, check the MCP endpoint first in Inspector before blaming the client
- If auth gets flaky, reset the stored credentials and sign in again:

```bash
opencode mcp logout redspace-spp
opencode mcp auth redspace-spp
```

OpenCode also supports `opencode mcp list` and `opencode mcp debug redspace-spp` if you want to inspect the auth state or troubleshoot the flow.
