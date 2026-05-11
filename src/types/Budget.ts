// src/types/Budget.ts
import { DateContainer } from "./Timesheet";

/**
 * A transactional budget entry for tracking project funding.
 * Supports Add, Read, Modify, Upsert.
 */
export interface Budget {
  id: string;
  name: string;
  date: DateContainer;
  projectid: string;
  customerid?: string;
  budgetcategory_id?: string;
  categoryid?: string;
  total: number;
  currency: string;
  notes?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface BudgetWrapper {
  Budget: Budget;
}
