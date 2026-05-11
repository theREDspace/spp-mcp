// src/types/Contact.ts

import { DateContainer } from "./Timesheet";

/**
 * A person contact within the system.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Contact {
  id: string;
  active?: '1' | '0';
  addr: {
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
  };
  first_name: string;
  last_name: string;
  name?: string;
  nickname?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  customerid?: string;
  customer_company?: string;
  externalid?: string;
  code?: string;
  can_bill_to?: '1' | '0';
  can_ship_to?: '1' | '0';
  can_sold_to?: '1' | '0';
  picklist_label?: string;
  exported?: DateContainer;
  notes?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface ContactWrapper {
  Contact: Contact;
}
