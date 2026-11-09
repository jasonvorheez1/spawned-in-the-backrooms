// Level 0.1 "Zenith Station": one modular kit for the whole station (places/level01/sim.js lays it).
// params.kind picks the piece: hall, room, doorframe, doorleaf, desk, chair, locker, pod, labbench, growbed,
// counter, rack, crate, pipes, table, treadmill, stall, bot, debris, window, shell, core.
// One architectural language everywhere: white composite wall panels on a dark seam backing, brushed-steel
// kick plates and pilasters every 4.8 m, chamfered ceiling coves with light lines, troffer ceilings, rubber floors
// with a grated service channel. params.dmg (0..3) breaks it believably: panels torn off over their cable runs,
// dead troffers, a ceiling tile hanging by one edge, debris below the hole it fell from.

const T_PANEL = "cdn/texture-clean-white-composite-wall-panel-faint-grime.png";
const T_METAL = "cdn/texture-brushed-stainless-steel-sheet.png";
const T_FLOOR = "cdn/texture-grey-industrial-rubber-floor-studded.png";

const C = {
  panel: ["#f2f1ec", T_PANEL, 0.55, 0.04],
  aged: ["#dcd6c6", T_PANEL, 0.7, 0.04],
  frost: ["#eaf4ff", T_PANEL, 0.25, 0.05],
  scorch: ["#6b5e52", T_PANEL, 0.85, 0.1],
  metal: ["#cfd3d8", T_METAL, 0.38, 0.85],
  steel: ["#9aa1aa", T_METAL, 0.45, 0.8],
  dark: ["#25282c", null, 0.6, 0.4],
  seam: ["#141618", null, 0.8, 0.2],
  floor: ["#a3a7ab", T_FLOOR, 0.88, 0.0],
  mat: ["#3a3d40", T_FLOOR, 0.92, 0.0],
  tile: ["#e9ecee", T_PANEL, 0.3, 0.02],
  teal: ["#3f8791", null, 0.45, 0.2],
  amber: ["#c98a2c", null, 0.5, 0.2],
  hazard: ["#d8b23a", null, 0.6, 0.1],
  rubber: ["#1c1d1f", null, 0.9, 0.0],
  cloth: ["#5d6d7a", null, 0.95, 0.0],
  sheet: ["#d9dde0", null, 0.95, 0.0],
  soil: ["#3b2c22", null, 1, 0],
  plant: ["#4f8a3c", null, 0.8, 0],
  deadplant: ["#7d6a3e", null, 0.9, 0],
  wireR: ["#9b2a24", null, 0.6, 0],
  wireB: ["#202226", null, 0.6, 0],
  wireY: ["#b89a2a", null, 0.6, 0],
  ice: ["#cfe8f6", null, 0.08, 0.1],
  glass: ["#a8c4cc", null, 0.05, 0.2],
};
let SEED = 1;
function rnd() { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; }
function paint(ctx, k, alpha = 1) {
  const [col, tex, r, m] = C[k];
  ctx.albedo(tex); ctx.color(col, alpha); ctx.roughness(r); ctx.metalness(m); ctx.emissive(null);
}
function glow(ctx, r, g, b) { ctx.albedo(null); ctx.color("#ffffff"); ctx.emissive(r, g, b); }

// a face whose winding is turned to face n
function F(ctx, p, n) {
  const [a, b, c] = p;
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  if (nx * n[0] + ny * n[1] + nz * n[2] < 0) p = p.slice().reverse();
  if (p.length === 3) ctx.tri(...p[0], ...p[1], ...p[2]);
  else ctx.quad(...p[0], ...p[1], ...p[2], ...p[3]);
}
// an axis box with every edge chamfered by e (skip: faces left open, 0..5 = -x,+x,-y,+y,-z,+z)
function cbox(ctx, x0, y0, z0, x1, y1, z1, e = 0, skip) {
  if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; if (z1 < z0) [z0, z1] = [z1, z0];
  e = Math.max(0, Math.min(e, (x1 - x0) / 2.01, (y1 - y0) / 2.01, (z1 - z0) / 2.01));
  const lo = [x0, y0, z0], hi = [x1, y1, z1];
  const O = (a, s) => (s > 0 ? hi[a] : lo[a]), I = (a, s) => (s > 0 ? hi[a] - e : lo[a] + e);
  for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {
    if (skip && skip.includes(a * 2 + (s > 0 ? 1 : 0))) continue;
    const b = (a + 1) % 3, c = (a + 2) % 3;
    const ps = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([ub, uc]) => { const v = [0, 0, 0]; v[a] = O(a, s); v[b] = I(b, ub); v[c] = I(c, uc); return v; });
    const n = [0, 0, 0]; n[a] = s; F(ctx, ps, n);
  }
  if (e <= 0.0005) return;
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
    const c = 3 - a - b;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const mk = (ao, bo, sc) => { const v = [0, 0, 0]; v[a] = ao ? O(a, sa) : I(a, sa); v[b] = bo ? O(b, sb) : I(b, sb); v[c] = I(c, sc); return v; };
      const n = [0, 0, 0]; n[a] = sa; n[b] = sb;
      F(ctx, [mk(1, 0, -1), mk(1, 0, 1), mk(0, 1, 1), mk(0, 1, -1)], n);
    }
  }
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) for (const sc of [-1, 1]) {
    const s = [sa, sb, sc];
    F(ctx, [0, 1, 2].map((k) => { const v = [0, 0, 0]; for (let a = 0; a < 3; a++) v[a] = a === k ? O(a, s[a]) : I(a, s[a]); return v; }), s);
  }
}
// a round rod from p to q
function rod(ctx, p, q, r, seg = 8, caps = true) {
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d) || 1e-6, t = d.map((v) => v / L);
  let u = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const dt = u[0] * t[0] + u[1] * t[1] + u[2] * t[2];
  u = [u[0] - t[0] * dt, u[1] - t[1] * dt, u[2] - t[2] * dt]; const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
  const ring = (o, i) => { const a = (i / seg) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r; return [o[0] + u[0] * c + w[0] * s, o[1] + u[1] * c + w[1] * s, o[2] + u[2] * c + w[2] * s]; };
  ctx.smooth();
  for (let i = 0; i < seg; i++) {
    const m = ((i + 0.5) / seg) * Math.PI * 2, n = [0, 1, 2].map((k) => u[k] * Math.cos(m) + w[k] * Math.sin(m));
    F(ctx, [ring(p, i), ring(p, i + 1), ring(q, i + 1), ring(q, i)], n);
  }
  ctx.flat();
  if (caps) for (const [o, s] of [[p, -1], [q, 1]]) for (let i = 0; i < seg; i++) F(ctx, [o, ring(o, i), ring(o, i + 1)], t.map((v) => v * s));
}
// a sagging cable through points
function cable(ctx, pts, r = 0.012) { for (let i = 0; i < pts.length - 1; i++) rod(ctx, pts[i], pts[i + 1], r, 5, false); }
function sag(a, b, drop, n = 6) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n; o.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * drop, a[2] + (b[2] - a[2]) * t]); } return o; }

// ---------- the wall system (shared by halls and rooms) ----------
// runs along `axis` ("z" or "x") from s0 to s1 on the plane at c; n = which way is inside (+1/-1)
function wallRun(ctx, o) {
  const { axis, c, n, s0, s1, h, doors = [], dmg = 0, skin = "panel", lit = 1 } = o, P = 1.2;
  const W = (s, y, d) => (axis === "z" ? [c + n * d, y, s] : [s, y, c + n * d]);
  const box = (sa, sb, ya, yb, da, db, e = 0) => { const A = W(sa, ya, da), B = W(sb, yb, db); cbox(ctx, A[0], A[1], A[2], B[0], B[1], B[2], e); };
  const nIn = axis === "z" ? [n, 0, 0] : [0, 0, n];
  const inDoor = (s, pad = 1.2) => doors.some((d) => Math.abs(s - d) < pad - 0.01);
  // seam backing, cut at doors
  paint(ctx, "seam");
  let a = s0;
  const cuts = doors.map((d) => [d - 1.2, d + 1.2]).sort((x, y) => x[0] - y[0]);
  for (const [ca, cb] of [...cuts, [s1, s1]]) { if (ca > a) F(ctx, [W(a, 0, 0), W(ca, 0, 0), W(ca, h, 0), W(a, h, 0)], nIn); a = Math.max(a, cb); }
  const slots = Math.round((s1 - s0) / P);
  for (let i = 0; i < slots; i++) {
    const sa = s0 + i * P, sb = sa + P, sm = (sa + sb) / 2;
    if (inDoor(sm)) continue;
    paint(ctx, "steel"); box(sa, sb, 0, 0.26, 0, 0.06, 0.01); // kick plate
    const torn = dmg > 0 && rnd() < dmg * 0.11;
    if (torn) {
      // the panel is gone: its cable run and the insulation behind it show
      paint(ctx, "dark"); box(sa + 0.1, sb - 0.1, 0.4, h - 0.2, 0, 0.012);
      for (const [k, yy] of [["wireR", 0.9], ["wireB", 1.35], ["wireY", 1.8]]) { paint(ctx, k); cable(ctx, sag(W(sa + 0.05, yy, 0.03), W(sb - 0.05, yy + 0.1, 0.03), 0.12 + rnd() * 0.2)); }
      if (rnd() < 0.6) { paint(ctx, k3()); cable(ctx, [W(sm, h - 0.1, 0.04), W(sm + 0.1, 1.1, 0.12), W(sm + 0.25, 0.5 + rnd() * 0.4, 0.3)]); }
      continue;
    }
    const bent = dmg > 1 && rnd() < 0.15 ? 0.06 + rnd() * 0.08 : 0;
    paint(ctx, skin);
    if (bent) { // a warped panel: its lower half kicked loose from the frame
      box(sa + 0.015, sb - 0.015, 1.2, h - 0.02, 0, 0.045, 0.012);
      const A = W(sa + 0.02, 0.28, bent), B = W(sb - 0.02, 0.28, bent), Cc = W(sb - 0.02, 1.2, 0.045), D = W(sa + 0.02, 1.2, 0.045);
      F(ctx, [A, B, Cc, D], nIn);
    } else box(sa + 0.015, sb - 0.015, 0.28, h - 0.02, 0, 0.045, 0.012);
    if (ctx.lod <= 2) {
      if (i % 4 === 2) { // a service hatch with its louvre and tag
        paint(ctx, "steel"); for (let k = 0; k < 6; k++) box(sa + 0.25, sb - 0.25, 0.5 + k * 0.05, 0.52 + k * 0.05, 0.045, 0.06);
        paint(ctx, "teal"); box(sa + 0.3, sa + 0.62, 1.55, 1.63, 0.045, 0.055);
      }
      if (i % 4 === 0 && lit > 0.2 && rnd() < 0.5) { // an intercom / room panel
        paint(ctx, "dark"); box(sm - 0.12, sm + 0.12, 1.3, 1.5, 0.045, 0.075, 0.01);
        glow(ctx, 0.2, 0.9, 1.0); box(sm - 0.09, sm + 0.09, 1.36, 1.46, 0.075, 0.078);
      }
    }
  }
  // pilasters every 4.8 m: the frame the panels hang on
  paint(ctx, "metal");
  for (let s = s0; s <= s1 + 0.01; s += 4.8) if (!inDoor(s, 1.4)) box(s - 0.16, s + 0.16, 0, h, 0, 0.13, 0.025);
}
const k3 = () => ["wireR", "wireB", "wireY"][Math.floor(rnd() * 3)];

