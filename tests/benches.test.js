import { describe, test, expect, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

mock.module("builtin/physics", () => ({
  raycast: () => null,
  getInputRay: () => null,
  overlapPoint: () => [],
  traverseCheck: () => null,
}));

const noop = () => ({});
mock.module("builtin/three", () => ({
  MeshStandardNodeMaterial: class {},
}));
mock.module("builtin/tsl", () => ({
  materialColor: {},
  positionGeometry: {},
  positionWorld: {},
  normalWorld: {},
  cameraPosition: {},
  normalize: noop,
  dot: noop,
  pow: noop,
  saturate: noop,
  vec2: noop,
  vec3: noop,
  float: noop,
  abs: noop,
  fract: noop,
  floor: noop,
  sin: noop,
  mix: noop,
  smoothstep: noop,
  step: noop,
  max: noop,
  min: noop,
  mx_noise_float: noop,
  mx_fractal_noise_float: noop,
  mx_worley_noise_float: noop,
}));

const { BENCH_MODEL, workbenchSpec, ammobenchSpec, ensureBenches } = await import("../scripts/lib/benches.js");
const { benchAvailable, stationOf, recipeStatus } = await import("../scripts/lib/craft.js");
const { buildOutpost } = await import("../scripts/lib/l109-outpost.js");
const C = (await import("../scripts/lib/data/craft.yml")).default;

const ROOT = join(import.meta.dir, "..");

function makeCtx(seed = {}) {
  const objects = { ...seed };
  const spawns = [];
  return {
    place: { objects, players: [{ id: "p1", feetPosition: { x: 0, y: 0, z: 0 }, state: {} }], state: {} },
    getObject: (id) => objects[id] ?? null,
    spawn: (id, spec) => {
      objects[id] = { id, ...spec };
      spawns.push(id);
      return id;
    },
    spawns,
  };
}

describe("dispersed workbenches and reloading benches", () => {
  test("shared bench specs expose valid interact/craft properties", () => {
    const wb = workbenchSpec({ x: 4, y: 0, z: 5 }, { yaw: 180, name: "Outpost Workbench", light: true });
    const ab = ammobenchSpec({ x: 6, y: 0, z: 5 }, { yaw: 90, name: "Outpost Reloading Bench", light: true });

    expect(wb.tags).toContain("bench");
    expect(wb.model.id).toBe(BENCH_MODEL);
    expect(wb.state.station).toBe("bench");
    expect(wb.physics).toEqual({ body: "static", collider: "box" });
    expect(wb.children?.length).toBe(1);

    expect(ab.tags).toContain("bench");
    expect(ab.primitive).toEqual({ kind: "scripted", script: "scripts/build-geo.js", params: { kind: "ammobench", dmg: 0 } });
    expect(ab.state.station).toBe("ammo");
    expect(ab.physics).toEqual({ body: "static", collider: "box" });
    expect(ab.children?.length).toBe(1);

    const player = { feetPosition: { x: 4, y: 0, z: 6 } };
    expect(benchAvailable(player, { id: "wb", ...wb })).toBe(true);
    expect(benchAvailable(player, { id: "ab", ...ab })).toBe(true);

    // Workbench unlocks bench recipes (battery), Reloading Bench unlocks ammo recipes (ammo/shells)
    expect(stationOf(C.recipes.battery)).toBe("bench");
    expect(stationOf(C.recipes.ammo)).toBe("ammo");
    expect(stationOf(C.recipes.shells)).toBe("ammo");

    const basePlayer = { level: 5, skl: Array(13).fill(60).join(","), attr: "5,5,5,5,5,5,5", scrap: C.recipes.ammo.in };
    expect(recipeStatus({ ...basePlayer, craftOpen: "bench", craftStation: "bench" }, "ammo").benchOk).toBe(false);
    expect(recipeStatus({ ...basePlayer, craftOpen: "bench", craftStation: "ammo" }, "ammo").benchOk).toBe(true);
  });

  test("ensureBenches spawns missing stations idempotently", () => {
    const existing = { id: "wb-1", tags: ["bench"], state: { name: "Existing", station: "bench" } };
    const ctx = makeCtx({ "wb-1": existing });

    ensureBenches(ctx, [
      ["wb-1", workbenchSpec({ x: 0, y: 0, z: 0 })],
      ["ab-1", ammobenchSpec({ x: 2, y: 0, z: 0 })],
    ]);
    expect(ctx.spawns).toEqual(["ab-1"]);
    expect(ctx.getObject("wb-1")).toBe(existing);
    expect(ctx.getObject("ab-1").state.station).toBe("ammo");

    ensureBenches(ctx, [
      ["wb-1", workbenchSpec({ x: 0, y: 0, z: 0 })],
      ["ab-1", ammobenchSpec({ x: 2, y: 0, z: 0 })],
    ]);
    expect(ctx.spawns).toEqual(["ab-1"]);
  });

  test("Level 109 Doctors' Outpost builds both workbench and reloading bench", () => {
    const spawned = [];
    const ctx = makeCtx();
    const R = {
      id: "doc0",
      type: "doctors",
      yawIn: 90,
      at: (a, b, y = 0) => ({ x: a, y, z: b }),
      sp: (key, spec) => {
        spawned.push([key, spec]);
        return key;
      },
    };
    expect(buildOutpost(ctx, R)).toBe(true);
    const wb = spawned.find(([k]) => k === "workbench");
    const ab = spawned.find(([k]) => k === "ammobench");
    expect(wb?.[1].tags).toContain("bench");
    expect(wb?.[1].state.station).toBe("bench");
    expect(ab?.[1].tags).toContain("bench");
    expect(ab?.[1].state.station).toBe("ammo");
  });

  test("camp and base bench IDs across all levels are unique and wire existing bench helpers", () => {
    const campFiles = [
      "places/level1/sim.js",
      "places/thehub/sim.js",
      "places/gamma/sim.js",
      "places/level4/sim.js",
      "places/level5/sim.js",
      "places/level7/sim.js",
      "places/level8/sim.js",
      "places/level10/sim.js",
      "places/level11/sim.js",
      "places/level21/sim.js",
      "places/level61/sim.js",
    ];
    const ids = [];
    for (const rel of campFiles) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src).toContain("benches.js");
      expect(src).toContain("ammobenchSpec");
      for (const m of src.matchAll(/\["([a-z0-9-]+)",\s*(?:workbenchSpec|ammobenchSpec)\(/g)) {
        ids.push(m[1]);
      }
    }
    expect(ids.length).toBeGreaterThanOrEqual(19);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
