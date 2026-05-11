// src/types/BookingRequest.ts

import { DateContainer } from "./Timesheet";

/**
 * A request for allocation of time to a project/task.
 * Read-only.
 */
export interface BookingRequest {
  id: string;
  name: string;
  number: string;
  external_id?: string;
  description?: string;
  customer_id: string;
  project_id: string;
  project_task_id?: string;
  booking_type_id?: string;
  attachment_id?: string;
  as_percentage: '1' | '0';
  hours?: number;
  percentage?: number;
  approval_status?: 'O' | 'P' | 'A' | 'R';
  date_submitted?: DateContainer;
  date_approved?: DateContainer;
  startdate?: DateContainer;
  enddate?: DateContainer;
  job_code_id?: string;
  prefix?: string;
  notify_owner?: '1' | '0';
  notes?: string;
  updated?: DateContainer;
  created: DateContainer;
  owner_id: string;
}

export interface BookingRequestWrapper {
  Booking_request: BookingRequest;
}
