// src/types/BookingType.ts

import { DateContainer } from "./Timesheet";

/**
 * Classifies bookings (e.g. billable, non-billable).
 * Supports Add, Read, Modify, Upsert.
 */
export interface BookingType {
  id: string;
  name: string;
  notes?: string;
  picklist_label?: string;
  priority?: number;
  active: '1' | '0';
  default_for_approval_status?: '1' | '0';
  approval_status?: 'O' | 'S' | 'A' | 'R';
  created: DateContainer;
  updated: DateContainer;
}

export interface BookingTypeWrapper {
  BookingType: BookingType;
}
