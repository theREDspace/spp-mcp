# Agent User Context Helper: Usage & Maintenance

## Purpose

To guarantee robust handling of user context requirements for all agent tools that access user-bound business objects (like Timesheet, TimeEntry, ResourceProfile). Ensures:
- The current user's id is always used for self-queries (submit my timesheet, show my profile).
- The correct user's id is used for cross-user queries (e.g., show Jane Doe's timesheet).
- If user context is not provided, the agent fails gracefully and communicates the requirement upstream.

## Usage Pattern (Agents & Handlers)

**Use the `resolveUserIdIfNeeded` helper before list/add/update/batchList for any object with user binding:**

```ts
const userId = await resolveUserIdIfNeeded({
  objectType, // e.g., 'Timesheet'
  payloadOrFilter: filter or payload,
  sppClient,
  preferSelf, // true if action refers to the current logged-in user
  userName,   // if action is to operate on another, named user
});
// Then: inject userId into correct field in filter/payload before normal API call
```

## How It Works
- Looks up the "user" field per BO schema (defaults to `userid` if present, else `*user*`).
- If userId already provided, uses it.
- If a user name is provided, looks up the User BO and uses their id.
- If `preferSelf`, calls whoami and injects the current user's id.
- Throws an error if no user context can be determined (agent should surface this upstream).

## Applying in New Tools
- Import the helper. Patch tool handler params to accept `preferSelf`, `userName`.
- Call the helper whenever the business object schema includes a user binding.
- Always inject the resolved userId to payload/filter **before** validation/mutation or downstream processing.

See code in `src/mcp/helpers/agentUserContext.ts` for implementation.
