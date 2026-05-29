// boSchemaRegistry.ts
// Metadata registry for Business Objects (BOs)
// Used for: generic CRUD tool schema, validation, and agent/LLM discoverability

interface BOFieldSchema {
  name: string;
  type: string;
  required?: boolean;
}

interface BOSchema {
  typeFile: string;
  canonicalId: string;
  alternateIds: string[];
  requiredFields: string[];
  fields: BOFieldSchema[];
  filterExample?: Record<string, any>;
  examplePayload?: Record<string, any>;
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
    examplePayload: { id: 'TE42', userid: 'U321', date: {Date: {year: 2026, month: 3, day: 10, hour: 0, minute: 0, second: 0, timezone: 'UTC'}}, timesheetid: 'TS123', hours: 7.5, projectid: 'P123', notes: 'Project X kickoff' }
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
    examplePayload: { projectid: 'P333', customerid: 'C111', startdate: { Date: { year: 2023, month: 4, day: 1, hour: 0, minute: 0, second: 0, timezone: 'UTC' } }, enddate: { Date: { year: 2023, month: 4, day: 7, hour: 0, minute: 0, second: 0, timezone: 'UTC' } }, userid: 'U888' }
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
    examplePayload: { userid: 'U42', externalid: 'RP881' }
  }
};

export type BOName = keyof typeof boSchemaRegistry;
