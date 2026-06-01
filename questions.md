# Redspace SPP MCP Server — Answerable Questions

A map of user questions to the generic MCP tools the agent invokes.

All reads go through `generic_list` / `generic_read`, writes through `generic_add` / `generic_update` / `generic_delete`.  
Use `describe_object_type` or `list_object_types` when the agent needs to discover fields before acting.

---

## 🙋 Identity

| User Question | Tool(s) Called |
|---|---|
| "Who am I?" / "What's my user info?" | `whoami()` |
| "What's my name / email / manager?" | `whoami()` |

---

## 🔍 Project Discovery & Details

| User Question | Tool(s) Called |
|---|---|
| "Find the project called Acme Redesign" | `generic_list(objectType: "Project", filter: { name: "Acme Redesign" })` |
| "What projects do we have with code NS-2024?" | `generic_list(objectType: "Project", filter: { code: "NS-2024" })` |
| "List all active projects" | `generic_list(objectType: "Project", filter: { active: true })` |
| "Show me all projects (including archived)" | `generic_list(objectType: "Project")` |
| "What's the budget / status / dates for project X?" | `generic_read(objectType: "Project", id: "...")` |
| "Who is the customer for project X?" | `generic_read(objectType: "Project", id: "...")` → inspect `customer` field |
| "What are the billing details of project X?" | `generic_read(objectType: "Project", id: "...")` |

---

## 👥 People & Assignments

| User Question | Tool(s) Called |
|---|---|
| "Find a user named John Smith" | `generic_list(objectType: "User", filter: { name: "John Smith" })` |
| "What's my profile information?" | `whoami()` |
| "Show me Jane Doe's user profile" | `generic_list(objectType: "User", filter: { name: "Jane Doe" })` → `generic_read(objectType: "User", id: "...")` |
| "Who is assigned to project X?" | `generic_list(objectType: "ResourceProfile", filter: { projectid: "..." })` |
| "What is the allocation percentage for people on project X?" | `generic_list(objectType: "ResourceProfile", filter: { projectid: "..." })` → inspect `allocation` field |
| "Show resource profile details for a specific assignment" | `generic_read(objectType: "ResourceProfile", id: "...")` |

---

## ⏱️ Time Tracking & Timesheets

| User Question | Tool(s) Called |
|---|---|
| "What did I log this week?" | `generic_list(objectType: "TimeEntry", filter: { ..current week dates.. }, preferSelf: true)` |
| "Show my time entries from last week" | `generic_list(objectType: "TimeEntry", filter: { ..last week dates.. }, preferSelf: true)` |
| "How many hours did I log on project X this month?" | `generic_list(objectType: "TimeEntry", filter: { projectid: "...", ..date range.. })` |
| "What did user Y work on between Jan 1–15?" | `generic_list(objectType: "TimeEntry", filter: { userid: "...", startdate: "2026-01-01", enddate: "2026-01-15" })` |
| "Show my most recent timesheet" | `generic_list(objectType: "Timesheet", preferSelf: true)` → pick most recent |
| "What's the status of timesheet #123?" | `generic_read(objectType: "Timesheet", id: "123")` |
| "List all my submitted timesheets" | `generic_list(objectType: "Timesheet", filter: { status: "submitted" }, preferSelf: true)` |
| "Show my rejected timesheets from Q1 2026" | `generic_list(objectType: "Timesheet", filter: { status: "rejected", startdate: "2026-01-01", enddate: "2026-03-31" }, preferSelf: true)` |
| "Log 8 hours on project X for today" | `generic_add(objectType: "TimeEntry", payload: { projectid: "...", date: "...", hours: 8, ... })` |
| "Update yesterday's time entry to 6.5 h" | `generic_update(objectType: "TimeEntry", id: "...", changes: { hours: 6.5 })` |
| "Delete this time entry" | `generic_delete(objectType: "TimeEntry", id: "...")` |
| "Submit my timesheet" | `generic_update(objectType: "Timesheet", id: "...", changes: { status: "submitted" })` |

---

## 📅 Resource Bookings & Utilization

| User Question | Tool(s) Called |
|---|---|
| "What am I booked on next week?" | `generic_list(objectType: "Booking", filter: { ..next week dates.. }, preferSelf: true)` |
| "Who is booked on project X?" | `generic_list(objectType: "Booking", filter: { projectid: "..." })` |
| "Show all bookings for user Y in June" | `generic_list(objectType: "Booking", filter: { userid: "...", startdate: "2026-06-01", enddate: "2026-06-30" })` |
| "Am I over- or under-utilized this month?" | `generic_list(objectType: "BookingSummary", filter: { ..current month.. }, preferSelf: true)` |
| "Compare my booked vs actual hours for Q1" | `generic_list(objectType: "BookingSummary", filter: { startdate: "2026-01-01", enddate: "2026-03-31" }, preferSelf: true)` |
| "What's my utilization percentage this quarter?" | `generic_list(objectType: "BookingSummary", filter: { ..quarter dates.. }, preferSelf: true)` |

---

## ✅ Project Tasks

| User Question | Tool(s) Called |
|---|---|
| "What tasks are on project X?" | `generic_list(objectType: "Task", filter: { projectid: "..." })` |
| "Show all tasks including completed ones" | `generic_list(objectType: "Task", filter: { projectid: "...", active: false })` |
| "What milestones are defined for project X?" | `generic_list(objectType: "Task", filter: { projectid: "..." })` → filter by `classification: 'milestone'` |
| "What's the completion percentage on tasks for project X?" | `generic_list(objectType: "Task", filter: { projectid: "..." })` → inspect `percentcomplete` |
| "Which tasks are billable on project X?" | `generic_list(objectType: "Task", filter: { projectid: "..." })` → inspect `isbillable` |

---

## 🧾 Invoices & Slips

| User Question | Tool(s) Called |
|---|---|
| "Show invoices for project X" | `generic_list(objectType: "Invoice", filter: { projectid: "..." })` |
| "What's the status of invoice #456?" | `generic_read(objectType: "Invoice", id: "456")` |
| "List all open slips for project X" | `generic_list(objectType: "Slip", filter: { projectid: "...", status: "open" })` |

---

## 🔎 Schema Discovery

| User Question | Tool(s) Called |
|---|---|
| "What object types are available?" | `list_object_types()` |
| "What fields does a TimeEntry have?" | `describe_object_type(objectType: "TimeEntry")` |
| "What are required fields to create a Project?" | `describe_object_type(objectType: "Project")` |

---

## 🔗 Multi-tool Composite Questions

| User Question | Tools Called (in sequence) |
|---|---|
| "How much time has the team logged on Project Alpha?" | `generic_list(Project, filter: name)` → `generic_list(ResourceProfile, filter: projectid)` → `generic_batch_list(TimeEntry, filter: [per user+project])` |
| "Is anyone on my project under-utilized?" | find project → `generic_list(ResourceProfile, ...)` → `generic_list(BookingSummary, ...)` per assignee |
| "What projects is John working on and how's his timesheet?" | `generic_list(User, ...)` → `generic_list(Booking, filter: userid)` + `generic_list(Timesheet, filter: userid)` |
| "Add a time entry to the same task as last week" | `generic_list(TimeEntry, ..last week..)` → extract taskid/projectid → `generic_add(TimeEntry, ...)` |
