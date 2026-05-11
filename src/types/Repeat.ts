import type { DateContainer } from "./Timesheet.js";

export interface Repeat {
  id: string;
  created: DateContainer;
  updated: DateContainer;
  end: DateContainer;
  every: number;
  exclude_dow: string;
  frequency: string;
  how_end: string;
  occur_number: number;
}

export interface RepeatWrapper {
  Repeat: Repeat;
  status: string;
}