// src/types/TargetUtilization.ts
import { DateContainer } from "./Timesheet";
/**
 * A target utilization is the utilization expected from an employee for capacity planning.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface TargetUtilization {
  /** [Read-only] Unique ID */
  id: string;
  /** [Required] User ID */
  user_id: string;
  /** Start date for this utilization record (YYYY-MM-DD) */
  start_date: DateContainer;
  /** End date (YYYY-MM-DD), auto-determined or '0000-00-00' for unbounded */
  end_date: DateContainer;
  /** Target utilization percentage, e.g. 75.30 */
  percentage: number;
  /** [Read-only] Created timestamp */
  created: DateContainer;
  /** [Read-only] Last-modified timestamp */
  updated: DateContainer;
}

export interface TargetUtilizationWrapper {
  TargetUtilization: TargetUtilization;
}
