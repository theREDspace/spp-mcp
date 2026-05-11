// src/types/InvoiceLayout.ts

import { DateContainer } from "./Timesheet";

/**
 * A definition of how invoice information is presented.
 * Read-only (supports only Read).
 */
export interface InvoiceLayout {
  /** [Read-only] Unique ID. */
  id: string;
  /** [Read-only] Name used in UI picklists. */
  name: string;
  /** [Read-only] Last-modified timestamp. */
  updated: DateContainer;
  /** [Read-only] Creation timestamp. */
  created: DateContainer;
}

export interface InvoiceLayoutWrapper {
  InvoiceLayout: InvoiceLayout;
}