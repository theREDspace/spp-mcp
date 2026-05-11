import { DateContainer } from "./Timesheet";
export interface Invoice {
    id:                     string;
    date:                   DateContainer;
    invoice_layoutid:       string;
    attachmentid:           string;
    tax_state:              number;
    tax_federal:            number;
    original_invoiceid:     string;
    tax_gst:                number;
    updated:                DateContainer;
    submitted:              DateContainer;
    externalid:             string;
    total:                  number;
    balance:                number;
    paperrequest:           DateContainer;
    customerid:             string;
    accounting:             string;
    draw_date:              DateContainer;
    number:                 string;
    status:                 string;
    approval_status?: 'O' | 'S' | 'A' | 'R';
    terms:                  string;
    credit_reason:          string;
    currency:               string;
    emailed:                DateContainer;
    payment_termsid:        string;
    tax_pst:                number;
    draw:                   number;
    contactid:              string;
    shipping_contactid:     string;
    access_log:             string;
    credit:                 number;
    tax_hst:                number;
    credit_rebill_status?: 'C' | 'R';
    acct_date:              DateContainer;
    tax:                    number;
    created:                DateContainer;
    approved:               DateContainer;
    notes:                  string;
    papersend:              DateContainer;
    oa_invoice_short_url__c: string;
  }

  /** the envelope returned by the XML parser */
export interface InvoiceWrapper {
  Invoice: Invoice;
  status:  string;
}

export type InvoiceResponse = InvoiceWrapper[];
