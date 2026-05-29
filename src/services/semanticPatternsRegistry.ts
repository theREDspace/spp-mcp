// src/services/semanticPatternsRegistry.ts
/**
 * Registry: Common LLM intents -> canonical tool/object/query pattern
 * This is explicitly for LLM/agent discoverability (referenced in /tools/describe and for query correction).
 */
export type SemanticPattern = {
  intent: string;
  description: string;
  correct_usage: string;
  example: any;
};

// Hardcoded for v1. Expand as needed:
export const semanticPatterns: SemanticPattern[] = [
  {
    intent: 'users in project',
    description: 'Find all users associated with a given project.' ,
    correct_usage: 'Query Booking with {projectid: X}, then join User on userid to retrieve users.',
    example: {
      tool: 'generic_list',
      objectType: 'Booking',
      filter: { projectid: 'PROJECT_ID' },
      join: 'User',
      instructions: 'Collect all unique userid fields for project, join User.'
    }
  },
  {
    intent: 'time entries for user',
    description: 'List all time entries logged by a user.',
    correct_usage: 'Query TimeEntry with {userid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'TimeEntry',
      filter: { userid: 'USER_ID' }
    }
  },
  {
    intent: 'projects for customer',
    description: 'All projects belonging to a customer.',
    correct_usage: 'Query Project with {customerid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Project',
      filter: { customerid: 'CUSTOMER_ID' }
    }
  },
  // ...add more as needed
];
