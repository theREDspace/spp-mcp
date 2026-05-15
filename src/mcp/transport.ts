import { Router, Request, Response } from 'express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer } from '@modelcontextprotocol/server';
import { mcpTools } from './tools';

/**
 * Creates a fresh, fully-registered McpServer + stateless transport per request.
 *
 * The Bearer token extracted by bearerAuthMiddleware is injected into every
 * tool's context as `ctx.token`. Tools use it to construct an authenticated
 * SPPClient — the server never holds credentials itself.
 */
async function handleWithFreshServer(req: Request, res: Response, body?: unknown) {
  const transport = new NodeStreamableHTTPServerTransport({});

  const server = new McpServer({ name: 'spp-mcp', version: '2.0.0' });

  const token = (req as any).bearerToken as string;

  for (const tool of mcpTools) {
    server.registerTool(
      tool.name,
      { title: tool.name, description: tool.description, inputSchema: tool.inputSchema },
      (input, context) => {
        console.log(`[MCP][Tool=${tool.name}] Invoked`);
        const ctxWithToken = { ...context, token };
        return tool.handler(input, ctxWithToken);
      }
    );
  }

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

export async function initializeMcpTransport() {
  const router = Router();

  // POST /mcp — client sends JSON-RPC requests (initialize, tool calls, etc.)
  router.post('/', async (req: Request, res: Response) => {
    try {
      await handleWithFreshServer(req, res, req.body);
    } catch (err) {
      console.error('[MCP] POST error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // GET /mcp — client opens SSE stream (server-initiated notifications)
  router.get('/', async (req: Request, res: Response) => {
    try {
      await handleWithFreshServer(req, res);
    } catch (err) {
      console.error('[MCP] GET error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // DELETE /mcp — client signals end of session (no-op in stateless mode)
  router.delete('/', (_req: Request, res: Response) => {
    res.status(200).end();
  });

  return router;
}
