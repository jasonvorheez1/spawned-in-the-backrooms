// Level 31 "The Roller Rink": lays the shell once (floor, walls, rink, barrier, starburst, cinema, DJ booth, doors).
// The arcade, food court, skate rental and gift shop dress their own zones (scripts/lib/level31-*.js), map in scripts/lib/level31.js.
import { animate } from "builtin/tween";
import { H, T, B, RINK, ZONES, ARRIVE, DOOR, BACK } from "../../scripts/lib/level31.js";
import { G as FG } from "../../scripts/lib/level31-food.js";
import { layParts } from "../../scripts/lib/level31-parts.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { rbox } from "../../scripts/lib/rbox.js";
export const cadence = "1s";
const V = 42;
const RAIL_GLB = "/cdn/value.2857b1776e7530e681bc3e86d3943165c85628f7856964245b2baa36e89125a4.glb";
const TRIPO = { lockers: "/cdn/value.db196dcd8d77b030e9d8c2fd6593b4ebd3ca4b89acef7ccb4064eeb0b8dfe13e.glb", bench: "/cdn/value.2f7b960c45839606b871cd446580e4c87732b96f57e9807dca2bedbc0faea27c.glb" }; // Tripo v3.1, Nov 12
const PROPS = "scripts/l31-props-geo.js";
const P = (params) => ({ primitive: { kind: "scripted", script: PROPS, params }, material: { pbr: true } });
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
const WOOD = { texture: "cdn/texture-polished-maple-roller-rink-floor-planks.png", wrap: "repeat", repeat: [0.35, 0.35], color: "oklch(0.92 0.03 75)", roughness: 0.16, metalness: 0.05 };
const CARPET = { texture: "cdn/texture-blue-loop-pile-commercial-carpet.png", wrap: "repeat", repeat: [0.65, 0.65], color: "#626c80", roughness: 0.98 };
const ARCADE_CARPET = { ...CARPET, texture: "cdn/texture-black-arcade-carpet-neon-confetti-squiggles.png", color: "#a09ab2" };
const WALL = { texture: "cdn/texture-painted-cinder-block-wall-muted-plum-mauve-scuffed.png", wrap: "repeat", repeat: [0.5, 0.5], color: "#b3a0a4", roughness: 0.9 };
const CEIL = { texture: "cdn/texture-charcoal-grey-acoustic-drop-ceiling-tile-grid-aged.png", wrap: "repeat", repeat: [0.8, 0.8], color: "oklch(0.95 0.01 60)", roughness: 1 };
const RAIL = { texture: "cdn/texture-varnished-oak-plank-rink-barrier.png", wrap: "repeat", repeat: [0.6, 0.6], color: "oklch(0.9 0.04 70)", roughness: 0.5 };
const RAILCAP = { color: "#793f36", roughness: 0.4 };
const PLY = { texture: "cdn/texture-raw-plywood-sheet-knots-and-grain.png", color: "oklch(0.95 0.03 80)", roughness: 0.85 };
const glow = (c, e = 3) => ({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.4 });
const BULBS = ["#c45c4d", "#f3ae64", "#ffde9b"];

