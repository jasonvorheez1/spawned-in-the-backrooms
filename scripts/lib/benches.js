// Shared specs and idempotent spawner for world crafting workbenches and ammo reloading benches.
// Uses the existing Tripo workbench model and scripted reloading bench geometry (scripts/build-geo.js).

export const BENCH_MODEL = "/cdn/value.a38bcbd4f551deb9aaf6fba383d7eaadb341a1aaba258f537471bcb5159c7f26.glb";

const lampChild = (y, intensity, distance) => [
  {
    feetPosition: { x: 0, y, z: 0 },
    light: { kind: "point", color: "oklch(0.88 0.12 80)", intensity, distance, shadow: { enabled: false }, visibleRange: { max: 35 } },
  },
];

/**
 * Build a static world Workbench (`station: "bench"`) using the existing Tripo workbench GLB.
 * Supports flat `{ x, y, z }` or terrain `{ x, z, y: { terrain: up } }` coordinates.
 */
export function workbenchSpec(at, { yaw = 0, name = "Workbench", light = false, visibleRange = { max: 45 }, tags = [] } = {}) {
  return {
    tags: ["bench", ...tags],
    feetPosition: at,
    rotation: { yaw },
    physics: { body: "static", collider: "box" },
    model: { id: BENCH_MODEL },
    layout: { box: { min: { x: -1.1, y: 0, z: -0.45 }, max: { x: 1.1, y: 1.7, z: 0.45 } } },
    visibleRange,
    castShadow: false,
    state: { name, station: "bench" },
    ...(light ? { children: lampChild(1.65, 2.0, 8) } : {}),
  };
}

/**
 * Build a static world Ammunition Reloading Bench (`station: "ammo"`) using `scripts/build-geo.js`.
 * Local front (+Z) faces away from the pegboard (-Z); rotate with `yaw`.
 */
export function ammobenchSpec(at, { yaw = 0, name = "Reloading Bench", light = false, visibleRange = { max: 45 }, tags = [] } = {}) {
  return {
    tags: ["bench", ...tags],
    feetPosition: at,
    rotation: { yaw },
    physics: { body: "static", collider: "box" },
    primitive: { kind: "scripted", script: "scripts/build-geo.js", params: { kind: "ammobench", dmg: 0 } },
    material: { pbr: true },
    visibleRange,
    castShadow: false,
    state: { name, station: "ammo" },
    ...(light ? { children: lampChild(1.55, 1.8, 7) } : {}),
  };
}

/**
 * Spawn any missing `[id, spec]` bench entries once without disturbing existing objects.
 */
export function ensureBenches(ctx, list) {
  for (const [id, spec] of list) {
    if (!ctx.getObject(id)) ctx.spawn(id, spec);
  }
}
