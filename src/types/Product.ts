import type { DateContainer } from "./Timesheet.js";

export interface Product {
  id: string;
  active: number;
  acct_code: string;
  currency: string;
  externalid: string;
  manufacturer_part: string;
  manufacturerid: string;
  name: string;
  notes: string;
  standard_cost: number;
  taxable: number;
  um: string;
  vendorid: string;
  vendor_sku: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface ProductWrapper {
  Product: Product;
  status: string;
}