function starburst(ctx) {
  // the fixture from the wiki photo: long red bars fanning from the centre, a bulb every 60 cm, the mirror ball under the hub
  const kids = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 360, long = i % 2 === 0, len = long ? 9.5 : 6.2, rad = (a * Math.PI) / 180;
    const sx = Math.abs(Math.cos(rad)) * 0.55 + 0.45; // squashed toward the rink's short side so it sits over the oval
    const L = len * sx, cx = Math.cos(rad) * (0.5 + L / 2), cz = -Math.sin(rad) * (0.5 + L / 2);
    kids.push({ feetPosition: { x: cx, y: -0.06, z: cz }, rotation: { yaw: a }, primitive: box(L, 0.07, 0.11), material: glow("#88423b", 0.35), castShadow: false });
    for (let d = 0.9; d < L + 0.3; d += 0.86) kids.push({ feetPosition: { x: Math.cos(rad) * (0.5 + d), y: -0.16, z: -Math.sin(rad) * (0.5 + d) }, primitive: { kind: "sphere", radius: 0.055, widthSegments: 8, heightSegments: 6 }, material: glow(BULBS[(i + Math.round(d * 3)) % BULBS.length], 1.6), castShadow: false });
  }
  kids.push({ feetPosition: { x: 0, y: -0.2, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.6, radiusBottom: 0.45, height: 0.2 }, material: glow("#ffd9a0", 0.8) });
  kids.push({ feetPosition: { x: 0, y: -0.55, z: 0 }, primitive: box(0.03, 0.4, 0.03), material: { color: "#222" } });
  ctx.spawn("l31-starburst", { feetPosition: { x: 0, y: H - 0.02, z: 0 }, primitive: box(0.2, 0.02, 0.2), material: { color: "#111" }, castShadow: false, children: kids });
  ctx.spawn("l31-starlight", { feetPosition: { x: 0, y: H - 0.6, z: 0 }, light: { kind: "point", color: "#ffc59a", intensity: 5, distance: 26 } });
  ctx.spawn("l31-ball", { feetPosition: { x: 0, y: H - 1.25, z: 0 }, primitive: { kind: "sphere", radius: 0.42, widthSegments: 18, heightSegments: 12 }, material: { texture: "cdn/texture-mirror-disco-ball-tiny-square-facets.png", color: "#ffffff", metalness: 1, roughness: 0.12 } });
  animate(ctx, "l31-ball", { "rotation.yaw": "+=360" }, { duration: 14, loop: true, easing: "linear" });
  // The sweep: three coloured spots on one slow arm, so pools of colour slide across the wood
  ctx.spawn("l31-sweep", { feetPosition: { x: 0, y: H - 0.5, z: 0 }, children: [["#eaa383", 7, 3], ["#839cd3", -8, -4], ["#f3bc70", 3, -7]].map(([c, x, z]) => (
    { feetPosition: { x, y: 0, z }, light: { kind: "spot", color: c, intensity: 3.5, distance: 12, angle: 28, penumbra: 0.6, aim: { x: x * 0.4, y: -1, z: z * 0.4 } } })) });
  animate(ctx, "l31-sweep", { "rotation.yaw": "+=360" }, { duration: 22, loop: true, easing: "linear" });
}

function rink(ctx) {
  const { half, r, rail } = RINK;
  ctx.spawn("l31-rink", { feetPosition: { x: 0, y: 0.018, z: 0 }, primitive: { kind: "scripted", script: "scripts/l31-floor-geo.js", params: { half, r } }, material: WOOD, receiveShadow: true, castShadow: false, tags: ["l31-wood"] });
  let n = 0;
  const seg = (x, z, len, yaw) => ctx.spawn(`l31-rail${n++}`, { feetPosition: { x, y: 0, z }, rotation: { yaw }, primitive: rbox(len, 1.07, 0.24), material: RAIL, physics: "static", render: false,
    // Tripo padded rink rail: file is 1.0 x 0.263 x 0.063 (long on x); stretched to the panel length, 1.07 m tall
    children: [{ id: "m", model: RAIL_GLB, scale: { x: len + 0.04, y: 4.07, z: 4.07 }, castShadow: false }] });
  for (const side of [-1, 1]) {
    for (const [a, b] of [[-half, -1.35], [1.35, half]]) seg((a + b) / 2, side * rail, b - a, 0);
    for (const x of [-1.4, 1.4]) ctx.spawn(`l31-gatepost-${side}-${x}`, {
      feetPosition: { x, y: 0, z: side * rail }, primitive: { kind: "cylinder", radiusTop: 0.105, radiusBottom: 0.12, height: 1.07, radialSegments: 12 },
      material: { color: "#caaa81", roughness: 0.5 }, physics: "static", castShadow: false,
    });
  }
  // the two curved ends, 12 flat panels each
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) {
    const a = (-90 + (i + 0.5) * 15) * Math.PI / 180, len = 2 * rail * Math.sin((7.5 * Math.PI) / 180) + 0.04, rr = rail * Math.cos((7.5 * Math.PI) / 180);
    seg(s * (half + rr * Math.cos(a)), rr * Math.sin(a), len, s * (90 - (a * 180) / Math.PI));
  }
  // painted lane line round the inside, like every rink has
  ctx.spawn("l31-line", { feetPosition: { x: 0, y: 0.022, z: 0 }, castShadow: false, vector: `<svg viewBox='0 0 440 240' width='44m'><rect x='40' y='40' width='360' height='160' rx='80' fill='none' stroke='#d8322a' stroke-width='1.2' opacity='.8'/><rect x='70' y='70' width='300' height='100' rx='50' fill='none' stroke='#2a6fd8' stroke-width='1' opacity='.7'/></svg>`, rotation: { pitch: -90 } });
}

