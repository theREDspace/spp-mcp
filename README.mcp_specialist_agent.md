# MCP Architect Tool Specialist

## Overview
This agent implements a robust Model Context Protocol (MCP) Tool Server for OpenCode, Claude Desktop, or compatible LLM orchestrators. It provides secure, schema-driven, idempotent tools via stdio or SSE using the official MCP SDKs for TypeScript/Node.js and Python (uv).

## Features
- Strict JSON Schema validation for all tool inputs/outputs
- snake_case enforced for all tool names and parameters
- Stateless, idempotent tool handlers (no global/session state)
- Rich structured error responses, including error codes & auth fallbacks
- Environment variable validation for secrets/API tokens
- Supports stdio (local) and SSE (remote/web) transport layers

## Environment Configuration (`mcpConfig`)
Required variables:
- `SPP_URL`: Redspace SPP API base URL
- `SPP_CLIENT_ID`: OAuth2 client ID
- `SPP_CLIENT_SECRET`: OAuth2 client secret
- `SPP_CALLBACK_URL`: OAuth2 callback URL (must be publicly reachable)

Create a `.env` file or inject these as environment variables before launch. The server will fail fast if any are missing.

## Quick Start

### TypeScript/Node.js Example
```ts
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

const listProjects = {
  name: 'list_projects',
  description: 'List all projects in Redspace SPP.',
  inputSchema: z.object({
    filter: z.record(z.any()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  async handler(args, ctx) {
    // Implement your logic, must be idempotent and stateless
    // Return { content: [{ type: 'text', text: ... }] }
  },
};

const mcpServer = new McpServer({
  name: 'spp-mcp',
  version: '2.0.0',
});
mcpServer.registerTool(listProjects.name, {
  title: listProjects.name,
  description: listProjects.description,
  inputSchema: listProjects.inputSchema,
}, listProjects.handler);

// Choose transport (stdio/SSE)
// For stateless HTTP POST/SSE:
// import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
// const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
// await mcpServer.connect(transport);
```

### Python (uv) Example
```python
from mcp_sdk_uv.server import MCPServer
from pydantic import BaseModel

class ListProjectsInput(BaseModel):
    filter: dict = None
    limit: int = None
    offset: int = None

def list_projects_handler(input, ctx):
    # Implement as stateless, idempotent function
    # Return: {'content': [{'type': 'text', 'text': ...}] }
    ...

server = MCPServer(name='spp-mcp', version='2.0.0')
server.register_tool(
    'list_projects',
    input_schema=ListProjectsInput,
    handler=list_projects_handler,
    description="List all projects in Redspace SPP."
)
server.run_stdio()
```

## Tool Discovery
Agents and clients auto-discover tools via the MCP handshake. Ensure all tools are registered before accepting connections.

## Error Handling
- Use descriptive codes (e.g., `ERR_AUTH_REQUIRED`) and human-actionable messages
- Errors with `auth_url` prompt clients to complete authentication
- Avoid generic 'Unknown error'—always include as much context as possible

## Security Guidance
- **Never** log or transmit secrets in error messages
- Tools have least-privilege by default; audit permissions regularly
- Enforce CORS and authentication for SSE/HTTP transports

## Example Manifest
See `mcp_architect_tool_specialist.manifest.json` for a sample tool/config registry

## Integration
For OpenCode or Claude Desktop, supply the `.manifest.json` config and ensure all transports comply with the MCP handshake/POST/SSE patterns. For issues or edge use-cases, reference the official MCP SDK documentation or contact the spec maintainers.
