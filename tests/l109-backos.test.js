import { expect, test, mock } from 'bun:test';
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [], traverseCheck: () => null }));
const { hospitalControl } = await import('../scripts/lib/l109-os.js');

test('hospital BackOS preserves the newer recovered records', () => {
  const terminal = { id: 't', state: { kind: 'terminal', mode: 'supply', roomId: 'r', host: 'L109-STOCK-r' } };
  const s = { pages: '', os: { id: 't', host: terminal.state.host } };
  const ctx = { self: { place: 'level109' }, place: { state: {} }, getObject: () => terminal, now: () => 1 };
  expect(hospitalControl(ctx, s, 'l109stock', 'lore')).toBe(true);
  expect(s.payout.items).toEqual(['page:114']);
  hospitalControl(ctx, s, 'l109stock', 'lore');
  expect(s.payout.items).toEqual(['page:114']);
});
