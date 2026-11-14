// Level ! dressing: the box shells stay as invisible colliders; real geometry and fitted models stand over them.
// Gate: place.state.dressV. Bump DRESS_V to re-lay (tagged "lrun-dress" pieces are destroyed first).
import { CORRIDOR, OBSTACLES } from "./levelrun-mechanics.js";
export const DRESS_V = 3; // 3: studio-cleaned models, cot with mattress, posters dimmed to paper; 2: 2: dying cold fluorescent tubes break the red every 26 m
const GEO = "scripts/levelrun-geo.js", DOOR = "scripts/door-geo.js";
export const LRUN_MODELS = {
  gurney: "/cdn/value.b1dc5ac5f129a0ca27a2aa8cf1add8087d64608161472c14347ebd5d390680e2.glb", // Tripo + studio clean (weld, smooth, slim, -Z)
  crashcart: "/cdn/value.fc6f9622c8597af8969820692ee18f20f1f054fb44eac9ec771668dd197f7e2e.glb", // Tripo + studio clean (weld, smooth, slim, -Z)
  barrier: "/cdn/value.6fd26f2cc265c1174759fccdad8b29f8f296ca33a021036e7aa953c658e3749b.glb", // Tripo + studio clean (weld, smooth, slim, -Z)
  wheelchair: "/cdn/value.dc40bdd97768cd902f5f5dbea8acfadc2c2eba260056263a501dea2748271c87.glb", // Tripo + studio clean (weld, smooth, slim, -Z)
  kettle: "/cdn/value.810914cfe1e05887a3e49d79f7c7c720cccf01197f4b954ee255229fed98a445.glb", // Tripo + studio clean (weld, smooth, slim, -Z)
  megcrate: "/cdn/value.64a96b8ea948f646874ae3d6f6e3f8139fcef1699363a1eb7523a8d82f929995.glb", // Tripo + studio clean (weld, smooth, slim, -Z)
  cot: "/cdn/value.8bdde9f497a06819a0029f9df982d9a2a35c190e91291c4e23ac390e0b66af17.glb", // Tripo + studio clean (weld, smooth, slim, -Z)
  sofa: "/cdn/value.ff13bc205536a957826e2f7fed75554c07ffe7848198e50e1d65f257cabacdd9.glb", // furniture.yml, forward +x
  lamp: "/cdn/value.56e857c3fa9f839e7d3406ce7a54b6caaa028f92cfc1e5b9935ed654404c7d26.glb", // furniture.yml, forward +x
  extinguisher: "/cdn/value.3ef36fc8ed3797c2da4a033df5cbd59dae385b6c2480e1adc53495d0939d0267.glb", // l0-kit-wall.yml
};
const M = LRUN_MODELS;
const fit = (hx, y1, hz, y0 = 0) => ({ box: { min: { x: -hx, y: y0, z: -hz }, max: { x: hx, y: y1, z: hz } } });
const HIDE = ["lrun-intake-floor", "lrun-intake-ceil", "lrun-intake-back", "lrun-intake-left", "lrun-intake-right", "lrun-intake-front-l", "lrun-intake-front-r", "lrun-intake-front-hdr", "lrun-far-wall",
  "lrun-alcove-floor", "lrun-alcove-ceil", "lrun-alcove-back", "lrun-alcove-east", "lrun-alcove-north", "lrun-alcove-south"];
