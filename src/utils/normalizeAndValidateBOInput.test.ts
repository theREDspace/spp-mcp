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
