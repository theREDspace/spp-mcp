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
  // === PROJECT & TASK QUERIES ===
  {
    intent: 'who is assigned to project',
    description: 'Find all users assigned to a project.',
    correct_usage: 'Query Projectassign with {project_id: X}, then join User on user_id.',
    example: {
      tool: 'generic_list',
      objectType: 'Projectassign',
      filter: { project_id: 'PROJECT_ID' },
      join: 'User',
      instructions: 'Extract unique user_id values, then query User for each to get names/details.'
    }
  },
  {
    intent: 'tasks for project',
    description: 'List all tasks defined for a project.',
    correct_usage: 'Query ProjectTask with {projectid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'ProjectTask',
      filter: { projectid: 'PROJECT_ID' }
    }
  },
  {
    intent: 'who is assigned to task',
    description: 'Find users assigned to a specific project task.',
    correct_usage: 'Query ProjectTaskAssign with {projecttaskid: X}, then join User on userid.',
    example: {
      tool: 'generic_list',
      objectType: 'ProjectTaskAssign',
      filter: { projecttaskid: 'TASK_ID' },
      join: 'User',
      instructions: 'Collect userid values, query User to get names.'
    }
  },
  {
    intent: 'task details and assignments',
    description: 'Get full task details with all assigned users.',
    correct_usage: 'First read ProjectTask by id, then list ProjectTaskAssign with {projecttaskid: X}, then join User.',
    example: {
      tool: 'generic_read',
      objectType: 'ProjectTask',
      id: 'TASK_ID',
      then: {
        tool: 'generic_list',
        objectType: 'ProjectTaskAssign',
        filter: { projecttaskid: 'TASK_ID' }
      }
    }
  },
  // === BOOKING & RESOURCE QUERIES ===
  {
    intent: 'user bookings on project',
    description: 'Find all bookings for a user on a specific project.',
    correct_usage: 'Query Booking with {userid: X, projectid: Y}.',
    example: {
      tool: 'generic_list',
      objectType: 'Booking',
      filter: { userid: 'USER_ID', projectid: 'PROJECT_ID' }
    }
  },
  {
    intent: 'daily bookings for user',
    description: 'Get day-by-day booking breakdown for a user.',
    correct_usage: 'Query BookingByDay with {userid: X, date range}.',
    example: {
      tool: 'generic_list',
      objectType: 'BookingByDay',
      filter: { userid: 'USER_ID' }
    }
  },
  {
    intent: 'resource requests for project',
    description: 'Find all resource requests associated with a project.',
    correct_usage: 'Query ResourceRequest with {projecyid: X} (note: typo in field name is in the actual BO).',
    example: {
      tool: 'generic_list',
      objectType: 'ResourceRequest',
      filter: { projecyid: 'PROJECT_ID' }
    }
  },
  {
    intent: 'user utilization',
    description: 'Get target utilization percentage for a user.',
    correct_usage: 'Query TargetUtilization with {user_id: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'TargetUtilization',
      filter: { user_id: 'USER_ID' }
    }
  },
  // === TIME TRACKING QUERIES ===
  {
    intent: 'time logged on project',
    description: 'Find all time entries logged against a project.',
    correct_usage: 'Query TimeEntry with {projectid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'TimeEntry',
      filter: { projectid: 'PROJECT_ID' }
    }
  },
  {
    intent: 'timesheet for user',
    description: 'Get timesheet records for a user.',
    correct_usage: 'Query Timesheet with {userid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Timesheet',
      filter: { userid: 'USER_ID' }
    }
  },
  {
    intent: 'time entries on timesheet',
    description: 'Get all time entries for a specific timesheet.',
    correct_usage: 'Query TimeEntry with {timesheetid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'TimeEntry',
      filter: { timesheetid: 'TIMESHEET_ID' }
    }
  },
  {
    intent: 'timecards for user',
    description: 'Get clock-in/clock-out records for a user.',
    correct_usage: 'Query Timecard with {userid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Timecard',
      filter: { userid: 'USER_ID' }
    }
  },
  // === ISSUES QUERIES ===
  {
    intent: 'issues for project',
    description: 'Find all issues/bugs associated with a project.',
    correct_usage: 'Query Issue with {project_id: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Issue',
      filter: { project_id: 'PROJECT_ID' }
    }
  },
  {
    intent: 'issues assigned to user',
    description: 'Find issues owned by or assigned to a specific user.',
    correct_usage: 'Query Issue with {owner_id: X} or {user_id: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Issue',
      filter: { owner_id: 'USER_ID' }
    }
  },
  {
    intent: 'open issues for project',
    description: 'Find open/unresolved issues for a project.',
    correct_usage: 'Query Issue with {project_id: X}, then filter by issue_status_id for "open" status.',
    example: {
      tool: 'generic_list',
      objectType: 'Issue',
      filter: { project_id: 'PROJECT_ID' },
      instructions: 'Filter results where date_resolved is null or issue_status_id matches "open".'
    }
  },
  // === EXPENSE QUERIES ===
  {
    intent: 'expense reports for user',
    description: 'Get all expense reports (envelopes) for a user.',
    correct_usage: 'Query Envelope with {userid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Envelope',
      filter: { userid: 'USER_ID' }
    }
  },
  {
    intent: 'expense line items in report',
    description: 'Get all tickets (expense receipts) in an expense report.',
    correct_usage: 'Query Ticket with {envelopeid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Ticket',
      filter: { envelopeid: 'ENVELOPE_ID' }
    }
  },
  {
    intent: 'expenses for project',
    description: 'Find all expense tickets charged to a project.',
    correct_usage: 'Query Ticket with {projectid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Ticket',
      filter: { projectid: 'PROJECT_ID' }
    }
  },
  // === SCHEDULE QUERIES ===
  {
    intent: 'user schedule for date',
    description: 'Get planned/booked hours for a user on a specific date.',
    correct_usage: 'Query ScheduleByDay with {user_id: X, date: Y}.',
    example: {
      tool: 'generic_list',
      objectType: 'ScheduleByDay',
      filter: { user_id: 'USER_ID' }
    }
  },
  {
    intent: 'user time off',
    description: 'Find schedule exceptions (vacation, holidays) for a user.',
    correct_usage: 'Query ScheduleException with {userid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'ScheduleException',
      filter: { userid: 'USER_ID' }
    }
  },
  {
    intent: 'user work schedule',
    description: 'Get work schedule configuration for a user.',
    correct_usage: 'Query UserWorkSchedule with {userid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'UserWorkSchedule',
      filter: { userid: 'USER_ID' }
    }
  },
  // === ORGANIZATION QUERIES ===
  {
    intent: 'users in department',
    description: 'Find all users in a department.',
    correct_usage: 'Query User with appropriate filter (department assignment varies by implementation).',
    example: {
      tool: 'generic_list',
      objectType: 'User',
      instructions: 'SPP may link users to departments via custom fields or hierarchy. Check User fields for departmentid.'
    }
  },
  {
    intent: 'hierarchy nodes',
    description: 'Get nodes in a classification hierarchy.',
    correct_usage: 'Query HierarchyNode with {hierarchyid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'HierarchyNode',
      filter: { hierarchyid: 'HIERARCHY_ID' }
    }
  },
  {
    intent: 'workspace members',
    description: 'Find workspaces owned by or accessible to a user.',
    correct_usage: 'Query Workspace with {userid: X} for owned workspaces.',
    example: {
      tool: 'generic_list',
      objectType: 'Workspace',
      filter: { userid: 'USER_ID' }
    }
  },
  // === TODO & EVENT QUERIES ===
  {
    intent: 'todos for user',
    description: 'Get to-do items assigned to a user.',
    correct_usage: 'Query Todo with {userid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Todo',
      filter: { userid: 'USER_ID' }
    }
  },
  {
    intent: 'events for user',
    description: 'Get logged events/activities for a user.',
    correct_usage: 'Query Event with {userid: X}.',
    example: {
      tool: 'generic_list',
      objectType: 'Event',
      filter: { userid: 'USER_ID' }
    }
  }
];
