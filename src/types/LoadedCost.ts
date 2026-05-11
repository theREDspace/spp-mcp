// src/types/LoadedCost.ts

import { DateContainer } from "./Timesheet";

export interface LoadedCost {
  id: string;                          // [Read-only]
  userid: string;                      // [Required]
  cost: number;                        // fully loaded hourly cost
  currency: string;                    // currency code
  current: '1' | '0';                  // 1=current record
  lc_level: 0 | 1 | 2;                 // 0=primary,1=secondary,2=tertiary
  projectid?: string;                  // if scoped to a project
  project_taskid?: string;             // if scoped to a task (only one of projectid/project_taskid)
  customerid?: string;                 // if scoped to a customer
  start: DateContainer;                       // YYYY-MM-DD [Required if current=0]
  end?: DateContainer;                        // YYYY-MM-DD [Required if current=0]
  externalid?: string;                 // for imported records
  created: DateContainer;                     // [Read-only]
  updated: DateContainer;                     // [Read-only]
}

export interface LoadedCostWrapper {
  LoadedCost: LoadedCost;
}
