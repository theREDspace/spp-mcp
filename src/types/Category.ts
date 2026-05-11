// src/types/Category.ts
import { DateContainer } from "./Timesheet";

/**
 * A service (category, activity, or time type) offered to customers.
 * Supports Add, Read, Modify, Upsert, Delete. 
 */
export interface Category {
  id: string;                       // [Read-only]
  active: '1' | '0';
  code?: string;                    // acct_code
  cost_centerid?: string;           // cost_center_id
  cost_rate?: number;               // cost_rate
  currency?: string;
  externalid?: string;              // external_id
  fixed_fee?: number;
  name: string;
  notes?: string;
  other_rate?: number;
  other_rate_type?: string;         // Day, Week, etc.
  picklist_label?: string;
  rate?: number;
  taxable?: '1' | '0';
  created: DateContainer;
  updated: DateContainer;
}

export interface CategoryWrapper {
  Category: Category;
}
