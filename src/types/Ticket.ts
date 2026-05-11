// src/types/Ticket.ts
import { DateContainer } from "./Timesheet";
/**
 * A receipt (expense ticket) in an expense report.
 * Supports Add, Read, Modify, Upsert, Delete, Reject. :contentReference[oaicite:4]{index=4}
 */
export interface Ticket {
  id: string;
  envelopeid: string;                   // expense report ID
  date: string;                         // YYYY-MM-DD
  acct_date?: string;
  userid: string;
  customerid?: string;
  projectid?: string;
  projecttask_typeid?: string;
  categoryid?: string;
  itemid?: string;
  quantity?: number;
  cost?: number;                        // cost per unit
  total?: number;                       // total amount
  currency?: string;
  currency_cost?: number;
  currency_rate?: number;
  currency_symbol?: string;
  currency_total_tax_paid?: number;
  tax_locationid?: string;
  tax_rateid?: string;
  status?: 'R' | 'N';                   // R=reimbursable, N=non-reimbursable
  description?: string;
  city?: string;
  unitm?: string;
  reference_number?: string;
  attachmentid?: string;                // comma-delimited IDs
  slipid?: string;                      // read-only slip link
  thin_client_id?: string;
  use_server_currency_rate?: '1' | '0';
  vehicleid?: string;
  vendorid?: string;
  user_locationid?: string;
  externalid?: string;
  notes?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface TicketWrapper {
  Ticket: Ticket;
}
