import genericRead from './genericRead';
import genericList from './genericList';
import genericBatchList from './genericBatchList';
import genericAdd from './genericAdd';
import genericUpdate from './genericUpdate';
import genericDelete from './genericDelete';
import moveHierarchyRecords from './moveHierarchyRecords';
import listObjectTypes from './listObjectTypes';
import describeObjectType from './describeObjectType';
import echo from './echo';
import whoami from './whoami';
import getUserProfile from './getUserProfile';
import type { Tool } from './types';

const isProd = process.env.NODE_ENV === 'production';

const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

const unannotated: Tool[] = [
  // Generic BO CRUD Discovery
  { ...listObjectTypes, annotations: { ...readOnly } },
  { ...describeObjectType, annotations: { ...readOnly } },
  // Generic BO CRUD
  { ...genericRead, annotations: { ...readOnly } },
  { ...genericList, annotations: { ...readOnly } },
  { ...genericBatchList, annotations: { ...readOnly } },
  {
    ...genericAdd,
    // destructiveHint is spec'd to default to true when unset (for a
    // non-read-only tool) — a pure create must set it false explicitly, or a
    // conformant client treats it the same as generic_delete.
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    ...genericUpdate,
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  {
    ...genericDelete,
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  // Composite operations
  {
    ...moveHierarchyRecords,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
  },
  // Utility
  { ...whoami, annotations: { ...readOnly } },
  { ...getUserProfile, annotations: { ...readOnly } },
  // Debug-only — excluded in production
  ...(isProd ? [] : [{ ...echo, annotations: { ...readOnly } }]),
];

export const mcpTools: Tool[] = [...unannotated].sort((a, b) =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0
);
