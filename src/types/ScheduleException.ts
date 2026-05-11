// src/types/ScheduleException.ts
import { DateContainer } from "./Timesheet";
/**
 * A ScheduleException represents a date or date range when a user is unavailable (e.g., vacation, holiday).
 * Supports Add, Read, Modify, Upsert, Delete.
 */

export interface ScheduleException {
  id: string; // [Read-only] Unique ID, assigned by the system
  created: DateContainer // [Read-only] Creation timestamp (format: YYYY-MM-DD HH:MM:SS)
  updated?: DateContainer; // [Read-only] Last modified timestamp
  startdate: DateContainer; // [Required] Start of exception (format: YYYY-MM-DD)
  enddate: DateContainer; // [Required] End of exception (must be after startdate)
  name: string; // [Required] Name or description of the exception (e.g., "New Year's Day")
  userid: string; // ID of the user this applies to (0 if for account schedule)
  workscheduleid?: string; // ID of the associated work schedule (used if not user-specific)
  workhours?: number; // Number of hours per day during this exception
  timetypeid?: string; // ID of the time type (must be valid for scheduling)
  schedule_request_itemid?: string; // ID of the related schedule request item
  exception_type?: "R"; // [Read-only] Only value is "R" (date range)
}
export interface ScheduleExceptionWrapper {
  ScheduleException: ScheduleException;
}