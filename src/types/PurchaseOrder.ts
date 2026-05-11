import { DateContainer } from './Timesheet';
export interface PurchaseOrder {
  id: string;
  number: number;
  date: DateContainer;
  picklist_label: string;
  currency: string;
  updated: DateContainer;
  code: string;
  name: string;
  active: number;
  acct_date: DateContainer;
  externalid: string;
  total: number;
  created: DateContainer;
  notes: string;
  customerid: string;
}
/** The envelope returned by the API for one PO */
export interface PurchaseOrderWrapper {
  PurchaseOrder: PurchaseOrder;
  status: string;   // e.g. "0"
}
/** The array you get back from the service call */
export type PurchaseOrderResponse = PurchaseOrderWrapper[];