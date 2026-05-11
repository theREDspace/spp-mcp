// src/types/Hierarchy.ts

import { DateContainer } from "./Timesheet";

/**
 * A classification hierarchy (customer, project, or user).
 * Supports Add, Read, Modify, Upsert, Delete. :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
 */
export interface Hierarchy {
  /** [Read-only] Unique ID */
  id: string;
  /** Active flag (1 = active) */
  active: '1' | '0';
  /** Available as a list column (1 = yes) */
  available_as_column: '1' | '0';
  /** External system ID */
  externalid?: string;
  /** Hierarchy name */
  name: string;
  /** Notes */
  notes?: string;
  /** Use as primary dropdown filter (1 = yes) */
  primary_dropdown_filter: '1' | '0';
  /** Use as primary user filter set (1 = yes) */
  primary_user_filterset: '1' | '0';
  /** Required on forms (1 = yes) */
  required: '1' | '0';
  /** Require on form entry (1 = yes) */
  requireonform: '1' | '0';
  /** Type of hierarchy: 'customer' | 'project' | 'user' */
  type: 'customer' | 'project' | 'user';
  /** [Read-only] Created timestamp */
  created: DateContainer;
  /** [Read-only] Updated timestamp */
  updated: DateContainer;
}

export interface HierarchyWrapper {
  Hierarchy: Hierarchy;
}