function shell(ctx) {
  const W = B.x1 - B.x0, D = B.z1 - B.z0;
  ctx.spawn("l31-floor", { feetPosition: { x: 0, y: -0.3, z: 0 }, primitive: box(W, 0.3, D), material: CARPET, physics: "static", receiveShadow: true, castShadow: false });
  ctx.spawn("l31-ceil", { feetPosition: { x: 0, y: H, z: 0 }, primitive: box(W, 0.2, D), material: CEIL, physics: "static", castShadow: false });
  const w = (id, x, z, wd, dp, mat = WALL) => ctx.spawn(`l31-wall-${id}`, { feetPosition: { x, y: 0, z }, primitive: box(wd, H, dp), material: mat, physics: "static", castShadow: false });
  w("n", 0, B.z0 - T / 2, W + T * 2, T);
  // east wall, cut by the arcade doorway (a rounded arch of chrome around the arcade entrance)
  const K = BACK, dz0 = K.doorZ - K.doorW / 2, dz1 = K.doorZ + K.doorW / 2;
  w("e1", B.x1 + T / 2, (B.z0 + dz0) / 2, T, dz0 - B.z0); w("e2", B.x1 + T / 2, (dz1 + B.z1) / 2, T, B.z1 - dz1);
  ctx.spawn("l31-wall-e-lintel", { feetPosition: { x: B.x1 + T / 2, y: K.doorH, z: K.doorZ }, primitive: box(T, H - K.doorH, K.doorW), material: WALL, physics: "static", castShadow: false });
  ctx.spawn("l31-arch", { feetPosition: { x: B.x1 + T / 2, y: 0, z: K.doorZ }, rotation: { yaw: 90 }, primitive: { kind: "archway", width: K.doorW + 0.3, height: K.doorH + 0.15, depth: T + 0.14, thickness: 0.14, segments: 24 }, material: { color: "#d9dbe3", metalness: 0.9, roughness: 0.22 }, castShadow: false,
    children: [{ feetPosition: { x: 0, y: K.doorH + 0.32, z: -0.2 }, vector: `<svg viewBox='0 0 300 60' width='2.6m'><text x='150' y='44' text-anchor='middle' font-family='display' font-size='40' font-weight='bold' letter-spacing='4' fill='#ecdaba'>ARCADE</text></svg>`, castShadow: false }] });
  // the back room: its own floor, ceiling and three walls
  const KW = K.x1 - K.x0, KD = K.z1 - K.z0, kx = (K.x0 + K.x1) / 2 + T / 2, kz = (K.z0 + K.z1) / 2;
  ctx.spawn("l31-back-floor", { feetPosition: { x: kx, y: -0.3, z: kz }, primitive: box(KW + T, 0.3, KD), material: ARCADE_CARPET, physics: "static", receiveShadow: true, castShadow: false });
  ctx.spawn("l31-back-ceil", { feetPosition: { x: kx, y: H, z: kz }, primitive: box(KW + T, 0.2, KD), material: CEIL, physics: "static", castShadow: false });
  w("bn", kx, K.z0 - T / 2, KW + T * 2, T); w("bs", kx, K.z1 + T / 2, KW + T * 2, T); w("be", K.x1 + T * 1.5, kz, T, KD + T * 2); w("w", B.x0 - T / 2, 0, T, D);
  w("s1", (B.x0 + DOOR.x - 0.6) / 2, B.z1 + T / 2, DOOR.x - 0.6 - B.x0, T); w("s2", (DOOR.x + 0.6 + B.x1) / 2, B.z1 + T / 2, B.x1 - DOOR.x - 0.6, T);
  ctx.spawn("l31-wall-s-lintel", { feetPosition: { x: DOOR.x, y: 2.3, z: B.z1 + T / 2 }, primitive: box(1.2, H - 2.3, T), material: WALL, physics: "static", castShadow: false });
  // The party room and the snack bar share a service wall. Both face the public aisle.
  w("party-food", 34, 6, 16, T, { ...WALL, color: "#a9a69f" });
  ctx.spawn("l31-snack-wall-rail", {
    feetPosition: { x: 34, y: 0.95, z: 6.16 }, primitive: rbox(15.95, 0.095, 0.035),
    material: { color: "#744d3e", roughness: 0.58 }, castShadow: false,
  });
  w("cinema-left", -11.9, -24.7, T, 10.6, { ...WALL, color: "#66565d" });
  w("cinema-right", 11.9, -24.7, T, 10.6, { ...WALL, color: "#66565d" });
  for (const [x, width] of [[0, 10], [-10.6, 2.6], [10.6, 2.6]]) w("cinema-rear-" + x, x, -19.4, width, T, { ...WALL, color: "#68545b" });
  // House lighting follows the aisle. The cinema and arcade have their own fixtures.
  [[-29, 25], [-18, 23], [-2, 22], [14, 18], [23, 17], [-24, 0], [24, 0], [-26, -19], [23, -18], [-14, -16], [14, -16]].forEach(([x, z], i) => ctx.spawn(`l31-can${i}`, {
    feetPosition: { x, y: H - 0.1, z }, ...P({ kind: "can" }), castShadow: false,
    children: [{ feetPosition: { x: 0, y: -0.35, z: 0 }, light: { kind: "point", color: "#ffe1bd", intensity: 4.2, distance: 11 } }],
  }));
  edges(ctx);
}

