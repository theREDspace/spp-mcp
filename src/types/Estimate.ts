// src/types/Estimate.ts

import { DateContainer } from "./Timesheet";

/**
 * An approximate calculation of resource costs, fixed costs, and discounts
 * for a pipeline deal. Read-only. :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
 */
export interface Estimate {
  id: string;
  customerid: string;
  dealid: string;
  hide_expense: '1' | '0';
  name: string;
  notes?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface EstimateWrapper {
  Estimate: Estimate;
}
