---
name: project-tasks
allowed-tools: redspace-spp_generic_list redspace-spp_generic_read redspace-spp_generic_update redspace-spp_generic_add redspace-spp_generic_delete redspace-spp_list_object_types Read
description: Lists, filters, and monitors project tasks, including task details, milestones, and billable status. Use this skill when users want to see project task lists, check for milestones, find billable work, or filter active/completed tasks.
---

# Triggers
- "What tasks are on project X?"
- "Show all tasks including completed ones"
- "What milestones are defined for project X?"
- "Which tasks are billable on project X?"

# Relevant operations

Use `redspace-spp_generic_list` with `objectType=Task` and a filter for the `projectId`, `status`, or attributes like `milestone` or `billable`.

# Edge handling
- Milestone may not be set on all tasks. Filtering for milestones or billables requires project_id.

# Examples
- Show all milestones for Key Project
- Show billable tasks on Project X
