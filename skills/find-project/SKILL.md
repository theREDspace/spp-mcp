---
name: find-project
allowed-tools: redspace-spp_generic_list redspace-spp_generic_read redspace-spp_generic_update redspace-spp_generic_add redspace-spp_generic_delete redspace-spp_list_object_types Read
description: Quickly locates any project by name, code, or status using project search tools. Use when the user asks to find, list, or filter projects by name, code, or archived/active status, or requests a project's presence by description or summary.
---

# Triggers
- "Find the project called Acme Redesign"
- "List all active projects"
- "What projects do we have with code NS-2024?"
- "Show me all projects (including archived)"

# Relevant operations

Use `redspace-spp_generic_list` with `objectType=Project` and the appropriate filter (e.g., { name, code, status }). For details, use `redspace-spp_generic_read` with the project ID.

# Edge handling
- Not found? Prompt for retry or check spelling/archived status.

# Examples
- Find project NS-2024
- Show archived projects
- Project called Acme?
