import { DateContainer } from "./Timesheet";

/**
 * A filter set defines what data a user has permission to view or update.
 * Read-only; supports the “all” read method.
 */
export interface Filterset {
  /** [Read-only] Unique ID. */
  id: string;
  /** [Read-only] Indicates whether this filter set is active (1 = active). */
  active: '1' | '0';
  /** [Read-only] If 1, this set allows all access and cannot be deleted. */
  all_access: '1' | '0';
  /** [Read-only] If 1, this is the default new-user filterset. */
  default_filter_set: '1' | '0';
  /** [Read-only] External system ID, if imported. */
  externalid?: string;
  /** [Read-only] Human-readable name. */
  name: string;
  /** [Read-only] Any notes attached to this filter set. */
  notes?: string;
  /** [Read-only] Timestamp of last update. */
  updated: DateContainer;
  /** [Read-only] Creation timestamp. */
  created: DateContainer;
}

export interface FiltersetWrapper {
  Filterset: Filterset;
}
