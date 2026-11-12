// Level 13 "The Boiling Frogs": lays the apartment complex once (shell here; furniture, residents and creatures in their own
// files), then keeps the lethargy: the longer you stay inside one flat, the heavier you get (player.state.leth13, 0..1).
import { H, HALL, T, UNIT, HALLS, APTS, SPAWN, EXIT0, aptAt } from "../../scripts/lib/level13.js";
import { layFurnish } from "../../scripts/lib/level13-furnish.js";
import { layFoes } from "../../scripts/lib/level13-foes.js";
import { layPeople } from "../../scripts/lib/level13-people.js";
import { layDress } from "../../scripts/lib/level13-dress.js";
import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
export const cadence = "1s";
const V = 1;
export const LETH = { startS: 45, fullS: 180, coolS: 20 }; // Savi's pick: lethargy starts after 45 s in one flat, full at 3 min, gone 20 s after you leave
const WALL = { texture: "cdn/texture-dull-beige-painted-plaster-apartment-hallway-wall.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.86 0.035 88)", roughness: 0.9 };
const APTWALL = { texture: "cdn/texture-flat-white-painted-plaster-wall-faint-roller-marks.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.93 0.012 90)", roughness: 0.92 };
const HALLFLOOR = { texture: "cdn/texture-worn-brown-laminate-wood-hallway-floor.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.6 0.05 65)", roughness: 0.55 };
const CARPET = { texture: "cdn/texture-flat-grey-beige-apartment-carpet-low-pile.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.68 0.025 80)", roughness: 0.97 };
const LINO = { texture: "cdn/texture-cream-speckled-linoleum-kitchen-floor.png", wrap: "repeat", repeat: [0.8, 0.8], color: "oklch(0.86 0.025 90)", roughness: 0.5 };
const CEIL = { texture: "cdn/texture-white-popcorn-stipple-apartment-ceiling.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.9 0.01 90)", roughness: 1 };
const TRIM = { color: "oklch(0.72 0.04 75)", roughness: 0.7 };
const DOORMAT = { texture: "cdn/texture-brown-laminate-flat-apartment-door-veneer.png", color: "oklch(0.55 0.06 60)", roughness: 0.6 };
const TROFFER = "/cdn/value.58b51cca7f40157addada9eb9837b9beb764f7aed2c56d77270ea9dbd66bcf1b.glb";
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
let n = 0; // only counts wall ids inside one lay()
const STAY = new Map(); // player id -> { apt, s }: the sim's own working memory of who has sat where, how long
// a wall along x (at z) or along z (at x), from a to b, with doorways cut at `gaps` (centres); a lintel closes each doorway's top
function wall(ctx, along, at, a, b, gaps = [], mat = WALL) {
  const cuts = gaps.slice().sort((p, q) => p - q), segs = []; let from = a;
  for (const g of cuts) { segs.push([from, g - UNIT.doorW / 2, 0, H]); segs.push([g - UNIT.doorW / 2, g + UNIT.doorW / 2, UNIT.doorH, H - UNIT.doorH]); from = g + UNIT.doorW / 2; }
  segs.push([from, b, 0, H]);
  for (const [p, q, y, h] of segs) { const len = q - p; if (len < 0.02) continue; const mid = (p + q) / 2;
    ctx.spawn(`l13-w${n++}`, { feetPosition: along === "x" ? { x: mid, y, z: at } : { x: at, y, z: mid }, primitive: along === "x" ? box(len, h, T) : box(T, h, len), material: mat, physics: "static", castShadow: false }); }
}
function lay(ctx) {
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l13-") && !id.includes("/")) ctx.destroy(id);
  n = 0;
  // one slab under everything, one ceiling over it
  ctx.spawn("l13-floor", { feetPosition: { x: 0, y: -0.3, z: 5 }, primitive: box(90, 0.3, 36), material: HALLFLOOR, physics: "static", receiveShadow: true, castShadow: false });
  ctx.spawn("l13-ceil", { feetPosition: { x: 0, y: H, z: 5 }, primitive: box(90, 0.2, 36), material: CEIL, physics: "static", castShadow: false });
  const A = HALLS.A, B = HALLS.B, doors = (hall, s) => APTS.filter((a) => a.hall === hall && a.s === s && a.open).map((a) => a.door.x);
  // hall fronts (the flats' doorways cut through), back walls, end caps and the connector
  wall(ctx, "x", -HALL, A.x0, A.x1, doors("A", -1)); wall(ctx, "x", HALL, A.x0, -HALL, doors("A", 1));
  wall(ctx, "x", B.z - HALL, HALL, B.x1, doors("B", -1)); wall(ctx, "x", B.z + HALL, B.x0, B.x1, doors("B", 1));
  wall(ctx, "z", A.x0, -HALL, HALL); wall(ctx, "z", HALL, -HALL, B.z - HALL); wall(ctx, "z", -HALL, HALL, B.z + HALL); wall(ctx, "z", B.x1, B.z - HALL, B.z + HALL);
  for (const [hall, s] of [["A", -1], ["A", 1], ["B", -1], ["B", 1]]) {
    const h = HALLS[hall], zf = h.z + s * HALL, zb = zf + s * (UNIT.main + UNIT.back), z0 = Math.min(zf, zb), z1 = Math.max(zf, zb);
    wall(ctx, "x", zb, h.ux, h.ux + 40, [], APTWALL);
    for (let k = 0; k <= 5; k++) wall(ctx, "z", h.ux + k * UNIT.w, z0, z1, [], APTWALL);
  }
  for (const a of APTS) {
    const hx = a.door.x, face = a.zf - a.s * (T / 2 + 0.012); // the hall face of the front wall
    // the number by every door, and a closed door on the shut ones
    ctx.spawn(`l13-num-${a.id}`, { feetPosition: { x: hx + 0.75, y: 1.55, z: face }, rotation: { yaw: a.s < 0 ? 180 : 0 }, castShadow: false,
      vector: `<svg viewBox='0 0 80 40' width='0.2m'><rect width='80' height='40' rx='4' fill='#3a3128'/><text x='40' y='29' text-anchor='middle' font-family='sans-serif' font-size='24' fill='#d8c59a'>${a.num}</text></svg>` });
    if (!a.open) { ctx.spawn(`l13-shut-${a.id}`, { feetPosition: { x: hx, y: 0, z: face + a.s * 0.02 }, primitive: box(UNIT.doorW, UNIT.doorH, 0.045), material: DOORMAT, castShadow: false, state: { name: `Flat ${a.num}`, info: "Locked from inside. A television is on." },
      children: [{ feetPosition: { x: 0.4, y: 1, z: -a.s * 0.04 }, primitive: { kind: "sphere", radius: 0.03 }, material: { color: "oklch(0.7 0.08 85)", metalness: 0.9, roughness: 0.35 } },
        { feetPosition: { x: 0, y: UNIT.doorH, z: 0 }, primitive: box(UNIT.doorW + 0.16, 0.08, 0.07), material: TRIM }, { feetPosition: { x: -UNIT.doorW / 2 - 0.04, y: 0, z: 0 }, primitive: box(0.08, UNIT.doorH, 0.07), material: TRIM }, { feetPosition: { x: UNIT.doorW / 2 + 0.04, y: 0, z: 0 }, primitive: box(0.08, UNIT.doorH, 0.07), material: TRIM }] }); continue; }
    // an open flat: its inner walls, floors, a door left ajar, and its two lamps
    wall(ctx, "x", a.zm, a.x0, a.x1, [a.x0 + UNIT.bedDoorX, a.x0 + UNIT.bathDoorX], APTWALL);
    wall(ctx, "z", a.x0 + UNIT.bedW, Math.min(a.zm, a.zb), Math.max(a.zm, a.zb), [], APTWALL);
    const fl = (id, r, mat) => ctx.spawn(`l13-fl-${a.id}-${id}`, { feetPosition: { x: r.cx, y: 0, z: r.cz }, primitive: box(r.x1 - r.x0 - T, 0.012, r.z1 - r.z0 - T), material: mat, receiveShadow: true, castShadow: false });
    fl("main", a.main, CARPET); fl("bed", a.bed, CARPET); fl("bath", a.bath, LINO);
    ctx.spawn(`l13-door-${a.id}`, { feetPosition: { x: hx - UNIT.doorW / 2, y: 0, z: a.zf + a.s * 0.08 }, rotation: { yaw: a.s < 0 ? 78 : -78 }, pivot: [0, 0, 0.5], primitive: box(UNIT.doorW - 0.04, UNIT.doorH - 0.03, 0.045), material: DOORMAT, physics: "static",
      children: [{ feetPosition: { x: 0.4, y: 1, z: 0.04 }, primitive: { kind: "sphere", radius: 0.03 }, material: { color: "oklch(0.7 0.08 85)", metalness: 0.9, roughness: 0.35 } }] });
    ctx.spawn(`l13-lamp-${a.id}`, { feetPosition: { x: a.main.cx, y: H - 0.25, z: a.main.cz }, light: { kind: "point", color: "oklch(0.9 0.06 80)", intensity: a.kind === "lurk" ? 0.35 : 1.1, distance: 8 },
      children: [{ feetPosition: { x: 0, y: 0.1, z: 0 }, primitive: { kind: "sphere", radius: 0.16, widthSegments: 20, heightSegments: 12 }, material: { color: "oklch(0.95 0.04 85)", emissive: "oklch(0.92 0.06 80)", emissiveIntensity: a.kind === "lurk" ? 0.4 : 1.6 } }] });
    ctx.spawn(`l13-lampb-${a.id}`, { feetPosition: { x: a.bed.cx, y: H - 0.3, z: a.bed.cz }, light: { kind: "point", color: "oklch(0.86 0.07 75)", intensity: 0.55, distance: 6 } });
  }
  // sparse fluorescents down the halls: every 9 m, every third one dead
  const tube = (i, x, z, yaw) => { const dead = i % 3 === 2;
    ctx.spawn(`l13-trof-${i}`, { feetPosition: { x, y: H - 0.1, z }, rotation: { yaw }, model: { id: TROFFER }, layout: { box: { min: { x: -0.6, y: 0, z: -0.3 }, max: { x: 0.6, y: 0.1, z: 0.3 } } }, castShadow: false,
      children: [{ feetPosition: { x: 0, y: -0.004, z: 0 }, rotation: { pitch: 90 }, primitive: { kind: "plane", width: 1.02, height: 0.46 }, material: { color: "#fffdf0", emissive: "#fff6d8", emissiveIntensity: dead ? 0.05 : 1.8 }, castShadow: false }] });
    if (!dead) ctx.spawn(`l13-hl-${i}`, { feetPosition: { x, y: H - 0.4, z }, light: { kind: "point", color: "oklch(0.92 0.05 88)", intensity: 0.9, distance: 9 } }); };
  let i = 0; for (let x = -38; x <= -2; x += 9) tube(i++, x, 0, 0); tube(i++, 0, 5, 90); for (let x = 4; x <= 40; x += 9) tube(i++, x, 10, 0);
  // skirting down both halls, and the S-bend's sign for Floor 283
  for (const [id, x, z, w] of [["an", -20.4, -HALL + 0.075, 43.2], ["as", -21.6, HALL - 0.075, 40.8], ["bn", 21.6, 10 - HALL + 0.075, 40.8], ["bs", 20.4, 10 + HALL - 0.075, 43.2]])
    ctx.spawn(`l13-skirt-${id}`, { feetPosition: { x, y: 0, z }, primitive: box(w, 0.1, 0.03), material: TRIM, castShadow: false });
  ctx.spawn("l13-283", { feetPosition: { x: HALL - 0.075, y: 1.6, z: 9.2 }, rotation: { yaw: 90 }, castShadow: false,
    vector: "<svg viewBox='0 0 360 120' width='1.2m'><rect x='2' y='2' width='356' height='116' rx='6' fill='#efe6cf' stroke='#b0572a' stroke-width='4'/><text x='180' y='50' text-anchor='middle' font-family='sans-serif' font-size='34' font-weight='bold' fill='#b0572a'>FLOOR 283</text><text x='180' y='90' text-anchor='middle' font-family='sans-serif' font-size='22' fill='#4a3b2c'>B.N.T.G. FREE HOME PROJECT →</text></svg>" });
  // the ways through: the arrival from Level 12, and the bland door that isn't like the others (to Level 0)
  ctx.spawn("l13-from-l12", { feetPosition: { ...SPAWN }, rotation: { yaw: -90 } });
  ctx.spawn("l13-exit-door", { feetPosition: { x: EXIT0.x - 0.08, y: 0, z: EXIT0.z }, rotation: { yaw: 90 }, primitive: box(1, 2.1, 0.05), material: { color: "oklch(0.8 0.09 95)", roughness: 0.75 }, castShadow: false, state: { name: "Door", info: "Plainer than the others. A yellower beige. The hum behind it is familiar." },
    children: [{ feetPosition: { x: 0.4, y: 1, z: -0.04 }, primitive: { kind: "sphere", radius: 0.03 }, material: { color: "oklch(0.6 0.02 90)", metalness: 0.9, roughness: 0.4 } }] });
  ctx.spawn("l13-to-l0", { tags: ["door"], feetPosition: { x: EXIT0.x - 0.4, y: 0, z: EXIT0.z }, physics: { body: "static", trigger: true }, primitive: box(0.5, 2.2, 1.2), visible: false, behavior: "scripts/level-door.js", state: { to: "main" } });
  ctx.spawn("l13-hum", { feetPosition: { x: 0, y: 1.5, z: 5 }, audio: { clip: "/cdn/moodboard-realistic-gritty/ambience-quiet-apartment-hallway-distant-tv-murmur-and-pipe-tick-loop.mp3", loop: true, gain: 0.13, spatial: false } });
}
export function tick(ctx) {
  const st = ctx.place.state;
  if (st.v !== V || !("l13-floor" in ctx.place.objects)) { lay(ctx); st.v = V; return; }
  restyleSigns(ctx, "level13"); dressThresholds(ctx);
  layFurnish(ctx); layFoes(ctx); layPeople(ctx); layDress(ctx);
  // the lethargy: seconds spent inside one flat, written only when its step (a tenth) changes
  for (const p of ctx.place.players) {
    let m = STAY.get(p.id); if (!m) STAY.set(p.id, m = { apt: null, s: 0 }); const a = aptAt(p.feetPosition.x, p.feetPosition.z);
    if (a && a.id === m.apt) m.s += 1; else if (a) { m.apt = a.id; m.s = Math.max(0, m.s - 5); } else { m.apt = null; m.s = Math.max(0, m.s - (LETH.fullS / LETH.coolS)); }
    const v = Math.round(Math.max(0, Math.min(1, (m.s - LETH.startS) / (LETH.fullS - LETH.startS))) * 10) / 10;
    if ((p.state.leth13 ?? 0) !== v) p.state.leth13 = v;
  }
}
