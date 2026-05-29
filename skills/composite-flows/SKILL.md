---
name: composite-flows
allowed-tools: redspace-spp_generic_list redspace-spp_generic_read redspace-spp_generic_update redspace-spp_generic_add redspace-spp_generic_delete redspace-spp_list_object_types Read
description: Provides advanced composite workflows, including team and project time reporting, identifying under-utilized members, and combining bookings with timesheet data for holistic utilization and contribution analysis. Use when users need team-level, cross-cutting metrics, member-by-member breakdowns, or mixed views across assignments, bookings, and timesheets.
---

# Triggers
- "How much time has the team logged on Project Alpha?"
- "Is anyone on my project under-utilized?"
- "What projects is John working on and how's his timesheet?"

# Relevant operations

Use `redspace-spp_generic_list` to find and list projects, users, time entries, bookings or timesheets by specifying the correct objectType and filter. Example composite query steps:
- List projects: objectType=Project, filtering as needed.
- List project assignments: objectType=ProjectAssignment, filter by projectId.
- List time entries: objectType=TimeEntry, filter by userId/projectId.
- Summarize bookings: objectType=Booking, filter by userId and date range.
Combine these with agent-side logic to roll up, cross-reference, or perform calculations.

# Edge handling
- May require looping all project members, filtering by assignments/status, and handling missing time entries.

# Examples
- Team rollup for all logged hours on Alpha
- List under-utilized people for Project Beta
- John’s bookings and timesheets for Q1
