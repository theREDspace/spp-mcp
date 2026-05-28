---
name: Personal Timesheet Navigation
summary: Review, submit, and manage your timesheets and time entries, by week, project, or other attributes.
triggers:
  - "What did I log this week?"
  - "Show my time entries from last week"
  - "Show my most recent timesheet"
  - "Update yesterday's time entry to 6.5h"
  - "Delete these 3 entries I accidentally logged"
  - "Submit my timesheet for this week"
mapped_tools:
  - list_time_entries(week_offset, project_id, user_id, dates)
  - get_timesheet(timesheet_id)
  - list_timesheets(status, dates)
  - add_time_entry(entries)
  - update_time_entry(entry_id, hours)
  - delete_time_entry(entry_ids)
  - submit_timesheet(timesheet_id)
  - clone_timesheet(source_timesheet_id, exclude_days)
edge_handling:
  - Time entry must be within current/timesheet week. Exceeding hours may need timesheet update/submission.
examples:
  - Log 8h per day for ProjectX, week of May 11
  - Show my rejected timesheets from Q1 2026
---
