import { DateContainer } from "./Timesheet";

/**
 * Organizational department for users and cost tracking.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Department {
  /** [Read-only] Internal ID */
  id: string;
  /** Department code or abbreviation */
  code?: string;
  /** Department name */
  name: string;
  /** Freeform notes */
  notes?: string;
  /** Optional external system ID */
  externalid?: string;
  /** Label shown in picklists */
  picklist_label?: string;
  /** ‘1’ if active, else ‘0’ */
  active: '1' | '0';
  /** [Read-only] Created timestamp */
  created: DateContainer;
  /** [Read-only] Updated timestamp */
  updated: DateContainer;
  /** ID of the department head user */
  userid?: string;
}

export interface DepartmentWrapper {
  Department: Department;
}
