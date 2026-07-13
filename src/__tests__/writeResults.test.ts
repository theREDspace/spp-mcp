import { DataExtractor } from '../utils/DataExtractor';
import { BOService } from '../services/BOService';
import { SPPAuthError, SPPBusinessError } from '../clients/errors';
import type SPPClient from '../clients/SPPClient';

describe('DataExtractor.extractWriteResults', () => {
  it('parses a single successful block with a record', () => {
    const response = { Auth: { status: '0' }, Modify: { status: '0', User: { id: '142' } } };
    const results = DataExtractor.extractWriteResults(response, ['Modify']);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe(0);
    expect(results[0]!.record).toEqual({ id: '142' });
  });

  it('parses a single failed block without throwing (per-record status is data)', () => {
    const response = { Auth: { status: '0' }, Delete: { status: '602', errors: 'not allowed' } };
    const results = DataExtractor.extractWriteResults(response, ['Delete']);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe(602);
    expect(results[0]!.errorMessage).toBe('not allowed');
  });

  it('parses multi-block responses with mixed outcomes in document order', () => {
    const response = {
      Auth: { status: '0' },
      Modify: [
        { status: '0', User: { id: '1' } },
        { status: '602' },
        { status: '0', User: { id: '3' } },
      ],
    };
    const results = DataExtractor.extractWriteResults(response, ['Modify']);
    expect(results.map((r) => r.status)).toEqual([0, 602, 0]);
    expect(results[1]!.errorMessage).toBeDefined();
  });

  it('treats a block without a status attribute as success', () => {
    const response = { Delete: {} };
    const results = DataExtractor.extractWriteResults(response, ['Delete']);
    expect(results[0]!.status).toBe(0);
  });

  it('still throws SPPAuthError on invalid access token', () => {
    const response = { Auth: { '#text': 'invalid access token' } };
    expect(() => DataExtractor.extractWriteResults(response, ['Delete'])).toThrow(SPPAuthError);
  });

  it('throws SPPAuthError when a block reports auth-invalid status', () => {
    const response = { Modify: { status: '2' } }; // SPPStatus.AuthInvalid = 2
    expect(() => DataExtractor.extractWriteResults(response, ['Modify'])).toThrow(SPPAuthError);
  });
});

function mockClient(parsedResponse: any): SPPClient {
  return {
    callSPPXMLParsed: jest.fn().mockResolvedValue(parsedResponse),
    callSPPXML: jest.fn(),
  } as unknown as SPPClient;
}

describe('BOService write results', () => {
  describe('delete', () => {
    it('single id: returns a D-status result when SPP reports success', async () => {
      const svc = new BOService(mockClient({ Delete: { status: '0' } }));
      const results = await svc.delete('HierarchyNode', '1045');
      expect(results).toEqual([{ id: '1045', ok: true, status: 'D', record: undefined }]);
    });

    it('single id: throws SPPBusinessError with the real SPP code on failure', async () => {
      const svc = new BOService(mockClient({ Delete: { status: '602', errors: 'no permission' } }));
      await expect(svc.delete('HierarchyNode', '1045')).rejects.toThrow(SPPBusinessError);
      await expect(svc.delete('HierarchyNode', '1045')).rejects.toMatchObject({
        detail: { code: '602' },
      });
    });

    it('bulk: zips per-block statuses per-index instead of applying block[0] to all', async () => {
      const svc = new BOService(
        mockClient({ Delete: [{ status: '0' }, { status: '602' }, { status: '0' }] })
      );
      const results = await svc.delete('HierarchyNode', ['1', '2', '3']);
      expect(results.map((r) => ({ id: r.id, ok: r.ok }))).toEqual([
        { id: '1', ok: true },
        { id: '2', ok: false },
        { id: '3', ok: true },
      ]);
      expect(results[1]!.errors?.[0]?.code).toBe('602');
    });

    it('does not swallow transport/auth errors into fabricated per-record results', async () => {
      const client = {
        callSPPXMLParsed: jest
          .fn()
          .mockRejectedValue(new SPPAuthError({ code: '2', message: 'expired' })),
      } as unknown as SPPClient;
      const svc = new BOService(client);
      await expect(svc.delete('HierarchyNode', ['1', '2'])).rejects.toThrow(SPPAuthError);
    });

    it('reports a missing response block as a failure, not a success', async () => {
      const svc = new BOService(mockClient({ Delete: { status: '0' } }));
      const results = await svc.delete('HierarchyNode', ['1', '2']);
      expect(results[0]!.ok).toBe(true);
      expect(results[1]!.ok).toBe(false);
    });
  });

  describe('update', () => {
    it('single: returns the record on success', async () => {
      const svc = new BOService(mockClient({ Modify: { status: '0', User: { id: '142' } } }));
      const record = await svc.update('User', '142', { name: 'x' } as any);
      expect(record).toEqual({ id: '142' });
    });

    it('single: throws SPPBusinessError with the real code on failure', async () => {
      const svc = new BOService(mockClient({ Modify: { status: '602' } }));
      await expect(svc.update('User', '142', { name: 'x' } as any)).rejects.toMatchObject({
        detail: { code: '602' },
      });
    });

    it('bulk: returns per-record results without throwing on partial failure', async () => {
      const svc = new BOService(
        mockClient({ Modify: [{ status: '0', User: { id: '1' } }, { status: '601' }] })
      );
      const results = await svc.update('User', [
        { id: '1', changes: { name: 'a' } as any },
        { id: '2', changes: { name: 'b' } as any },
      ]);
      expect(results.map((r) => r.ok)).toEqual([true, false]);
      expect(results[0]!.id).toBe('1');
      expect(results[1]!.status).toBe('601');
    });
  });

  describe('add', () => {
    it('single: returns the created record on success', async () => {
      const svc = new BOService(mockClient({ Add: { status: '0', HierarchyNode: { id: '2001' } } }));
      const record = await svc.add('HierarchyNode', { parentid: '18', recordid: '142' } as any);
      expect(record).toEqual({ id: '2001' });
    });

    it('single: throws on failure', async () => {
      const svc = new BOService(mockClient({ Add: { status: '807' } }));
      await expect(
        svc.add('HierarchyNode', { parentid: '18' } as any)
      ).rejects.toThrow(SPPBusinessError);
    });

    it('bulk: returns per-record results with created ids', async () => {
      const svc = new BOService(
        mockClient({ Add: [{ status: '0', User: { id: '9' } }, { status: '807' }] })
      );
      const results = await svc.add('User', [{ name: 'a' } as any, { name: 'b' } as any]);
      expect(results[0]).toMatchObject({ ok: true, id: '9' });
      expect(results[1]).toMatchObject({ ok: false, status: '807' });
    });
  });
});
