// The S.S. Fun =) seen from outside, grounded in another level: one scripted geometry, params.part picks the piece.
// hull: 150 m liner, curved raked bow, rounded stern, three window decks, one funnel, bunting and balloons, listing to starboard.
// gangway: ramp + landing + handrails (params rise, run, plat). gate: the deck gangway gate on Level 26. popped / hat: party litter.
const LEN = 150, HB = 9, HD = 12, DOORZ = 8, DOORY = 5;
const PARTY = ["#e8443a", "#f6c435", "#2fb7b0", "#ef6fae", "#6cc04a", "#5a7bea"];

function mk(ctx, listDeg) {
  const a = (listDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const T = (p) => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c, p[2]];
  const quad = (A, B, C, D, out) => {
    const [a1, b1, c1, d1] = [T(A), T(B), T(C), T(D)], o = T(out);
    const u = [b1[0] - a1[0], b1[1] - a1[1], b1[2] - a1[2]], v = [c1[0] - a1[0], c1[1] - a1[1], c1[2] - a1[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (n[0] * o[0] + n[1] * o[1] + n[2] * o[2] >= 0) ctx.quad(...a1, ...b1, ...c1, ...d1);
    else ctx.quad(...a1, ...d1, ...c1, ...b1);
  };
  const tri = (A, B, C) => { const [a1, b1, c1] = [T(A), T(B), T(C)]; ctx.tri(...a1, ...b1, ...c1); };
  // a closed box, axis aligned before the list
  const box = (x0, y0, z0, x1, y1, z1) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1]);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
    quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0]);
    quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0]);
    quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
    void cx; void cy; void cz;
  };
  // a tube from p to q, n sides
  const tube = (p, q, r, n = 6) => {
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d) || 1, k = d.map((v) => v / L);
    const up = Math.abs(k[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let e1 = [up[1] * k[2] - up[2] * k[1], up[2] * k[0] - up[0] * k[2], up[0] * k[1] - up[1] * k[0]];
    const l1 = Math.hypot(...e1); e1 = e1.map((v) => v / l1);
    const e2 = [k[1] * e1[2] - k[2] * e1[1], k[2] * e1[0] - k[0] * e1[2], k[0] * e1[1] - k[1] * e1[0]];
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * 6.2832, t1 = ((i + 1) / n) * 6.2832;
      const o0 = e1.map((v, j) => v * Math.cos(t0) + e2[j] * Math.sin(t0)), o1 = e1.map((v, j) => v * Math.cos(t1) + e2[j] * Math.sin(t1));
      const om = o0.map((v, j) => v + o1[j]);
      quad(p.map((v, j) => v + o0[j] * r), q.map((v, j) => v + o0[j] * r), q.map((v, j) => v + o1[j] * r), p.map((v, j) => v + o1[j] * r), om);
    }
  };
  const sphere = (cx, cy, cz, rx, ry, seg, ring) => {
    for (let j = 0; j < ring; j++) for (let i = 0; i < seg; i++) {
      const P = (ii, jj) => { const th = (ii / seg) * 6.2832, ph = (jj / ring) * Math.PI; return [cx + rx * Math.sin(ph) * Math.cos(th), cy - ry * Math.cos(ph), cz + rx * Math.sin(ph) * Math.sin(th)]; };
      const A = P(i, j), B = P(i + 1, j), C = P(i + 1, j + 1), D = P(i, j + 1);
      quad(A, B, C, D, [(A[0] + C[0]) / 2 - cx, (A[1] + C[1]) / 2 - cy, (A[2] + C[2]) / 2 - cz]);
    }
  };
  return { quad, tri, box, tube, sphere, T };
}

// hull half-width at station u (0 bow .. 1 stern) and height y
function W(u, y) {
  let w = HB;
  if (u < 0.24) { const s = u / 0.24; w = HB * Math.pow(Math.sin((s * Math.PI) / 2), 0.8); w *= 1 - (1 - s) * 0.42 * (1 - y / HD); }
  else if (u > 0.86) { const s = (u - 0.86) / 0.14; w = HB * Math.sqrt(Math.max(0, 1 - s * s)); }
  if (y < 3) w *= 0.3 + 0.7 * Math.sqrt(1 - Math.pow(1 - y / 3, 2));
  return w;
}
function Z(u, y) {
  let z = -LEN / 2 + LEN * u;
  if (u < 0.24) z += 7 * (1 - y / HD) * Math.pow(1 - u / 0.24, 3);   // raked stem: the keel tucks back under a forward-leaning bow
  if (u > 0.86) z -= 5 * (1 - y / HD) * Math.pow((u - 0.86) / 0.14, 2); // the stern overhangs its keel
  return z;
}

