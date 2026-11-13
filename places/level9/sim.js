// Level 9 "The Suburbs": the referee. Rolls the room's seed once (place.state.l9seed: kept with everything looted here, so a reload
// finds the same streets and the same emptied drawers; another room rolls its own), lays the streets, houses and lamps from it,
// and runs the fog banks. Layout: scripts/lib/level9.js. House kit: scripts/lib/data/l9-houses.yml. Props: l9-props.yml.
import { layout, hashStr, HOUSES, PAINTS, PROPS, TUNE, FWD, ROAD_W, WALK } from "../../scripts/lib/level9.js";
export const cadence = "1s";
const V = 1;
const T = (x, z, up = 0) => ({ x, z, y: { terrain: up } });
const BLUE = { kind: "scripted", script: "engine/blueprint" };
const ASPHALT = { texture: "cdn/texture-wet-black-asphalt-road-surface-rain-soaked-no-markings.png", wrap: "repeat", repeat: [0.25, 0.25], color: "oklch(0.3 0.01 255)", roughness: 0.16, metalness: 0.05 };
const SODIUM = "oklch(0.8 0.13 70)";
const DOOR = (to, w, h, d) => ({ primitive: { kind: "box", width: w, height: h, depth: d }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to } });
const model = (key) => PROPS[key]?.model ? { model: { id: PROPS[key].model, forward: FWD }, layout: { box: { min: { x: -PROPS[key].size[0] / 2, y: 0, z: -PROPS[key].size[2] / 2 }, max: { x: PROPS[key].size[0] / 2, y: PROPS[key].size[1], z: PROPS[key].size[2] / 2 } } } } : null;

function lay(ctx, L) {
  const keep = {};
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l9-/.test(id) && !id.includes("/")) { const o = ctx.place.objects[id]; if (o?.tags?.includes("container")) keep[id] = { ...o.state }; ctx.destroy(id); }
  const sp = (id, spec) => { if (keep[id] && spec.state) for (const k of ["items", "scavved", "lock"]) if (keep[id][k] !== undefined) spec.state[k] = keep[id][k]; if (spec.light) spec.light.shadow ??= { enabled: false }; return ctx.spawn(id, spec); };
  // arrivals and the ways out (lore: the road back into the caves, the wheat past the last houses, the city glow up the road)
  sp("l9-from-l8", { feetPosition: T(0, 30, 0.2), rotation: { yaw: 0 } });
  sp("l9-from-hub", { feetPosition: T(2, 24, 0.2), rotation: { yaw: 0 } });
  sp("l9-to-l8", { ...DOOR("level8#l8-from-l9", 9, 4, 2), feetPosition: T(0, 61, 0) });
  sp("l9-to-l10", { ...DOOR("level10#l10-from-l11", 3, 4, 14), feetPosition: T(-58, 44, 0) });
  const [nx, nz] = L.north;
  sp("l9-to-l11", { ...DOOR("level11#lv10-arrive", 9, 4, 2), feetPosition: T(nx, nz - 2, 0) });
  sp("l9-city-glow", { feetPosition: { x: nx, y: 14, z: nz - 60 }, light: { kind: "point", color: "oklch(0.75 0.1 60)", intensity: 40, distance: 160 }, visibleRange: { max: 400 } });
  // streets: wet, unpainted, kerbed
  for (const s of L.streets) {
    sp(`l9-road-${s.id}`, { tags: ["l9road"], spline: { kind: "road", points: s.pts.map(([x, z]) => [x, 0.04, z]), width: ROAD_W, snapToTerrain: true, yOffset: 0.04, roadside: { markings: false, sidewalks: { width: WALK, height: 0.14 }, lampPosts: false, hedges: false } }, material: ASPHALT, physics: "static", visibleRange: { max: 320 } });
  }
  for (const [i, b] of L.bulbs.entries()) sp(`l9-bulb-${i}`, { feetPosition: T(b.x, b.z, 0.03), primitive: { kind: "cylinder", radiusTop: b.r, radiusBottom: b.r, height: 0.06, radialSegments: 40 }, material: ASPHALT, physics: "static", visibleRange: { max: 320 } });
  // streetlights: most are dead
  const SL = PROPS.streetlight, lm = model("streetlight");
  for (const l of L.lamps) {
    const kids = l.lit ? [{ id: "glow", feetPosition: { x: SL.lamp[0], y: SL.lamp[1] - 0.25, z: -SL.lamp[2] }, light: { kind: "spot", color: SODIUM, intensity: 26, distance: 26, angle: 62, penumbra: 0.7, aim: { x: 0, y: -1, z: 0 }, shadow: { enabled: false } } },
      { id: "bulb", feetPosition: { x: SL.lamp[0], y: SL.lamp[1] - 0.12, z: -SL.lamp[2] }, primitive: { kind: "box", width: 0.26, height: 0.06, depth: 0.6 }, material: { color: "#ffd9a0", emissive: SODIUM, emissiveIntensity: 5 }, castShadow: false }] : [];
    sp(`l9-lamp-${l.id}`, { tags: ["l9lamp"], feetPosition: T(l.x, l.z), rotation: { yaw: l.yaw }, physics: { body: "static", collider: "box" }, visibleRange: { max: 260 }, state: { lit: l.lit, flick: l.flick },
      ...(lm ?? { primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.11, height: SL.size[1] }, material: BLUE, physics: "none" }), children: kids,
      ...(l.lit ? { audio: { clip: "cdn/sfx-sodium-streetlight-ballast-electrical-buzz-hum-loop.mp3", gain: 0.18, loop: true, spatial: true, maxDistance: 16 } } : {}) });
  }
  // houses: the model when the kit has it, a blueprint box on the lot until then
  for (const l of L.lots) {
    const H = HOUSES[l.kind], p = PAINTS[l.paint];
    if (H.model) sp(`l9-${l.id}`, { tags: ["l9house"], feetPosition: T(l.x, l.z, 0.02), rotation: { yaw: l.yaw }, model: { id: H.model, forward: "+z", materials: { siding: { color: p.siding }, trim: { color: p.trim }, roof: { color: p.roof } } }, physics: { body: "static", collider: "mesh" }, visibleRange: { max: 300 }, state: { kind: l.kind, seed: l.seed } });
    else sp(`l9-${l.id}`, { tags: ["l9house"], feetPosition: T(l.x, l.z), rotation: { yaw: l.yaw }, primitive: { kind: "box", width: H.w, height: H.stories * 2.9 + 1.2, depth: H.d }, material: BLUE, physics: "none", state: { kind: l.kind, seed: l.seed } });
  }
  if ((ctx.world.files ?? []).includes("scripts/l9-mangled.js")) sp("l9-mangled-mgr", { feetPosition: T(0, 0), behavior: "scripts/l9-mangled.js", audience: "all" });
  sp("l9-ambience", { feetPosition: T(0, 0), audience: "local", audio: { clip: "cdn/ambience-dead-quiet-suburb-midnight-light-wind-distant-wet-road-hiss-no-crickets-loop.mp3", gain: 0.16, loop: true, spatial: false, bus: "Ambience" } });
}

