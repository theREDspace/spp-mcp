import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer } from '@modelcontextprotocol/server';
import { mcpTools } from './tools';

// Session store: maps session ID → transport
const sessions = new Map<string, NodeStreamableHTTPServerTransport>();

async function getOrCreateTransport(sessionId: string | undefined): Promise<{
  transport: NodeStreamableHTTPServerTransport;
  sessionId: string;
  isNew: boolean;
}> {
  if (sessionId && sessions.has(sessionId)) {
    return { transport: sessions.get(sessionId)!, sessionId, isNew: false };
  }

  const newId = randomUUID();
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: () => newId,
  });

  // Create and connect a fresh McpServer for this session
  const server = new McpServer({ name: 'spp-mcp', version: '2.0.0' });
  for (const tool of mcpTools) {
    server.registerTool(
      tool.name,
      { title: tool.name, description: tool.description, inputSchema: tool.inputSchema },
      tool.handler
    );
  }
  await server.connect(transport);

  sessions.set(newId, transport);

  // Cleanup session when transport closes
  transport.onclose = () => {
    sessions.delete(newId);
    console.log(`[MCP] Session closed: ${newId}`);
  };

  console.log(`[MCP] New session: ${newId}`);
  return { transport, sessionId: newId, isNew: true };
}

export async function initializeMcpTransport() {
  const router = Router();

  // POST /mcp — client sends requests here
  router.post('/', async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const { transport } = await getOrCreateTransport(sessionId);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[MCP] POST error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // GET /mcp — client opens SSE stream here
  router.get('/', async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const { transport } = await getOrCreateTransport(sessionId);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error('[MCP] GET error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // DELETE /mcp — client signals end of session
  router.delete('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.close();
      sessions.delete(sessionId);
      console.log(`[MCP] Session deleted: ${sessionId}`);
    }
    res.status(200).end();
  });

  return router;
}
