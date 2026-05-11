/**
 * A message within a news feed, including project status details.
 */
import type { DateContainer } from "./Timesheet.js"

export interface NewsfeedMessage {
  id: string;
  newsfeedid: string;
  title?: string;
  content: string;
  tagid?: number;
  authorid?: number;
  editorid?: number;
  created: DateContainer;
  updated: DateContainer;
}
