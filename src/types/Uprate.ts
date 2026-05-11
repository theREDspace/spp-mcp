// src/types/Uprate.ts
import { DateContainer } from "./Timesheet";
/**
 * An override of a resource’s loaded cost rate (per-project or per-role).
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Uprate {
  /** [Read-only] Unique ID */
  id: string;
  /** User ID */
  userid: string;
  /** Project ID (optional) */
  projectid?: string;
  /** Work-schedule role ID (optional) */
  roleid?: string;
  /** New loaded cost rate */
  cost: number;
  /** Currency of the cost */
  currency: string;
  /** '1' if this is the current override */
  current: '1' | '0';
  /** Start date (YYYY-MM-DD) */
  start: DateContainer ;
  /** End date (YYYY-MM-DD) */
  end?: DateContainer ;
  /** [Read-only] Created timestamp */
  created: DateContainer ;
  /** [Read-only] Updated timestamp */
  updated: DateContainer 
  categoryid?: string; // Optional category ID
  customerid?: string; // Optional customer ID
}

export interface UprateWrapper {
  Uprate: Uprate;
}
