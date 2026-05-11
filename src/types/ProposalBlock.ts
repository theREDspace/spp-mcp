// newTypes/ProposalBlock.ts
import type { DateContainer } from "./Timesheet.js";

/**
 * Component block within a Proposal (read-only). citeturn15file2
 */
export interface ProposalBlock {
  id: string;
  proposal_id: string;
  seq: number;
  type: string;
  name: string;
  content: string;
  description?: string;
  category_id?: number;
  item_id?: number;
  quantity?: number;
  rate?: number;
  cost?: number;
  hour?: number;
  minute?: number;
  total?: number;
  slip_id?: number;
  template_id?: number;
  um?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface ProposalBlockWrapper {
  ProposalBlock: ProposalBlock;
  status: string;
}
