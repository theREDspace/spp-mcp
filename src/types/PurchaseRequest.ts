/** User-generated purchase request */
export interface PurchaseRequest {
  id: string;
  requester_id: string;
  description: string;
  status: string;
  created: string;
  updated: string;
}

export interface PurchaseRequestWrapper {
  PurchaseRequest: PurchaseRequest;
  status: string;
}