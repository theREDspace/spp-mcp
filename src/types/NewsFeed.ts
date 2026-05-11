// src/types/Newsfeed.ts
import type { DateContainer } from "./Timesheet.js";

/**
 * A news feed: a collection of messages with project status information.
 * Fields from XML API docs. citeturn2file2
 */
export interface Newsfeed {
  /** Unique ID */
  id: string;
  /** Creation timestamp */
  created: DateContainer;
  /** Last update timestamp */
  updated: DateContainer;
}
