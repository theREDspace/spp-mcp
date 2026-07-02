# SPP Token Lifetimes

This document records the OAuth token lifetime configuration and observed behavior for SuiteProjects Pro (SPP) token refresh.

## Investigation Procedure

### Step 1: Fresh OAuth Login & Token Metadata

Perform a fresh OAuth login with the server running and ngrok active:

1. Start the MCP server: `npm run dev`
2. Activate ngrok tunnel: `ngrok http 3030`
3. Connect a new MCP client (MCP Inspector recommended) and complete full OAuth flow
4. Watch server logs for the `[OAUTH-TOKEN] SPP success` line:
   ```
   { grantType: 'authorization_code', hasAccessToken: true, hasRefreshToken: true, expiresIn: <N> }
   ```
5. **Record the `expiresIn` value** — this is the access token lifetime in seconds

### Step 2: Check SPP OAuth App Settings

Navigate to the SuiteProjects Pro admin panel and locate the OAuth app configuration:

1. Find Session timeout / Access token expiry setting
2. Find Refresh token expiry / Sliding window setting
3. Document exact values and any special behaviors

### Step 3: Empirical Refresh Token Test

Wait for the access token to expire (based on `expiresIn` from Step 1), then invoke any MCP tool:

1. After `expiresIn` seconds have elapsed since login, call any MCP tool
2. Watch server logs for: `[OAUTH-TOKEN] forwarding to SPP { grantType: 'refresh_token', ... }`
   - This indicates silent refresh is occurring (Tier 1 working)
3. The tool should succeed **without requiring user re-authentication**
4. Record the timestamp and tool used

If silent refresh fires and tool succeeds: **Tier 1 is working.**

---

## Access Token

- **Lifetime:** [fill in from expiresIn, e.g., 3600 seconds / 1 hour]
- **Scope:** [fill in from SPP configuration]
- **Source:** `[OAUTH-TOKEN] SPP success` log + SPP admin panel
- **Date Captured:** [YYYY-MM-DD]

---

## Refresh Token

- **Lifetime:** [fill in from SPP admin panel, e.g., 90 days]
- **Behavior:** [sliding window / absolute expiry / other]
- **Renewal:** [explicit refresh only / automatic on access / other]
- **Source:** SPP OAuth app settings

---

## Observed Behavior

### Silent Refresh (Tier 1)

- **Status:** [confirmed / not confirmed / partially confirmed] on [YYYY-MM-DD]
- **Test Details:** [Date, time, and exact MCP tool used for refresh verification]
- **Log Evidence:** `[OAUTH-TOKEN] forwarding to SPP { grantType: 'refresh_token', ... }`
- **Tool Success:** [Yes / No / Intermittent]

### Browser Re-login (Tier 2)

- **Expected When:** Refresh token expires after [X days/hours of inactivity]
- **Observed After:** [Time period / Not yet tested]
- **User Experience:** User sees browser login prompt once per [period]

---

## User Impact

### Active Users

Users who use the MCP at least once every **[refresh token lifetime]** will:
- Never see a login prompt during MCP tool usage
- Benefit from Tier 1 silent refresh
- Maintain transparent OAuth experience

### Inactive Users

Users inactive longer than the refresh token lifetime will:
- See a browser login prompt on next MCP tool call
- Be redirected to SPP OAuth (Tier 2)
- Resume normal operation after re-authentication

### Recommended Usage Patterns

- Minimum usage frequency to maintain session: [fill in from refresh token lifetime]
- Inactivity threshold before Tier 2 prompt: [fill in from refresh token lifetime]

---

## Notes

- All timestamps in UTC
- OAuth flow tested with: [MCP Inspector / other client]
- SPP Instance: [instance URL]
- Server Version: [npm package version]

