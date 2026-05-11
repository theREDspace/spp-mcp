// src/types/Task.ts
import { DateContainer } from "./Timesheet";
/**
 * A time entry [Task] is a time slot worked by an employee on a work package.
 * Supports Add, Read, Modify, Upsert, Delete, Reject. :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
 */
export interface Task {
  /** [Read-only] Unique ID. */
  id: string;
  /** Accounting-period date (YYYY-MM-DD). */
  acct_date?: DateContainer
  /** Service category ID. */
  categoryid?: string;
  /** Cost-center ID. */
  cost_centerid?: string;
  /** [Read-only] Creation timestamp. */
  created: DateContainer;
  /** Customer ID (inferred from project if omitted). */
  customerid?: string;
  /** [Required] Date of the time entry (YYYY-MM-DD). */
  date: DateContainer;
  /** Decimal hours (e.g. 5.5 for 5h30m). */
  decimal_hours?: number;
  /** Description of the work. */
  description?: string;
  /** End time (HH:MM:SS). */
  end_time?: string;
  /** [Read-only] When the entry was marked “exported.” */
  exported?: string;
  /** Hours component (integer part of duration). */
  hours?: number;
  /** Minutes component (remainder of duration). */
  minutes?: number;
  /** Project ID. */
  projectid?: string;
  /** Project task type ID (for milestones vs tasks). */
  projecttask_typeid?: string;
  /** Project-task ID. */
  projecttaskid?: string;
  /** Slip ID if invoiced. */
  slipid?: string;
  /** [Read-only] Last-modified timestamp. */
  updated: DateContainer;
  // …plus any custom fields supported by your namespace
  category_id?: string; // Optional category ID
  job_codeid?: string; // Optional job code ID
  loaded_cost?: number; // Optional loaded cost
  loaded_cost_2: number; // Optional second loaded cost
  loaded_cost_3: number; // Optional third loaded cost
  notes?: string; // Optional notes
  payroll_typeid?: string; // Optional payroll type ID
  project_loaded_cost?: number; // Optional project loaded cost
  project_loaded_cost_2?: number; // Optional second project loaded cost
  project_loaded_cost_3?: number; // Optional third project loaded cost
  start_time?: string; // Optional start time (HH:MM:SS)
  thin_client_id?: string; // Optional thin client ID
  timesheetid?: string; // Optional timesheet ID
  timetypeid?: string; // Optional time type ID
  userid?: string; // Optional user ID

}

export interface TaskWrapper {
  Task: Task;
}
