import type { DateContainer } from "./Timesheet.js";

export interface Resourceprofile {
  id: string;
  userid: string;
  name: string;
  type: string;
  resourceprofile_type_id: string;
  externalid: string;
  attributeid: string;
  comment?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface ResourceprofileWrapper {
  Resourceprofile: Resourceprofile;
  status: string;
}