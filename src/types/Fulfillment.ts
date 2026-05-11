import { DateContainer } from "./Timesheet";

/**
 * A receipt acknowledgment for a purchase order line item.
 * Supports Read, Modify.
 */
export interface Fulfillment {
  /** [Read-only] Unique ID. */
  id: string;
  /** Accounting period date. */
  acct_date?: string;
  /** Carrier ID for shipping. */
  carrier_id?: string;
  /** [Read-only] Creation timestamp. */
  created: DateContainer;
  /** Date of fulfillment. */
  date: DateContainer;
  /** Freeform description notes. */
  notes?: string;
  /** Associated purchase item ID. */
  purchase_item_id?: string;
  /** [Required] Associated purchase order ID. */
  purchaseorder_id: string;
  /** Associated purchase request ID. */
  purchaserequest_id?: string;
  /** Quantity received. */
  quantity: number;
  /** Associated request item ID. */
  request_item_id?: string;
  /** Slip ID if billed to a time bill. */
  slip_id?: string;
  /** [Read-only] Last update timestamp. */
  updated: DateContainer;
  /** Waybill or tracking number. */
  waybill_number?: string;
}

export interface FulfillmentWrapper {
  Fulfillment: Fulfillment;
}
