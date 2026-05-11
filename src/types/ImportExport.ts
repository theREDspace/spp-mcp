// src/types/ImportExport.ts

import { DateContainer } from "./Timesheet";

/**
 * A trace of when a record was last imported from or exported to an external application.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface ImportExport {
  /** [Read-only] Internal ID of the imported/exported record in its native table. */
  id: string;
  /** Name of the application doing the import/export. */
  application: string;
  /** Case-sensitive object type (e.g. "Slip", "Task", etc.). */
  type: string;
  /** Time of the last import to SuiteProjects Pro (YYYY-MM-DD HH:mm:ss). */
  imported: DateContainer;
  /** Time of the last export from SuiteProjects Pro (YYYY-MM-DD HH:mm:ss). */
  exported: DateContainer;
  /** External-system record ID. */
  externalid?: string;
}

export interface ImportExportWrapper {
  ImportExport: ImportExport;
}
