// src/types/HistoryNotes.ts

import { DateContainer } from "./Timesheet";

/**
 * Approval history notes for envelopes or timesheets.
 * Read-only (supports equal-to reads only). :contentReference[oaicite:5]{index=5}:contentReference[oaicite:6]{index=6}
 */
export interface HistoryNotes {
  /** [Read-only] Unique ID */
  id: string;
  /** Approval action: 'S' | 'P' | 'A' | 'R' | 'U' */
  action: 'S' | 'P' | 'A' | 'R' | 'U';
  /** [Read-only] When the note was recorded */
  date: DateContainer;
  /** Notes text */
  notes?: string;
  /** Parent object ID (envelope or timesheet) */
  parentid: string;
  /** Object type: 'Envelope' | 'TimeSheet' */
  type: 'Envelope' | 'TimeSheet';
}

export interface HistoryNotesWrapper {
  HistoryNotes: HistoryNotes;
}
