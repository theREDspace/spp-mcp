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
});
