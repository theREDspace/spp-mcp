import { DateContainer } from "./Timesheet";

export interface Customer {
  id: string;
  active?: '1' | '0';
  addr?: {
    addr1?: string;
    addr2?: string;
    addr3?: string;
    addr4?: string;
    city?: string;
    contact_id?: string;
    country?: string;
    email?: string;
    fax?: string;
    first?: string;
    id?: string;
    last?: string;
    middle?: string;
    mobile?: string;
    phone?: string;
    salutation?: string;
    state?: string;
    zip?: string;
  };
  billingaddr?: {
    addr1?: string;
    addr2?: string;
    addr3?: string;
    addr4?: string;
    city?: string;
    contact_id?: string;
    country?: string;
    email?: string;
    fax?: string;
    first?: string;
    id?: string;
    last?: string;
    middle?: string;
    mobile?: string;
    phone?: string;
    salutation?: string;
    state?: string;
    zip?: string;
  };
  contactaddr?: {
    addr1?: string;
    addr2?: string;
    addr3?: string;
    addr4?: string;
    city?: string;
    contact_id?: string;
    country?: string;
    email?: string;
    fax?: string;
    first?: string;
    id?: string;
    last?: string;
    middle?: string;
    mobile?: string;
    phone?: string;
    salutation?: string;
    state?: string;
    zip?: string;
  };
  billing_contact_id?: string;
  primary_contactid?: string;
  shipping_contactid?: string;
  sold_to_contactid?: string;
  cost_centerid?: string;
  bus_typeid?: string;
  filterset_ids?: string;
  hierarchy_node_ids?: string;
  externalid?: string;
  code?: string;
  name: string;
  company?: string;
  currency?: string;
  terms?: string;
  billing_code?: string;
  invoice_layoutid?: string;
  invoice_prefix?: string;
  invoice_text?: string;
  rate?: number;
  statements?: '1' | '0';
  ta_include?: '1' | '0';
  te_include?: '1' | '0';
  pb_approver?: string;
  tb_approvalprocess?: string;
  tb_approver?: string;
  pr_approvalprocess?: string;
  company_sizeid?: string;
  nickname?: string;
  flags?: Flags;
  created: DateContainer;
  createtime?: DateContainer;
  updated: DateContainer;
  updatetime?: DateContainer;
  logintime?: DateContainer;
  rpc_api_updated?: DateContainer;
  userid?: string;
}

export interface Flags {
  Flag: { name: string; setting: string }[];
}

export interface CustomerWrapper {
  Customer: Customer;
  status: string;
}