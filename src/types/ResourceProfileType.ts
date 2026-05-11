import type { DateContainer } from "./Timesheet.js";

/** A custom field type users can assign to resources. */
export interface ResourceprofileType {
  id: string;
  name: string;
  description?: string;
  active: 0 | 1;
  created: DateContainer;
  updated: DateContainer;
}

export interface ResourceprofileTypeWrapper {
  ResourceprofileType: ResourceprofileType;
  status: string;
}