// the room's edges: lockers, lacing benches and bins under the chase lights, where people actually sit and change
function edges(ctx) {
  const WX = B.x0 + 0.26, NZ = B.z0 + 0.26, SZ = B.z1 - 0.26;
  const put = (id, x, z, yaw, params, solid = true) => {
    if (params.kind === "lockers") { // Tripo bank: 3 doors wide, 1.8 m tall, 0.5 m deep; a run of cols becomes ceil(cols/3) banks side by side
      const n = Math.ceil(params.cols / 3), w = 1.5, r = (yaw * Math.PI) / 180, ax = Math.cos(r), az = -Math.sin(r);
      for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * w; ctx.spawn(`l31-edge-${id}-${i}`, { feetPosition: { x: x + ax * o, y: 0, z: z + az * o }, rotation: { yaw }, model: { id: TRIPO.lockers, forward: "+x" }, layout: { box: { min: { x: -w / 2, y: 0, z: -0.3 }, max: { x: w / 2, y: 1.8, z: 0.3 } } }, physics: "static" }); }
      return;
    }
    if (params.kind === "bench") return ctx.spawn(`l31-edge-${id}`, { feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: TRIPO.bench }, layout: { box: { min: { x: -params.len / 2, y: 0, z: -0.3 }, max: { x: params.len / 2, y: 0.5, z: 0.3 } } }, physics: "static", tags: ["seat"], state: { name: "Bench" } });
    return ctx.spawn(`l31-edge-${id}`, { feetPosition: { x, y: 0, z }, rotation: { yaw }, ...P(params), ...(solid ? { physics: "static" } : {}), tags: params.kind === "bench" ? ["seat"] : [], state: params.kind === "bench" ? { name: "Bench" } : undefined });
  };
  put("lk-w3", WX, 21.5, -90, { kind: "lockers", cols: 6, hue: 200 });
  put("bn-w3", B.x0 + 1.55, 21.5, -90, { kind: "bench", len: 2.4 });
  put("lk-s1", -37, SZ, 0, { kind: "lockers", cols: 5, hue: 200 });
  put("bn-s1", -23.8, B.z1 - 0.55, 0, { kind: "bench", len: 3.2 });
  put("bin-s2", -26.6, SZ, 0, { kind: "bin" });
  put("arcade-wait1", 48, BACK.z1 - 0.55, 0, { kind: "bench", len: 2.8 });
  put("arcade-wait2", 53, BACK.z1 - 0.55, 0, { kind: "bench", len: 2.8 });
  put("bn-n1", -22, B.z0 + 0.55, 180, { kind: "bench", len: 3.2 });
  put("bin-n1", -15, NZ, 180, { kind: "bin" });
  put("bn-n3", 19, B.z0 + 0.55, 180, { kind: "bench", len: 2.4 });
  // rink-side benches on the carpet aisle
  for (const [i, x] of [-6, 6].entries()) { put(`bn-r${i}n`, x, -RINK.rail - 1.1, 180, { kind: "bench", len: 2.8 }); put(`bn-r${i}s`, x, RINK.rail + 1.1, 0, { kind: "bench", len: 2.8 }); }
}