// a ceiling of troffers between x0..x1, z0..z1 at height y (faces down)
function ceiling(ctx, x0, x1, z0, z1, y, dmg, lit, tint) {
  const down = [0, -1, 0], P = 1.2;
  paint(ctx, "panel");
  const nx = Math.max(1, Math.round((x1 - x0) / P)), nz = Math.max(1, Math.round((z1 - z0) / P));
  const dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
  const [r, g, b] = tint ?? [3.2, 3.1, 2.9];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a0 = x0 + i * dx, a1 = a0 + dx, b0 = z0 + j * dz, b1 = b0 + dz;
    const light = (i + j * 3) % 4 === 1 || (nx <= 3 && j % 2 === 0 && i === Math.floor(nx / 2));
    if (dmg > 1 && rnd() < dmg * 0.05) { // a fallen tile: the void above and a tile hanging off one edge
      paint(ctx, "seam"); F(ctx, [[a0, y + 0.4, b0], [a1, y + 0.4, b0], [a1, y + 0.4, b1], [a0, y + 0.4, b1]], down);
      paint(ctx, "wireB"); cable(ctx, sag([a0 + 0.2, y + 0.35, b0 + 0.3], [a1 - 0.3, y + 0.3, b1 - 0.2], 0.5));
      paint(ctx, "aged"); F(ctx, [[a0, y, b0], [a1, y, b0], [a1, y - 0.9, b1 - 0.4], [a0, y - 0.95, b1 - 0.4]], [0, -1, 0.4]);
      continue;
    }
    if (light) {
      paint(ctx, "steel"); cbox(ctx, a0 + 0.02, y - 0.03, b0 + 0.02, a1 - 0.02, y, b1 - 0.02, 0.01);
      const dead = lit <= 0 || rnd() < (dmg * 0.18 + (1 - lit) * 0.6);
      if (dead) paint(ctx, "aged"); else glow(ctx, r * lit, g * lit, b * lit);
      F(ctx, [[a0 + 0.12, y - 0.031, b0 + 0.12], [a1 - 0.12, y - 0.031, b0 + 0.12], [a1 - 0.12, y - 0.031, b1 - 0.12], [a0 + 0.12, y - 0.031, b1 - 0.12]], down);
      if (ctx.lod <= 2) { paint(ctx, "metal"); for (let k = 1; k < 4; k++) { const zz = b0 + 0.12 + ((b1 - b0 - 0.24) * k) / 4; cbox(ctx, a0 + 0.12, y - 0.045, zz - 0.008, a1 - 0.12, y - 0.031, zz + 0.008); } }
      paint(ctx, "panel");
    } else {
      F(ctx, [[a0 + 0.008, y, b0 + 0.008], [a1 - 0.008, y, b0 + 0.008], [a1 - 0.008, y, b1 - 0.008], [a0 + 0.008, y, b1 - 0.008]], down);
    }
  }
  // the grid bars
  paint(ctx, "metal");
  for (let i = 0; i <= nx; i++) cbox(ctx, x0 + i * dx - 0.015, y - 0.02, z0, x0 + i * dx + 0.015, y + 0.001, z1);
  for (let j = 0; j <= nz; j++) cbox(ctx, x0, y - 0.02, z0 + j * dz - 0.015, x1, y + 0.001, z0 + j * dz + 0.015);
}
function floor(ctx, x0, x1, z0, z1, skin = "floor") {
  paint(ctx, skin); F(ctx, [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], [0, 1, 0]);
}
function debris(ctx, x0, x1, z0, z1, n) {
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), w = 0.15 + rnd() * 0.6, d = 0.1 + rnd() * 0.5, k = rnd();
    paint(ctx, k < 0.45 ? "aged" : k < 0.75 ? "steel" : "dark");
    const t = 0.01 + rnd() * 0.03, tilt = rnd() * 0.12;
    F(ctx, [[x, t, z], [x + w, t + tilt, z], [x + w, t + tilt, z + d], [x, t, z + d]], [0, 1, 0]);
    if (k > 0.9) { paint(ctx, "glass", 0.5); F(ctx, [[x, 0.012, z], [x + 0.2, 0.012, z + 0.05], [x + 0.06, 0.012, z + 0.18]], [0, 1, 0]); }
  }
}

