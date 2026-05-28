---
name: View Project Assignments
summary: See team assignments, percentages, or inactive assignees for a project.
triggers:
  - "Who is assigned to project X?"
  - "What is the allocation percentage for people on project X?"
  - "Are there any inactive assignments on project X?"
mapped_tools:
  - list_project_assignments(project_id [, include_inactive])
edge_handling:
  - If project has no assignments, suggest verifying project or status.
examples:
  - List assignments for Redesign
  - Who is on project X?
---
