import { DateContainer } from "./Timesheet";

/** src/types/Attribute.ts */
export interface Attribute {
  /** [Read-only] ID of the associated attribute set */
  attribute_setid: string;
  created: DateContainer;
  id: string;
  name: string;
  notes: string;
  updated: DateContainer;
}

export interface AttributeWrapper {
  Attribute: Attribute;
}
