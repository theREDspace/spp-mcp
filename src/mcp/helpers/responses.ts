import { isAuthError } from './auth';
import { classifyError } from './errorClassifier';
import type { ToolResponse } from '../tools/types';

export function textResponse(text: string): ToolResponse {
  return {
    content: [
      { type: 'text', text }
    ]
  };
}

export function jsonResponse(data: unknown): ToolResponse {
  return {
    content: [
      { type: 'text', text: JSON.stringify(data, null, 2) }
    ]
  };
}

/**
 * Build a structured error response.
 *
 * @param err   - The caught error object
 * @param label - Human-readable action label (e.g. "listing project tasks")
 * @param bo    - Optional: SPP Business Object name involved (e.g. "ProjectTask").
 *                Included in the response and used to improve error classification.
 * @param extra - Optional: extra text appended to the error message string
 */
export function errorResponse(
  err: any,
  label: string,
  bo?: string,
  extra: string = ''
): ToolResponse {
  if (isAuthError(err)) {
    return jsonResponse({
      error: `Authentication error while ${label}. Your token may be expired — please re-authenticate and retry.`,
      type: 'AUTH_ERROR',
      suggestion: 'Re-authenticate and retry.',
    });
  }

  const detail = err?.detail?.message || err?.message || 'Unknown error';
  const code = err?.detail?.code ?? err?.code;
  const classified = classifyError(err, bo);

  return jsonResponse({
    error: `Error ${label}: ${detail}${extra}`,
    type: classified.type,
    suggestion: classified.suggestion,
    ...(bo !== undefined && { bo }),
    ...(code !== undefined && { code: String(code) }),
  });
}
