import { boSchemaRegistry } from '../services/boSchemaRegistry';

describe('boSchemaRegistry', () => {
  it('every entry has source: curated', () => {
    for (const schema of Object.values(boSchemaRegistry)) {
      expect(schema.source).toBe('curated');
    }
  });

  it('BookingSummary entry has expected shape', () => {
    const s = boSchemaRegistry['BookingSummary'];
    expect(s).toBeDefined();
    if (s) {
      expect(s.source).toBe('curated');
      expect(s.canonicalId).toBe('user_id');
      expect(Array.isArray(s.fields)).toBe(true);
    }
  });
});
