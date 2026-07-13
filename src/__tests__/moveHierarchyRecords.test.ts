import moveHierarchyRecords from '../mcp/tools/moveHierarchyRecords';
import type SPPClient from '../clients/SPPClient';

// Fixture nodes: hierarchy H1, source node 15, target node 18.
const NODE_15 = { id: '15', hierarchyid: 'H1', is_a_node: '1', is_a_level: '0', levelid: '0', name: 'Mobile Development' };
const NODE_18 = { id: '18', hierarchyid: 'H1', is_a_node: '1', is_a_level: '0', levelid: '0', name: 'Development' };

// Association row: user 142 under node 15 (the incident's Mahmoud).
const ASSOC_1045 = { id: '1045', hierarchyid: 'H1', parentid: '15', recordid: '142', is_a_node: '0', is_a_level: '0', levelid: '0', name: '' };
const NEW_ASSOC_2001 = { id: '2001', hierarchyid: 'H1', parentid: '18', recordid: '142', is_a_node: '0', is_a_level: '0', levelid: '0', name: '' };

type ListFixture = (filter: Record<string, any>) => any[];

/** Build a mock client whose list() answers from a mutable fixture function. */
function mockClient(listFixture: ListFixture) {
  const client = {
    list: jest.fn((_bo: string, filter: Record<string, any>) => Promise.resolve(listFixture(filter))),
    add: jest.fn().mockResolvedValue(NEW_ASSOC_2001),
    delete: jest.fn().mockResolvedValue([{ id: '1045', ok: true, status: 'D' }]),
  } as unknown as SPPClient;
  return client;
}

function parsed(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0]!.text);
}

const key = (f: Record<string, any>) => JSON.stringify(f);

