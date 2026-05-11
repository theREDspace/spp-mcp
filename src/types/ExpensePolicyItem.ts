// src/types/ExpensePolicyItem.ts

import { DateContainer } from "./Timesheet";

/**
 * A rule applying limits to a specific expense item under a policy.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface ExpensePolicyItem {
  id: string;                          // [Read-only]
  expense_policyid: string;            // [Required]
  itemid: string;                      // [Required]
  currency?: string;
  price_fixed?: number;
  price_max?: number;
  deleted?: '1' | '0';
  created: DateContainer;                     // [Read-only]
  updated: DateContainer;                     // [Read-only]
}

export interface ExpensePolicyItemWrapper {
  ExpensePolicyItem: ExpensePolicyItem;
}
