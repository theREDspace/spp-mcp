// src/types/AgreementToProject.ts

import { DateContainer } from "./Timesheet"

/**
 * Represents a many-to-many link between an Agreement and a Project.
 * Use to read or create these links.
 * Corresponds to XML Object: Agreement_to_project
 */
export interface AgreementToProject {
  id: string; // Read-only: Unique ID. Automatically assigned by SuiteProjects Pro.
  agreementid: string; // Required: The ID of the associated agreement.
  projectid: string; // Required: The ID of the associated project.
  active?: number; // 1/0 field indicating whether this is an active agreement-project link. Defaults to 1 if not set when adding an object agreement-project link.
  created?: DateContainer; // Read-only: Time the record was created.
  customerid?: string; // The ID of the associated customer. Does not need to be set as it can be derived inline from project_id.
  updated?: DateContainer; // Read-only: Time the record was last modified.
}
