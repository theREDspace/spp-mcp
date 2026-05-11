

// newTypes/ProjectTaskAssign.ts
import type { DateContainer } from "./Timesheet.js";

/**
 * User assignment to a ProjectTask. citeturn14file9
 */
export interface ProjectTaskAssign {
  id: string;
  projecttaskid: string;                // Task ID (required)
  userid: string;                       // Assigned user ID (required)
  allocation?: number;                  // % allocation
  pending_booking_id?: number;
  booking_id: string;
  job_codeid: string;
  project_assignment_profile_id: string;
  project_groupid: string;
  planned_hours?: number;
  rule_rate_override?: number;
  rule_rate_override_currency?: string;
  externalid: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface ProjectTaskAssignWrapper {
  ProjectTaskAssign: ProjectTaskAssign;
  status: string;
}
