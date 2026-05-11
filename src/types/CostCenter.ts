// src/types/Costcenter.ts
import { DateContainer } from "./Timesheet";

/**
 * Cost center for grouping expenses.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Costcenter {
  id: string;
  active: '1' | '0';
  name: string;
  code?: string;
  externalid?: string;
  notes?: string;
  picklist_label?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface CostcenterWrapper {
  Costcenter: Costcenter;
}
