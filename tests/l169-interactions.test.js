import { test, expect, mock } from "bun:test";
import L from "../scripts/lib/data/level169.yml";

mock.module("builtin/tween", () => ({ animate: (ctx, object, pose) => ctx.moves.push({ object, pose }) }));
mock.module("builtin/physics", () => ({ raycast: (ctx) => ctx.roofed ? {} : null }));

const { ears, closeLeaf } = await import("../scripts/l169-travel.js");
const { ears: door } = await import("../scripts/l169-door.js");
const { update } = await import("../scripts/sun169.js");

test("a second reader keeps the cover open and stale timers leave it alone", () => {
  const leaf = {}, player = { state: { l169guide: "g" } };
  const self = { id: "book", feetPosition: {}, state: { kind: "read", motion: "cover", title: "Book", lines: ["First entry"] } };
  const callbacks = [];
  let now = 2000;
  const ctx = { self, now: () => now, getObject: id => ({ "book/leaf": leaf, p: player, g: {} })[id],
    moves: [], emit() {}, after: (_, fn, payload) => callbacks.push({ fn, payload }) };
  ears.press(ctx, { by: "p" });
  expect(ctx.moves[0]).toEqual({ object: leaf, pose: { "rotation.pitch": -123 } });
  expect(player.state.l169read.title).toBe("Book");
  now += 500;
  ears.press(ctx, { by: "p" });
  expect(ctx.moves).toHaveLength(1);
  closeLeaf(ctx, callbacks[0].payload);
  expect(ctx.moves).toHaveLength(1);
  closeLeaf(ctx, callbacks[1].payload);
  expect(ctx.moves[1].pose).toEqual({ "rotation.pitch": 0 });
});

test("the shelter door swings both ways and its prompt follows its state", () => {
  const self = { state: { swing: -1 } }, ctx = { self, moves: [], emit() {} };
  door.press(ctx);
  expect(self.state.verb).toBe("Close");
  expect(ctx.moves[0].pose).toEqual({ "rotation.yaw": -90 });
  door.press(ctx);
  expect(self.state.verb).toBe("Open");
  expect(ctx.moves[1].pose).toEqual({ "rotation.yaw": 0 });
});

test("cold water expires outdoors even between old sync thresholds", () => {
  const hour = L.day.sunset + 1;
  const state = { almonds: 1, l169cold: 1, l169coldLeft: 1.25 };
  const ctx = { self: { place: "level169", state, feetPosition: { x: 0, y: 0, z: 0 } },
    place: { atmosphere: { timeOfDay: hour } }, session: {}, now: () => 2000, emit() {}, roofed: true };
  update(ctx);
  expect(state.l169coldLeft).toBe(1.25);
  ctx.roofed = false;
  for (let i = 0; i < 5; i++) update(ctx);
  expect(state.l169coldLeft).toBe(0);
  expect(state.almonds).toBe(0);
  expect(state.sand169).toBe(1);
});
