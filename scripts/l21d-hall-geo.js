// Level 21 "Numbered Doors": the shell. params.kind: "hall" (one 40 m chunk of five door bays; local -Z runs outward, +X is the
// hall's right hand; { c: chunk index, lit: [5 bools], cap, hole: bay' | null, dark }), "square" (the 16 m room the four halls
// meet at) or "foyer" (the dark wing's entry room; local +X faces its three halls). Plan: scripts/lib/l21d-layout.js.
import { C, SQ_H, HW, HH, SEG, CHUNK, DOOR_W, DOOR_H, DW } from "./lib/l21d-layout.js";
const TX = {
  floor: "cdn/texture-worn-green-and-cream-checker-linoleum-floor-scuffed.png",
  wall: "cdn/texture-yellowed-cream-plaster-wall-damp-stained.png",
  dado: "cdn/texture-dark-green-gloss-painted-plaster-chipped.png",
  ceil: "cdn/texture-stained-acoustic-ceiling-tiles-water-damage.png",
  wood: "cdn/texture-dark-stained-wood-trim.png",
  raw: "cdn/texture-broken-fractured-rough-concrete-aggregate.png",
};
const NICHE = 0.8, DADO = 1.05;
let g;
// a vertical face from (x0,z0) to (x1,z1), y0..y1, drawn both ways so either side shows and collides
function face(x0, z0, x1, z1, y0, y1) { g.quad(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y1, z0); g.quad(x1, y0, z1, x0, y0, z0, x0, y1, z0, x1, y1, z1); }
const up = (y, x0, z0, x1, z1) => g.quad(x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0);
const dn = (y, x0, z0, x1, z1) => g.quad(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
function box(x0, y0, z0, x1, y1, z1) {
  g.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1); g.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);
  g.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1); g.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0);
  g.quad(x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0); g.quad(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
}
// a papered wall: green gloss dado below the rail, yellowed plaster above, and the rail itself
function wall(x0, z0, x1, z1, top, dark, nx, nz) {
  g.albedo(TX.dado); g.color(dark ? "#8a9484" : "#e4efd8"); face(x0, z0, x1, z1, 0, DADO);
  g.albedo(TX.wall); g.color(dark ? "#5b5a4c" : "#d9d2ac"); face(x0, z0, x1, z1, DADO, top);
  if (nx !== undefined) { g.albedo(TX.wood); g.color("#2b241b"); const t = 0.025; box(Math.min(x0, x1) + Math.min(0, nx * t), DADO - 0.04, Math.min(z0, z1) + Math.min(0, nz * t), Math.max(x0, x1) + Math.max(0, nx * t), DADO + 0.04, Math.max(z0, z1) + Math.max(0, nz * t)); }
}
function hall(P) {
  const L = SEG * CHUNK, dark = !!P.dark, c = P.c ?? 0;
  g.roughness(0.82);
  // floor (with the hole Level 22's heap climbs to), ceiling
  g.albedo(TX.floor); g.color(dark ? "#77786c" : "#c9c8b4");
  if (P.hole != null) { const zc = -(P.hole * SEG + SEG / 2), r = 1.2;
    up(0, -HW, -L, HW, zc - r); up(0, -HW, zc + r, HW, 0); up(0, -HW, zc - r, -r, zc + r); up(0, r, zc - r, HW, zc + r);
    g.albedo(TX.raw); g.color("#6d6a62"); face(-r, zc - r, r, zc - r, -4, 0); face(-r, zc + r, r, zc + r, -4, 0); face(-r, zc - r, -r, zc + r, -4, 0); face(r, zc - r, r, zc + r, -4, 0);
  } else up(0, -HW, -L, HW, 0);
  g.albedo(TX.ceil); g.color(dark ? "#4c4b43" : "#b9b59c"); dn(HH, -HW, -L, HW, 0);
  for (let b = 0; b < CHUNK; b++) {
    const k = c * CHUNK + b, s = k % 2 ? 1 : -1, z0 = -b * SEG, z1 = z0 - SEG, zc = z0 - SEG / 2, x = s * HW, hw = DOOR_W / 2 + 0.07;
    // the blank side
    wall(-x, z0, -x, z1, HH, dark, s, 0);
    // the door side: wall, opening, wall, header, and the niche behind the door
    wall(x, z0, x, zc + hw, HH, dark, -s, 0); wall(x, zc - hw, x, z1, HH, dark, -s, 0);
    g.albedo(TX.wall); g.color(dark ? "#5b5a4c" : "#d9d2ac"); face(x, zc + hw, x, zc - hw, DOOR_H + 0.07, HH);
    g.albedo(TX.wood); g.color("#15130f"); const xb = s * (HW + NICHE);
    face(xb, zc + hw, xb, zc - hw, 0, DOOR_H + 0.07); face(x, zc + hw, xb, zc + hw, 0, DOOR_H + 0.07); face(x, zc - hw, xb, zc - hw, 0, DOOR_H + 0.07);
    up(0, Math.min(x, xb), zc - hw, Math.max(x, xb), zc + hw); dn(DOOR_H + 0.07, Math.min(x, xb), zc - hw, Math.max(x, xb), zc + hw);
    // one tube fixture a bay, most of them dead
    if (!dark) { const lit = !!(P.lit ?? [])[b];
      g.albedo(null); g.color("#8d8f86"); g.metalness(0.5); box(-0.16, HH - 0.07, zc - 0.66, 0.16, HH, zc + 0.66); g.metalness(0);
      g.color(lit ? "#f6f7df" : "#5d5e54"); if (lit) g.emissive("#e9efc4"); for (const u of [-0.07, 0.07]) box(u - 0.02, HH - 0.11, zc - 0.6, u + 0.02, HH - 0.07, zc + 0.6); g.emissive(null); }
  }
  if (P.cap) wall(-HW, -L, HW, -L, HH, dark, 0, 1);
}
function room(x0, z0, x1, z1, H, gaps, dark) { // gaps: [{ side: "n"|"s"|"w"|"e", at, w, h }] openings in each wall
  g.roughness(0.82); g.albedo(TX.floor); g.color(dark ? "#77786c" : "#c9c8b4"); up(0, x0, z0, x1, z1);
  g.albedo(TX.ceil); g.color(dark ? "#4c4b43" : "#b9b59c"); dn(H, x0, z0, x1, z1);
  const run = (side, a, b) => side === "n" ? wall(a, z0, b, z0, H, dark, 0, 1) : side === "s" ? wall(a, z1, b, z1, H, dark, 0, -1) : side === "w" ? wall(x0, a, x0, b, H, dark, 1, 0) : wall(x1, a, x1, b, H, dark, -1, 0);
  for (const side of ["n", "s", "w", "e"]) {
    const lo = side === "n" || side === "s" ? x0 : z0, hi = side === "n" || side === "s" ? x1 : z1; let a = lo;
    for (const o of gaps.filter((q) => q.side === side).sort((p, q) => p.at - q.at)) {
      run(side, a, o.at - o.w / 2); a = o.at + o.w / 2;
      g.albedo(TX.wall); g.color(dark ? "#5b5a4c" : "#d9d2ac");
      if (side === "n" || side === "s") face(o.at - o.w / 2, side === "n" ? z0 : z1, a, side === "n" ? z0 : z1, o.h, H); else face(side === "w" ? x0 : x1, o.at - o.w / 2, side === "w" ? x0 : x1, a, o.h, H);
    }
    run(side, a, hi);
  }
}
export function geometry(ctx) {
  g = ctx; const P = ctx.params ?? {};
  if (P.kind === "square") {
    room(-C, -C, C, C, SQ_H, ["n", "s", "w", "e"].map((side) => ({ side, at: 0, w: HW * 2, h: HH })), false);
    // four ceiling panels of light over the desk
    g.albedo(null); for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { g.color("#8d8f86"); box(x - 0.62, SQ_H - 0.06, z - 0.62, x + 0.62, SQ_H, z + 0.62); g.color("#f6f4dc"); g.emissive("#f1ecc6"); box(x - 0.55, SQ_H - 0.08, z - 0.55, x + 0.55, SQ_H - 0.06, z + 0.55); g.emissive(null); }
  } else if (P.kind === "foyer") {
    const f = DW.foyer; room(f[0], f[1], f[2], f[3], DW.h, DW.lanes.map((z) => ({ side: "e", at: z, w: DW.hw * 2, h: DW.h })), true);
  } else hall(P);
  g.albedo(null);
  return { uvProjection: "box" };
}
