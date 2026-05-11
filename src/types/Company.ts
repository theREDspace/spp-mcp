// src/types/Company.ts

import { DateContainer } from "./Timesheet";
/**
 * Account-wide company settings.
 * Supports Read, Modify.
 */
export interface Company {
  addr?: {
    addr1?: string;
    addr2?: string;
    addr3?: string;
    addr4?: string;
    city?: string;
    contact_id?: string;
    country?: string;
    email?: string;
    fax?: string;
    first?: string;
    id?: string;
    last?: string;
    middle?: string;
    mobile?: string;
    phone?: string;
    salutation?: string;
    state?: string;
    zip?: string;
  };   // nested address details
  base_currency: string;
  businesstype?: string;
  company: string;         // the official company name
  currencies?: string;     // comma-separated currency codes
  flags?: string;          // company-specific settings
  hide_rate?: '1' | '0';
  id: string;
  is_multicurrency?: '1' | '0';
  nickname?: string;
  rate_from?: string;
  created: DateContainer;
  updated: DateContainer;
  vat_registration_number?: string;
  workscheduleid?: string;
}

export interface CompanyWrapper {
  Company: Company;
}
