// newTypes/ProjectTask.ts
import type { DateContainer } from "./Timesheet.js";

/**
 * A ProjectTask (phase, milestone, or task) in SuiteProjects Pro.
 * See Projecttask object reference for field definitions. citeturn14file1turn14file2
 */
export interface ProjectTask {
  id: string;                            // Internal ID (read-only)
  projectid: string;                     // Associated project ID (required)
  name: string;                          // Task name (required)
  classification: 'M' | 'P' | 'T';       // Milestone, Phase, or Task (read-only)
  seq?: number;                          // Sequence number within project
  start_date?: DateContainer;            // Scheduled start date citeturn14file0
  calculated_starts?: DateContainer;     // Computed start date (read-only)
  calculated_finishes?: DateContainer;   // Computed finish date (read-only)
  created: DateContainer;                // Creation timestamp (read-only)
  updated: DateContainer;                // Last modified timestamp (read-only)
  priority?: number;                     // Priority (1–9)
  percent_complete?: number;             // % complete estimate
  planned_hours?: number;                // Estimated hours to complete
  task_budget_cost?: number;             // Total cost if budgeting enabled
  task_budget_revenue?: number;          // Total projected billing if budgeting enabled
  manual_task_budget?: 0 | 1;            // 1 = manual budgeting; 0 = computed
  non_billable?: 0 | 1;                  // 1 = non-billable
  all_can_assign?: 0 | 1;                // 1 = anyone can assign time/expenses
  use_project_assignment?: 0 | 1;        // 1 = use project-level assignments
  projecttask_typeid?: string;           // Associated task type ID
  timetype_filter?: string;              // Comma-separated timetype IDs
  predecessors?: string;                 // IDs of predecessor tasks (CSV)
  predecessors_lag?: string;             // Lag times for predecessors
  predecessors_type?: string;            // Relationship types for predecessors
  notes?: string;                        // Task notes
  parentid?: string;                     // Parent task or phase ID
  originating_id?: string  
  assign_user_names?: string; // Comma-separated user names for assignment
  closed?: 0 | 1; // 1 = task is closed
  cost_center_id?: string; // Associated cost center ID
  currency?: string; // Currency code for financials
  customer_name?: string; // Customer name (if applicable)
  customerid?: string; // Associated customer ID
  default_category: string; // Default category ID for time/expenses
  deleted?: 0 | 1; // 1 = task is deleted
  early_finish?: DateContainer; // Early finish date (if applicable)
  early_start?: DateContainer; // Early start date (if applicable)
  estimated_hours?: number; // Estimated hours for task
  externalid?: string; // External system ID (if imported)
  fnlt_date?: DateContainer; // Final date for task completion
  id_number?: string; // Task ID number (if applicable)
  is_a_phase?: 0 | 1; // 1 = task is a phase
  project_name: string; // Name of the associated project
  starts?: DateContainer; // Scheduled start date (if different from start_date)


}

/** Wrapper for SOAP responses */
export interface ProjectTaskWrapper {
  ProjectTask: ProjectTask;
  status: string;
}