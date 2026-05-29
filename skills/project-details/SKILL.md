---
name: project-details
allowed-tools: redspace-spp_generic_list redspace-spp_generic_read redspace-spp_generic_update redspace-spp_generic_add redspace-spp_generic_delete redspace-spp_list_object_types Read
description: Retrieves full details for a project, including budget, stage, customer, billing, dates, and other metadata. Use when users ask about project specifics, financials, customer info, or timeline details.
---

# Triggers
- "What's the budget for project X?"
- "When does the ABC project start and end?"
- "Who is the customer for project X?"
- "What are the billing details of project X?"

# Relevant operations

Use `redspace-spp_generic_read` with `objectType=Project` and the project ID to retrieve budget, customer, billing, and metadata fields.

# Edge handling
- Project not found? Prompt for re-try.
- Not all financial fields may be present on all projects.

# Examples
- Show me the Acme budget
- What is the stage for Redesign 2025?
