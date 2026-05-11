// src/types/Booking.ts

import { DateContainer } from "./Timesheet";

/**
 * A booking is the allocation of an employee’s (or resource’s) time
 * to a project or project task.
 * Supports Add, Read, Modify, ModifyOnCondition, Delete, Submit, Approve, Reject, Unapprove.
 */
export interface Booking {
  id: string;
  externalid?: string;
  projectid: string;
  project_taskid?: string;
  project_assignment_profileid?: string;
  customerid: string;
  booking_typeid?: string;
  ownerid?: string;
  as_percentage: '1' | '0';
  hours?: number;
  percentage?: number;
  approval_status?: 'O' | 'S' | 'A' | 'R';
  date_submitted?: DateContainer;
  date_approved?: DateContainer;
  startdate: DateContainer;
  starttime?: DateContainer;
  enddate: DateContainer;
  endtime?: DateContainer;
  notify_owner?: '1' | '0';
  notes?: string;
  source_booking_id?: string;
  repeatid?: string;
  resource_request_queue_id?: string;
  job_codeid?: string;
  locationid?: string;
  updated: DateContainer;
  created: DateContainer;
  userid: string;
}

export interface BookingWrapper {
  Booking: Booking;
}
