import type { DateContainer } from "./Timesheet.js";

/** Actual transactions posted under revenue recognition rules. */
export interface RevenueRecognitionTransaction {
  id: string;
  rule_id: string;
  transaction_date: DateContainer;
  amount: number;
  created: DateContainer;
  updated: DateContainer;
  acct_code: string;
  acct_date: DateContainer;
  agreementid: string;
  categoryid: string;
  cost_center_id: string;
  currency: string;
  customerpo_id: string;
  customerid: string;
  date: DateContainer;
  decimal_hours: number;
  hour: number;
  is_from_open_stage: 0 | 1;
  job_codeid: string;
  minute: number;
  notes: string;
  offsetid: string;
  originatingid: string;
  percent_complete: number;
  portfolio_projectid: string;
  project_billing_ruleid: string;
  project_taskid: string;
  rate: number;
  recognition_type: string;
  revenue_containerid: string;
  revenue_recognition_rule_id: string;
  revenue_stageid: string;
  slipid: string;
  taskid: string;
  ticketid: string;
  total: number;
  type: string;
  userid: string;

}

export interface RevenueRecognitionTransactionWrapper {
  RevenueRecognitionTransaction: RevenueRecognitionTransaction;
  status: string;
}
