---
name: find-user
allowed-tools: redspace-spp_generic_list redspace-spp_generic_read redspace-spp_generic_update redspace-spp_generic_add redspace-spp_generic_delete redspace-spp_list_object_types Read
description: Finds users by name, username, or other identifying information and displays detailed user profiles. Use whenever a user asks for self-profile info, requests another user's details, or searches for a person in the system by name or identity keywords.
---

# Triggers
- "Find a user named John Smith"
- "Show me Jane Doe's user profile"
- "What's my profile information?"

# Relevant operations

Use `redspace-spp_generic_list` with `objectType=User` and a name or identifier filter to find users. Use `redspace-spp_generic_read` for a specific user's details.

# Edge handling
- If no user found, prompt for alternative spellings.

# Examples
- Show Jane Doe's profile
- Find user by username
- Who am I?
