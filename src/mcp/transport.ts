import { Router, Request as ExpressRequest, Response } from 'express';
import { NodeStreamableHTTPServerTransport, toNodeHandler, toWebRequest } from '@modelcontextprotocol/node';
import { McpServer, createMcpHandler, isLegacyRequest } from '@modelcontextprotocol/server';
import { mcpTools } from './tools/index';
import SPPClient from '../clients/SPPClient';
import { SERVER_NAME, SERVER_VERSION } from './identity';
import { wrapTool } from './helpers/toolResult';
import { registerBoResources } from './resources';
import { Logger } from '../utils/Logger';
import { load as loadConfig } from '../config';

const SERVER_INSTRUCTIONS =
  'This server exposes the SuiteProjects Pro (SPP) business-object model. ' +
  'Start with the bo://catalog resource for the full list of business objects, and ' +
  'bo://semantic-patterns for curated intent → query-pattern mappings before composing ' +
  'a generic_list/generic_read query by hand. Use bo://schema/{objectType} for the exact ' +
  'field names, types, and required fields of a specific object before calling generic_add ' +
  'or generic_update.';

const CACHE_HINTS = {
  'tools/list': { ttlMs: 3_600_000, cacheScope: 'public' as const },
  'resources/list': { ttlMs: 3_600_000, cacheScope: 'public' as const },
  'resources/templates/list': { ttlMs: 3_600_000, cacheScope: 'public' as const },
  'resources/read': { ttlMs: 3_600_000, cacheScope: 'public' as const },
  'server/discover': { ttlMs: 3_600_000, cacheScope: 'public' as const },
};

/**
 * Builds a fresh, fully-registered McpServer for a single request.
 *
 * The Bearer token extracted by bearerAuthMiddleware is injected into every
 * tool's context as `ctx.sppClient`. Tools use it to construct an authenticated
 * SPPClient — the server never holds credentials itself.
 *
 * Shared by both the legacy and modern transport legs so tools, resources,
 * capabilities, and cache hints can never drift between eras.
 */
export function buildServer(token: string): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {}, resources: {} },
      instructions: SERVER_INSTRUCTIONS,
      cacheHints: CACHE_HINTS,
    }
  );

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
    if (tool.annotations) config.annotations = tool.annotations;

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

/** `request.headers` here is a Web Standard `Headers` object, not Express's
 *  plain object — `.get('authorization')` is required; `.headers.authorization`
 *  would silently and permanently return `undefined`. */
function bearerFromWebRequest(request: Request): string {
  const header = request.headers.get('authorization');
  if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7).trim();
  return '';
}

async function handleLegacy(req: ExpressRequest, res: Response, body?: unknown) {
  const transport = new NodeStreamableHTTPServerTransport({ enableJsonResponse: true });
  const server = buildServer(req.bearerToken as string);
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

export async function initializeMcpTransport() {
  const router = Router();

  const modernHandler = createMcpHandler(
    (ctx) => buildServer(ctx.requestInfo ? bearerFromWebRequest(ctx.requestInfo) : ''),
    {
      legacy: 'reject',
      responseMode: 'json',
      onerror: (err) => Logger.error('MCP', 'modern leg error:', err),
    }
  );
  const modernNodeHandler = toNodeHandler(modernHandler, {
    onerror: (err) => Logger.error('MCP', 'modern leg adapter error:', err),
  });

  router.post('/', async (req: ExpressRequest, res: Response) => {
    try {
      const config = loadConfig();
      if (config.MCP_LEGACY === 'serve') {
        // toWebRequest is async — it may need to read/convert the Node
        // request stream. Passing req.body as parsedBody (already consumed
        // by express.json() upstream) means it does no further stream reads.
        const webReq = await toWebRequest(req, req.body);
        if (await isLegacyRequest(webReq)) {
          Logger.info('MCP', 'serving legacy-era request', {
            method: (req.body as any)?.method,
            clientInfo: (req.body as any)?.params?.clientInfo,
          } as any);
          await handleLegacy(req, res, req.body);
          return;
        }
      }
      await modernNodeHandler(req, res, req.body);
    } catch (err) {
      Logger.error('MCP', 'POST error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  router.delete('/', (_req: ExpressRequest, res: Response) => {
    const config = loadConfig();
    if (config.MCP_LEGACY === 'serve') {
      // Legacy no-op: client signals end of session (stateless mode ignores it).
      res.status(200).end();
      return;
    }
    res.status(405).json({ error: 'method_not_allowed' });
  });

  // GET /mcp is never served in either era: legacy never exposed SSE-over-GET
  // here, and the 2026-07-28 revision removes the GET stream endpoint entirely.
  router.get('/', (_req: ExpressRequest, res: Response) => {
    res.status(405).json({ error: 'method_not_allowed' });
  });

  return router;
}
