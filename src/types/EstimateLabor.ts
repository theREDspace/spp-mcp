// src/types/EstimateLabor.ts

import { DateContainer } from "./Timesheet";

/**
 * Anticipated staffing cost for an estimate. Read-only. :contentReference[oaicite:6]{index=6}:contentReference[oaicite:7]{index=7}
 */
export interface EstimateLabor {
  id: string;
  estimateid: string;
  userid: string;
  amount: number;
  amount_type: '1' | '0';
  billing_rate: number;
  loaded_cost: number;
  description?: string;
  phaseid: string;
  start_date: DateContainer;
  end_date: DateContainer;
  created: DateContainer;
  updated: DateContainer;
}

export interface EstimateLaborWrapper {
  Estimatelabor: EstimateLabor;
}
