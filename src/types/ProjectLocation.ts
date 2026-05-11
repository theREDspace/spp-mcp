import type { DateContainer } from "./Timesheet.js";

/**
 * From the Projectlocation API docs:
 * active, created, id, name
 */
export interface Projectlocation {
  id: string;
  active: number;
  created: DateContainer;
  name: string;
  notes?: string;
  updated: DateContainer;
}

export interface ProjectlocationWrapper {
  Projectlocation: Projectlocation;
  status: string;
}
