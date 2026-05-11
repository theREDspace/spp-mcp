import type { DateContainer } from "./Timesheet.js";

export interface ProjectAssignmentProfile {
  id: string;
  created: DateContainer;
  customerid: string;
  name: string;
  projectid: string;
  updated: DateContainer;
  user_filter: string;
}

export interface ProjectAssignmentProfileWrapper {
  ProjectAssignmentProfile: ProjectAssignmentProfile;
  status: string;
}