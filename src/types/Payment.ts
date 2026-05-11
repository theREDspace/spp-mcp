/**
 * A payment received from a customer against an invoice or as a retainer.
 */
import type { DateContainer } from "./Timesheet.js";

export interface Payment {
  id: string;
  bulk_paymentid?: string;
  created: DateContainer;
  currency: string;
  customerid?: string;
  date: DateContainer;
  externalid?: string;
  invoice_number?: string;
  invoiceid: string;
  notes?: string;
  total: number;
  updated: DateContainer;
}

