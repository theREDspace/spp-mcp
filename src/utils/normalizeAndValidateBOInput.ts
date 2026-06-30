import { z, ZodObject, ZodTypeAny } from 'zod';
import { getSchema } from '../services/registry';

type InputContext = 'payload' | 'changes' | 'filter' | 'id';

export function buildZodSchemaForBO(objectType: string, context: InputContext): ZodObject<any> {
  const boSchema = getSchema(objectType);

  if (boSchema.source === 'passthrough') {
    return z.object({}).passthrough() as unknown as ZodObject<any>;
  }

  const isCurated = boSchema.source === 'curated';
  const fieldMap: Record<string, ZodTypeAny> = {};

  for (const field of boSchema.fields) {
    let zType: ZodTypeAny;
    switch (field.type) {
      case 'string':
        // Accept both string and numbers (coerce to string)
        zType = z.union([z.string(), z.number().transform(n => n.toString())]);
        break;
      case 'number':
        zType = z.coerce.number();
        break;
      case 'boolean':
        zType = z.preprocess(
          v => (typeof v === 'boolean' ? v : v === 'true' || v === '1'),
          z.boolean(),
        );
        break;
      case 'DateContainer':
        zType = z.union([
          z.object({ Date: z.object({
            year: z.number(), month: z.number(), day: z.number(),
            hour: z.number().optional(), minute: z.number().optional(),
            second: z.number().optional(), timezone: z.string().optional()
          }) }),
          z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date string'),
          z.date(),
        ]);
        break;
      default:
        zType = z.any();
    }

    if (context === 'payload' && isCurated) {
      // Use unified check: field is required if in boSchema.requiredFields or field.required
      const isReq = boSchema.requiredFields?.includes(field.name) || field.required;
      fieldMap[field.name] = isReq ? zType : zType.optional();
    } else {
      fieldMap[field.name] = zType.optional();
    }
  }

  if (isCurated) {
    let schema = z.object(fieldMap).strict();
    if (context === 'filter' || context === 'changes') {
      // Make all optional and allow any subset
      schema = schema.partial().strict();
    }
    return schema;
  } else {
    // Derived: passthrough allows unknown fields
    const base = z.object(fieldMap).passthrough();
    if (context === 'filter' || context === 'changes') {
      return base.partial();
    }
    return base;
  }
}

export function normalizeAndValidateBOInput(objectType: string, input: any, context: InputContext = 'payload') {
  const schema = buildZodSchemaForBO(objectType, context);
  return schema.parse(input);
}

// -- Canonical/alternate ID utility
export function normalizeIdForBO(objectType: string, input: any): { idField: string; id: any } {
  const boSchema = getSchema(objectType);
  const { canonicalId, alternateIds } = boSchema;
  // Accepts { id }, or {alternateIdName}.
  const candidates = [canonicalId, ...alternateIds];
  for (const k of candidates) {
    if (input[k] !== undefined) return { idField: k, id: input[k] };
  }
  throw new Error(`Must provide one of: ${candidates.join(', ')}`);
}
