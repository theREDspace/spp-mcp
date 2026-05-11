export interface ApprovalProcess {
  /** [Read-only] Time the record was created */
  created: string;
  /** Optional external system ID */
  externalid?: string;
  /** [Read-only] Unique internal ID */
  id: string;
  /** Display name (required) */
  name: string;
  /** [Read-only] Time the record was last modified */
  updated: string;
}

export interface ApprovalProcessWrapper {
  ApprovalProcess: ApprovalProcess;
}