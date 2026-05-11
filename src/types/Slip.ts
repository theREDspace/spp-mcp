import { DateContainer } from "./Timesheet";

export interface Slip {
    id: string;
    date?: DateContainer;
    acct_date?: DateContainer;
    created?: DateContainer;
    updated?: DateContainer;
  
    hour?: number;
    minute?: number | ""; // empty string is possible
    decimal_hours?: number;
    quantity?: number;
  
    rate?: number;
    cost?: number;
    total?: number;
    total_tax?: number;
    total_with_tax?: number;
  
    currency?: string;
    description?: string;
    notes?: string;
    type?: string; // e.g., "T"
    gl_code?: number;
  
    userid?: string;
    customerid?: string;
    projectid?: string;
    invoiceid?: string;
    projecttaskid?: string;
    job_code_id?: string;
    slip_stageid?: string;
    project_billing_ruleid?: string;
    categoryid?:  string;
    category_1id?: string | "";
    category_2id?: string | "";
    category_3id?: string;
    category_4id?: string | "";
    category_5id?: string | "";
  
    billing_contactid?: string;
    shipping_contactid?: string;
    sold_to_contactid?: string;
    payment_typeid?: string;
    payroll_typeid?: string;
    cost_centerid?: string;
  }

  export interface SlipWrapper {
    Slip: Slip | Slip[];  // the raw API payload
    status: string;        // always a string
  }


  export type SlipResponse = SlipWrapper[];