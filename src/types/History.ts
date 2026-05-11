// src/types/History.ts

import { DateContainer } from "./Timesheet";

/**
 * An approval history event for envelopes or timesheets.
 * Read-only (supports equal-to reads only). :contentReference[oaicite:3]{index=3}:contentReference[oaicite:4]{index=4}
 */
export interface History {
  /** [Read-only] Unique ID */
  id: string;
  /** Envelope ID (if for an expense report) */
  envelopeid?: string;
  /** Timesheet ID (if for a timesheet) */
  timesheetid?: string;
  /** Approval action: 'S' | 'P' | 'A' | 'R' | 'U' */
  action: 'S' | 'P' | 'A' | 'R' | 'U';
  /** [Read-only] When the action occurred */
  date: DateContainer;
  /** Notes or reasons */
  notes?: string;
  /** Project ID (if project-based) */
  projectid?: string;
  /** User ID who performed the action */
  userid?: string;
  /** [Read-only] Created timestamp */
  created: DateContainer;
}

export interface HistoryWrapper {
  History: History;
}
