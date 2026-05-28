---
name: Project Details & Financials
summary: Retrieve project details such as budget, stage, customer, billing, and dates.
triggers:
  - "What's the budget for project X?"
  - "When does the ABC project start and end?"
  - "Who is the customer for project X?"
  - "What are the billing details of project X?"
mapped_tools:
  - get_project(project_id)
edge_handling:
  - Project not found? Prompt for re-try.
  - Not all financial fields may be present on all projects.
examples:
  - Show me the Acme budget
  - What is the stage for Redesign 2025?
---
