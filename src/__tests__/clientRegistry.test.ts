import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('clientRegistry', () => {
  let tmp: string;
  let createClient: typeof import('../routes/clientRegistry').createClient;
  let verifyClientSecret: typeof import('../routes/clientRegistry').verifyClientSecret;
  let extractClientCredentials: typeof import('../routes/clientRegistry').extractClientCredentials;
  let getClient: typeof import('../routes/clientRegistry').getClient;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'spp-clients-'));
    process.env.CLIENT_REGISTRY_PATH = join(tmp, 'clients.json');
    // Fresh require so the module captures the test path.
    jest.isolateModules(() => {
      const mod = require('../routes/clientRegistry');
      createClient = mod.createClient;
      verifyClientSecret = mod.verifyClientSecret;
      extractClientCredentials = mod.extractClientCredentials;
      getClient = mod.getClient;
    });
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
    delete process.env.CLIENT_REGISTRY_PATH;
  });

  it('creates a client with a hashed secret and returns plaintext once', () => {
    const { record, client_secret } = createClient({ client_name: 'inspector' });
    expect(record.client_id).toMatch(/^mcp-[0-9a-f]{32}$/);
    expect(client_secret).toBeDefined();
    expect(record.client_secret_hash).not.toEqual(client_secret);
    expect(getClient(record.client_id)).toBeDefined();
  });

  it('verifies a correct secret and rejects a wrong one', () => {
    const { record, client_secret } = createClient({});
    expect(verifyClientSecret(record.client_id, client_secret)).toBe(true);
    expect(verifyClientSecret(record.client_id, 'wrong')).toBe(false);
    expect(verifyClientSecret('mcp-unknown', client_secret)).toBe(false);
  });

  it('parses Basic auth credentials', () => {
    const header = 'Basic ' + Buffer.from('cid:csec').toString('base64');
    expect(extractClientCredentials(header, {})).toEqual({
      client_id: 'cid',
      client_secret: 'csec',
    });
  });

  it('falls back to POST body credentials', () => {
    expect(extractClientCredentials(undefined, { client_id: 'cid', client_secret: 'csec' })).toEqual({
      client_id: 'cid',
      client_secret: 'csec',
    });
  });

  it('returns null when no credentials are present', () => {
    expect(extractClientCredentials(undefined, {})).toBeNull();
  });

  it('honors token_endpoint_auth_method=none', () => {
    const { record } = createClient({ token_endpoint_auth_method: 'none' });
    expect(record.token_endpoint_auth_method).toBe('none');
  });
});
