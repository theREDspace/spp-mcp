// Shared helpers for tool handlers — uniform success/error envelope, auth-error
// detection, and a `wrapTool` adapter that registers a Tool with consistent
// error semantics on the MCP server.

import type { Tool, ToolResponse } from '../tools/types';
import { SPPAuthError, SPPApiError, SPPResponseError, SPPBusinessError } from '../../clients/errors';
import { SPPStatus } from '../../utils/errorCodes';

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

/**
 * Categorize an SPP error code into a user-friendly classification with a hint.
 * This lets clients (and the LLM driving them) react sensibly without parsing
 * raw SPP messages.
 */
function classifySppError(code: string): { kind: string; hint: string } | null {
  switch (code) {
    // "Not found"-ish codes
    case String(SPPStatus.UnknownError):       // "1" — SPP commonly returns this for not-found
    case String(SPPStatus.NotFound):            // "601"
    case String(SPPStatus.LookupNotLocated):    // "910"
      return {
        kind: 'NOT_FOUND',
        hint: 'The record does not exist, or the current user does not have permission to view it. Verify the ID/filter, or try a different query.',
      };
    // Auth-ish codes (most caught earlier by SPPAuthError, but include for safety)
    case String(SPPStatus.AuthInvalid):
    case String(SPPStatus.LoggedOut):
    case String(SPPStatus.AuthFailed):
    case String(SPPStatus.AuthFailedRetry):
    case String(SPPStatus.InvalidUidSession):
      return {
        kind: 'AUTH_ERROR',
        hint: 'The SPP access token was rejected. Refresh the OAuth token and retry.',
      };
    // Permission / privilege
    case String(SPPStatus.Privilege):
    case String(SPPStatus.NoServerStatusPerm):
    case String(SPPStatus.ModifyPermis):
    case String(SPPStatus.TaskNoPermissionToEditTimeData):
    case String(SPPStatus.AccessToExpensesModuleDenied):
      return {
        kind: 'PERMISSION_DENIED',
        hint: 'The current user does not have permission for this operation. Contact your SPP administrator if you believe this is an error.',
      };
    // Rate limit / capacity
    case String(SPPStatus.RateLimit):
    case String(SPPStatus.LargeBatch):
      return {
        kind: 'RATE_LIMITED',
        hint: 'Too many requests or too large a batch. Wait briefly and retry with smaller batches.',
      };
    // Input validation
    case String(SPPStatus.InvalidParameters):
    case String(SPPStatus.InvalidField):
    case String(SPPStatus.InvalidType):
    case String(SPPStatus.InvalidArgumentPassed):
    case String(SPPStatus.InvalidFormatPassed):
    case String(SPPStatus.TooManyArgs):
    case String(SPPStatus.TooFewArgs):
      return {
        kind: 'INVALID_INPUT',
        hint: 'The request contained an invalid field, type, or argument. Check the bo://schema/{objectType} resource for the correct field names and types.',
      };
    default:
      return null;
  }
}

/** Failed tool result. `isError: true` lets clients distinguish from a success. */
export function fail(error: unknown, hint?: { suggestion?: string; example?: unknown }): ToolResponse {
  const message = error instanceof Error ? error.message : String(error);
  const payload: Record<string, unknown> = { error: message };

  if (error instanceof SPPAuthError) {
    payload.type = 'AUTH_ERROR';
    payload.hint = 'The SPP access token was rejected. Refresh the OAuth token and retry.';
  } else if (error instanceof SPPApiError) {
    // Classify the SPP error code into a friendlier category so MCP clients
    // can distinguish "not found", "permission denied", "invalid input", etc.
    // without parsing raw SPP messages.
    const code = String(error.detail?.code ?? '');
    const classified = classifySppError(code);
    if (classified) {
      payload.type = classified.kind;
      payload.hint = classified.hint;
    } else {
      payload.type = 'SPP_API_ERROR';
    }
    payload.code = code;
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
        } else if (err instanceof SPPApiError) {
          // Already-classified SPP errors (not-found, permission, etc.) are
          // logged at info-level rather than error-level since they're often
          // expected outcomes (e.g. "user has no manager").
          const code = String(err.detail?.code ?? '');
          const classified = classifySppError(code);
          if (classified) {
            console.log(`[MCP][${tool.name}] ${classified.kind} (SPP code ${code}): ${err.message}`);
          } else {
            console.error(`[MCP][${tool.name}] SPP error:`, err);
          }
        } else {
          console.error(`[MCP][${tool.name}] error:`, err);
        }
        return fail(err);
      }
    },
  };
}
