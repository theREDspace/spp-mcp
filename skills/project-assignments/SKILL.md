---
name: project-assignments
allowed-tools: redspace-spp_generic_list redspace-spp_generic_read redspace-spp_generic_update redspace-spp_generic_add redspace-spp_generic_delete redspace-spp_list_object_types Read
description: Lists project team assignments, showing active/inactive participants and allocation percentages per project. Use when users want to know who is assigned, each member's allocation percent, or to find inactive assignees for a specific project.
---

# Triggers
- "Who is assigned to project X?"
- "What is the allocation percentage for people on project X?"
- "Are there any inactive assignments on project X?"

# Relevant operations

Use `redspace-spp_generic_list` with `objectType=ProjectAssignment` and `projectId` (plus `status` as needed) for team assignments or allocations.

# Edge handling
- If project has no assignments, suggest verifying project or status.

# Examples
- List assignments for Redesign
- Who is on project X?
