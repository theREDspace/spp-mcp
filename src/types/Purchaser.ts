/** Entity representing a purchaser/contact */
export interface Purchaser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  active: 0 | 1;
  created: string;
  updated: string;
}

export interface PurchaserWrapper {
  Purchaser: Purchaser;
  status: string;
}