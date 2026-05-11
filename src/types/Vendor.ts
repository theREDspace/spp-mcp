// src/types/Vendor.ts
import { DateContainer } from "./Timesheet";
import { AddressBlock } from "./Address";
/**
 * A vendor is an external source your company purchases goods or services from.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Vendor {
  id: string;                       // [Read-only]
  active: '1' | '0';
  addr: AddressBlock; // Address information for the vendor
  attention?: string;
  code?: string;                    // acct_code
  currency?: string;
  externalid?: string;
  name: string;
  notes?: string;
  picklist_label?: string;
  purchaseorder_email_text?: string;
  purchaseorder_text?: string;
  tax_locationid?: string;
  terms?: string;
  web?: string;
  created: DateContainer                   // [Read-only]
  updated: DateContainer                   // [Read-only]
}

export interface VendorWrapper {
  Vendor: Vendor;
}
