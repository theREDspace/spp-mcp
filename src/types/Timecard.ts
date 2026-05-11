// src/types/Timecard.ts
import { DateContainer } from "./Timesheet";
/**
 * A time card entry. Read-only.
 *  
 * XML / SOAP fields: break_start, break_end, time_start, time_end, hours, notes, date, userid, timesheetid, created, updated. :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
 */
export interface Timecard {
  id: string;
  date: DateContainer;
  userid: string;
  timesheetid: string;
  time_start: DateContainer
  time_end: DateContainer;
  break_start: DateContainer;
  break_end: DateContainer;
  hours: number;
  notes?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface TimecardWrapper {
  Timecard: Timecard;
}
