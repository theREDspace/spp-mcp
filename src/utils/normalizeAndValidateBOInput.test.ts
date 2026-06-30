import { normalizeAndValidateBOInput, normalizeIdForBO } from './normalizeAndValidateBOInput';
import { boSchemaRegistry } from '../services/boSchemaRegistry';

describe('normalizeAndValidateBOInput', () => {
  it('validates and normalizes Project payload (string/required)', () => {
    const input = { id: 'P1', code: 42, name: 'Test', userid: 'U1' };
    const result = normalizeAndValidateBOInput('Project', input, 'payload');
    expect(result).toEqual({ id: 'P1', code: '42', name: 'Test', userid: 'U1' });
  });

  it('throws if required field missing', () => {
    const input = { id: 'P1', name: 'Test' };
    expect(() => normalizeAndValidateBOInput('Project', input, 'payload')).toThrow();
  });

  it('accepts and validates DateContainer in Task', () => {
    const input = {
      id: 'T1',
      date: { Date: { year: 2024, month: 5, day: 27 } },
      projectid: 'P1'
    };
    const result = normalizeAndValidateBOInput('Task', input, 'payload');
    expect(typeof result.date).toBe('object');
  });

  it('accepts ISO string for DateContainer', () => {
    const input = {
      id: 'T2',
      date: '2024-05-27T00:00:00Z',
      projectid: 'P1'
    };
    const result = normalizeAndValidateBOInput('Task', input, 'payload');
    expect(typeof result.date).toBe('string');
  });

  it('validates filter accepts all fields optional', () => {
    const input = { code: 99 };
    const result = normalizeAndValidateBOInput('Project', input, 'filter');
    expect(result.code).toBe("99");
  });
});

describe('normalizeIdForBO', () => {
  it('accepts canonical and alternate IDs', () => {
    const pSchema = boSchemaRegistry['Project'];
    let result = normalizeIdForBO('Project', { id: 'P12' });
    expect(result.idField).toBe('id');
    expect(result.id).toBe('P12');
    result = normalizeIdForBO('Project', { code: 'C123' });
    expect(result.idField).toBe('code');
    expect(result.id).toBe('C123');
  });

  it('throws if no valid id provided', () => {
    expect(() => normalizeIdForBO('Project', { foo: 'bar' })).toThrow();
  });
});

// --- New tests for source-aware validation ---

describe('normalizeAndValidateBOInput — derived BO (Attributeset)', () => {
  it('accepts known fields for a derived BO', () => {
    const result = normalizeAndValidateBOInput('Attributeset', { name: 'My Set', notes: 'info' }, 'filter');
    expect(result.name).toBe('My Set');
  });

  it('passes unknown fields through (lenient mode) for derived BO', () => {
    const result = normalizeAndValidateBOInput('Attributeset', { name: 'x', custom_field: 'abc' }, 'filter');
    expect((result as any).custom_field).toBe('abc');
  });

  it('does NOT throw for missing required-looking fields in derived payload', () => {
    expect(() => normalizeAndValidateBOInput('Attributeset', { name: 'only name' }, 'payload')).not.toThrow();
  });
});

describe('normalizeAndValidateBOInput — passthrough BO (unknown type)', () => {
  it('accepts any fields for a truly unknown BO', () => {
    const result = normalizeAndValidateBOInput('CompletelyUnknownBO', { foo: 'bar', baz: 42 }, 'filter');
    expect((result as any).foo).toBe('bar');
    expect((result as any).baz).toBe(42);
  });
});

describe('normalizeAndValidateBOInput — curated BO regression', () => {
  it('still rejects unknown fields on curated BOs (strict mode)', () => {
    expect(() => normalizeAndValidateBOInput('Project', { id: 'P1', code: '42', name: 'Test', userid: 'U1', unknownField: 'x' }, 'payload')).toThrow();
  });
});

describe('normalizeIdForBO — passthrough BO', () => {
  it('resolves id field for passthrough BO', () => {
    const result = normalizeIdForBO('UnknownBOXYZ', { id: 'X123' });
    expect(result.idField).toBe('id');
    expect(result.id).toBe('X123');
  });

  it('throws if no id provided for passthrough BO', () => {
    expect(() => normalizeIdForBO('UnknownBOXYZ', { someOtherField: 'x' })).toThrow();
  });
});
