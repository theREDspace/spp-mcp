// src/types/HierarchyNode.ts

import { DateContainer } from "./Timesheet";

/**
 * A node in a classification hierarchy tree.
 * Supports Add, Read, Modify, Delete. :contentReference[oaicite:2]{index=2}
 */
export interface HierarchyNode {
  /** [Read-only] Unique ID */
  id: string;
  /** Hierarchy ID this node belongs to */
  hierarchyid: string;
  /** Is a level (1 = yes) */
  is_a_level: '1' | '0';
  /** Is a node (1 = yes) */
  is_a_node: '1' | '0';
  /** Level ID (0 if node) */
  levelid: string;
  /** Name of level or node */
  name: string;
  /** Notes */
  notes?: string;
  /** Parent node ID (0 if top-level) */
  parentid?: string;
  /** Record ID if not a node (0 if level) */
  recordid?: string;
  /** External system ID */
  externalid?: string;
  /** [Read-only] Created timestamp */
  created: DateContainer;
  /** [Read-only] Updated timestamp */
  updated: DateContainer;
}

export interface HierarchyNodeWrapper {
  HierarchyNode: HierarchyNode;
}
