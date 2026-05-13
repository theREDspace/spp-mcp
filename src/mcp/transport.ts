import { Router, Request, Response } from 'express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer } from '@modelcontextprotocol/server';
import { mcpTools } from './tools';

/**
 * Creates a fresh, fully-registered McpServer + stateless transport per request.
 *
 * WHY STATELESS:
 * The stateful transport (sessionIdGenerator: () => uuid) requires every
 * non-initialize request to carry an `mcp-session-id` header. Clients that
 * don't echo that header (or proxies like ngrok that strip it) will get
 * "Bad Request: Server not initialized" on every tool call.
 *
 * In stateless mode (sessionIdGenerator: undefined) the SDK's validateSession()
 * returns immediately with no checks, so tool calls work without a prior
 * initialize handshake — each POST is a self-contained exchange.
 */
async function handleWithFreshServer(req: Request, res: Response, body?: unknown) {
  const transport = new NodeStreamableHTTPServerTransport({});

  const server = new McpServer({ name: 'spp-mcp', version: '2.0.0' });

  const email = (req as any).email || req.header('email') || 'UNKNOWN_EMAIL';
  for (const tool of mcpTools) {
    server.registerTool(
      tool.name,
      { title: tool.name, description: tool.description, inputSchema: tool.inputSchema },
      // Wrap handler to inject email and log usage
      (input, context) => {
        console.log(`[MCP][Tool=${tool.name}] Invoked by email=${email}`);
        const ctxWithEmail = { ...context, email };
        return tool.handler(input, ctxWithEmail);
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
