import { DateContainer } from "./Timesheet";

export interface Attachment {
  attachmentCategoryId?: string; // rest api
  attachmentid?: string;
  base64_data?: string;
  created: DateContainer;
  file_name?: string;
  fileType?: string;
  hash_name?: string;
  hasThumbnail?: '1' | '0';
  id: string;
  exclude_alert?: '1' | '0';
  isFolder?: '1' | '0';
  is_locked?: '1' | '0';
  isViewable?: '1' | '0';
  lockedBy?: string;
  name: string;
  is_a_folder?: '1' | '0';
  notes?: string;
  owner_type?: string;      // owner_type
  ownerid?: string;           // ownerid
  parentid?: string;
  size?: number;
  updated: DateContainer;
  uploaded_by?: string; // rest api
  workspaceId?: string;
}

export interface AttachmentWrapper {
  Attachment: Attachment;
}