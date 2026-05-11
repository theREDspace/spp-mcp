// src/types/Viewfilterrule.ts
import { DateContainer } from "./Timesheet";
/**
 * A view filter rule is one of the criteria used in a Viewfilter.
 * Read-only (supports only Read).
 */
export interface Viewfilterrule {
  id: string;             // [Read-only]
  field?: string;        // comma-delimited fields
  updated: DateContainer ;        // [Read-only]
  condition: 'es' | 'ne' | 'ct' | 'nc' | 'bw' | 'ew' | 'gt' | 'ge' | 'lt' | 'le'; // condition for the rule
  viewfilterid: string; // ID of the Viewfilter this rule belongs to
  value: string;         // value for the rule
  type: 'C' | 'N' | 'D' | 'B' | 'MS' | 'P1' | 'P2' | 'R' // type of the value
  created: DateContainer ; // [Read-only]
  required: '1' | '0'; // 1=rule is required
}

export interface ViewfilterruleWrapper {
  Viewfilterrule: Viewfilterrule;
}
