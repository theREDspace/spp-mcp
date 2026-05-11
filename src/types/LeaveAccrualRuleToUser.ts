// src/types/LeaveAccrualRuleToUser.ts

import { DateContainer } from "./Timesheet";

export interface LeaveAccrualRuleToUser {
  id: string;                        // [Read-only]
  leave_accrual_ruleid: string;      // [Required]
  userid: string;                    // [Required]
  start_date: DateContainer;                // YYYY-MM-DD [Required]
  end_date?: DateContainer;                 // YYYY-MM-DD
  transfer_balance_to?: string;      // ID of another rule_to_user
  created: DateContainer;                   // [Read-only]
  updated: DateContainer;                   // [Read-only]
}

export interface LeaveAccrualRuleToUserWrapper {
  leave_accrual_rule_to_user: LeaveAccrualRuleToUser;
}
