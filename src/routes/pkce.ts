/**
 * PKCE verification per RFC 7636.
 * S256: BASE64URL(SHA256(verifier)) === code_challenge
 * plain: verifier === code_challenge (discouraged)
 */
import { createHash } from 'crypto';

export function verifyPkce(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (!verifier || !challenge) return false;
  if (method === 'plain') return verifier === challenge;
  const computed = createHash('sha256').update(verifier).digest('base64url');
  return computed === challenge;
}
