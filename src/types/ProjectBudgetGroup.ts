import type { DateContainer } from "./Timesheet.js";

export interface ProjectBudgetGroup {
  id: string;
  approved: DateContainer;
  archived: DateContainer;
  approval_status: string;
  budget_by: number;
  calculated_total: number;
  cf_opt: number;
  cf_pes: number;
  created: DateContainer;
  currency: string;
  customerid: string;
  date: DateContainer;
  eac: number;
  eac_expense: number;
  eac_labor: number;
  eac_purchase: number;
  etc: number;
  etc_expense: number;
  etc_labor: number;
  etc_purchase: number;
  externalid: string;
  funding_total: number;
  internal_total: number;
  itd: number;
  itd_expense: number;
  itd_labor: number;
  itd_purchase: number;
  labor_subcategory: number;
  name: string;
  notes: string;
  parentid: string;
  profitability: number;
  projectid: string;
  setting: string;
  date_submitted: DateContainer;
  total: number;
  total_calculated_billing: number;
  total_calculated_cost: number;
  total_expected_billing: number;
  total_expected_cost: number;
  total_from_funding: number;
  unassigned_task: number;
  updated: DateContainer;
  userid: string;
  version: number;
}

export interface ProjectBudgetGroupWrapper {
  ProjectBudgetGroup: ProjectBudgetGroup;
  status: string;
}
