import type { DateContainer } from "./Timesheet.js";

export interface ProjectBudgetRule {
  category: number;
  categoryid: string;
  created: DateContainer;
  currency: string;
  customerid: string;
  date: DateContainer;
  end_date: DateContainer;
  id: string;
  imported: number;
  itemid: string;
  job_codeid: string;
  notes: string;
  period: string;
  productid: string;
  profitability: number;
  project_budget_groupid: string;
  project_taskid: string;
  projectid: string;
  quantity: number;
  quantity_best: number;
  quantity_most_likely: number;
  quantity_worst: number;
  rate: number;
  start_date: DateContainer;
  total: number;
  total_best: number;
  total_most_likely: number;
  total_worst: number;
  updated: DateContainer;
}

export interface ProjectBudgetRuleWrapper {
  ProjectBudgetRule: ProjectBudgetRule;
  status: string;
}