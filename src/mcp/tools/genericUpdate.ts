import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { normalizeAndValidateBOInput } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';
import { objectTypeSchema, boFieldsSchema, crudOutputSchema } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';
import { z } from 'zod';

const inputSchema = z.object({
  objectType: objectTypeSchema,
  id: z.string().describe('Canonical or alternate ID value.'),
  changes: boFieldsSchema.describe('Map of fields to update.'),
});

const genericUpdate: Tool = {
  name: 'generic_update',
  description: 'Update one or more fields for a single record in any business object.',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, id, changes }: { objectType: string; id: string; changes: Record<string, any> },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) return fail(new Error(`Unknown objectType '${objectType}'`));
    const normChanges = normalizeAndValidateBOInput(objectType, changes, 'changes');
    const data = await sppClient.update(objectType as BOName, id, normChanges);
    return ok({ ok: true, objectType, operation: 'update', data });
  },
};
export default genericUpdate;
