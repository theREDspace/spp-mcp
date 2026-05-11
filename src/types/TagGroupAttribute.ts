// src/types/TagGroupAttribute.ts
import { DateContainer } from "./Timesheet";
/**
 * A possible tag value that can be associated with a user, customer, or project.
 * Supports Add, Read, Modify, Upsert, Delete. :contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}
 */
export interface TagGroupAttribute {
  /** [Read-only] Unique ID. */
  id: string;
  /** 1 = active, 0 = inactive */
  active: '1' | '0';
  /** The tag_group this attribute belongs to */
  tag_groupid: string;
  /** Name/value for this tag attribute */
  name: string;
  /** Optional external-system ID */
  externalid?: string;
  /** [Read-only] Creation timestamp */
  created: DateContainer;
  /** [Read-only] Last-modified timestamp */
  updated: DateContainer;
}

export interface TagGroupAttributeWrapper {
  TagGroupAttribute: TagGroupAttribute;
}
