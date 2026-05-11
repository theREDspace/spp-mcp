// src/types/UserLocation.ts

import { DateContainer } from './Timesheet.js'; // Assuming DateContainer is defined elsewhere

/**
 * Represents a location associated with a user.
 * Corresponds to XML Object: UserLocation
 */
export interface UserLocation {
  id: string; // Read-only: Unique ID. Automatically assigned by SuiteProjects Pro.
  created?: DateContainer; // Read-only: Time the record was created.
  itemid?: string; // The ID of the associated item.
  tax_locationid?: string; // The ID of the associated tax location.
  updated?: DateContainer; // Read-only: Time the record was last updated or modified.
  user_locationid?: string; // The location ID for this user.
  acct_code: string; // The accounting code for this user location.
  active: '1' | '0'; // Indicates if the user location is active (1) or inactive (0).
  notes?: string; // Optional notes about the user location.
  name: string; // The name of the user location.
}