---
name: Team-Level Composite Flows
summary: Advanced workflows, including reporting on total time per team/project, under-utilized members, and combining bookings with timesheet data for holistic views.
triggers:
  - "How much time has the team logged on Project Alpha?"
  - "Is anyone on my project under-utilized?"
  - "What projects is John working on and how's his timesheet?"
mapped_tools:
  - search_projects(query)
  - list_project_assignments(project_id)
  - list_time_entries(user_id, project_id)
  - get_booking_summary(user_id, start_date, end_date)
  - list_bookings(user_id)
  - list_timesheets(user_id)
edge_handling:
  - May require looping all project members, filtering by assignments/status, and handling missing time entries.
examples:
  - Team rollup for all logged hours on Alpha
  - List under-utilized people for Project Beta
  - John’s bookings and timesheets for Q1
---