// ---------- pieces ----------
const PIECES = {};
// a corridor along -Z from z=0 to z=-len: walls to 2.5 m, a chamfered cove up to the ceiling
PIECES.hall = (ctx, p) => {
  const L = p.len ?? 12, w = p.w ?? 4, hw = w / 2, wh = 2.5, h = p.h ?? 3.2, cv = 0.7, dmg = p.dmg ?? 0, lit = p.lit ?? 1, skin = p.skin ?? (dmg > 1 ? "aged" : "panel");
  wallRun(ctx, { axis: "z", c: -hw, n: 1, s0: -L, s1: 0, h: wh, doors: p.doorsL ?? [], dmg, skin, lit });
  wallRun(ctx, { axis: "z", c: hw, n: -1, s0: -L, s1: 0, h: wh, doors: p.doorsR ?? [], dmg, skin, lit });
  // coves with a light line
  for (const sx of [-1, 1]) {
    paint(ctx, skin);
    F(ctx, [[sx * hw, wh, 0], [sx * hw, wh, -L], [sx * (hw - cv), h, -L], [sx * (hw - cv), h, 0]], [-sx, -1, 0]);
    const dead = lit <= 0;
    for (let z = 0; z > -L; z -= 2.4) {
      const off = dead || rnd() < dmg * 0.22;
      if (off) paint(ctx, "seam"); else glow(ctx, 2.4 * lit, 2.4 * lit, 2.3 * lit);
      const za = z - 0.1, zb = z - 2.3, i0 = sx * (hw - 0.22), i1 = sx * (hw - 0.3), y0 = wh + 0.22, y1 = wh + 0.3;
      F(ctx, [[i0, y0 - 0.004, za], [i0, y0 - 0.004, zb], [i1, y1 - 0.004, zb], [i1, y1 - 0.004, za]], [-sx, -1, 0]);
    }
    paint(ctx, "metal"); cbox(ctx, sx * hw - 0.0, wh - 0.03, -L, sx * (hw - 0.08), wh + 0.03, 0); // the cove rail
  }
  ceiling(ctx, -(hw - cv), hw - cv, -L, 0, h, dmg, lit);
  // the floor: rubber either side of a grated service channel
  floor(ctx, -hw, -0.35, -L, 0); floor(ctx, 0.35, hw, -L, 0);
  paint(ctx, "seam"); F(ctx, [[-0.35, -0.12, -L], [0.35, -0.12, -L], [0.35, -0.12, 0], [-0.35, -0.12, 0]], [0, 1, 0]);
  paint(ctx, "steel");
  for (const sx of [-1, 1]) cbox(ctx, sx * 0.35 - 0.03, -0.12, -L, sx * 0.35 + 0.03, 0.005, 0);
  if (ctx.lod <= 2) for (let z = -0.05; z > -L; z -= 0.09) cbox(ctx, -0.33, -0.015, z - 0.012, 0.33, 0, z + 0.012);
  else { F(ctx, [[-0.35, -0.01, -L], [0.35, -0.01, -L], [0.35, -0.01, 0], [-0.35, -0.01, 0]], [0, 1, 0]); }
  if (ctx.lod <= 2) { paint(ctx, "wireB"); rod(ctx, [-0.2, -0.08, 0], [-0.2, -0.08, -L], 0.03, 6, false); paint(ctx, "teal"); rod(ctx, [0.15, -0.09, 0], [0.15, -0.09, -L], 0.02, 6, false); }
  // ring frames every 4.8 m: braces up the coves and a beam across
  paint(ctx, "metal");
  for (let z = 0; z >= -L - 0.01; z -= 4.8) {
    if ((p.doorsL ?? []).some((d) => Math.abs(z - d) < 1.4) || (p.doorsR ?? []).some((d) => Math.abs(z - d) < 1.4)) continue;
    cbox(ctx, -(hw - cv), h - 0.14, z - 0.16, hw - cv, h, z + 0.16, 0.02);
    for (const sx of [-1, 1]) { const za = z - 0.16, zb = z + 0.16; F(ctx, [[sx * (hw - 0.13), wh, za], [sx * (hw - 0.13), wh, zb], [sx * (hw - cv), h - 0.14, zb], [sx * (hw - cv), h - 0.14, za]], [-sx, -1, 0]); }
  }
  if (dmg >= 2) debris(ctx, -hw + 0.3, hw - 0.3, -L + 0.5, -0.5, Math.round(L * dmg * 0.6));
  if (p.endWall) { wallRun(ctx, { axis: "x", c: -L, n: 1, s0: -hw, s1: hw, h: wh, dmg, skin }); paint(ctx, skin); F(ctx, [[-hw, wh, -L], [hw, wh, -L], [hw - cv, h, -L], [-hw + cv, h, -L]], [0, 0, 1]); }
};
// a room centred on the origin: w (x) by d (z), doors per side at offsets along the wall
PIECES.room = (ctx, p) => {
  const w = p.w ?? 10, d = p.d ?? 10, h = p.h ?? 3.4, dmg = p.dmg ?? 0, lit = p.lit ?? 1, style = p.style ?? "white";
  const skin = style === "frozen" ? "frost" : style === "hot" ? "scorch" : dmg > 1 ? "aged" : "panel";
  const D = (side) => (p.doors ?? []).filter((q) => q.side === side).map((q) => q.at);
  const open = p.open ?? [];
  if (!open.includes("n")) wallRun(ctx, { axis: "x", c: -d / 2, n: 1, s0: -w / 2, s1: w / 2, h, doors: D("n"), dmg, skin, lit });
  if (!open.includes("s")) wallRun(ctx, { axis: "x", c: d / 2, n: -1, s0: -w / 2, s1: w / 2, h, doors: D("s"), dmg, skin, lit });
  if (!open.includes("w")) wallRun(ctx, { axis: "z", c: -w / 2, n: 1, s0: -d / 2, s1: d / 2, h, doors: D("w"), dmg, skin, lit });
  if (!open.includes("e")) wallRun(ctx, { axis: "z", c: w / 2, n: -1, s0: -d / 2, s1: d / 2, h, doors: D("e"), dmg, skin, lit });
  // corner columns
  paint(ctx, "metal");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cbox(ctx, sx * w / 2 - sx * 0.22, 0, sz * d / 2 - sz * 0.22, sx * w / 2, h, sz * d / 2, 0.03);
  // a crown rail
  for (const sz of [-1, 1]) if (!open.includes(sz < 0 ? "n" : "s")) cbox(ctx, -w / 2, h - 0.12, sz * d / 2 - sz * 0.1, w / 2, h, sz * d / 2);
  for (const sx of [-1, 1]) if (!open.includes(sx < 0 ? "w" : "e")) cbox(ctx, sx * w / 2 - sx * 0.1, h - 0.12, -d / 2, sx * w / 2, h, d / 2);
  const tint = style === "green" ? [2.4, 1.2, 2.6] : style === "hot" ? [3.0, 1.2, 0.5] : style === "frozen" ? [2.2, 2.8, 3.4] : style === "maint" ? [2.8, 0.5, 0.3] : null;
  ceiling(ctx, -w / 2 + 0.1, w / 2 - 0.1, -d / 2 + 0.1, d / 2 - 0.1, h - 0.12, dmg, lit, tint);
  const fl = style === "wash" ? "tile" : style === "gym" ? "mat" : "floor";
  floor(ctx, -w / 2, w / 2, -d / 2, d / 2, fl);
  if (style === "wash" && ctx.lod <= 2) { paint(ctx, "seam"); for (let x = -w / 2 + 0.6; x < w / 2; x += 0.6) F(ctx, [[x - 0.004, 0.001, -d / 2], [x + 0.004, 0.001, -d / 2], [x + 0.004, 0.001, d / 2], [x - 0.004, 0.001, d / 2]], [0, 1, 0]); }
  if (style === "frozen") { // icicles off the ceiling grid, frost drifts on the floor
    paint(ctx, "ice");
    for (let i = 0; i < 40; i++) { const x = (rnd() - 0.5) * (w - 1), z = (rnd() - 0.5) * (d - 1), L = 0.15 + rnd() * 0.6, r = 0.02 + rnd() * 0.04, y = h - 0.14; F(ctx, [[x - r, y, z], [x + r, y, z], [x, y - L, z + 0.01]], [0, 0, 1]); F(ctx, [[x, y, z - r], [x, y, z + r], [x + 0.01, y - L, z]], [1, 0, 0]); }
    for (let i = 0; i < 14; i++) { const x = (rnd() - 0.5) * (w - 1), z = (rnd() - 0.5) * (d - 1), s = 0.4 + rnd() * 1.2; paint(ctx, "ice", 0.85); F(ctx, [[x - s, 0.01, z], [x, 0.04, z - s * 0.6], [x + s, 0.01, z], [x, 0.03, z + s * 0.7]], [0, 1, 0]); }
  }
  if (style === "hot") { // soot fans up the walls, a glowing vent row
    for (let i = 0; i < 10; i++) { const x = (rnd() - 0.5) * (w - 2); ctx.albedo(null); ctx.color("#1a1512", 0.7); ctx.roughness(1); F(ctx, [[x - 0.4, 0.3, -d / 2 + 0.06], [x + 0.4, 0.3, -d / 2 + 0.06], [x + 0.9, 2.6, -d / 2 + 0.06], [x - 0.9, 2.6, -d / 2 + 0.06]], [0, 0, 1]); }
    glow(ctx, 3.2, 0.9, 0.2); for (let x = -w / 2 + 1; x < w / 2 - 1; x += 1.6) F(ctx, [[x, 0.3, -d / 2 + 0.07], [x + 1, 0.3, -d / 2 + 0.07], [x + 1, 0.5, -d / 2 + 0.07], [x, 0.5, -d / 2 + 0.07]], [0, 0, 1]);
  }
  if (dmg >= 2) debris(ctx, -w / 2 + 0.5, w / 2 - 0.5, -d / 2 + 0.5, d / 2 - 0.5, Math.round(w * d * 0.12 * dmg));
};
// a door frame: opening 1.5 x 2.3 through a wall gap 2.4 wide, depth along z, origin at the floor in the opening's centre
PIECES.doorframe = (ctx, p) => {
  const dp = p.depth ?? 0.7, h = p.h ?? 3.4, ow = 0.75, oh = 2.3, hz = dp / 2, st = p.state ?? "auto";
  paint(ctx, "panel");
  for (const sx of [-1, 1]) cbox(ctx, sx * ow, 0, -hz, sx * 1.22, h, hz, 0.02);
  cbox(ctx, -ow, oh, -hz, ow, h, hz, 0.02);
  paint(ctx, "steel"); // the thick bezel round the opening on both faces
  for (const sz of [-1, 1]) {
    const z0 = sz * hz, z1 = sz * (hz + 0.05);
    for (const sx of [-1, 1]) cbox(ctx, sx * ow, 0, z0, sx * (ow + 0.14), oh + 0.14, z1, 0.015);
    cbox(ctx, -ow - 0.14, oh, z0, ow + 0.14, oh + 0.14, z1, 0.015);
    paint(ctx, "hazard"); for (const sx of [-1, 1]) cbox(ctx, sx * (ow + 0.15), 0.0, z0, sx * (ow + 0.21), 0.9, z0 + sz * 0.012);
    paint(ctx, "dark"); cbox(ctx, -0.12, oh + 0.2, z1, 0.12, oh + 0.34, z1 + sz * 0.03, 0.01);
    if (st === "auto") glow(ctx, 0.3, 2.4, 0.9); else if (st === "stuck") glow(ctx, 2.6, 1.4, 0.2); else glow(ctx, 2.8, 0.25, 0.2);
    cbox(ctx, -0.09, oh + 0.23, z1 + sz * 0.03, 0.09, oh + 0.31, z1 + sz * 0.035);
    paint(ctx, "steel");
  }
  // the leaf track in the head and the floor sill
  paint(ctx, "dark"); cbox(ctx, -1.2, oh - 0.06, -0.06, 1.2, oh, 0.06);
  paint(ctx, "steel"); cbox(ctx, -ow, 0, -hz, ow, 0.012, hz, 0.004);
  paint(ctx, "seam"); cbox(ctx, -ow, 0.012, -0.05, ow, 0.016, 0.05);
};
PIECES.doorleaf = (ctx, p) => {
  const w = p.w ?? 0.76, h = p.h ?? 2.28, t = 0.07;
  paint(ctx, "panel"); cbox(ctx, -w / 2, 0, -t / 2, w / 2, h, t / 2, 0.012);
  paint(ctx, "steel"); for (const sz of [-1, 1]) { cbox(ctx, -w / 2 + 0.05, 0.08, sz * t / 2, w / 2 - 0.05, 0.3, sz * (t / 2 + 0.008), 0.004); }
  paint(ctx, "teal"); for (const sz of [-1, 1]) cbox(ctx, -w / 2, 1.0, sz * t / 2, w / 2, 1.06, sz * (t / 2 + 0.004));
  paint(ctx, "dark"); for (const sz of [-1, 1]) cbox(ctx, -0.09, 1.25, sz * t / 2, 0.09, 1.95, sz * (t / 2 + 0.006), 0.01);
  paint(ctx, "glass", 0.35); for (const sz of [-1, 1]) F(ctx, [[-0.07, 1.27, sz * (t / 2 + 0.007)], [0.07, 1.27, sz * (t / 2 + 0.007)], [0.07, 1.93, sz * (t / 2 + 0.007)], [-0.07, 1.93, sz * (t / 2 + 0.007)]], [0, 0, sz]);
};
// the B.N.T.G. seal on Level 0's east wall: a heavy rounded bulkhead round the 1.5 x 2.3 opening, a pillowed composite
// surround with a steel lip, a hazard band, bolts, hydraulic rams, a card reader and a sign housing; origin as doorframe
PIECES.bulkhead = (ctx, p) => {
  const hz = (p.depth ?? 0.56) / 2, ow = 0.75, oh = 2.3, W = 1.2, H = 2.95, R = 0.55, cy = 1.2, N = ctx.lod <= 2 ? 112 : 56, K = 7, BULGE = 0.085;
  const inner = (a) => { const c = Math.cos(a), s = Math.sin(a); let t = Math.abs(c) > 1e-6 ? ow / Math.abs(c) : 1e9; if (s > 1e-6) t = Math.min(t, (oh - cy) / s); if (s < -1e-6) t = Math.min(t, cy / -s); return [c * t, cy + s * t]; };
  const ins = (x, y) => { if (y < 0 || y > H || Math.abs(x) > W) return false; if (y > H - R && Math.abs(x) > W - R) return (Math.abs(x) - (W - R)) ** 2 + (y - (H - R)) ** 2 <= R * R; return true; };
  const outer = (a) => { const c = Math.cos(a), s = Math.sin(a); let lo = 0, hi = 4; for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (ins(c * m, cy + s * m)) lo = m; else hi = m; } return [c * lo, Math.max(0, cy + s * lo)]; };
  const A = (i) => -Math.PI / 2 + (i / N) * Math.PI * 2;
  const rings = []; for (let i = 0; i <= N; i++) { const a = A(i), I = inner(a), O = outer(a); rings.push({ I, O }); }
  const P = (i, t, side) => { const r = rings[i], x = r.I[0] + (r.O[0] - r.I[0]) * t, y = r.I[1] + (r.O[1] - r.I[1]) * t, b = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.55) * BULGE; return [x, y, side * (hz + b)]; };
  const band = (k, i) => k === 0 || k === K - 1 ? "steel" : k === K - 2 ? (Math.floor(i / 3) % 2 ? "hazard" : "dark") : "panel";
  ctx.smooth();
  for (const side of [-1, 1]) for (let k = 0; k < K; k++) {
    for (let i = 0; i < N; i++) {
      const q = [P(i, k / K, side), P(i + 1, k / K, side), P(i + 1, (k + 1) / K, side), P(i, (k + 1) / K, side)];
      if (Math.abs(q[0][1] - q[3][1]) + Math.abs(q[0][0] - q[3][0]) < 1e-4 && Math.abs(q[1][1] - q[2][1]) + Math.abs(q[1][0] - q[2][0]) < 1e-4) continue;
      paint(ctx, band(k, i)); F(ctx, q, [0, 0, side]);
    }
  }
  // the jamb through the wall and the outer skirt that meets the hull
  paint(ctx, "steel");
  for (let i = 0; i < N; i++) {
    const a = rings[i].I, b = rings[i + 1].I; if (a[1] < 0.001 && b[1] < 0.001) continue;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    F(ctx, [[a[0], a[1], -hz], [b[0], b[1], -hz], [b[0], b[1], hz], [a[0], a[1], hz]], [-mx, cy - my, 0]);
    const c = rings[i].O, d = rings[i + 1].O; if (c[1] < 0.001 && d[1] < 0.001) continue;
    F(ctx, [[c[0], c[1], -hz], [d[0], d[1], -hz], [d[0], d[1], hz], [c[0], c[1], hz]], [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2 - cy, 0]);
  }
  ctx.flat();
  for (const side of [-1, 1]) {
    // bolts round the outer lip
    paint(ctx, "metal");
    for (let i = 2; i < N; i += 4) { const q = P(i, (K - 0.5) / K, side); if (q[1] < 0.08) continue; rod(ctx, q, [q[0], q[1], q[2] + side * 0.018], 0.017, 6); }
    // hydraulic rams up each side: a dark sleeve, a bright rod, end clevises
    for (const sx of [-1, 1]) {
      const x = sx * 0.97, z = side * (hz + 0.13);
      paint(ctx, "dark"); rod(ctx, [x, 0.35, z], [x, 1.25, z], 0.045, 12);
      paint(ctx, "metal"); rod(ctx, [x, 1.25, z], [x, 2.15, z], 0.024, 12);
      paint(ctx, "steel"); cbox(ctx, x - 0.05, 0.22, z - 0.05, x + 0.05, 0.36, z + 0.05, 0.015); cbox(ctx, x - 0.05, 2.12, z - 0.05, x + 0.05, 2.26, z + 0.05, 0.015);
    }
    // the sign housing on the header: a dark rounded tray the placard sits in, amber light strip under it
    paint(ctx, "dark"); cbox(ctx, -0.82, 2.36, side * (hz + 0.06), 0.82, 2.8, side * (hz + 0.11), 0.04);
    glow(ctx, 2.4, 1.3, 0.25); cbox(ctx, -0.6, 2.335, side * (hz + 0.07), 0.6, 2.35, side * (hz + 0.1));
    // a status bead over the opening
    paint(ctx, "dark"); rod(ctx, [0, 2.32, side * (hz + 0.02)], [0, 2.32, side * (hz + 0.07)], 0.05, 14);
  }
  // the card reader on the room side (-z), slot lit red until a key opens it
  const zr = -(hz + 0.1);
  paint(ctx, "dark"); cbox(ctx, -1.08, 1.02, zr - 0.06, -0.9, 1.38, zr, 0.02);
  glow(ctx, 2.8, 0.25, 0.15); cbox(ctx, -1.03, 1.27, zr - 0.065, -0.95, 1.3, zr - 0.06);
  paint(ctx, "seam"); cbox(ctx, -1.035, 1.1, zr - 0.064, -0.945, 1.115, zr - 0.06);
  // the leaf track and the floor sill
  paint(ctx, "dark"); cbox(ctx, -1.15, oh - 0.06, -0.06, 1.15, oh, 0.06);
  paint(ctx, "steel"); cbox(ctx, -ow, 0, -hz, ow, 0.014, hz, 0.005);
  paint(ctx, "hazard"); for (const sz of [-1, 1]) cbox(ctx, -ow, 0.014, sz * (hz - 0.08), ow, 0.018, sz * (hz - 0.02));
};
// a pair of crowd-control posts with a band of tape sagging between them; origin at the middle, posts along x
PIECES.stanchions = (ctx, p) => {
  const w = p.w ?? 2.6, h = 0.95, ends = [[-w / 2, 0, 0], [w / 2, 0, 0]];
  for (const [x] of ends) {
    paint(ctx, "dark"); rod(ctx, [x, 0, 0], [x, 0.03, 0], 0.17, 18);
    paint(ctx, "metal"); rod(ctx, [x, 0.03, 0], [x, h, 0], 0.024, 12); rod(ctx, [x, h, 0], [x, h + 0.05, 0], 0.04, 12);
    paint(ctx, "hazard"); rod(ctx, [x, h - 0.06, 0], [x, h - 0.02, 0], 0.03, 12);
  }
  const pts = sag([-w / 2, h - 0.04, 0], [w / 2, h - 0.04, 0], 0.09, 16), bw = 0.035;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    paint(ctx, i % 2 ? "dark" : "hazard");
    const q = [[a[0], a[1] - bw, 0], [b[0], b[1] - bw, 0], [b[0], b[1] + bw, 0], [a[0], a[1] + bw, 0]];
    F(ctx, q, [0, 0, -1]); F(ctx, q, [0, 0, 1]);
  }
};
// a workstation: a long white desk, pedestals, a bank of monitors (on: 1 lit, 0 dark, cracked: one split screen)
PIECES.desk = (ctx, p) => {
  const w = p.w ?? 2.4, on = p.on ?? 1, n = p.screens ?? 3;
  paint(ctx, "panel"); cbox(ctx, -w / 2, 0.72, -0.4, w / 2, 0.76, 0.4, 0.015);
  paint(ctx, "steel"); cbox(ctx, -w / 2 + 0.05, 0.69, -0.36, w / 2 - 0.05, 0.72, 0.36);
  paint(ctx, "panel"); for (const sx of [-1, 1]) cbox(ctx, sx * (w / 2 - 0.45), 0, -0.36, sx * (w / 2 - 0.03), 0.69, 0.34, 0.01);
  cbox(ctx, -w / 2 + 0.45, 0.25, -0.36, w / 2 - 0.45, 0.69, -0.33);
  paint(ctx, "steel"); for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) cbox(ctx, sx * (w / 2 - 0.36), 0.1 + k * 0.2, 0.34, sx * (w / 2 - 0.12), 0.115 + k * 0.2, 0.355);
  // a raised monitor shelf with the screens
  paint(ctx, "metal"); cbox(ctx, -w / 2 + 0.1, 0.76, -0.38, w / 2 - 0.1, 0.8, -0.18, 0.01);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.62;
    paint(ctx, "steel"); cbox(ctx, x - 0.03, 0.8, -0.3, x + 0.03, 1.0, -0.26);
    paint(ctx, "dark"); cbox(ctx, x - 0.29, 0.95, -0.32, x + 0.29, 1.3, -0.27, 0.01);
    const lit = on > 0 && !(p.cracked && i === 0);
    if (lit) glow(ctx, 0.35 * on, 1.25 * on, 1.4 * on); else paint(ctx, "seam");
    F(ctx, [[x - 0.27, 0.97, -0.268], [x + 0.27, 0.97, -0.268], [x + 0.27, 1.28, -0.268], [x - 0.27, 1.28, -0.268]], [0, 0, 1]);
    if (lit && ctx.lod <= 2) { glow(ctx, 1.6 * on, 1.9 * on, 2.0 * on); for (let k = 0; k < 4; k++) F(ctx, [[x - 0.24, 1.2 - k * 0.05, -0.266], [x - 0.24 + 0.12 + ((i + k) % 3) * 0.1, 1.2 - k * 0.05, -0.266], [x - 0.24 + 0.12 + ((i + k) % 3) * 0.1, 1.212 - k * 0.05, -0.266], [x - 0.24, 1.212 - k * 0.05, -0.266]], [0, 0, 1]); }
    if (p.cracked && i === 0) { paint(ctx, "glass", 0.6); F(ctx, [[x - 0.2, 1.25, -0.265], [x + 0.1, 1.0, -0.265], [x + 0.13, 1.02, -0.265]], [0, 0, 1]); }
  }
  paint(ctx, "dark"); cbox(ctx, -0.25, 0.76, -0.05, 0.25, 0.785, 0.12, 0.008);
  if (ctx.lod <= 2) { paint(ctx, "steel"); for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) cbox(ctx, -0.23 + c * 0.039, 0.785, -0.03 + r * 0.037, -0.2 + c * 0.039, 0.792, -0.002 + r * 0.037); }
  if (p.mug) { paint(ctx, "teal"); rod(ctx, [0.6, 0.76, 0.05], [0.6, 0.86, 0.05], 0.04, 10); }
};
PIECES.chair = (ctx, p) => {
  const tip = p.tipped ? 1 : 0;
  if (tip) { // knocked over: lying on its back
    paint(ctx, "rubber"); cbox(ctx, -0.25, 0.02, -0.28, 0.25, 0.1, 0.24, 0.03); cbox(ctx, -0.22, 0.05, 0.24, 0.22, 0.12, 0.85, 0.03);
    paint(ctx, "steel"); rod(ctx, [0, 0.12, -0.05], [0, 0.4, -0.5], 0.025); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; rod(ctx, [0, 0.4, -0.5], [Math.cos(a) * 0.3, 0.4 + Math.sin(a) * 0.3, -0.55], 0.018, 6); }
    return;
  }
  paint(ctx, "steel");
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; rod(ctx, [0, 0.08, 0], [Math.cos(a) * 0.32, 0.05, Math.sin(a) * 0.32], 0.018, 6); paint(ctx, "rubber"); rod(ctx, [Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32], [Math.cos(a) * 0.32, 0.06, Math.sin(a) * 0.32], 0.03, 8); paint(ctx, "steel"); }
  rod(ctx, [0, 0.07, 0], [0, 0.42, 0], 0.03, 10);
  paint(ctx, "rubber"); cbox(ctx, -0.25, 0.42, -0.24, 0.25, 0.5, 0.24, 0.035);
  cbox(ctx, -0.23, 0.58, 0.22, 0.23, 1.05, 0.29, 0.04);
  paint(ctx, "steel"); rod(ctx, [0, 0.46, 0.2], [0, 0.62, 0.26], 0.02, 6);
  for (const sx of [-1, 1]) { rod(ctx, [sx * 0.24, 0.48, 0.05], [sx * 0.24, 0.66, 0.05], 0.015, 6); paint(ctx, "rubber"); cbox(ctx, sx * 0.21, 0.66, -0.12, sx * 0.27, 0.69, 0.14, 0.01); paint(ctx, "steel"); }
};
PIECES.locker = (ctx, p) => {
  const n = p.n ?? 3, ow = 0.52;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * ow, ajar = p.ajar === i;
    paint(ctx, "steel"); cbox(ctx, x - ow / 2, 0, -0.5, x + ow / 2, 1.95, -0.48);
    for (const sx of [-1, 1]) cbox(ctx, x + sx * (ow / 2 - 0.01), 0, -0.5, x + sx * ow / 2, 1.95, 0);
    cbox(ctx, x - ow / 2, 1.93, -0.5, x + ow / 2, 1.95, 0); cbox(ctx, x - ow / 2, 0, -0.5, x + ow / 2, 0.08, 0);
    if (ajar) {
      paint(ctx, "dark"); cbox(ctx, x - ow / 2 + 0.01, 0.08, -0.48, x + ow / 2 - 0.01, 1.93, -0.47);
      paint(ctx, "cloth"); cbox(ctx, x - 0.12, 0.9, -0.42, x + 0.12, 1.6, -0.3, 0.05); // a jacket still on its hook
      paint(ctx, "panel"); const hx = x - ow / 2; F(ctx, [[hx, 0.1, 0], [hx + 0.2, 0.1, 0.45], [hx + 0.2, 1.9, 0.45], [hx, 1.9, 0]], [1, 0, -0.4]);
    } else {
      paint(ctx, "panel"); cbox(ctx, x - ow / 2 + 0.012, 0.09, -0.02, x + ow / 2 - 0.012, 1.92, 0.0, 0.006);
      paint(ctx, "seam"); for (let k = 0; k < 5; k++) cbox(ctx, x - 0.14, 1.6 + k * 0.045, 0.0, x + 0.14, 1.615 + k * 0.045, 0.004);
      paint(ctx, "steel"); cbox(ctx, x + ow / 2 - 0.09, 0.95, 0, x + ow / 2 - 0.06, 1.15, 0.03, 0.008);
      paint(ctx, "teal"); cbox(ctx, x - 0.1, 1.42, 0, x + 0.1, 1.48, 0.004);
    }
  }
};
// a crew sleep pod built into the wall: shell, mattress, pillow, blanket, reading light, curtain rail
PIECES.pod = (ctx, p) => {
  const lv = p.stack ?? 2;
  for (let k = 0; k < lv; k++) {
    const y = 0.1 + k * 1.15, mess = (p.seed ?? 0) + k;
    paint(ctx, "panel"); cbox(ctx, -1.05, y, -0.55, 1.05, y + 0.06, 0.5, 0.02); cbox(ctx, -1.05, y + 1.0, -0.55, 1.05, y + 1.06, 0.5, 0.02);
    for (const sx of [-1, 1]) cbox(ctx, sx * 1.0, y, -0.55, sx * 1.06, y + 1.06, 0.5, 0.015);
    cbox(ctx, -1.05, y, -0.58, 1.05, y + 1.06, -0.52);
    paint(ctx, "cloth"); cbox(ctx, -0.98, y + 0.06, -0.5, 0.98, y + 0.2, 0.45, 0.05);
    paint(ctx, "sheet"); cbox(ctx, -0.95, y + 0.2, -0.4, -0.6, y + 0.32, 0.3, 0.05);
    paint(ctx, mess % 2 ? "teal" : "cloth"); F(ctx, [[-0.4, y + 0.22, -0.45], [0.95, y + 0.21, -0.45], [0.95, y + 0.24, 0.44], [-0.5, y + 0.28, 0.46]], [0, 1, 0]);
    glow(ctx, 2.2, 1.9, 1.4); cbox(ctx, -0.92, y + 0.95, -0.48, -0.72, y + 1.0, -0.38, 0.01);
    paint(ctx, "steel"); cbox(ctx, -1.0, y + 1.02, 0.47, 1.0, y + 1.04, 0.5);
    if (mess % 3 === 1) { paint(ctx, "sheet"); cbox(ctx, 0.3, y + 0.24, -0.2, 0.5, y + 0.26, 0.05); } // a paperback left open
    if (mess % 3 === 2) { paint(ctx, "amber"); F(ctx, [[-0.5, y + 0.6, -0.515], [-0.2, y + 0.6, -0.515], [-0.2, y + 0.82, -0.515], [-0.5, y + 0.82, -0.515]], [0, 0, 1]); } // a photo taped up
  }
  paint(ctx, "steel"); cbox(ctx, 1.06, 0, 0.3, 1.1, lv * 1.15, 0.36); for (let k = 0; k < lv * 4; k++) cbox(ctx, 1.06, 0.2 + k * 0.28, 0.28, 1.12, 0.23 + k * 0.28, 0.38);
};
PIECES.labbench = (ctx, p) => {
  const w = p.w ?? 3;
  paint(ctx, "panel"); cbox(ctx, -w / 2, 0, -0.38, w / 2, 0.86, 0.38, 0.015);
  paint(ctx, "seam"); for (let x = -w / 2 + 0.6; x < w / 2; x += 0.6) cbox(ctx, x - 0.005, 0.05, 0.38, x + 0.005, 0.84, 0.385);
  paint(ctx, "steel"); for (let x = -w / 2 + 0.3; x < w / 2; x += 0.6) cbox(ctx, x - 0.08, 0.72, 0.38, x + 0.08, 0.74, 0.4);
  paint(ctx, "dark"); cbox(ctx, -w / 2 - 0.02, 0.86, -0.4, w / 2 + 0.02, 0.9, 0.4, 0.01);
  // a glass partition shelf down the middle
  paint(ctx, "metal"); for (const sx of [-1, 1]) cbox(ctx, sx * (w / 2 - 0.05), 0.9, -0.4, sx * (w / 2 - 0.1), 1.8, -0.35);
  cbox(ctx, -w / 2 + 0.05, 1.35, -0.4, w / 2 - 0.05, 1.38, -0.15); cbox(ctx, -w / 2 + 0.05, 1.78, -0.4, w / 2 - 0.05, 1.8, -0.35);
  paint(ctx, "glass", 0.22); F(ctx, [[-w / 2 + 0.1, 0.9, -0.375], [w / 2 - 0.1, 0.9, -0.375], [w / 2 - 0.1, 1.78, -0.375], [-w / 2 + 0.1, 1.78, -0.375]], [0, 0, 1]);
  // equipment
  paint(ctx, "panel"); cbox(ctx, -w / 2 + 0.2, 0.9, -0.3, -w / 2 + 0.7, 1.2, 0.1, 0.03);
  glow(ctx, 0.4, 1.3, 1.5); F(ctx, [[-w / 2 + 0.28, 1.0, 0.101], [-w / 2 + 0.62, 1.0, 0.101], [-w / 2 + 0.62, 1.15, 0.101], [-w / 2 + 0.28, 1.15, 0.101]], [0, 0, 1]);
  paint(ctx, "steel"); rod(ctx, [0.2, 0.9, -0.1], [0.2, 1.08, -0.1], 0.16, 14); paint(ctx, "dark"); rod(ctx, [0.2, 1.08, -0.1], [0.2, 1.1, -0.1], 0.14, 14);
  for (let i = 0; i < 8; i++) { paint(ctx, "glass", 0.45); rod(ctx, [0.7 + i * 0.06, 0.92, 0.1], [0.7 + i * 0.06, 1.05, 0.1], 0.012, 6); if (i % 3 !== 2) { ctx.albedo(null); ctx.color(i % 2 ? "#5aa06a" : "#b8a24a", 0.8); rod(ctx, [0.7 + i * 0.06, 0.92, 0.1], [0.7 + i * 0.06, 0.97, 0.1], 0.011, 6); } }
  paint(ctx, "metal"); cbox(ctx, 0.62, 0.9, 0.06, 1.2, 0.93, 0.14);
  if (p.spill) { ctx.albedo(null); ctx.color("#3b5a3a", 0.75); ctx.roughness(0.05); F(ctx, [[1.1, 0.901, -0.2], [1.5, 0.901, -0.25], [1.45, 0.901, 0.2], [1.05, 0.901, 0.1]], [0, 1, 0]); }
};
// a hydroponic bed: a steel trough of soil, plants (alive or dead), a grow-light bar on posts, a feed line
PIECES.growbed = (ctx, p) => {
  const w = p.w ?? 3.6, dead = p.dead ?? 0, over = p.over ?? 0;
  paint(ctx, "steel"); cbox(ctx, -w / 2, 0.15, -0.5, w / 2, 0.75, 0.5, 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cbox(ctx, sx * (w / 2 - 0.1), 0, sz * 0.4 - 0.04, sx * (w / 2 - 0.02), 0.16, sz * 0.4 + 0.04);
  paint(ctx, "soil"); cbox(ctx, -w / 2 + 0.04, 0.7, -0.46, w / 2 - 0.04, 0.74, 0.46);
  const rows = Math.round(w / 0.3);
  for (let i = 0; i < rows; i++) for (const zz of [-0.25, 0.0, 0.25]) {
    const x = -w / 2 + 0.15 + i * 0.3 + (rnd() - 0.5) * 0.06, z = zz + (rnd() - 0.5) * 0.06, isDead = rnd() < dead;
    paint(ctx, isDead ? "deadplant" : "plant");
    const nb = 5 + Math.floor(rnd() * 4), H = isDead ? 0.12 + rnd() * 0.12 : 0.25 + rnd() * 0.3 + over * 0.6;
    for (let b = 0; b < nb; b++) {
      const a = (b / nb) * Math.PI * 2 + rnd(), lean = isDead ? 0.25 : 0.1 + rnd() * 0.12, bw = 0.035;
      const tx = x + Math.cos(a) * (H * lean + (isDead ? 0.1 : 0)), tz = z + Math.sin(a) * (H * lean + (isDead ? 0.1 : 0)), ty = 0.74 + H * (isDead ? 0.35 : 1);
      const px = -Math.sin(a) * bw, pz = Math.cos(a) * bw;
      F(ctx, [[x - px, 0.74, z - pz], [x + px, 0.74, z + pz], [tx, ty, tz]], [Math.cos(a), 0.3, Math.sin(a)]);
      F(ctx, [[x + px, 0.74, z + pz], [x - px, 0.74, z - pz], [tx, ty, tz]], [-Math.cos(a), 0.3, -Math.sin(a)]);
    }
  }
  if (over > 0) { paint(ctx, "plant"); for (let i = 0; i < over * 12; i++) { const x = (rnd() - 0.5) * w, len = 0.4 + rnd() * 1.0; cable(ctx, [[x, 0.74, 0.48], [x + (rnd() - 0.5) * 0.3, 0.6, 0.6], [x + (rnd() - 0.5) * 0.5, 0.75 - len, 0.65 + rnd() * 0.3]], 0.012); } }
  paint(ctx, "metal"); for (const sx of [-1, 1]) cbox(ctx, sx * (w / 2 - 0.05) - 0.03, 0.75, -0.03, sx * (w / 2 - 0.05) + 0.03, 1.9, 0.03);
  cbox(ctx, -w / 2, 1.85, -0.12, w / 2, 1.95, 0.12, 0.015);
  if (p.lampOff) paint(ctx, "seam"); else glow(ctx, 2.6, 0.8, 2.9);
  F(ctx, [[-w / 2 + 0.05, 1.849, -0.09], [w / 2 - 0.05, 1.849, -0.09], [w / 2 - 0.05, 1.849, 0.09], [-w / 2 + 0.05, 1.849, 0.09]], [0, -1, 0]);
  paint(ctx, "teal"); rod(ctx, [-w / 2, 0.68, 0.52], [w / 2, 0.68, 0.52], 0.02, 6, false);
};
PIECES.counter = (ctx, p) => {
  const w = p.w ?? 3;
  paint(ctx, "panel"); cbox(ctx, -w / 2, 0.1, -0.32, w / 2, 0.88, 0.3, 0.01);
  paint(ctx, "dark"); cbox(ctx, -w / 2 + 0.03, 0, -0.29, w / 2 - 0.03, 0.1, 0.25);
  paint(ctx, "seam"); for (let x = -w / 2 + 0.6; x < w / 2; x += 0.6) cbox(ctx, x - 0.004, 0.12, 0.3, x + 0.004, 0.86, 0.305);
  paint(ctx, "steel"); for (let x = -w / 2 + 0.3; x < w / 2; x += 0.6) cbox(ctx, x - 0.12, 0.78, 0.3, x + 0.12, 0.8, 0.32);
  paint(ctx, "metal"); cbox(ctx, -w / 2, 0.88, -0.34, w / 2, 0.92, 0.32, 0.008);
  paint(ctx, "steel"); cbox(ctx, -0.35, 0.78, -0.22, 0.35, 0.92, 0.2, 0, [3]); // the sink, open on top
  paint(ctx, "seam"); F(ctx, [[-0.33, 0.8, -0.2], [0.33, 0.8, -0.2], [0.33, 0.8, 0.18], [-0.33, 0.8, 0.18]], [0, 1, 0]);
  paint(ctx, "metal"); rod(ctx, [0, 0.92, -0.27], [0, 1.2, -0.27], 0.018, 8); rod(ctx, [0, 1.2, -0.27], [0, 1.2, -0.08], 0.016, 8);
  // wall cabinets and a food synthesiser panel
  paint(ctx, "panel"); cbox(ctx, -w / 2, 1.55, -0.34, w / 2, 2.25, -0.02, 0.01);
  paint(ctx, "seam"); for (let x = -w / 2 + 0.6; x < w / 2; x += 0.6) cbox(ctx, x - 0.004, 1.57, -0.02, x + 0.004, 2.23, -0.015);
  paint(ctx, "dark"); cbox(ctx, w / 2 - 0.75, 0.95, -0.34, w / 2 - 0.1, 1.45, -0.18, 0.02);
  if (p.on ?? 1) glow(ctx, 2.2, 1.4, 0.4); else paint(ctx, "seam");
  F(ctx, [[w / 2 - 0.68, 1.25, -0.179], [w / 2 - 0.17, 1.25, -0.179], [w / 2 - 0.17, 1.4, -0.179], [w / 2 - 0.68, 1.4, -0.179]], [0, 0, 1]);
  paint(ctx, "teal"); rod(ctx, [-0.8, 0.92, 0.0], [-0.8, 1.02, 0.0], 0.04, 10); rod(ctx, [-0.95, 0.92, 0.08], [-0.95, 1.0, 0.08], 0.04, 10); // two cups
};
PIECES.rack = (ctx, p) => {
  const on = p.on ?? 1;
  paint(ctx, "dark"); cbox(ctx, -0.3, 0, -0.5, 0.3, 2.0, 0.5, 0.01);
  paint(ctx, "steel"); for (let k = 0; k < 9; k++) { cbox(ctx, -0.28, 0.12 + k * 0.2, 0.5, 0.28, 0.28 + k * 0.2, 0.52, 0.006); }
  for (let k = 0; k < 9; k++) for (let j = 0; j < 6; j++) {
    const v = ((k * 7 + j * 3 + (p.seed ?? 0)) % 5);
    if (on && v < 3) glow(ctx, v === 0 ? 2.5 : 0.3, v === 0 ? 1.4 : 2.5, 0.3); else paint(ctx, "seam");
    cbox(ctx, -0.24 + j * 0.03, 0.17 + k * 0.2, 0.52, -0.225 + j * 0.03, 0.185 + k * 0.2, 0.525);
  }
};
PIECES.crate = (ctx, p) => {
  const w = p.w ?? 1.2, h = p.h ?? 0.8, d = p.d ?? 0.8;
  paint(ctx, p.skin ?? "panel"); cbox(ctx, -w / 2, 0, -d / 2, w / 2, h, d / 2, 0.04);
  paint(ctx, "steel"); for (const sx of [-1, 1]) cbox(ctx, sx * (w / 2 - 0.1) - 0.04, 0, -d / 2 - 0.01, sx * (w / 2 - 0.1) + 0.04, h + 0.01, d / 2 + 0.01, 0.01);
  paint(ctx, "hazard"); cbox(ctx, -0.25, h * 0.55, d / 2, 0.25, h * 0.7, d / 2 + 0.005);
};
PIECES.pipes = (ctx, p) => {
  const h = p.h ?? 3.4;
  for (const [x, r, k] of [[-0.25, 0.09, "steel"], [0.0, 0.06, "teal"], [0.22, 0.11, "metal"]]) { paint(ctx, k); rod(ctx, [x, 0, 0], [x, h, 0], r, 12, false); }
  paint(ctx, "dark"); for (let y = 0.6; y < h; y += 1.0) cbox(ctx, -0.38, y, -0.14, 0.36, y + 0.06, 0.14, 0.01);
  paint(ctx, "wireR"); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; rod(ctx, [0.22, 1.25, 0.12], [0.22 + Math.cos(a) * 0.14, 1.25 + Math.sin(a) * 0.14, 0.12], 0.012, 5); }
  rod(ctx, [0.22, 1.25, 0.11], [0.22, 1.25, 0.16], 0.03, 8);
  paint(ctx, "hazard"); for (let k = 0; k < 3; k++) cbox(ctx, -0.36, 0.25 + k * 0.08, -0.11, 0.33, 0.29 + k * 0.08, -0.105);
};
PIECES.table = (ctx, p) => {
  const w = p.w ?? 2.2;
  paint(ctx, "panel"); cbox(ctx, -w / 2, 0.72, -0.45, w / 2, 0.76, 0.45, 0.02);
  paint(ctx, "steel"); rod(ctx, [0, 0.0, 0], [0, 0.72, 0], 0.07, 10); cbox(ctx, -0.6, 0, -0.25, 0.6, 0.04, 0.25, 0.01);
  for (const sz of [-1, 1]) { paint(ctx, "panel"); cbox(ctx, -w / 2 + 0.1, 0.44, sz * 0.75 - 0.18, w / 2 - 0.1, 0.48, sz * 0.75 + 0.18, 0.02); paint(ctx, "steel"); for (const sx of [-1, 1]) cbox(ctx, sx * (w / 2 - 0.3) - 0.03, 0, sz * 0.75 - 0.03, sx * (w / 2 - 0.3) + 0.03, 0.44, sz * 0.75 + 0.03); }
  if (p.meal) { paint(ctx, "sheet"); rod(ctx, [-0.4, 0.76, 0.1], [-0.4, 0.78, 0.1], 0.13, 14); paint(ctx, "amber"); rod(ctx, [-0.4, 0.78, 0.1], [-0.4, 0.795, 0.1], 0.09, 12); paint(ctx, "metal"); cbox(ctx, -0.2, 0.765, 0.05, -0.02, 0.77, 0.07); }
};
PIECES.treadmill = (ctx, p) => {
  paint(ctx, "dark"); cbox(ctx, -0.42, 0, -0.95, 0.42, 0.18, 0.95, 0.03);
  paint(ctx, "rubber"); cbox(ctx, -0.33, 0.18, -0.85, 0.33, 0.2, 0.85);
  paint(ctx, "metal"); for (const sx of [-1, 1]) { rod(ctx, [sx * 0.38, 0.18, -0.8], [sx * 0.38, 1.25, -0.95], 0.025, 8); rod(ctx, [sx * 0.38, 1.0, -0.9], [sx * 0.38, 1.0, -0.4], 0.02, 8); }
  paint(ctx, "dark"); cbox(ctx, -0.4, 1.15, -1.05, 0.4, 1.45, -0.9, 0.03);
  if (p.on) glow(ctx, 0.3, 1.6, 1.0); else paint(ctx, "seam");
  F(ctx, [[-0.3, 1.22, -0.899], [0.3, 1.22, -0.899], [0.3, 1.4, -0.899], [-0.3, 1.4, -0.899]], [0, 0.4, 1]);
};
PIECES.stall = (ctx, p) => { // a shower stall: tray, two glass sides, a steel head
  paint(ctx, "tile"); cbox(ctx, -0.5, 0, -0.5, 0.5, 0.06, 0.5, 0.02);
  paint(ctx, "seam"); rod(ctx, [0, 0.055, 0], [0, 0.062, 0], 0.05, 10);
  paint(ctx, "metal"); for (const sx of [-1, 1]) cbox(ctx, sx * 0.5 - 0.02, 0, 0.48, sx * 0.5 + 0.02, 2.1, 0.52);
  cbox(ctx, -0.52, 2.08, -0.5, 0.52, 2.12, 0.52);
  paint(ctx, "glass", p.broken ? 0.12 : 0.25);
  for (const sx of [-1, 1]) F(ctx, [[sx * 0.5, 0.06, -0.5], [sx * 0.5, 0.06, 0.48], [sx * 0.5, 2.08, 0.48], [sx * 0.5, 2.08, -0.5]], [sx, 0, 0]);
  paint(ctx, "metal"); rod(ctx, [0, 1.9, -0.5], [0, 1.95, -0.3], 0.02, 8); rod(ctx, [0, 1.93, -0.3], [0, 1.9, -0.3], 0.07, 12);
};
// the cleaning automaton: a low disc with a bumper, two side brushes and a sensor dome
PIECES.bot = (ctx, p) => {
  ctx.smooth();
  paint(ctx, "panel"); rod(ctx, [0, 0.03, 0], [0, 0.13, 0], 0.3, 20, true);
  paint(ctx, "rubber"); rod(ctx, [0, 0.03, 0], [0, 0.085, 0], 0.31, 20, false);
  paint(ctx, "steel"); rod(ctx, [0, 0.13, 0], [0, 0.15, 0], 0.24, 18, true);
  ctx.flat();
  paint(ctx, "dark"); cbox(ctx, -0.07, 0.15, -0.2, 0.07, 0.2, -0.08, 0.02);
  glow(ctx, 0.3, 2.2, 2.6); cbox(ctx, -0.05, 0.17, -0.205, 0.05, 0.19, -0.2);
  paint(ctx, "teal"); cbox(ctx, -0.12, 0.13, 0.05, 0.12, 0.152, 0.2, 0.01);
  paint(ctx, "wireB"); for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; rod(ctx, [sx * 0.22, 0.02, -0.2], [sx * 0.22 + Math.cos(a) * 0.1, 0.012, -0.2 + Math.sin(a) * 0.1], 0.006, 4, false); }
};
PIECES.debris = (ctx, p) => { debris(ctx, -(p.w ?? 3) / 2, (p.w ?? 3) / 2, -(p.d ?? 3) / 2, (p.d ?? 3) / 2, p.n ?? 20); };
// the gallery window wall: a steel grid of mullions with glass panes; some panes blown out, shards still in the frame
PIECES.window = (ctx, p) => {
  const w = p.w ?? 30, h = p.h ?? 8, cols = Math.round(w / 2.5), rows = 3, broken = p.broken ?? [];
  const pw = w / cols, ph = (h - 0.9) / rows;
  paint(ctx, "metal"); cbox(ctx, -w / 2, 0, -0.3, w / 2, 0.9, 0.2, 0.03); // the sill with its handrail
  cbox(ctx, -w / 2, 1.05, 0.05, w / 2, 1.1, 0.4, 0.015); for (let x = -w / 2 + 1; x < w / 2; x += 2.5) cbox(ctx, x - 0.03, 0.9, 0.25, x + 0.03, 1.05, 0.31);
  for (let i = 0; i <= cols; i++) cbox(ctx, -w / 2 + i * pw - 0.09, 0.9, -0.25, -w / 2 + i * pw + 0.09, h, 0.12, 0.02);
  for (let j = 0; j <= rows; j++) cbox(ctx, -w / 2, 0.9 + j * ph - 0.07, -0.22, w / 2, 0.9 + j * ph + 0.07, 0.1, 0.02);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x0 = -w / 2 + i * pw + 0.09, x1 = x0 + pw - 0.18, y0 = 0.9 + j * ph + 0.07, y1 = y0 + ph - 0.14, id = i * rows + j;
    if (broken.includes(id)) {
      paint(ctx, "glass", 0.4);
      F(ctx, [[x0, y0, -0.05], [x0 + pw * 0.35, y0, -0.05], [x0, y0 + ph * 0.5, -0.05]], [0, 0, 1]);
      F(ctx, [[x1, y1, -0.05], [x1 - pw * 0.25, y1, -0.05], [x1, y1 - ph * 0.3, -0.05]], [0, 0, 1]);
      continue;
    }
    paint(ctx, "glass", 0.12); F(ctx, [[x0, y0, -0.05], [x1, y0, -0.05], [x1, y1, -0.05], [x0, y1, -0.05]], [0, 0, 1]);
  }
};
// the hollow: the inside of the station's spherical shell, seen across the void. Faces point inward.
PIECES.shell = (ctx, p) => {
  const R = p.r ?? 260, la = ctx.lod <= 2 ? 40 : 24, lo = ctx.lod <= 2 ? 80 : 48;
  const P = (i, j) => { const th = (i / la) * Math.PI, ph = (j / lo) * Math.PI * 2; return [R * Math.sin(th) * Math.cos(ph), R * Math.cos(th), R * Math.sin(th) * Math.sin(ph)]; };
  for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) {
    const a = P(i, j), b = P(i, j + 1), c = P(i + 1, j + 1), d = P(i + 1, j), m = [-(a[0] + c[0]) / 2, -(a[1] + c[1]) / 2, -(a[2] + c[2]) / 2];
    const h = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1, dead = h < 0.12;
    if (dead) { ctx.albedo(null); ctx.color("#0a0b0c"); ctx.roughness(1); ctx.metalness(0); ctx.emissive(null); }
    else if (h > 0.93) glow(ctx, 1.6, 1.4, 1.0);
    else if (h > 0.9) glow(ctx, 0.5, 1.1, 1.3);
    else { ctx.albedo(T_METAL); ctx.color(h < 0.5 ? "#8f9298" : "#a8abb0"); ctx.roughness(0.6); ctx.metalness(0.6); ctx.emissive(null); }
    F(ctx, [a, b, c, d], m);
  }
  // ribs: meridians and latitude rings standing proud of the shell
  ctx.albedo(null); ctx.color("#4a4d52"); ctx.metalness(0.7); ctx.roughness(0.5);
  for (let j = 0; j < lo; j += 8) for (let i = 0; i < la; i++) { const a = P(i, j - 0.15), b = P(i, j + 0.15), c = P(i + 1, j + 0.15), d = P(i + 1, j - 0.15), s = 0.985; F(ctx, [a.map((v) => v * s), b.map((v) => v * s), c.map((v) => v * s), d.map((v) => v * s)], [-(a[0] + c[0]), -(a[1] + c[1]), -(a[2] + c[2])]); }
  for (let i = 4; i < la; i += 6) for (let j = 0; j < lo; j++) { const a = P(i - 0.15, j), b = P(i - 0.15, j + 1), c = P(i + 0.15, j + 1), d = P(i + 0.15, j), s = 0.985; F(ctx, [a.map((v) => v * s), b.map((v) => v * s), c.map((v) => v * s), d.map((v) => v * s)], [-(a[0] + c[0]), -(a[1] + c[1]), -(a[2] + c[2])]); }
};
// the spindle through the hollow: a column with lit rings and broken bridges reaching for the shell
PIECES.core = (ctx, p) => {
  const R = p.r ?? 14, H = p.h ?? 480, S = p.span ?? 240;
  ctx.albedo(T_METAL); ctx.color("#7d8188"); ctx.metalness(0.7); ctx.roughness(0.5);
  rod(ctx, [0, -H / 2, 0], [0, H / 2, 0], R, 32, false);
  for (let y = -H / 2 + 20; y < H / 2; y += 24) {
    ctx.albedo(T_METAL); ctx.color("#5d6066"); ctx.emissive(null); rod(ctx, [0, y, 0], [0, y + 3, 0], R + 2, 32, true);
    if (Math.abs(Math.sin(y * 1.7)) > 0.35) { glow(ctx, 2.2, 2.0, 1.6); rod(ctx, [0, y + 1.2, 0], [0, y + 1.8, 0], R + 2.05, 32, false); }
  }
  ctx.albedo(T_METAL); ctx.color("#6b6e74"); ctx.emissive(null);
  const bridges = [[0, 40, 1], [Math.PI * 0.5, -30, 0.55], [Math.PI, 10, 0.8], [Math.PI * 1.5, 70, 0.4], [Math.PI * 0.25, -80, 0.7], [Math.PI * 1.25, -10, 1]];
  for (const [a, y, frac] of bridges) {
    const L = S * frac, dx = Math.cos(a), dz = Math.sin(a), q = [dx * (R + L), y, dz * (R + L)];
    cbox(ctx, Math.min(dx * R, q[0]) - (Math.abs(dz) > 0.5 ? 2 : 0), y - 1.2, Math.min(dz * R, q[2]) - (Math.abs(dx) > 0.5 ? 2 : 0), Math.max(dx * R, q[0]) + (Math.abs(dz) > 0.5 ? 2 : 0), y, Math.max(dz * R, q[2]) + (Math.abs(dx) > 0.5 ? 2 : 0), 0.2);
  }
};

