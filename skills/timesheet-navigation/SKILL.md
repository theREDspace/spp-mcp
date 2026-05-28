---
name: timesheet-navigation
allowed-tools: redspace-spp_generic_list redspace-spp_generic_read redspace-spp_generic_update redspace-spp_generic_add redspace-spp_generic_delete redspace-spp_list_object_types Read
description: Enables users to review, submit, and manage personal timesheets and time entries by week, project, or other criteria. Use when users request to log, edit, or submit timesheets, or seek specific time entry information.
---

# Triggers
- "What did I log this week?"
- "Show my time entries from last week"
- "Show my most recent timesheet"
- "Update yesterday's time entry to 6.5h"
- "Delete these 3 entries I accidentally logged"
- "Submit my timesheet for this week"

# Relevant operations

Use `redspace-spp_generic_list` with `objectType=TimeEntry` or `Timesheet` to retrieve time entries or sheets, and `redspace-spp_generic_update`/`add`/`delete` to modify or submit entries and sheets.

# Edge handling
- Time entry must be within current/timesheet week. Exceeding hours may need timesheet update/submission.

# Examples
- Log 8h per day for ProjectX, week of May 11
- Show my rejected timesheets from Q1 2026
