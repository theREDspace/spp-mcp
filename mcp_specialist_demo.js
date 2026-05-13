"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@modelcontextprotocol/server");
const zod_1 = require("zod");
// Tool definition example
const listProjects = {
    name: 'list_projects',
    description: 'List all projects in Redspace SPP.',
    inputSchema: zod_1.z.object({
        filter: zod_1.z.record(zod_1.z.any()).optional(),
        limit: zod_1.z.number().optional(),
        offset: zod_1.z.number().optional(),
    }),
    async handler(args, ctx) {
        // TODO: Implement stateless, idempotent logic
        // Return { content: [{ type: 'text', text: ... }] }
        return { content: [{ type: 'text', text: 'Sample project list (implement real logic)' }] };
    },
};
const mcpServer = new server_1.McpServer({
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
//# sourceMappingURL=mcp_specialist_demo.js.map