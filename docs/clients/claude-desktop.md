# Claude Desktop

## Recommended Setup — Native Remote Connector

Claude Desktop supports remote MCP servers directly. This is the simplest setup and provides the best authentication experience, including automatic token refresh.

1. Make sure the server is running and publicly reachable (e.g. via ngrok).
2. Ensure `APP_BASE_URL` and `SPP_CALLBACK_URL` in `.env` use the public HTTPS URL.
3. In Claude Desktop, go to **Settings → Connectors → Add custom connector**.
4. Enter the server URL: `https://your-domain/mcp`
5. Click **Connect** — a browser tab opens for SPP login. Complete it once.

That's it. Claude Desktop handles token refresh automatically. You will not be prompted to log in again unless your SPP session expires completely.

## Fallback Setup — mcp-remote (older Claude Desktop versions)

If your version of Claude Desktop does not support native remote connectors, use `mcp-remote`:

```json
{
  "mcpServers": {
    "redspace-spp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-domain/mcp"]
    }
  }
}
```

Add this to your `claude_desktop_config.json` and restart Claude Desktop. On first launch, `mcp-remote` opens a browser tab for login.

## Tips

- Keep `REGISTRATION_SECRET` set if the server is reachable from outside your machine.
- If the ngrok URL changes, update `APP_BASE_URL` and `SPP_CALLBACK_URL` in `.env` and restart the server.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Auth prompt never appeared / tools fail silently | You are using the `mcp-remote` config. Clear its token cache: `rm -rf ~/.mcp-auth` then fully quit and reopen Claude Desktop. |
| OAuth loops / callback error | `SPP_CALLBACK_URL` must match the URL registered in the SuiteProjects Pro OAuth app exactly. |
| `401` on every tool call after re-login | Token refresh is working. If it keeps looping, check `docs/token-lifetimes.md` for refresh token expiry. |
| Empty/broken XML responses | `SPP_NAMESPACE` and `SPP_KEY` are not set correctly in `.env`. |
