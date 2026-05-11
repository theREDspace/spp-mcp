import { DateContainer } from "./Timesheet";

/**
 * A custom classification tag linking users, customers or projects.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Entitytag {
  id: string;                          // [Read-only]
  customerid?: string;                 // customer_id
  projectid?: string;                  // project_id
  userid: string;                      // user_id [Required]
  tag_group_id?: string;               // tag_group_id
  tag_group_attributeid: string;       // tag_group_attribute_id [Required]
  tag_group_attribute_name?: string;   // tag_group_attribute_name
  default_for_entity?: '1' | '0';      // default_for_entity
  start_date?: DateContainer;          // YYYY-MM-DD :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
  end_date?: DateContainer;            // YYYY-MM-DD
  externalid?: string;                 // external_id
  created: DateContainer;               // [Read-only]
  updated: DateContainer;               // [Read-only]
}

export interface EntitytagWrapper {
  Entitytag: Entitytag;
}
