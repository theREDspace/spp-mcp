import type { DateContainer } from "./Timesheet.js";

export interface ProjectBillingTransaction {
  id: string;
  agreementid: string;
  categoryid: string;
  cost: number;
  cost_centerid: string;
  created: DateContainer;
  currency: string;
  customerid: string;
  customerpoid: string;
  date: DateContainer;
  description: string;
  fulfillmentid: string;
  hour: number;
  itemid: string;
  job_codeid: string;
  minute: number;
  notes: string;
  payroll_typeid: string;
  project_billing_ruleid: string;
  projectid: string;
  project_taskid: string;
  quantity: number;
  rate: number;
  slip_stageid: string;
  slipid: string;
  taskid: string;
  ticketid: string;
  timetypeid: string;
  total: number;
  type: string;
  um: string;
  updated: DateContainer;
  userid: string;
}

export interface ProjectBillingTransactionWrapper {
  Projectbillingtransaction: ProjectBillingTransaction;
  status: string;
}
