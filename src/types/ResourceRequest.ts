import type { DateContainer } from "./Timesheet.js";

/** A user’s request for resources or services. */
export interface ResourceRequest {
  id: string;
  booking_type_id: string;
  requester_id: string;
  customerid: string;
  description: string;
  status: string;
  created: DateContainer;
  updated: DateContainer;
  date_end: DateContainer;
  date_finalized: DateContainer;
  date_start: DateContainer;
  date_start_expected: DateContainer;
  external_id: string;
  name: string;
  notes: string;
  number: string;
  ownerid: string;
  percent_fulfilled: number;
  projecyid: string;
}

export interface ResourceRequestWrapper {
  ResourceRequest: ResourceRequest;
  status: string;
}