function hull(ctx) {
  const lod = ctx.lod, g = mk(ctx, ctx.params.list ?? 4), { quad, tube, sphere } = g;
  const NS = lod <= 1 ? 72 : lod <= 2 ? 48 : lod <= 3 ? 28 : 14;
  const us = []; for (let i = 0; i <= NS; i++) { const t = i / NS; us.push(t < 0.5 ? 0.5 * Math.pow(2 * t, 1.6) : 1 - 0.5 * Math.pow(2 * (1 - t), 1.6)); }
  const ys = lod <= 2 ? [0, 0.4, 1, 1.8, 3, 5, 7, 9.5, HD] : [0, 1, 3, 7, HD];
  const pt = (u, y, side) => [side * W(u, y), y, Z(u, y)];
  // skin
  ctx.albedo("cdn/texture-painted-steel-plate.png");
  ctx.smooth();
  for (const side of [-1, 1]) for (let i = 0; i < NS; i++) for (let j = 0; j < ys.length - 1; j++) {
    const u0 = us[i], u1 = us[i + 1], y0 = ys[j], y1 = ys[j + 1];
    const A = pt(u0, y0, side), B = pt(u1, y0, side), C = pt(u1, y1, side), D = pt(u0, y1, side);
    const zc = (A[2] + C[2]) / 2, out = [side * Math.max(0.2, (A[0] + C[0]) / 2 * side), 0, zc < -40 ? zc + 40 : zc > 50 ? zc - 50 : 0];
    if (y1 <= 1.8) ctx.color("oklch(0.42 0.12 30)");           // red boot-topping, mostly sunk in sand
    else if (y0 >= 9.5 && y1 <= HD) ctx.color("oklch(0.97 0.01 95)");
    else ctx.color("oklch(0.95 0.012 90)");
    quad(A, B, C, D, out);
  }
  ctx.flat();
  // keel strip and main deck
  for (let i = 0; i < NS; i++) {
    const u0 = us[i], u1 = us[i + 1];
    ctx.color("oklch(0.4 0.1 30)");
    quad(pt(u0, 0, -1), pt(u1, 0, -1), pt(u1, 0, 1), pt(u0, 0, 1), [0, -1, 0]);
  }
  ctx.albedo("cdn/texture-teak-ship-deck-planks.png"); ctx.color("oklch(0.93 0.03 70)");
  for (let i = 0; i < NS; i++) { const u0 = us[i], u1 = us[i + 1]; quad(pt(u0, HD, -1), pt(u1, HD, -1), pt(u1, HD, 1), pt(u0, HD, 1), [0, 1, 0]); }
  ctx.albedo(null);
  // bulwark band (white rail wall) and a navy sheer stripe
  for (let i = 0; i < NS; i++) for (const side of [-1, 1]) {
    const u0 = us[i], u1 = us[i + 1], A = pt(u0, HD, side), B = pt(u1, HD, side);
    ctx.color("oklch(0.97 0.008 95)");
    quad(A, B, [B[0], HD + 1.1, B[2]], [A[0], HD + 1.1, A[2]], [side, 0, 0]);
    if (lod <= 3 && u0 > 0.02 && u1 < 0.98) {
      const a2 = pt(u0, 10.6, side), b2 = pt(u1, 10.6, side), e = side * 0.04;
      ctx.color("oklch(0.32 0.1 255)");
      quad([a2[0] + e, 10.6, a2[2]], [b2[0] + e, 10.6, b2[2]], [b2[0] + e, 11.1, b2[2]], [a2[0] + e, 11.1, a2[2]], [side, 0, 0]);
    }
  }
  if (lod <= 2) {
    // portholes, two rows, and rust streaks weeping down from them and the hawse pipes
    let k = 0;
    for (const side of [-1, 1]) for (let z = -48; z <= 58; z += 2.6) {
      const u = (z + LEN / 2) / LEN;
      for (const y of [7.6, 9.6]) {
        if (Math.abs(z - DOORZ) < 3 && y < 8.5) continue;
        const x = side * (W(u, y) + 0.05);
        ctx.color("oklch(0.26 0.03 230)"); ctx.emissive(k % 7 === 0 ? "oklch(0.55 0.1 80)" : null);
        quad([x, y - 0.3, z - 0.3], [x, y - 0.3, z + 0.3], [x, y + 0.3, z + 0.3], [x, y + 0.3, z - 0.3], [side, 0, 0]);
        ctx.emissive(null);
        k++;
        const r = Math.sin(z * 12.9898 + side * 78.233 + y) * 43758.5453, f = r - Math.floor(r);
        if (f < 0.45) {
          const len = 1.5 + f * 9, wdt = 0.12 + f * 0.35, x2 = side * (W(u, y - len) + 0.07);
          ctx.color(`oklch(0.48 0.11 45 / ${0.35 + f})`);
          quad([side * (W(u, y) + 0.07), y - 0.32, z - wdt], [side * (W(u, y) + 0.07), y - 0.32, z + wdt], [x2, y - len, z + wdt * 0.4], [x2, y - len, z - wdt * 0.4], [side, 0, 0]);
        }
      }
    }
    for (const side of [-1, 1]) { // anchor hawse with a long rust run down the bow
      const z = -58, u = (z + LEN / 2) / LEN, x = side * (W(u, 10) + 0.06);
      ctx.color("oklch(0.22 0.02 40)"); quad([x, 9.6, z - 0.6], [x, 9.6, z + 0.6], [x, 10.5, z + 0.6], [x, 10.5, z - 0.6], [side, 0, 0]);
      const x2 = side * (W(u, 3) + 0.08);
      ctx.color("oklch(0.45 0.12 45 / 0.75)"); quad([x, 9.6, z - 0.5], [x, 9.6, z + 0.5], [x2, 3, z + 1.4], [x2, 3, z + 0.4], [side, 0, 0]);
    }
  }
  // the port shell door the gangway meets: frame and a lit interior
  {
    const x = -W(0.5, 6) - 0.06;
    ctx.color("oklch(0.85 0.02 90)"); g.box(x - 0.12, DOORY - 0.2, DOORZ - 1.55, x + 0.02, DOORY + 2.75, DOORZ + 1.55);
    ctx.color("oklch(0.32 0.05 60)"); ctx.emissive("oklch(0.62 0.12 75)");
    quad([x - 0.14, DOORY, DOORZ - 1.2], [x - 0.14, DOORY, DOORZ + 1.2], [x - 0.14, DOORY + 2.4, DOORZ + 1.2], [x - 0.14, DOORY + 2.4, DOORZ - 1.2], [-1, 0, 0]);
    ctx.emissive(null);
  }
  // superstructure: three window decks with rounded fronts
  const tiers = [[-44, 54, 8.0], [-38, 47, 7.3], [-31, 38, 6.5]];
  for (let k = 0; k < 3; k++) {
    const [zf, zr, hw] = tiers[k], y0 = HD + 3 * k, y1 = y0 + 3, pts = [];
    const nArc = lod <= 2 ? 14 : 6;
    for (let i = 0; i <= nArc; i++) { const t = Math.PI + (i / nArc) * Math.PI; pts.push([hw * Math.cos(t) * -1 * -1, zf + hw + hw * Math.sin(t) * 0.9]); }
    const rc = 2.2; for (let i = 0; i <= 4; i++) { const t = (i / 4) * (Math.PI / 2); pts.push([hw - rc + rc * Math.cos(t), zr - rc + rc * Math.sin(t)]); }
    for (let i = 0; i <= 4; i++) { const t = Math.PI / 2 + (i / 4) * (Math.PI / 2); pts.push([-hw + rc + rc * Math.cos(t), zr - rc + rc * Math.sin(t)]); }
    const cz = (zf + zr) / 2;
    ctx.smooth();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      ctx.color("oklch(0.97 0.006 95)");
      quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [(p[0] + q[0]) / 2, 0, (p[1] + q[1]) / 2 - cz]);
    }
    ctx.flat();
    // roof (fan) with an overhang lip
    ctx.color(k === 2 ? "oklch(0.72 0.05 200)" : "oklch(0.9 0.01 90)");
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; quad([0, y1, cz], [0, y1, cz], [q[0] * 1.03, y1, cz + (q[1] - cz) * 1.01], [p[0] * 1.03, y1, cz + (p[1] - cz) * 1.01], [0, 1, 0]); }
    // windows
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.2) continue;
      const nx = (q[1] - p[1]) / L, nz = -(q[0] - p[0]) / L, sgn = (nx * ((p[0] + q[0]) / 2) + nz * ((p[1] + q[1]) / 2 - cz)) > 0 ? 1 : -1, ox = nx * sgn * 0.05, oz = nz * sgn * 0.05;
      if (lod <= 2) {
        const n = Math.max(1, Math.floor(L / 1.9));
        for (let w = 0; w < n; w++) {
          const t0 = (w + 0.18) / n, t1 = (w + 0.82) / n, A = [p[0] + (q[0] - p[0]) * t0 + ox, p[1] + (q[1] - p[1]) * t0 + oz], B = [p[0] + (q[0] - p[0]) * t1 + ox, p[1] + (q[1] - p[1]) * t1 + oz];
          const lit = Math.sin(i * 31.7 + w * 7.3 + k * 3.1) > 0.55;
          ctx.color(lit ? "oklch(0.6 0.08 80)" : "oklch(0.3 0.05 225)"); ctx.metalness(0.4); ctx.roughness(0.15); ctx.emissive(lit ? "oklch(0.5 0.1 80)" : null);
          quad([A[0], y0 + 0.9, A[1]], [B[0], y0 + 0.9, B[1]], [B[0], y0 + 2.4, B[1]], [A[0], y0 + 2.4, A[1]], [ox, 0, oz]);
        }
        ctx.emissive(null); ctx.metalness(null); ctx.roughness(null);
      } else {
        ctx.color("oklch(0.3 0.05 225)");
        quad([p[0] + ox, y0 + 0.9, p[1] + oz], [q[0] + ox, y0 + 0.9, q[1] + oz], [q[0] + ox, y0 + 2.4, q[1] + oz], [p[0] + ox, y0 + 2.4, p[1] + oz], [ox, 0, oz]);
      }
    }
  }
  // funnel: raked ellipse, white, a party-red band, black top
  {
    const n = lod <= 2 ? 20 : 10, rows = [[21, 0, "oklch(0.97 0.006 95)"], [26.6, 1.0, "oklch(0.55 0.2 25)"], [28.0, 1.25, "oklch(0.97 0.006 95)"], [29.2, 1.5, "oklch(0.15 0.01 250)"], [30.2, 1.7, null]];
    ctx.smooth();
    for (let r = 0; r < rows.length - 1; r++) {
      const [ya, za] = rows[r], [yb, zb] = rows[r + 1]; ctx.color(rows[r][2]);
      for (let i = 0; i < n; i++) {
        const t0 = (i / n) * 6.2832, t1 = ((i + 1) / n) * 6.2832, P = (t, y, dz) => [2.7 * Math.cos(t), y, 20 + dz + 4.2 * Math.sin(t)];
        quad(P(t0, ya, za), P(t1, ya, za), P(t1, yb, zb), P(t0, yb, zb), [Math.cos(t0 + 0.15), 0, Math.sin(t0 + 0.15)]);
      }
    }
    ctx.flat(); ctx.color("oklch(0.1 0 0)");
    for (let i = 0; i < n; i++) { const t0 = (i / n) * 6.2832, t1 = ((i + 1) / n) * 6.2832; quad([0, 30, 21.6], [0, 30, 21.6], [2.6 * Math.cos(t1), 30, 21.6 + 4.1 * Math.sin(t1)], [2.6 * Math.cos(t0), 30, 21.6 + 4.1 * Math.sin(t0)], [0, 1, 0]); }
  }
  // mast
  ctx.color("oklch(0.95 0.01 90)"); tube([0, 21, -26], [0, 31, -27], 0.22, lod <= 2 ? 8 : 4);
  if (lod > 2) return;
  // rails above the bulwark: posts and a top rail
  ctx.color("oklch(0.97 0.006 95)");
  const railPts = (side) => { const r = []; for (let z = -66; z <= 70; z += 4) { const u = (z + LEN / 2) / LEN; r.push([side * (W(u, HD) - 0.1), HD + 1.1, z]); } return r; };
  if (lod <= 1) for (const side of [-1, 1]) { const rp = railPts(side); for (let i = 0; i < rp.length - 1; i++) tube(rp[i], rp[i + 1], 0.05, 4); }
  // bunting: mast to bow, mast to funnel, funnel to stern, and swags along both rails
  const flags = (p, q, sag, step) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), n = Math.max(2, Math.floor(L / step));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n, P = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t - sag * 4 * t * (1 - t), p[2] + (q[2] - p[2]) * t];
      if (prev) {
        ctx.color("oklch(0.3 0.01 250)"); tube(prev, P, 0.02, 3);
        const d = [P[0] - prev[0], P[1] - prev[1], P[2] - prev[2]];
        ctx.color(PARTY[(i + Math.round(p[2])) % PARTY.length]);
        g.tri(prev, [prev[0] + d[0] * 0.8, prev[1] + d[1] * 0.8, prev[2] + d[2] * 0.8], [prev[0] + d[0] * 0.4, prev[1] + d[1] * 0.4 - 0.45, prev[2] + d[2] * 0.4]);
      }
      prev = P;
    }
  };
  flags([0, 31, -27], [0, HD + 1.2, -74], 2.5, 0.9);
  flags([0, 31, -27], [0, 30.4, 18], 2.2, 0.9);
  flags([0, 30.4, 22], [0, HD + 1.2, 72], 2.5, 0.9);
  for (const side of [-1, 1]) { const rp = railPts(side); for (let i = 0; i < rp.length - 2; i += 2) flags([rp[i][0] * 1.01, rp[i][1] + 0.05, rp[i][2]], [rp[i + 2][0] * 1.01, rp[i + 2][1] + 0.05, rp[i + 2][2]], 0.7, 0.8); }
  // balloon bunches tied along the rail
  const segB = lod <= 1 ? 10 : 7, ringB = lod <= 1 ? 7 : 5;
  for (const side of [-1, 1]) { const rp = railPts(side); for (let i = 1; i < rp.length - 1; i += 3) {
    const [x, y, z] = rp[i];
    for (let b = 0; b < 3; b++) {
      const bx = x + side * (0.3 + 0.25 * b), by = y + 1.4 + 0.45 * ((b * 7 + i) % 3), bz = z + (b - 1) * 0.55;
      ctx.color("oklch(0.85 0.01 90)"); tube([x, y, z], [bx, by - 0.5, bz], 0.008, 3);
      ctx.color(PARTY[(i + b * 2 + (side > 0 ? 1 : 0)) % PARTY.length]); ctx.roughness(0.25); ctx.smooth();
      sphere(bx, by, bz, 0.42, 0.5, segB, ringB); ctx.flat(); ctx.roughness(null);
    }
  } }
}