for (let i = 0; i < 8; i++) HIDE.push(`lrun-fl-${i}`, `lrun-ce-${i}`, `lrun-wl-${i}`, `lrun-wr-${i}`, `lrun-wll-${i}`, `lrun-wlr-${i}`);
const doorZ = (k) => -11 - k * 14, doorSide = (k) => (k % 2 === 0 ? -1 : 1), ajar = (k) => k % 4 === 1 || k === 10;
function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function dressWorld(ctx) {
  const st = ctx.place.state, objs = ctx.place.objects ?? {};
  if (st.dressV === DRESS_V) return;
  for (const r of ctx.query({ tags: ["lrun-dress"] })) ctx.destroy(r.id);
  for (const id of HIDE) { const o = objs[id]; if (o) o.visible = false; }
  const D = (id, spec) => ctx.spawn(id, { tags: ["lrun-dress"], castShadow: false, receiveShadow: true, ...spec });
  const W = CORRIDOR.width, HW = CORRIDOR.halfW;

  // 1. corridor halls, seeded per 26 m chunk
  for (let i = 0; i < 8; i++) {
    const z0 = CORRIDOR.corridorStartZ - i * 26, zc = z0 - 13, gaps = [];
    for (let k = 0; k < 15; k++) { const z = doorZ(k); if (z < z0 - 0.7 && z > z0 - 25.3) gaps.push(doorSide(k) < 0 ? { wall: "w", c: 13 - (z - zc), w: 1.1, kind: ajar(k) ? "ajar" : "door" } : { wall: "e", c: z - zc + 13, w: 1.1, kind: ajar(k) ? "ajar" : "door" }); }
    D(`lrun-dress-hall-${i}`, { feetPosition: { x: 0, y: 0, z: zc }, primitive: { kind: "scripted", script: GEO, params: { part: "hall", w: W, d: 26, h: 3.6, ceil: 3.3, walls: i === 7 ? "ewn" : "ew", gaps, seed: i + 1, tone: "red", conduit: true, trail: i % 3 === 0 } }, material: { pbr: true } });
    const r = rng(i + 11), side = r() > 0.5 ? 1 : -1;
    // chunk clutter hugs the walls, clear of the run lane (visual only, never a fake obstacle)
    const pick = Math.floor(r() * 3);
    if (pick !== 1) D(`lrun-dress-wchair-${i}`, { feetPosition: { x: side * 2.55, y: 0.33, z: zc + (r() - 0.5) * 16 }, rotation: { yaw: r() * 40 - 20, roll: side > 0 ? 90 : -90 }, model: M.wheelchair, layout: fit(0.33, 1.0, 0.5) });
    if (pick !== 2) D(`lrun-dress-ext-${i}`, { feetPosition: { x: -side * 2.6, y: 0.09, z: zc + (r() - 0.5) * 18 }, rotation: { yaw: r() * 360, pitch: 90 }, model: M.extinguisher, layout: fit(0.09, 0.55, 0.09) });
    const cz = zc + (r() - 0.5) * 14, cx = side * (1.6 + r() * 0.8);
    D(`lrun-dress-charts-${i}`, { feetPosition: { x: cx, y: 0.003, z: cz }, rotation: { yaw: r() * 360 },
      children: [0, 1, 2, 3, 4].map((n) => ({ feetPosition: { x: (r() - 0.5) * 0.9, y: n * 0.002, z: (r() - 0.5) * 0.9 }, rotation: { yaw: r() * 360 }, primitive: { kind: "box", width: 0.22, height: 0.002, depth: 0.29 }, material: { color: n % 3 ? "oklch(0.86 0.02 90)" : "oklch(0.7 0.06 75)", roughness: 0.95 } })) });
  }
  // 2. ward doors: the same rows wear real leaves; some ajar onto a dark room
  for (let k = 0; k < 15; k++) {
    const h = objs[`lrun-sidedoor-${k}`]; if (!h) continue;
    const z = doorZ(k), s = doorSide(k), a = ajar(k);
    h.feetPosition = { x: s * (HW - 0.03), y: 0, z: z + s * 0.525 * (s < 0 ? 1 : -1) * -1 };
    h.rotation = { yaw: s < 0 ? (a ? 120 : 90) : (a ? -60 : -90) };
    h.primitive = { kind: "scripted", script: DOOR, params: { style: "office", part: "leaf", w: 1.05, h: 2.25, hingeSide: "left", vision: true, seed: k } };
    h.material = { pbr: true, color: "oklch(0.62 0.05 25)" };
  }
  // 3. caged red strobes on the same rows, pulsing on a tween
  for (let k = 0; k < 15; k++) {
    const h = objs[`lrun-strobe-${k}`]; if (!h) continue;
    for (const c of h.children ?? []) c.visible = false;
    h.feetPosition = { x: 0, y: 3.3, z: doorZ(k) };
    h.primitive = { kind: "scripted", script: GEO, params: { part: "strobe" } }; h.material = { pbr: true };
    h.state = { peak: k % 3 === 1 ? 6 : 5, period: 1.1 + (k % 4) * 0.13, phase: (k * 0.37) % 1 };
    h.behavior = "scripts/lrun-strobe.js";
  }
  // 4. obstacles: hitboxes stay, invisible; fitted models stand in them
  for (const o of OBSTACLES) {
    const h = objs[o.id]; if (!h) continue;
    if (o.kind === "spill") { h.visible = false; D(`${o.id}-look`, { feetPosition: { x: o.x, y: 0.004, z: o.z }, primitive: { kind: "scripted", script: GEO, params: { part: "spill", w: o.w, d: o.d, seed: o.z } }, material: { pbr: true } }); continue; }
    h.visible = false; for (const c of h.children ?? []) c.visible = false;
    if (o.kind === "gurney") D(`${o.id}-look`, { feetPosition: { x: o.x, y: 0, z: o.z }, model: M.gurney, layout: fit(o.w / 2, 1.15, o.d / 2) });
    else if (o.kind === "cart") for (const q of [-1, 1]) D(`${o.id}-look${q}`, { feetPosition: { x: o.x + q * o.w / 4, y: 0, z: o.z }, rotation: { yaw: q * 8 }, model: M.crashcart, layout: fit(o.w / 4, o.h, o.d / 2) });
    else for (const q of [-1, 1]) D(`${o.id}-look${q}`, { feetPosition: { x: o.x + q * o.w / 4, y: 0, z: o.z }, rotation: { yaw: q * 4 }, model: M.barrier, layout: fit(o.w / 4, o.h, o.d / 2) });
  }
  // 5. intake shell, doors with chain and padlock
  D("lrun-dress-intake", { feetPosition: { x: 0, y: 0, z: -0.35 }, primitive: { kind: "scripted", script: GEO, params: { part: "hall", w: 8.15, d: 10.25, h: 3.7, ceil: 3.3, walls: "ewns", seed: 99, tone: "red", conduit: true,
    gaps: [{ wall: "n", c: 4.075, w: 5.8, h: 3.2, kind: "open" }, { wall: "s", c: 4.075, w: 2.5, h: 2.55, kind: "open" }, { wall: "w", c: 3.275, w: 1.3, h: 2.35, kind: "door" }] } }, material: { pbr: true } });
  for (const id of ["lrun-entry-door", "lrun-chain-door"]) { const h = objs[id]; if (h) { h.visible = false; for (const c of h.children ?? []) c.visible = false; } }
  D("lrun-dress-entry-leaf", { parent: "lrun-entry-door", feetPosition: { x: 0, y: 0, z: 0.6 }, rotation: { yaw: 90 }, primitive: { kind: "scripted", script: DOOR, params: { style: "metal", part: "leaf", w: 1.2, h: 2.3, hingeSide: "left", seed: 3 } }, material: { pbr: true } });
  for (const q of [-1, 1]) D(`lrun-dress-chain-leaf${q}`, { parent: "lrun-chain-door", feetPosition: { x: q * 0.62, y: 0, z: 0 }, primitive: { kind: "scripted", script: DOOR, params: { style: "fire", part: "set", w: 1.18, h: 2.45, seed: 5 + q } }, material: { pbr: true } });
  D("lrun-dress-chain-a", { parent: "lrun-chain-door", primitive: { kind: "scripted", script: GEO, params: { part: "chain", a: [-0.95, 1.55, -0.12], b: [0.95, 1.1, -0.12], sag: 0.08, n: 30 } }, material: { pbr: true } });
  D("lrun-dress-chain-b", { parent: "lrun-chain-door", primitive: { kind: "scripted", script: GEO, params: { part: "chain", a: [-0.95, 1.1, -0.13], b: [0.95, 1.55, -0.13], sag: 0.08, n: 30 } }, material: { pbr: true } });
  D("lrun-dress-padlock", { parent: "lrun-chain-door", feetPosition: { x: 0.02, y: 1.28, z: -0.16 }, primitive: { kind: "scripted", script: GEO, params: { part: "padlock" } }, material: { pbr: true } });
  // 6. collapse I-beam and the fire exit
  const beam = objs["lrun-collapse-beam"]; if (beam) { beam.visible = false;
    D("lrun-dress-beam", { parent: "lrun-collapse-beam", primitive: { kind: "scripted", script: GEO, params: { part: "ibeam", len: W - 0.4 } }, material: { pbr: true } }); }
  const ex = objs["lrun-exit-door-frame"]; if (ex) { ex.visible = false;
    D("lrun-dress-exit", { feetPosition: { x: 0, y: 0, z: CORRIDOR.exitZ - 1.15 }, primitive: { kind: "scripted", script: DOOR, params: { style: "fire", part: "set", w: 1.7, h: 2.25, seed: 9 } }, material: { pbr: true, color: "oklch(0.55 0.08 150)" },
      light: { kind: "point", color: "#3dff8a", intensity: 2.2, distance: 7, shadow: { enabled: false } } }); }
  // 6b. dying fluorescent tubes: one per chunk, cold white stutter against the red strobes so the run has contrast
  for (let i = 0; i < 8; i++) {
    const z = CORRIDOR.corridorStartZ - 6 - i * 26, x = (i % 2 ? 1 : -1) * 0.9;
    D(`lrun-dress-tube-${i}`, { feetPosition: { x, y: 3.22, z }, rotation: { yaw: 90 },
      primitive: { kind: "capsule", radius: 0.035, halfHeight: 0.55 }, pivot: "center",
      material: { color: "#e8f4ff", emissive: "#cfe6ff", emissiveIntensity: 2.4 },
      light: { kind: "point", color: "#cfe2ff", intensity: 2.2, distance: 9, shadow: { enabled: false } },
      behavior: "scripts/lrun-strobe.js", state: { peak: 2.6, period: 0.23 + (i % 3) * 0.17, phase: i * 0.31 } });
  }
  // 7. Safe Alcove: a lived-in room
  const AX = CORRIDOR.safePos.x;
  D("lrun-dress-alcove", { feetPosition: { x: AX, y: 0, z: 0 }, primitive: { kind: "scripted", script: GEO, params: { part: "hall", w: 11.75, d: 8.75, h: 3.6, ceil: 3.3, walls: "ewns", seed: 42, tone: "warm", conduit: true, gaps: [{ wall: "e", c: 4.375, w: 1.25, h: 2.3, kind: "open" }] } }, material: { pbr: true } });
  D("lrun-dress-sofa", { feetPosition: { x: AX - 1.4, y: 0, z: -3.75 }, rotation: { yaw: 180 }, model: { id: M.sofa, forward: "+x" }, layout: fit(1.05, 1.05, 0.5) });
  D("lrun-dress-lamp", { feetPosition: { x: AX + 0.15, y: 0, z: -3.85 }, model: { id: M.lamp, forward: "+x" }, layout: fit(0.26, 1.8, 0.26),
    light: { kind: "point", color: "#ffc98a", intensity: 2.2, distance: 8, shadow: { enabled: false } },
    audio: { clip: "cdn/sfx-quiet-electrical-mains-hum-small-room-loop.mp3", loop: true, gain: 0.14, spatial: true, maxDistance: 11 } });
  D("lrun-dress-cot", { feetPosition: { x: AX - 4.9, y: 0, z: 1.7 }, rotation: { yaw: 90 }, model: M.cot, layout: fit(1.9, 0.56, 0.8) });
  D("lrun-dress-crate", { feetPosition: { x: AX - 4.8, y: 0, z: -3.4 }, rotation: { yaw: 12 }, model: M.megcrate, layout: fit(0.5, 0.56, 0.41) });
  D("lrun-dress-kettle", { feetPosition: { x: AX - 4.7, y: 0.56, z: -3.35 }, rotation: { yaw: 40 }, model: M.kettle, layout: fit(0.12, 0.24, 0.12) });
  D("lrun-dress-poster-a", { feetPosition: { x: AX + 2.4, y: 1.05, z: -4.36 }, vector: "<svg viewBox='0 0 120 170' width='0.6m'><rect width='120' height='170' fill='#9d9784'/><rect x='6' y='6' width='108' height='158' fill='none' stroke='#16293f' stroke-width='3'/><text x='60' y='44' text-anchor='middle' font-family='display' font-size='26' font-weight='bold' fill='#16293f'>M.E.G.</text><text x='60' y='78' text-anchor='middle' font-family='sans-serif' font-size='11' fill='#2a2a2a'>IF YOU CAN READ THIS</text><text x='60' y='94' text-anchor='middle' font-family='sans-serif' font-size='11' fill='#2a2a2a'>YOU ARE SAFE.</text><text x='60' y='118' text-anchor='middle' font-family='sans-serif' font-size='10' fill='#7a1a1a'>DRINK WATER. SLEEP.</text><text x='60' y='150' text-anchor='middle' font-family='sans-serif' font-size='8' fill='#555'>Outpost notice 7-B</text></svg>" });
  D("lrun-dress-poster-b", { feetPosition: { x: AX - 5.86, y: 1.1, z: -1.2 }, rotation: { yaw: 90 }, vector: "<svg viewBox='0 0 150 100' width='0.75m'><rect width='150' height='100' fill='#8f8873'/><path d='M10 80 L40 30 L70 60 L95 20 L140 80 Z' fill='#4a5c47'/><circle cx='118' cy='28' r='10' fill='#9a7a34'/><text x='75' y='95' text-anchor='middle' font-family='serif' font-size='9' fill='#333'>somewhere with a sky</text></svg>" });
  // the Level 11 door keeps its id, behavior and state; it wears a real metal door
  const l11 = objs["lrun-to-l11"];
  if (l11) { for (const c of l11.children ?? []) c.visible = false;
    l11.primitive = { kind: "scripted", script: DOOR, params: { style: "metal", part: "set", w: 1.2, h: 2.3, seed: 11 } }; l11.material = { pbr: true, color: "oklch(0.86 0.02 150)" }; }
  const al = objs["lrun-alcove-light"]; if (al) al.feetPosition = { x: AX + 1.2, y: 2.95, z: 0 };
  const sm = objs["lrun-pursuer-5"]; if (sm) { for (const c of sm.children ?? []) c.visible = false; sm.primitive = { kind: "scripted", script: GEO, params: { part: "smiler" } }; }
  st.dressV = DRESS_V;
}
