// One door for every swing-door family: params { style: office|hotel|wood|metal|fire, w, h, part: leaf|frame|set, hingeSide: left|right, swing, vision, wheel, seed }
// w, h = the clear OPENING (the frame's inside). The leaf is w-0.006 wide, h-0.004 tall, 4.4 cm thick.
// PIVOT CONVENTION
//   part "leaf":  origin = the leaf's bottom HINGE corner, on the hinge axis, z centred in the leaf's thickness.
//                 hingeSide "left": the leaf runs along +X from the origin; "right": along -X. Spin rotation.yaw about the feet, no pivot.
//                 Seen from the -Z face, the frame's left jamb is x = -w/2: a left leaf stands at frame-local (-w/2, 0, 0).
//   part "frame": origin = bottom centre of the opening; jambs at |x| > w/2, head at y > h, wall faces at z = +-d/2 (d default 0.11).
//   part "set":   frame + the leaf shut, origin as the frame (static, sealed doors).
//   swing +1: the leaf opens toward +Z (knuckles on +Z, stop on -Z); -1 the other way.
// lod 1: bevels, hinges, screws, rivets; 2: panels and hardware; 3-4: frame + leaf + knob; 5: one box.
import { tube } from "./lib/shapes.js";
const T = 0.044, GAP = 0.003;
const TEX = {
  office: ["cdn/texture-oak-veneer.png", "oklch(0.93 0.03 80)", "cdn/texture-painted-wood-door.png", "oklch(0.95 0.01 90)"],
  hotel: ["cdn/texture-dark-mahogany-wood-grain.png", "oklch(0.92 0.02 50)", "cdn/texture-dark-mahogany-wood-grain.png", "oklch(0.9 0.02 50)"],
  wood: ["cdn/texture-painted-wood-door.png", "oklch(0.96 0.01 90)", "cdn/texture-painted-wood-door.png", "oklch(0.97 0.005 90)"],
  metal: ["cdn/texture-brushed-steel.png", "oklch(0.9 0.01 230)", "cdn/texture-brushed-steel.png", "oklch(0.85 0.01 230)"],
  flat: ["cdn/texture-brown-laminate-flat-apartment-door-veneer.png", "oklch(0.72 0.05 60)", "cdn/texture-painted-wood-door.png", "oklch(0.86 0.03 80)"], // Level 13's flat doors: veneer, peephole, number plate
  plain: ["cdn/texture-painted-wood-door.png", "oklch(0.86 0.1 95)", "cdn/texture-painted-wood-door.png", "oklch(0.8 0.07 92)"], // Level 13's way to Level 0: yellower than the others
  fire: ["cdn/texture-red-painted-steel.png", "oklch(0.92 0.02 30)", "cdn/texture-brushed-steel.png", "oklch(0.85 0.01 230)"],
};
let C, L;
function tri(a, b, c, n) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] >= 0) C.tri(...a, ...b, ...c); else C.tri(...c, ...b, ...a);
}
const quad = (a, b, c, d, n) => { tri(a, b, c, n); tri(a, c, d, n); };
// a box with chamfered edges (b metres); b = 0 or a far level: plain box
function bev(x0, y0, z0, x1, y1, z1, b = 0.004) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  if (L > 2) b = 0; b = Math.min(b, (x1 - x0) * 0.45, (y1 - y0) * 0.45, (z1 - z0) * 0.45);
  const lo = [x0, y0, z0], hi = [x1, y1, z1];
  const V = (s, i) => [0, 1, 2].map((a) => (s[a] < 0 ? lo[a] + i[a] * b : hi[a] - i[a] * b));
  for (let a = 0; a < 3; a++) for (const sa of [-1, 1]) { // faces
    const u = (a + 1) % 3, v = (a + 2) % 3, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => { const s = [0, 0, 0], i = [1, 1, 1]; s[a] = sa; s[u] = su; s[v] = sv; i[a] = 0; return V(s, i); });
    const n = [0, 0, 0]; n[a] = sa; quad(...pts, n);
  }
  if (b <= 0) return;
  for (let a = 0; a < 3; a++) { const u = (a + 1) % 3, v = (a + 2) % 3; // edges along axis a
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      const P = (sa, iu) => { const s = [0, 0, 0], i = [1, 1, 1]; s[a] = sa; s[u] = su; s[v] = sv; i[u] = iu ? 0 : 1; i[v] = iu ? 1 : 0; return V(s, i); };
      const n = [0, 0, 0]; n[u] = su; n[v] = sv; quad(P(-1, 1), P(1, 1), P(1, 0), P(-1, 0), n);
    } }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const s = [sx, sy, sz]; tri(V(s, [0, 1, 1]), V(s, [1, 0, 1]), V(s, [1, 1, 0]), s); }
}
// a round thing turned about the Z axis at (cx, cy), out from z0 along sz: prof = [[r, dz], ...]
function lathe(cx, cy, z0, sz, prof, M = 14) {
  if (L > 2) M = 8;
  C.smooth();
  for (let k = 0; k < prof.length - 1; k++) { const [r0, d0] = prof[k], [r1, d1] = prof[k + 1];
    for (let j = 0; j < M; j++) { const a0 = (j / M) * 6.2832, a1 = ((j + 1) / M) * 6.2832;
      const p = (r, d, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z0 + sz * d];
      const m = (a0 + a1) / 2, n = [Math.cos(m) * (d1 - d0), Math.sin(m) * (d1 - d0), -sz * (r1 - r0)];
      if (Math.abs(r1 - r0) < 1e-6 && Math.abs(d1 - d0) < 1e-6) continue;
      quad(p(r0, d0, a0), p(r0, d0, a1), p(r1, d1, a1), p(r1, d1, a0), Math.hypot(...n) < 1e-9 ? [0, 0, sz] : n);
    } }
  const [rl, dl] = prof[prof.length - 1];
  if (rl > 0) for (let j = 0; j < M; j++) { const a0 = (j / M) * 6.2832, a1 = ((j + 1) / M) * 6.2832; tri([cx, cy, z0 + sz * dl], [cx + Math.cos(a0) * rl, cy + Math.sin(a0) * rl, z0 + sz * dl], [cx + Math.cos(a1) * rl, cy + Math.sin(a1) * rl, z0 + sz * dl], [0, 0, sz]); }
  C.flat();
}
// a vertical cylinder (hinge knuckle) at x,z from y0 to y1
function knuckle(x, z, y0, y1, r) {
  const M = L > 1 ? 8 : 12; C.smooth();
  for (let j = 0; j < M; j++) { const a0 = (j / M) * 6.2832, a1 = ((j + 1) / M) * 6.2832, P = (a, y) => [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
    quad(P(a0, y0), P(a1, y0), P(a1, y1), P(a0, y1), [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]); }
  C.flat();
  for (const [y, s, rr] of [[y0, -1, r], [y1, 1, r]]) for (let j = 0; j < M; j++) { const a0 = (j / M) * 6.2832, a1 = ((j + 1) / M) * 6.2832; tri([x, y, z], [x + Math.cos(a0) * rr, y, z + Math.sin(a0) * rr], [x + Math.cos(a1) * rr, y, z + Math.sin(a1) * rr], [0, s, 0]); }
}
const metal = (css, rough = 0.3) => { C.albedo(null); C.color(css); C.metalness(0.9); C.roughness(rough); };
const BRASS = "oklch(0.74 0.11 82)", STEEL = "oklch(0.72 0.01 240)", BLACK = "oklch(0.24 0.005 250)";
function paint(p, which) { const t = TEX[p.style] ?? TEX.office; C.metalness(p.style === "metal" || p.style === "fire" ? 0.35 : 0); C.roughness(p.style === "hotel" ? 0.45 : 0.6); C.albedo(t[which * 2]); C.color(t[which * 2 + 1]); }
function glass(x0, y0, x1, y1, wired) {
  C.albedo(null); C.color("oklch(0.32 0.03 220)"); C.metalness(0.2); C.roughness(0.05);
  bev(x0, y0, -0.004, x1, y1, 0.004, 0);
  if (wired && L <= 1) { metal("oklch(0.55 0.01 240)", 0.5); const g = 0.025;
    for (let x = Math.min(x0, x1) + g; x < Math.max(x0, x1) - 0.005; x += g) for (const s of [-1, 1]) bev(x - 0.0008, y0, s * 0.0045, x + 0.0008, y1, s * 0.0052, 0);
    for (let y = y0 + g; y < y1 - 0.005; y += g) for (const s of [-1, 1]) bev(x0, y - 0.0008, s * 0.0045, x1, y + 0.0008, s * 0.0052, 0); }
}
// a leaf with a hole (lite) cut through it: four pieces round the hole
function slabWithHole(x0, x1, H, hole, b) {
  if (!hole) return bev(x0, 0, -T / 2, x1, H, T / 2, b);
  const [hx0, hy0, hx1, hy1] = hole, lx = Math.min(x0, x1), rx = Math.max(x0, x1), ax = Math.min(hx0, hx1), bx = Math.max(hx0, hx1);
  bev(lx, 0, -T / 2, ax, H, T / 2, b); bev(bx, 0, -T / 2, rx, H, T / 2, b);
  bev(ax, 0, -T / 2, bx, hy0, T / 2, 0.001); bev(ax, hy1, -T / 2, bx, H, T / 2, 0.001);
  if (L <= 2) for (const s of [-1, 1]) { // the glazing bead round the lite
    bev(ax, hy0, s * T / 2, bx, hy0 + 0.018, s * (T / 2 + 0.008), 0.004); bev(ax, hy1 - 0.018, s * T / 2, bx, hy1, s * (T / 2 + 0.008), 0.004);
    bev(ax, hy0 + 0.018, s * T / 2, ax + 0.018, hy1 - 0.018, s * (T / 2 + 0.008), 0.004); bev(bx - 0.018, hy0 + 0.018, s * T / 2, bx, hy1 - 0.018, s * (T / 2 + 0.008), 0.004); }
}
// stile-and-rail: a frame of members and raised panels in its openings. cols = column count, rails = [y0, y1] of each rail
function framed(X, W, H, cols, rails, raised) {
  const st = 0.115, mu = 0.1, pw = (W - 2 * st - (cols - 1) * mu) / cols;
  bev(X(0), 0, -T / 2, X(st), H, T / 2, 0.005); bev(X(W - st), 0, -T / 2, X(W), H, T / 2, 0.005);
  for (const [y0, y1] of rails) bev(X(st), y0, -T / 2, X(W - st), y1, T / 2, 0.005);
  for (let k = 0; k < rails.length - 1; k++) { const y0 = rails[k][1], y1 = rails[k + 1][0];
    for (let c = 0; c < cols; c++) { const u0 = st + c * (pw + mu), u1 = u0 + pw;
      if (c > 0) bev(X(u0 - mu), y0, -T / 2, X(u0), y1, T / 2, 0.005);
      if (L > 2) { bev(X(u0), y0, -T * 0.2, X(u1), y1, T * 0.2, 0); continue; }
      bev(X(u0), y0, -T * 0.18, X(u1), y1, T * 0.18, 0); // the panel's thin field
      if (raised) bev(X(u0 + 0.012), y0 + 0.012, -T * 0.36, X(u1 - 0.012), y1 - 0.012, T * 0.36, 0.022); // raised centre, wide chamfer = the bevel
      if (L <= 1) for (const s of [-1, 1]) { const z0 = s * T * 0.18, z1 = s * T * 0.5; // the sticking moulding round each panel
        bev(X(u0), y0, z0, X(u1), y0 + 0.012, z1, 0.005); bev(X(u0), y1 - 0.012, z0, X(u1), y1, z1, 0.005);
        bev(X(u0), y0 + 0.012, z0, X(u0 + 0.012), y1 - 0.012, z1, 0.005); bev(X(u1 - 0.012), y0 + 0.012, z0, X(u1), y1 - 0.012, z1, 0.005); }
    } }
}
function lever(x, y, s, toward, brass) { // rose + lever on face s, the lever pointing `toward` (+1/-1 in x)
  metal(brass ? BRASS : STEEL, brass ? 0.25 : 0.35);
  lathe(x, y, s * T / 2, s, [[0.032, 0], [0.032, 0.006], [0.026, 0.01], [0.012, 0.012], [0.01, 0.05], [0, 0.056]]);
  if (L <= 2) tube(C, [[x, y, s * (T / 2 + 0.05)], [x + toward * 0.05, y, s * (T / 2 + 0.058)], [x + toward * 0.115, y - 0.004, s * (T / 2 + 0.05)], [x + toward * 0.13, y - 0.006, s * (T / 2 + 0.042)]], [0.009, 0.009, 0.008, 0.008], 8);
}
function knob(x, y, s, brass) {
  metal(brass ? BRASS : STEEL, 0.25);
  lathe(x, y, s * T / 2, s, [[0.03, 0], [0.03, 0.005], [0.011, 0.01], [0.01, 0.035], [0.026, 0.045], [0.029, 0.058], [0.022, 0.068], [0, 0.071]]);
}
function leaf(p, X, W, H) {
  const st = p.style, hw = st === "hotel" || st === "flat", lx = W - 0.07, hy = 0.95, k = 0.003;
  paint(p, 0);
  if (L >= 5) return bev(X(0), 0, -T / 2, X(W), H, T / 2, 0);
  if (st === "hotel" || st === "wood") {
    if (L > 3) bev(X(0), 0, -T / 2, X(W), H, T / 2, 0);
    else if (st === "hotel") framed(X, W, H, 2, [[0, 0.24], [0.86, 1.06], [1.6, 1.72], [H - 0.13, H]], true);
    else framed(X, W, H, 2, [[0, 0.24], [0.88, 1.06], [H - 0.13, H]], true);
  } else {
    const vis = st === "metal" ? [X(0.3), 1.3, X(W - 0.3), 1.85] : st === "fire" || p.vision ? [X(W - 0.32), 1.05, X(W - 0.2), 1.85] : null;
    slabWithHole(X(0), X(W), H, L <= 3 ? vis : null, 0.004);
    if (vis && L <= 3) glass(vis[0], vis[1], vis[2], vis[3], st !== "office");
    if (L <= 2 && st !== "office") { metal(st === "fire" ? "oklch(0.5 0.12 28)" : STEEL, 0.5); // pressed edge seams
      for (const s of [-1, 1]) { bev(X(0.04), 0.04, s * T / 2, X(W - 0.04), 0.06, s * (T / 2 + 0.003), 0.0015); bev(X(0.04), H - 0.06, s * T / 2, X(W - 0.04), H - 0.04, s * (T / 2 + 0.003), 0.0015); } }
    if (L <= 1 && st === "metal") { metal(STEEL, 0.4); for (const s of [-1, 1]) for (const y of [0.05, H - 0.05]) for (let u = 0.08; u < W - 0.05; u += 0.11) lathe(X(u), y, s * (T / 2 + 0.002), s, [[0.007, 0], [0.006, 0.003], [0, 0.005]], 6); }
  }
  if (L <= 2 && st === "office") { metal(STEEL, 0.35); for (const s of [-1, 1]) bev(X(0.02), 0.02, s * T / 2, X(W - 0.02), 0.25, s * (T / 2 + 0.0025), 0.0015); } // kick plate
  if (L <= 3) { // hardware, both faces
    const s0 = -(p.swing ?? 1); // the push side faces away from the swing
    if (st === "metal" || st === "fire") {
      metal(st === "fire" ? "oklch(0.8 0.01 240)" : STEEL, 0.3);
      bev(X(0.12), 0.98, s0 * T / 2, X(W - 0.05), 1.04, s0 * (T / 2 + 0.07), 0.008); // push bar
      if (L <= 2) for (const u of [0.12, W - 0.11]) bev(X(u), 0.95, s0 * T / 2, X(u + 0.06), 1.07, s0 * (T / 2 + 0.075), 0.01);
      lever(X(lx), hy, -s0, -Math.sign(X(1) - X(0)), false);
    } else for (const s of [-1, 1]) (hw || st === "office" ? lever : knob)(X(lx), hy, s, -Math.sign(X(1) - X(0)), hw);
    if (L <= 2) { metal(hw ? BRASS : STEEL, 0.3); for (const s of [-1, 1]) bev(X(lx - 0.022), hy - 0.13, s * T / 2, X(lx + 0.022), hy - 0.08, s * (T / 2 + 0.004), 0.002); } // key escutcheon
  }
  if (hw && L <= 2) { metal(BRASS, 0.25); const sOut = -(p.swing ?? 1);
    lathe(X(W / 2), 1.52, sOut * T / 2, sOut, [[0.014, 0], [0.014, 0.006], [0.008, 0.01], [0, 0.011]], 10); // peephole
    bev(X(W / 2 - 0.09), 1.62, sOut * T / 2, X(W / 2 + 0.09), 1.7, sOut * (T / 2 + 0.006), 0.003); // the number plate's frame
    C.color("oklch(0.25 0.02 60)"); C.metalness(0.1); bev(X(W / 2 - 0.08), 1.63, sOut * T / 2, X(W / 2 + 0.08), 1.69, sOut * (T / 2 + 0.0075), 0); }
  if (st === "fire" && L <= 2) { metal("oklch(0.35 0.005 250)", 0.4); const sP = p.swing ?? 1; // overhead closer on the pull face
    bev(X(0.06), H - 0.17, sP * T / 2, X(0.36), H - 0.1, sP * (T / 2 + 0.06), 0.01);
    if (L <= 1) { tube(C, [[X(0.3), H - 0.13, sP * (T / 2 + 0.065)], [X(0.52), H - 0.07, sP * (T / 2 + 0.07)]], [0.008, 0.008], 6);
      tube(C, [[X(0.52), H - 0.07, sP * (T / 2 + 0.07)], [X(0.4), H - 0.03, sP * (T / 2 + 0.03)]], [0.007, 0.007], 6); } }
  if (L <= 3) { metal(hw ? BRASS : st === "metal" || st === "fire" ? BLACK : "oklch(0.6 0.03 70)", 0.35); // three butt hinges
    const sP = p.swing ?? 1;
    for (const y of [0.23, H / 2 + 0.05, H - 0.25]) {
      knuckle(0, sP * (T / 2 + 0.002), y - 0.05, y + 0.05, 0.009);
      if (L <= 1) { knuckle(0, sP * (T / 2 + 0.002), y + 0.05, y + 0.058, 0.0055); knuckle(0, sP * (T / 2 + 0.002), y - 0.058, y - 0.05, 0.0055); // pin finials
        bev(X(0.001), y - 0.05, -T / 2 + 0.006, X(-0.001), y + 0.05, T / 2 - 0.004, 0); C.color(BLACK); for (const dy of [-0.03, 0, 0.03]) lathe(X(0.0005), y + dy, sP * (T / 2 + 0.001), sP, [[0.003, 0], [0, 0.001]], 5); metal(hw ? BRASS : STEEL, 0.35); }
    } }
}
function frame(p, w, h) {
  const d = p.d ?? 0.11, F = 0.07, hw = w / 2, sw = p.swing ?? 1;
  paint(p, 1);
  if (L >= 5) { bev(-hw - F, 0, -d / 2, -hw, h, d / 2, 0); bev(hw, 0, -d / 2, hw + F, h, d / 2, 0); bev(-hw - F, h, -d / 2, hw + F, h + F, d / 2, 0); return; }
  const b = 0.003;
  bev(-hw - F, 0, -d / 2, -hw, h + F, d / 2, b); bev(hw, 0, -d / 2, hw + F, h + F, d / 2, b); bev(-hw, h, -d / 2, hw, h + F, d / 2, b); // jambs + head
  const z0 = -sw * T / 2, z1 = -sw * (T / 2 + 0.035); // the stop the shut leaf lands on (1.5 cm proud)
  bev(-hw, 0, z0, -hw + 0.015, h, z1, 0.003); bev(hw - 0.015, 0, z0, hw, h, z1, 0.003); bev(-hw, h - 0.015, z0, hw, h, z1, 0.003);
  if (L <= 3) for (const s of [-1, 1]) { const zf = s * d / 2; // 3-step casing, both faces, plinth blocks at the foot
    const steps = L <= 2 ? [[0, 0.075, 0.012], [0.012, 0.075, 0.02], [0.034, 0.075, 0.027]] : [[0, 0.075, 0.02]];
    for (const [i0, i1, th] of steps) { bev(-hw - i1, 0.2, zf, -hw - i0, h + i0, zf + s * th, 0.004); bev(hw + i0, 0.2, zf, hw + i1, h + i0, zf + s * th, 0.004); bev(-hw - i1, h + i0, zf, hw + i1, h + i1, zf + s * th, 0.004); }
    for (const sx of [-1, 1]) bev(sx * (hw - 0.004), 0, zf, sx * (hw + 0.085), 0.2, zf + s * 0.032, 0.005);
  }
  if (L <= 2) { metal("oklch(0.62 0.04 75)", 0.4); bev(-hw, 0, -d / 2 + 0.005, hw, 0.014, d / 2 - 0.005, 0.005); // threshold strip
    const lx = p.hingeSide === "right" ? -hw : hw; metal(p.style === "hotel" ? BRASS : STEEL, 0.3); // latch strike plate
    bev(lx - Math.sign(lx) * 0.002, 0.9, -0.012, lx, 1.0, 0.012, 0.001); }
}
export function geometry(ctx) {
  C = ctx; L = ctx.lod ?? 1; const p = ctx.params ?? {}, w = p.w ?? 0.92, h = p.h ?? 2.1, part = p.part ?? "leaf";
  const W = w - 2 * GAP, H = h - 0.004, dir = p.hingeSide === "right" ? -1 : 1;
  if (part === "frame" || part === "set") frame(p, w, h);
  if (part === "leaf") leaf(p, (u) => dir * u, W, H);
  if (part === "set") leaf(p, (u) => -dir * w / 2 + dir * GAP + dir * u, W, H);
  if (p.wheel && L <= 3) { metal("oklch(0.5 0.08 30)", 0.5); const n = 16, pts = [], r = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * 6.2832; pts.push([Math.cos(a) * 0.22, 1.2 + Math.sin(a) * 0.22, -0.08]); r.push(0.014); }
    tube(C, pts, r, 8); lathe(0, 1.2, -T / 2, -1, [[0.04, 0], [0.03, 0.06], [0, 0.065]]); for (const a of [0, 2.09, 4.19]) tube(C, [[0, 1.2, -0.075], [Math.cos(a) * 0.21, 1.2 + Math.sin(a) * 0.21, -0.08]], [0.01, 0.01], 6); }
  C.albedo(null);
  return { uvProjection: "box" };
}
export function collider(ctx) {
  const p = ctx.params ?? {}, w = p.w ?? 0.92, h = p.h ?? 2.1, part = p.part ?? "leaf", d = p.d ?? 0.11, F = 0.07, dir = p.hingeSide === "right" ? -1 : 1;
  if (part === "leaf") { const W = w - 2 * GAP; return { kind: "box", width: W, height: h - 0.004, depth: T, center: [dir * W / 2, (h - 0.004) / 2, 0] }; }
  const out = [{ kind: "box", width: F, height: h + F, depth: d, center: [-w / 2 - F / 2, (h + F) / 2, 0] }, { kind: "box", width: F, height: h + F, depth: d, center: [w / 2 + F / 2, (h + F) / 2, 0] }, { kind: "box", width: w, height: F, depth: d, center: [0, h + F / 2, 0] }];
  if (part === "set") out.push({ kind: "box", width: w, height: h, depth: T, center: [0, h / 2, 0] });
  return out;
}
