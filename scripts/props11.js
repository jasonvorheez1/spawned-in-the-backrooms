// Level 11 street props that were plain blocks: params { kind: "cabinet" | "dumpster" | "skiff", w, h, d, r }
// same footprint as the box each one replaced (feet at the bottom centre), so the panels hung on them still sit flush
function prism(ctx, ring0, ring1) { const n = ring0.length; for (let j = 0; j < n; j++) { const k = (j + 1) % n; ctx.quad(ring0[j], ring0[k], ring1[k], ring1[j]); } }
function cap(ctx, ring, up) { const n = ring.length, c = ring.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]); for (let j = 0; j < n; j++) { const k = (j + 1) % n; up ? ctx.tri(c, ring[k], ring[j]) : ctx.tri(c, ring[j], ring[k]); } }
// a rounded rectangle outline at height y, half extents hx, hz, corner radius r
function rrect(hx, hz, r, y, seg) {
  const out = [];
  for (const [cx, cz, a0] of [[hx - r, hz - r, 0], [-(hx - r), hz - r, 90], [-(hx - r), -(hz - r), 180], [hx - r, -(hz - r), 270]])
    for (let i = 0; i <= seg; i++) { const a = ((a0 + (i / seg) * 90) * Math.PI) / 180; out.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]); }
  return out;
}
export function geometry(ctx) {
  try { const __q = ctx.quad.bind(ctx), __t = ctx.tri.bind(ctx); ctx.quad = (...a) => __q(...a.flat()); ctx.tri = (...a) => __t(...a.flat()); } catch (e) {}
  const p = ctx.params ?? {}, kind = p.kind ?? "cabinet", lod = ctx.lod ?? 1, seg = lod <= 2 ? 3 : 1;
  const w = p.w ?? 1, h = p.h ?? 1, d = p.d ?? 1;
  if (kind === "cabinet") { // a rounded steel cabinet: radiused vertical corners, a lipped plinth and a softened top edge
    const r = Math.min(p.r ?? 0.06, w / 3, d / 3), hx = w / 2, hz = d / 2;
    const plinth0 = rrect(hx - 0.02, hz - 0.02, r, 0, seg), plinth1 = rrect(hx - 0.02, hz - 0.02, r, 0.08, seg);
    const b0 = rrect(hx, hz, r, 0.08, seg), b1 = rrect(hx, hz, r, h - 0.04, seg), top = rrect(hx - 0.03, hz - 0.03, Math.max(0.01, r - 0.03), h, seg);
    prism(ctx, plinth0, plinth1); prism(ctx, plinth1, b0); prism(ctx, b0, b1); prism(ctx, b1, top); cap(ctx, top, true);
    return;
  }
  if (kind === "dumpster") { // a commercial dumpster: walls that flare out to the rim, a sloped front, ribs, fork pockets, casters
    const hx = w / 2, hz = d / 2, bx = hx - 0.12, bz = hz - 0.16;
    const base = [[-bx, 0.1, -bz], [bx, 0.1, -bz], [bx, 0.1, bz], [-bx, 0.1, bz]], rim = [[-hx, h, -hz], [hx, h, -hz], [hx, h, hz], [-hx, h, hz]];
    prism(ctx, base, rim); cap(ctx, base, false);
    // the inside, so an open lid shows a hollow bin and not a lid on air
    const inR = rim.map(([x, y, z]) => [x * 0.95, y - 0.02, z * 0.93]), inB = base.map(([x, y, z]) => [x * 0.95, 0.25, z * 0.93]);
    prism(ctx, inR, inB); cap(ctx, inB, true);
    ctx.quad(rim[0], rim[1], inR[1], inR[0]); ctx.quad(rim[1], rim[2], inR[2], inR[1]); ctx.quad(rim[2], rim[3], inR[3], inR[2]); ctx.quad(rim[3], rim[0], inR[0], inR[3]);
    if (lod <= 3) { // vertical ribs on the long faces and fork pockets on the ends
      for (const s of [-1, 1]) for (const fx of [-0.6, 0, 0.6]) {
        const x = fx * hx, t = 0.04, z0 = s * bz, z1 = s * hz, o = s * 0.05;
        ctx.quad([x - t, 0.1, z0 + o], [x + t, 0.1, z0 + o], [x + t, h - 0.1, z1 + o], [x - t, h - 0.1, z1 + o]);
        ctx.quad([x - t, h - 0.1, z1 + o], [x + t, h - 0.1, z1 + o], [x + t, h - 0.1, z1], [x - t, h - 0.1, z1]);
      }
      for (const s of [-1, 1]) { const x = s * (hx - 0.02); for (const zc of [-0.3, 0.3]) { const z0 = zc * hz - 0.12, z1 = zc * hz + 0.12, y0 = 0.45, y1 = 0.6, o = s * 0.08;
        ctx.quad([x + o, y0, z0], [x + o, y0, z1], [x + o, y1, z1], [x + o, y1, z0]); ctx.quad([x, y1, z0], [x, y1, z1], [x + o, y1, z1], [x + o, y1, z0]); } }
    }
    return;
  }
  // skiff: a flat-bottomed canal boat, bow pointed toward -z, transom square at +z, gunwale with sheer
  const L = d / 2, B = w / 2, n = lod <= 2 ? 10 : 6, rows = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, z = -L + t * d, beam = B * Math.pow(Math.sin(Math.min(1, t * 1.6) * Math.PI / 2), 0.7) + 0.001;
    const sheer = h + 0.15 * Math.pow(1 - t, 2), keel = 0.1 * Math.pow(1 - t, 3);
    rows.push([[-beam * 0.7, keel, z], [-beam, sheer * 0.55, z], [-beam * 1.02, sheer, z], [beam * 1.02, sheer, z], [beam, sheer * 0.55, z], [beam * 0.7, keel, z]]);
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < 5; j++) { if (j === 2) continue; ctx.quad(rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]); }
  for (let i = 0; i < n; i++) ctx.quad(rows[i][5], rows[i][0], rows[i + 1][0], rows[i + 1][5]); // the bottom
  const tr = rows[n]; ctx.quad(tr[0], tr[5], tr[4], tr[1]); ctx.quad(tr[1], tr[4], tr[3], tr[2]); // transom
  // the floorboards inside and a thwart
  const fy = 0.18; ctx.quad([-B * 0.6, fy, -L * 0.6], [B * 0.6, fy, -L * 0.6], [B * 0.65, fy, L - 0.05], [-B * 0.65, fy, L - 0.05]);
  ctx.quad([-B * 0.95, h * 0.75, 0.3], [B * 0.95, h * 0.75, 0.3], [B * 0.95, h * 0.75, 0.0], [-B * 0.95, h * 0.75, 0.0]);
}
export function collider(ctx) {
  const p = ctx.params ?? {};
  return [{ kind: "box", width: p.w ?? 1, height: p.h ?? 1, depth: p.d ?? 1, center: [0, (p.h ?? 1) / 2, 0] }];
}
