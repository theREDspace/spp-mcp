---
name: resource-bookings
allowed-tools: redspace-spp_generic_list redspace-spp_generic_read redspace-spp_generic_update redspace-spp_generic_add redspace-spp_generic_delete redspace-spp_list_object_types Read
description: Views, compares, and analyzes resource bookings and utilization by person, project, or time range. Use when users ask about booking details, utilization metrics, or want breakdowns by user, project, or date range.
---

# Triggers
- "What am I booked on next week?"
- "Who is booked on project X?"
- "Show all bookings for user Y in June"
- "Am I over- or under-utilized this month?"
- "What's my utilization percentage this quarter?"

# Relevant operations

Use `redspace-spp_generic_list` with `objectType=Booking` and appropriate filters for user, project, and date ranges. Calculate utilization using results.

# Edge handling
- Utilization percent may span multiple projects/users. Filtering by date/user/project recommended.

# Examples
- Compare my booked vs actual hours for Q1
- Show bookings for me next week
