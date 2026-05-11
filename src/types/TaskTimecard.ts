// src/types/TaskTimecard.ts

import { DateContainer } from './Timesheet.js'; // Assuming DateContainer is defined elsewhere

/**
 * Represents a timecard entry linked to a specific task.
 * Corresponds to XML Object: TaskTimecard
 */
export interface TaskTimecard {
  id: string; // Read-only: Unique ID. Automatically assigned by SuiteProjects Pro.
  category_id?: string; // where integer from 1 to 5. The ID of the associated category_N (e.g., category_1, category_2).
  categoryid?: string; // Read-only: The ID of the associated category.
  cost_centerid?: string; // Read-only: The ID of the associated cost center.
  created?: DateContainer; // Read-only: Time the record was created.
  customerid?: string; // Read-only: The ID of the associated customer.
  date?: DateContainer; // Read-only: The date of the task timecard.
  decimal_hours?: number; // Read-only: The number of decimal hours for the task timecard.
  description?: string; // Read-only: The description of the task timecard.
  hours?: number; // Read-only: The number of hours for the task timecard.
  minutes?: number; // Read-only: The number of minutes for the task timecard.
  notes?: string; // Read-only: Notes associated with this task timecard.
  payroll_typeid?: string; // Read-only: The ID of the associated payroll type.
  project_phaseid?: string; // Read-only: The ID of the project phase.
  projectid?: string; // Read-only: The ID of the associated project.
  projecttask_typeid?: string; // Read-only: The ID of the project task type.
  projecttaskid?: string; // Read-only: The ID of the task within the associated project.
  slipid?: string; // Read-only: The ID of the associated slip.
  time_cardid?: string; // Read-only: The ID of the associated timecard.
  timesheetid?: string; // Read-only: The ID of the associated timesheet.
  timetypeid?: string; // Read-only: The ID of the associated time type.
  updated?: DateContainer; // Read-only: Time the record was last updated or modified.
  userid?: string; // Read-only: The ID of the associated user.
}