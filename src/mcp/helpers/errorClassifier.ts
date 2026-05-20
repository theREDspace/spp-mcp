/**
 * Classifies SPP errors into actionable categories so tool responses can
 * include a `type` field and a `suggestion` the user can act on.
 */

export type ErrorType =
  | 'PERMISSION_DENIED'
  | 'QUERY_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'UNKNOWN';

export interface ClassifiedError {
  type: ErrorType;
  suggestion: string;
}

/**
 * Known SPP error message fragments that *strongly* indicate a permission problem.
 *
 * NOTE: We intentionally do NOT include "an unknown error occurred" here.
 * SPP returns that string for many distinct conditions (permission problems,
 * transient server errors, malformed queries, etc.), so matching it would
 * mislead users into contacting their admin for unrelated failures.
 */
const PERMISSION_PATTERNS: RegExp[] = [
  /no permission/i,
  /access.*denied/i,
  /not.*permitted/i,
  /privilege/i,
  /forbidden/i,
  /api access is not permitted/i,
];

const QUERY_PATTERNS: RegExp[] = [
  /invalid limit clause/i,
  /invalid field/i,
  /invalid type/i,
  /too many args/i,
  /too few args/i,
  /invalid parameters/i,
  /invalid filter/i,
];

const AUTH_PATTERNS: RegExp[] = [
  /token.*expired/i,
  /invalid.*token/i,
  /not logged in/i,
  /auth.*failed/i,
  /session.*invalid/i,
];

const RATE_LIMIT_PATTERNS: RegExp[] = [
  /rate limit/i,
  /too many requests/i,
  /large batch/i,
];

/** SPP numeric status codes that definitively indicate a permission problem */
const PERMISSION_CODES = new Set(['413', '424', '423', '2']); // Privilege, ModifyPermis, NoServerStatusPerm, AuthInvalid

/** SPP numeric status codes that definitively indicate a query/parameter problem */
const QUERY_CODES = new Set(['605', '3', '4', '10', '602', '603']); // LimitClause, TooManyArgs, TooFewArgs, InvalidParameters, InvalidField, InvalidType

export function classifyError(err: any, bo?: string): ClassifiedError {
  const code = String(err?.detail?.code ?? err?.code ?? '');
  const message: string = err?.detail?.message ?? err?.message ?? '';

  // Auth errors come in as SPPAuthError instances
  if (err?.name === 'SPPAuthError' || AUTH_PATTERNS.some(p => p.test(message))) {
    return {
      type: 'AUTH_ERROR',
      suggestion: 'Your session may have expired. Re-authenticate and retry.',
    };
  }

  if (RATE_LIMIT_PATTERNS.some(p => p.test(message))) {
    return {
      type: 'RATE_LIMIT',
      suggestion: 'API rate limit hit. Wait a moment and retry.',
    };
  }

  if (QUERY_CODES.has(code) || QUERY_PATTERNS.some(p => p.test(message))) {
    return {
      type: 'QUERY_ERROR',
      suggestion: 'The query parameters were rejected by SPP. Try a smaller limit/offset or simplify filters.',
    };
  }

  if (PERMISSION_CODES.has(code) || PERMISSION_PATTERNS.some(p => p.test(message))) {
    const boHint = bo ? ` (${bo})` : '';
    return {
      type: 'PERMISSION_DENIED',
      suggestion: `Your SPP role may not have read access to this data${boHint}. Contact your SPP administrator to request access.`,
    };
  }

  return {
    type: 'UNKNOWN',
    suggestion: bo
      ? `Retry the operation. SPP returned a generic error, which can indicate either a transient failure or that your role lacks read access to ${bo}. If the problem persists, contact your SPP administrator.`
      : 'Retry the operation. If the problem persists, contact support with the error details below.',
  };
}
