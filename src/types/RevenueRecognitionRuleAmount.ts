/** Amounts tied to specific recognition rules. */
import { DateContainer } from "./Timesheet.js";
export interface RevenueRecognitionRuleAmount {
  id: string;
  rule_id: string;
  period_start: DateContainer;
  period_end: DateContainer;
  amount: number;
  created: DateContainer;
  updated: DateContainer;
  acct_code: string;
  agreement_id: string;
  category_id: string;
  cost_center_id: string;
  currency: string;
  customerpo_id: string;
  recognition_type: string;
  revenue_recognition_rule_id: string;
}

export interface RevenueRecognitionRuleAmountWrapper {
  RevenueRecognitionRuleAmount: RevenueRecognitionRuleAmount;
  status: string;
}