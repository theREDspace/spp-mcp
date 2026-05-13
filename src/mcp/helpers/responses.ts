import { authRequiredResponse, isAuthError } from './auth';
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
  extra: string = '',
  email?: string
): ToolResponse {
  if (isAuthError(err)) {
    return authRequiredResponse(email ?? '');
  }
  const errDetail = err?.detail ? ` [code: ${err.detail.code}, detail: ${err.detail.message}]` : '';
  return textResponse(
    `Error ${label}: ${err?.message || 'Unknown error'}${errDetail}${extra}`
  );
}
