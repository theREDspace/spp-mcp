// src/types/IssueSource.ts

import { DateContainer } from "./Timesheet";

/**
 * The origin of an issue (e.g. Customer, Internal).
 * Read-only.
 */
export interface IssueSource {
  id: string;
  name: string;
  active: '1' | '0';
  created: DateContainer;
  updated: DateContainer;
  notes?: string; // Optional field for additional information
}

export interface IssueSourceWrapper {
  IssueSource: IssueSource;
}
