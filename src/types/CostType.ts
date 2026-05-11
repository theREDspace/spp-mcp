// src/types/Costtype.ts

import { DateContainer } from "./Timesheet";

/**
 * Type of cost (labor, expense, etc.).
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Costtype {
  id: string;
  cost_categoryid?: string;
  name: string;
  notes?: string;
  active: '1' | '0';
  created: DateContainer;
  updated: DateContainer;
}

export interface CosttypeWrapper {
  Costtype: Costtype;
}
