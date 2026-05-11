// src/types/CustomerLocation.ts

import { DateContainer } from "./Timesheet";

/**
 * Geographical classification for customers.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface CustomerLocation {
  id: string;
  name: string;
  notes?: string;
  active: '1' | '0';
  created: DateContainer;
  updated: DateContainer;
}

export interface CustomerLocationWrapper {
  CustomerLocation: CustomerLocation;
}
