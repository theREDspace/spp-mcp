// src/types/BudgetAllocation.ts
import { DateContainer } from "./Timesheet";

/**
 * Assigns a user to a percentage of a budget entry.
 * Supports Add, Read, Modify, Upsert.
 */
export interface BudgetAllocation {
  id: string;
  budgetid: string;
  userid: string;
  allocation: number;
  budgetactivity_id?: string;
  budgetcategory_id?: string;
  projectid?: string;
  customerid?: string;
  date: DateContainer;
  total: number;
  currency: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface BudgetAllocationWrapper {
  BudgetAllocation: BudgetAllocation;
}
