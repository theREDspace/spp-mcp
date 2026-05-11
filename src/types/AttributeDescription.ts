import { DateContainer } from "./Timesheet";

/** src/types/AttributeDescription.ts */
export interface AttributeDescription {
  attributeid: string;
  created: DateContainer;
  deleted: '1' | '0';
  description: string;
  id: string;
  resourceprofile_typeid: string;
  updated: DateContainer;
}

export interface AttributeDescriptionWrapper {
  AttributeDescription: AttributeDescription;
}
