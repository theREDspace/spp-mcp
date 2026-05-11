// src/types/Timetype.ts
import { DateContainer } from "./Timesheet";
/**
 * Classification for time entries (e.g. “Regular”, “Overtime”).
 * Supports Add, Read, Modify, Upsert, Delete. :contentReference[oaicite:3]{index=3}:contentReference[oaicite:4]{index=4}
 */
export interface Timetype {
  id: string;
  name: string;
  active: '1' | '0';
  code?: string;
  cost_centerid?: string;
  externalid?: string;
  notes?: string;
  picklist_label?: string;
  payroll_code?: string;
  created: DateContainer ;
  updated: DateContainer ;
}

export interface TimetypeWrapper {
  Timetype: Timetype;
}
