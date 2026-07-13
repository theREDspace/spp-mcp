import genericUpdate from '../mcp/tools/genericUpdate';
import genericAdd from '../mcp/tools/genericAdd';
import genericDelete from '../mcp/tools/genericDelete';
import { mcpTools } from '../mcp/tools/index';
import type SPPClient from '../clients/SPPClient';

function ctxWith(overrides: Partial<Record<'update' | 'add' | 'delete' | 'read', jest.Mock>> = {}) {
  const sppClient = {
    update: jest.fn(),
    add: jest.fn(),
    delete: jest.fn(),
    read: jest.fn(),
    ...overrides,
  } as unknown as SPPClient;
  return { sppClient };
}

function parsed(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0]!.text);
}

describe('tool registry', () => {
  it('registers move_hierarchy_records and advertises bulk on the write tools', () => {
    const names = mcpTools.map((t) => t.name);
    expect(names).toContain('move_hierarchy_records');
    for (const name of ['generic_update', 'generic_add', 'generic_delete']) {
      const tool = mcpTools.find((t) => t.name === name)!;
      expect(tool.description).toMatch(/[Bb]ulk/);
    }
  });
});

describe('generic_update bulk input', () => {
  it('input schema accepts both single and bulk forms', () => {
    const schema = genericUpdate.inputSchema;
    expect(() => schema.parse({ objectType: 'User', id: '1', changes: { name: 'x' } })).not.toThrow();
    expect(() =>
      schema.parse({ objectType: 'User', updates: [{ id: '1', changes: { name: 'x' } }] })
    ).not.toThrow();
  });

  it('input schema rejects more than 100 updates', () => {
    const updates = Array.from({ length: 101 }, (_, i) => ({ id: String(i), changes: { name: 'x' } }));
    expect(() => genericUpdate.inputSchema.parse({ objectType: 'User', updates })).toThrow();
  });

  it('rejects providing both single and bulk forms', async () => {
    const result = await genericUpdate.handler(
      { objectType: 'User', id: '1', changes: { name: 'x' }, updates: [{ id: '2', changes: { name: 'y' } }] },
      ctxWith()
    );
    expect(result.isError).toBe(true);
    expect(parsed(result).error).toMatch(/not both/);
  });

  it('rejects providing neither form', async () => {
    const result = await genericUpdate.handler({ objectType: 'User' }, ctxWith());
    expect(result.isError).toBe(true);
  });

  it('aborts the whole batch with the failing index when one record fails validation', async () => {
    const ctx = ctxWith();
    const result = await genericUpdate.handler(
      {
        objectType: 'User',
        updates: [
          { id: '1', changes: { name: 'ok' } },
          { id: '2', changes: { not_a_real_user_field: 'x' } },
        ],
      },
      ctx
    );
    expect(result.isError).toBe(true);
    expect(parsed(result).error).toMatch(/updates\[1\]/);
    expect((ctx.sppClient.update as jest.Mock)).not.toHaveBeenCalled();
  });

  it('sends the whole batch in one SPP call and reports per-record results', async () => {
    const ctx = ctxWith({
      update: jest.fn().mockResolvedValue([
        { id: '1', ok: true, status: '0' },
        { id: '2', ok: false, status: '602', errors: [{ code: '602', text: 'denied' }] },
      ]),
    });
    const result = await genericUpdate.handler(
      {
        objectType: 'User',
        updates: [
          { id: '1', changes: { hierarchy_node_ids: '18' } },
          { id: '2', changes: { hierarchy_node_ids: '18' } },
        ],
      },
      ctx
    );
    expect(ctx.sppClient.update).toHaveBeenCalledTimes(1);
    expect(ctx.sppClient.update).toHaveBeenCalledWith('User', [
      { id: '1', changes: { hierarchy_node_ids: '18' } },
      { id: '2', changes: { hierarchy_node_ids: '18' } },
    ]);
    const body = parsed(result);
    expect(result.isError).toBe(false);
    expect(body.ok).toBe(false); // partial failure
    expect(body.succeeded).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.results).toHaveLength(2);
  });

  it('single form is unchanged', async () => {
    const ctx = ctxWith({ update: jest.fn().mockResolvedValue({ id: '1' }) });
    const result = await genericUpdate.handler(
      { objectType: 'User', id: '1', changes: { name: 'x' } },
      ctx
    );
    expect(ctx.sppClient.update).toHaveBeenCalledWith('User', '1', { name: 'x' });
    expect(parsed(result)).toMatchObject({ ok: true, operation: 'update', data: { id: '1' } });
  });
});

