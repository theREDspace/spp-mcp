import { DateContainer } from "./Timesheet";

/**
 * A documented problem or action item in a project.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Issue {
  id: string;
  name: string;
  number: string;
  customer_id: string;
  date: DateContainer;
  date_resolution_expected?: DateContainer;
  date_resolution_required?: DateContainer;
  date_resolved?: DateContainer;
  description: string;
  owner_id: string;
  project_id: string;
  project_task_id?: string;
  issue_category_id?: string;
  resolution_notes?: string;
  user_id?: string;
  issue_severity_id?: string;
  issue_notes?: string;
  issue_source_id?: string;
  issue_stage_id?: string;
  issue_status_id?: string;
  prefix?: string;
  priority?: number; //1 through 100;
  attachment_id?: string;
  notes?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface IssueWrapper {
  Issue: Issue;
}
