import { AUTH_ERROR_TYPE, fail, ok } from '../mcp/helpers/toolResult';
import { SPPAuthError } from '../clients/errors';
import { SPPStatus } from '../utils/errorCodes';

describe('AUTH_ERROR_TYPE', () => {
  it('is exported and equals AUTH_ERROR', () => {
    expect(AUTH_ERROR_TYPE).toBe('AUTH_ERROR');
  });
});

describe('fail()', () => {
  it('sets type to AUTH_ERROR_TYPE for SPPAuthError', () => {
    const err = new SPPAuthError({ code: String(SPPStatus.AuthInvalid), message: 'expired' });
    const result = fail(err);
    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.content[0].text);
    expect(payload.type).toBe(AUTH_ERROR_TYPE);
  });

  it('does not set AUTH_ERROR type for generic errors', () => {
    const result = fail(new Error('something else'));
    const payload = JSON.parse(result.content[0].text);
    expect(payload.type).not.toBe(AUTH_ERROR_TYPE);
  });
});

describe('ok()', () => {
  it('sets isError to false', () => {
    expect(ok({ foo: 'bar' }).isError).toBe(false);
  });
});
