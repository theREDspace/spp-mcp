import genericRead from './genericRead';
import genericList from './genericList';
import genericBatchList from './genericBatchList';
import genericAdd from './genericAdd';
import genericUpdate from './genericUpdate';
import genericDelete from './genericDelete';
import listObjectTypes from './listObjectTypes';
import describeObjectType from './describeObjectType';
import echo from './echo';
import whoami from './whoami';
import getUserProfile from './getUserProfile';
import type { Tool } from './types';

const isProd = process.env.NODE_ENV === 'production';

export const mcpTools: Tool[] = [
  // Generic BO CRUD Discovery
  listObjectTypes,
  describeObjectType,
  // Generic BO CRUD
  genericRead,
  genericList,
  genericBatchList,
  genericAdd,
  genericUpdate,
  genericDelete,
  // Utility
  whoami,
  getUserProfile,
  // Debug-only — excluded in production
  ...(isProd ? [] : [echo]),
];
