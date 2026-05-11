// src/types/Customerpo.ts

import { DateContainer } from "./Timesheet";

/**
 * Customer PO funding document.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Customerpo {
  id: string;
  name: string;
  number?: string;
  externalid?: string;
  code?: string;         // acct_code
  date: DateContainer;
  acct_date?: DateContainer;
  currency: string;
  total: number;
  notes?: string;
  picklist_label?: string;
  active: '1' | '0';
  created: DateContainer;
  updated: DateContainer;
}

export interface CustomerpoWrapper {
  Customerpo: Customerpo;
}
