import { isValidRedirectUri } from '../routes/redirectUri';

// Shared by BOTH client-registration paths (CIMD documents and DCR
// /oauth/register). The two validating redirect_uris differently is what
// produced two separate review findings, so this suite pins the one
// implementation both callers use.
describe('isValidRedirectUri', () => {
  it('accepts absolute https URLs', () => {
    expect(isValidRedirectUri('https://client.example/cb')).toBe(true);
    expect(isValidRedirectUri('https://client.example:8443/cb?x=1')).toBe(true);
  });

  it('accepts http only on loopback hosts (RFC 8252 native apps)', () => {
    expect(isValidRedirectUri('http://127.0.0.1:3000/callback')).toBe(true);
    expect(isValidRedirectUri('http://localhost:3000/callback')).toBe(true);
    expect(isValidRedirectUri('http://[::1]:3000/callback')).toBe(true);
  });

  it('rejects plaintext http on a public host', () => {
    // Would carry the authorization code over cleartext.
    expect(isValidRedirectUri('http://evil.example/cb')).toBe(false);
    expect(isValidRedirectUri('http://192.0.2.10/cb')).toBe(false);
  });

  it('rejects dangerous and non-absolute schemes', () => {
    expect(isValidRedirectUri('javascript:alert(1)')).toBe(false);
    expect(isValidRedirectUri('data:text/html,<script>1</script>')).toBe(false);
    expect(isValidRedirectUri('file:///etc/passwd')).toBe(false);
    expect(isValidRedirectUri('/relative/path')).toBe(false);
    expect(isValidRedirectUri('not a url at all')).toBe(false);
  });

  it('rejects non-string and empty input', () => {
    expect(isValidRedirectUri(undefined)).toBe(false);
    expect(isValidRedirectUri(null)).toBe(false);
    expect(isValidRedirectUri(42)).toBe(false);
    expect(isValidRedirectUri({})).toBe(false);
    expect(isValidRedirectUri('')).toBe(false);
  });
});
