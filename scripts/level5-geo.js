// Level 5's built shell (place "level5"): every zone's floor, ceiling and walls with their openings cut, in its own finish:
// wainscot to the chair rail, wallpaper above, crown moulding, baseboards, cased door frames. The plan is scripts/lib/level5.js;
// furniture, fixtures and the Boiler Room's machines are other scripts' (scripts/l5-*-geo.js) on the same plan.
import { ZONES, OPENINGS, T } from "./lib/level5.js";
import { box, paint } from "./lib/gamma-kit.js";
const C = (n) => `cdn/texture-${n}.png`;
// a zone kind's finish: floor, wall (above the rail), wainscot (below), ceiling, and their tints
const FIN = {
  lobby:    { floor: C("black-and-white-checkered-marble-floor-polished"), wall: C("faded-burgundy-damask-hotel-wallpaper"), dado: C("dark-mahogany-raised-wood-panel-wainscot"), ceil: C("ornate-cream-plaster-coffered-ceiling-water-stained"), fc: "oklch(0.95 0.01 80)", wc: "oklch(0.93 0.03 40)", rail: 1.25 },
  hall:     { floor: C("ornate-red-and-gold-patterned-hotel-corridor-carpet"), wall: C("faded-burgundy-damask-hotel-wallpaper"), dado: C("dark-mahogany-raised-wood-panel-wainscot"), ceil: C("ornate-cream-plaster-coffered-ceiling-water-stained"), fc: "oklch(0.92 0.03 40)", wc: "oklch(0.9 0.03 40)", rail: 1.1 },
  corridor: { floor: C("ornate-red-and-gold-patterned-hotel-corridor-carpet"), wall: C("peeling-mustard-yellow-art-deco-hotel-wallpaper"), dado: C("dark-mahogany-raised-wood-panel-wainscot"), ceil: C("cracked-cream-plaster-ceiling"), fc: "oklch(0.86 0.03 40)", wc: "oklch(0.9 0.04 85)", rail: 1.0 },
  guest:    { floor: C("faded-green-floral-hotel-room-carpet-stained"), wall: C("faded-pink-floral-vintage-wallpaper-peeling"), dado: null, ceil: C("cracked-cream-plaster-ceiling"), fc: "oklch(0.9 0.03 140)", wc: "oklch(0.92 0.03 20)", rail: 0 },
  suite:    { floor: C("faded-green-floral-hotel-room-carpet-stained"), wall: C("cream-and-gold-striped-regency-wallpaper"), dado: C("white-painted-wood-panel-wainscot"), ceil: C("cracked-cream-plaster-ceiling"), fc: "oklch(0.92 0.02 90)", wc: "oklch(0.94 0.02 85)", rail: 0.95 },
  library:  { floor: C("worn-dark-oak-herringbone-parquet"), wall: C("deep-green-victorian-floral-wallpaper"), dado: C("dark-mahogany-raised-wood-panel-wainscot"), ceil: C("cracked-cream-plaster-ceiling"), fc: "oklch(0.9 0.02 60)", wc: "oklch(0.9 0.03 150)", rail: 1.0 },
  stairs:   { floor: C("worn-grey-concrete-stair-landing"), wall: C("peeling-mustard-yellow-art-deco-hotel-wallpaper"), dado: null, ceil: C("cracked-cream-plaster-ceiling"), fc: "oklch(0.9 0.01 80)", wc: "oklch(0.8 0.04 85)", rail: 0 },
  kitchen:  { floor: C("black-and-white-checkered-linoleum-floor-worn"), wall: C("white-subway-tile-wall-grimy-grout"), dado: null, ceil: C("cracked-cream-plaster-ceiling"), fc: "oklch(0.93 0.01 80)", wc: "oklch(0.95 0.01 90)", rail: 0 },
  ballroom: { floor: C("polished-herringbone-parquet-ballroom-floor"), wall: C("gold-and-cream-art-deco-fan-pattern-wallpaper"), dado: C("dark-mahogany-raised-wood-panel-wainscot"), ceil: C("ornate-cream-plaster-coffered-ceiling-water-stained"), fc: "oklch(0.95 0.02 60)", wc: "oklch(0.94 0.03 80)", rail: 1.3 },
  salon:    { floor: C("ornate-red-and-gold-persian-rug"), wall: C("deep-green-victorian-floral-wallpaper"), dado: C("dark-mahogany-raised-wood-panel-wainscot"), ceil: C("ornate-cream-plaster-coffered-ceiling-water-stained"), fc: "oklch(0.92 0.03 30)", wc: "oklch(0.88 0.04 150)", rail: 1.1 },
  outpost:  { floor: "cdn/texture-stained-concrete-floor.png", wall: "cdn/texture-painted-cinder-block-wall-clean.png", dado: null, ceil: "cdn/texture-dirty-concrete-ceiling-slab.png", fc: "oklch(0.92 0.01 80)", wc: "oklch(0.93 0.02 95)", rail: 0 },
  boiler:   { floor: C("rusty-diamond-plate-steel-floor-grimy"), wall: "cdn/texture-dark-brown-brick-wall-grimy-mortar.png", dado: null, ceil: "cdn/texture-dirty-concrete-ceiling-slab.png", fc: "oklch(0.9 0.02 50)", wc: "oklch(0.92 0.03 40)", rail: 0 },
};
// the four inner wall runs of a zone: [ax, at (the edge line), a0, a1, inward sign]
const runs = (r) => [["z", r.z0, r.x0, r.x1, 1], ["z", r.z1, r.x0, r.x1, -1], ["x", r.x0, r.z0, r.z1, 1], ["x", r.x1, r.z0, r.z1, -1]];
// a slab hugging a wall run: d0..d1 = depth in from the edge line, a..b along it, y0..y1
const slabOn = (ctx, ax, at, inw, a, b, y0, y1, d0, d1) => {
  const p = at + inw * d0, q = at + inw * d1, lo = Math.min(p, q), hi = Math.max(p, q);
  if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
  ax === "z" ? box(ctx, a, b, y0, y1, lo, hi) : box(ctx, lo, hi, y0, y1, a, b);
};
const gapsOn = (ax, at, a0, a1) => OPENINGS.filter((o) => o.ax === ax && Math.abs(o.at - at) < 1e-3 && o.a1 > a0 && o.a0 < a1).map((o) => ({ ...o, a0: Math.max(o.a0, a0), a1: Math.min(o.a1, a1) })).sort((p, q) => p.a0 - q.a0);
// a band along a run, skipping its gaps below gy (the gap's height); trim that only runs where wall is
function band(ctx, ax, at, inw, a0, a1, gaps, y0, y1, d0, d1) {
  let s = a0;
  for (const g of gaps) { if (y0 < g.h) { slabOn(ctx, ax, at, inw, s, g.a0, y0, y1, d0, d1); s = g.a1; } }
  slabOn(ctx, ax, at, inw, s, a1, y0, y1, d0, d1);
}
function build(ctx, vis) {
  for (const r of ZONES) {
    const f = FIN[r.kind] ?? FIN.hall, h = r.h;
    // floor and ceiling
    if (vis) paint(ctx, f.fc, f.floor, r.kind === "lobby" || r.kind === "ballroom" ? 0.35 : 0.92); box(ctx, r.x0, r.x1, -0.25, 0, r.z0, r.z1);
    if (vis) paint(ctx, "oklch(0.93 0.02 85)", f.ceil, 0.9); box(ctx, r.x0, r.x1, h, h + 0.25, r.z0, r.z1);
    for (const [ax, at, a0, a1, inw] of runs(r)) {
      const gaps = gapsOn(ax, at, a0, a1);
      // the wall itself: wallpaper above the rail, the wainscot below (one collider slab either way)
      if (vis) paint(ctx, f.wc, f.wall, 0.88);
      band(ctx, ax, at, inw, a0, a1, gaps, vis && f.dado ? f.rail : 0, h, 0, T);
      for (const g of gaps) slabOn(ctx, ax, at, inw, g.a0, g.a1, g.h, h, 0, T); // lintel over each opening
      if (!vis) continue;
      if (f.dado) { paint(ctx, "oklch(0.9 0.03 50)", f.dado, 0.6); band(ctx, ax, at, inw, a0, a1, gaps, 0, f.rail, 0, T + 0.02);
        paint(ctx, "oklch(0.36 0.06 45)", "cdn/texture-worn-hardwood-grain.png", 0.45); band(ctx, ax, at, inw, a0, a1, gaps, f.rail - 0.02, f.rail + 0.05, T, T + 0.045); } // chair rail
      if (r.kind !== "boiler") {
        paint(ctx, r.kind === "outpost" ? "oklch(0.35 0.01 250)" : "oklch(0.3 0.05 45)", r.kind === "outpost" ? null : "cdn/texture-worn-hardwood-grain.png", 0.5);
        band(ctx, ax, at, inw, a0, a1, gaps, 0, 0.16, T, T + 0.035); // baseboard
        if (r.kind !== "outpost" && r.kind !== "kitchen") { paint(ctx, "oklch(0.88 0.03 85)", null, 0.6); slabOn(ctx, ax, at, inw, a0, a1, h - 0.14, h, T, T + 0.06); slabOn(ctx, ax, at, inw, a0, a1, h - 0.2, h - 0.14, T, T + 0.025); } // crown moulding, two steps
      } else { paint(ctx, "oklch(0.25 0.02 40)", "cdn/texture-scratched-worn-steel.png", 0.6, 0.5); band(ctx, ax, at, inw, a0, a1, gaps, 0, 0.6, T, T + 0.03); } // a soot-black kick plate
      // cased door frames: two jambs and a head on this face, dark wood (brass-rimmed steel in the Boiler Room)
      for (const g of gaps) {
        const steel = r.kind === "boiler" || r.kind === "outpost" || g.kind === "metal";
        paint(ctx, steel ? "oklch(0.4 0.02 60)" : "oklch(0.32 0.06 45)", steel ? "cdn/texture-scratched-worn-steel.png" : "cdn/texture-worn-hardwood-grain.png", 0.45, steel ? 0.6 : 0);
        const w = g.kind === "arch" ? 0.2 : 0.12;
        slabOn(ctx, ax, at, inw, g.a0 - w, g.a0, 0, g.h + w, -0.005, T + 0.05); slabOn(ctx, ax, at, inw, g.a1, g.a1 + w, 0, g.h + w, -0.005, T + 0.05);
        slabOn(ctx, ax, at, inw, g.a0 - w, g.a1 + w, g.h, Math.min(h, g.h + w), -0.005, T + 0.05);
        if (g.kind === "arch") { paint(ctx, "oklch(0.9 0.03 85)", null, 0.5); slabOn(ctx, ax, at, inw, g.a0 + (g.a1 - g.a0) / 2 - 0.18, g.a0 + (g.a1 - g.a0) / 2 + 0.18, g.h - 0.05, g.h + 0.28, T + 0.04, T + 0.09); } // keystone
      }
    }
  }
}
export function geometry(ctx) { build(ctx, true); }
export function collider(ctx) { build(ctx, false); }