function gangway(ctx) {
  const g = mk(ctx, 0), rise = ctx.params.rise ?? 3.6, run = ctx.params.run ?? 12, plat = ctx.params.plat ?? 1.6, hw = 0.8;
  const yAt = (z) => (z >= 0 ? 0 : z <= -run ? rise : (-z / run) * rise);
  // deck: diamond plate slab
  ctx.albedo("cdn/texture-diamond-plate-steel.png"); ctx.color("oklch(0.85 0.01 250)"); ctx.metalness(0.6); ctx.roughness(0.45);
  g.quad([-hw, 0, 0], [hw, 0, 0], [hw, rise, -run], [-hw, rise, -run], [0, 1, 0]);
  g.quad([-hw, rise, -run], [hw, rise, -run], [hw, rise, -run - plat], [-hw, rise, -run - plat], [0, 1, 0]);
  ctx.albedo(null); ctx.color("oklch(0.55 0.03 250)");
  g.quad([-hw, -0.2, 0], [hw, -0.2, 0], [hw, rise - 0.2, -run], [-hw, rise - 0.2, -run], [0, -1, 0]);
  for (const sx of [-1, 1]) g.quad([sx * hw, -0.2, 0], [sx * hw, 0, 0], [sx * hw, rise, -run], [sx * hw, rise - 0.2, -run], [sx, 0, 0]);
  g.box(-hw, rise - 0.2, -run - plat, hw, rise, -run);
  // cleats across the ramp
  ctx.color("oklch(0.4 0.02 250)");
  if (ctx.lod <= 2) for (let z = -0.4; z > -run; z -= 0.45) { const y = yAt(z); g.box(-hw + 0.05, y, z - 0.03, hw - 0.05, y + 0.035, z + 0.03); }
  // legs under the landing and mid-ramp
  ctx.color("oklch(0.6 0.02 250)");
  for (const z of [-run - plat + 0.15, -run + 0.2, -run / 2]) for (const sx of [-1, 1]) g.tube([sx * (hw - 0.1), -1.5, z], [sx * (hw - 0.1), yAt(z) - 0.2, z], 0.06, 6);
  // handrails: posts and a rail, white
  ctx.color("oklch(0.96 0.01 95)");
  for (const sx of [-1, 1]) {
    const pts = []; for (let z = 0; z >= -run - plat + 0.05; z -= 1.5) pts.push([sx * hw, yAt(z), z]); pts.push([sx * hw, rise, -run - plat + 0.05]);
    for (const p of pts) g.tube(p, [p[0], p[1] + 1.0, p[2]], 0.035, 6);
    for (let i = 0; i < pts.length - 1; i++) { g.tube([pts[i][0], pts[i][1] + 1.0, pts[i][2]], [pts[i + 1][0], pts[i + 1][1] + 1.0, pts[i + 1][2]], 0.03, 6); g.tube([pts[i][0], pts[i][1] + 0.5, pts[i][2]], [pts[i + 1][0], pts[i + 1][1] + 0.5, pts[i + 1][2]], 0.02, 4); }
  }
  // a little bunting on the handrail
  for (let z = -1; z > -run; z -= 0.7) { const i = Math.round(-z / 0.7); ctx.color(PARTY[i % PARTY.length]); g.tri([-hw, yAt(z) + 1.0, z], [-hw, yAt(z - 0.5) + 1.0, z - 0.5], [-hw, yAt(z - 0.25) + 0.62, z - 0.25]); g.tri([hw, yAt(z) + 1.0, z], [hw, yAt(z - 0.5) + 1.0, z - 0.5], [hw, yAt(z - 0.25) + 0.62, z - 0.25]); }
}

