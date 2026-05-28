# Redspace SPP MCP Server

An HTTP MCP server for SuiteProjects Pro. It wraps the OAuth dance, proxies auth calls back to SPP, and exposes the tools that agents actually need.

## 🚧 Experimental: Generic BO CRUD Tools Branch

**You are on the `feature/generic-bo-tools` branch.**
This branch introduces a new generic business-object (BO) CRUD pattern for all SuiteProjects BOs, with full type-driven registry, dynamic MCP discovery, and agent-ready parameter validation for all core objects (Project, User, etc).

- Use `list_object_types` and `describe_object_type` for discovery/schema introspection.
- Try the `generic_read`, `generic_list`, `generic_add`, etc tools for LLM/agent-facing CRUD in any BO.
- See `src/services/boSchemaRegistry.ts` for the registry structure and field mappings.

Full migration details, changelog, and comparison to mainline approach are being documented. See branch summary for more!

---

If you only read one thing, read this: the server wants a public callback URL, a valid SPP OAuth app, and a client that can speak MCP over HTTP.

## What It Does

- Exposes `/mcp` as the MCP endpoint
- Proxies SPP OAuth discovery and token exchange
- Supports project, user, booking, time entry, timesheet, and now **generic business object CRUD tools**
- Provides an optional guarded `/oauth/register` endpoint for MCP clients that need dynamic registration

See the full question map in [questions.md](./questions.md).

... (rest of README unchanged) ...
