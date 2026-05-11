// src/types/TagGroup.ts
import { DateContainer } from "./Timesheet";
/**
 * A tag group is a tag type. Tags are a custom classification tool
 * that organize users, customers, or projects into groups.
 * Supports Add, Read, Modify, Upsert, Delete. :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
 */
export interface TagGroup {
  /** [Read-only] Unique ID. Automatically assigned. */
  id: string;
  /** 1 = active, 0 = inactive */
  active: '1' | '0';
  /** Type of entity: 'U' = user, 'C' = customer, 'P' = project */
  entity_type: 'U' | 'C' | 'P';
  /** Optional external-system ID */
  externalid?: string;
  /** Name of this tag group */
  name: string;
  /** 1 = searchable (only when entity_type = U) */
  searchable: '1' | '0';
  /** [Read-only] Creation timestamp */
  created: DateContainer;
  /** [Read-only] Last-modified timestamp */
  updated: DateContainer;
}

export interface TagGroupWrapper {
  TagGroup: TagGroup;
}
