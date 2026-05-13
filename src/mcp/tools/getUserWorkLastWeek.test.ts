import getUserWorkLastWeek from './getUserWorkLastWeek';
import * as auth from '../helpers/auth';
import * as resolvers from '../helpers/resolvers';

describe('getUserWorkLastWeek tool', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-12T12:00:00Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows slip notes where present, omits where missing, truncates long notes', async () => {
    jest.spyOn(auth, 'getAuthenticatedClient').mockReturnValue({
      list: jest.fn().mockResolvedValue([
        { projectid: 'P1', projecttaskid: 'T1', date: { Date: { year: 2026, month: 1, day: 10 } }, hour: 1, minute: 0, decimal_hours: 1, notes: 'Short A' },
        { projectid: 'P1', projecttaskid: 'T1', date: { Date: { year: 2026, month: 1, day: 11 } }, hour: 2, minute: 0, decimal_hours: 2, notes: '' },
        { projectid: 'P1', projecttaskid: 'T1', date: { Date: { year: 2026, month: 1, day: 11 } }, hour: 2, minute: 0, decimal_hours: 2, notes: ' '.repeat(10) },
        { projectid: 'P1', projecttaskid: 'T2', date: { Date: { year: 2026, month: 1, day: 11 } }, hour: 4, minute: 30, decimal_hours: 4.5, notes: 'A very long note '.repeat(20) },
      ]),
      batchList: jest.fn()
        .mockResolvedValueOnce([{ id: 'P1', name: 'Alpha', code: 'XY' }])
        .mockResolvedValueOnce([
          { id: 'T1', name: 'Design' },
          { id: 'T2', name: 'Generic' }]),
    } as any);
    jest.spyOn(resolvers, 'resolveUserByNameOrId').mockResolvedValue({ ok: true, entity: { id: 'U1', name: 'Anna Example' } });

    const res = await getUserWorkLastWeek.handler({ user_id: 'U1', week_offset: 1 });
    const out = res.content[0].text;
    expect(out).toMatch(/Anna Example/);
    expect(out).toMatch(/\[XY\] Alpha/);
    expect(out).toMatch(/• Design — 5.0h/);
    expect(out).toMatch(/Short A/);
    expect(out).not.toMatch(/note:\s*$/m);
    expect(out).toMatch(/Generic — 4.5h/);
    expect(out).toMatch(/A very long note(.|\n)*…/);
  });
});
