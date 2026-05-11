import type { DateContainer } from "./Timesheet.js";

/**
 * From the ProjectPricing API docs:
 * created, customer_id, discount_rate_card_id, id, project_id,
 * standard_rate_card_id, updated
 *  [oai_citation:2‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
 */
export interface ProjectPricing {
  id: string;
  created: DateContainer;
  customerid: string;
  discount_rate_cardid: string
  projectid: string;
  standard_rate_cardid: string;
  updated: DateContainer;
}

export interface ProjectPricingWrapper {
  ProjectPricing: ProjectPricing;
  status: string;
}