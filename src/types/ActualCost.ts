// src/types/Actualcost.ts

import { DateContainer } from "./Timesheet";

export interface Actualcost {
  id: string;
  externalid?: string;
  cost: number;
  cost_typeid: string;
  /** The currency code of the cost */
  currency: string;
  /** [Required] Date for the actual cost (YYYY-MM-DD) */
  date: DateContainer;
  /** A “1/0” flag indicating whether this actual cost is an accrual */
  is_accrual: '1' | '0';
  /** The (unused) name of the actual cost, present for subtotalling */
  name: string;
  /** Optional notes */
  notes?: string;
  /** [Required] Period type: “Daily”, “Weekly”, “Monthly”, “Quarterly”, or “Annually” */
  period: DateContainer;
  /** [Read-only] When the record was created */
  created: DateContainer;
  /** [Read-only] When the record was last modified */
  updated: DateContainer;
  /** [Required] The user ID this cost applies to */
  userid: string;
}

/** Wrapper returned by callSPPXML for list/read operations */
export interface ActualcostWrapper {
  Actualcost: Actualcost;
}