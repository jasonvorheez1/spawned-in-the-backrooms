// Level 11's street lamp (Shelly, Nov 10: "street lamp is missing faces"): replaces the decimated tripo lamp, which had holes.
// A cast-iron fluted base, a tapered steel pole, a davit arm curving out 2 m over the road and a cobra-head luminaire with a lit lens.
// Local frame: feet at the pole's base, the arm reaches toward -Z (forward); ~7.3 m tall like the old one.
const H = 7.0, REACH = 2.0;

export function geometry(ctx) {
  const lod = ctx.lod ?? 1, seg = lod >= 4 ? 6 : lod >= 3 ? 10 : 16;
  const Q = (a, b, c, d) => { ctx.tri(...a, ...b, ...c); ctx.tri(...a, ...c, ...d); };
  // a tube along a path of [x,y,z,r] points, capped at both ends
  const tube = (path, cap = true) => {
    const rings = path.map((p, i) => {
      const q = path[Math.min(i + 1, path.length - 1)], o = path[Math.max(i - 1, 0)];
      let t = [q[0] - o[0], q[1] - o[1], q[2] - o[2]]; const tl = Math.hypot(...t) || 1; t = t.map((v) => v / tl);
      let u = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
      let n = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]; const nl = Math.hypot(...n); n = n.map((v) => v / nl);
      const b = [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]];
      const ring = []; for (let k = 0; k < seg; k++) { const a = (k / seg) * Math.PI * 2, c = Math.cos(a) * p[3], s = Math.sin(a) * p[3]; ring.push([p[0] + n[0] * c + b[0] * s, p[1] + n[1] * c + b[1] * s, p[2] + n[2] * c + b[2] * s]); }
      return ring;
    });
    ctx.smooth();
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; Q(rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]); }
    if (cap) for (const [i, f] of [[0, 1], [rings.length - 1, -1]]) { const c = path[i]; for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; f > 0 ? ctx.tri(c[0], c[1], c[2], ...rings[i][k2], ...rings[i][k]) : ctx.tri(c[0], c[1], c[2], ...rings[i][k], ...rings[i][k2]); } }
  };
  const lathe = (prof) => tube(prof.map(([y, r]) => [0, y, 0, r]));
  const iron = () => { ctx.albedo("cdn/texture-dark-cast-iron-painted-metal.png"); ctx.color("oklch(0.95 0.01 220)"); ctx.roughness(0.55); ctx.metalness(0.6); ctx.emissive(null); };

  iron();
  // fluted cast base: a bell that steps in to the pole
  lathe([[0, 0.24], [0.06, 0.24], [0.08, 0.21], [0.35, 0.17], [0.42, 0.19], [0.48, 0.13], [0.9, 0.1], [0.96, 0.12], [1.02, 0.085]]);
  if (lod < 3) for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, x = Math.cos(a) * 0.17, z = Math.sin(a) * 0.17; tube([[x, 0.1, z, 0.022], [x * 0.92, 0.32, z * 0.92, 0.022]]); } // flutes
  // tapered shaft with a collar a third of the way up
  lathe([[1.0, 0.085], [H * 0.4, 0.075], [H * 0.4 + 0.01, 0.09], [H * 0.4 + 0.1, 0.09], [H * 0.4 + 0.11, 0.072], [H, 0.06], [H + 0.08, 0.05]]);
  // davit arm: rises out of the pole top, curves over to -Z, ends level
  const arm = []; const n = lod >= 3 ? 6 : 14;
  for (let i = 0; i <= n; i++) { const t = i / n, a = t * Math.PI / 2; arm.push([0, H - 0.35 + Math.sin(a) * 0.55, -(1 - Math.cos(a)) * 0.6, 0.05]); }
  for (let i = 1; i <= 4; i++) arm.push([0, H + 0.2, -0.6 - (i / 4) * (REACH - 0.95), 0.045]);
  tube(arm);
  if (lod < 3) { // a scroll brace under the arm
    const br = []; for (let i = 0; i <= 10; i++) { const t = i / 10; br.push([0, H - 0.9 + t * 0.95 + Math.sin(t * Math.PI) * 0.12, -t * 1.0, 0.018]); } tube(br);
  }
  // cobra head: a flattened teardrop housing, open lens underneath
  const hz = -REACH + 0.1, hy = H + 0.12;
  const head = []; const hn = lod >= 3 ? 6 : 12;
  for (let i = 0; i <= hn; i++) { const t = i / hn; head.push([0, hy - 0.02 * t, hz + 0.25 - t * 0.75, 0.04 + Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.2]); }
  ctx.color("oklch(0.85 0.01 230)"); ctx.metalness(0.7); ctx.roughness(0.4);
  tube(head);
  // lens: a lit dish set into the underside
  ctx.albedo(null); ctx.color("oklch(0.98 0.03 85)"); ctx.emissive("oklch(0.95 0.1 82)"); ctx.roughness(0.2); ctx.metalness(0);
  const ly = hy - 0.12, lz = hz - 0.25, lr = 0.15, lsz = 0.23;
  for (let k = 0; k < seg; k++) { const a = (k / seg) * Math.PI * 2, b = ((k + 1) / seg) * Math.PI * 2; ctx.tri(0, ly - 0.035, lz, Math.cos(b) * lr, ly, lz + Math.sin(b) * lsz, Math.cos(a) * lr, ly, lz + Math.sin(a) * lsz); }
  ctx.emissive(null);
}

export function collider() { return [{ kind: "cylinder", radiusTop: 0.1, radiusBottom: 0.22, height: 7.2, center: [0, 3.6, 0] }]; }
