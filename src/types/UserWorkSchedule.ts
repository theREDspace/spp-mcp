// src/types/UserWorkSchedule.ts
import { DateContainer } from "./Timesheet";
/**
 * Assigns a work schedule to a user.
 * Supports Add, Read, Modify, Delete.
 */
export interface UserWorkSchedule {
  id: string;
  userid: string;
  workscheduleid: string;
  start_date: DateContainer ;
  end_date?: DateContainer ;
  created: DateContainer ;
  updated: DateContainer ;
  account_workscheduleid?: string; // ID of the work schedule in the account
  acct_code?: string; // Optional account code for the work schedule
  externalid?: string; // Optional external system ID
  master_workscheduleid?: string; // Optional master work schedule ID
  name?: string; // Optional name for the work schedule
  sample_date?: DateContainer; // Optional sample date for the work schedule
  use_this_schedule?: '1' | '0'; // Indicates if this schedule is currently in use
  week_num: number; // The week number for the schedule
  workdays: string; // Comma-separated list of workdays (e.g., "1,2,3,4,5" for Monday to Friday)
  workhourid: string; // ID of the work hours associated with this schedule
  workhours: string; // Comma-separated list of work hours (e.g., "08:00-12:00,13:00-17:00")

}

export interface UserWorkScheduleWrapper {
  UserWorkSchedule: UserWorkSchedule;
}
