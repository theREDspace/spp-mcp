import type { DateContainer } from "./Timesheet.js";

/**
 * From the ProjectStage API docs:
 * created, enable_analysis, enable_billing, enable_phase_and_task,
 * enable_pricing, enable_project_assignments, enable_recognition,
 * enable_team, enable_utilization, id, name, notes,
 * picklist_label, position, updated
 *  [oai_citation:3‡XMLAndSOAPAPI (1).pdf](file-service://file-2B4Udr7KcSz8eok7LZ5CUw)
 */
export interface ProjectStage {
  created: DateContainer;
  enable_analysis: number;
  enable_billing: number;
  enable_phase_and_task: number;
  enable_pricing: number;
  enable_project_assignments: number;
  enable_recognition: number;
  enable_team: number;
  enable_utilization: number;
  id: string;
  name: string;
  notes: string;
  picklist_label: string;
  position: number;
  updated: DateContainer;
}

export interface ProjectStageWrapper {
  ProjectStage: ProjectStage;
  status: string;
}