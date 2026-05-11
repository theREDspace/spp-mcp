import { DateContainer } from "./Timesheet";

/**
 * A sales opportunity or contract (“deal”) record.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Deal {
  /** [Read-only] Internal ID */
  id: string;
  /** Optional external system ID */
  externalid?: string;
  /** Deal name/title */
  name: string;
  /** Deal number/code */
  number?: string;
  /** [Read-only] When this deal was first opened */
  opened?: DateContainer;
  /** [Read-only] When this deal was closed */
  closed?: DateContainer;
  /** Customer associated with the deal */
  customerid: string;
  /** [Read-only] Date and time the deal was marked as exported */
  exported?: DateContainer;
  /** Status (O=Open, C=Closed, L=Lost) */
  status?: string;
  /** The current stage % complete */
  stage?: number;
  /** The rating for this deal */
  rating?: number;
  /** Territory for the deal */
  territoryid?: string;
  /** Deal total value */
  total?: number;
  /** Currency code */
  currency?: string;
  /** Freeform notes */
  notes?: string;
  /** ‘1’ if active, else ‘0’ */
  active: '1' | '0';
  /** [Read-only] Created timestamp */
  created: DateContainer;
  /** [Read-only] Last-updated timestamp */
  updated: DateContainer;
}

export interface DealWrapper {
  Deal: Deal;
}
