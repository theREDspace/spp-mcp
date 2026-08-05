---
applyTo: '**'
---

# SPP-MCP Agent Guidance

Agent guidance for this repository lives in **[`CLAUDE.md`](./CLAUDE.md)**. Read that
file — it covers the project overview, environment setup, every configuration
variable, the protocol-revision posture, the OAuth proxy's hard requirements, and a
troubleshooting table.

This file used to carry its own copy of that material and drifted out of date. It is
now a pointer so the two cannot disagree.

For anything `CLAUDE.md` does not answer:

| Question | Document |
|---|---|
| How does a request flow through the server? Where does state live? | [`docs/architecture.md`](./docs/architecture.md) |
| How do I deploy, restart, or roll back? | [`README.md`](./README.md#deployment) |
| What can a user actually ask this server? | [`questions.md`](./questions.md) |
| How do I resolve user context in a tool? | [`docs/agentUserContext.md`](./docs/agentUserContext.md) |
| How do I connect a specific MCP client? | [`docs/clients/`](./docs/clients/) |