function gate(ctx) { // Level 26: two posts, an arch board, a striped swing bar; faces -Z (inboard)
  const g = mk(ctx, 0);
  ctx.color("oklch(0.96 0.01 95)"); ctx.smooth();
  for (const sx of [-1, 1]) { g.tube([sx * 0.9, 0, 0], [sx * 0.9, 2.5, 0], 0.07, 12); g.sphere(sx * 0.9, 2.55, 0, 0.1, 0.1, 10, 6); }
  ctx.flat();
  ctx.color("oklch(0.32 0.1 255)"); g.box(-1.05, 2.25, -0.04, 1.05, 2.75, 0.04);
  ctx.color("oklch(0.85 0.15 90)"); g.box(-1.0, 2.3, -0.06, 1.0, 2.32, 0.06); g.box(-1.0, 2.68, -0.06, 1.0, 2.7, 0.06);
  for (let i = 0; i < 6; i++) { ctx.color(i % 2 ? "oklch(0.96 0.01 95)" : "oklch(0.55 0.2 25)"); g.tube([-0.85 + i * 0.283, 1.0, 0], [-0.85 + (i + 1) * 0.283, 1.0, 0], 0.045, 8); }
  for (let i = 0; i < 6; i++) { ctx.color(PARTY[i]); g.tri([-0.85 + i * 0.3, 2.22, -0.05], [-0.6 + i * 0.3, 2.22, -0.05], [-0.72 + i * 0.3, 1.95, -0.05]); }
}

