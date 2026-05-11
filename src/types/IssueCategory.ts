// src/types/IssueCategory.ts

import { DateContainer } from "./Timesheet";

/**
 * A label grouping related issues.
 * Supports Read only.
 */
export interface IssueCategory {
  id: string;
  name: string;
  active: '1' | '0';
  created: DateContainer; 
  updated: DateContainer; 
  notes?: string;
}

export interface IssueCategoryWrapper {
  IssueCategory: IssueCategory;
}
