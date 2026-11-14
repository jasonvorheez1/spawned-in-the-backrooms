import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";

const noop = () => ({});
mock.module("builtin/vec3", () => ({
  rotate: ({ yaw = 0 }, { x = 0, y = 0, z = 0 }) => {
    const r = (yaw * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    return { x: x * c - z * s, y, z: x * s + z * c };
  },
}));
mock.module("builtin/physics", () => ({
  raycast: () => null,
  getInputRay: () => null,
  overlapPoint: () => [],
  traverseCheck: () => null,
}));
mock.module("builtin/three", () => ({ MeshStandardNodeMaterial: class {} }));
mock.module("builtin/tsl", () => ({
  materialColor: {}, positionGeometry: {}, positionWorld: {}, normalWorld: {}, cameraPosition: {},
  normalize: noop, dot: noop, pow: noop, saturate: noop, vec2: noop, vec3: noop, float: noop,
  abs: noop, fract: noop, floor: noop, sin: noop, mix: noop, smoothstep: noop, step: noop,
  max: noop, min: noop, mx_noise_float: noop, mx_fractal_noise_float: noop, mx_worley_noise_float: noop,
}));

function parsePreloadModels(relPath) {
  const lines = readFileSync(relPath, "utf8").split(/\r?\n/);
  const models = {};
  let inModels = false, cur = null;
  for (const line of lines) {
    if (/^models:\s*$/.test(line)) { inModels = true; continue; }
    if (inModels && /^\S/.test(line)) break;
    if (!inModels) continue;
    const placeM = line.match(/^  ([a-zA-Z0-9_-]+):\s*$/);
    if (placeM) { cur = placeM[1]; models[cur] = []; continue; }
    if (cur && /^\s+-\s+/.test(line)) models[cur].push(line.trim());
  }
  return models;
}

function staticImports(relPath) {
  const src = readFileSync(relPath, "utf8");
  const out = [];
  for (const m of src.matchAll(/^\s*import\s+[\s\S]*?\sfrom\s+["']([^"']+)["']/gm)) out.push(m[1]);
  return out;
}

describe("loading times & entry graph hygiene", () => {
  test("scripts/main-menu.js defers cutscenes and quest handlers until active", () => {
    const imps = staticImports("scripts/main-menu.js");
    for (const deferred of [
      "./lib/intro-cut.js", "./lib/arrive-cut.js", "./lib/tutorial.js", "./lib/tut0-cut.js",
      "./lib/l26-cut.js", "./lib/dina-quest.js", "./lib/levelrun-cut.js", "./lib/ch2-quest.js",
      "./lib/errands.js", "./lib/hit-squad.js", "./lib/hub.js",
    ]) {
      expect(imps).not.toContain(deferred);
    }
  });

  test("scripts/ui.js defers optional modal panels, mods, and static data", () => {
    const imps = staticImports("scripts/ui.js");
    for (const deferred of [
      "../mods/lagscope/panel.js", "../mods/absolute-cinema/lib/ui-cinema.js",
      "../mods/absolute-cinema/lib/ui-cinema-overlays.js", "../mods/modeling-studio/hud.js",
      "./lib/l11-cctv.js", "./lib/data/level12.yml", "./lib/data/pages.yml",
      "./wardrobe-ui.js", "./salon-ui.js", "./hub-ui.js", "./cutscene-ui.js",
      "./lockpick-ui.js", "./spamton-ui.js", "./spamton-arena-ui.js", "./loot-ui.js",
      "./talk-ui.js", "./build-ui.js", "./stats-ui.js", "./craft-ui.js",
      "./l169-road-ui.js", "./os-ui.js", "./arcade-ui.js", "./smoothie-ui.js",
      "./horde-ui.js", "./noclip-ui.js", "./feed-ui.js", "./mahjong-ui.js",
    ]) {
      expect(imps).not.toContain(deferred);
    }
  });

  test("scripts/player.js defers event/region quest modules and uses fresh-aura helper", async () => {
    const imps = staticImports("scripts/player.js");
    for (const deferred of [
      "./lib/levelrun-cut.js", "./lib/dina-quest.js", "./fishing.js",
      "./lib/l5-hostile.js", "./lib/level1-quests.js", "./lib/l5-beast.js",
      "./lib/remodel-quest.js", "./lib/rink-items.js",
    ]) {
      expect(imps).not.toContain(deferred);
    }
    const { FRESH_BODY, nearFresh } = await import("../scripts/lib/fresh-aura.js");
    expect(FRESH_BODY?.primitive?.kind).toBe("cylinder");
    expect(Array.isArray(FRESH_BODY?.children)).toBe(true);
    expect(typeof nearFresh).toBe("function");
  });

  test("preload.yml respects the 16-model cap per level", () => {
    const models = parsePreloadModels("scripts/lib/data/preload.yml");
    expect(Object.keys(models).length).toBeGreaterThan(10);
    for (const [place, list] of Object.entries(models)) {
      expect(list.length, `${place} has ${list.length} preloads`).toBeLessThanOrEqual(16);
    }
  });

  test("places/level9/sim.js batches house furnishing instead of spawning all houses on tick 1", async () => {
    const { tick } = await import("../places/level9/sim.js");
    const objects = {};
    let n = 0;
    const ctx = {
      now: () => 1000,
      random: () => 0.42,
      getRoomId: () => "bench",
      emit: () => {},
      query: () => [],
      spawn: (a, b) => {
        const id = typeof a === "string" ? a : `anon-${++n}`;
        const spec = typeof a === "string" ? b : a;
        objects[id] = { id, ...spec };
        return id;
      },
      destroy: (id) => { delete objects[id]; },
      world: { files: [] },
      place: {
        id: "level9",
        state: {},
        players: [],
        objects,
        atmosphere: {},
        terrain: { heightAt: () => 0 },
      },
    };
    tick(ctx);
    const afterTick1 = Object.keys(objects).length;
    expect(Array.isArray(ctx.place.state.l9FurnQ)).toBe(true);
    const firstRemaining = ctx.place.state.l9FurnQ.length;
    expect(firstRemaining).toBeGreaterThan(0);
    expect(afterTick1).toBeLessThan(1200);

    // Advance enough ticks to finish queued furnishing
    for (let i = 0; i < 30 && ctx.place.state.l9FurnQ?.length; i++) tick(ctx);
    expect(ctx.place.state.l9FurnQ).toBeUndefined();
    expect(Object.keys(objects).length).toBeGreaterThan(afterTick1);
  });

  test("places/level5/sim.js returns immediately on empty rooms", async () => {
    const { tick } = await import("../places/level5/sim.js");
    let queries = 0;
    const ctx = {
      now: () => 1000,
      random: () => 0.5,
      query: () => { queries++; return []; },
      getObject: () => null,
      spawn: () => { throw new Error("should not spawn when empty"); },
      session: {},
      place: { id: "level5", state: {}, players: [], objects: {} },
    };
    tick(ctx);
    expect(queries).toBe(0);
  });

  test("level70-town.js uses box colliders for small props and mesh colliders only for walk-inside shells", async () => {
    const { lay } = await import("../scripts/lib/level70-town.js");
    const objects = {};
    const ctx = {
      log: () => {},
      spawn: (id, spec) => { objects[id] = { id, ...spec }; return id; },
      destroy: (id) => { delete objects[id]; },
      world: { date: "2026-11-14", state: {}, assets: { "a.glb": { name: "l70-snowheap" }, "b.glb": { name: "lantern" } } },
      place: { objects, state: {} },
    };
    lay(ctx);
    expect(objects["l70-bp-hut"]?.physics?.collider).toBe("mesh");
    expect(objects["l70-house-shell"]?.physics?.collider).toBe("mesh");
    expect(objects["l70-bp-igloo"]?.physics?.collider).toBe("mesh");
    expect(objects["l70-car-0"]?.physics?.collider).toBe("box");
    expect(objects["l70-car-0"]?.visibleRange?.max).toBeLessThanOrEqual(70);
    expect(objects["l70-car-0"]?.castShadow).toBe(false);
    expect(objects["l70-bank-1"]?.physics?.collider).toBe("box");
    expect(objects["l70-bank-1"]?.castShadow).toBe(false);
  });
});
