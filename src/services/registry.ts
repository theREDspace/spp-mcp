import { boSchemaRegistry } from './boSchemaRegistry';
import type { BOSchema, BOFieldSchema } from './boSchemaRegistry';
import { derivedRegistry } from './boSchemaRegistry.derived';

// Merge a derived (auto-generated, complete field list) schema with a curated
// (hand-written metadata, possibly partial field list) schema for the same BO.
// Fields are unioned by name with curated definitions winning; all other
// curated metadata (canonicalId, alternateIds, requiredFields, relationships,
// examples) wins wholesale. Without this, a partial curated field list would
// shadow the full derived one and strict validation would reject real SPP
// fields (e.g. User.hierarchy_node_ids).
export function mergeBOSchemas(
  derived: BOSchema | undefined,
  curated: BOSchema | undefined
): BOSchema {
  if (!curated) return derived!;
  if (!derived) return curated;

  const byName = new Map<string, BOFieldSchema>();
  for (const f of derived.fields) byName.set(f.name, f);
  for (const f of curated.fields) byName.set(f.name, { ...byName.get(f.name), ...f });

  return {
    ...derived,
    ...curated,
    source: 'curated',
    fields: [...byName.values()],
  };
}

const allBOKeys = new Set([
  ...Object.keys(derivedRegistry),
  ...Object.keys(boSchemaRegistry),
]);

export const mergedRegistry: Record<string, BOSchema> = {};
for (const key of allBOKeys) {
  mergedRegistry[key] = mergeBOSchemas(derivedRegistry[key], boSchemaRegistry[key]);
}

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
