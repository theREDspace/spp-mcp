// src/types/TaxLocation.ts
import { DateContainer } from "./Timesheet";
/**
 * A TaxLocation defines regional tax-rate accounting codes and rates.
 * Supports Add, Read, Modify, Upsert.
 */
export interface TaxLocation {
  id: string;                   // [Read-only]
  name: string;
  notes?: string;
  active: '1' | '0';
  acct_code_federal?: string;
  acct_code_state?: string;
  acct_code_gst?: string;
  acct_code_hst?: string;
  acct_code_pst?: string;
  federal_rate?: number;
  state_rate?: number;
  gst_rate?: number;
  hst_rate?: number;
  pst_rate?: number;
  tax_method?: 'G' | 'H' | 'F'; // G=GST/PST, H=HST, F=Federal/State
  created: DateContainer;              // [Read-only]
  updated: DateContainer;              // [Read-only]
}

export interface TaxLocationWrapper {
  TaxLocation: TaxLocation;
}
