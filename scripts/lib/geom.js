// Loft + surface helpers for hand-authored geometry scripts: this world's own copy.
//
// Winding law (one convention for every mesh built on this module):
//   Rings are ordered ALONG the travel direction. Each ring's points run CCW in its own (u, v)
//   frame, where (u, v, travel) is right-handed. With that, quad(A[k], A[k+1], B[k+1], B[k])
//   faces outward and both caps wind correctly. For a Z-extrusion (travel = +Z) that means:
//   sections sorted ascending z, polygons CCW in world XY. Nothing here eyeballs a face normal.
//
// pathRings frames: c = center, f = travel, up = the hint (never parallel to f); the poly's u runs
// along norm(cross(up, f)) and v completes the right-handed basis (v = up when up is perpendicular to f).

const clamp01 = (v) => Math.min(1, Math.max(0, v));

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const norm = (a) => {
  const m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
};

const requireGeomCtx = (ctx, signature) => {
  if (ctx && typeof ctx.tri === "function" && typeof ctx.quad === "function") return;
  throw new Error("geom helpers take POSITIONAL args with the geometry ctx first, e.g. " + signature + ". Pass your geometry(ctx) script's ctx as the first argument.");
};

/** Chamfered rectangle cross-section: 8 points, CCW in (u, v), centered on (cu, cv). */
export function rrect(w, h, cu = 0, cv = 0, bevel = 0) {
  const u0 = cu - w / 2;
  const u1 = cu + w / 2;
  const v0 = cv - h / 2;
  const v1 = cv + h / 2;
  const b = Math.min(bevel, Math.abs(w) * 0.45, Math.abs(h) * 0.45);
  return [
    [u1 - b, v0],
    [u1, v0 + b],
    [u1, v1 - b],
    [u1 - b, v1],
    [u0 + b, v1],
    [u0, v1 - b],
    [u0, v0 + b],
    [u0 + b, v0],
  ];
}

/** Superellipse cross-section: n points, CCW, centered on (cu, cv). pow 1 = ellipse, pow < 1 = boxier. */
export function oval(w, h, cu = 0, cv = 0, n = 12, pow = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const sc = c < 0 ? -1 : 1;
    const ss = s < 0 ? -1 : 1;
    pts.push([cu + sc * Math.pow(Math.abs(c), pow) * w * 0.5, cv + ss * Math.pow(Math.abs(s), pow) * h * 0.5]);
  }
  return pts;
}

/** Sections on Z planes → rings in local XYZ (u→x, v→y, travel→+z). Sort sections ascending z. */
export function sectionRings(sections) {
  const out = [];
  for (const s of sections) {
    const ring = [];
    for (const p of s.poly) ring.push([p[0], p[1], s.z]);
    out.push(ring);
  }
  return out;
}

/** Frames along an arbitrary travel path → rings in local XYZ. */
export function pathRings(frames) {
  const out = [];
  for (const fr of frames) {
    const f = norm(fr.f);
    const r = norm(cross(fr.up, f));
    const u2 = cross(f, r);
    const ring = [];
    for (const p of fr.poly) {
      ring.push([fr.c[0] + r[0] * p[0] + u2[0] * p[1], fr.c[1] + r[1] * p[0] + u2[1] * p[1], fr.c[2] + r[2] * p[0] + u2[2] * p[1]]);
    }
    out.push(ring);
  }
  return out;
}

/** Cap fan over one ring. reverse=true winds it to face −travel (the start cap). */
function fan(ctx, ring, reverse, paint) {
  const n = ring.length;
  for (let k = 1; k < n - 1; k++) {
    const a = ring[0];
    const b = ring[k];
    const c = ring[k + 1];
    if (paint) paint((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
    if (reverse) ctx.tri(a[0], a[1], a[2], c[0], c[1], c[2], b[0], b[1], b[2]);
    else ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }
}

/**
 * Loft wall quads between consecutive rings and cap both ends (opts.capStart/capEnd false to
 * leave an end open: joints, sleeves). Every ring must carry the same point count, ordered per
 * the winding law above. opts.paint runs per face with the face centroid.
 */
export function loft(ctx, rings, opts) {
  requireGeomCtx(ctx, "loft(ctx, rings, opts?)");
  const o = opts ?? {};
  if (rings.length < 2) throw new Error("loft needs at least 2 rings (got " + rings.length + "): one ring per station along the travel direction.");
  const n = rings[0].length;
  for (const ring of rings) {
    if (ring.length !== n) throw new Error("loft rings must share one point count (got " + n + " and " + ring.length + "): vary positions along the path, never the count, or the walls can't stitch.");
  }
  const paint = o.paint;
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i];
    const B = rings[i + 1];
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      const a = A[k];
      const b = A[k2];
      const c = B[k2];
      const d = B[k];
      if (paint) paint((a[0] + b[0] + c[0] + d[0]) * 0.25, (a[1] + b[1] + c[1] + d[1]) * 0.25, (a[2] + b[2] + c[2] + d[2]) * 0.25);
      ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
    }
  }
  if (o.capStart !== false) fan(ctx, rings[0], true, paint);
  if (o.capEnd !== false) fan(ctx, rings[rings.length - 1], false, paint);
}

/** loft over sectionRings: the Z-extrusion shorthand. */
export function loftSections(ctx, sections, paint) {
  requireGeomCtx(ctx, "loftSections(ctx, sections, paint?)");
  loft(ctx, sectionRings(sections), { paint });
}

