import { DateContainer } from "./Timesheet";

export interface ApprovalLine {

  id: string;
  approvalid: string;
  approvalprocessid?: string;
  approvalprocess_ruleid?: string;
  seq_number?: string;
  action: 'S' | 'P' | 'A' | 'R' | 'U';
  status?: 'S' | 'A' | 'R';
  pending_done?: '1' | '0';
  date: DateContainer;
  notes?: string;
  audit?: string;
  delay_action?: string;
  delay_to?: DateContainer;
  submitter?: string;
  userid?: string;
  customerid?: string;
  /** [Read-only] Project ID (for project-based approvals) */
  projectid?: string;
  /** [Read-only] Project budget group ID (if any) */
  project_budget_groupid?: string;
  /** [Read-only] Total approved amount (money or hours) */
  project_total?: string;
  /** [Read-only] IDs of related objects (all optional) */
  bookingid?: string;
  /** [Read-only] Booking-request ID */
  booking_requestid?: string;
  /** [Read-only] Deal booking-request ID */
  deal_booking_requestid?: string;
  /** [Read-only] Envelope (expense report) ID */
  envelopeid?: string;
  /** [Read-only] Invoice ID */
  invoiceid?: string;
  /** [Read-only] Proposal ID */
  proposalid?: string;
  /** [Read-only] Purchase-order ID */
  purchaseorderid?: string;
  /** [Read-only] Purchase-request ID */
  purchaserequestid?: string;
  /** [Read-only] Authorization ID */
  authorizationid?: string;
  /** [Read-only] Revenue container ID */
  revenue_containerid?: string;
  /** [Read-only] Schedule-request ID */
  schedule_requestid?: string;
  /** [Read-only] Timesheet ID */
  timesheetid?: string;
  /** [Read-only] When this record was created */
  created: DateContainer;
  /** [Read-only] When this record was last updated */
  updated: DateContainer;
}

/** Wrapper returned by callSPPXML for list/read operations */
export interface ApprovalLineWrapper {
  ApprovalLine: ApprovalLine;
}