// src/types/TaxRate.ts
import { DateContainer } from "./Timesheet";
/**
 * A TaxRate is the tax applied on a transaction by location and date.
 * Supports Add, Read, Modify, Upsert.
 */
export interface TaxRate {
  id: string;                   // [Read-only]
  tax_locationid: string;
  date: DateContainer;                 // YYYY-MM-DD
  federal: number;
  state?: number;
  gst?: number;
  pst?: number;
  hst?: number;
  adjusted?: '1' | '0';
  manual?: '1' | '0';
  notes?: string;
  purchase_itemid?: string;
  slipid?: string;
  ticketid?: string;
  currency?: string;
  created: DateContainer;              // [Read-only]
  updated: DateContainer;              // [Read-only]
}

export interface TaxRateWrapper {
  TaxRate: TaxRate;
}
