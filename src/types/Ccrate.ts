// src/types/Ccrate.ts
import { DateContainer } from "./Timesheet";

/**
 * Hourly rate per customer for a specific service.
 * Read-only.
 */
export interface Ccrate {
  id: string;
  categoryid: string;
  customerid: string;
  currency: string;
  rate: number;
  notes?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface CcrateWrapper {
  Ccrate: Ccrate;
}
