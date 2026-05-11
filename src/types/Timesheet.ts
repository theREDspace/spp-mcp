export interface DateBlock {
    hour: number | "";
    minute: number | "";
    timezone: string;
    second: number | "";
    month: number;
    day: number;
    year: number;
  }
  /** Wraps a DateBlock under the “Date” key */
  export interface DateContainer {
    Date: DateBlock;
  }
/** The full Timesheet record */
export interface Timesheet {
    status: string;               // e.g. "X"
    userid: string;
    default_payrolltypeid: string;
    updated: DateContainer;
    id: string;
    max_hours: string;
    thin_client_id: string;
    associated_tmid: string;
    history: string;
    default_timetypeid: string;
    submitted: DateContainer;
    name: string;                 // e.g. "07/31/2022 to 08/06/2022"
    default_customerid: string;
    acct_date: DateContainer;
    approved_by: string;
    duration: string;
    ends: DateContainer;
    total: number;
    default_categoryid: string;
    created: DateContainer;
    starts: DateContainer;
    approved: DateContainer;
    default_projecttaskid: string;
    notes: string;
    start_end_month_ts: string;
    default_projectid: string;
    min_hours: string;
    default_per_row: string;
    // …add any other properties you care about…
  }
/** The envelope returned by the API */
export interface TimesheetWrapper {
    Timesheet: Timesheet;
    status: string;   // this is the outer status, usually "0"
  }
  /** The array you get back from the service call */
export type TimesheetResponse = TimesheetWrapper[];