const FOG_CLEAR = { near: 12, far: 120 }, FOG_BANK = { near: 1.5, far: 17 };
const between = (ctx, [a, b]) => (a + ctx.random() * (b - a)) * 1000;
// the fog: a bank rolls in over ~14 s, sits, rolls out. place.state.l9fog = { on, until } is what scripts/l9-mangled.js hunts by.
function fog(ctx, s) {
  const now = ctx.now();
  if (!s.l9fog) s.l9fog = { on: false, until: now + between(ctx, [100, 160]) }; // the first bank comes early: a new arrival meets it (my pick)
  if (now >= s.l9fog.until) {
    const on = !s.l9fog.on; s.l9fog = { on, until: now + between(ctx, on ? TUNE.fogLasts : TUNE.fogEvery), at: now };
    if (on) ctx.emit("playSound", { clip: "cdn/sfx-distant-air-raid-siren-single-slow-wail-far-across-a-suburb-at-night.mp3", volume: 0.5 }, { audience: { place: ctx.place.id ?? "level9" } });
  }
  const t = Math.min(1, (now - (s.l9fog.at ?? 0)) / 14000), k = s.l9fog.on ? t : 1 - t, f = ctx.place.atmosphere.fog;
  const near = FOG_CLEAR.near + (FOG_BANK.near - FOG_CLEAR.near) * k, far = FOG_CLEAR.far + (FOG_BANK.far - FOG_CLEAR.far) * k;
  if (Math.abs((f?.far ?? 0) - far) > 0.4) ctx.place.atmosphere.fog = { kind: "linear", near, far, color: k > 0.5 ? "oklch(0.2 0.015 250)" : "oklch(0.1 0.02 262)" };
}
export function tick(ctx) {
  const s = ctx.place.state;
  if (s.l9seed == null) s.l9seed = (hashStr(String(ctx.getRoomId?.() ?? "main")) ^ Math.floor(ctx.random() * 0x7fffffff)) >>> 0; // rolled once per room, kept with the room
  if (s.l9V !== V) { lay(ctx, layout(s.l9seed)); s.l9V = V; }
  if (ctx.place.players.length) fog(ctx, s);
}
