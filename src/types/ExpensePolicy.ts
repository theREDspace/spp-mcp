// src/types/ExpensePolicy.ts

import { DateContainer } from "./Timesheet";

/**
 * A set of rules restricting which expenses are claimable.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface ExpensePolicy {
  id: string;                          // [Read-only]
  customerid: string;                  // [Required]
  projectid: string;                   // [Required]
  all_items_allowed: '1' | '0';
  description?: string;
  deleted?: '1' | '0';
  created: DateContainer;                     // [Read-only]
  updated: DateContainer;                     // [Read-only]
}

export interface ExpensePolicyWrapper {
  ExpensePolicy: ExpensePolicy;
}
