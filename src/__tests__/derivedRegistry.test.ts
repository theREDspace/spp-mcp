import { derivedRegistry } from '../services/boSchemaRegistry.derived';

describe('derivedRegistry', () => {
  it('Attributeset is present with correct fields', () => {
    const s = derivedRegistry['Attributeset']!;
    expect(s).toBeDefined();
    expect(s.source).toBe('derived');
    expect(s.canonicalId).toBe('id');
    expect(s.requiredFields).toEqual([]);
    const fieldNames = s.fields.map(f => f.name);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('created');
    expect(fieldNames).toContain('updated');
  });

  it('maps DateContainer fields correctly', () => {
    const s = derivedRegistry['Attributeset']!;
    const created = s.fields.find(f => f.name === 'created');
    expect(created?.type).toBe('DateContainer');
    const name = s.fields.find(f => f.name === 'name');
    expect(name?.type).toBe('string');
  });

  it('Currency is present', () => {
    const s = derivedRegistry['Currency']!;
    expect(s).toBeDefined();
    expect(s.source).toBe('derived');
    const rateField = s.fields.find(f => f.name === 'rate');
    expect(rateField?.type).toBe('number');
  });

  it('alternateIds picks up externalid/code when present', () => {
    const agreement = derivedRegistry['Agreement'];
    if (agreement) {
      const hasExternalId = agreement.fields.some(f => f.name === 'externalid');
      if (hasExternalId) {
        expect(agreement.alternateIds).toContain('externalid');
      }
    }
  });

  it('does not include Wrapper interfaces as entries', () => {
    for (const key of Object.keys(derivedRegistry)) {
      expect(key.endsWith('Wrapper')).toBe(false);
    }
  });

  it('has at least 50 entries', () => {
    expect(Object.keys(derivedRegistry).length).toBeGreaterThan(50);
  });
});
