// src/types/EstimateAdjustment.ts

import { DateContainer } from "./Timesheet";

/**
 * A change made to an estimate (labor or expense). Read-only. :contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}
 */
export interface EstimateAdjustment {
  id: string;
  estimateid: string;
  adjustment_type: '1' | '0';
  amount: number;
  amount_type: '1' | '0';
  name: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface EstimateAdjustmentWrapper {
  Estimateadjustment: EstimateAdjustment;
}
