// Level 11 roadworks kit. params.kind:
//  "barricade": a Type II A-frame road barricade, 2.2 m wide: two splayed steel A-legs on rubber feet, two rails
//               of reflective orange/white chevron sheeting on both faces, a lamp bracket on the right leg. Feet at y 0.
//  "cone":      a 70 cm traffic cone: square black rubber base with a lip, tapered body, two reflective collars.
//  "sign":      a roll-up "ROAD WORK AHEAD" stand: a folding tripod of spring steel legs and a crossbar; the panel is the
//               placement's own ui face, so this draws only the stand below it (the panel's bottom sits at params.y0).
// Vertex colours carry the paint; the placement's material stays white.
const ORANGE = "oklch(0.68 0.2 45)", WHITE = "oklch(0.95 0.01 90)", STEEL = "oklch(0.55 0.01 250)", RUBBER = "oklch(0.18 0.01 250)";

function beam(ctx, a, b, t) { // a square-section bar from point a to point b, t thick
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1, u = d.map((v) => v / L);
  const ref = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let s = [u[1] * ref[2] - u[2] * ref[1], u[2] * ref[0] - u[0] * ref[2], u[0] * ref[1] - u[1] * ref[0]];
  const sl = Math.hypot(...s); s = s.map((v) => (v / sl) * t / 2);
  const w = [u[1] * s[2] - u[2] * s[1], u[2] * s[0] - u[0] * s[2], u[0] * s[1] - u[1] * s[0]];
  const c = (p, i, j) => [p[0] + s[0] * i + w[0] * j, p[1] + s[1] * i + w[1] * j, p[2] + s[2] * i + w[2] * j];
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]], A = corners.map(([i, j]) => c(a, i, j)), B = corners.map(([i, j]) => c(b, i, j));
  for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; ctx.quad(...A[k], ...A[n], ...B[n], ...B[k]); }
  ctx.quad(...A[3], ...A[2], ...A[1], ...A[0]); ctx.quad(...B[0], ...B[1], ...B[2], ...B[3]);
}
function box(ctx, x0, y0, z0, x1, y1, z1) {
  const q = (a, b, c, e) => ctx.quad(...a, ...b, ...c, ...e);
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}
// a ring-swept solid of revolution: profile [[r, y], …] bottom to top, colours per band
function lathe(ctx, prof, cols, n) {
  for (let i = 0; i < prof.length - 1; i++) {
    ctx.color(cols[i]);
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
    for (let j = 0; j < n; j++) {
      const a0 = (j / n) * 6.2832, a1 = ((j + 1) / n) * 6.2832;
      ctx.quad(r0 * Math.cos(a0), y0, r0 * Math.sin(a0), r0 * Math.cos(a1), y0, r0 * Math.sin(a1), r1 * Math.cos(a1), y1, r1 * Math.sin(a1), r1 * Math.cos(a0), y1, r1 * Math.sin(a0));
    }
  }
}

