
// newTypes/ProjectTaskType.ts
import type { DateContainer } from "./Timesheet.js";

/**
 * Classification group for ProjectTasks. citeturn14file13
 */
export interface ProjectTaskType {
  id: string;
  name: string;
  active: 0 | 1;
  notes?: string;
  picklist_label?: string;
  suppress_notification?: 0 | 1;
  created: DateContainer;
  updated: DateContainer;
}

export interface ProjectTaskTypeWrapper {
  ProjectTaskType: ProjectTaskType;
  status: string;
}