function popped(ctx) { // a burst balloon: a crumpled rubber scrap with its knot and string
  const g = mk(ctx, 0), col = PARTY[(ctx.params.c ?? 0) % PARTY.length], n = 9;
  ctx.color(col); ctx.roughness(0.3); ctx.smooth();
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * 6.2832, t1 = ((i + 1) / n) * 6.2832, r0 = 0.1 + 0.07 * Math.sin(i * 2.7 + (ctx.params.c ?? 0)), r1 = 0.1 + 0.07 * Math.sin((i + 1) * 2.7 + (ctx.params.c ?? 0));
    g.quad([0, 0.03, 0], [0, 0.03, 0], [r1 * Math.cos(t1), 0.01 + 0.02 * Math.sin(i * 3), r1 * Math.sin(t1)], [r0 * Math.cos(t0), 0.01 + 0.02 * Math.sin(i * 3 - 1), r0 * Math.sin(t0)], [0, 1, 0]);
  }
  ctx.flat(); g.sphere(0, 0.03, 0, 0.022, 0.02, 6, 4);
  ctx.color("oklch(0.9 0.01 90)"); g.tube([0, 0.02, 0], [0.12, 0.008, 0.25], 0.004, 3); g.tube([0.12, 0.008, 0.25], [-0.05, 0.008, 0.45], 0.004, 3);
}

