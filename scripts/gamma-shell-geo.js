// Base Gamma's built shell (place "gamma"): every floor, wall, ceiling, the atrium's balcony ring with its two stairs,
// the security hall's catwalks and the mine tunnel's ramp. Plan in scripts/lib/gamma-layout.js. One static mesh at the origin.
import { ROOMS, WALLS, BAL, VOID, STAIRS, STAIR, TUN, tunnelY } from "./lib/gamma-layout.js";
import { box, paint, post, rod } from "./lib/gamma-kit.js";
const T = 0.2; // half wall thickness
const FLOOR = { terrazzo: ["oklch(0.95 0.01 80)", "terrazzo"], wood: ["oklch(0.92 0.04 70)", "hardwood"], carpet: ["oklch(0.9 0.06 20)", "carpet"], carpet2: ["oklch(0.93 0.03 250)", "carpet"], asphalt: ["oklch(0.95 0.01 80)", "concrete"] };
const wallKind = (w) => { const [ax, at, a, b] = w, cx = ax === "x" ? at : (a + b) / 2, cz = ax === "z" ? at : (a + b) / 2;
  if (cz < -11.9 && !(ax === "z" && at === -12)) return "res"; if (cx <= -21.9 && cz > -12 && !(ax === "x" && at === -22)) return "old";
  if (cx >= 7.9 && cz > 18.1) return "adm"; return "main"; };
function segs(w) { const [, , a, b, h, gaps] = w, out = []; let s = a;
  for (const [g0, g1, top] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > s) out.push([s, g0, 0, h]); out.push([g0, g1, top, h]); s = g1; }
  if (s < b) out.push([s, b, 0, h]); return out; }
