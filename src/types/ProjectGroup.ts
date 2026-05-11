import type { DateContainer } from "./Timesheet.js";

/**
 * From the Projectgroup API docs:
 * active, assigned_users, created, id, name, notes, updated
 */
export interface Projectgroup {
  id: string;
  active: number;
  assigned_users: string;
  created: DateContainer;
  name: string;
  notes: string;
  updated: DateContainer;
}

export interface ProjectgroupWrapper {
  Projectgroup: Projectgroup;
  status: string;
}
