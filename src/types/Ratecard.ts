
/** Rate card defining billing rates */
export interface Ratecard {
  id: string;
  name: string;
  description?: string;
  is_default: 0 | 1;
  created: string;
  updated: string;
}

export interface RatecardWrapper {
  Ratecard: Ratecard;
  status: string;
}
