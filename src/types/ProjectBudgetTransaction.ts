import type { DateContainer } from "./Timesheet.js";

/**
 * Properties from the ProjectBudgetTransaction API docs:
 */
export interface ProjectBudgetTransaction {
  id: string;
  category: number;
  categoryid: string;
  created: DateContainer;
  currency: string;
  customerid: string;
  date: DateContainer;
  itemid: string;
  job_codeid: string;
  productid: string;
  project_budget_groupid: string;
  project_budget_ruleid: string
  project_taskid: string;
  projectid: string;
  quantity: number;
  quantity_best: number;
  quantity_most_likely: number;
  quantity_worst: number;
  total: number;
  total_best: number;
  total_most_likely: number;
  total_worst: number;
  updated: DateContainer;
}

export interface ProjectBudgetTransactionWrapper {
  ProjectBudgetTransaction: ProjectBudgetTransaction;
  status: string;
}