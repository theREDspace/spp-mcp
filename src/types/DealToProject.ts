/**
 * Many-to-many link between a Deal and a Project.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface DealToProject {
  /** [Read-only] Internal ID */
  id: string;
  /** Associated deal ID */
  dealid: string;
  /** Associated project ID */
  projectid: string;
  /** ‘1’ if active link, else ‘0’ */
  active: '1' | '0';
  /** [Read-only] Created timestamp */
  created: string;
  /** [Read-only] Updated timestamp */
  updated: string;
}

export interface DealToProjectWrapper {
  Deal_to_project: DealToProject;
}