function doors(ctx) {
  // the way back: the plywood door you came through, music side
  ctx.spawn("l31-door-leaf", { feetPosition: { x: DOOR.x, y: 0, z: B.z1 + 0.05 }, primitive: box(1.16, 2.28, 0.05), material: PLY, castShadow: false,
    children: [{ feetPosition: { x: 0.42, y: 1.02, z: -0.05 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 0.1 }, rotation: { pitch: 90 }, material: { color: "#8a7a55", metalness: 0.9, roughness: 0.4 } },
      { feetPosition: { x: 0, y: 1.1, z: -0.035 }, primitive: box(1.16, 0.09, 0.03), material: PLY }, { feetPosition: { x: 0, y: 0.25, z: -0.035 }, primitive: box(1.16, 0.09, 0.03), material: PLY }] });
  ctx.spawn("l31-from-l2", { feetPosition: ARRIVE, rotation: { yaw: -45 } }); // facing the rink, not the gift shop's back wall
  ctx.spawn("l31-back", { feetPosition: { x: DOOR.x, y: 0, z: B.z1 - 0.25 }, physics: { body: "static", trigger: true }, primitive: box(1.2, 2.3, 0.4), visible: false, behavior: "scripts/level-door.js", state: { to: "level2#l2-from-l31" } });
  ctx.spawn("l31-exit-sign", { feetPosition: { x: DOOR.x, y: 2.45, z: B.z1 - 0.06 }, rotation: { yaw: 0 }, castShadow: false, vector: `<svg viewBox='0 0 100 40' width='0.7m'><rect width='100' height='40' rx='3' fill='#0d1a0f'/><text x='50' y='29' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='26' fill='#5dff7a' filter='drop-shadow(0 0 3 #5dff7a)'>EXIT</text></svg>` });
  // the white door marked 70, north-west corner. It does not open. (Level 70 is not built.)
  ctx.spawn("l31-door-70-casing", { feetPosition: { x: B.x0 + 0.02, y: 0, z: -22 }, rotation: { yaw: -90 }, ...P({ kind: "casing", w: 1.1, h: 2.2 }), castShadow: false });
  ctx.spawn("l31-door-70-plaque", { feetPosition: { x: B.x0 + 0.03, y: 2.62, z: -22 }, rotation: { yaw: -90 }, castShadow: false, vector: `<svg viewBox='0 0 160 40' width='0.6m'><rect width='160' height='40' rx='3' fill='#e9e4d6' stroke='#77705f' stroke-width='2'/><text x='80' y='27' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='17' fill='#3a352c'>EMPLOYEES ONLY</text></svg>` });
  ctx.spawn("l31-door-70", { feetPosition: { x: B.x0 + 0.04, y: 0, z: -22 }, rotation: { yaw: -90 }, primitive: box(1.1, 2.2, 0.06), material: { color: "oklch(0.95 0.005 90)", roughness: 0.5 }, castShadow: false, tags: ["usable"], state: { name: "White door", info: "A 70 is engraved in the paint. Locked. Cold air under it." },
    children: [{ feetPosition: { x: 0, y: 1.5, z: -0.04 }, vector: `<svg viewBox='0 0 60 40' width='0.3m'><text x='30' y='32' text-anchor='middle' font-family='serif' font-size='34' fill='#b9b9b2'>70</text></svg>` }, { feetPosition: { x: 0.42, y: 1.0, z: -0.06 }, primitive: { kind: "sphere", radius: 0.035 }, material: { color: "#c9c2a8", metalness: 0.9, roughness: 0.3 } }] });
}

