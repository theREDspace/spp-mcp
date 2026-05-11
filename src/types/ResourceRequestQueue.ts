import type { DateContainer } from "./Timesheet.js";

/** Queue entries for processing ResourceRequest items. */
export interface ResourceRequestQueue {
  id: string;
  request_id: string;
  status: string;
  attempts: number;
  last_attempt: DateContainer;
  created: DateContainer;
  updated: DateContainer;
  booking_type_id: string;
  customerid: string;
  date_end: DateContainer;
  date_start: DateContainer;
  external_id: string;
  name: string;
  notes: string;
  number: string;
  percent_fulfilled: number;
  projectid: string;
  resource_request_id: string;
  resourcesearch_id: string;
  slots: number;
}

export interface ResourceRequestQueueWrapper {
  ResourceRequestQueue: ResourceRequestQueue;
  status: string;
}
