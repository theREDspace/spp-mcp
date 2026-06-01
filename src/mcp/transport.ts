import { Router, Request, Response } from 'express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer } from '@modelcontextprotocol/server';
import { mcpTools } from './tools/index';
import SPPClient from '../clients/SPPClient';
// Provide SPPClient for tool context injection

function getResourceMetadataUrl(): string {
  const serverUrl = (process.env.APP_BASE_URL || 'http://localhost:3030').replace(/\/$/, '');
  return `${serverUrl}/.well-known/oauth-protected-resource`;
}

function buildInvalidTokenChallenge(): string {
  return [
    'Bearer realm="spp-mcp"',
    'error="invalid_token"',
    `resource_metadata="${getResourceMetadataUrl()}"`,
  ].join(', ');
}

/**
 * Creates a fresh, fully-registered McpServer + stateless transport per request.
 *
 * The Bearer token extracted by bearerAuthMiddleware is injected into every
 * tool's context as `ctx.token`. Tools use it to construct an authenticated
 * SPPClient — the server never holds credentials itself.
 */
async function handleWithFreshServer(req: Request, res: Response, body?: unknown) {
  const transport = new NodeStreamableHTTPServerTransport({ enableJsonResponse: true });

  const server = new McpServer({ name: 'spp-mcp', version: '2.0.0' });

  const token = (req as any).bearerToken as string;

  for (const tool of mcpTools) {
    server.registerTool(
      tool.name,
      { title: tool.name, description: tool.description, inputSchema: tool.inputSchema },
       (input, context) => {
         console.log(`[MCP][Tool=${tool.name}] Invoked`);
         // Inject sppClient using the current Bearer token
         const sppClient = new SPPClient({ accessToken: token });
         const ctxWithToken = { ...context, token, sppClient };
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
    // --- Intercept response ---
    const chunks: Buffer[] = [];
    const origWrite = res.write;
    const origEnd = res.end;
    const origWriteHead = res.writeHead;
    let sent = false;
    let interceptedStatusCode: number | undefined;
    let interceptedStatusMessage: string | undefined;
    let interceptedHeaders: Record<string, string | string[] | number> = {};
    function bufferify(chunk: any): Buffer {
      return Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    }

    (res as any).writeHead = function(statusCode: number, statusMessageOrHeaders?: any, headers?: any) {
      interceptedStatusCode = statusCode;
      interceptedStatusMessage = typeof statusMessageOrHeaders === 'string' ? statusMessageOrHeaders : undefined;

      const headerSource = typeof statusMessageOrHeaders === 'string' ? headers : statusMessageOrHeaders;
      if (headerSource && typeof headerSource === 'object') {
        interceptedHeaders = {
          ...interceptedHeaders,
          ...headerSource,
        };
      }

      return res;
    };
    
    (res as any).write = function(chunk: any, ...args: any[]) {
      if (chunk) chunks.push(bufferify(chunk));
      return true; // Don't write yet
    };
    (res as any).end = function(chunk: any, ...args: any[]) {
      if (chunk) chunks.push(bufferify(chunk));
      if (sent) return;
      sent = true;
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        let isAuthError = false;
        let authErrorFields: any = undefined;
        const tryRecordAuthError = (obj: any) => {
          if (obj?.type === 'AUTH_ERROR') {
            isAuthError = true;
            authErrorFields = obj;
          }
        };
        const safeParse = (str: string) => { try { return JSON.parse(str); } catch { return undefined; } };
        const json = safeParse(bodyStr);
        // Check root-level { type: 'AUTH_ERROR' }
        tryRecordAuthError(json);
        // Check both raw content arrays and MCP JSON-RPC result.content arrays.
        const contentEntries = Array.isArray(json?.content)
          ? json.content
          : Array.isArray(json?.result?.content)
            ? json.result.content
            : [];
        for (const entry of contentEntries) {
          // Check for stringified JSON in text field
          if (typeof entry?.text === 'string') {
            const inner = safeParse(entry.text);
            tryRecordAuthError(inner);
            // If not parseable, also string-scan
            if (!inner && entry.text.includes('"type": "AUTH_ERROR"')) {
              isAuthError = true;
              authErrorFields = undefined;
            }
          }
        }
        if (isAuthError) {
          console.log('[MCP][AUTH] Returning invalid_token challenge to client');
          interceptedStatusCode = 401;
          interceptedHeaders = {
            ...interceptedHeaders,
            'WWW-Authenticate': buildInvalidTokenChallenge(),
          };
        }

        if (interceptedStatusCode) {
          if (interceptedStatusMessage) {
            (origWriteHead as Function).call(res, interceptedStatusCode, interceptedStatusMessage, interceptedHeaders);
          } else {
            (origWriteHead as Function).call(res, interceptedStatusCode, interceptedHeaders);
          }
        }

        if (isAuthError) {
          (origWrite as Function).call(res, Buffer.concat(chunks));
        } else {
          (origWrite as Function).call(res, Buffer.concat(chunks));
        }
        (res as any).write = origWrite;
        (res as any).end = origEnd;
        (res as any).writeHead = origWriteHead;
        (origEnd as Function).call(res);
      } catch (err) {
        (res as any).write = origWrite;
        (res as any).end = origEnd;
        (res as any).writeHead = origWriteHead;
        throw err;
      }
    };
    try {
      await handleWithFreshServer(req, res, req.body);
    } catch (err) {
      console.error('[MCP] POST error:', err);
      if (!sent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
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
