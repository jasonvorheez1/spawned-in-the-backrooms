// Level 11 canal masonry. params.kind:
//  "arch": a bridge side wall running along Z (length L, thickness t, height H) with an elliptical arch (span S, rise r) cut through it,
//          a proud voussoir ring and a string course near the top.
//  "quay": a canal wall running along X (length L, thickness t, height H): a dark plinth, pilasters every 8 m on the water face (side), drain outlets.
const TEX = "cdn/texture-smooth-cold-poured-concrete-wall.png", STONE = "cdn/texture-weathered-grey-granite-ashlar-blocks.png";
function boxer(ctx) {
  const q = (a, b, c, e) => { ctx.quad(...a, ...b, ...c, ...e); };
  return (x0, y0, z0, x1, y1, z1) => {
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  };
}
const P = (c) => ({ kind: c.params.kind ?? "arch", L: c.params.L ?? 24, t: c.params.t ?? 1.2, H: c.params.H ?? 4.2, S: c.params.S ?? 17, r: c.params.r ?? 2.9, side: c.params.side ?? 1 });
export function geometry(ctx) {
  const p = P(ctx), box = boxer(ctx);
  if (p.kind === "arch") {
    const { L, t, H, S, r } = p, N = 36, x0 = -t / 2, x1 = t / 2;
    const yb = (z) => (Math.abs(z) < S / 2 ? r * Math.sqrt(Math.max(0, 1 - (2 * z / S) ** 2)) : 0);
    ctx.albedo(STONE); ctx.color("oklch(0.72 0.015 80)");
    for (let i = 0; i < N; i++) {
      const za = -L / 2 + (L * i) / N, zb = -L / 2 + (L * (i + 1)) / N, ya = yb(za), yc = yb(zb);
      ctx.quad(x1, ya, za, x1, yc, zb, x1, H, zb, x1, H, za); ctx.quad(x0, yc, zb, x0, ya, za, x0, H, za, x0, H, zb); // both faces
      if (ya > 0.001 || yc > 0.001) ctx.quad(x0, ya, za, x0, yc, zb, x1, yc, zb, x1, ya, za); // the arch's underside
    }
    ctx.quad(x0, H, -L / 2, x0, H, L / 2, x1, H, L / 2, x1, H, -L / 2);
    ctx.quad(x0, 0, -L / 2, x1, 0, -L / 2, x1, H, -L / 2, x0, H, -L / 2); ctx.quad(x1, 0, L / 2, x0, 0, L / 2, x0, H, L / 2, x1, H, L / 2);
    // voussoirs: wedge blocks proud of both faces round the arch, alternating tone
    const M = 15, depth = 0.55, out = 0.07;
    for (let k = 0; k < M; k++) {
      const a0 = Math.PI * (k / M), a1 = Math.PI * ((k + 1) / M);
      const pt = (a, g) => [-(S / 2 + g) * Math.cos(a), (r + g * (r / (S / 2))) * Math.sin(a)];
      const [z0i, y0i] = pt(a0, 0), [z1i, y1i] = pt(a1, 0), [z0o, y0o] = pt(a0, depth), [z1o, y1o] = pt(a1, depth);
      ctx.color(k % 2 ? "oklch(0.64 0.02 70)" : "oklch(0.58 0.02 60)");
      for (const [x, s] of [[x1 + out, 1], [x0 - out, -1]]) {
        if (s > 0) ctx.quad(x, y0i, z0i, x, y1i, z1i, x, y1o, z1o, x, y0o, z0o); else ctx.quad(x, y1i, z1i, x, y0i, z0i, x, y0o, z0o, x, y1o, z1o);
        const xi = s > 0 ? x1 : x0;
        ctx.quad(xi, y0o, z0o, xi, y1o, z1o, x, y1o, z1o, x, y0o, z0o); ctx.quad(x, y0i, z0i, x, y1i, z1i, xi, y1i, z1i, xi, y0i, z0i);
      }
      ctx.color("oklch(0.25 0.01 60)"); // the joint lines between blocks
    }
    // keystone and the string course
    ctx.color("oklch(0.7 0.02 75)"); box(x0 - 0.12, r - 0.05, -0.32, x1 + 0.12, r + depth + 0.25, 0.32);
    ctx.color("oklch(0.66 0.015 80)"); box(x0 - 0.1, H - 1.05, -L / 2, x1 + 0.1, H - 0.85, L / 2);
    // dark water staining along the foot
    ctx.albedo(TEX); ctx.color("oklch(0.32 0.03 160)"); box(x0 - 0.01, 0, -L / 2, x1 + 0.01, 0.5, -S / 2); box(x0 - 0.01, 0, S / 2, x1 + 0.01, 0.5, L / 2);
    return;
  }
  if (p.kind === "parapet") { // a stone balustrade along Z: plinth, turned balusters, coping, end piers. feet at the bottom, height H, length L
    const { L, t, H } = p, lod = ctx.lod ?? 1, x0 = -t / 2, x1 = t / 2;
    ctx.albedo(STONE); ctx.color("oklch(0.66 0.015 80)");
    box(x0, 0, -L / 2, x1, 0.18, L / 2); // plinth
    box(x0 - 0.05, H - 0.14, -L / 2, x1 + 0.05, H, L / 2); // coping
    ctx.color("oklch(0.6 0.015 75)");
    for (const z of [-L / 2 + 0.25, L / 2 - 0.25]) box(x0 - 0.06, 0, z - 0.25, x1 + 0.06, H + 0.12, z + 0.25); // end piers
    if (lod >= 4) { ctx.color("oklch(0.55 0.015 75)"); box(x0 + 0.05, 0.18, -L / 2 + 0.5, x1 - 0.05, H - 0.14, L / 2 - 0.5); return; }
    ctx.color("oklch(0.7 0.015 80)");
    const n = lod <= 2 ? 8 : 5, prof = [[0.18, 0.06], [0.26, 0.05], [0.42, 0.1], [0.58, 0.05], [H - 0.2, 0.045], [H - 0.14, 0.07]];
    for (let z = -L / 2 + 0.75; z < L / 2 - 0.6; z += 0.32) {
      const rings = prof.map(([y, r]) => Array.from({ length: n }, (_, j) => { const a = (j / n) * 6.2832; return [Math.cos(a) * r, y, z + Math.sin(a) * r]; }));
      for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) { const k = (j + 1) % n; ctx.quad(...rings[i][j], ...rings[i][k], ...rings[i + 1][k], ...rings[i + 1][j]); }
    }
    return;
  }
  // quay
  const { L, t, H, side } = p, f = (side * t) / 2;
  ctx.albedo(TEX); ctx.color("oklch(0.62 0.02 240)"); box(-L / 2, 0, -t / 2, L / 2, H, t / 2);
  ctx.color("oklch(0.34 0.03 170)"); box(-L / 2, 0, Math.min(f, f + side * 0.04), L / 2, 1.3, Math.max(f, f + side * 0.04)); // waterline grime band
  ctx.albedo(STONE);
  for (let x = -L / 2 + 4; x < L / 2 - 1; x += 8) {
    const zf = f + side * 0.28;
    ctx.color("oklch(0.66 0.015 80)"); box(x - 0.45, 0, Math.min(f, zf), x + 0.45, H - 0.1, Math.max(f, zf));
    ctx.color("oklch(0.6 0.015 80)"); box(x - 0.6, H - 0.55, Math.min(f, zf + side * 0.08), x + 0.6, H - 0.15, Math.max(f, zf + side * 0.08)); // capital
    // a drain outlet between pilasters, rust streak below it
    ctx.albedo(null); ctx.color("oklch(0.12 0.01 60)"); box(x + 3.6, 1.9, Math.min(f, f + side * 0.05), x + 4.4, 2.5, Math.max(f, f + side * 0.05));
    ctx.color("oklch(0.42 0.07 45)"); box(x + 3.85, 1.2, Math.min(f, f + side * 0.03), x + 4.15, 1.9, Math.max(f, f + side * 0.03));
    ctx.albedo(STONE);
  }
}
export function collider(ctx) {
  const p = P(ctx);
  if (p.kind === "arch") {
    const pier = (p.L - p.S) / 2;
    return [
      { kind: "box", width: p.t, height: p.H, depth: pier, center: [0, p.H / 2, -p.L / 2 + pier / 2] },
      { kind: "box", width: p.t, height: p.H, depth: pier, center: [0, p.H / 2, p.L / 2 - pier / 2] },
      { kind: "box", width: p.t, height: p.H - p.r, depth: p.S, center: [0, p.r + (p.H - p.r) / 2, 0] },
    ];
  }
  if (p.kind === "parapet") return [{ kind: "box", width: p.t, height: p.H, depth: p.L, center: [0, p.H / 2, 0] }];
  return { kind: "box", width: p.L, height: p.H, depth: p.t, center: [0, p.H / 2, 0] };
}
