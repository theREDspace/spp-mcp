// src/types/Currencyrate.ts
import { DateContainer } from './Timesheet.js';
/**
 * Exchange rate for a currency on a given date.
 * Read-only.
 */
export interface Currencyrate {
  cname?: string; // Read-only: The name of the counter currency (or quote currency).
  crate?: number; // The foreign exchange rate indicating how much of the counter currency (or quote currency) is needed to purchase one unit of the base currency on either the date specified in date after the last date or dates prior to the first date in the exchange cross rate table.
  csymbol?: string; // Read-only: The symbol for the counter currency (or quote currency).
  date?: DateContainer; // Read-only: The date the quoted exchange rate applied, if dated.
  type?: string; // Read-only: An empty value if the quoted exchange rate is dated. Otherwise: 'PAST' - If the quoted exchange rate applied on dates prior to exchange rates for dates prior to the first date in the exchange cross rate table. 'FUTURE' - If the quoted exchange rate applied on dates prior to exchange rates for dates after the last date in the exchange cross rate table.
}

export interface CurrencyrateWrapper {
  Currencyrate: Currencyrate;
}
