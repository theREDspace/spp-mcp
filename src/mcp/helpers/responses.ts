import { isAuthError } from './auth';
import type { ToolResponse } from '../tools/types';

export function textResponse(text: string): ToolResponse {
  return {
    content: [
      { type: 'text', text }
    ]
  };
}

export function errorResponse(
  err: any,
  label: string,
  extra: string = ''
): ToolResponse {
  if (isAuthError(err)) {
    return textResponse(
      `Authentication error while ${label}. Your token may be expired — please re-authenticate and retry.`
    );
  }
  const errDetail = err?.detail ? ` [code: ${err.detail.code}, detail: ${err.detail.message}]` : '';
  return textResponse(
    `Error ${label}: ${err?.message || 'Unknown error'}${errDetail}${extra}`
  );
}