export function geometry(ctx) {
  const p = ctx.params ?? {};
  SEED = ((p.seed ?? 7) * 7919 + 13) % 2147483647 || 1;
  (PIECES[p.kind] ?? PIECES.crate)(ctx, p);
  ctx.albedo(null); ctx.emissive(null); ctx.color(null);
}

// the shells a body touches
export function collider(ctx) {
  const p = ctx.params ?? {}, B = (x0, y0, z0, x1, y1, z1) => ({ kind: "box", width: Math.abs(x1 - x0), height: Math.abs(y1 - y0), depth: Math.abs(z1 - z0), center: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });
  const runs = (s0, s1, doors) => { const out = []; let a = s0; for (const d of [...doors].sort((x, y) => x - y)) { if (d - 0.75 > a) out.push([a, d - 0.75]); a = d + 0.75; } if (s1 > a) out.push([a, s1]); return out; };
  switch (p.kind) {
    case "hall": {
      const L = p.len ?? 12, hw = (p.w ?? 4) / 2, h = p.h ?? 3.2, out = [B(-hw - 0.3, -0.4, -L, hw + 0.3, 0, 0), B(-hw - 0.3, h, -L, hw + 0.3, h + 0.3, 0)];
      for (const [a, b] of runs(-L, 0, p.doorsL ?? [])) out.push(B(-hw - 0.3, 0, a, -hw + 0.05, h, b));
      for (const [a, b] of runs(-L, 0, p.doorsR ?? [])) out.push(B(hw - 0.05, 0, a, hw + 0.3, h, b));
      if (p.endWall) out.push(B(-hw, 0, -L - 0.3, hw, h, -L + 0.05));
      return out;
    }
    case "room": {
      const w = p.w ?? 10, d = p.d ?? 10, h = p.h ?? 3.4, open = p.open ?? [], D = (s) => (p.doors ?? []).filter((q) => q.side === s).map((q) => q.at);
      const out = [B(-w / 2 - 0.3, -0.4, -d / 2 - 0.3, w / 2 + 0.3, 0, d / 2 + 0.3), B(-w / 2 - 0.3, h, -d / 2 - 0.3, w / 2 + 0.3, h + 0.3, d / 2 + 0.3)];
      if (!open.includes("n")) for (const [a, b] of runs(-w / 2, w / 2, D("n"))) out.push(B(a, 0, -d / 2 - 0.3, b, h, -d / 2 + 0.05));
      if (!open.includes("s")) for (const [a, b] of runs(-w / 2, w / 2, D("s"))) out.push(B(a, 0, d / 2 - 0.05, b, h, d / 2 + 0.3));
      if (!open.includes("w")) for (const [a, b] of runs(-d / 2, d / 2, D("w"))) out.push(B(-w / 2 - 0.3, 0, a, -w / 2 + 0.05, h, b));
      if (!open.includes("e")) for (const [a, b] of runs(-d / 2, d / 2, D("e"))) out.push(B(w / 2 - 0.05, 0, a, w / 2 + 0.3, h, b));
      return out;
    }
    case "doorframe": { const dp = (p.depth ?? 0.7) / 2, h = p.h ?? 3.4; return [B(-1.22, 0, -dp, -0.75, h, dp), B(0.75, 0, -dp, 1.22, h, dp), B(-0.75, 2.3, -dp, 0.75, h, dp)]; }
    case "bulkhead": { const dp = (p.depth ?? 0.56) / 2; return [B(-1.2, 0, -dp, -0.75, 2.95, dp), B(0.75, 0, -dp, 1.2, 2.95, dp), B(-0.75, 2.3, -dp, 0.75, 2.95, dp)]; }
    case "stanchions": { const w = p.w ?? 2.6; return [B(-w / 2 - 0.05, 0, -0.04, w / 2 + 0.05, 1, 0.04)]; }
    case "doorleaf": return [B(-0.38, 0, -0.04, 0.38, 2.28, 0.04)];
    case "desk": { const w = p.w ?? 2.4; return [B(-w / 2, 0, -0.4, w / 2, 0.8, 0.4)]; }
    case "chair": return p.tipped ? [B(-0.3, 0, -0.6, 0.3, 0.3, 0.85)] : [B(-0.28, 0, -0.28, 0.28, 0.6, 0.3)];
    case "locker": { const w = (p.n ?? 3) * 0.52; return [B(-w / 2, 0, -0.5, w / 2, 1.95, 0)]; }
    case "pod": return [B(-1.1, 0, -0.58, 1.12, (p.stack ?? 2) * 1.15, 0.5)];
    case "labbench": { const w = p.w ?? 3; return [B(-w / 2, 0, -0.4, w / 2, 0.92, 0.4)]; }
    case "growbed": { const w = p.w ?? 3.6; return [B(-w / 2, 0, -0.5, w / 2, 0.78, 0.5)]; }
    case "counter": { const w = p.w ?? 3; return [B(-w / 2, 0, -0.34, w / 2, 0.92, 0.32)]; }
    case "rack": return [B(-0.3, 0, -0.5, 0.3, 2, 0.52)];
    case "crate": return [B(-(p.w ?? 1.2) / 2, 0, -(p.d ?? 0.8) / 2, (p.w ?? 1.2) / 2, p.h ?? 0.8, (p.d ?? 0.8) / 2)];
    case "pipes": return [B(-0.36, 0, -0.14, 0.36, p.h ?? 3.4, 0.14)];
    case "table": { const w = p.w ?? 2.2; return [B(-w / 2, 0, -0.95, w / 2, 0.76, 0.95)]; }
    case "treadmill": return [B(-0.42, 0, -1.05, 0.42, 0.2, 0.95)];
    case "stall": return [B(-0.52, 0, -0.5, -0.48, 2.1, 0.52), B(0.48, 0, -0.5, 0.52, 2.1, 0.52)];
    case "bot": return [{ kind: "cylinder", radiusTop: 0.31, radiusBottom: 0.31, height: 0.15, center: [0, 0.09, 0] }];
    case "window": { const w = p.w ?? 30, h = p.h ?? 8; return [B(-w / 2, 0, -0.3, w / 2, h, 0.2)]; }
    default: return null;
  }
}
