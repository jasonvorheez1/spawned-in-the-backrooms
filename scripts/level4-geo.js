// Level 4's built floor (place "level4"): carpet, drop ceiling with troffers, drywall rooms with door trim, the outer
// windows (blacked out, three left bare), columns, the lift doors and the stairwell door. Plan in scripts/lib/level4.js.
import { HALF, H, T, DOORH, ROOMS, WALLS, COLUMNS, LIFT, STAIRS } from "./lib/level4.js";
import { box, paint } from "./lib/gamma-kit.js";
const CARPET = "cdn/texture-light-grey-beige-office-carpet-tiles-worn.png", DRY = "cdn/texture-scuffed-off-white-painted-office-drywall.png";
const wb = (ctx, ax, at, a, b, y0, y1, t = T) => ax === "z" ? box(ctx, a, b, y0, y1, at - t, at + t) : box(ctx, at - t, at + t, y0, y1, a, b);
function build(ctx, vis) {
  // floor, ceiling
  if (vis) paint(ctx, "oklch(0.9 0.01 90)", CARPET, 0.95); box(ctx, -HALF, HALF, -0.2, 0, -HALF, HALF);
  if (vis) paint(ctx, "oklch(0.93 0.01 90)", "acoustic", 0.9); box(ctx, -HALF, HALF, H, H + 0.2, -HALF, HALF);
  // outer walls, the lift and stairwell openings cut
  if (vis) paint(ctx, "oklch(0.88 0.015 85)", DRY, 0.9);
  for (const [ax, at] of [["z", -HALF], ["z", HALF], ["x", -HALF], ["x", HALF]]) wb(ctx, ax, at, -HALF, HALF, 0, H, 0.2);
  // interior walls with door gaps and lintels
  for (const [ax, at, a, b, gaps] of WALLS) {
    let s = a; for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > s) wb(ctx, ax, at, s, g0, 0, H); wb(ctx, ax, at, g0, g1, DOORH, H); s = g1; } if (s < b) wb(ctx, ax, at, s, b, 0, H);
  }
  for (const [x, z] of COLUMNS) box(ctx, x - 0.35, x + 0.35, 0, H, z - 0.35, z + 0.35);
  if (!vis) return;
  // baseboards on every wall face
  paint(ctx, "oklch(0.32 0.02 60)", null, 0.6);
  for (const [ax, at, a, b, gaps] of WALLS) { let s = a; for (const [g0, g1] of gaps) { if (g0 > s) wb(ctx, ax, at, s, g0, 0, 0.1, T + 0.012); s = g1; } if (s < b) wb(ctx, ax, at, s, b, 0, 0.1, T + 0.012); }
  for (const [ax, at] of [["z", -HALF], ["z", HALF], ["x", -HALF], ["x", HALF]]) wb(ctx, ax, at, -HALF, HALF, 0, 0.1, 0.212);
  // door trim: two jambs and a head on both faces, warm brown
  paint(ctx, "oklch(0.45 0.05 60)", "hardwood", 0.6);
  for (const r of ROOMS) { const { ax, at, c } = r.door, w = (r.door.w ?? 1.2) / 2;
    wb(ctx, ax, at, c - w - 0.08, c - w, 0, DOORH + 0.08, T + 0.02); wb(ctx, ax, at, c + w, c + w + 0.08, 0, DOORH + 0.08, T + 0.02); wb(ctx, ax, at, c - w - 0.08, c + w + 0.08, DOORH, DOORH + 0.08, T + 0.02); }
  // troffers: a recessed 2x4 fixture every 4 m in the open, one per room: steel rim, a lit prismatic lens split by two
  // dark louvres, the end caps; a dead one here and there, its lens grey and yellowed
  const troffer = (x, z, dead) => {
    paint(ctx, "oklch(0.8 0.008 95)", null, 0.5, 0.4); box(ctx, x - 0.62, x + 0.62, H - 0.035, H, z - 0.32, z + 0.32);
    paint(ctx, dead ? "oklch(0.62 0.03 85)" : "oklch(0.99 0.012 110)", null, 0.25, 0, dead ? null : "oklch(0.98 0.03 110)"); box(ctx, x - 0.57, x + 0.57, H - 0.04, H - 0.035, z - 0.27, z + 0.27);
    paint(ctx, "oklch(0.7 0.008 95)", null, 0.5, 0.5); for (const d of [-0.09, 0.09]) box(ctx, x - 0.57, x + 0.57, H - 0.055, H - 0.035, z + d - 0.012, z + d + 0.012);
  };
  for (let x = -26; x <= 26; x += 4) for (let z = -26; z <= 26; z += 4) {
    if (Math.abs(x) > 24 || Math.abs(z) > 24) continue; troffer(x, z, ((x * 7 + z * 13) & 15) === 3);
  }
  for (const r of ROOMS) troffer((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, r.kind === "trap");
  // the office doors: hollow-core oak, left swung wide against the hinge jamb, a lever handle
  for (const r of ROOMS) { const w = r.door.w ?? 1.2; if (w > 1.3) continue; const { ax, at, c } = r.door, inw = r.inward ?? (r.z0 < 0 ? -1 : 1) * -1;
    const hinge = r.mid !== undefined ? (c < r.mid ? c - w / 2 : c + w / 2) : c - w / 2, sgn = hinge < c ? 1 : -1, d0 = at - inw * (T + 0.01), d1 = at - inw * (T + 1.1);
    paint(ctx, "oklch(0.6 0.07 65)", "hardwood", 0.6); const a0 = hinge + sgn * 0.01, a1 = hinge + sgn * 0.055;
    ax === "z" ? box(ctx, Math.min(a0, a1), Math.max(a0, a1), 0.01, DOORH - 0.02, Math.min(d0, d1), Math.max(d0, d1)) : box(ctx, Math.min(d0, d1), Math.max(d0, d1), 0.01, DOORH - 0.02, Math.min(a0, a1), Math.max(a0, a1));
    paint(ctx, "oklch(0.72 0.02 85)", null, 0.25, 0.9); const hd = at - inw * (T + 1.0), h0 = hinge + sgn * 0.055, h1 = hinge + sgn * 0.12;
    ax === "z" ? box(ctx, Math.min(h0, h1), Math.max(h0, h1), 0.98, 1.01, hd - 0.06, hd + 0.06) : box(ctx, hd - 0.06, hd + 0.06, 0.98, 1.01, Math.min(h0, h1), Math.max(h0, h1)); }
  // windows on every office's outer wall: steel frame, the pane taped over in black, three left bare and glowing
  for (const r of ROOMS) { if (!r.outer) continue; const { ax, at } = r.outer, f = at + r.inward * 0.205, m = r.mid;
    paint(ctx, "oklch(0.55 0.01 250)", "steel", 0.5, 0.6); wb(ctx, ax, f, m - 1.3, m + 1.3, 0.85, 0.95, 0.03); wb(ctx, ax, f, m - 1.3, m + 1.3, 2.15, 2.25, 0.03);
    wb(ctx, ax, f, m - 1.3, m - 1.2, 0.85, 2.25, 0.03); wb(ctx, ax, f, m + 1.2, m + 1.3, 0.85, 2.25, 0.03); wb(ctx, ax, f, m - 0.04, m + 0.04, 0.95, 2.15, 0.03);
    if (r.kind === "trap") paint(ctx, "oklch(0.97 0.03 220)", null, 0.1, 0, "oklch(0.95 0.05 215)"); else paint(ctx, "oklch(0.12 0.005 250)", null, 0.35);
    wb(ctx, ax, at + r.inward * 0.2, m - 1.2, m + 1.2, 0.95, 2.15, 0.006);
    if (r.kind !== "trap") { paint(ctx, "oklch(0.72 0.02 80 / 0.9)", null, 0.8); for (const d of [-0.6, 0.6]) wb(ctx, ax, at + r.inward * 0.208, m + d - 0.04, m + d + 0.04, 0.95, 2.15, 0.004); } // tape strips
  }
  // the lift: brushed steel doors in the lobby's east wall, a call panel
  paint(ctx, "oklch(0.7 0.01 250)", "steel", 0.3, 0.85); box(ctx, LIFT.x - 0.24, LIFT.x - 0.2, 0, 2.3, LIFT.z - 0.9, LIFT.z + 0.9);
  paint(ctx, "oklch(0.3 0.01 250)", null, 0.4, 0.6); box(ctx, LIFT.x - 0.25, LIFT.x - 0.2, 0, 2.3, LIFT.z - 0.01, LIFT.z + 0.01); box(ctx, LIFT.x - 0.26, LIFT.x - 0.2, 2.3, 2.45, LIFT.z - 1, LIFT.z + 1);
  box(ctx, LIFT.x - 0.25, LIFT.x - 0.2, 1.1, 1.4, LIFT.z + 1.2, LIFT.z + 1.35);
  // the stairwell door: grey steel, push bar
  paint(ctx, "oklch(0.5 0.02 240)", "steel", 0.5, 0.5); box(ctx, STAIRS.x - 0.5, STAIRS.x + 0.5, 0, 2.1, STAIRS.z - 0.24, STAIRS.z - 0.2);
  paint(ctx, "oklch(0.75 0.01 250)", null, 0.3, 0.8); box(ctx, STAIRS.x - 0.4, STAIRS.x + 0.4, 1, 1.06, STAIRS.z - 0.3, STAIRS.z - 0.24);
}
export function geometry(ctx) { build(ctx, true); }
export function collider(ctx) { build(ctx, false); }
