import { DateContainer } from './Timesheet.js';

export interface PaymentType {
  id: string;                               // [Read-only] 
  active: 0|1;                              // Indicates if type is active  
  default_payment_type: 0|1;                // 1 = default for receipts  
  default_status: string;                   // e.g. 'R' or 'N' 
  name: string;                             // [Required]  
  notes?: string;                           
  created: DateContainer;                   // [Read-only]  
  updated: DateContainer;                   // [Read-only]  
}

export interface PaymentTypeWrapper {
  PaymentType: PaymentType;
  status: string;
}