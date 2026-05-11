// src/types/LeaveAccrualRule.ts

import { DateContainer } from "./Timesheet";

export interface LeaveAccrualRule {
  id: string;                       // [Read-only]
  active: '1' | '0';                // 1=active, defaults to 1
  name: string;                     // [Required]
  amount: number;                   // hours per period
  cap: number;                      // max hours to accrue
  period: string;                   // cap period
  timing: 'S' | 'E';                // S=start of period, E=end of period
  draw_down_when: 'R' | 'A';       // R=run, A=timesheet approved
  project_filter?: string;          // CSV of project IDs
  project_task_filter?: string;     // CSV of task IDs
  category_filter?: string;         // CSV of category IDs
  timetype_filter?: string;         // CSV of timetype IDs
  grace_days: number;               // days before accrued time lost
  lose_how: 'N' | 'A' | 'Y';        // N=never, A=anniversary, Y=end of year
  notes?: string;
  created: DateContainer;                  // [Read-only]
  updated: DateContainer;                  // [Read-only]
}

export interface LeaveAccrualRuleWrapper {
  leave_accrual_rule: LeaveAccrualRule;
}