/** loft over pathRings: the arbitrary-path shorthand. */
export function loftFrames(ctx, frames, paint, opts) {
  requireGeomCtx(ctx, "loftFrames(ctx, frames, paint?, opts?)");
  const o = opts ?? {};
  loft(ctx, pathRings(frames), { paint, capStart: o.capStart, capEnd: o.capEnd });
}

/**
 * Chamfered box extruded on Z, end faces chamfered too: no dead-flat edges. Corner order per
 * axis doesn't matter. Default bevel 0.004 suits small parts; step up for furniture (0.008) and
 * architecture (0.015).
 */
export function boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel = 0.004, paint) {
  requireGeomCtx(ctx, "boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel?, paint?)");
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  const za = Math.min(z0, z1);
  const zb = Math.max(z0, z1);
  const w = xb - xa;
  const h = yb - ya;
  const cx = (xa + xb) / 2;
  const cy = (ya + yb) / 2;
  const e = Math.min(bevel, (zb - za) * 0.3);
  loftSections(
    ctx,
    [
      { z: za, poly: rrect(w - 2 * e, h - 2 * e, cx, cy, bevel) },
      { z: za + e, poly: rrect(w, h, cx, cy, bevel) },
      { z: zb - e, poly: rrect(w, h, cx, cy, bevel) },
      { z: zb, poly: rrect(w - 2 * e, h - 2 * e, cx, cy, bevel) },
    ],
    paint,
  );
}

/** Round tube between two points, tapered r0 → r1 (r1 defaults to r0). Picks a safe up when the travel direction runs into the hint. */
export function tube(ctx, a, b, r0, r1, sides = 12, upHint, paint) {
  requireGeomCtx(ctx, "tube(ctx, a, b, r0, r1?, sides?, upHint?, paint?)");
  const f = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  let up = upHint ?? [0, 1, 0];
  if (Math.abs(f[0] * up[0] + f[1] * up[1] + f[2] * up[2]) > 0.95) up = Math.abs(f[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const rEnd = r1 ?? r0;
  loftFrames(
    ctx,
    [
      { c: a, f, up, poly: oval(r0 * 2, r0 * 2, 0, 0, sides, 1) },
      { c: b, f, up, poly: oval(rEnd * 2, rEnd * 2, 0, 0, sides, 1) },
    ],
    paint,
  );
}

/**
 * Smooth tube through a polyline. The up vector is parallel-transported so the section never
 * twists between joints. radii: one number or one per point. squash < 1 flattens the section's
 * v axis; pow shapes it like oval's pow.
 */
export function polyTube(ctx, pts, radii, sides = 12, upHint = [0, 1, 0], paint, squash = 1, pow = 1) {
  requireGeomCtx(ctx, "polyTube(ctx, pts, radii, sides?, upHint?, paint?, squash?, pow?)");
  const n = pts.length;
  const radiusAt = (i) => (typeof radii === "number" ? radii : (radii[i] ?? radii[radii.length - 1]));
  const frames = [];
  let up = norm(upHint);
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    const f = norm([next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]]);
    const d = up[0] * f[0] + up[1] * f[1] + up[2] * f[2];
    let u = [up[0] - f[0] * d, up[1] - f[1] * d, up[2] - f[2] * d];
    if (Math.hypot(u[0], u[1], u[2]) < 1e-4) u = Math.abs(f[1]) < 0.9 ? cross(f, [0, 1, 0]) : cross(f, [1, 0, 0]);
    up = norm(u);
    const r = radiusAt(i);
    frames.push({ c: pts[i], f, up, poly: oval(r * 2, r * 2 * squash, 0, 0, sides, pow) });
  }
  loftFrames(ctx, frames, paint);
}

/**
 * Per-face paint closure: CDN albedo + tinted vertex color with seeded grit on color, metalness,
 * and roughness, so no two faces of the same panel read identically. Pass the result as any
 * helper's paint arg (or call it yourself before emitting).
 */
export function surface(ctx, def) {
  if (!ctx || typeof ctx.noise3d !== "function" || typeof ctx.color !== "function") {
    throw new Error("surface takes the geometry ctx first: surface(ctx, { tex?, r, g, b, metal?, rough?, jitter?, freq? }).");
  }
  if (!Number.isFinite(def?.r) || !Number.isFinite(def?.g) || !Number.isFinite(def?.b)) {
    throw new Error("surface needs a base color: def.r/g/b in 0–1 (the jitter tints around it).");
  }
  const jitter = def.jitter ?? 0.1;
  const freq = typeof def.freq === "number" && def.freq > 0 ? def.freq : 13;
  const tex = def.tex ?? null;
  const metal = def.metal ?? 0;
  const rough = def.rough ?? 0.6;
  const grit = jitter / 0.1;
  return (x, y, z) => {
    const n = ctx.noise3d(x * freq, y * freq, z * freq);
    const n2 = ctx.noise3d(x * freq * 4.1 + 17, y * freq * 4.1 - 6, z * freq * 4.1 + 3);
    const k = 1 + n * jitter + n2 * jitter * 0.5;
    ctx.albedo(tex);
    ctx.color(clamp01(def.r * k), clamp01(def.g * k), clamp01(def.b * k), 1);
    ctx.metalness(clamp01(metal + n2 * 0.07 * grit));
    ctx.roughness(clamp01(rough + (-n * 0.13 + n2 * 0.05) * grit));
  };
}
