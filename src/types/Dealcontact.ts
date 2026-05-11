// src/types/Dealcontact.ts

import { DateContainer } from './Timesheet'; // Assuming DateContainer is defined elsewhere

/**
 * Represents a contact linked to a deal.
 * Corresponds to XML Object: Dealcontact
 */
export interface Dealcontact {
  /** [Read-only] Unique ID */
  id: string;
  /** [Read-only] The related contact ID */
  contactid: string;
  /** [Read-only] The deal ID */
  dealid: string;
  /** [Read-only] Time the record was created */
  created: DateContainer;
  /** [Read-only] Time the record was last updated */
  updated: DateContainer;
}