// src/types/TimeEntry.ts
import { Timecard } from "./Timecard";
import { TaskTimecard } from "./TaskTimecard";

/**
 * Union/alias for atomic time entry records, across all entry sources.
 */
export type TimeEntry = Timecard | TaskTimecard;

export interface TimeEntryWrapper {
  TimeEntry: TimeEntry;
  status?: string;
}
