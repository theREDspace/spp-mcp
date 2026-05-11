import type { DateContainer } from "./Timesheet.js";

export interface Report {
  id: string;
  name: string;
  created: DateContainer;
  date_created: DateContainer;
  updated: DateContainer;
  email_report: number;
  relatedid?: number;
  thin_client_context: number;
  type: string;
  userid: string;
}

export interface ReportWrapper {
  Report: Report;
  status: string;
}