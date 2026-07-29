import { Router, Request, Response } from 'express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer } from '@modelcontextprotocol/server';
import { mcpTools } from './tools/index';
import SPPClient from '../clients/SPPClient';
import { SERVER_NAME, SERVER_VERSION } from './identity';
import { wrapTool } from './helpers/toolResult';
import { registerBoResources } from './resources';
import { Logger } from '../utils/Logger';

/**
 * Builds a fresh, fully-registered McpServer for a single request.
 *
 * The Bearer token extracted by bearerAuthMiddleware is injected into every
 * tool's context as `ctx.sppClient`. Tools use it to construct an authenticated
 * SPPClient — the server never holds credentials itself.
 *
 * Shared by both the legacy and modern transport legs so tools, resources,
 * and (once added) capabilities/annotations can never drift between eras.
 */
export function buildServer(token: string): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  const sppClient = new SPPClient({ accessToken: token });

  // Register BO catalog + schemas + semantic patterns as MCP resources so
  // capable clients can pre-fetch and cache them without spending tool calls.
  registerBoResources(server);

  for (const rawTool of mcpTools) {
    const tool = wrapTool(rawTool);
    const config: Record<string, unknown> = {
      title: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as any,
    };
    if (tool.outputSchema) config.outputSchema = tool.outputSchema as any;

    server.registerTool(
      tool.name,
      config as any,
      (async (input: any, context: any) => {
        Logger.log('MCP', `Tool=${tool.name} invoked`);
        const ctxWithToken = { ...(context as object), token, sppClient };
        return await tool.handler(input, ctxWithToken);
      }) as any
    );
  }

  return server;
}

async function handleWithFreshServer(req: Request, res: Response, body?: unknown) {
  const transport = new NodeStreamableHTTPServerTransport({ enableJsonResponse: true });
  const server = buildServer(req.bearerToken as string);
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
      Logger.error('MCP', 'POST error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  // DELETE /mcp — client signals end of session (no-op in stateless mode)
  router.delete('/', (_req: Request, res: Response) => {
    res.status(200).end();
  });

  // Note: GET /mcp (SSE stream) is intentionally not implemented. We use the
  // stateless JSON response mode (enableJsonResponse: true), so server-initiated
  // notifications via SSE are not supported and clients should not open one.

  return router;
}
