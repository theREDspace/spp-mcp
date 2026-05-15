import listProjects from './listProjects';
import listBookings from './listBookings';
import listProjectMembers from './listProjectMembers';
import getUserWorkLastWeek from './getUserWorkLastWeek';
import getPersonInfo from './getPersonInfo';
import getMe from './getMe';
import getMyLatestTimesheet from './getMyLatestTimesheet';
import listTimesheets from './listTimesheets';
import getTimesheetDetails from './getTimesheetDetails';
import type { Tool } from './types';

export const mcpTools: Tool[] = [
  listProjects,
  listBookings,
  listProjectMembers,
  getUserWorkLastWeek,
  getPersonInfo,
  getMe,
  getMyLatestTimesheet,
  listTimesheets,
  getTimesheetDetails,
];
