
/** Line item on a purchase order */
export interface PurchaseItem {
  id: string;
  purchaseorder_id: string
  item_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created: string;
  updated: string;
}

export interface PurchaseItemWrapper {
  PurchaseItem: PurchaseItem;
  status: string;
}