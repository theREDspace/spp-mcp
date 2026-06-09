// userProjection.ts
// Safe User field projection for public-facing tool responses
// Explicitly excludes sensitive fields: password, ssn, payroll_code, rate, cost, etc.

import type { User } from '../../types/User';

export interface PublicUserProfile {
  id: string | null;
  name: string | null;
  email: string | null;
  nickname: string | null;
  active: number | null;
  department_id: string | null;
  role_id: string | null;
  code: string | null;
  manager_id: string | null;
}

/**
 * Projects a raw User object to a safe, public-facing profile.
 * Only includes fields that are appropriate for general display:
 * - Identity: id, name, email, nickname, code
 * - Status: active
 * - Organizational: department_id, role_id, manager_id
 * 
 * Explicitly excludes:
 * - Authentication: password, hint, mfa_status, locked
 * - Financial: rate, cost, payroll_code, acct_code
 * - Sensitive PII: ssn
 * - Internal system fields: timestamps, filter sets, approval processes
 */
export function projectPublicUser(user: User | null | undefined): PublicUserProfile | null {
  if (!user) return null;

  const toStr = (v: any) => (v === null || v === undefined || v === '' ? null : String(v));
  const toNum = (v: any) => (v === null || v === undefined ? null : Number(v));

  return {
    id: toStr(user.id),
    name: user.name || `${user.addr?.first || ''} ${user.addr?.last || ''}`.trim() || null,
    email: user.addr?.email || null,
    nickname: user.nickname || null,
    active: toNum(user.active),
    department_id: toStr(user.departmentid),
    role_id: toStr(user.role_id),
    code: toStr(user.code),
    manager_id: toStr(user.line_managerid),
  };
}
