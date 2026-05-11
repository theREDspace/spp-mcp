// src/types/Currency.ts

import { DateContainer } from "./Timesheet";

/**
 * Currency definitions (code, name, rate).
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface Currency {
  rate: number;
  symbol?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface CurrencyWrapper {
  Currency: Currency;
}
