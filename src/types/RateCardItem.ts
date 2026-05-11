import type { DateContainer } from "./Timesheet.js";

export interface RateCardItem {
  id: string;
  rate_card_id: string;
  job_code_id: string;
  rate: number;
  currency: string;
  current: number;
  start: DateContainer;
  end: DateContainer;
  created: DateContainer;
  updated: DateContainer;
}

export interface RateCardItemWrapper {
  RateCardItem: RateCardItem;
  status: string;
}