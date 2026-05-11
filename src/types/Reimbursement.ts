import type { DateContainer } from "./Timesheet.js";

export interface Reimbursement {
  id: string;
  audit: string;
  created: DateContainer;
  currency: string;
  date: DateContainer;
  envelope_id: string;
  envelope_number?: string;
  external_id?: string;
  notes?: string;
  total: number;
  updated: DateContainer;
  user_id: string;
}

export interface ReimbursementWrapper {
  Reimbursement: Reimbursement;
  status: string;
}