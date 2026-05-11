import type { DateContainer } from "./Timesheet.js";

/** Individual revenue forecasts per project/container. */
export interface RevenueProjection {
  id: string;
  project_id: string;
  container_id: string;
  amount: number;
  created: DateContainer;
  updated: DateContainer;
  acct_date: DateContainer;
  agreement_id: string;
  booking_type_id: string;
  category_id: string;
  city: string;
  cost: number;
  cost_center_id: string;
  cost_incldes_tax:1 | 0;
  currency: string;
  customer_id: string;
  customerpo_id: string;
  date: DateContainer;
  description?: string;
  exported: DateContainer;
  hour: number;
  incomplete: 1 | 0;
  invoice_id: string;
  item_id: string;
  job_code_id?: string;
  minute: number;
  name: string;
  notes?: string;
  originating_id: string;
  payment_type_id: string;
  payroll_type_id: string;
  portfolio_project_id: string;
  product_id: string;
  project_billing_rule_id: string;
  project_task_id: string;
  projecttask_type_id: string;
  quantity: number;
  rate: number;
  ref_slip_id: string;
  repeat_id: string;
  revenue_projection_type: string;
  revenue_recognition_rule_id: string;
  revenue_stage_id: string;
  slip_projection_id: string;
  slip_projection_type: string;
  slip_stage_id: string;
  slip_type_id: string;
  timer_start: DateContainer;
  timetype_id: string;
  total: number;
  total_hp: number;
  total_tax_paid: number;
  transaction_id: string;
  type: string;
  um: string;
  user_id: string;
  vehicle_id: string
}

export interface RevenueProjectionWrapper {
  RevenueProjection: RevenueProjection;
  status: string;
}