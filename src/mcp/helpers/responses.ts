import { isAuthError } from './auth';
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

export function errorResponse(
  err: any,
  label: string,
  extra: string = ''
): ToolResponse {
  if (isAuthError(err)) {
    return jsonResponse({
      error: `Authentication error while ${label}. Your token may be expired — please re-authenticate and retry.`
    });
  }
  const detail = err?.detail?.message || err?.message || 'Unknown error';
  const code = err?.detail?.code;
  return jsonResponse({
    error: `Error ${label}: ${detail}${extra}`,
    ...(code !== undefined && { code }),
  });
}
