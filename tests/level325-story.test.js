import { test, expect, mock } from "bun:test";
mock.module("builtin/tween", () => ({ animate: () => {} }));
mock.module("builtin/physics", () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }));
mock.module("builtin/nav", () => ({ findPath: () => null }));
const { lay } = await import("../scripts/lib/level325-quest.js");
const { cellOf, cellInfo, GROUND } = await import("../scripts/lib/level325.js");
const { ears } = await import("../scripts/quest-prop-use.js");
const pages = (await import("../scripts/lib/data/pages.yml")).default;

test("Boom Town's trail stays on empty lots and its notes can be reread", () => {
  const objects = {};
  const ctx = { place: { objects }, spawn: (id, spec) => { objects[id] = { id, ...spec }; } };
  lay(ctx);
  lay(ctx);
  expect(Object.keys(objects)).toHaveLength(9);
  for (const obj of Object.values(objects)) {
    const { x, y, z } = obj.feetPosition;
    const cell = cellOf(x, z);
    expect(cellInfo(cell.ix, cell.iz).kind).toBe("lot");
    expect(y).toBe(GROUND);
  }
  const player = { state: {} };
  for (const id of [3251, 3252, 3253]) {
    const obj = objects[`l325-story-${id}-note-clipboard`];
    expect(pages[id]).toBeTruthy();
    const press = { self: { ...obj, session: {} }, getObject: () => player, now: () => 1, emit: () => {} };
    ears.press(press, { by: "player" });
    ears.press(press, { by: "player" });
    expect(player.state.reading).toBe(id);
  }
  expect(player.state.pages).toBe("3251,3252,3253");
});
