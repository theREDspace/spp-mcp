import type { DateContainer } from "./Timesheet.js";

/** Named stages within revenue recognition processes. */
export interface RevenueStage {
  id: string;
  name: string;
  description?: string;
  created: DateContainer;
  updated: DateContainer;
  revenue_stage_type: string;

}

export interface RevenueStageWrapper {
  RevenueStage: RevenueStage;
  status: string;
}