import { _resetForTests, load } from '../config';

describe('config.load', () => {
  const savedEnv = { ...process.env };
  beforeEach(() => {
    _resetForTests();
    process.env = { ...savedEnv };
  });
  afterAll(() => {
    process.env = savedEnv;
  });

  function setMinimal() {
    Object.assign(process.env, {
      SPP_URL: 'https://example.com',
      SPP_CLIENT_ID: 'cid',
      SPP_CLIENT_SECRET: 'csec',
      SPP_CALLBACK_URL: 'https://example.com/cb',
      SPP_NAMESPACE: 'ns',
      SPP_KEY: 'k',
    });
  }

  it('loads with required env present', () => {
    setMinimal();
    const cfg = load();
    expect(cfg.SPP_URL).toBe('https://example.com');
    expect(cfg.PORT).toBe(3030);
    expect(['development', 'test', 'production']).toContain(cfg.NODE_ENV);
    expect(cfg.OAUTH_RATE_LIMIT_PER_MIN).toBe(30);
  });

  it('throws with a readable message when required keys are missing', () => {
    delete process.env.SPP_URL;
    delete process.env.SPP_CLIENT_ID;
    expect(() => load()).toThrow(/Invalid configuration/);
  });

  it('rejects invalid URL values', () => {
    setMinimal();
    process.env.SPP_URL = 'not-a-url';
    expect(() => load()).toThrow(/SPP_URL/);
  });

  it('memoizes across calls', () => {
    setMinimal();
    expect(load()).toBe(load());
  });

  it('defaults MCP_LEGACY to "serve"', () => {
    setMinimal();
    const config = load();
    expect(config.MCP_LEGACY).toBe('serve');
  });

  it('accepts MCP_LEGACY=reject', () => {
    setMinimal();
    process.env.MCP_LEGACY = 'reject';
    const config = load();
    expect(config.MCP_LEGACY).toBe('reject');
  });

  it('rejects an invalid MCP_LEGACY value', () => {
    setMinimal();
    process.env.MCP_LEGACY = 'bogus';
    expect(() => load()).toThrow(/Invalid configuration/);
  });

  it('leaves ALLOWED_ORIGIN_HOSTS and CIMD_ALLOWED_HOSTS undefined when unset', () => {
    setMinimal();
    const config = load();
    expect(config.ALLOWED_ORIGIN_HOSTS).toBeUndefined();
    expect(config.CIMD_ALLOWED_HOSTS).toBeUndefined();
  });

  it('accepts comma-separated ALLOWED_ORIGIN_HOSTS and CIMD_ALLOWED_HOSTS', () => {
    setMinimal();
    process.env.ALLOWED_ORIGIN_HOSTS = 'localhost,127.0.0.1';
    process.env.CIMD_ALLOWED_HOSTS = 'trusted.example.com';
    const config = load();
    expect(config.ALLOWED_ORIGIN_HOSTS).toBe('localhost,127.0.0.1');
    expect(config.CIMD_ALLOWED_HOSTS).toBe('trusted.example.com');
  });
});
