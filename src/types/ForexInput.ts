import { DateContainer } from "./Timesheet";

/**
 * A company override for historical or future FX rates when Multi-currency is enabled.
 * Supports Add, Read, Modify, Upsert.
 */
export interface ForexInput {
  /** [Optional] Base currency symbol (must be a user-defined reporting currency). */
  base?: string;
  /** [Read-only] Date the record was created. */
  created: DateContainer;
  /** Last date in the FX rate range (empty if future/past flag set). */
  enddate?: DateContainer;
  /** If 1, this entry applies to dates after the last in the table. */
  future?: '1' | '0';
  /** If 1, this entry applies to dates prior to the first in the table. */
  past?: '1' | '0';
  /** The exchange rate to apply (custom_<currency>): quote currency per one base unit. */
  rate: number;
  /** First date in the FX rate range (empty if future/past flag set). */
  startdate?: DateContainer;
  /** Counter-currency symbol (used to build the `custom_<symbol>` field). */
  symbol: string;
  /** [Read-only] Date the record was last updated. */
  updated: DateContainer;
}

export interface ForexInputWrapper {
  ForexInput: ForexInput;
}
