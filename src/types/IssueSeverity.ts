// src/types/IssueSeverity.ts

import { DateContainer } from "./Timesheet";

/**
 * A classification of issue impact (e.g. High, Medium, Low).
 * Read-only.
 */
export interface IssueSeverity {
  id: string;
  name: string;
  active: '1' | '0';
  created: DateContainer;
  updated: DateContainer;
  notes?: string; // Optional field for additional information
}

export interface IssueSeverityWrapper {
  IssueSeverity: IssueSeverity;
}
