// Shared helpers for tool handlers — uniform success/error envelope, auth-error
// detection, and a `wrapTool` adapter that registers a Tool with consistent
// error semantics on the MCP server.

import type { Tool, ToolResponse } from '../tools/types';
import { SPPAuthError, SPPApiError } from '../../clients/errors';

/** Successful tool result. Returns both stringified text (for older clients) and
 *  the typed `structuredContent` payload (for MCP 2025-06-18 clients). */
export function ok(structured: unknown): ToolResponse {
  const text = typeof structured === 'string' ? structured : JSON.stringify(structured);
  return {
    content: [{ type: 'text', text }],
    structuredContent: structured == null
      ? { value: null }
      : typeof structured === 'object' && !Array.isArray(structured)
        ? (structured as Record<string, unknown>)
        : { value: structured },
    isError: false,
  };
}

/** Failed tool result. `isError: true` lets clients distinguish from a success. */
export function fail(error: unknown, hint?: { suggestion?: string; example?: unknown }): ToolResponse {
  const message = error instanceof Error ? error.message : String(error);
  const payload: Record<string, unknown> = { error: message };
  if (error instanceof SPPAuthError) {
    payload.type = 'AUTH_ERROR';
    payload.hint = 'The SPP access token was rejected. Refresh the OAuth token and retry.';
  } else if (error instanceof SPPApiError) {
    payload.type = 'SPP_API_ERROR';
    payload.code = error.detail.code;
  } else {
    payload.type = 'TOOL_ERROR';
  }
  if (hint?.suggestion) payload.suggestion = hint.suggestion;
  if (hint?.example !== undefined) payload.example = hint.example;
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: true,
  };
}

/** Wrap a tool handler so that:
 *   - Zod validation / registry lookup errors are returned as `isError: true`
 *   - SPP auth errors are surfaced with a clear hint
 *   - Truly unexpected errors are logged and returned as `isError: true` too
 *     (we never let them propagate to JSON-RPC, since the MCP spec asks for
 *     tool-level failures inside the result envelope).
 */
export function wrapTool(tool: Tool): Tool {
  const original = tool.handler;
  return {
    ...tool,
    handler: async (args, ctx) => {
      try {
        const result = await original(args, ctx);
        // If the handler already returned a properly-shaped response, pass through.
        return result;
      } catch (err) {
        if (err instanceof SPPAuthError) {
          console.warn(`[MCP][${tool.name}] auth error:`, err.message);
        } else {
          console.error(`[MCP][${tool.name}] error:`, err);
        }
        return fail(err);
      }
    },
  };
}
