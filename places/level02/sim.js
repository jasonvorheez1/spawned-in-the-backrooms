// Level 0.2 "Remodeled Mess": the Remodeling Co.'s clean copy of Level 0. Walk in past the door room and it falls apart,
// column by column from the far east wall back toward the door, dropping everything into the unfinished house below.
// It stops at the door room. A Reality Freshener set down on the clean floor holds the collapse where it is.
// Empty for 15 s, the whole thing is put back as if nothing happened. Puzzle: the freight lift (east) is stuck up top
// with a freshener on it; three paint cans (14 kg) on the counterweight pan bring it down. Cap'n stands by the stairs.
import { animate } from "builtin/tween";
import { bodyModel, seatCat, critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook, refitLook, NL_V } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { S, NX, NZ, X0, Z0, BASE, CEIL, LIFT, BIN, xOf } from "../../scripts/lib/level02.js";
import { FRESH_BODY, setRemodStep } from "../../scripts/lib/remodel-quest.js";
export const cadence = "250ms";
const V = 4, STEP_MS = 2600;
const W = 2 * S * 0 + NX * S, D = NZ * S; // 32 x 20 m
const CARPET = { color: "oklch(0.42 0.12 25)", roughness: 0.95, texture: "cdn/texture-dry-red-office-carpet-low-pile.png", wrap: "repeat", repeat: [0.5, 0.5] };
const PAINT = { color: "oklch(0.95 0.006 90)", roughness: 0.85 };
const TRIM = { color: "oklch(0.42 0.1 28)", roughness: 0.6 };
const PLY = { color: "oklch(0.72 0.07 70)", roughness: 0.9, texture: "cdn/texture-osb-plywood-subfloor-sheet.png", wrap: "repeat", repeat: [0.4, 0.4] };
const STUD = { color: "oklch(0.74 0.08 72)", roughness: 0.85 };
const TILE = { color: "oklch(0.96 0.004 90)", roughness: 0.9, texture: "cdn/texture-acoustic-drop-ceiling-tile-grid.png", wrap: "repeat", repeat: [0.5, 0.5] };
const PORC = { color: "oklch(0.97 0.003 240)", roughness: 0.25 };
const DUST = `fx
pop dust burst=40 on=box(2,0.5,9) life=1.6..3 v=sdir()*(.6..1.6)+up(.3..0.9) size=.5..1.1 acc=buoy(.2)+drag(1.1) col=<.86,.84,.8> a=0>.45:.4>.7:.25>0 sz=$size*(.6>2.2) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop chips burst=30 on=box(2,0.3,9) life=.8..1.4 v=sdir()*(1..2.5)+up(1..2) size=.03..0.07 acc=grav() col=<.92,.9,.86> a=1 sz=$size floor=stick r=sprite(soft-disc,alpha)`;
const CRASH = "/cdn/moodboard-realistic-gritty/sfx-drywall-and-ceiling-collapse-crash-rumble.mp3";
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
// the inner partitions, per column: [z centre, length] of white wall on the column's west edge (gaps are doorways)
const PART = { 1: [[-6, 8], [6, 8]], 2: [[-8, 4], [3, 6]], 3: [[-5, 10], [7.5, 5]], 4: [[0, 8]], 5: [[-7, 6], [6, 8]], 6: [[-2, 6], [8, 4]], 7: [[-7.5, 5], [5, 2]] };
function sp(ctx, id, spec) { if (!(id in ctx.place.objects)) ctx.spawn(id, spec); }
function layShell(ctx) {
  const o = ctx.place.objects;
  for (const id of Object.keys(o)) if (id.startsWith("l02-")) ctx.destroy(id);
  const cx = X0 + W / 2, cz = Z0 + D / 2;
  sp(ctx, "l02-base", { feetPosition: { x: cx, y: BASE - 0.3, z: cz }, primitive: box(W, 0.3, D), material: PLY, physics: "static" });
  sp(ctx, "l02-door-room", { feetPosition: { x: xOf(0), y: -0.2, z: cz }, primitive: box(S, 0.2, D), material: CARPET, physics: "static" });
  sp(ctx, "l02-ceil", { feetPosition: { x: cx, y: CEIL, z: cz }, primitive: box(W, 0.1, D), material: TILE, physics: "static" });
  for (const [id, x, z, w, d] of [["n", cx, Z0 - 0.1, W + 0.4, 0.2], ["s", cx, Z0 + D + 0.1, W + 0.4, 0.2], ["w", X0 - 0.1, cz, 0.2, D], ["e", X0 + W + 0.1, cz, 0.2, D]]) {
    sp(ctx, `l02-wall-${id}`, { feetPosition: { x, y: 0, z }, primitive: box(w, CEIL, d), material: PAINT, physics: "static" });
    sp(ctx, `l02-studs-${id}`, { feetPosition: { x, y: BASE, z }, primitive: box(w, -BASE, d), material: STUD, physics: "static" });
    sp(ctx, `l02-trim-${id}`, { feetPosition: { x, y: 0, z }, primitive: box(w + 0.02, 0.12, d + 0.02), material: TRIM });
  }
  // exposed studs along the unfinished walls, every 0.6 m
  for (let i = 0; i < 52; i++) { const x = X0 + 0.3 + i * 0.6; sp(ctx, `l02-stud-n${i}`, { feetPosition: { x, y: BASE, z: Z0 + 0.1 }, primitive: box(0.05, -BASE, 0.1), material: STUD }); }
  // the door home (west) and where you arrive
  sp(ctx, "l02-door", { feetPosition: { x: X0 + 0.05, y: 0, z: 0 }, rotation: { yaw: 90 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "wood", w: 1.0, h: 2.1, part: "set", seed: 5 } } });
  sp(ctx, "l02-back", { tags: ["door"], feetPosition: { x: X0 + 0.2, y: 0, z: 0 }, physics: { body: "static", trigger: true }, primitive: box(0.4, 2.2, 0.9), visible: false, behavior: "scripts/level-door.js", state: { to: "main" } });
  sp(ctx, "l02-from-l0", { feetPosition: { x: X0 + 1.4, y: 0.05, z: 0 }, rotation: { yaw: -90 } });
  sp(ctx, "l02-exit-sign", { feetPosition: { x: X0 + 0.12, y: 2.45, z: 0 }, rotation: { yaw: 90 }, vector: "<svg viewBox='0 0 200 60' width='0.6m'><rect width='200' height='60' rx='6' fill='#a1201a'/><text x='100' y='42' text-anchor='middle' font-family='sans-serif' font-size='36' font-weight='bold' fill='#fff'>EXIT</text></svg>" });
  sp(ctx, "l02-exit-glow", { feetPosition: { x: X0 + 0.4, y: 2.4, z: 0 }, light: { kind: "point", color: "oklch(0.7 0.18 25)", intensity: 0.4, distance: 3 } });
  // stairs back up: twelve plywood steps along the north wall, from the basement to the door room's edge
  for (let i = 0; i < 12; i++) { const top = BASE + (i + 1) * (-BASE / 12); sp(ctx, `l02-step${i}`, { feetPosition: { x: -6.25 - i * 0.5, y: BASE, z: Z0 + 1.1 }, primitive: box(0.5, top - BASE, 2), material: PLY, physics: "static" }); }
  // the troffers and their light, one pair per column; work lamps in the basement
  for (let c = 0; c < NX; c++) {
    for (const z of [-5, 5]) {
      sp(ctx, `l02-trof-${c}-${z}`, { feetPosition: { x: xOf(c), y: CEIL - 0.04, z }, primitive: box(1.2, 0.04, 0.6), material: { color: "oklch(0.99 0.01 95)", emissive: "oklch(0.98 0.02 95)", emissiveIntensity: 2.4 } });
    }
    sp(ctx, `l02-light-${c}`, { feetPosition: { x: xOf(c), y: CEIL - 0.3, z: 0 }, light: { kind: "point", color: "oklch(0.98 0.02 95)", intensity: 1.6, distance: 14 } });
  }
  for (const [i, x, z] of [[0, -4, 6], [1, 4, -6], [2, 10, 6]]) {
    sp(ctx, `l02-worklamp${i}`, { feetPosition: { x, y: BASE, z }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.25, height: 1.6 }, material: { color: "oklch(0.3 0 0)", metalness: 0.6 },
      children: [{ feetPosition: { x: 0, y: 1.6, z: 0 }, primitive: box(0.3, 0.25, 0.15), material: { color: "oklch(0.9 0.15 85)", emissive: "oklch(0.9 0.15 85)", emissiveIntensity: 2 } }, { feetPosition: { x: 0, y: 1.8, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.1 75)", intensity: 1.4, distance: 10 } }] });
  }
  // the unfinished house: sawhorses, drywall, a ladder, the crew's clipboard and Toaster
  sp(ctx, "l02-drywall", { feetPosition: { x: 2, y: BASE, z: 7 }, rotation: { yaw: 15 }, model: { id: "/cdn/value.dd3c11a087dce509414d840925e8477ce72ec546947a8628f600be9ebd25f27c.glb" }, layout: { box: { min: { x: -0.7, y: 0, z: -0.35 }, max: { x: 0.7, y: 0.5, z: 0.35 } } }, physics: "static" });
  sp(ctx, "l02-ladder", { feetPosition: { x: 7, y: BASE, z: 8.5 }, rotation: { yaw: -30 }, model: { id: "/cdn/value.e3a9e57fa4cd0ebbfe56c6389249e5bf1d94d625c3faef7ff16a17500bca3534.glb" }, layout: { box: { min: { x: -0.25, y: 0, z: -0.3 }, max: { x: 0.25, y: 1.9, z: 0.3 } } }, physics: "static" });
  for (const [i, x, z, yaw] of [[0, -1, 2, 10], [1, 6, -4, 80]]) sp(ctx, `l02-sawhorse${i}`, { feetPosition: { x, y: BASE, z }, rotation: { yaw }, physics: "static", primitive: box(1.2, 0.08, 0.12), material: STUD,
    children: [[-0.5, 0.35], [0.5, 0.35], [-0.5, -0.35], [0.5, -0.35]].map(([a, b]) => ({ feetPosition: { x: a, y: -0.75, z: b * 0.4 }, primitive: box(0.06, 0.75, 0.06), material: STUD })).map((c) => ({ ...c, feetPosition: { ...c.feetPosition, y: -0.75 } })) });
  sp(ctx, "l02-clipboard", { tags: ["usable"], feetPosition: { x: -1, y: BASE + 0.8, z: 2 }, rotation: { yaw: 20 }, primitive: box(0.25, 0.02, 0.33), material: { color: "oklch(0.55 0.08 60)" }, behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Clipboard", verb: "Read", info: "Backrooms Remodelling Company", text: "Target: Level 0. Sector A880-1. Class-A Remodeling Job. Task Force 102-CX. \"Do good this time.\" · Major Took" } });
  sp(ctx, "l02-toaster", { tags: ["usable"], feetPosition: { x: 6.2, y: BASE + 0.8, z: -4 }, rotation: { yaw: 40 }, primitive: box(0.28, 0.18, 0.16), material: { color: "oklch(0.8 0.01 240)", metalness: 0.8, roughness: 0.25 }, behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Toaster", verb: "Look", info: "Unplugged. Part of the crew.", text: "An unplugged toaster. The crew calls it Toaster. It does not do anything. It might be listening." } });
  // the freight lift: a cage open only at the bottom, its deck stuck up at the clean floor, a freshener on it
  const { x: lx, z: lz } = LIFT;
  for (const [id, x, z, w, d, y0] of [["n", lx, lz - 1.6, 3.2, 0.1, BASE], ["s", lx, lz + 1.6, 3.2, 0.1, BASE], ["w", lx - 1.6, lz, 0.1, 3.2, -1.2]])
    sp(ctx, `l02-shaft-${id}`, { feetPosition: { x, y: y0, z }, primitive: box(w, CEIL - y0, d), material: { color: "oklch(0.45 0.02 240)", metalness: 0.6, roughness: 0.5 }, physics: "static" });
  sp(ctx, "l02-shaft-sign", { feetPosition: { x: lx - 1.66, y: -1.0, z: lz }, rotation: { yaw: 90 }, vector: "<svg viewBox='0 0 300 80' width='1.2m'><rect width='300' height='80' fill='#f1c40f'/><text x='150' y='34' text-anchor='middle' font-family='sans-serif' font-size='26' font-weight='bold' fill='#111'>FREIGHT LIFT</text><text x='150' y='66' text-anchor='middle' font-family='sans-serif' font-size='20' fill='#111'>COUNTERWEIGHT PAN · 42 KG</text></svg>" });
  sp(ctx, "l02-pan", { feetPosition: { x: BIN.x, y: BASE, z: BIN.z }, primitive: box(1.4, 0.08, 1.4), material: { color: "oklch(0.5 0.02 240)", metalness: 0.7, roughness: 0.4 }, physics: "static", state: { kg: 0 },
    children: [[0, -0.7, 1.4, 0.1], [0, 0.7, 1.4, 0.1], [-0.7, 0, 0.1, 1.4], [0.7, 0, 0.1, 1.4]].map(([x, z, w, d]) => ({ feetPosition: { x, y: 0.08, z }, primitive: box(w, 0.18, d), material: { color: "oklch(0.5 0.02 240)", metalness: 0.7 }, physics: "static" })) });
  sp(ctx, "l02-pan-read", { feetPosition: { x: BIN.x, y: BASE + 1.3, z: BIN.z - 0.75 }, state: { kg: 0 }, vector: "<svg viewBox='0 0 220 70' width='0.9m' billboard='yaw'><rect width='220' height='70' rx='6' fill='#1b1b1b'/><text x='110' y='46' text-anchor='middle' font-family='display' font-size='34' fill='#f1c40f'>{{ state.kg }} / 42 KG</text></svg>" });
  sp(ctx, "l02-cable", { feetPosition: { x: (lx + BIN.x) / 2 - 0.4, y: BASE + 1.5, z: BIN.z }, primitive: box(0.03, 0.03, 0.03), material: { color: "oklch(0.2 0 0)" } });
  layLift(ctx, false);
  layCans(ctx);
  // Cap'n, by the stairs, clipboard in hand: grey trench coat, white apron, brown wool trousers, rain boots (wiki look)
  sp(ctx, "l02-capn", {
    tags: ["npc", "remodel", "essential"], feetPosition: { x: -4, y: BASE + 0.05, z: -6 }, rotation: { yaw: 120 }, physics: "character",
    ...critterSpec(CAPN_LOOK),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "Cap'n · Remodeling Co.", role: "wanderer", voice: "l02-capn#m", faction: "remodel", factionName: "Backrooms Remodeling Co.", home: { x: -4, z: -6 }, line: "Sorry for the inconvenience. We are improving things.", ...npcState(ctx, "wanderer", 100) },
  });
}
// Cap'n wears the new cat body (same refit as Rico in places/bonus/sim.js): dark fur, the crew uniform colours
const CAPN = { species: "fox", sex: "m", fur: "#6e6660", topw: "jacket", top: "#9fb0bf", botw: "pants", bottom: "#6b4a2e", shoes: "boots", hat: "beret", hatc: "#4a4f57", hair: "none" };
const CAPN_LOOK = { ...refitLook("l02-capn", { ...npcLook("l02-capn", CAPN, "wanderer", 2), role: "wanderer", faction: "wanderer" }), ...CAPN, nl: NL_V };
function dressCapn(ctx) {
  const r = ctx.place.objects["l02-capn"]; if (!r) return;
  for (const k of Object.keys(ctx.place.objects)) if (k.startsWith("l02-capn/")) ctx.destroy(k); // the spawn's old build parts, as Rico's refit does
  r.state.wear = CAPN_LOOK; delete r.state.headBody;
  r.model = bodyModel(CAPN_LOOK); seatCat(ctx, r, CAPN_LOOK);
}
function layLift(ctx, down) {
  const y = down ? BASE - 0.2 : -0.2;
  for (const id of ["l02-lift", "l02-fresh-lift"]) if (id in ctx.place.objects) ctx.destroy(id);
  ctx.spawn("l02-lift", { feetPosition: { x: LIFT.x, y, z: LIFT.z }, primitive: box(3, 0.2, 3), material: { color: "oklch(0.4 0.02 240)", metalness: 0.7, roughness: 0.45, texture: "cdn/texture-diamond-plate-steel-floor.png", wrap: "repeat", repeat: [1, 1] }, physics: "kinematic" });
  ctx.spawn("l02-fresh-lift", { tags: ["usable"], feetPosition: { x: LIFT.x + 0.3, y: y + 0.2, z: LIFT.z }, ...FRESH_BODY, behavior: "scripts/l02-use.js", state: { kind: "fresh", slot: "lift", name: "Reality Freshener", verb: "Take", info: "Remodeling Co. property. Cold to the touch." } });
}
const CANS = [[-2, 8], [3, -8], [8, 7.5], [9.5, -7], [-6, 5]];
function layCans(ctx) {
  CANS.forEach(([x, z], i) => { const id = `l02-can${i}`; if (id in ctx.place.objects) ctx.destroy(id);
    ctx.spawn(id, { tags: ["l02can", "grabbable"], feetPosition: { x, y: BASE + 0.02, z }, primitive: { kind: "cylinder", radiusTop: 0.17, radiusBottom: 0.17, height: 0.32, radialSegments: 18 },
      material: { color: "oklch(0.93 0.01 90)", roughness: 0.4, metalness: 0.4 }, physics: { body: "dynamic", collider: "cylinder", mass: 14, friction: 0.8 }, state: { name: "Paint can (14 kg)" },
      children: [{ feetPosition: { x: 0, y: 0.08, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.172, radiusBottom: 0.172, height: 0.14, radialSegments: 18 }, material: { color: "oklch(0.45 0.13 25)" } }] }); });
}
// what falls away when a column drops; laid again on a reset
function layColumn(ctx, c) {
  const x = xOf(c), tag = `l02c${c}`;
  ctx.spawn(`l02-fl-${c}`, { tags: [tag], feetPosition: { x, y: -0.2, z: Z0 + D / 2 }, primitive: box(S, 0.2, D), material: CARPET, physics: "static" });
  for (const [i, [z, len]] of (PART[c] ?? []).entries()) {
    ctx.spawn(`l02-pw-${c}-${i}`, { tags: [tag], feetPosition: { x: x - S / 2, y: 0, z }, primitive: box(0.14, CEIL, len), material: PAINT, physics: "static",
      children: [{ feetPosition: { x: 0, y: 0, z: 0 }, primitive: box(0.16, 0.12, len), material: TRIM }, { feetPosition: { x: 0.08, y: 0.3, z: 0.6 }, primitive: box(0.02, 0.12, 0.08), material: { color: "oklch(0.97 0 0)" } }] });
  }
  if (c === 3) { // the occasional bathroom: tiled stall, sink, mirror, and a freshener tucked behind the mirror
    ctx.spawn("l02-bath", { tags: [tag], feetPosition: { x: x + 0.6, y: 0, z: Z0 + 2.5 }, primitive: box(0.12, CEIL, 0.01), material: PAINT, physics: "static",
      children: [
        { feetPosition: { x: 1.2, y: 0.7, z: -2.35 }, primitive: box(0.9, 0.12, 0.5), material: PORC, physics: "static" },
        { feetPosition: { x: 1.2, y: 0, z: -2.35 }, primitive: box(0.12, 0.7, 0.12), material: PORC },
        { feetPosition: { x: 1.2, y: 1.15, z: -2.48 }, primitive: box(0.7, 0.8, 0.03), material: { color: "oklch(0.85 0.01 230)", metalness: 1, roughness: 0.05 } },
        { feetPosition: { x: -0.0, y: 0, z: 2.3 }, primitive: box(0.12, CEIL, 0.6), material: PAINT, physics: "static" },
        { feetPosition: { x: 2.6, y: 0, z: -2.1 }, primitive: box(0.5, 0.42, 0.7), material: PORC, physics: "static" },
      ] });
    ctx.spawn("l02-fresh-sink", { tags: ["usable", tag], feetPosition: { x: x + 1.65, y: 0.82, z: Z0 + 0.3 }, ...FRESH_BODY, behavior: "scripts/l02-use.js", state: { kind: "fresh", slot: "sink", name: "Reality Freshener", verb: "Take", info: "Behind the bathroom mirror." } });
  }
}
function layClean(ctx) { for (let c = 1; c < NX; c++) { for (const r of ctx.query({ tags: [`l02c${c}`] })) ctx.destroy(r.id); layColumn(ctx, c); } }
function drop(ctx, c) {
  const x = xOf(c), tag = `l02c${c}`;
  for (const r of ctx.query({ tags: [tag] })) if (r.id !== "l02-fresh-sink") ctx.destroy(r.id);
  if (c === 3 && "l02-fresh-sink" in ctx.place.objects) animate(ctx, ctx.place.objects["l02-fresh-sink"], { "feetPosition.y": BASE + 0.02 }, { duration: 0.7, easing: "easeInQuad" });
  for (let i = 0; i < 7; i++) ctx.spawn({ tags: ["l02debris"], lifetime: 40, feetPosition: { x: x + (ctx.random() - 0.5) * 3, y: 2.4, z: Z0 + 1 + ctx.random() * (D - 2) }, rotation: { yaw: ctx.random() * 360, pitch: ctx.random() * 40 },
    primitive: i % 2 ? box(0.6, 0.04, 1.2) : box(0.9 + ctx.random(), 0.08, 0.5), material: i % 2 ? TILE : PAINT, physics: { body: "dynamic", collider: "box", density: 300 } });
  const at = { x, y: 0.5, z: Z0 + D / 2 };
  ctx.emit("fx", { position: at, script: DUST });
  ctx.emit("playSound", { clip: CRASH, position: at, volume: 1, refDistance: 6, maxDistance: 40 });
  for (const p of ctx.place.players) {
    const d = Math.abs(p.feetPosition.x - x);
    if (d < 14) ctx.emit("screenShake", { intensity: Math.max(0.15, 0.6 - d * 0.04), duration: 0.5 }, { audience: { player: p.id } });
    if (d < 2 && p.feetPosition.y > -1 && p.state) { p.state.hp = (p.state.hp ?? 100) - 6; ctx.emit("damageNumber", { position: { ...p.feetPosition, y: p.feetPosition.y + 1.8 }, value: 6, color: "#e8d9b0" }); }
  }
}
// a freshener set down on the clean floor of this column holds it (and everything behind it)
const held = (ctx, c) => ctx.query({ tags: ["freshener"] }).some((f) => f.feetPosition.y > -1 && Math.abs(f.feetPosition.x - xOf(c)) <= S / 2);
export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now(), ps = ctx.place.players;
  if (s.v !== V || !("l02-base" in ctx.place.objects)) { s.v = V; layShell(ctx); dressCapn(ctx); layClean(ctx); s.phase = "clean"; s.liftDown = false; return; }
  if (!ps.length) { s.emptyAt ??= now; if (s.phase !== "clean" && now - s.emptyAt > 15000) { layClean(ctx); layLift(ctx, false); layCans(ctx); for (const r of ctx.query({ tags: ["l02debris"] })) ctx.destroy(r.id); s.phase = "clean"; s.liftDown = false; } return; }
  s.emptyAt = null;
  for (const p of ps) if (p.state?.remodQ === 1) setRemodStep(ctx, p, 2, "Fresh Paint · Find 3 Reality Fresheners: the bathroom, the stuck freight lift, and Cap'n");
  if (s.phase === "clean" && ps.some((p) => p.feetPosition.x > X0 + S + 1 && p.feetPosition.y > -1)) { s.phase = "falling"; s.col = NX - 1; s.nextAt = now + 1800; ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-deep-structural-wood-creak-groan.mp3", position: { x: xOf(NX - 1), y: 2, z: 0 }, volume: 0.9, maxDistance: 45 }); }
  if (s.phase === "falling" && now >= s.nextAt) {
    if (held(ctx, s.col)) { s.phase = "held"; for (const p of ps) if (p.state) p.state.notice = { text: "The freshener holds. The rest of the floor stays put.", at: now }; }
    else { drop(ctx, s.col); s.col -= 1; s.nextAt = now + STEP_MS; if (s.col < 1) s.phase = "fallen"; }
  }
  // the lift puzzle: cans on the pan
  const kg = ctx.query({ tags: ["l02can"], center: { x: BIN.x, y: BASE, z: BIN.z }, radius: 0.95 }).filter((r) => Math.abs(r.feetPosition.x - BIN.x) < 0.7 && Math.abs(r.feetPosition.z - BIN.z) < 0.7 && r.feetPosition.y < BASE + 1).length * 14;
  const rd = ctx.place.objects["l02-pan-read"]; if (rd && rd.state.kg !== kg) rd.state.kg = kg;
  if (!s.liftDown && kg >= LIFT.kg) {
    s.liftDown = true;
    for (const id of ["l02-lift", "l02-fresh-lift"]) { const o = ctx.place.objects[id]; if (o) animate(ctx, o, { "feetPosition.y": `-=${-BASE}` }, { duration: 4, easing: "easeInOutSine" }); }
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-freight-elevator-chain-rattle-descending-clunk.mp3", position: { x: LIFT.x, y: BASE + 1, z: LIFT.z }, volume: 1, maxDistance: 30 });
  }
}
