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

  // RFC 8252 §7.1 private-use URI schemes — the common case for native and
  // desktop MCP clients. An earlier revision of this validator accepted only
  // https/http and so rejected every one of these, which would have 400'd any
  // already-registered desktop client at /oauth/register.
  it('accepts private-use URI schemes used by native/desktop clients', () => {
    expect(isValidRedirectUri('cursor://anysphere.cursor-retrieval/oauth/callback')).toBe(true);
    expect(isValidRedirectUri('vscode://ms-vscode.mcp/auth')).toBe(true);
    expect(isValidRedirectUri('windsurf://auth/cb')).toBe(true);
    expect(isValidRedirectUri('zed://oauth')).toBe(true);
    // Reverse-DNS form, which has an empty host and only a path.
    expect(isValidRedirectUri('com.example.app:/oauth2redirect')).toBe(true);
  });

  it('rejects a bare custom scheme with nothing to redirect to', () => {
    expect(isValidRedirectUri('myapp:')).toBe(false);
    expect(isValidRedirectUri('myapp:/')).toBe(false);
  });

  it('accepts a single-character path on a custom scheme', () => {
    // A length-based check (pathname.length > 1) rejected this while accepting
    // a 2-character path, conflating a legitimate short path with the bare '/'.
    expect(isValidRedirectUri('com.example.app:x')).toBe(true);
    expect(isValidRedirectUri('com.example.app:xy')).toBe(true);
  });

  // These hand off to an OS-level handler with an attacker-supplied payload
  // and are documented delivery vectors, not hypotheticals — intent: is the
  // Chrome-on-Android redirect/XSS technique, ms-msdt: is CVE-2022-30190
  // (Follina), search-ms:/ms-appinstaller: are active Windows malware vectors.
  it('rejects OS-level handler hand-off schemes', () => {
    expect(isValidRedirectUri('intent://x/#Intent;scheme=javascript;end')).toBe(false);
    expect(isValidRedirectUri('android-app://com.example')).toBe(false);
    expect(isValidRedirectUri('ms-msdt:/id')).toBe(false);
    expect(isValidRedirectUri('search-ms:query=x')).toBe(false);
    expect(isValidRedirectUri('ms-officecmd:{}')).toBe(false);
    expect(isValidRedirectUri('ms-appinstaller://x')).toBe(false);
    expect(isValidRedirectUri('shell:startup')).toBe(false);
    expect(isValidRedirectUri('itms-services://?url=x')).toBe(false);
    expect(isValidRedirectUri('help:openbook')).toBe(false);
  });

  it('rejects script-executing and local-resource schemes', () => {
    expect(isValidRedirectUri('javascript:alert(1)')).toBe(false);
    expect(isValidRedirectUri('data:text/html,<script>1</script>')).toBe(false);
    expect(isValidRedirectUri('vbscript:msgbox(1)')).toBe(false);
    expect(isValidRedirectUri('file:///etc/passwd')).toBe(false);
    expect(isValidRedirectUri('blob:https://x/y')).toBe(false);
    expect(isValidRedirectUri('about:blank')).toBe(false);
    expect(isValidRedirectUri('filesystem:http://x/y')).toBe(false);
    expect(isValidRedirectUri('view-source:http://x')).toBe(false);
    expect(isValidRedirectUri('chrome-extension://abc/x')).toBe(false);
  });

  it('rejects denied schemes regardless of case', () => {
    // new URL() normalizes the scheme to lowercase, so the deny-list is
    // case-insensitive by construction — pin that so it stays true.
    expect(isValidRedirectUri('JavaScript:alert(1)')).toBe(false);
    expect(isValidRedirectUri('DATA:text/html,x')).toBe(false);
    expect(isValidRedirectUri('FILE:///etc/passwd')).toBe(false);
  });

  it('rejects relative and unparseable input', () => {
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
