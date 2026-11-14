import { test, expect, mock } from "bun:test";
let blocked = false;
mock.module("builtin/physics", () => ({ raycast: () => blocked ? { id: "cover", position: { x: 8, y: -13, z: 80 } } : null }));
mock.module("builtin/vec3", () => ({ rotate: () => ({ x: 1, y: 0, z: 0 }) }));
const survivor = await import("../scripts/b3-survivor.js");
const explosive = await import("../scripts/b3-explosive.js");

test("survivor alternates rockets and grenades and stops after defeat", () => {
  let now = 10000;
  const launched = [], player = { id: "p", state: { hp: 100 }, feetPosition: { x: 8, y: -14, z: 76 } };
  const ctx = { self: { id: "boss", state: { hp: 100 }, feetPosition: { x: 14, y: -14, z: 85 } }, place: { players: [player], state: {} }, now: () => now, spawn: spec => launched.push(spec), emit: () => {} };
  blocked = true; survivor.update(ctx); expect(launched).toHaveLength(0);
  blocked = false; survivor.update(ctx); now += 4201; survivor.update(ctx); now += 4201; survivor.update(ctx);
  expect(launched.map(x => x.state.grenade)).toEqual([false, false, true]);
  ctx.self.state.hp = 0; survivor.update(ctx); expect(ctx.place.state.b3BossDead).toBe(true);
  now += 10000; survivor.update(ctx); expect(launched).toHaveLength(3);
});

test("blast damages nearby players once and respects obstruction", () => {
  const player = { id: "p", state: { hp: 100 }, feetPosition: { x: 8, y: -14, z: 80 } };
  const me = { id: "rocket", state: { owner: "boss", vel: { x: 0, y: 0, z: 1 }, age: 4 }, feetPosition: { x: 8, y: -14, z: 79 } };
  const ctx = { self: me, place: { players: [player] }, emit: () => {}, destroy: () => {} };
  blocked = false; explosive.update(ctx, .1); expect(player.state.hp).toBeLessThan(100);
  const hp = player.state.hp; explosive.update(ctx, .1); expect(player.state.hp).toBe(hp);
  me.state.done = false; player.state.hp = 100; blocked = true; explosive.update(ctx, .1);
  expect(player.state.hp).toBe(100);
});
