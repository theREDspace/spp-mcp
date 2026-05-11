// src/types/TaskAdjustment.ts
import { DateContainer } from "./Timesheet";
/**
 * A change made to a time entry via an adjustment timesheet after the original timesheet was approved.
 * Read-only; supports only the “all” and “equal to” read methods.
 */
export interface TaskAdjustment {
  /** [Read-only] Unique ID automatically assigned by the system. */
  id: string;
  /** [Read-only] Time the record was created. */
  created: DateContainer
  /** [Read-only] The ID of the adjustment task. */
  new_taskid: string;
  /** [Read-only] The ID of the adjustment timesheet. */
  new_timesheetid: string;
  /** [Read-only] The ID of the original task. */
  old_taskid: string;
  /** [Read-only] The ID of the original timesheet. */
  old_timesheetid: string;
  /** [Read-only] Time the record was last updated. */
  updated: DateContainer;
}

export interface TaskAdjustmentWrapper {
  TaskAdjustment: TaskAdjustment;
}
