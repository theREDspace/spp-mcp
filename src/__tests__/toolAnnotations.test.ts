import { mcpTools } from '../mcp/tools/index';

describe('mcpTools annotations and ordering', () => {
  it('is sorted by name ascending', () => {
    const names = mcpTools.map((t) => t.name);
    const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(names).toEqual(sorted);
  });

  it('every tool has openWorldHint: true', () => {
    for (const tool of mcpTools) {
      expect(tool.annotations?.openWorldHint).toBe(true);
    }
  });

  it('marks read-only tools with readOnlyHint', () => {
    const readOnlyNames = [
      'list_object_types',
      'describe_object_type',
      'generic_read',
      'generic_list',
      'generic_batch_list',
      'whoami',
      'get_user_profile',
    ];
    for (const name of readOnlyNames) {
      const tool = mcpTools.find((t) => t.name === name);
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    }
  });

  it('marks generic_add as non-idempotent', () => {
    const tool = mcpTools.find((t) => t.name === 'generic_add');
    expect(tool?.annotations?.idempotentHint).toBe(false);
  });

  it('marks generic_update and generic_delete as destructive and idempotent', () => {
    for (const name of ['generic_update', 'generic_delete']) {
      const tool = mcpTools.find((t) => t.name === name);
      expect(tool?.annotations?.destructiveHint).toBe(true);
      expect(tool?.annotations?.idempotentHint).toBe(true);
    }
  });

  it('marks move_hierarchy_records as destructive and non-idempotent', () => {
    const tool = mcpTools.find((t) => t.name === 'move_hierarchy_records');
    expect(tool?.annotations?.destructiveHint).toBe(true);
    expect(tool?.annotations?.idempotentHint).toBe(false);
  });
});