function hat(ctx) { // a cone party hat on its side: stripes, a pom-pom, an elastic
  const g = mk(ctx, 0), n = 16, h = 0.24, r = 0.075; ctx.smooth();
  for (let s = 0; s < 4; s++) {
    ctx.color(s % 2 ? "oklch(0.86 0.15 90)" : "oklch(0.62 0.2 345)");
    const a0 = s / 4, a1 = (s + 1) / 4;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * 6.2832, t1 = ((i + 1) / n) * 6.2832, P = (t, a) => [r * (1 - a) * Math.cos(t), r + r * (1 - a) * Math.sin(t), -h * a];
      g.quad(P(t0, a0), P(t1, a0), P(t1, a1), P(t0, a1), [Math.cos(t0), Math.sin(t0), 0.3]);
    }
  }
  ctx.color("oklch(0.95 0.02 200)"); g.sphere(0, r, -h - 0.02, 0.03, 0.03, 8, 5);
  ctx.flat(); ctx.color("oklch(0.9 0 0)"); g.tube([r, 0.0, 0], [0, -0.0, 0.12], 0.003, 3); g.tube([0, 0, 0.12], [-r, 0, 0], 0.003, 3);
}

function sign(ctx) { // a small deck board on a post
  const g = mk(ctx, 0);
  ctx.color("oklch(0.96 0.01 95)"); g.tube([0, 0, 0], [0, 1.1, 0], 0.04, 8);
  ctx.color("oklch(0.3 0.08 255)"); g.box(-0.48, 1.05, -0.03, 0.48, 1.55, 0.03);
  ctx.color("oklch(0.85 0.15 90)"); g.box(-0.5, 1.03, -0.035, 0.5, 1.05, 0.035); g.box(-0.5, 1.55, -0.035, 0.5, 1.57, 0.035);
}

