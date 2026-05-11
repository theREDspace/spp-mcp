import type { DateContainer } from "./Timesheet.js";

/** Saved search definitions for resources. */
export interface ResourceSearch {
  id: string;
  name: string;
  query: string;
  owner_id: string;
  shared: 0 | 1;
  created: DateContainer;
  updated: DateContainer;
  advanced_options: string;
  as_percentage: 0 | 1;
  availability_search: 0 | 1;
  consecitive_availability: 0 | 1;
  education: string;
  enddate: DateContainer;
  essential: string;
  excluding: string;
  external_id: string;
  hours: number;
  include_generic_resoucres: 0 | 1;
  include_inactive_resources: 0 | 1;
  include_regular_resources: 0 | 1;
  industry: string;
  jobrole: string;
  location: string;
  percentage: string;
  preferred: string;
  required: string;
  resource_request_queue_id: string;
  skill: string;
  startdate: DateContainer;
}

export interface ResourceSearchWrapper {
  ResourceSearch: ResourceSearch;
  status: string;
}