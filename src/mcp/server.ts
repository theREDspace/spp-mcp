// MCP Server v2 — registers all tools on an McpServer instance
import { McpServer } from '@modelcontextprotocol/server';
import { mcpTools } from './tools';

export async function createMcpServer() {
  const mcpServer = new McpServer({
    name: 'spp-mcp',
    version: '2.0.0',
  });

  for (const tool of mcpTools) {
    mcpServer.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      tool.handler
    );
  }

  return mcpServer;
}
