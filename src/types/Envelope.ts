// src/types/Envelope.ts

import { DateContainer } from "./Timesheet";

/**
 * An expense report (envelope) for reimbursable items.
 * Supports Add, Read, Modify, Delete, Submit, Approve, Reject, Unapprove, Report.
 */
export interface Envelope {
  id: string;                          // [Read-only]
  name: string;
  date: DateContainer;                        // [Required] YYYY-MM-DD
  date_start?: DateContainer;
  date_end?: DateContainer;
  acct_date?: DateContainer;                  // accounting period date
  customerid?: string;
  projectid?: string;
  approver?: string;                   // user ID of approver
  approved?: DateContainer;                   // date_approved [Read-only]
  submitted?: DateContainer;                  // date_submitted [Read-only]
  status?: 'O' | 'S' | 'A' | 'R';      // open/submitted/approved/rejected
  number?: string;                     // trackingNumber
  description?: string;
  notes?: string;
  currency?: string;
  currency_exchange_intolerance?: '1' | '0';
  advance?: number;
  balance?: number;
  total?: number;
  total_to_reimburse?: number;
  tottickets?: number;
  attachmentid?: string[];             // list of attachment IDs
  tax_locationid?: string;
  thin_client_id?: string;
  trip_reason?: string;
  isAccounting?: '1' | '0';
  isAdjusting?: '1' | '0';
  is_overlapping?: '1' | '0';
  exported?: string;
  externalid?: string;
  userid?: string;
  totreiumbruse: string;               // total to reimburse
  created: DateContainer;        // [Read-only]
  updated: DateContainer;                     // [Read-only]
}

export interface EnvelopeWrapper {
  Envelope: Envelope;
}
