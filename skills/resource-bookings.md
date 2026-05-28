---
name: Resource Bookings & Utilization
summary: View, compare and analyze resource bookings and utilization by person, project, or time range.
triggers:
  - "What am I booked on next week?"
  - "Who is booked on project X?"
  - "Show all bookings for user Y in June"
  - "Am I over- or under-utilized this month?"
  - "What's my utilization percentage this quarter?"
mapped_tools:
  - list_bookings(start_date, end_date, user_id, project_id)
  - get_booking_summary(start_date, end_date, user_id)
edge_handling:
  - Utilization percent may span multiple projects/users. Filtering by date/user/project recommended.
examples:
  - Compare my booked vs actual hours for Q1
  - Show bookings for me next week
---
