// src/types/IssueStatus.ts

import { DateContainer } from "./Timesheet";

/**
 * The current status of an issue (e.g. Open, Closed).
 * Read-only.
 */
export interface IssueStatus {
  id: string;
  name: string;
  active: '1' | '0';
  created: DateContainer; 
  updated: DateContainer; 
}
  
export interface IssueStatusWrapper {
  IssueStatus: IssueStatus;
}
