// src/types/Dealschedule.ts

import { DateContainer } from './Timesheet'; // Assuming DateContainer is defined elsewhere

/**
 * Represents a milestone in a deal when a portion of the deal should be closed and a portion of the deal value should be secured.
 * Corresponds to XML Object: Dealschedule
 */
export interface Dealschedule {
  /** [Read-only] Unique ID */
  id: string; // Read-only: Unique ID. Automatically assigned by SuiteProjects Pro.
  /** [Read-only] The amount this portion of the deal is worth */
  amount: number; // Read-only: The amount this portion of the deal is worth (in the currency of the deal).
  /** [Read-only] Time the record was created */
  created: DateContainer; // Read-only: Time the record was created.
  /** [Read-only] The potential closing date for a deal portion */
  date: DateContainer; // Read-only: The potential closing date for a deal portion.
  /** [Read-only] ID of the deal associated with this deal portion */
  dealid: string; // Read-only: ID of the deal associated with this deal portion.
  /** [Read-only] Time the record was last updated */
  updated: DateContainer; // Read-only: Time the record was last updated or modified.
}