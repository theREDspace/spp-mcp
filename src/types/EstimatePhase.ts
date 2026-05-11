// src/types/EstimatePhase.ts

import { DateContainer } from "./Timesheet";

/**
 * A phase/package of work within an estimate. Read-only. :contentReference[oaicite:10]{index=10}:contentReference[oaicite:11]{index=11}
 */
export interface EstimatePhase {
  id: string;
  estimateid: string;
  name: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface EstimatePhaseWrapper {
  Estimatephase: EstimatePhase;
}
