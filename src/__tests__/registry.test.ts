import { mergedRegistry, getSchema } from '../services/registry';
import { boSchemaRegistry } from '../services/boSchemaRegistry';

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