describe('generic_add bulk input', () => {
  it('rejects both forms together and neither form', async () => {
    const both = await genericAdd.handler(
      { objectType: 'HierarchyNode', payload: { a: 1 }, payloads: [{ a: 1 }] },
      ctxWith()
    );
    expect(both.isError).toBe(true);
    const neither = await genericAdd.handler({ objectType: 'HierarchyNode' }, ctxWith());
    expect(neither.isError).toBe(true);
  });

  it('validates each payload and reports the failing index', async () => {
    const ctx = ctxWith();
    const result = await genericAdd.handler(
      {
        objectType: 'HierarchyNode',
        payloads: [
          { hierarchyid: 'H1', name: 'n', is_a_level: '0', is_a_node: '1', levelid: '0' },
          { bogus_field: 'x' },
        ],
      },
      ctx
    );
    expect(result.isError).toBe(true);
    expect(parsed(result).error).toMatch(/payloads\[1\]/);
    expect(ctx.sppClient.add as jest.Mock).not.toHaveBeenCalled();
  });

  it('sends the batch in one SPP call with per-record results', async () => {
    const ctx = ctxWith({
      add: jest.fn().mockResolvedValue([
        { id: '10', ok: true, status: '0', record: { id: '10' } },
        { id: '11', ok: true, status: '0', record: { id: '11' } },
      ]),
    });
    const result = await genericAdd.handler(
      {
        objectType: 'HierarchyNode',
        payloads: [
          { hierarchyid: 'H1', name: 'a', is_a_level: '0', is_a_node: '1', levelid: '0' },
          { hierarchyid: 'H1', name: 'b', is_a_level: '0', is_a_node: '1', levelid: '0' },
        ],
      },
      ctx
    );
    expect(ctx.sppClient.add).toHaveBeenCalledTimes(1);
    const body = parsed(result);
    expect(body.ok).toBe(true);
    expect(body.succeeded).toBe(2);
    expect(body.failed).toBe(0);
  });
});

describe('generic_delete bulk input', () => {
  it('rejects both forms together and neither form', async () => {
    const both = await genericDelete.handler(
      { objectType: 'HierarchyNode', id: '1', ids: ['2'] },
      ctxWith()
    );
    expect(both.isError).toBe(true);
    const neither = await genericDelete.handler({ objectType: 'HierarchyNode' }, ctxWith());
    expect(neither.isError).toBe(true);
  });

  it('bulk sends one SPP call and reports per-record outcomes', async () => {
    const ctx = ctxWith({
      delete: jest.fn().mockResolvedValue([
        { id: '1', ok: true, status: 'D' },
        { id: '2', ok: false, status: '602', errors: [{ code: '602', text: 'denied' }] },
      ]),
    });
    const result = await genericDelete.handler({ objectType: 'HierarchyNode', ids: ['1', '2'] }, ctx);
    expect(ctx.sppClient.delete).toHaveBeenCalledWith('HierarchyNode', ['1', '2']);
    const body = parsed(result);
    expect(result.isError).toBe(false);
    expect(body.ok).toBe(false);
    expect(body.succeeded).toBe(1);
    expect(body.failed).toBe(1);
  });

  it('single form still resolves alternate ids and returns data', async () => {
    const ctx = ctxWith({
      delete: jest.fn().mockResolvedValue([{ id: '1045', ok: true, status: 'D' }]),
    });
    const result = await genericDelete.handler({ objectType: 'HierarchyNode', id: '1045' }, ctx);
    expect(ctx.sppClient.delete).toHaveBeenCalledWith('HierarchyNode', '1045');
    expect(parsed(result)).toMatchObject({ ok: true, operation: 'delete' });
  });
});
