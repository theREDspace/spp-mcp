import type { DateContainer } from "./Timesheet.js";

export interface Request_item {
  id: string;
  allow_vendor_substitution: number;
  attachment_id: string;
  attributes: any[];
  cost: number;
  created: DateContainer;
  currency: string;
  customer_id: string;
  date: DateContainer;
  date_fulfilled: DateContainer;
  exported: DateContainer;
  manufacturer_part: string;
  manufacturer_id: string;
  name: string;
  notes: string;
  product_id: string;
  project_id: string;
  purchase_item_id: string;
  purchaseorder_id: string;
  purchaserequest_id: string;
  quantity: number;
  quantity_fulfilled: number;
  request_reference_number: string;
  total: number;
  um: string;
  updated: DateContainer;
  user_id: string;
  vendor_quote_number: string;
  vendor_sku: string;
  vendor_id: string;
}

export interface Request_itemWrapper {
  Request_item: Request_item;
  status: string;
}