export function geometry(ctx) {
  const p = ctx.params.part ?? "hull";
  if (p === "hull") hull(ctx); else if (p === "gangway") gangway(ctx); else if (p === "gate") gate(ctx); else if (p === "popped") popped(ctx); else if (p === "hat") hat(ctx); else if (p === "sign") sign(ctx);
}

export function collider(ctx) {
  const p = ctx.params.part ?? "hull";
  if (p === "hull") return [
    { kind: "box", width: 16.8, height: HD + 1, depth: 132, center: [0, (HD + 1) / 2, -2] },
    { kind: "box", width: 10, height: HD - 2, depth: 14, center: [0, (HD + 2) / 2, -64] },
    { kind: "box", width: 14, height: 9, depth: 96, center: [0, HD + 4.5, 5] },
    { kind: "box", width: 5.2, height: 9, depth: 8.4, center: [0, 25.5, 20.6] },
  ];
  if (p === "gangway") { // the walkable sheets: ramp, landing, and guard walls along both sides
    const rise = ctx.params.rise ?? 3.6, run = ctx.params.run ?? 12, plat = ctx.params.plat ?? 1.6, hw = 0.8;
    ctx.quad(-hw, 0, 0, hw, 0, 0, hw, rise, -run, -hw, rise, -run);
    ctx.quad(-hw, rise, -run, hw, rise, -run, hw, rise, -run - plat, -hw, rise, -run - plat);
    for (const sx of [-1, 1]) ctx.quad(sx * hw, 0, 0, sx * hw, 1.0, 0, sx * hw, rise + 1.0, -run, sx * hw, rise, -run), ctx.quad(sx * hw, rise, -run, sx * hw, rise + 1, -run, sx * hw, rise + 1, -run - plat, sx * hw, rise, -run - plat);
    return;
  }
  if (p === "gate") return [{ kind: "box", width: 0.2, height: 2.5, depth: 0.2, center: [-0.9, 1.25, 0] }, { kind: "box", width: 0.2, height: 2.5, depth: 0.2, center: [0.9, 1.25, 0] }];
  if (p === "sign") return { kind: "box", width: 1, height: 1.6, depth: 0.1, center: [0, 0.8, 0] };
  return null;
}
