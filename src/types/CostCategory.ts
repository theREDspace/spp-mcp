// src/types/Costcategory.ts
import { DateContainer } from "./Timesheet";

/**
 * Category for cost transactions.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Costcategory {
  id: string;
  name: string;
  externalid?: string;
  notes?: string;
  active: '1' | '0';
  created: DateContainer;
  updated: DateContainer;
}

export interface CostcategoryWrapper {
  Costcategory: Costcategory;
}
