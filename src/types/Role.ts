import type { DateContainer } from "./Timesheet.js";

/** Security role definitions for users. */
export interface Role {
  id: string;
  name: string;
  description?: string;
  created: DateContainer;
  updated: DateContainer;
  admin_role: 1 | 0; // 1 for admin, 0 for non-admin
  default_role: 1 | 0; // 1 for default role, 0 for non-default
  deleted: 1 | 0; // 1 for deleted, 0 for not deleted
  notes: string;
  permissions: string; // JSON string of permissions
  
}

export interface RoleWrapper {
  Role: Role;
  status: string;
}