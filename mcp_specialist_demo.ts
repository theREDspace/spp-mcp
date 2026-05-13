import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

// Tool definition example
const listProjects = {
  name: 'list_projects',
  description: 'List all projects in Redspace SPP.',
  inputSchema: z.object({
    filter: z.record(z.any()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  async handler(args, ctx) {
    // TODO: Implement stateless, idempotent logic
    // Return { content: [{ type: 'text', text: ... }] }
    return { content: [{ type: 'text', text: 'Sample project list (implement real logic)' }] };
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

// Choose stateless transport (HTTP POST/SSE)
// import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
// const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
// await mcpServer.connect(transport);
