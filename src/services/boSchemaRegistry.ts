// boSchemaRegistry.ts
// Metadata registry for Business Objects (BOs)
// Used for: generic CRUD tool schema, validation, and agent/LLM discoverability

interface BOFieldSchema {
  name: string;
  type: string;
  required?: boolean;
}

interface BORelationship {
  field: string;                    // The foreign key field in this BO
  relatesTo: string;                // The target BO name
  type: 'belongsTo' | 'hasMany';    // Relationship type
  description: string;              // Human-readable description
}

interface BOSchema {
  typeFile: string;
  canonicalId: string;
  alternateIds: string[];
  requiredFields: string[];
  fields: BOFieldSchema[];
  filterExample?: Record<string, any>;
  examplePayload?: Record<string, any>;
  relationships?: BORelationship[];  // NEW: Explicit relationship metadata
}

export const boSchemaRegistry: Record<string, BOSchema> = {
  BookingSummary: {
    typeFile: 'src/types/BookingSummary.ts',
    canonicalId: 'user_id',
    alternateIds: ['project_id', 'id'],
    requiredFields: [
      'start_date', 'end_date', 'user_id', 'total_actual_hours', 'total_booked_hours', 'utilization_percentage'
    ],
    fields: [
      { name: 'user_id', type: 'string', required: false },
      { name: 'project_id', type: 'string', required: false },
      { name: 'start_date', type: 'DateContainer', required: true },
      { name: 'end_date', type: 'DateContainer', required: true },
      { name: 'total_booked_hours', type: 'number', required: true },
      { name: 'total_actual_hours', type: 'number', required: true },
      { name: 'utilization_percentage', type: 'number', required: true },
      { name: 'by_project', type: 'BookingProjectBreakdown[]', required: false },
      { name: 'by_user', type: 'BookingSummary[]', required: false }
    ],
    filterExample: { user_id: 'U123', start_date: {Date: {year: 2026, month: 5, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, end_date: {Date: {year: 2026, month: 6, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}} },
    examplePayload: {
      user_id: 'U123',
      start_date: {Date: {year: 2026, month: 5, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}},
      end_date: {Date: {year: 2026, month: 6, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}},
      total_booked_hours: 120,
      total_actual_hours: 110,
      utilization_percentage: 91.67,
      by_project: [
        { project_id: 'P111', project_name: 'Alpha', booked_hours: 50, actual_hours: 48, utilization_percentage: 96 },
        { project_id: 'P222', project_name: 'Beta', booked_hours: 70, actual_hours: 62, utilization_percentage: 88.6 }
      ]
    }
  },
  TimeEntry: {
    typeFile: 'src/types/TimeEntry.ts',
    canonicalId: 'id',
    alternateIds: ['userid', 'timesheetid', 'projectid'],
    requiredFields: ['id', 'userid', 'date', 'hours'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'userid', type: 'string', required: true },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'hours', type: 'number', required: true },
      { name: 'timesheetid', type: 'string', required: false },
      { name: 'projectid', type: 'string', required: false },
      { name: 'notes', type: 'string', required: false }
    ],
    filterExample: { userid: 'U321', projectid: 'P123', date: {Date: {year: 2026, month: 3, day: 10, hour: 0, minute: 0, second: 0, timezone: 'UTC'}} },
    examplePayload: { id: 'TE42', userid: 'U321', date: {Date: {year: 2026, month: 3, day: 10, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, timesheetid: 'TS123', hours: 7.5, projectid: 'P123', notes: 'Project X kickoff' },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User who logged the time' },
      { field: 'timesheetid', relatesTo: 'Timesheet', type: 'belongsTo', description: 'Associated timesheet' },
      { field: 'projectid', relatesTo: 'Project', type: 'belongsTo', description: 'Project the time was logged against' }
    ]
  },
  Project: {
    typeFile: 'src/types/Project.ts',
    canonicalId: 'id',
    alternateIds: ['code', 'externalid'],
    requiredFields: [
      'id', 'code', 'name', 'userid'
    ],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'code', type: 'string' },
      { name: 'externalid', type: 'string' },
      { name: 'name', type: 'string', required: true },
      { name: 'userid', type: 'string' }
      // ...snip full type listing for brevity...
    ],
    filterExample: { active: 1, name: 'Project XY' },
    examplePayload: { code: 'P-12121', name: 'Test Project', userid: 'U102' }
  },
  User: {
    typeFile: 'src/types/User.ts',
    canonicalId: 'id',
    alternateIds: ['code', 'externalid', 'external_id'],
    requiredFields: [ 'id', 'name', 'externalid' ],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'code', type: 'string' },
      { name: 'externalid', type: 'string' },
      { name: 'external_id', type: 'string' },
      { name: 'name', type: 'string', required: true }
      // ...
    ],
    filterExample: { active: 1, nickname: 'bob' },
    examplePayload: { name: 'Bob', externalid: 'ext42' }
  },
  Slip: {
    typeFile: 'src/types/Slip.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: [ 'id' ],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'userid', type: 'string' },
      { name: 'projectid', type: 'string' },
    ],
    filterExample: { projectid: 'P222', userid: 'U789' },
    examplePayload: { userid: 'U789', projectid: 'P222', hour: 6 }
  },
  Customer: {
    typeFile: 'src/types/Customer.ts',
    canonicalId: 'id',
    alternateIds: ['externalid', 'code'],
    requiredFields: ['id', 'name'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'externalid', type: 'string' },
      { name: 'name', type: 'string', required: true },
    ],
    filterExample: { name: 'Acme Corp' },
    examplePayload: { name: 'Acme Test', externalid: 'acme-001' }
  },
  Timesheet: {
    typeFile: 'src/types/Timesheet.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'userid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'userid', type: 'string', required: true },
    ],
    filterExample: { userid: 'U789', status: 'X' },
    examplePayload: { userid: 'U789', name: 'Weekly Entry' }
  },
  Task: {
    typeFile: 'src/types/Task.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'date', 'projectid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'projectid', type: 'string' },
    ],
    filterExample: { projectid: 'P222' },
    examplePayload: { projectid: 'P222', date: { Date: { year: 2023, month: 5, day: 22, hour: 0, minute: 0, second: 0, timezone: 'UTC' } } }
  },
  Invoice: {
    typeFile: 'src/types/Invoice.ts',
    canonicalId: 'id',
    alternateIds: ['externalid', 'number'],
    requiredFields: ['id', 'customerid', 'date'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'externalid', type: 'string' },
      { name: 'number', type: 'string' },
      { name: 'customerid', type: 'string' },
    ],
    filterExample: { status: 'O', customerid: 'C101' },
    examplePayload: { customerid: 'C101', date: { Date: { year: 2023, month: 1, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC' } } }
  },
  ApprovalLine: {
    typeFile: 'src/types/ApprovalLine.ts',
    canonicalId: 'id',
    alternateIds: ['approvalid'],
    requiredFields: ['id', 'action', 'date'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'approvalid', type: 'string' },
      { name: 'action', type: 'string' },
      { name: 'date', type: 'DateContainer' },
    ],
    filterExample: { status: 'S', userid: 'U222' },
    examplePayload: { approvalid: 'A456', action: 'S', date: { Date: { year: 2023, month: 6, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC' } } }
  },
  Booking: {
    typeFile: 'src/types/Booking.ts',
    canonicalId: 'id',
    alternateIds: ['externalid'],
    requiredFields: ['id', 'projectid', 'customerid', 'startdate', 'enddate', 'userid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'externalid', type: 'string' },
      { name: 'projectid', type: 'string' },
      { name: 'customerid', type: 'string' },
      { name: 'startdate', type: 'DateContainer' },
      { name: 'enddate', type: 'DateContainer' },
      { name: 'userid', type: 'string' },
    ],
    filterExample: { projectid: 'P333' },
    examplePayload: { projectid: 'P333', customerid: 'C111', startdate: { Date: { year: 2023, month: 4, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC' } }, enddate: { Date: { year: 2023, month: 4, day: 7, hour: 0, minute: 0, second: 0, timezone: 'UTC' } }, userid: 'U888' },
    relationships: [
      { field: 'projectid', relatesTo: 'Project', type: 'belongsTo', description: 'Project being booked' },
      { field: 'customerid', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User assigned to booking' }
    ]
  },
  ResourceProfile: {
    typeFile: 'src/types/ResourceProfile.ts',
    canonicalId: 'id',
    alternateIds: ['externalid'],
    requiredFields: ['id', 'userid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'userid', type: 'string' },
      { name: 'externalid', type: 'string' }
    ],
    filterExample: { userid: 'U42' },
    examplePayload: { userid: 'U42', externalid: 'RP881' },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User this resource profile belongs to' }
    ]
  },
  // === PHASE 1: PROJECT MANAGEMENT BOs ===
  ProjectTask: {
    typeFile: 'src/types/ProjectTask.ts',
    canonicalId: 'id',
    alternateIds: ['projectid', 'externalid'],
    requiredFields: ['id', 'projectid', 'name', 'classification', 'default_category', 'project_name'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'projectid', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'classification', type: "'M' | 'P' | 'T'", required: true },
      { name: 'seq', type: 'number' },
      { name: 'start_date', type: 'DateContainer' },
      { name: 'calculated_starts', type: 'DateContainer' },
      { name: 'calculated_finishes', type: 'DateContainer' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'priority', type: 'number' },
      { name: 'percent_complete', type: 'number' },
      { name: 'planned_hours', type: 'number' },
      { name: 'task_budget_cost', type: 'number' },
      { name: 'task_budget_revenue', type: 'number' },
      { name: 'manual_task_budget', type: '0 | 1' },
      { name: 'non_billable', type: '0 | 1' },
      { name: 'all_can_assign', type: '0 | 1' },
      { name: 'use_project_assignment', type: '0 | 1' },
      { name: 'projecttask_typeid', type: 'string' },
      { name: 'timetype_filter', type: 'string' },
      { name: 'predecessors', type: 'string' },
      { name: 'predecessors_lag', type: 'string' },
      { name: 'predecessors_type', type: 'string' },
      { name: 'notes', type: 'string' },
      { name: 'parentid', type: 'string' },
      { name: 'originating_id', type: 'string' },
      { name: 'assign_user_names', type: 'string' },
      { name: 'closed', type: '0 | 1' },
      { name: 'cost_center_id', type: 'string' },
      { name: 'currency', type: 'string' },
      { name: 'customer_name', type: 'string' },
      { name: 'customerid', type: 'string' },
      { name: 'default_category', type: 'string', required: true },
      { name: 'deleted', type: '0 | 1' },
      { name: 'early_finish', type: 'DateContainer' },
      { name: 'early_start', type: 'DateContainer' },
      { name: 'estimated_hours', type: 'number' },
      { name: 'externalid', type: 'string' },
      { name: 'fnlt_date', type: 'DateContainer' },
      { name: 'id_number', type: 'string' },
      { name: 'is_a_phase', type: '0 | 1' },
      { name: 'project_name', type: 'string', required: true },
      { name: 'starts', type: 'DateContainer' }
    ],
    filterExample: { projectid: 'P123', classification: 'T' },
    examplePayload: { projectid: 'P123', name: 'Development Task', classification: 'T', default_category: 'C1', project_name: 'Alpha Project' },
    relationships: [
      { field: 'projectid', relatesTo: 'Project', type: 'belongsTo', description: 'The project this task belongs to' },
      { field: 'parentid', relatesTo: 'ProjectTask', type: 'belongsTo', description: 'Parent task or phase (if nested)' },
      { field: 'customerid', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'cost_center_id', relatesTo: 'Costcenter', type: 'belongsTo', description: 'Cost center for accounting' }
    ]
  },
  ProjectTaskAssign: {
    typeFile: 'src/types/ProjectTaskAssign.ts',
    canonicalId: 'id',
    alternateIds: ['projecttaskid', 'userid', 'externalid'],
    requiredFields: ['id', 'projecttaskid', 'userid', 'booking_id', 'job_codeid', 'project_assignment_profile_id', 'project_groupid', 'externalid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'projecttaskid', type: 'string', required: true },
      { name: 'userid', type: 'string', required: true },
      { name: 'allocation', type: 'number' },
      { name: 'pending_booking_id', type: 'number' },
      { name: 'booking_id', type: 'string', required: true },
      { name: 'job_codeid', type: 'string', required: true },
      { name: 'project_assignment_profile_id', type: 'string', required: true },
      { name: 'project_groupid', type: 'string', required: true },
      { name: 'planned_hours', type: 'number' },
      { name: 'rule_rate_override', type: 'number' },
      { name: 'rule_rate_override_currency', type: 'string' },
      { name: 'externalid', type: 'string', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { projecttaskid: 'PT456', userid: 'U789' },
    examplePayload: { projecttaskid: 'PT456', userid: 'U789', booking_id: 'B1', job_codeid: 'JC1', project_assignment_profile_id: 'PAP1', project_groupid: 'PG1', externalid: 'ext-123' },
    relationships: [
      { field: 'projecttaskid', relatesTo: 'ProjectTask', type: 'belongsTo', description: 'The task this assignment is for' },
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'The assigned user' },
      { field: 'booking_id', relatesTo: 'Booking', type: 'belongsTo', description: 'Associated booking' },
      { field: 'project_groupid', relatesTo: 'Projectgroup', type: 'belongsTo', description: 'Project group' },
      { field: 'project_assignment_profile_id', relatesTo: 'ProjectAssignmentProfile', type: 'belongsTo', description: 'Assignment profile used' }
    ]
  },
  Projectassign: {
    typeFile: 'src/types/ProjectAssign.ts',
    canonicalId: 'id',
    alternateIds: ['project_id', 'user_id'],
    requiredFields: ['id', 'allocation', 'customer_id', 'deleted', 'job_code_id', 'project_id', 'user_id'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'allocation', type: 'number', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'customer_id', type: 'string', required: true },
      { name: 'deleted', type: 'number', required: true },
      { name: 'job_code_id', type: 'string', required: true },
      { name: 'project_groupid', type: 'string' },
      { name: 'project_id', type: 'string', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'user_id', type: 'string', required: true }
    ],
    filterExample: { project_id: 'P123', user_id: 'U456' },
    examplePayload: { project_id: 'P123', user_id: 'U456', allocation: 50, customer_id: 'C1', deleted: 0, job_code_id: 'JC1' },
    relationships: [
      { field: 'project_id', relatesTo: 'Project', type: 'belongsTo', description: 'The project the user is assigned to' },
      { field: 'user_id', relatesTo: 'User', type: 'belongsTo', description: 'The assigned user' },
      { field: 'customer_id', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'project_groupid', relatesTo: 'Projectgroup', type: 'belongsTo', description: 'Project group' }
    ]
  },
  Projectgroup: {
    typeFile: 'src/types/ProjectGroup.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'active', 'assigned_users', 'name', 'notes'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'active', type: 'number', required: true },
      { name: 'assigned_users', type: 'string', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'notes', type: 'string', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { active: 1, name: 'Dev Team' },
    examplePayload: { name: 'Dev Team', active: 1, assigned_users: 'U1,U2,U3', notes: 'Development group' }
  },
  ProjectStage: {
    typeFile: 'src/types/ProjectStage.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'name', 'enable_analysis', 'enable_billing', 'enable_phase_and_task', 'enable_pricing', 'enable_project_assignments', 'enable_recognition', 'enable_team', 'enable_utilization', 'notes', 'picklist_label', 'position'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'enable_analysis', type: 'number', required: true },
      { name: 'enable_billing', type: 'number', required: true },
      { name: 'enable_phase_and_task', type: 'number', required: true },
      { name: 'enable_pricing', type: 'number', required: true },
      { name: 'enable_project_assignments', type: 'number', required: true },
      { name: 'enable_recognition', type: 'number', required: true },
      { name: 'enable_team', type: 'number', required: true },
      { name: 'enable_utilization', type: 'number', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'notes', type: 'string', required: true },
      { name: 'picklist_label', type: 'string', required: true },
      { name: 'position', type: 'number', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { name: 'Planning' },
    examplePayload: { name: 'Planning', enable_analysis: 1, enable_billing: 0, enable_phase_and_task: 1, enable_pricing: 0, enable_project_assignments: 1, enable_recognition: 0, enable_team: 1, enable_utilization: 1, notes: '', picklist_label: 'Planning Stage', position: 1 }
  },
  ProjectAssignmentProfile: {
    typeFile: 'src/types/ProjectAssignmentProfile.ts',
    canonicalId: 'id',
    alternateIds: ['customerid', 'projectid'],
    requiredFields: ['id', 'customerid', 'name', 'projectid', 'user_filter'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'customerid', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'projectid', type: 'string', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'user_filter', type: 'string', required: true }
    ],
    filterExample: { projectid: 'P123' },
    examplePayload: { customerid: 'C1', name: 'Assignment Profile', projectid: 'P123', user_filter: 'all' },
    relationships: [
      { field: 'customerid', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'projectid', relatesTo: 'Project', type: 'belongsTo', description: 'Associated project' }
    ]
  },
  // === PHASE 1: ORGANIZATION BOs ===
  Department: {
    typeFile: 'src/types/Department.ts',
    canonicalId: 'id',
    alternateIds: ['code', 'externalid'],
    requiredFields: ['id', 'name', 'active'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'code', type: 'string' },
      { name: 'name', type: 'string', required: true },
      { name: 'notes', type: 'string' },
      { name: 'externalid', type: 'string' },
      { name: 'picklist_label', type: 'string' },
      { name: 'active', type: "'1' | '0'", required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'userid', type: 'string' }
    ],
    filterExample: { active: '1', name: 'Engineering' },
    examplePayload: { name: 'Engineering', code: 'ENG', active: '1' },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'Department head/manager' }
    ]
  },
  Company: {
    typeFile: 'src/types/Company.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'company', 'base_currency'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'addr', type: 'object' },
      { name: 'base_currency', type: 'string', required: true },
      { name: 'businesstype', type: 'string' },
      { name: 'company', type: 'string', required: true },
      { name: 'currencies', type: 'string' },
      { name: 'flags', type: 'string' },
      { name: 'hide_rate', type: "'1' | '0'" },
      { name: 'is_multicurrency', type: "'1' | '0'" },
      { name: 'nickname', type: 'string' },
      { name: 'rate_from', type: 'string' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'vat_registration_number', type: 'string' },
      { name: 'workscheduleid', type: 'string' }
    ],
    filterExample: { company: 'Acme Corp' },
    examplePayload: { company: 'Acme Corp', base_currency: 'USD' }
  },
  Role: {
    typeFile: 'src/types/Role.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'name', 'admin_role', 'default_role', 'deleted', 'notes', 'permissions'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'admin_role', type: '1 | 0', required: true },
      { name: 'default_role', type: '1 | 0', required: true },
      { name: 'deleted', type: '1 | 0', required: true },
      { name: 'notes', type: 'string', required: true },
      { name: 'permissions', type: 'string', required: true }
    ],
    filterExample: { name: 'Project Manager' },
    examplePayload: { name: 'Project Manager', admin_role: 0, default_role: 0, deleted: 0, notes: 'Standard PM role', permissions: '{}' }
  },
  Hierarchy: {
    typeFile: 'src/types/Hierarchy.ts',
    canonicalId: 'id',
    alternateIds: ['externalid'],
    requiredFields: ['id', 'name', 'type', 'active', 'available_as_column', 'primary_dropdown_filter', 'primary_user_filterset', 'required', 'requireonform'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'active', type: "'1' | '0'", required: true },
      { name: 'available_as_column', type: "'1' | '0'", required: true },
      { name: 'externalid', type: 'string' },
      { name: 'name', type: 'string', required: true },
      { name: 'notes', type: 'string' },
      { name: 'primary_dropdown_filter', type: "'1' | '0'", required: true },
      { name: 'primary_user_filterset', type: "'1' | '0'", required: true },
      { name: 'required', type: "'1' | '0'", required: true },
      { name: 'requireonform', type: "'1' | '0'", required: true },
      { name: 'type', type: "'customer' | 'project' | 'user'", required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { type: 'project', active: '1' },
    examplePayload: { name: 'Project Hierarchy', type: 'project', active: '1', available_as_column: '1', primary_dropdown_filter: '0', primary_user_filterset: '0', required: '0', requireonform: '0' }
  },
  HierarchyNode: {
    typeFile: 'src/types/HierarchyNode.ts',
    canonicalId: 'id',
    alternateIds: ['hierarchyid', 'externalid'],
    requiredFields: ['id', 'hierarchyid', 'name', 'is_a_level', 'is_a_node', 'levelid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'hierarchyid', type: 'string', required: true },
      { name: 'is_a_level', type: "'1' | '0'", required: true },
      { name: 'is_a_node', type: "'1' | '0'", required: true },
      { name: 'levelid', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'notes', type: 'string' },
      { name: 'parentid', type: 'string' },
      { name: 'recordid', type: 'string' },
      { name: 'externalid', type: 'string' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { hierarchyid: 'H123', is_a_node: '1' },
    examplePayload: { hierarchyid: 'H123', name: 'Node 1', is_a_level: '0', is_a_node: '1', levelid: '0' },
    relationships: [
      { field: 'hierarchyid', relatesTo: 'Hierarchy', type: 'belongsTo', description: 'The hierarchy this node belongs to' },
      { field: 'parentid', relatesTo: 'HierarchyNode', type: 'belongsTo', description: 'Parent node (if nested)' }
    ]
  },
  Workspace: {
    typeFile: 'src/types/Workspace.ts',
    canonicalId: 'id',
    alternateIds: ['userid'],
    requiredFields: ['id', 'name', 'date', 'allow_guests', 'open', 'global', 'userid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string' },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'allow_guests', type: '"1" | "0"', required: true },
      { name: 'open', type: '"1" | "0"', required: true },
      { name: 'global', type: '"1" | "0"', required: true },
      { name: 'global_access', type: '"R" | "W" | "A"' },
      { name: 'notes', type: 'string' },
      { name: 'userid', type: 'string', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { userid: 'U123', open: '1' },
    examplePayload: { name: 'Project Workspace', date: {Date: {year: 2026, month: 6, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, allow_guests: '0', open: '1', global: '0', userid: 'U123' },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'Workspace owner' }
    ]
  },
  // === PHASE 1: ISSUES/TICKETS BOs ===
  Issue: {
    typeFile: 'src/types/Issue.ts',
    canonicalId: 'id',
    alternateIds: ['project_id', 'customer_id', 'number'],
    requiredFields: ['id', 'name', 'number', 'customer_id', 'date', 'description', 'owner_id', 'project_id'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'number', type: 'string', required: true },
      { name: 'customer_id', type: 'string', required: true },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'date_resolution_expected', type: 'DateContainer' },
      { name: 'date_resolution_required', type: 'DateContainer' },
      { name: 'date_resolved', type: 'DateContainer' },
      { name: 'description', type: 'string', required: true },
      { name: 'owner_id', type: 'string', required: true },
      { name: 'project_id', type: 'string', required: true },
      { name: 'project_task_id', type: 'string' },
      { name: 'issue_category_id', type: 'string' },
      { name: 'resolution_notes', type: 'string' },
      { name: 'user_id', type: 'string' },
      { name: 'issue_severity_id', type: 'string' },
      { name: 'issue_notes', type: 'string' },
      { name: 'issue_source_id', type: 'string' },
      { name: 'issue_stage_id', type: 'string' },
      { name: 'issue_status_id', type: 'string' },
      { name: 'prefix', type: 'string' },
      { name: 'priority', type: 'number' },
      { name: 'attachment_id', type: 'string' },
      { name: 'notes', type: 'string' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { project_id: 'P123', issue_status_id: 'open' },
    examplePayload: { name: 'Bug in login', number: 'ISS-001', customer_id: 'C1', date: {Date: {year: 2026, month: 6, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, description: 'Login button not responding', owner_id: 'U1', project_id: 'P123' },
    relationships: [
      { field: 'project_id', relatesTo: 'Project', type: 'belongsTo', description: 'The project this issue belongs to' },
      { field: 'customer_id', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'owner_id', relatesTo: 'User', type: 'belongsTo', description: 'Issue owner' },
      { field: 'user_id', relatesTo: 'User', type: 'belongsTo', description: 'Assigned user' },
      { field: 'project_task_id', relatesTo: 'ProjectTask', type: 'belongsTo', description: 'Related task' },
      { field: 'issue_category_id', relatesTo: 'IssueCategory', type: 'belongsTo', description: 'Issue category' },
      { field: 'issue_severity_id', relatesTo: 'IssueSeverity', type: 'belongsTo', description: 'Severity level' },
      { field: 'issue_status_id', relatesTo: 'IssueStatus', type: 'belongsTo', description: 'Current status' }
    ]
  },
  IssueCategory: {
    typeFile: 'src/types/IssueCategory.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'name', 'active'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'active', type: "'1' | '0'", required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'notes', type: 'string' }
    ],
    filterExample: { active: '1' },
    examplePayload: { name: 'Bug', active: '1' }
  },
  IssueSeverity: {
    typeFile: 'src/types/IssueSeverity.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'name', 'active'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'active', type: "'1' | '0'", required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'notes', type: 'string' }
    ],
    filterExample: { active: '1' },
    examplePayload: { name: 'High', active: '1' }
  },
  IssueStatus: {
    typeFile: 'src/types/IssueStatus.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'name', 'active'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'active', type: "'1' | '0'", required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { active: '1' },
    examplePayload: { name: 'Open', active: '1' }
  },
  // === PHASE 2: RESOURCE MANAGEMENT BOs ===
  ResourceRequest: {
    typeFile: 'src/types/ResourceRequest.ts',
    canonicalId: 'id',
    alternateIds: ['external_id', 'number'],
    requiredFields: ['id', 'booking_type_id', 'requester_id', 'customerid', 'description', 'status', 'date_end', 'date_finalized', 'date_start', 'date_start_expected', 'external_id', 'name', 'notes', 'number', 'ownerid', 'percent_fulfilled', 'projecyid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'booking_type_id', type: 'string', required: true },
      { name: 'requester_id', type: 'string', required: true },
      { name: 'customerid', type: 'string', required: true },
      { name: 'description', type: 'string', required: true },
      { name: 'status', type: 'string', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'date_end', type: 'DateContainer', required: true },
      { name: 'date_finalized', type: 'DateContainer', required: true },
      { name: 'date_start', type: 'DateContainer', required: true },
      { name: 'date_start_expected', type: 'DateContainer', required: true },
      { name: 'external_id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'notes', type: 'string', required: true },
      { name: 'number', type: 'string', required: true },
      { name: 'ownerid', type: 'string', required: true },
      { name: 'percent_fulfilled', type: 'number', required: true },
      { name: 'projecyid', type: 'string', required: true }
    ],
    filterExample: { status: 'open', requester_id: 'U123' },
    examplePayload: { booking_type_id: 'BT1', requester_id: 'U123', customerid: 'C1', description: 'Need developer', status: 'open', date_end: {Date: {year: 2026, month: 12, day: 31, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, date_finalized: {Date: {year: 2026, month: 6, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, date_start: {Date: {year: 2026, month: 7, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, date_start_expected: {Date: {year: 2026, month: 7, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, external_id: 'ext-rr1', name: 'Dev Request', notes: 'Senior developer', number: 'RR-001', ownerid: 'U456', percent_fulfilled: 0, projecyid: 'P123' },
    relationships: [
      { field: 'requester_id', relatesTo: 'User', type: 'belongsTo', description: 'User who requested the resource' },
      { field: 'ownerid', relatesTo: 'User', type: 'belongsTo', description: 'Request owner' },
      { field: 'customerid', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'projecyid', relatesTo: 'Project', type: 'belongsTo', description: 'Associated project (note: typo in field name)' },
      { field: 'booking_type_id', relatesTo: 'BookingType', type: 'belongsTo', description: 'Booking classification' }
    ]
  },
  ResourceprofileType: {
    typeFile: 'src/types/ResourceProfileType.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'name', 'active'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string' },
      { name: 'active', type: '0 | 1', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { active: 1 },
    examplePayload: { name: 'Developer', active: 1 }
  },
  BookingByDay: {
    typeFile: 'src/types/BookingByDay.ts',
    canonicalId: 'id',
    alternateIds: ['booking_id', 'userid', 'project_id'],
    requiredFields: ['id', 'booking_id', 'booking_type_id', 'project_id', 'project_task_id', 'customer_id', 'date', 'hours', 'userid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'booking_id', type: 'string', required: true },
      { name: 'booking_type_id', type: 'string', required: true },
      { name: 'project_id', type: 'string', required: true },
      { name: 'project_task_id', type: 'string', required: true },
      { name: 'customer_id', type: 'string', required: true },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'hours', type: 'number', required: true },
      { name: 'job_code_id', type: 'string' },
      { name: 'resource_request_queue_id', type: 'string' },
      { name: 'updated', type: 'DateContainer' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'userid', type: 'string', required: true }
    ],
    filterExample: { userid: 'U123', date: {Date: {year: 2026, month: 6, day: 15, hour: 0, minute: 0, second: 0, timezone: 'UTC'}} },
    examplePayload: { booking_id: 'B1', booking_type_id: 'BT1', project_id: 'P123', project_task_id: 'PT1', customer_id: 'C1', date: {Date: {year: 2026, month: 6, day: 15, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, hours: 8, userid: 'U123' },
    relationships: [
      { field: 'booking_id', relatesTo: 'Booking', type: 'belongsTo', description: 'Parent booking' },
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'Booked user' },
      { field: 'project_id', relatesTo: 'Project', type: 'belongsTo', description: 'Associated project' },
      { field: 'project_task_id', relatesTo: 'ProjectTask', type: 'belongsTo', description: 'Associated task' },
      { field: 'customer_id', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'booking_type_id', relatesTo: 'BookingType', type: 'belongsTo', description: 'Booking classification' }
    ]
  },
  BookingRequest: {
    typeFile: 'src/types/BookingRequest.ts',
    canonicalId: 'id',
    alternateIds: ['external_id', 'number'],
    requiredFields: ['id', 'name', 'number', 'customer_id', 'project_id', 'as_percentage', 'owner_id'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'number', type: 'string', required: true },
      { name: 'external_id', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'customer_id', type: 'string', required: true },
      { name: 'project_id', type: 'string', required: true },
      { name: 'project_task_id', type: 'string' },
      { name: 'booking_type_id', type: 'string' },
      { name: 'attachment_id', type: 'string' },
      { name: 'as_percentage', type: "'1' | '0'", required: true },
      { name: 'hours', type: 'number' },
      { name: 'percentage', type: 'number' },
      { name: 'approval_status', type: "'O' | 'P' | 'A' | 'R'" },
      { name: 'date_submitted', type: 'DateContainer' },
      { name: 'date_approved', type: 'DateContainer' },
      { name: 'startdate', type: 'DateContainer' },
      { name: 'enddate', type: 'DateContainer' },
      { name: 'job_code_id', type: 'string' },
      { name: 'prefix', type: 'string' },
      { name: 'notify_owner', type: "'1' | '0'" },
      { name: 'notes', type: 'string' },
      { name: 'updated', type: 'DateContainer' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'owner_id', type: 'string', required: true }
    ],
    filterExample: { project_id: 'P123', approval_status: 'P' },
    examplePayload: { name: 'Booking Request', number: 'BR-001', customer_id: 'C1', project_id: 'P123', as_percentage: '0', owner_id: 'U123', hours: 40 },
    relationships: [
      { field: 'customer_id', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'project_id', relatesTo: 'Project', type: 'belongsTo', description: 'Target project' },
      { field: 'project_task_id', relatesTo: 'ProjectTask', type: 'belongsTo', description: 'Target task (optional)' },
      { field: 'owner_id', relatesTo: 'User', type: 'belongsTo', description: 'Request owner' },
      { field: 'booking_type_id', relatesTo: 'BookingType', type: 'belongsTo', description: 'Booking classification' }
    ]
  },
  BookingType: {
    typeFile: 'src/types/BookingType.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: ['id', 'name', 'active'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'notes', type: 'string' },
      { name: 'picklist_label', type: 'string' },
      { name: 'priority', type: 'number' },
      { name: 'active', type: "'1' | '0'", required: true },
      { name: 'default_for_approval_status', type: "'1' | '0'" },
      { name: 'approval_status', type: "'O' | 'S' | 'A' | 'R'" },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { active: '1' },
    examplePayload: { name: 'Standard Booking', active: '1' }
  },
  TargetUtilization: {
    typeFile: 'src/types/TargetUtilization.ts',
    canonicalId: 'id',
    alternateIds: ['user_id'],
    requiredFields: ['id', 'user_id', 'start_date', 'end_date', 'percentage'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'user_id', type: 'string', required: true },
      { name: 'start_date', type: 'DateContainer', required: true },
      { name: 'end_date', type: 'DateContainer', required: true },
      { name: 'percentage', type: 'number', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { user_id: 'U123' },
    examplePayload: { user_id: 'U123', start_date: {Date: {year: 2026, month: 1, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, end_date: {Date: {year: 2026, month: 12, day: 31, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, percentage: 75.0 },
    relationships: [
      { field: 'user_id', relatesTo: 'User', type: 'belongsTo', description: 'Target user' }
    ]
  },
  // === PHASE 2: SCHEDULING BOs ===
  ScheduleByDay: {
    typeFile: 'src/types/ScheduleByDay.ts',
    canonicalId: 'id',
    alternateIds: ['user_id'],
    requiredFields: ['id', 'user_id', 'date', 'planned_hours', 'booked_hours', 'hours'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'user_id', type: 'string', required: true },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'planned_hours', type: 'number', required: true },
      { name: 'booked_hours', type: 'number', required: true },
      { name: 'exception_hours', type: 'number' },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'base_hours', type: 'number' },
      { name: 'hours', type: 'number', required: true },
      { name: 'target_base_hours', type: 'number' },
      { name: 'target_hours', type: 'number' }
    ],
    filterExample: { user_id: 'U123', date: {Date: {year: 2026, month: 6, day: 15, hour: 0, minute: 0, second: 0, timezone: 'UTC'}} },
    examplePayload: { user_id: 'U123', date: {Date: {year: 2026, month: 6, day: 15, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, planned_hours: 8, booked_hours: 6, hours: 8 },
    relationships: [
      { field: 'user_id', relatesTo: 'User', type: 'belongsTo', description: 'Target user' }
    ]
  },
  ScheduleException: {
    typeFile: 'src/types/Scheduleexception.ts',
    canonicalId: 'id',
    alternateIds: ['userid'],
    requiredFields: ['id', 'startdate', 'enddate', 'name', 'userid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer' },
      { name: 'startdate', type: 'DateContainer', required: true },
      { name: 'enddate', type: 'DateContainer', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'userid', type: 'string', required: true },
      { name: 'workscheduleid', type: 'string' },
      { name: 'workhours', type: 'number' },
      { name: 'timetypeid', type: 'string' },
      { name: 'schedule_request_itemid', type: 'string' },
      { name: 'exception_type', type: '"R"' }
    ],
    filterExample: { userid: 'U123', startdate: {Date: {year: 2026, month: 7, day: 4, hour: 0, minute: 0, second: 0, timezone: 'UTC'}} },
    examplePayload: { startdate: {Date: {year: 2026, month: 7, day: 4, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, enddate: {Date: {year: 2026, month: 7, day: 4, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, name: 'Independence Day', userid: 'U123' },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User with time off' }
    ]
  },
  UserWorkSchedule: {
    typeFile: 'src/types/UserWorkSchedule.ts',
    canonicalId: 'id',
    alternateIds: ['userid', 'workscheduleid'],
    requiredFields: ['id', 'userid', 'workscheduleid', 'start_date', 'week_num', 'workdays', 'workhourid', 'workhours'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'userid', type: 'string', required: true },
      { name: 'workscheduleid', type: 'string', required: true },
      { name: 'start_date', type: 'DateContainer', required: true },
      { name: 'end_date', type: 'DateContainer' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true },
      { name: 'account_workscheduleid', type: 'string' },
      { name: 'acct_code', type: 'string' },
      { name: 'externalid', type: 'string' },
      { name: 'master_workscheduleid', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'sample_date', type: 'DateContainer' },
      { name: 'use_this_schedule', type: "'1' | '0'" },
      { name: 'week_num', type: 'number', required: true },
      { name: 'workdays', type: 'string', required: true },
      { name: 'workhourid', type: 'string', required: true },
      { name: 'workhours', type: 'string', required: true }
    ],
    filterExample: { userid: 'U123' },
    examplePayload: { userid: 'U123', workscheduleid: 'WS1', start_date: {Date: {year: 2026, month: 1, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, week_num: 1, workdays: '1,2,3,4,5', workhourid: 'WH1', workhours: '08:00-17:00' },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User with this work schedule' }
    ]
  },
  // === PHASE 2: TIME & EXPENSE BOs ===
  Ticket: {
    typeFile: 'src/types/Ticket.ts',
    canonicalId: 'id',
    alternateIds: ['envelopeid', 'externalid'],
    requiredFields: ['id', 'envelopeid', 'date', 'userid'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'envelopeid', type: 'string', required: true },
      { name: 'date', type: 'string', required: true },
      { name: 'acct_date', type: 'string' },
      { name: 'userid', type: 'string', required: true },
      { name: 'customerid', type: 'string' },
      { name: 'projectid', type: 'string' },
      { name: 'projecttask_typeid', type: 'string' },
      { name: 'categoryid', type: 'string' },
      { name: 'itemid', type: 'string' },
      { name: 'quantity', type: 'number' },
      { name: 'cost', type: 'number' },
      { name: 'total', type: 'number' },
      { name: 'currency', type: 'string' },
      { name: 'currency_cost', type: 'number' },
      { name: 'currency_rate', type: 'number' },
      { name: 'currency_symbol', type: 'string' },
      { name: 'currency_total_tax_paid', type: 'number' },
      { name: 'tax_locationid', type: 'string' },
      { name: 'tax_rateid', type: 'string' },
      { name: 'status', type: "'R' | 'N'" },
      { name: 'description', type: 'string' },
      { name: 'city', type: 'string' },
      { name: 'unitm', type: 'string' },
      { name: 'reference_number', type: 'string' },
      { name: 'attachmentid', type: 'string' },
      { name: 'slipid', type: 'string' },
      { name: 'thin_client_id', type: 'string' },
      { name: 'use_server_currency_rate', type: "'1' | '0'" },
      { name: 'vehicleid', type: 'string' },
      { name: 'vendorid', type: 'string' },
      { name: 'user_locationid', type: 'string' },
      { name: 'externalid', type: 'string' },
      { name: 'notes', type: 'string' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { userid: 'U123', envelopeid: 'ENV1' },
    examplePayload: { envelopeid: 'ENV1', date: '2026-06-15', userid: 'U123', cost: 25.50, total: 25.50, description: 'Lunch meeting' },
    relationships: [
      { field: 'envelopeid', relatesTo: 'Envelope', type: 'belongsTo', description: 'Parent expense report' },
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User who incurred expense' },
      { field: 'customerid', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'projectid', relatesTo: 'Project', type: 'belongsTo', description: 'Associated project' }
    ]
  },
  Envelope: {
    typeFile: 'src/types/Envelope.ts',
    canonicalId: 'id',
    alternateIds: ['number', 'externalid'],
    requiredFields: ['id', 'name', 'date', 'totreiumbruse'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'date_start', type: 'DateContainer' },
      { name: 'date_end', type: 'DateContainer' },
      { name: 'acct_date', type: 'DateContainer' },
      { name: 'customerid', type: 'string' },
      { name: 'projectid', type: 'string' },
      { name: 'approver', type: 'string' },
      { name: 'approved', type: 'DateContainer' },
      { name: 'submitted', type: 'DateContainer' },
      { name: 'status', type: "'O' | 'S' | 'A' | 'R'" },
      { name: 'number', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'notes', type: 'string' },
      { name: 'currency', type: 'string' },
      { name: 'currency_exchange_intolerance', type: "'1' | '0'" },
      { name: 'advance', type: 'number' },
      { name: 'balance', type: 'number' },
      { name: 'total', type: 'number' },
      { name: 'total_to_reimburse', type: 'number' },
      { name: 'tottickets', type: 'number' },
      { name: 'attachmentid', type: 'string[]' },
      { name: 'tax_locationid', type: 'string' },
      { name: 'thin_client_id', type: 'string' },
      { name: 'trip_reason', type: 'string' },
      { name: 'isAccounting', type: "'1' | '0'" },
      { name: 'isAdjusting', type: "'1' | '0'" },
      { name: 'is_overlapping', type: "'1' | '0'" },
      { name: 'exported', type: 'string' },
      { name: 'externalid', type: 'string' },
      { name: 'userid', type: 'string' },
      { name: 'totreiumbruse', type: 'string', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { userid: 'U123', status: 'O' },
    examplePayload: { name: 'June Expenses', date: {Date: {year: 2026, month: 6, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, totreiumbruse: '0' },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User submitting expense report' },
      { field: 'customerid', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'projectid', relatesTo: 'Project', type: 'belongsTo', description: 'Associated project' },
      { field: 'approver', relatesTo: 'User', type: 'belongsTo', description: 'Approving user' }
    ]
  },
  Todo: {
    typeFile: 'src/types/Todo.ts',
    canonicalId: 'id',
    alternateIds: ['userid', 'dealid'],
    requiredFields: ['id', 'name', 'date'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'contactid', type: 'string' },
      { name: 'customerid', type: 'string' },
      { name: 'dealid', type: 'string' },
      { name: 'userid', type: 'string' },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'start', type: 'DateContainer' },
      { name: 'due', type: 'DateContainer' },
      { name: 'finished', type: 'DateContainer' },
      { name: 'notes', type: 'string' },
      { name: 'priority', type: 'number' },
      { name: 'status', type: "'A' | 'C' | 'D' | 'N' | 'W'" },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'createdbyid', type: 'string' },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { userid: 'U123', status: 'A' },
    examplePayload: { name: 'Follow up with client', date: {Date: {year: 2026, month: 6, day: 20, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, userid: 'U123', priority: 2 },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'Assigned user' },
      { field: 'customerid', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'contactid', relatesTo: 'Contact', type: 'belongsTo', description: 'Associated contact' },
      { field: 'createdbyid', relatesTo: 'User', type: 'belongsTo', description: 'User who created the todo' }
    ]
  },
  Event: {
    typeFile: 'src/types/Event.ts',
    canonicalId: 'id',
    alternateIds: ['userid', 'customerid', 'dealid'],
    requiredFields: ['id', 'userid', 'name', 'occurred'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'contactid', type: 'string' },
      { name: 'customerid', type: 'string' },
      { name: 'dealid', type: 'string' },
      { name: 'userid', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'notes', type: 'string' },
      { name: 'occurred', type: 'DateContainer', required: true },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { userid: 'U123', occurred: {Date: {year: 2026, month: 6, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC'}} },
    examplePayload: { userid: 'U123', name: 'Client meeting', occurred: {Date: {year: 2026, month: 6, day: 15, hour: 14, minute: 0, second: 0, timezone: 'UTC'}} },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User who logged the event' },
      { field: 'customerid', relatesTo: 'Customer', type: 'belongsTo', description: 'Associated customer' },
      { field: 'contactid', relatesTo: 'Contact', type: 'belongsTo', description: 'Associated contact' }
    ]
  },
  Timecard: {
    typeFile: 'src/types/Timecard.ts',
    canonicalId: 'id',
    alternateIds: ['userid', 'timesheetid'],
    requiredFields: ['id', 'date', 'userid', 'timesheetid', 'time_start', 'time_end', 'break_start', 'break_end', 'hours'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'date', type: 'DateContainer', required: true },
      { name: 'userid', type: 'string', required: true },
      { name: 'timesheetid', type: 'string', required: true },
      { name: 'time_start', type: 'DateContainer', required: true },
      { name: 'time_end', type: 'DateContainer', required: true },
      { name: 'break_start', type: 'DateContainer', required: true },
      { name: 'break_end', type: 'DateContainer', required: true },
      { name: 'hours', type: 'number', required: true },
      { name: 'notes', type: 'string' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { userid: 'U123', date: {Date: {year: 2026, month: 6, day: 15, hour: 0, minute: 0, second: 0, timezone: 'UTC'}} },
    examplePayload: { date: {Date: {year: 2026, month: 6, day: 15, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, userid: 'U123', timesheetid: 'TS1', time_start: {Date: {year: 2026, month: 6, day: 15, hour: 9, minute: 0, second: 0, timezone: 'UTC'}}, time_end: {Date: {year: 2026, month: 6, day: 15, hour: 17, minute: 0, second: 0, timezone: 'UTC'}}, break_start: {Date: {year: 2026, month: 6, day: 15, hour: 12, minute: 0, second: 0, timezone: 'UTC'}}, break_end: {Date: {year: 2026, month: 6, day: 15, hour: 13, minute: 0, second: 0, timezone: 'UTC'}}, hours: 7 },
    relationships: [
      { field: 'userid', relatesTo: 'User', type: 'belongsTo', description: 'User who clocked in/out' },
      { field: 'timesheetid', relatesTo: 'Timesheet', type: 'belongsTo', description: 'Associated timesheet' }
    ]
  },
  Timetype: {
    typeFile: 'src/types/TimeType.ts',
    canonicalId: 'id',
    alternateIds: ['code', 'externalid'],
    requiredFields: ['id', 'name', 'active'],
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'active', type: "'1' | '0'", required: true },
      { name: 'code', type: 'string' },
      { name: 'cost_centerid', type: 'string' },
      { name: 'externalid', type: 'string' },
      { name: 'notes', type: 'string' },
      { name: 'picklist_label', type: 'string' },
      { name: 'payroll_code', type: 'string' },
      { name: 'created', type: 'DateContainer', required: true },
      { name: 'updated', type: 'DateContainer', required: true }
    ],
    filterExample: { active: '1' },
    examplePayload: { name: 'Regular', code: 'REG', active: '1' }
  }
};

export type BOName = keyof typeof boSchemaRegistry;
