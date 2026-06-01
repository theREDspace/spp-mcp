import { verifyPkce } from '../routes/pkce';
import { createHash } from 'crypto';

describe('verifyPkce', () => {
  it('verifies S256 challenge correctly', () => {
    const verifier = 'a'.repeat(50);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    expect(verifyPkce(verifier, challenge, 'S256')).toBe(true);
  });

  it('rejects mismatched S256 verifier', () => {
    const verifier = 'a'.repeat(50);
    const challenge = createHash('sha256').update('other').digest('base64url');
    expect(verifyPkce(verifier, challenge, 'S256')).toBe(false);
  });

  it('verifies plain challenge correctly', () => {
    expect(verifyPkce('abc', 'abc', 'plain')).toBe(true);
    expect(verifyPkce('abc', 'xyz', 'plain')).toBe(false);
  });

  it('returns false on empty inputs', () => {
    expect(verifyPkce('', 'x', 'S256')).toBe(false);
    expect(verifyPkce('x', '', 'S256')).toBe(false);
  });
});
