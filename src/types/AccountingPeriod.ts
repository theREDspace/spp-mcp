import { DateContainer } from "./Timesheet";

export interface AccountingPeriod {
  id: string;
  name: string;
  start_date: DateContainer;
  end_date: DateContainer;
  period_date_how: 'S' | 'E' | 'P';
  period_date: DateContainer;
  current_period: '1' | '0';
  default_period: '1' | '0';
  notes?: string;
  active: '1' | '0';
  created: DateContainer;
  updated: DateContainer  ;
}


export interface AccountingPeriodWrapper {
  AccountingPeriod: AccountingPeriod;
}