import { mergedRegistry, getSchema, mergeBOSchemas } from '../services/registry';
import { boSchemaRegistry } from '../services/boSchemaRegistry';
import type { BOSchema } from '../services/boSchemaRegistry';
import { derivedRegistry } from '../services/boSchemaRegistry.derived';

describe('mergedRegistry', () => {
  it('contains all curated entries', () => {
    for (const key of Object.keys(boSchemaRegistry)) {
      expect(mergedRegistry[key]).toBeDefined();
      expect(mergedRegistry[key]!.source).toBe('curated');
    }
  });

  it('contains Attributeset (derived, not in curated)', () => {
    expect(boSchemaRegistry['Attributeset']).toBeUndefined();
    expect(mergedRegistry['Attributeset']).toBeDefined();
    expect(mergedRegistry['Attributeset']!.source).toBe('derived');
  });

  it('curated entry overrides derived entry for the same key', () => {
    expect(mergedRegistry['BookingSummary']!.source).toBe('curated');
  });

  it('has more entries than just the curated registry', () => {
    expect(Object.keys(mergedRegistry).length).toBeGreaterThan(
      Object.keys(boSchemaRegistry).length
    );
  });

  it('merged User exposes the full derived field list, not just the curated stub', () => {
    const user = mergedRegistry['User']!;
    const fieldNames = user.fields.map((f) => f.name);
    expect(fieldNames).toContain('hierarchy_node_ids');
    expect(fieldNames).toContain('nickname');
    expect(user.fields.length).toBeGreaterThan(50);
  });

  it('merged User keeps curated metadata', () => {
    const user = mergedRegistry['User']!;
    expect(user.source).toBe('curated');
    expect(user.canonicalId).toBe('id');
    expect(user.alternateIds).toEqual(['code', 'externalid', 'external_id']);
    expect(user.requiredFields).toEqual(boSchemaRegistry['User']!.requiredFields);
  });

  it('merged Project exposes derived fields beyond the curated stub', () => {
    const project = mergedRegistry['Project']!;
    const derivedNames = derivedRegistry['Project']!.fields.map((f) => f.name);
    const mergedNames = project.fields.map((f) => f.name);
    for (const name of derivedNames) {
      expect(mergedNames).toContain(name);
    }
    expect(project.source).toBe('curated');
  });
});

describe('mergeBOSchemas', () => {
  const base: Omit<BOSchema, 'source' | 'fields'> = {
    typeFile: 'x.ts',
    canonicalId: 'id',
    alternateIds: [],
    requiredFields: [],
  };

  it('returns derived unchanged when no curated entry exists', () => {
    const derived: BOSchema = { ...base, source: 'derived', fields: [{ name: 'a', type: 'string' }] };
    expect(mergeBOSchemas(derived, undefined)).toBe(derived);
  });

  it('returns curated unchanged when no derived entry exists', () => {
    const curated: BOSchema = { ...base, source: 'curated', fields: [{ name: 'a', type: 'string' }] };
    expect(mergeBOSchemas(undefined, curated)).toBe(curated);
  });

  it('unions fields with curated definitions winning on collision', () => {
    const derived: BOSchema = {
      ...base,
      source: 'derived',
      fields: [
        { name: 'shared', type: 'string' },
        { name: 'derived_only', type: 'number' },
      ],
    };
    const curated: BOSchema = {
      ...base,
      source: 'curated',
      canonicalId: 'code',
      alternateIds: ['externalid'],
      requiredFields: ['shared'],
      fields: [
        { name: 'shared', type: 'DateContainer', required: true },
        { name: 'curated_only', type: 'string' },
      ],
    };
    const merged = mergeBOSchemas(derived, curated);
    expect(merged.source).toBe('curated');
    expect(merged.canonicalId).toBe('code');
    expect(merged.alternateIds).toEqual(['externalid']);
    expect(merged.requiredFields).toEqual(['shared']);
    const shared = merged.fields.find((f) => f.name === 'shared');
    expect(shared).toEqual({ name: 'shared', type: 'DateContainer', required: true });
    expect(merged.fields.map((f) => f.name).sort()).toEqual(
      ['curated_only', 'derived_only', 'shared']
    );
  });
});

describe('getSchema', () => {
  it('returns curated schema for curated BO', () => {
    const s = getSchema('Project');
    expect(s.source).toBe('curated');
    expect(s.canonicalId).toBe('id');
  });

  it('returns derived schema for derived BO', () => {
    const s = getSchema('Attributeset');
    expect(s.source).toBe('derived');
    expect(s.fields.length).toBeGreaterThan(0);
  });

  it('returns passthrough schema for unknown BO', () => {
    const s = getSchema('CompletelyUnknownBOXYZ');
    expect(s.source).toBe('passthrough');
    expect(s.canonicalId).toBe('id');
    expect(s.alternateIds).toEqual([]);
    expect(s.requiredFields).toEqual([]);
    expect(s.fields).toEqual([]);
  });

  it('passthrough schema does not mutate between calls', () => {
    const s1 = getSchema('UnknownA');
    const s2 = getSchema('UnknownB');
    expect(s1).not.toBe(s2);
    expect(s1.source).toBe('passthrough');
    expect(s2.source).toBe('passthrough');
  });
});
