import { DateContainer } from "./Timesheet";

export interface BillingSplit {
  /** [Read-only] Unique ID. */
  id: string;
  /** [Read-only] Time the record was created. */
  created: DateContainer;
  /** [Read-only] Associated project billing transaction ID. */
  project_billing_transactionid: string;
  /** [Read-only] The slip ID that was created. */
  slipid: string;
  /** [Read-only] Associated task ID. */
  taskid: string;
  /** [Read-only] Time the record was last updated. */
  updated: DateContainer;
}
  
export interface BillingSplitWrapper {
  BillingSplit: BillingSplit;
}