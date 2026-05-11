# SuiteProjects Pro (SPP) API Client Usage

## SPPClient Service

All SPP API access should go through the `SPPClient` service:

```ts
import SPPClient from "./src/clients/SPPClient";

const client = new SPPClient({
  sppUrl: process.env.SPP_URL,
  clientId: process.env.SPP_CLIENT_ID,
  clientSecret: process.env.SPP_CLIENT_SECRET,
  callbackUrl: process.env.SPP_CALLBACK_URL,
  accessToken: "<ACCESS_TOKEN>",
  refreshToken: "<REFRESH_TOKEN>",
  onRefresh: async ({ access_token, refresh_token }) => {
    // persist new tokens
  },
});
```

### Required .env variables
```
SPP_URL=https://redspace-sbx.app.sandbox.netsuitesuiteprojectspro.com
SPP_CLIENT_ID=
SPP_CLIENT_SECRET=
SPP_CALLBACK_URL=https://drearily-anime-wrench.ngrok-free.dev/callback/spp
```

### Features
- Automatic access/refresh token management
- Token refresh on expiry
- All XML/BO API endpoints available
- Full async/await

See `src/clients/SPPClient.ts` for all advanced usage and config options.

---

**Note:** Supporting modules (errors, utils, BOService, etc) MUST exist for SPPClient.
