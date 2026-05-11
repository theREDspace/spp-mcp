import type { DateContainer } from "./Timesheet.js";

/** Rules defining how revenue is recognized over time. */
export interface RevenueRecognitionRule {
  id: string;
  name: string;
  description?: string;
  method: string;
  settings: string;
  created: DateContainer;
  updated: DateContainer;
  accounting_period_id: string;
  acct_code: string;
  acct_date: DateContainer;
  acct_date_how: string;
  active: 0 | 1;
  agreementid: string;
  amount: number;
  asb_exclude_slip_type: string;
  asb_which_slips: string;
  assigned_user: string;
  break_by_user: 0 | 1;
  categoryid: string;
  cost_center_id: string;
  currency: string;
  customerid: string;
  customerpo_id: string;
  end_date: DateContainer;
  end_milestone: string;
  expense_how: string;
  extra_data: string;
  item_filter: string;
  marked_as_ready: 0 | 1;
  percent: number;
  percent_complete: number;
  percent_how: string;
  percent_trigger: string;
  phase: string;
  product_filter: string;
  project_billing_rule_filter: string;
  project_billing_ruleid: string;
  project_task_filter: string;
  projectid: string;
  purchase_how: string;
  recognition_type: string;
  repeatid: string;
  slip_stage_filter: string;
  start_date: DateContainer;
  start_milestone: string;
  timetype_filter: string;
  type: string;
  user_filter: string;
}

export interface RevenueRecognitionRuleWrapper {
  RevenueRecognitionRule: RevenueRecognitionRule;
  status: string;
}