export function geometry(ctx) {
  const p = ctx.params ?? {}, kind = p.kind ?? "barricade", lod = ctx.lod ?? 1;
  if (kind === "cone") {
    const n = lod >= 3 ? 8 : 16;
    ctx.color(RUBBER); box(ctx, -0.19, 0, -0.19, 0.19, 0.035, 0.19); box(ctx, -0.16, 0.035, -0.16, 0.16, 0.05, 0.16);
    // body: flared foot, straight taper, rounded tip; bands: orange, white collar, orange, white collar, orange tip
    lathe(ctx, [[0.15, 0.05], [0.135, 0.12], [0.112, 0.26], [0.1, 0.33], [0.086, 0.42], [0.075, 0.48], [0.062, 0.56], [0.038, 0.68], [0.0, 0.7]],
      [ORANGE, ORANGE, ORANGE, WHITE, ORANGE, WHITE, ORANGE, ORANGE], n);
    return;
  }
  if (kind === "sign") {
    const y0 = p.y0 ?? 0.55, half = (p.w ?? 1.8) / 2 - 0.15;
    ctx.color(STEEL);
    for (const x of [-half, half]) beam(ctx, [x, 0.02, 0.02], [x * 0.9, y0 + 0.1, 0.03], 0.035);
    beam(ctx, [0, 0.02, -0.55], [0, y0 * 0.9, 0.0], 0.035); // the kick leg behind
    beam(ctx, [-half, y0 * 0.45, 0.03], [half, y0 * 0.45, 0.03], 0.03);
    ctx.color(RUBBER); for (const [x, z] of [[-half, 0.02], [half, 0.02], [0, -0.55]]) box(ctx, x - 0.06, 0, z - 0.06, x + 0.06, 0.03, z + 0.06);
    return;
  }
  // barricade
  const W = p.w ?? 2.2, hx = W / 2, H = p.h ?? 0.9, legX = hx - 0.18, splay = 0.32, t = 0.045;
  ctx.color(STEEL);
  for (const x of [-legX, legX]) {
    beam(ctx, [x, 0.03, splay], [x, H, 0.02], t); beam(ctx, [x, 0.03, -splay], [x, H, -0.02], t);
    beam(ctx, [x, 0.18, splay * 0.83], [x, 0.18, -splay * 0.83], 0.03); // the spreader
    beam(ctx, [x, H - 0.02, 0.05], [x, H + 0.04, 0], 0.06); // the hinge cap
  }
  ctx.color(RUBBER); for (const x of [-legX, legX]) for (const z of [-splay, splay]) box(ctx, x - 0.07, 0, z - 0.09, x + 0.07, 0.04, z + 0.09);
  // rails at two heights on both faces: the leg leans, so the rail's z follows it
  const zAt = (y) => 0.02 + (splay - 0.02) * (1 - (y - 0.03) / (H - 0.03));
  const stripe = 0.2, rails = [[0.5, 0.7], [0.18 + 0.12, 0.45]];
  for (const [ya, yb] of lod >= 3 ? [rails[0]] : rails) for (const side of [1, -1]) {
    const za = side * (zAt(ya) + 0.03), zb = side * (zAt(yb) + 0.03), o = 0.006 * side;
    // the board's back and edges in plain orange
    ctx.color(ORANGE); ctx.quad(-hx, ya, za - o * 3, -hx, yb, zb - o * 3, hx, yb, zb - o * 3, hx, ya, za - o * 3);
    // the chevron sheeting: diagonal bands, clipped at the board's ends, both bands point down to the centre
    const sl = (yb - ya), cl = (x) => Math.max(-hx, Math.min(hx, x));
    for (let x = -hx - sl, k = 0; x < hx + sl; x += stripe, k++) {
      const dir = x < 0 ? 1 : -1;
      ctx.color(k % 2 ? WHITE : ORANGE);
      const bl = cl(x), br = cl(x + stripe), tl = cl(x + dir * sl), tr = cl(x + stripe + dir * sl);
      if (side > 0) ctx.quad(bl, ya, za, br, ya, za, tr, yb, zb, tl, yb, zb);
      else ctx.quad(br, ya, za, bl, ya, za, tl, yb, zb, tr, yb, zb);
    }
  }
  // lamp bracket and housing on the right leg (the lens is the placement's glowing child)
  ctx.color(STEEL); beam(ctx, [legX, H, 0], [legX, H + 0.1, 0], 0.025);
  ctx.color("oklch(0.25 0.01 250)"); box(ctx, legX - 0.09, H + 0.1, -0.05, legX + 0.09, H + 0.14, 0.05);
}
export function collider(ctx) {
  const p = ctx.params ?? {}, kind = p.kind ?? "barricade";
  if (kind === "cone") return { kind: "box", width: 0.36, height: 0.7, depth: 0.36, center: [0, 0.35, 0] };
  if (kind === "sign") return null;
  return { kind: "box", width: p.w ?? 2.2, height: p.h ?? 0.9, depth: 0.5, center: [0, (p.h ?? 0.9) / 2, 0] };
}
