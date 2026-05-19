import listProjects from './listProjects';
import listBookings from './listBookings';
import listTimesheets from './listTimesheets';
import searchProjects from './searchProjects';
import getProject from './getProject';
import searchUsers from './searchUsers';
import getUser from './getUser';
import listProjectAssignments from './listProjectAssignments';
import listTimeEntries from './listTimeEntries';
import getTimesheet from './getTimesheet';
import type { Tool } from './types';

export const mcpTools: Tool[] = [
  // Discovery
  searchProjects,
  searchUsers,
  // Projects
  listProjects,
  getProject,
  listProjectAssignments,
  // Users
  getUser,
  // Time
  listTimeEntries,
  listTimesheets,
  getTimesheet,
  // Bookings
  listBookings,
];
