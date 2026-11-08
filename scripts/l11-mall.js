// Level 11 strip mall pieces. params.kind:
//  "shell": the building (w along X, h, d along Z; storefront face is +X): stucco body with control-joint reveals, a dark plinth,
//           a projecting cornice band and coping, downspouts on the back, two rooftop AC units. Collider: the plain body.
//  "awning": a curved canvas awning (projects along +X by p, length d along Z, drop r) on pipe arms, with a valance.
const STUCCO = "cdn/texture-weathered-cream-stucco-wall.png", CANVAS = "cdn/texture-faded-blue-canvas-awning-fabric.png";
const P = (c) => ({ kind: c.params.kind ?? "shell", w: c.params.w ?? 16, h: c.params.h ?? 5.2, d: c.params.d ?? 22, p: c.params.p ?? 2, r: c.params.r ?? 0.9 });
function boxer(ctx) {
  const q = (a, b, c, e) => ctx.quad(...a, ...b, ...c, ...e);
  return (x0, y0, z0, x1, y1, z1) => {
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  };
}
export function geometry(ctx) {
  const p = P(ctx), box = boxer(ctx), lod = ctx.lod ?? 1;
  if (p.kind === "awning") {
    const { p: pr, d, r } = p, N = lod >= 4 ? 3 : 10;
    ctx.albedo(CANVAS); ctx.color("oklch(0.62 0.13 255)");
    // the canvas: a quarter curve from the wall (x=0, y=0) out to (pr, -r), both sides drawn
    const pt = (t) => [pr * Math.sin((t * Math.PI) / 2), -r * (1 - Math.cos((t * Math.PI) / 2))];
    for (let i = 0; i < N; i++) {
      const [x0, y0] = pt(i / N), [x1, y1] = pt((i + 1) / N);
      ctx.quad(x0, y0, -d / 2, x0, y0, d / 2, x1, y1, d / 2, x1, y1, -d / 2);
      ctx.quad(x1, y1, -d / 2, x1, y1, d / 2, x0, y0, d / 2, x0, y0, -d / 2);
    }
    // valance: a hanging skirt at the front edge, darker hem
    const [fx, fy] = pt(1);
    ctx.color("oklch(0.56 0.13 255)"); box(fx - 0.01, fy - 0.28, -d / 2, fx + 0.02, fy, d / 2);
    ctx.color("oklch(0.9 0.02 250)"); box(fx - 0.012, fy - 0.3, -d / 2, fx + 0.022, fy - 0.26, d / 2);
    // end caps (both sides)
    ctx.color("oklch(0.58 0.13 255)");
    for (const z of [-d / 2, d / 2]) for (let i = 0; i < N; i++) {
      const [x0, y0] = pt(i / N), [x1, y1] = pt((i + 1) / N);
      ctx.tri(0, y1, z, x0, y0, z, x1, y1, z); ctx.tri(0, y1, z, x1, y1, z, x0, y0, z);
      if (y1 < y0) { ctx.quad(0, y1, z, x1, y1, z, x1, y1, z, 0, y1, z); }
    }
    // pipe arms every ~2.4 m
    ctx.albedo(null); ctx.color("oklch(0.35 0.01 250)");
    const arms = Math.max(2, Math.round(d / 2.4) + 1);
    for (let i = 0; i < arms; i++) { const z = -d / 2 + 0.05 + ((d - 0.1) * i) / (arms - 1); box(0, -r - 0.04, z - 0.025, fx, -r + 0.01, z + 0.025); }
    return;
  }
  const { w, h, d } = p, X0 = -w / 2, X1 = w / 2, Z0 = -d / 2, Z1 = d / 2;
  ctx.albedo(STUCCO); ctx.color("oklch(0.86 0.03 85)"); box(X0, 0, Z0, X1, h, Z1);
  // dark plinth
  ctx.color("oklch(0.5 0.02 70)"); box(X0 - 0.04, 0, Z0 - 0.04, X1 + 0.04, 0.45, Z1 + 0.04);
  // control-joint reveals on the long side walls and the back
  ctx.albedo(null); ctx.color("oklch(0.6 0.02 80)");
  for (let z = Z0 + 3; z < Z1 - 1; z += 3) { box(X0 - 0.015, 0.45, z - 0.02, X0, h - 0.6, z + 0.02); }
  for (const y of [1.6, 3.2]) { box(X0 - 0.015, y - 0.02, Z0, X0, y + 0.02, Z1); box(X0, y - 0.02, Z0 - 0.015, X1, y + 0.02, Z0); box(X0, y - 0.02, Z1, X1, y + 0.02, Z1 + 0.015); }
  // cornice band and coping that overhang the walls
  ctx.albedo(STUCCO); ctx.color("oklch(0.8 0.035 80)"); box(X0 - 0.18, h - 0.55, Z0 - 0.18, X1 + 0.25, h - 0.2, Z1 + 0.18);
  ctx.color("oklch(0.72 0.03 75)"); box(X0 - 0.1, h - 0.2, Z0 - 0.1, X1 + 0.15, h + 0.45, Z1 + 0.1);
  ctx.color("oklch(0.62 0.02 70)"); box(X0 - 0.14, h + 0.45, Z0 - 0.14, X1 + 0.2, h + 0.52, Z1 + 0.14);
  // downspouts on the back wall
  ctx.albedo(null); ctx.color("oklch(0.55 0.02 90)");
  for (const z of [Z0 + 1.2, 0, Z1 - 1.2]) { box(X0 - 0.16, 0.1, z - 0.06, X0 - 0.04, h - 0.2, z + 0.06); box(X0 - 0.3, 0.05, z - 0.08, X0 - 0.04, 0.15, z + 0.08); }
  if (lod >= 4) return;
  // rooftop AC units with fan grilles
  for (const [x, z] of [[-2, -5], [1.5, 4]]) {
    ctx.color("oklch(0.8 0.01 240)"); box(x - 0.9, h, z - 0.7, x + 0.9, h + 1.0, z + 0.7);
    ctx.color("oklch(0.3 0.01 240)"); box(x - 0.55, h + 1.0, z - 0.45, x + 0.55, h + 1.03, z + 0.45);
    ctx.color("oklch(0.55 0.01 240)"); for (let k = -0.6; k <= 0.6; k += 0.15) box(x - 0.905, h + 0.15, z + k - 0.02, x - 0.9, h + 0.85, z + k + 0.02);
  }
}
export function collider(ctx) {
  const p = P(ctx);
  if (p.kind === "awning") return null;
  return { kind: "box", width: p.w, height: p.h, depth: p.d, center: [0, p.h / 2, 0] };
}
