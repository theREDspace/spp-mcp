import type { DateContainer } from "./Timesheet.js";

/** Buckets used to group revenue for projections. */
export interface RevenueContainer {
  id: string;
  name: string;
  acct_date: DateContainer;
  approval_status: string;
  balancing_type: string;
  currency: string;
  customerid: string;
  description?: string;
  created: DateContainer;
  updated: DateContainer;
  date: DateContainer;
  date_approved?: DateContainer;
  date_submitted?: DateContainer;
  exported: DateContainer;
  externalid: string;
  notes?: string;
  number: string;
  prefix: string;
  projectid: string;
  total_accrued?: number;
  total_deferred?: number;
  total_invoiced?: number;
  total_posted?: number;
  total_recognized?: number;
}

export interface RevenueContainerWrapper {
  RevenueContainer: RevenueContainer;
  status: string;
}