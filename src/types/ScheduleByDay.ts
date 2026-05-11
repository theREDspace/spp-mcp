// src/types/ScheduleByDay.ts
import { DateContainer } from "./Timesheet";
/**
 * A ScheduleByDay object represents daily capacity/planned allocation for a user.
 * This object is **read-only** and supports only `<Read>` with method="all" or "equal to".
 */
export interface ScheduleByDay {
  id: string;                 // [Read-only] Unique ID
  user_id: string;            // [Read-only] User the day belongs to
  date: DateContainer;               // [Read-only] Date in YYYY-MM-DD
  planned_hours: number;      // [Read-only] Total planned hours for the user on this day
  booked_hours: number;       // [Read-only] Total booked hours
  exception_hours?: number;   // [Read-only] Hours affected by exceptions
  updated: DateContainer;            // [Read-only] Last modified
  created: DateContainer;            // [Read-only] Created
  base_hours?: number;     // [Read-only] Base hours for the user on this day
  hours: number;          // [Read-only] Total hours for the user on this day
  target_base_hours?: number; // [Read-only] Target base hours for the user on this day
  target_hours?: number;    // [Read-only] Target hours for the user on this day

}

export interface ScheduleByDayWrapper {
  ScheduleByDay: ScheduleByDay;
}
