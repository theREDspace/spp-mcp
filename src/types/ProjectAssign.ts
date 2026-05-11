import type { DateContainer } from "./Timesheet.js";

export interface Projectassign {
  allocation: number;
  created: DateContainer;
  customer_id: string;
  deleted: number;
  id: string;
  job_code_id: string;
  project_groupid?: string;
  project_id: string;
  updated: DateContainer;
  user_id: string;
}

export interface ProjectassignWrapper {
  Projectassign: Projectassign;
  status: string;
}