import { DateContainer } from "./Timesheet";

/**
 * A lookup rule indicating which object types use job codes.
 * Read-only (supports only Read).
 */
export interface JobCodeUsed {
  /** [Read-only] Unique internal ID */
  id: string;
  /** Position in the lookup rule */
  position: number;
  /** Table name that uses a job code */
  table_name: string;
  /** What it is used by: 'a' = tasks, 's' = slips */
  used_by: 'a' | 's';
  /** [Read-only] When the record was created */
  created: DateContainer;
  /** [Read-only] When the record was last updated */
  updated: DateContainer;
}

/** Wrapper returned by callSPPXML for list/read calls */
export interface JobCodeUsedWrapper {
  JobCodeUsed: JobCodeUsed;
}