const wbox = (ctx, ax, at, a, b, y0, y1, t = T) => ax === "z" ? box(ctx, a, b, y0, y1, at - t, at + t) : box(ctx, at - t, at + t, y0, y1, a, b);
function stair(ctx, [x0, x1], vis) { // a 30 degree flight, steps drawn, a smooth ramp to walk
  const { zLow, zHigh, land0 } = STAIR, n = 25, run = (zLow - zHigh) / n, rise = BAL / n;
  if (vis) { for (let i = 0; i < n; i++) { const z1 = zLow - i * run; paint(ctx, "oklch(0.93 0.01 80)", "terrazzo", 0.6); box(ctx, x0, x1, i * rise, (i + 1) * rise, z1 - run, z1); paint(ctx, "oklch(0.55 0.08 60)", null, 0.4, 0.6); box(ctx, x0 + 0.02, x1 - 0.02, (i + 1) * rise - 0.02, (i + 1) * rise + 0.004, z1 - run - 0.004, z1 - run + 0.05); } }
  else { ctx.quad(x0, 0, zLow + 0.3, x1, 0, zLow + 0.3, x1, BAL, zHigh, x0, BAL, zHigh); ctx.quad(x0, BAL, zHigh, x1, BAL, zHigh, x1, 0, zLow + 0.3, x0, 0, zLow + 0.3); }
  box(ctx, x0, x1, BAL - 0.25, BAL, land0, zHigh); // the top landing
}
function rail(ctx, a, b, vis) { // a balustrade from a to b ([x, z]) on the balcony
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) return;
  if (!vis) { const ax = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]); ax ? box(ctx, Math.min(a[0], b[0]), Math.max(a[0], b[0]), BAL, BAL + 1.1, a[1] - 0.05, a[1] + 0.05) : box(ctx, a[0] - 0.05, a[0] + 0.05, BAL, BAL + 1.1, Math.min(a[1], b[1]), Math.max(a[1], b[1])); return; }
  paint(ctx, "oklch(0.38 0.02 250)", "steel", 0.4, 0.8);
  const n = Math.max(1, Math.round(L / 1.6));
  for (let i = 0; i <= n; i++) { const t = i / n; post(ctx, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, BAL, BAL + 1.0, 0.035, 6); }
  rod(ctx, [a[0], BAL + 0.12, a[1]], [b[0], BAL + 0.12, b[1]], 0.02, 5);
  paint(ctx, "oklch(0.62 0.1 55)", "hardwood", 0.5); rod(ctx, [a[0], BAL + 1.03, a[1]], [b[0], BAL + 1.03, b[1]], 0.045, 6);
  ctx.color("oklch(0.85 0.03 200 / 0.28)"); ctx.albedo(null); ctx.roughness(0.05);
  const ax = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  ax ? box(ctx, Math.min(a[0], b[0]), Math.max(a[0], b[0]), BAL + 0.16, BAL + 0.96, a[1] - 0.008, a[1] + 0.008) : box(ctx, a[0] - 0.008, a[0] + 0.008, BAL + 0.16, BAL + 0.96, Math.min(a[1], b[1]), Math.max(a[1], b[1]));
}
function build(ctx, vis) {
  const hi = ctx.lod <= 2;
  // floors and ceilings
  for (const [k, [x0, x1, z0, z1, h, fk]] of Object.entries(ROOMS)) {
    const [fc, ft] = FLOOR[fk]; if (vis) paint(ctx, fc, ft, fk === "terrazzo" ? 0.35 : 0.85);
    if (k === "res") { // the town: concrete lots, an asphalt street down x = 0, curbs
      box(ctx, x0, x1, -0.3, 0, z0, z1);
      if (vis) { paint(ctx, "oklch(0.95 0.005 80)", "asphalt", 0.9); box(ctx, -3, 3, 0, 0.005, z0 + 0.2, z1 - 0.2); paint(ctx, "oklch(0.9 0.12 95)", null, 0.6);
        for (let z = z1 - 1; z > z0 + 1; z -= 3) box(ctx, -0.07, 0.07, 0.005, 0.01, z - 1.2, z);
        paint(ctx, "oklch(0.8 0.01 80)", "concrete", 0.8); box(ctx, -4.6, -3, 0, 0.15, z0 + 0.2, z1); box(ctx, 3, 4.6, 0, 0.15, z0 + 0.2, z1); }
    } else box(ctx, x0, x1, -0.3, 0, z0, z1);
    if (vis) { paint(ctx, k === "res" ? "oklch(0.3 0.01 260)" : "oklch(0.92 0.02 80)", k === "res" ? "ceiling" : k === "adm" || k === "lng" || k === "sec" ? "acoustic" : "ceiling", 0.95); }
    box(ctx, x0, x1, h, h + 0.3, z0, z1);
  }
  // walls, with tile wainscot and a skirting band on the institutional ones
  for (const w of WALLS) { const [ax, at] = w, kind = wallKind(w);
    for (const [a, b, y0, y1] of segs(w)) {
      if (vis) kind === "res" ? paint(ctx, "oklch(0.55 0.01 250)", "plaster", 0.95) : kind === "old" || kind === "adm" ? paint(ctx, "oklch(0.92 0.03 50)", "brick", 0.9) : paint(ctx, "oklch(0.95 0.03 85)", "cinder", 0.9);
      wbox(ctx, ax, at, a, b, y0, y1);
      if (vis && y0 === 0 && kind === "main") { paint(ctx, "oklch(0.93 0.05 75)", "tile", 0.25); wbox(ctx, ax, at, a, b, 0, 1.3, T + 0.015); paint(ctx, "oklch(0.45 0.07 50)", "tile", 0.3); wbox(ctx, ax, at, a, b, 1.3, 1.42, T + 0.025); }
    }
  }
  // the balcony ring, its edge fascia and stairs
  const [vx0, vx1, vz0, vz1] = VOID, A = ROOMS.atr;
  if (vis) paint(ctx, "oklch(0.95 0.01 80)", "terrazzo", 0.4);
  box(ctx, A[0], vx0, BAL - 0.3, BAL, A[2], A[3]); box(ctx, vx1, A[1], BAL - 0.3, BAL, A[2], A[3]);
  box(ctx, vx0, vx1, BAL - 0.3, BAL, A[2], vz0); box(ctx, vx0, vx1, BAL - 0.3, BAL, vz1, A[3]);
  if (vis) { paint(ctx, "oklch(0.55 0.1 140)", null, 0.5, 0.2); // a lime M.E.G. fascia band round the void
    box(ctx, vx0 - 0.02, vx1 + 0.02, BAL - 0.55, BAL - 0.25, vz0 - 0.02, vz0 + 0.04); box(ctx, vx0 - 0.02, vx1 + 0.02, BAL - 0.55, BAL - 0.25, vz1 - 0.04, vz1 + 0.02);
    box(ctx, vx0 - 0.02, vx0 + 0.04, BAL - 0.55, BAL - 0.25, vz0, vz1); box(ctx, vx1 - 0.04, vx1 + 0.02, BAL - 0.55, BAL - 0.25, vz0, vz1);
    paint(ctx, "oklch(0.88 0.02 80)", "plaster", 0.8); // round columns under the balcony edge
    for (const x of [vx0, vx1]) for (let z = vz0; z <= vz1 + 0.01; z += 6) post(ctx, x - Math.sign(x) * 0.35, z, 0, BAL - 0.3, 0.32, hi ? 14 : 8);
    for (const z of [vz0, vz1]) for (let x = vx0 + 6; x < vx1 - 1; x += 6) post(ctx, x, z + (z === vz0 ? -0.35 : 0.35), 0, BAL - 0.3, 0.32, hi ? 14 : 8); }
  else { for (const x of [vx0, vx1]) for (let z = vz0; z <= vz1 + 0.01; z += 6) box(ctx, x - Math.sign(x) * 0.35 - 0.3, x - Math.sign(x) * 0.35 + 0.3, 0, BAL, z - 0.3, z + 0.3);
    for (const z of [vz0, vz1]) for (let x = vx0 + 6; x < vx1 - 1; x += 6) box(ctx, x - 0.3, x + 0.3, 0, BAL, z + (z === vz0 ? -0.35 : 0.35) - 0.3, z + (z === vz0 ? -0.35 : 0.35) + 0.3); }
  for (const s of STAIRS) stair(ctx, s, vis);
  // balustrades round the void, open where each stair's landing meets the balcony
  const [s0, s1] = STAIRS, L0 = STAIR.land0, Z2 = STAIR.zHigh;
  rail(ctx, [vx0, vz0], [vx1, vz0], vis); rail(ctx, [vx0, vz1], [vx1, vz1], vis);
  rail(ctx, [vx0, vz0], [vx0, L0], vis); rail(ctx, [vx0, Z2], [vx0, vz1], vis); rail(ctx, [vx1, vz0], [vx1, L0], vis); rail(ctx, [vx1, Z2], [vx1, vz1], vis);
  rail(ctx, [s0[0], L0], [s0[1], L0], vis); rail(ctx, [s0[1], L0], [s0[1], Z2], vis); rail(ctx, [s1[0], L0], [s1[1], L0], vis); rail(ctx, [s1[0], L0], [s1[0], Z2], vis);
  if (vis) { paint(ctx, "oklch(0.62 0.1 55)", "hardwood", 0.5); // stair handrails
    for (const x of [s0[1], s1[0]]) { rod(ctx, [x, 1.0, STAIR.zLow], [x, BAL + 1.0, Z2], 0.04, 6); paint(ctx, "oklch(0.38 0.02 250)", "steel", 0.4, 0.8); for (let i = 0; i <= 4; i++) { const z = STAIR.zLow - i * (STAIR.zLow - Z2) / 4; post(ctx, x, z, (i / 4) * BAL, (i / 4) * BAL + 1.0, 0.03, 6); } paint(ctx, "oklch(0.62 0.1 55)", "hardwood", 0.5); } }
  else { box(ctx, s0[1] - 0.05, s0[1] + 0.05, 0, BAL + 1.1, Z2, STAIR.zLow); box(ctx, s1[0] - 0.05, s1[0] + 0.05, 0, BAL + 1.1, Z2, STAIR.zLow); }
  // the security hall's catwalks along both walls, 4.6 m up
  const S = ROOMS.sec, CY = 4.6;
  if (vis) paint(ctx, "oklch(0.4 0.02 250)", "steel", 0.5, 0.7);
  box(ctx, S[0] + T, S[0] + 1.6, CY - 0.12, CY, S[2] + 1, S[3] - 1); box(ctx, S[1] - 1.6, S[1] - T, CY - 0.12, CY, S[2] + 1, S[3] - 1);
  if (vis) { for (const x of [S[0] + 1.6, S[1] - 1.6]) { for (let z = S[2] + 1; z <= S[3] - 1 + 0.01; z += 2) post(ctx, x, z, CY, CY + 1.05, 0.03, 6); rod(ctx, [x, CY + 1.05, S[2] + 1], [x, CY + 1.05, S[3] - 1], 0.03, 6); rod(ctx, [x, CY + 0.55, S[2] + 1], [x, CY + 0.55, S[3] - 1], 0.02, 5);
      for (let z = S[2] + 3; z < S[3] - 1; z += 4) rod(ctx, [x + Math.sign(-x) * -0.0, CY - 0.12, z], [x + Math.sign(x) * (1.4 - 0.0), CY - 2.2, z], 0.04, 5); } } // brace struts to the wall
  else for (const x of [S[0] + 1.6, S[1] - 1.6]) box(ctx, x - 0.05, x + 0.05, CY, CY + 1.1, S[2] + 1, S[3] - 1);
  // the mine tunnel: a timbered ramp down to the grate
  const { x0, x1, z0, z1, h } = TUN, n = 16;
  if (vis) paint(ctx, "oklch(0.75 0.02 60)", "rock", 0.95);
  for (let i = 0; i < n; i++) { const za = z0 + (z1 - z0) * i / n, zb = z0 + (z1 - z0) * (i + 1) / n, ya = tunnelY(za), yb = tunnelY(zb), ym = Math.min(ya, yb);
    if (vis) { ctx.quad(x0, ya, za, x1, ya, za, x1, yb, zb, x0, yb, zb); ctx.quad(x0, ya - 0.3, za, x0, yb - 0.3, zb, x1, yb - 0.3, zb, x1, ya - 0.3, za); }
    else { ctx.quad(x0, ya, za, x1, ya, za, x1, yb, zb, x0, yb, zb); ctx.quad(x0, yb, zb, x1, yb, zb, x1, ya, za, x0, ya, za); }
    box(ctx, x0 - 0.4, x0, ym - 0.3, Math.max(ya, yb) + h, za, zb); box(ctx, x1, x1 + 0.4, ym - 0.3, Math.max(ya, yb) + h, za, zb);
    box(ctx, x0 - 0.4, x1 + 0.4, Math.max(ya, yb) + h, Math.max(ya, yb) + h + 0.3, za, zb); }
  box(ctx, x0 - 0.4, x1 + 0.4, TUN.depth - 0.3, TUN.depth + h + 0.3, z1, z1 + 0.4);
}
export function geometry(ctx) { build(ctx, true); }
export function collider(ctx) { build(ctx, false); }
