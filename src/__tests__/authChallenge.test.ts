import { getResourceMetadataUrl, buildBearerChallenge } from '../utils/authChallenge';

describe('getResourceMetadataUrl', () => {
  const originalEnv = process.env.APP_BASE_URL;

  afterEach(() => {
    process.env.APP_BASE_URL = originalEnv;
  });

  it('uses APP_BASE_URL when set', () => {
    process.env.APP_BASE_URL = 'https://example.com';
    expect(getResourceMetadataUrl()).toBe(
      'https://example.com/.well-known/oauth-protected-resource'
    );
  });

  it('strips trailing slash from APP_BASE_URL', () => {
    process.env.APP_BASE_URL = 'https://example.com/';
    expect(getResourceMetadataUrl()).toBe(
      'https://example.com/.well-known/oauth-protected-resource'
    );
  });

  it('falls back to localhost:3030 when APP_BASE_URL is not set', () => {
    delete process.env.APP_BASE_URL;
    expect(getResourceMetadataUrl()).toBe(
      'http://localhost:3030/.well-known/oauth-protected-resource'
    );
  });
});

describe('buildBearerChallenge', () => {
  beforeEach(() => {
    process.env.APP_BASE_URL = 'https://example.com';
  });

  it('returns base challenge with no extras', () => {
    expect(buildBearerChallenge()).toBe(
      'Bearer realm="spp-mcp", resource_metadata="https://example.com/.well-known/oauth-protected-resource"'
    );
  });

  it('appends extra parts', () => {
    expect(buildBearerChallenge(['error="invalid_token"'])).toBe(
      'Bearer realm="spp-mcp", resource_metadata="https://example.com/.well-known/oauth-protected-resource", error="invalid_token"'
    );
  });
});
