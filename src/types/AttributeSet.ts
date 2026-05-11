import { DateContainer } from "./Timesheet";

/** src/types/Attributeset.ts */
export interface Attributeset {
  created: DateContainer;
  id: string;
  name: string;
  notes: string;
  updated: DateContainer;
}

export interface AttributesetWrapper {
  Attributeset: Attributeset;
}
