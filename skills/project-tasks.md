---
name: List Project Tasks
summary: List, filter, and monitor project tasks, including milestones and billable work.
triggers:
  - "What tasks are on project X?"
  - "Show all tasks including completed ones"
  - "What milestones are defined for project X?"
  - "Which tasks are billable on project X?"
mapped_tools:
  - list_project_tasks(project_id, active_only)
  - filter/classification: milestone or billable
edge_handling:
  - Milestone may not be set on all tasks. Filtering for milestones or billables requires project_id.
examples:
  - Show all milestones for Key Project
  - Show billable tasks on Project X
---