function cinema(ctx) {
  // north alcove: the big television and three stepped metal benches. It is the darkest, quietest corner.
  const C = ZONES.cinema, cx = (C.x0 + C.x1) / 2;
  ctx.spawn("l31-tv", { feetPosition: { x: cx, y: 1.3, z: C.z0 + 0.12 }, primitive: box(4.8, 2.8, 0.14), material: { color: "#0a0a0c", roughness: 0.3 }, castShadow: false,
    children: [{ feetPosition: { x: 0, y: 0.1, z: 0.075 }, primitive: box(4.6, 2.6, 0.01), material: { texture: "cdn/texture-old-animated-movie-still-dog-on-clouds-crt-scanlines.png", color: "#ffffff", emissive: "#9ab6ff", emissiveIntensity: 0.3 } }] });
  ctx.spawn("l31-tv-light", { feetPosition: { x: cx, y: 2.6, z: C.z0 + 2 }, light: { kind: "point", color: "#8fb0ff", intensity: 1.6, distance: 11 } });
  for (let i = 0; i < 3; i++) { const z = C.z0 + 4.2 + i * 1.6, y = i * 0.3;
    if (i) ctx.spawn(`l31-step${i}`, { feetPosition: { x: cx, y: 0, z: z + 0.5 }, primitive: rbox(9, y, 1.6), material: CARPET, physics: "static", castShadow: false });
    ctx.spawn(`l31-bench${i}`, { feetPosition: { x: cx, y, z: z + 0.1 }, ...P({ kind: "seats", n: 14 - i }), physics: "static", tags: ["seat"], state: { name: "Cinema seat" } }); }
  for (const s of [-1, 1]) ctx.spawn(`l31-curtain${s}`, { feetPosition: { x: cx + s * 3.75, y: 0, z: C.z0 + 0.3 }, rotation: { yaw: 180 }, ...P({ kind: "curtain", w: 2.6, h: 4.6 }), castShadow: false });
  ctx.spawn("l31-valance", { feetPosition: { x: cx, y: 4.35, z: C.z0 + 0.35 }, primitive: { kind: "box", width: 10.2, height: 0.5, depth: 0.12 }, material: { texture: "cdn/texture-burgundy-velvet-cinema-seat-upholstery.png", wrap: "repeat", repeat: [1, 1], color: "oklch(0.75 0.06 20)", roughness: 0.95 }, castShadow: false });
  ctx.spawn("l31-cinema-wash", { feetPosition: { x: cx, y: 4.2, z: C.z0 + 7 }, light: { kind: "point", color: "#ffcf9a", intensity: 1.0, distance: 8 } });
  ctx.spawn("l31-cinema-sign", { feetPosition: { x: cx, y: 3.22, z: -19.22 }, rotation: { yaw: 180 }, castShadow: false, vector: `<svg viewBox='0 0 220 50' width='3.2m'><rect width='220' height='50' rx='6' fill='#17090f' stroke='#ffd23a' stroke-width='2'/><text x='110' y='36' text-anchor='middle' font-family='display' font-size='32' fill='#ffd23a' filter='drop-shadow(0 0 4 #ff8a1e)'>NOW SHOWING</text></svg>` });
}

