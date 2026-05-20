# Redspace SPP MCP Server — Answerable Questions

A complete map of user questions to the MCP tools the client invokes.

---

## 🔍 Project Discovery & Details

| User Question | Tool(s) Called |
|---|---|
| "Find the project called Acme Redesign" | `search_projects(query: "Acme Redesign")` |
| "What projects do we have with code NS-2024?" | `search_projects(query: "NS-2024")` |
| "List all active projects" | `list_projects(active_only: true)` |
| "Show me all projects (including archived)" | `list_projects(active_only: false)` |
| "What's the budget for project X?" | `get_project(project_id: "...")` |
| "When does the ABC project start and end?" | `get_project(project_id: "...")` |
| "What's the status/stage of project X?" | `get_project(project_id: "...")` |
| "Who is the customer for project X?" | `get_project(project_id: "...")` |
| "What are the billing details of project X?" | `get_project(project_id: "...")` |

---

## 👥 People & Assignments

| User Question | Tool(s) Called |
|---|---|
| "Find a user named John Smith" | `search_users(query: "John Smith")` |
| "What's my profile information?" | `get_user()` (no user_id = self) |
| "Show me Jane Doe's user profile" | `search_users(query: "Jane Doe")` → `get_user(user_id: "...")` |
| "Who is assigned to project X?" | `list_project_assignments(project_id: "...")` |
| "What is the allocation percentage for people on project X?" | `list_project_assignments(project_id: "...")` |
| "Are there any inactive assignments on project X?" | `list_project_assignments(project_id: "...", include_inactive: true)` |

---

## ⏱️ Time Tracking & Timesheets

| User Question | Tool(s) Called |
|---|---|
| "What did I log this week?" | `list_time_entries(week_offset: 0)` |
| "Show my time entries from last week" | `list_time_entries(week_offset: 1)` |
| "How many hours did I log on project X this month?" | `list_time_entries(project_id: "...", start_date: "...", end_date: "...")` |
| "What did user Y work on between Jan 1-15?" | `list_time_entries(user_id: "...", start_date: "...", end_date: "...")` |
| "Show my most recent timesheet" | `get_timesheet()` (no ID = most recent) |
| "What's the status of timesheet #123?" | `get_timesheet(timesheet_id: "123")` |
| "List all my submitted timesheets" | `list_timesheets(status: "submitted")` |
| "Show my rejected timesheets from Q1 2026" | `list_timesheets(status: "rejected", start_date: "2026-01-01", end_date: "2026-03-31")` |
| "How many hours total on my latest timesheet?" | `get_timesheet()` → inspect `total` field |
| "Show detailed breakdown by project/task for my timesheet" | `get_timesheet(timesheet_id: "...")` |

---

## 📅 Resource Bookings & Utilization

| User Question | Tool(s) Called |
|---|---|
| "What am I booked on next week?" | `list_bookings(start_date: "...", end_date: "...")` |
| "Who is booked on project X?" | `list_bookings(project_id: "...")` |
| "Show all bookings for user Y in June" | `list_bookings(user_id: "...", start_date: "2026-06-01", end_date: "2026-06-30")` |
| "Am I over- or under-utilized this month?" | `get_booking_summary(start_date: "...", end_date: "...")` |
| "Compare my booked vs actual hours for Q1" | `get_booking_summary(start_date: "2026-01-01", end_date: "2026-03-31")` |
| "What's my utilization percentage this quarter?" | `get_booking_summary(start_date: "...", end_date: "...")` |
| "Which projects am I over/under on booked hours?" | `get_booking_summary(...)` → inspect `by_project` array |

---

## ✅ Project Tasks

| User Question | Tool(s) Called |
|---|---|
| "What tasks are on project X?" | `list_project_tasks(project_id: "...")` |
| "Show all tasks including completed ones" | `list_project_tasks(project_id: "...", active_only: false)` |
| "What milestones are defined for project X?" | `list_project_tasks(project_id: "...")` → filter by `classification: 'milestone'` |
| "What's the completion percentage on tasks for project X?" | `list_project_tasks(project_id: "...")` → inspect `percent_complete` |
| "Which tasks are billable on project X?" | `list_project_tasks(project_id: "...")` → inspect `is_billable` |

---

## 🔗 Multi-tool Composite Questions

| User Question | Tools Called (in sequence) |
|---|---|
| "How much time has the team logged on Project Alpha?" | `search_projects(query: "Alpha")` → `list_project_assignments(project_id)` → `list_time_entries(user_id, project_id)` per user |
| "Is anyone on my project under-utilized?" | `search_projects(...)` → `list_project_assignments(...)` → `get_booking_summary(user_id, ...)` per assignee |
| "What projects is John working on and how's his timesheet?" | `search_users(query: "John")` → `list_bookings(user_id)` + `list_timesheets(user_id)` |
