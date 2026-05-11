
// newTypes/ProjectTaskEstimate.ts
import type { DateContainer } from "./Timesheet.js";

/**
 * Remaining hours estimate for a ProjectTask. citeturn14file12
 */
export interface ProjectTaskEstimate {
  id: string;
  project_taskid: string;               // Task ID (required)
  userid: string;                       // User ID (required)
  timesheetid: string;
  hours: number;                        // Remaining hours (required)
  changed_by?: number;
  created: DateContainer;
  date_changed: DateContainer;
  updated: DateContainer;
  deleted?: 0 | 1;
}

export interface ProjectTaskEstimateWrapper {
  ProjectTaskEstimate: ProjectTaskEstimate;
  status: string;
}