import type { DateContainer } from "./Timesheet.js";

export interface ResourceAttachment {
  id: string;
  userid: string;
  attachment_id: string;
  type: string;
  latest_attachment_id: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface ResourceAttachmentWrapper {
  ResourceAttachment: ResourceAttachment;
  status: string;
}