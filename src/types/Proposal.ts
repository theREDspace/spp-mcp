
// newTypes/Proposal.ts
import type { DateContainer } from "./Timesheet.js";

/**
 * A project proposal (read-only). citeturn15file0
 */
export interface Proposal {
  id: string;
  name: string;
  number: string;
  description?: string;
  notes?: string;
  customer_id: string;
  projectid: string;
  created: DateContainer;
  created_by: number;
  approved?: DateContainer;
  approved_by?: number;
  expires?: DateContainer;
  sent?: DateContainer;
  responded?: DateContainer;
  viewed?: DateContainer;
  status: string;
  total?: number;
  access_log?: string;
  response?: string;
}

export interface ProposalWrapper {
  Proposal: Proposal;
  status: string;
}