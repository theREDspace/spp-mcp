// src/types/BookingByDay.ts
import { DateContainer } from "./Timesheet";

/**
 * Day-by-day representation of bookings.
 * Read-only.
 */
export interface BookingByDay {
  id: string;
  booking_id: string;
  booking_type_id: string;
  project_id: string;
  project_task_id: string;
  customer_id: string;
  date: DateContainer;
  hours: number;
  job_code_id?: string;
  resource_request_queue_id?: string;
  updated?: DateContainer;
  created: DateContainer;
  userid: string;
}

export interface BookingByDayWrapper {
  BookingByDay: BookingByDay;
}
