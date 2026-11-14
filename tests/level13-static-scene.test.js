import { test, expect, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
const scene = Bun.YAML.parse(readFileSync(new URL('../places/level13/cells/x0z0.scene', import.meta.url), 'utf8'));
for (const mod of ['breakables', 'level13-furnish', 'level13-foes', 'level13-people', 'level13-dress', 'level13-tape', 'sign-style', 'thresholds']) {
  const exports = { breakables: { sweepProps() {} }, 'level13-furnish': { layFurnish() {} }, 'level13-foes': { layFoes() {} }, 'level13-people': { layPeople() {} }, 'level13-dress': { layDress() {} }, 'level13-tape': { layTape() {} }, 'sign-style': { restyleSigns() {} }, thresholds: { dressThresholds() {} } };
  mock.module(`../scripts/lib/${mod}.js`, () => exports[mod]);
}
const { tick } = await import('../places/level13/sim.js');

test('Level 13 has its complete fixed shell in the scene', () => {
  const shell = Object.entries(scene).filter(([id]) => id.startsWith('l13-'));
  expect(shell).toHaveLength(281);
  expect(scene['l13-floor'].physics).toBe('static');
  expect(scene['l13-floor'].feetPosition.y + scene['l13-floor'].primitive.height).toBeCloseTo(0);
  expect(scene['l13-from-l12']).toBeDefined();
  expect(scene['l13-to-l0'].state.to).toBe('main');
  expect(scene['l13-to-l0'].physics.trigger).toBe(true);
  expect(shell.some(([, o]) => o.tags?.includes('breakable'))).toBe(true);
  expect(shell.every(([, o]) => o.feetPosition && Math.abs(o.feetPosition.x) < 64 && Math.abs(o.feetPosition.z) < 64)).toBe(true);
});

test('sim waits for the scene floor and does not regenerate the shell', () => {
  const spawned = [], player = { id: 'p', state: {}, feetPosition: { x: 0, z: 0 } };
  const ctx = { place: { state: {}, objects: {}, players: [player] }, spawn: (...a) => spawned.push(a), destroy: () => { throw Error('should not tear down scene'); } };
  tick(ctx); expect(spawned).toHaveLength(0);
  ctx.place.objects['l13-floor'] = scene['l13-floor']; tick(ctx); expect(spawned).toHaveLength(0);
});