describe('move_hierarchy_records', () => {
  it('happy path: add-before-delete with read-back verification', async () => {
    let added = false;
    let deleted = false;
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '18', recordid: '142' }): return added ? [NEW_ASSOC_2001] : [];
        case key({ parentid: '15', recordid: '142' }): return deleted ? [] : [ASSOC_1045];
        case key({ id: '1045' }): return deleted ? [] : [ASSOC_1045];
        default: return [];
      }
    });
    (client.add as jest.Mock).mockImplementation(() => { added = true; return Promise.resolve(NEW_ASSOC_2001); });
    (client.delete as jest.Mock).mockImplementation(() => { deleted = true; return Promise.resolve([{ id: '1045', ok: true, status: 'D' }]); });

    const result = await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    );
    const body = parsed(result);
    expect(body.ok).toBe(true);
    expect(body.results[0]).toMatchObject({ recordId: '142', outcome: 'moved', newAssociationId: '2001' });
    expect(body.summary).toMatchObject({ moved: 1, skipped: 0, partiallyMoved: 0, failed: 0 });
    // add must be called BEFORE delete
    const addOrder = (client.add as jest.Mock).mock.invocationCallOrder[0]!;
    const delOrder = (client.delete as jest.Mock).mock.invocationCallOrder[0]!;
    expect(addOrder).toBeLessThan(delOrder);
    // payload cloned from the old association
    expect(client.add).toHaveBeenCalledWith('HierarchyNode', expect.objectContaining({
      hierarchyid: 'H1', parentid: '18', recordid: '142',
    }));
  });

  it('already at target with no old association → skipped, zero writes', async () => {
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '18', recordid: '142' }): return [NEW_ASSOC_2001];
        case key({ parentid: '15', recordid: '142' }): return [];
        default: return [];
      }
    });
    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    ));
    expect(body.results[0].outcome).toBe('skipped');
    expect(client.add).not.toHaveBeenCalled();
    expect(client.delete).not.toHaveBeenCalled();
  });

  it('resumes a previous partial move: target exists + old exists → delete-only', async () => {
    let deleted = false;
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '18', recordid: '142' }): return [NEW_ASSOC_2001];
        case key({ parentid: '15', recordid: '142' }): return deleted ? [] : [ASSOC_1045];
        case key({ id: '1045' }): return deleted ? [] : [ASSOC_1045];
        default: return [];
      }
    });
    (client.delete as jest.Mock).mockImplementation(() => { deleted = true; return Promise.resolve([{ id: '1045', ok: true, status: 'D' }]); });

    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    ));
    expect(body.results[0].outcome).toBe('moved');
    expect(client.add).not.toHaveBeenCalled();
    expect(client.delete).toHaveBeenCalledWith('HierarchyNode', '1045');
  });

  it('add fails → failed, old association untouched (delete never called)', async () => {
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '18', recordid: '142' }): return [];
        case key({ parentid: '15', recordid: '142' }): return [ASSOC_1045];
        default: return [];
      }
    });
    (client.add as jest.Mock).mockRejectedValue(new Error('SPP add failed with status 807'));

    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    ));
    expect(body.ok).toBe(false);
    expect(body.results[0].outcome).toBe('failed');
    expect(body.results[0].errors[0]).toMatch(/still under the source node/);
    expect(client.delete).not.toHaveBeenCalled();
  });

  it('add reports success but read-back finds nothing → failed, no delete', async () => {
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '18', recordid: '142' }): return []; // never appears
        case key({ parentid: '15', recordid: '142' }): return [ASSOC_1045];
        default: return [];
      }
    });
    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    ));
    expect(body.results[0].outcome).toBe('failed');
    expect(body.results[0].errors[0]).toMatch(/did not appear on read-back/);
    expect(client.delete).not.toHaveBeenCalled();
  });

  it('delete fails and row persists → partially_moved with both association ids reported', async () => {
    let added = false;
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '18', recordid: '142' }): return added ? [NEW_ASSOC_2001] : [];
        case key({ parentid: '15', recordid: '142' }): return [ASSOC_1045];
        case key({ id: '1045' }): return [ASSOC_1045]; // still there after delete
        default: return [];
      }
    });
    (client.add as jest.Mock).mockImplementation(() => { added = true; return Promise.resolve(NEW_ASSOC_2001); });
    (client.delete as jest.Mock).mockRejectedValue(new Error('SPP delete failed with status 602'));

    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    ));
    expect(body.ok).toBe(false);
    expect(body.results[0].outcome).toBe('partially_moved');
    expect(body.results[0].newAssociationId).toBe('2001');
    expect(body.results[0].note).toMatch(/BOTH nodes/);
    expect(body.results[0].note).toMatch(/1045/);
  });

  it('incident regression: delete reports an error but read-back confirms removal → moved', async () => {
    let added = false;
    let deleteAttempted = false;
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '18', recordid: '142' }): return added ? [NEW_ASSOC_2001] : [];
        case key({ parentid: '15', recordid: '142' }): return deleteAttempted ? [] : [ASSOC_1045];
        case key({ id: '1045' }): return deleteAttempted ? [] : [ASSOC_1045];
        default: return [];
      }
    });
    (client.add as jest.Mock).mockImplementation(() => { added = true; return Promise.resolve(NEW_ASSOC_2001); });
    // SPP performs the delete but reports an error — exactly the incident's behavior.
    (client.delete as jest.Mock).mockImplementation(() => {
      deleteAttempted = true;
      return Promise.reject(new Error('An unknown error occurred'));
    });

    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    ));
    expect(body.results[0].outcome).toBe('moved');
    expect(body.results[0].note).toMatch(/read-back confirmed removal/);
  });

  it('preflight: cross-hierarchy move is rejected before any per-record work', async () => {
    const otherHierarchyNode = { ...NODE_18, hierarchyid: 'H2' };
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [otherHierarchyNode];
        case key({ id: '15' }): return [NODE_15];
        default: return [];
      }
    });
    const result = await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    );
    expect(result.isError).toBe(true);
    expect(parsed(result).error).toMatch(/different hierarchies/);
  });

  it('preflight: missing target node is rejected', async () => {
    const client = mockClient(() => []);
    const result = await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'] },
      { sppClient: client }
    );
    expect(result.isError).toBe(true);
    expect(parsed(result).error).toMatch(/not found/);
  });

  it('record under neither node → failed with explanation', async () => {
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        default: return [];
      }
    });
    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['999'] },
      { sppClient: client }
    ));
    expect(body.results[0].outcome).toBe('failed');
    expect(body.results[0].errors[0]).toMatch(/not under the source node/);
  });

  it('dryRun performs zero writes and reports the plan', async () => {
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '18', recordid: '142' }): return [];
        case key({ parentid: '15', recordid: '142' }): return [ASSOC_1045];
        default: return [];
      }
    });
    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', recordIds: ['142'], dryRun: true },
      { sppClient: client }
    ));
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.results[0].outcome).toBe('planned');
    expect(client.add).not.toHaveBeenCalled();
    expect(client.delete).not.toHaveBeenCalled();
  });

  it('omitted recordIds enumerates all records under the source node (stability sweep unions differing listings)', async () => {
    // Simulate the unstable listing from the incident: first sweep sees users
    // {142, 128}, second sweep sees {128, 117}. The union must cover all three.
    let sweepCall = 0;
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '15' }): {
          sweepCall++;
          if (sweepCall === 1) return [
            { ...ASSOC_1045 },
            { id: '1046', parentid: '15', recordid: '128', hierarchyid: 'H1', is_a_node: '0', is_a_level: '0', levelid: '0' },
          ];
          return [
            { id: '1046', parentid: '15', recordid: '128', hierarchyid: 'H1', is_a_node: '0', is_a_level: '0', levelid: '0' },
            { id: '1047', parentid: '15', recordid: '117', hierarchyid: 'H1', is_a_node: '0', is_a_level: '0', levelid: '0' },
          ];
        }
        default: return [];
      }
    });

    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', dryRun: true },
      { sppClient: client }
    ));
    expect(body.enumerated).toBe(3);
    expect(body.results.map((r: any) => r.recordId).sort()).toEqual(['117', '128', '142']);
  });

  it('sub-nodes under the source node are not treated as memberships during enumeration', async () => {
    const client = mockClient((filter) => {
      switch (key(filter)) {
        case key({ id: '18' }): return [NODE_18];
        case key({ id: '15' }): return [NODE_15];
        case key({ parentid: '15' }): return [
          { ...ASSOC_1045 },
          // child sub-node: no recordid
          { id: '16', parentid: '15', recordid: '0', hierarchyid: 'H1', is_a_node: '1', is_a_level: '0', levelid: '0', name: 'Sub team' },
        ];
        default: return [];
      }
    });
    const body = parsed(await moveHierarchyRecords.handler(
      { hierarchyNodeIdFrom: '15', hierarchyNodeIdTo: '18', dryRun: true },
      { sppClient: client }
    ));
    expect(body.enumerated).toBe(1);
    expect(body.results[0].recordId).toBe('142');
  });
});