function djBooth(ctx) {
  const d = ZONES.dj, cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2;
  ctx.spawn("l31-dj-riser", { feetPosition: { x: cx, y: 0, z: cz }, primitive: rbox(6, 0.5, 3.5), material: { texture: "cdn/texture-black-rubber-stage-riser-diamond-tread.png", wrap: "repeat", repeat: [1, 1], color: "#fff", roughness: 0.8 }, physics: "static" });
  ctx.spawn("l31-dj-front", { feetPosition: { x: cx, y: 0.5, z: d.z0 + 0.2 }, primitive: rbox(5.6, 0.75, 0.25), material: RAIL, physics: "static",
    children: [{ feetPosition: { x: 0, y: 0.375, z: -0.135 }, vector: `<svg viewBox='0 0 300 60' width='4.6m'><text x='150' y='44' text-anchor='middle' font-family='display' font-size='40' fill='#ff3fa4' filter='drop-shadow(0 0 5 #ff3fa4)'>REQUEST LINE</text></svg>` }] });
  // the Faceling DJ (wiki: "a docile Faceling sitting inside selecting songs"): stands behind the rail at a deck, facing the rink
  // the DJ's console: a Tripo model fitted into the old deck's 2.2 x 0.75 x 0.8 footprint, its face toward the rink (-Z)
  ctx.spawn("l31-dj-deck", { feetPosition: { x: cx, y: 0.5, z: d.z0 + 0.75 }, physics: "static",
    model: { id: "/cdn/value.dec346aec0305c54a42cad5514d456a7488f7d389a8801881a47082fb1e159dc.glb", forward: "-x" },
    layout: { box: { min: { x: -1.1, y: 0, z: -0.4 }, max: { x: 1.1, y: 0.95, z: 0.4 } } },
    children: [{ feetPosition: { x: 0, y: 0.6, z: -0.5 }, light: { kind: "point", color: "#ff3fa4", intensity: 0.5, distance: 2.5 } }] });
  ctx.spawn("l31-dj", { feetPosition: { x: cx, y: 0.55, z: d.z0 + 1.75 }, rotation: { yaw: 0 }, physics: "character", tags: ["npc", "usable", "faceling", "l31-dj"],
    ...critterSpec(npcLook("l31-dj", { species: "faceling", sex: "m", fur: "#c68652", botw: "pants", shoes: "sneakers", topw: "jacket", top: "#3a2a5a", bottom: "#1d1d26" }, "wanderer", 1)),
    behavior: ["scripts/humanoid-locomotion.js"], state: { name: "Faceling DJ", role: "regular", faction: "wanderer", factionName: "Rink DJ", docile: true, hp: 60, home: { x: cx, z: d.z0 + 1.75 }, stay: true } });
  ctx.spawn("l31-dj-light", { feetPosition: { x: cx, y: 3, z: cz }, light: { kind: "point", color: "#ff5fb0", intensity: 0.6, distance: 7 } });
  ctx.spawn("l31-music", { feetPosition: { x: cx, y: 2, z: cz }, audio: { clip: "/cdn/moodboard-toon-vibrant/music-muffled-80s-radio-pop-roller-rink-pa-speakers-loop.mp3", gain: 0.30, loop: true, spatial: true, maxDistance: 46, bus: "music" } });
  ctx.spawn("l31-skate-bed", { feetPosition: { x: 0, y: 1, z: 0 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-roller-skates-on-wood-rink-distant-laughter-loop.mp3", gain: 0.12, loop: true, spatial: true, maxDistance: 40 } });
}

// A party room with a clear aisle from the entrance to the back wall.
function party(ctx) {
  const p = ZONES.party, mat = { ...CARPET, color: "#426c68" };
  ctx.spawn("l31-party-floor", { feetPosition: { x: 34, y: 0.004, z: -24 }, primitive: box(15.7, 0.018, 11.7), material: mat, receiveShadow: true, castShadow: false });
  // Tripo half-wall (confetti laminate, chrome cap), tiled in ~3 m panels so the print never stretches; one box collider per wall
  const HALF = "/cdn/value.97da340e2f190a4775e572f96bf2084a02f2669b6ea5814a0c6d2fc46895723b.glb";
  const divider = (id, x, z, len, yaw) => {
    const n = Math.max(1, Math.round(len / 3)), seg = len / n;
    ctx.spawn("l31-party-divider-" + id, {
      feetPosition: { x, y: 0, z }, rotation: { yaw }, primitive: { kind: "box", width: len, height: 1.06, depth: 0.2 }, render: false, physics: "static",
      children: Array.from({ length: n }, (_, i) => ({ feetPosition: { x: -len / 2 + seg * (i + 0.5), y: 0, z: 0 },
        model: { id: HALF, forward: "+x" }, layout: { box: { min: { x: -seg / 2, y: 0, z: -0.1 }, max: { x: seg / 2, y: 1.06, z: 0.1 } } } })),
    });
  };
  divider("west", p.x0, -24, 11.8, 90);
  divider("left", 28.8, -18, 5.5, 0);
  divider("right", 38.6, -18, 6.8, 0);
  // A bookable table bank, with a wide approach from the arcade junction.
  [[30.4, -25.7], [36.8, -25.7], [30.4, -21.6], [36.8, -21.6]].forEach(([x, z], i) => {
    ctx.spawn(`l31-party-t${i}`, { feetPosition: { x, y: 0.022, z }, model: { id: FG.table, forward: "+z" }, physics: { body: "static", collider: "box" }, castShadow: false });
    for (const [k, dx, dz, yaw] of [[0, 0, -.89, 180], [1, 0, .89, 0], [2, -.89, 0, -90], [3, .89, 0, 90]]) ctx.spawn(`l31-party-c${i}-${k}`, {
      feetPosition: { x: x + dx, y: .022, z: z + dz }, rotation: { yaw }, model: { id: FG.chair, forward: "+z" }, physics: { body: "static", collider: "box" }, castShadow: false, tags: ["seat"], state: { name: "Party chair" },
    });
  });
  ctx.spawn("l31-party-serving", {
    feetPosition: { x: 34, y: 0.018, z: -29.24 }, primitive: rbox(3.6, 0.86, 0.85, 0.045),
    material: { color: "#75483a", roughness: 0.78 }, physics: "static",
    children: [{
      feetPosition: { x: 0, y: 0.86, z: 0 }, primitive: rbox(3.69, 0.055, 0.91, 0.024),
      material: { color: "#e8d8b1", roughness: 0.63 },
    }],
  });
  ctx.spawn("l31-party-banner", { feetPosition: { x: 34, y: 2.4, z: p.z0 + .03 }, rotation: { yaw: 180 }, castShadow: false,
    vector: "<svg viewBox='0 0 400 92' width='4m'><rect width='400' height='92' rx='4' fill='#702f42'/><path d='M14 12h372v68H14z' fill='none' stroke='#dfb883' stroke-width='2'/><text x='200' y='55' text-anchor='middle' fill='#f6e5c8' font-family='serif' font-size='29'>HAPPY BIRTHDAY</text></svg>" });
  for (const [i, x] of [30.4, 36.8].entries()) ctx.spawn("l31-party-light" + i, {
    feetPosition: { x, y: H - 0.12, z: -24 },
    primitive: rbox(0.72, 0.08, 1.28, 0.04), material: glow("#ffe2ba", 0.95), castShadow: false,
    children: [{ feetPosition: { x: 0, y: -0.2, z: 0 }, light: { kind: "point", color: "#ffe1bb", intensity: 4.5, distance: 10 } }],
  });
}

export function tick(ctx) {
  const s = ctx.place.state;
  if (s.v31 === V) return;
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l31-") && !id.includes("/")) ctx.destroy(id);
  shell(ctx); rink(ctx); starburst(ctx); doors(ctx); cinema(ctx); djBooth(ctx); party(ctx);
  layParts(ctx);
  s.v31 = V;
}
