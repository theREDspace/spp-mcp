import { DateContainer } from './Timesheet.js';

export interface Payrolltype {
  id: string;                              // [Read-only]  
  active: 0|1;                             // Whether this payroll type is active
  externalid?: string;                    // External system ID 
  name: string;                            // [Required]  
  notes?: string;                          
  picklist_label?: string;                 // Label shown on form picklist 
  created: DateContainer;                  // [Read-only] 
  updated: DateContainer;                  // [Read-only]  
}

export interface PayrolltypeWrapper {
  Payrolltype: Payrolltype;
  status: string;
}
