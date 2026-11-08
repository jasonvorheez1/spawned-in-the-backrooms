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
  if (kind === "payphone") { // a 2006 street post payphone: round steel post, rounded housing, a sloped hood with a lit sign, keypad, coin slot, handset on its hook with a coiled cord. Front is -Z
    const M = lod <= 2 ? 10 : 6, ring = (r, y, n = M, ox = 0, oz = 0) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; return [ox + Math.cos(t) * r, y, oz + Math.sin(t) * r]; });
    ctx.color("oklch(0.42 0.01 250)"); ctx.metalness?.(0.7); ctx.roughness?.(0.45);
    const f0 = ring(0.11, 0), f1 = ring(0.09, 0.05), p0 = ring(0.05, 0.05), p1 = ring(0.05, 1.0);
    prism(ctx, f0, f1); cap(ctx, f1, true); prism(ctx, p0, p1); // base flange and post
    // housing: a rounded steel box, front face at z = -0.14
    const hx = 0.24, hz = 0.12, r = 0.05, y0 = 0.95, y1 = 1.75;
    ctx.color("oklch(0.78 0.01 240)");
    const b0 = rrect(hx - 0.02, hz - 0.02, r - 0.02, y0, seg), b1 = rrect(hx, hz, r, y0 + 0.04, seg), b2 = rrect(hx, hz, r, y1 - 0.04, seg), b3 = rrect(hx - 0.02, hz - 0.02, r - 0.02, y1, seg);
    prism(ctx, b0, b1); prism(ctx, b1, b2); prism(ctx, b2, b3); cap(ctx, b0, false); cap(ctx, b3, true);
    const F = -hz - 0.002, q = (x0, y0_, x1, y1_, z = F) => ctx.quad([x0, y0_, z], [x1, y0_, z], [x1, y1_, z], [x0, y1_, z]);
    ctx.color("oklch(0.25 0.01 250)"); q(-0.09, 1.2, 0.09, 1.46); // keypad plate
    ctx.color("oklch(0.85 0.01 90)"); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const x = -0.06 + j * 0.06, y = 1.24 + i * 0.055; q(x - 0.018, y, x + 0.018, y + 0.035, F - 0.006); }
    ctx.color("oklch(0.6 0.12 85)"); q(0.12, 1.5, 0.18, 1.62); ctx.color("oklch(0.1 0 0)"); q(0.143, 1.53, 0.157, 1.6, F - 0.004); // brass coin slot
    ctx.color("oklch(0.55 0.02 250)"); q(-0.09, 1.04, 0.09, 1.12); // coin return
    ctx.color("oklch(0.35 0.02 160)"); q(-0.09, 1.52, 0.09, 1.66); // little readout window
    // hood: a canopy that leans out over the caller, with a backlit blue sign band
    const hy = 1.78, hood0 = [[-0.3, hy, 0.14], [0.3, hy, 0.14], [0.3, hy + 0.22, 0.14], [-0.3, hy + 0.22, 0.14]];
    ctx.color("oklch(0.45 0.13 255)"); ctx.emissive?.("oklch(0.45 0.13 255)", 0.6);
    ctx.quad([-0.3, hy, -0.24], [0.3, hy, -0.24], [0.3, hy + 0.18, -0.2], [-0.3, hy + 0.18, -0.2]); // sign face
    ctx.emissive?.(null, 0); ctx.color("oklch(0.3 0.03 255)");
    ctx.quad([-0.3, hy + 0.18, -0.2], [0.3, hy + 0.18, -0.2], [0.3, hy + 0.22, 0.14], [-0.3, hy + 0.22, 0.14]); // roof
    ctx.quad([0.3, hy, -0.24], [0.3, hy, 0.14], [0.3, hy + 0.22, 0.14], [0.3, hy + 0.18, -0.2]); ctx.quad([-0.3, hy, 0.14], [-0.3, hy, -0.24], [-0.3, hy + 0.18, -0.2], [-0.3, hy + 0.22, 0.14]);
    ctx.quad([0.3, hy, 0.14], [-0.3, hy, 0.14], [-0.3, hy + 0.22, 0.14], [0.3, hy + 0.22, 0.14]); ctx.quad([-0.3, hy, -0.24], [-0.3, hy, 0.14], [0.3, hy, 0.14], [0.3, hy, -0.24]);
    void hood0;
    // the handset on its hook on the left side: earpiece and mouthpiece cups joined by a curved grip
    const hX = -hx - 0.05, hZ = -0.04; ctx.color("oklch(0.14 0 0)"); ctx.roughness?.(0.6);
    const seg3 = lod <= 2 ? 8 : 5, cup = (y) => { const a = ring(0.04, y - 0.03, seg3, hX, hZ), b = ring(0.045, y + 0.03, seg3, hX, hZ); prism(ctx, a, b); cap(ctx, a, false); cap(ctx, b, true); };
    cup(1.62); cup(1.28);
    for (let i = 0; i < 6; i++) { const ya = 1.31 + i * 0.05, yb = ya + 0.05, bow = (y) => -0.02 * Math.sin(((y - 1.28) / 0.34) * Math.PI); prism(ctx, ring(0.018, ya, seg3, hX + bow(ya), hZ - 0.035), ring(0.018, yb, seg3, hX + bow(yb), hZ - 0.035)); }
    ctx.color("oklch(0.5 0.01 250)"); q(hX - 0.03, 1.55, hX + 0.03, 1.58, hZ + 0.0); // hook cradle
    // coiled cord from the handset base into the housing
    let prev = null; for (let i = 0; i <= 28; i++) { const t = i / 28, cx = hX + 0.02 + t * 0.04 + Math.cos(t * 40) * 0.012, cy = 1.24 - Math.sin(t * Math.PI) * 0.16 + t * 0.05, cz = hZ + Math.sin(t * 40) * 0.012; const rr = ring(0.006, cy, 4, cx, cz); if (prev) prism(ctx, prev, rr); prev = rr; }
    return;
  }
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
