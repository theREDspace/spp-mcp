// src/types/Viewfilter.ts
import { DateContainer } from "./Timesheet";
/**
 * A view filter is a collection of user-defined criteria that can be used to filter list data.
 * Read-only (supports only Read).
 */
export interface Viewfilter {
  id: string;               // [Read-only]
  action: string;           // filter action
  fields: string;           // comma-delimited list of fields
  label: string;            // name shown in UI picklist
  limit_values?: string;    // comma-separated list of limit values
  match_all?: '1' | '0';    // 1=all rules must match
  name?: string;            // internal list/calendar name
  updated: DateContainer ;          // [Read-only]
  userid?: DateContainer ;          // creator user ID
}

export interface ViewfilterWrapper {
  Viewfilter: Viewfilter;
}
