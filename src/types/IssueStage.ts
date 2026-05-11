// src/types/IssueStage.ts

import { DateContainer } from "./Timesheet";

/**
 * A phase in the issue-resolution workflow.
 * Read-only.
 */
export interface IssueStage {
  id: string;
  name: string;
  considered_closed: '1' | '0'; // Indicates if the stage is considered closed
  created: DateContainer;
  updated: DateContainer;
  position: number; // Position in the workflow
  notes?: string; // Optional field for additional information
}

export interface IssueStageWrapper {
  IssueStage: IssueStage;
}
