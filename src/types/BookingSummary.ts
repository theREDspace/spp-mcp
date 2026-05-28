// src/types/BookingSummary.ts
import { DateContainer } from "./Timesheet";

/**
 * BookingSummary represents aggregate booking and utilization data for an individual or group
 * for a given time window, covering both booked and actual hours.
 */
export interface BookingProjectBreakdown {
  project_id: string;
  project_name?: string;
  booked_hours: number;
  actual_hours: number;
  utilization_percentage: number;
}

export interface BookingSummary {
  id?: string; // Optionally a synthetic or reporting context ID
  user_id?: string;
  project_id?: string;
  start_date: DateContainer;
  end_date: DateContainer;
  total_booked_hours: number;
  total_actual_hours: number;
  utilization_percentage: number; // 0-100
  by_project: BookingProjectBreakdown[];
  by_user?: BookingSummary[]; // For grouping/aggregation
}

export interface BookingSummaryWrapper {
  BookingSummary: BookingSummary;
  status?: string;
}
