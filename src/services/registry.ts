import { boSchemaRegistry } from './boSchemaRegistry';
import type { BOSchema } from './boSchemaRegistry';
import { derivedRegistry } from './boSchemaRegistry.derived';

// Curated entries win over derived entries for the same key.
export const mergedRegistry: Record<string, BOSchema> = {
  ...derivedRegistry,
  ...boSchemaRegistry,
};

const PASSTHROUGH_BASE: Omit<BOSchema, 'source'> = {
  typeFile: '',
  canonicalId: 'id',
  alternateIds: [],
  requiredFields: [],
  fields: [],
};

export function getSchema(objectType: string): BOSchema {
  return mergedRegistry[objectType] ?? { ...PASSTHROUGH_BASE, source: 'passthrough' };
}
