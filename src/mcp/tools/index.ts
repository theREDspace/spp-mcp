import listProjects from './listProjects';
import listProjectTasks from './listProjectTasks';
import getBookingSummary from './getBookingSummary';
import listBookings from './listBookings';
import listTimesheets from './listTimesheets';
import searchProjects from './searchProjects';
import getProject from './getProject';
import searchUsers from './searchUsers';
import getUser from './getUser';
import listProjectAssignments from './listProjectAssignments';
import listTimeEntries from './listTimeEntries';
import getTimesheet from './getTimesheet';
import addTimeEntry from './addTimeEntry';
import updateTimeEntry from './updateTimeEntry';
import deleteTimeEntry from './deleteTimeEntry';
import submitTimesheet from './submitTimesheet';
import cloneTimesheet from './cloneTimesheet';
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
  // Time (Read)
  listTimeEntries,
  listTimesheets,
  getTimesheet,
  // Time (Write)
  addTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  submitTimesheet,
  cloneTimesheet,
  // Bookings
  listBookings,
  // Tasks
  listProjectTasks,
  // Booking Summaries
  getBookingSummary,
];
