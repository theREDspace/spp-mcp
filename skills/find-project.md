---
name: Find a Project
summary: Quickly locate any project by name, code, or status.
triggers:
  - "Find the project called Acme Redesign"
  - "List all active projects"
  - "What projects do we have with code NS-2024?"
  - "Show me all projects (including archived)"
mapped_tools:
  - search_projects(query)
  - list_projects(active_only)
  - get_project(project_id)
edge_handling:
  - Not found? Prompt for retry or check spelling/archived status.
examples:
  - Find project NS-2024
  - Show archived projects
  - Project called Acme?
---
