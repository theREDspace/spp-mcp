import type { Tool } from './types';
import SPPClient from '../../clients/SPPClient';
import { resolveUserContext, USER_BOUND_OBJECTS } from '../helpers/agentUserContext';
import { normalizeAndValidateBOInput } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';
import type { WriteResult } from '../../services/BOService';
import { objectTypeSchema, boFieldsSchema, crudOutputSchema, MAX_WRITE_BATCH } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';
import { z } from 'zod';

const inputSchema = z.object({
  objectType: objectTypeSchema,
  payload: boFieldsSchema.optional().describe('Fields for the new record (single-record form).'),
  payloads: z
    .array(boFieldsSchema)
    .min(1)
    .max(MAX_WRITE_BATCH)
    .optional()
    .describe(`Bulk form: up to ${MAX_WRITE_BATCH} records created in ONE SPP request.`),
  preferSelf: z.boolean().optional().describe('If true, use the current logged-in user as the user context.'),
  userName: z.string().optional().describe('Name or identifier of the user to operate on behalf of.'),
});

const genericAdd: Tool = {
  name: 'generic_add',
  description:
    `Add/create one record ({payload}) or up to ${MAX_WRITE_BATCH} records in a single call ({payloads: [...]}). ` +
    'Bulk is one SPP request — always prefer it over looping single adds. ' +
    'Bulk responses report per-record outcomes: check "ok" and "results" for partial failures (ok=false means at least one record failed). ' +
    'Works for curated, derived, and unknown BOs.',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, payload, payloads, preferSelf = false, userName }: {
      objectType: string;
      payload?: Record<string, any>;
      payloads?: Record<string, any>[];
      preferSelf?: boolean;
      userName?: string;
    },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (payloads && payload) {
      return fail(new Error('Provide either {payload} or {payloads}, not both.'));
    }
    if (!payloads && !payload) {
      return fail(new Error('Provide {payload} for a single add, or {payloads: [...]} for a bulk add.'));
    }

    const inputPayloads = payloads ?? [payload!];
    let patchedPayloads = inputPayloads.map((p) => ({ ...p }));

    if ((USER_BOUND_OBJECTS as readonly string[]).includes(objectType)) {
      try {
        // Resolve the user context once and apply it to every record in the batch.
        const { userId, userField } = await resolveUserContext({
          objectType,
          payloadOrFilter: patchedPayloads[0]!,
          sppClient,
          preferSelf,
          userName,
        });
        for (const p of patchedPayloads) p[userField] = userId;
      } catch (e) {
        return fail(e);
      }
    }

    // Validate every record before any XML is sent — a bad record aborts the
    // whole batch instead of partially applying it.
    const normalized: Record<string, any>[] = [];
    for (let i = 0; i < patchedPayloads.length; i++) {
      try {
        normalized.push(normalizeAndValidateBOInput(objectType, patchedPayloads[i], 'payload'));
      } catch (e) {
        return fail(new Error(`payloads[${i}] failed validation: ${e instanceof Error ? e.message : String(e)}`));
      }
    }

    if (payloads) {
      const results = (await sppClient.add(objectType as BOName, normalized as any)) as WriteResult[];
      const succeeded = results.filter((r) => r.ok).length;
      return ok({
        ok: succeeded === results.length,
        objectType,
        operation: 'add',
        results,
        succeeded,
        failed: results.length - succeeded,
      });
    }

    const data = await sppClient.add(objectType as BOName, normalized[0]!);
    return ok({ ok: true, objectType, operation: 'add', data });
  },
};
export default genericAdd;
