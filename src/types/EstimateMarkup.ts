// src/types/EstimateMarkup.ts

import { DateContainer } from "./Timesheet";

/**
 * Anticipated markup on estimate expenses. Read-only. :contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}
 */
export interface EstimateMarkup {
  id: string;
  estimateid: string;
  percent: number;
  total: number;
  phaseid: string;
  as_percentage: '1' | '0';
  created: DateContainer;
  updated: DateContainer;
}

export interface EstimateMarkupWrapper {
  Estimatemarkup: EstimateMarkup;
}
