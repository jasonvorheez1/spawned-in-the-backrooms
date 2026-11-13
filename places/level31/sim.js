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
const V = 72;
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
    // Tripo padded rink rail: node matrix x3.8, so it draws 3.8 x 1.0 x 0.24 m (long on x); stretched to the panel, 1.07 m tall
    children: [{ id: "m", model: RAIL_GLB, scale: { x: (len + 0.04) / 3.8, y: 1.07, z: 1 }, castShadow: false }] });
  for (const side of [-1, 1]) {
    for (const [a, b] of [[-half, -1.35], [1.35, half]]) seg((a + b) / 2, side * rail, b - a, 0);
    for (const x of [-1.4, 1.4]) ctx.spawn(`l31-gatepost-${side}-${x}`, {
      feetPosition: { x, y: 0, z: side * rail }, // Tripo padded post with chrome cap: draws 0.24 x 1.0 m at file size
      model: "/cdn/value.1029b6db02f325db84b1c97ba55ef6e19c795aa8091b2b54963e50768b89178d.glb", scale: 1.07, physics: { body: "static", collider: "cylinder" }, castShadow: false,
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
  ctx.spawn("l31-arch", { feetPosition: { x: B.x1 + T / 2, y: 0, z: K.doorZ }, // Tripo chrome-and-teal neon arch (drawn 0.31 x 1.8 x 1.42 m, opening along z) stretched to the doorway
    castShadow: false,
    children: [ // chrome jambs and a rounded head, teal neon on the inner face (the old Tripo arch carried two bars across the opening: Shelly Nov 13 "fix this")
      ...[-1, 1].map((sd, i) => ({ id: "jamb" + i, feetPosition: { x: 0, y: 0, z: sd * (K.doorW / 2 + 0.06) }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.1, height: K.doorH - K.doorW / 2 * 0.35, radialSegments: 20 }, material: { color: "#d9dde3", metalness: 0.95, roughness: 0.22 } })),
      ...[-1, 1].map((sd, i) => ({ id: "neon" + i, feetPosition: { x: 0, y: 0.05, z: sd * (K.doorW / 2 - 0.05) }, primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: K.doorH - K.doorW / 2 * 0.35 - 0.1, radialSegments: 10 }, material: { color: "#1d7b80", emissive: "#3ff0e0", emissiveIntensity: 2.2 } })),
      { id: "head", feetPosition: { x: 0, y: K.doorH - K.doorW / 2 * 0.35, z: 0 }, rotation: { yaw: 90 }, scale: { x: 1, y: 0.35, z: 1 }, primitive: { kind: "torus", radius: K.doorW / 2 + 0.06, tube: 0.1, radialSegments: 16, tubularSegments: 40, arc: Math.PI }, material: { color: "#d9dde3", metalness: 0.95, roughness: 0.22 } },
      { feetPosition: { x: -0.32, y: K.doorH + 0.45, z: 0 }, rotation: { yaw: 90 }, vector: `<svg viewBox='0 0 300 60' width='2.6m'><text x='150' y='44' text-anchor='middle' font-family='display' font-size='40' font-weight='bold' letter-spacing='4' fill='#ecdaba'>ARCADE</text></svg>`, castShadow: false }] });
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
    children: [{ feetPosition: { x: 0, y: -0.35, z: 0 }, light: { kind: "point", color: "#ffe1bd", intensity: 7, distance: 14 } }],
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
    // Tripo teal swing-lid can: draws 0.34 x 0.6 x 0.34 m at file size, so x1.5 = 0.9 m tall
    if (params.kind === "bin") return ctx.spawn(`l31-edge-${id}`, { feetPosition: { x, y: 0, z }, rotation: { yaw }, model: "/cdn/value.2c45917a31f2025dfd332e385512e02089853ee6c91979b1b0aa6a7940c89209.glb", scale: 1.5, physics: { body: "static", collider: "cylinder" }, state: { name: "Trash can" } });
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
  // the marquee: bulb-ringed letterboard over the cinema mouth; the posters below are painted one-sheets in chrome lightboxes
  const bulbs = Array.from({ length: 30 }, (_, k) => `<circle cx='${10 + k * 20}' cy='8' r='4' fill='#fff1b8' filter='drop-shadow(0 0 3 #ffb42e)'/><circle cx='${10 + k * 20}' cy='132' r='4' fill='#fff1b8' filter='drop-shadow(0 0 3 #ffb42e)'/>`).join("");
  ctx.spawn("l31-cinema-sign", { feetPosition: { x: cx, y: 3.6, z: -19.2 }, rotation: { yaw: 180 }, castShadow: false, vector: `<svg viewBox='0 0 600 140' width='6m'><rect width='600' height='140' rx='10' fill='#14070c' stroke='#ffd23a' stroke-width='3'/>${bulbs}<rect x='20' y='20' width='560' height='34' fill='#2a0f18'/><text x='300' y='47' text-anchor='middle' font-family='display' font-size='28' letter-spacing='8' fill='#ffd23a' filter='drop-shadow(0 0 4 #ff8a1e)'>NOW SHOWING</text><rect x='20' y='60' width='560' height='62' fill='#f3ead2'/><text x='300' y='90' text-anchor='middle' font-family='sans-serif' font-weight='900' font-size='30' fill='#d4204b'>DANDY'S WORLD</text><text x='300' y='114' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='12' letter-spacing='0.5' fill='#1a1a1a'>PARTY TIME =) · FACE TO FACELESS · SMILE WIDE · NO-CLIP · HOUND &amp; HOME</text></svg>` });
  const POSTERS = [
    ["dandy", 0, -19.2, 180, 1.5, "/cdn/image-u019svac1.webp", 1],
    ["party", -2.7, -19.2, 180, 1.1, "/cdn/value.8d800fd6a81b3a0846cdcec35414c823e2e8f6053a854e26fcae3d5cd365a252.png"],
    ["faceless", 2.7, -19.2, 180, 1.1, "/cdn/value.6826e5aa592e65514c1082e980dd51ec10dbf00709ace54c7bf6bd0d5fb3f1e1.png"],
    ["smiler", -10.6, -19.2, 180, 1.1, "/cdn/value.87df9bfe7b64f900eed97ffd4be59ea7a7387345c05f943e628b210dcc6480d6.png"],
    ["noclip", 10.6, -19.2, 180, 1.1, "/cdn/value.0a131871a81206986cb553ab5aff49238910eb04096465a3fb420cd3e1c43991.png"],
    ["hound", -11.72, -23.5, -90, 1.1, "/cdn/value.1bd2973cb3100d260ee703f4c73cab4262debab2150579dcd995eb580f51d963.png"]];
  for (const [k, x, z, yaw, w, tex, asp = 1.5] of POSTERS) { const h = w * asp, y = 1.55 - h / 2 + (k === "dandy" ? 0.2 : 0);
    ctx.spawn("l31-poster-" + k, { feetPosition: { x, y, z }, rotation: { yaw }, castShadow: false, primitive: rbox(w + 0.12, h + 0.12, 0.05), material: { color: "#c9ccd4", metalness: 0.85, roughness: 0.25 },
      children: [{ id: "art", feetPosition: { x: 0, y: 0.06, z: -0.03 }, primitive: { kind: "box", width: w, height: h, depth: 0.012 }, material: { texture: tex, color: "#ffffff", roughness: 0.35, emissive: "#ffffff", emissiveIntensity: 0.04 } },
        { id: "glow", feetPosition: { x: 0, y: h + 0.3, z: -0.5 }, light: { kind: "point", color: "#ffe2b0", intensity: 0.6, distance: 3 } }] }); }
}

