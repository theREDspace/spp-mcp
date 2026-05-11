// src/types/ScheduleRequest_item.ts
import { DateContainer } from "./Timesheet";

/**
 * A ScheduleRequest_item represents a request for a resource's time
 * on a schedule or project. These are sub-records of a ScheduleRequest.
 * 
 * Supports: Add, Read, Modify, Delete
 */
export interface ScheduleRequest_item {
  id: string;                    // [Read-only]
  requestid: string;            // optional parent ScheduleRequest ID
  resourceid: string;           // Resource (user) ID
  start_date: DateContainer;           // Start date (YYYY-MM-DD)
  end_date: DateContainer;             // End date (YYYY-MM-DD)
  percent?: number;             // % allocation (e.g. 50)
  type?: string;                // Optional type/classification
  created: DateContainer;              // [Read-only]
  updated: DateContainer;              // [Read-only]
  schedule_requestid: String; // Parent ScheduleRequest ID
  categoryid?: string;      // Optional category ID
  customerid?: string;      // Optional customer ID
  externalid?: string; // Optional external system ID
  hours?: number; // Optional hours per day
  userid?: string; // Optional user ID
  timetypeid?: string; // Optional time type ID
  request_reference_number?: number; // Optional reference number
  projectid?: string; // Optional project ID
  project_taskid?: string; // Optional project task ID
  name?: string; // Optional name
  attachmentid?: string; // Optional attachment ID
  notes?: string; // Optional notes
  date_approved?: DateContainer; // Optional date approved
  date_submitted?: DateContainer; // Optional date submitted
}
export interface ScheduleRequest_itemWrapper {
  ScheduleRequest_item: ScheduleRequest_item;
}
