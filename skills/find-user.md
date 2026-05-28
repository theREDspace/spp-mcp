---
name: Search for a User
summary: Find a user by name or view detailed user profiles.
triggers:
  - "Find a user named John Smith"
  - "Show me Jane Doe's user profile"
  - "What's my profile information?"
mapped_tools:
  - search_users(query)
  - get_user(user_id) (or self)
edge_handling:
  - If no user found, prompt for alternative spellings.
examples:
  - Show Jane Doe's profile
  - Find user by username
  - Who am I?
---
