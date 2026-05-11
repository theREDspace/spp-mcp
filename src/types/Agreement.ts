import { DateContainer } from "./Timesheet";

export interface Agreement {
  number:              string;
  date:                DateContainer;
  picklist_label:      string;
  currency:            string;
  updated:             DateContainer;
  id:                  number;
  code:                string;
  name:                string;
  active:              number;
  acct_date:           DateContainer;
  externalid:          string;
  total:               number;
  created:             DateContainer;
  notes:               string;
  customerid:          number;
  oa_agreement_url__c: string;
}
  
/** The envelope returned by the API for one Agreement */
export interface AgreementWrapper {
    Agreement: Agreement;
    status: string; // e.g. "0"
  }
  /** The array we get back from the service call */
  export type AgreementResponse = AgreementWrapper[];