function djBooth(ctx) {
  const d = ZONES.dj, cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2;
  // Tripo neon DJ stage: draws 2.08 x 0.5 x 3.27 m (long on z), turned and stretched to the 6 x 3.5 riser; a hidden box carries the floor
  ctx.spawn("l31-dj-riser", { feetPosition: { x: cx, y: 0, z: cz }, primitive: rbox(6, 0.5, 3.5), render: false, physics: "static",
    children: [{ id: "m", rotation: { yaw: 90 }, model: "/cdn/value.37fda2c85ed6065a5657dd95525ee642f4c1c6c73f451c47de704eb692c6038e.glb", scale: { x: 1.68, y: 1, z: 1.83 }, receiveShadow: true }] });
  ctx.spawn("l31-dj-front", { feetPosition: { x: cx, y: 0.5, z: d.z0 + 0.2 }, primitive: rbox(5.6, 0.75, 0.25), render: false, physics: "static",
    children: [{ feetPosition: { x: 0, y: 0.48, z: 0.12 }, vector: `<svg viewBox='0 0 300 60' width='2m'><text x='150' y='44' text-anchor='middle' font-family='display' font-size='40' fill='#ff3fa4' filter='drop-shadow(0 0 5 #ff3fa4)'>REQUEST LINE</text></svg>` }] });
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

// the mezzanine (Shelly Nov 12: a second floor): a slab along the west wall at ZONES.mezz.y, glass rail, one stair by the cinema, a skate lounge under it
function mezzanine(ctx) {
  const M = ZONES.mezz, S = ZONES.stair, Y = M.y, mw = M.x1 - M.x0, md = M.z1 - M.z0, mx = (M.x0 + M.x1) / 2;
  ctx.spawn("l31-mz-slab", { feetPosition: { x: mx, y: Y - 0.3, z: 0 }, primitive: box(mw, 0.3, md), material: CARPET, physics: "static", receiveShadow: true, castShadow: false,
    children: [{ id: "under", feetPosition: { x: 0, y: -0.01, z: 0 }, primitive: box(mw - 0.05, 0.01, md - 0.05), material: CEIL, castShadow: false }] });
  ctx.spawn("l31-mz-fascia", { feetPosition: { x: M.x1 - 0.05, y: Y - 0.55, z: 0 }, primitive: rbox(0.14, 0.6, md, 0.03), material: { color: "#1d7b80", roughness: 0.5 }, castShadow: false,
    children: [{ id: "stripe", feetPosition: { x: 0.075, y: 0.22, z: 0 }, primitive: box(0.01, 0.07, md), material: glow("#ff5fae", 1.4), castShadow: false }] });
  // columns: Tripo teal pillars with chrome bands and a pink neon ring (Shelly: nothing blocky), a hidden cylinder carries the body
  const COL = "/cdn/value.b8ef5221f9de05d9cd75dde73a739c2d998a6a22d7bc03964a288707e448d2d5.glb", PANEL = "/cdn/value.dc9a414de6de2b288dee03dc1226eebd45f86fe29f83212739e8747ba8c992e4.glb";
  for (const z of [-26, -10, 6, 22]) ctx.spawn(`l31-mz-col${z}`, { feetPosition: { x: M.x1 - 0.4, y: 0, z }, primitive: { kind: "cylinder", radiusTop: 0.18, radiusBottom: 0.18, height: Y - 0.3, radialSegments: 12 }, render: false, physics: { body: "static", collider: "cylinder" },
    children: [{ id: "art", model: COL, layout: { box: { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: Y - 0.3, z: 0.3 } } }, castShadow: false }] });
  // rail: Tripo brass-and-glass panels with memphis kick plates, tiled along each run; one hidden box is the barrier; a gap where the stair lands
  const rail = (id, x, z0, z1, alongX = false) => { const L = Math.abs(z1 - z0), c = (z0 + z1) / 2, n = Math.max(1, Math.round(L / 2.4)), seg = L / n, kids = [];
    for (let i = 0; i < n; i++) kids.push({ id: "p" + i, feetPosition: { x: 0, y: 0, z: -L / 2 + (i + 0.5) * seg }, model: PANEL, scale: { x: 1, y: 1.17, z: seg / 2.35 }, castShadow: false }); // native 0.17 x 0.9 x 2.35 m, long axis z
    ctx.spawn(`l31-mz-rail-${id}`, { feetPosition: alongX ? { x: c, y: Y, z: x } : { x, y: Y, z: c }, rotation: { yaw: alongX ? 90 : 0 }, primitive: box(0.06, 1.05, L), render: false, physics: "static", castShadow: false, children: kids }); };
  rail("a", M.x1 - 0.1, M.z0, S.landZ); rail("b", M.x1 - 0.1, S.zTop, M.z1);
  // the stair: carpeted treads with chrome nosing over one smooth ramp the body walks
  const run = Math.abs(S.zTop - S.zBottom), n = 16, rise = Y / n, tread = run / n, sx = (S.x0 + S.x1) / 2, sw = S.x1 - S.x0, dir = Math.sign(S.zTop - S.zBottom);
  const steps = [];
  for (let i = 0; i < n; i++) steps.push({ id: "t" + i, feetPosition: { x: 0, y: i * rise, z: dir * (i + 0.5) * tread }, primitive: box(sw, rise, tread + 0.01), material: CARPET, castShadow: false },
    { id: "n" + i, feetPosition: { x: 0, y: (i + 1) * rise - 0.03, z: dir * ((i + 1) * tread - 0.02) }, primitive: rbox(sw, 0.03, 0.05, 0.012), material: { color: "#d7dbe2", metalness: 0.9, roughness: 0.25 }, castShadow: false });
  ctx.spawn("l31-mz-stair", { feetPosition: { x: sx, y: 0, z: S.zBottom }, children: steps });
  const len = Math.hypot(run, Y), ang = Math.atan2(Y, run) * 180 / Math.PI;
  ctx.spawn("l31-mz-ramp", { feetPosition: { x: sx, y: Y / 2 - 0.06, z: (S.zBottom + S.zTop) / 2 }, pivot: "center", rotation: { pitch: ang * -dir, yaw: 0 }, primitive: box(sw, 0.1, len), render: false, physics: "static" });
  ctx.spawn("l31-mz-landing", { feetPosition: { x: sx, y: Y - 0.3, z: (S.zTop + S.landZ) / 2 }, primitive: box(sw, 0.3, Math.abs(S.landZ - S.zTop)), material: CARPET, physics: "static", castShadow: false });
  // stair sides: teal stringer and rail on the open east side, landing rail on the north
  const sl = Math.hypot(run, Y);
  ctx.spawn("l31-mz-stringer", { feetPosition: { x: S.x1 + 0.05, y: Y / 2 + 0.1, z: (S.zBottom + S.zTop) / 2 }, pivot: "center", rotation: { pitch: ang * -dir }, primitive: rbox(0.1, 0.45, sl, 0.03), material: { color: "#1d7b80", roughness: 0.5 }, physics: "static", castShadow: false,
    children: Array.from({ length: Math.max(1, Math.round(sl / 2.3)) }, (_, i) => { const seg = sl / Math.max(1, Math.round(sl / 2.3)); // Tripo brass rail panels riding the stringer's slope
      return { id: "p" + i, feetPosition: { x: 0, y: 0.225, z: -sl / 2 + (i + 0.5) * seg }, model: PANEL, scale: { x: 1, y: 1.17, z: seg / 2.35 }, castShadow: false }; }) });
  rail("land-e", S.x1 + 0.05, S.zTop, S.landZ); rail("land-n", S.landZ - 0.05, S.x0 - 0.1, S.x1 + 0.1, true);
  // upstairs lighting along the walkway; downlights under the slab
  for (const z of [-24, -15, 15, 24]) ctx.spawn(`l31-mz-up${z}`, { feetPosition: { x: -31, y: H - 0.1, z }, ...P({ kind: "can" }), castShadow: false, children: [{ feetPosition: { x: 0, y: -0.35, z: 0 }, light: { kind: "point", color: "#ffe1bd", intensity: 3.5, distance: 9 } }] });
  for (const [x, z] of [[-34, -22], [-34, -6], [-34, 6], [-34, 20], [-28, -22], [-28, 0], [-28, 20]]) ctx.spawn(`l31-mz-dl${x}${z}`, { feetPosition: { x, y: Y - 0.33, z }, primitive: { kind: "cylinder", radiusTop: 0.2, radiusBottom: 0.2, height: 0.02, radialSegments: 20 }, material: glow("#ffe7c4", 1.2), castShadow: false,
    children: [{ feetPosition: { x: 0, y: -0.3, z: 0 }, light: { kind: "point", color: "#ffdcb0", intensity: 2.6, distance: 8 } }] });
  // the lounge under the slab, where Dottie's used to stand: lacing benches back to back, a rug, a sign pointing upstairs
  ctx.spawn("l31-mz-rug", { feetPosition: { x: -34.5, y: 0.012, z: 0 }, primitive: box(9, 0.012, 16), material: { texture: "cdn/texture-black-arcade-carpet-neon-confetti-squiggles.png", wrap: "repeat", repeat: [0.5, 0.5], color: "#b8b0c8", roughness: 0.95 }, castShadow: false });
  for (const [i, [x, z, yaw]] of [[-37, -5, 90], [-37, 5, 90], [-32, -5, -90], [-32, 5, -90]].entries()) ctx.spawn(`l31-mz-bench${i}`, { feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: TRIPO.bench }, layout: { box: { min: { x: -1.6, y: 0, z: -0.3 }, max: { x: 1.6, y: 0.5, z: 0.3 } } }, physics: "static", tags: ["seat"], state: { name: "Lacing bench" } });
  ctx.spawn("l31-mz-sign", { feetPosition: { x: -24.85, y: 2.6, z: -10.6 }, rotation: { yaw: -90 }, castShadow: false,
    vector: `<svg viewBox='0 0 260 70' width='1.6m'><rect width='260' height='70' rx='10' fill='#14070c' stroke='#ff5fae' stroke-width='3'/><text x='112' y='45' text-anchor='middle' font-family='display' font-size='26' fill='#ffd23a' filter='drop-shadow(0 0 3 #ff8a1e)'>DOTTIE'S UP</text><path d='M214 50 L232 22 L250 50 Z' fill='#5ff0ff' filter='drop-shadow(0 0 3 #5ff0ff)'/></svg>` });
}

export function tick(ctx) {
  const s = ctx.place.state;
  if (s.v31 === V) return;
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l31-") && !id.includes("/")) ctx.destroy(id);
  shell(ctx); rink(ctx); starburst(ctx); doors(ctx); cinema(ctx); djBooth(ctx); party(ctx); mezzanine(ctx);
  layParts(ctx);
  s.v31 = V;
}
