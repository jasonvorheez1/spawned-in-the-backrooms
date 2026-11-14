import { test, expect, mock } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { DOORS, lamps, doorFront } from '../scripts/lib/thehub.js';

const cells = new URL('../places/thehub/cells/', import.meta.url);
test('the Hub loads its fixed fixtures from the correct cells', () => {
  const fixtures = new Map();
  for (const file of readdirSync(cells).filter(name => name.endsWith('.scene'))) {
    const scene = Bun.YAML.parse(readFileSync(new URL(file, cells), 'utf8'));
    for (const [id, object] of Object.entries(scene)) {
      if (!/^hub-(lamp|doorlamp|baylight|fan|tray|drain|barrier|camp)-/.test(id)) continue;
      const { x, z } = object.feetPosition;
      expect(file).toBe(`x${Math.round(x / 128)}z${Math.round(z / 128)}.scene`);
      expect(fixtures.has(id)).toBe(false);
      fixtures.set(id, object);
    }
  }
  for (const lamp of lamps()) {
    const fixture = fixtures.get(`hub-lamp-${lamp.k}`);
    expect(fixture.feetPosition).toEqual({ x: lamp.x, y: lamp.y, z: lamp.z });
    expect(fixture.children.find(c => c.id === 'glow').light.visibleRange.max).toBe(45);
  }
  for (const door of DOORS) {
    const { x, z } = doorFront(door, 0.5);
    if (x > 500) continue;
    const fixture = fixtures.get(`hub-doorlamp-${door.id}`);
    expect(fixture.feetPosition).toEqual({ x, y: 4.5, z });
    expect(fixture.children.find(c => c.id === 'glow').light.visibleRange.max).toBe(22);
  }
  expect(fixtures.get('hub-camp-0-keycabinet').physics.body).toBe('static');
  expect(fixtures.get('hub-barrier-0').physics.body).toBe('static');
});

test('Hub startup leaves scene fixtures alone and spawns the interactive doors', async () => {
  mock.module('../scripts/lib/hub-people.js', () => ({ layThings() {}, keepCrew() {}, keymaster() {} }));
  mock.module('../scripts/lib/benches.js', () => ({ workbenchSpec() {}, ammobenchSpec() {}, ensureBenches() {} }));
  const { tick } = await import('../places/thehub/sim.js');
  const objects = { 'hub-lamp-0': { id: 'hub-lamp-0' } }, spawned = [];
  tick({ world: { files: [] }, place: { state: {}, objects, players: [] },
    spawn(id, spec) { objects[id] = spec; spawned.push(id); },
    destroy(id) { throw Error(`unexpected rebuild of ${id}`); },
  });
  expect(spawned.filter(id => /^hub-(lamp|doorlamp|baylight|fan|tray|drain|barrier|camp)-/.test(id))).toHaveLength(0);
  expect(objects[DOORS[0].obj].behavior).toBe('scripts/hub-door.js');
});
