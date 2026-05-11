// src/types/EstimateExpense.ts

import { DateContainer } from "./Timesheet";

/**
 * An anticipated expense on an estimate. Read-only. :contentReference[oaicite:4]{index=4}:contentReference[oaicite:5]{index=5}
 */
export interface EstimateExpense {
  id: string;
  estimateid: string;
  itemid: string;
  date: DateContainer;
  description: string;
  markup: number;
  markup_type: '1' | '0';
  phaseid: string;
  price: number;
  quantity: number;
  created: DateContainer;
  updated: DateContainer;
}

export interface EstimateExpenseWrapper {
  Estimateexpense: EstimateExpense;
}
