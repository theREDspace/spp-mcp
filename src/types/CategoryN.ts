// src/types/CategoryN.ts
import { DateContainer } from "./Timesheet";

/**
 * Service line N (e.g. Category_1). Same as Category but named dynamically.
 */
export interface CategoryN {
  id: string;
  externalid?: string;
  name: string;
  notes?: string;
  active: '1' | '0';
  picklist_label?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface CategoryNWrapper {
  /** Use the exact tag e.g. Category_1 */  
  [key: string]: CategoryN;
}
