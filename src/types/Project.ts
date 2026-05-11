import { DateContainer } from "./Timesheet";
// Includes PBA, Agreement and Project + wrappers


export interface Project {
  // identity  
  id:                string;
  code:              string;
  name:              string;
  picklist_label:    string;
  externalid:        string;
  userid:            string;

  // status & staging
  active:            number;
  project_stageid:   string;
  deleted:           string;
  message:           string;

  // financials
  currency:          string;
  budget:            number;
  budget_time:       number;
  cost_centerid:     string;
  customerid:        string;
  customer_name:     string;

  // dates
  start_date:        DateContainer;
  finish_date:       DateContainer;
  updated:           DateContainer;
  created:           DateContainer;
  acct_date:         DateContainer;

  // approvers & workflow (string flags)
  br_approvalprocess:    string;
  po_approvalprocess:    string;
  te_approvalprocess:    string;
  az_approvalprocess:    string;
  rm_approvalprocess:    string;
  ta_approvalprocess:    string;
  pr_approvalprocess:    string;
  az_approver:          string;
  br_approver:          string;

  // misc
  notes:             string;
  newsfeedid:        number;
  rate:              number;
  attachmentid:      string;
  auto_bill:       number;
  auto_bill_cap: number;
  auto_bill_cap_value: number;
  auto_bill_override: number;
  billing_code:    string;
  billing_contactid: string;
  category_filter: string;
  copy_approvers: number;
  custom_copy_fields: '1' | '0';
  copy_dashboard_settings: number;
  copy_invoice_layout_settings: '1' | '0';
  copy_issues: '1' | '0';
  copy_loaded_cost: '1' | '0';
  copy_notification_settings: '1' | '0';
  copy_project_billing_auto_settings: '1' | '0';
  copy_project_billing_rules: '1' | '0';
  copy_project_pricing: '1' | '0';
  copy_revenue_recognition_rules: '1' | '0';
  copy_revenue_recognition_auto_settings: '1' | '0';
  create_workspace: '1' | '0';
  credit_invoice_layout_id: string;
  current_dr: number;
  current_wip: number;
  exported_dr: number;
  exported_wip: number;
  filtersetids: string;
  hierarchy_node_ids: string;
  invoice_layoutid: string;
  invoice_text: string;
  is_portfolio_project: '1' | '0';
  is_template: '1' | '0';
  locationid: string;
  main_contactid: string;
  msp_link_type: string;
  no_dirty: '1' | '0';
  notify_assignees: '1' | '0';
  notify_issue_assigned_to: '1' | '0';
  notify_issue_closed_assigned_to: '1' | '0';
  notify_issue_closed_customer_owner: '1' | '0';
  notify_issue_closed_project_owner: '1' | '0';
  notify_issue_created_customer_owner: '1' | '0';
  notify_issue_created_project_owner: '1' | '0';
  notify_owner: '1' | '0';
  notify_sr_submitted_project_owner: '1' | '0';
  only_owner_can_edit: '1' | '0';
  originating_id: string;
  payroll_type_filter: string;
  pm_approver_1: string;
  pm_approver_2: string;
  pm_approver_3: string;
  po_approval_process: string;
  po_approver: string;
  portfolio_projectid: string;
  project_locationid: string;
  rate_cardid: string;
  rm_approver: string;
  rv_approvalprocess: string;
  rv_approver: string;
  sga_labor: number;
  shipping_contact_id: string;
  sold_to_contact_id: string;
  sync_workspace: '1' | '0';
  ta_approver: string;
  ta_include: '1' | '0';
  tax_location_name: string;
  tax_locationid: string;
  tb_approvalprocess: string;
  tb_approver: string;
  te_allowance_approvalprocess: string;
  te_allowance_approver: string;
  te_approver: string;
  te_include: '1' | '0';
  template_project_id: string;
  timetype_filter: string;
  user_filter: string;


  [key: string]: string | number | DateContainer;
}

export interface ProjectBillingRule {
    id: string;
    agreementid: string;
    accounting_period_id: string;
    acct_date: DateContainer;
    acct_date_how: string;
    active: number;
    adjust_if_capped: number;
    amount: number;
    assigned_user: string;
    backout_gst: number;
    cap: number;
    cap_by_customerpo: number;
    cap_hours: number;
    category_1id: string;
    category_2id: string;
    category_3id: string;
    category_4id: string;
    category_5id: string;
    category_filter: string;
    category_when: string;
    categoryid: string;
    cost_center_id: string;
    created: DateContainer;
    currency: string;
    customerid: string;
    customerpoid: string;
    daily_cap_hours: number;
    daily_cap_is_per_user: number;
    daily_cap_period: string;
    daily_rate_multiplier: number;
    daily_roll_to_next: number;
    description: string;
    end_date: DateContainer;
    end_milestone: string;
    exclude_archived_ts: number;
    exclude_non_billable: number;
    exclude_non_billable_task: number;
    exclude_non_reimbursible: number;
    extra_data: string;
    item_filter: string;
    job_code_filter: string;
    markup: number;
    markup_category: string;
    markup_type: string;
    notes: string;
    name: string;
    percent: number;
    percent_how: string;
    position: number;
    product_filter: string;
    project_task_filter: string;
    project_task_id: string;
    projectid: string;
    rate_cardid: string;
    rate_from: string;
    rate_multiplier: number;
    repeatid: string;
    round_rules: string;
    slip_stageid: string;
    start_date: DateContainer;
    start_milestone: string;
    stop_if_capped: number;
    ticket_maximus: number;
    timetype_filter: string;
    type: string; // e.g., "T" for time, "E" for expense
    updated: DateContainer;
    user_filter: string;


  }

  export interface PBAResponse {
    agreementId: string;
  }

  // ProjectWrapper
export interface ProjectWrapper {
    Project: Project;
    status:  string;
  }
  // ProjectBillingRuleWrapper
  export interface ProjectBillingRuleWrapper {
    Projectbillingrule: ProjectBillingRule;
    status: string;
  }
