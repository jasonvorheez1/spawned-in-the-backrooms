// Sedco Spotlight's double-sided store gondola, stocked like a 2009 corner store (Shelly, Nov 10: "reference real world items
// as they appeared in 2009 (eg funyuns, doritos, and spongebob products)"). Steel uprights, pegboard spine, three shelves a side,
// pillow chip bags with crimped seals and printed boxes, both cut from two painted label atlases; hooks of hanging bags up top.
// Local frame: 2.4 m along X, 0.92 m deep along Z, both faces stocked; feet at the floor.
const CHIPS = "/cdn/value.c4332b6cee1bbe173953b115f374a42d412d91c19155861f6ac12f95d1cec0a2.png"; // funyuns, doritos nacho, cool ranch, cheetos / lays, fritos, ruffles, sun chips
const BOXES = "/cdn/value.7c5d94fb4ff180f753f2d35929694c181d9dcd924a53715b3f753fe4242f5b04.png"; // spongebob mac, spongebob fruit snacks, spongebob cheez-it, spongebob dvd / twinkies, pop-tarts, slim jim, oatmeal creme pies
const PEG = "cdn/texture-brown-pegboard-holes.png";
// box sizes w h d (m), real-world
const BOX = [[0.13, 0.18, 0.05], [0.2, 0.15, 0.07], [0.17, 0.22, 0.06], [0.135, 0.19, 0.016], [0.22, 0.12, 0.13], [0.13, 0.2, 0.06], [0.14, 0.2, 0.04], [0.24, 0.13, 0.1]];
const W = 2.4, H = 1.9, SPINE = 0.025, DEEP = 0.42, SHELVES = [0.13, 0.56, 0.99], HOOK_Y = [1.68, 1.42];

export function geometry(ctx) {
  const uvs = [], lod = ctx.lod ?? 1;
  const T = (a, b, c, ua, ub, uc) => { ctx.tri(...a, ...b, ...c); uvs.push(...ua, ...ub, ...uc); };
  const Q = (p0, p1, p2, p3, u0 = [0, 0], u1 = [1, 0], u2 = [1, 1], u3 = [0, 1]) => { T(p0, p1, p2, u0, u1, u2); T(p0, p2, p3, u0, u2, u3); };
  // a side's frame: s = +1 faces +Z, -1 faces -Z (a half turn, so windings hold)
  let S = 1; const P = (x, y, z) => [S * x, y, S * z];
  const box = (x0, y0, z0, x1, y1, z1, faceUV) => { // faceUV(face) -> [u0,u1,u2,u3] or undefined
    const f = (n) => faceUV?.(n) ?? [];
    Q(P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), ...f("r"));
    Q(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), ...f("l"));
    Q(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), ...f("front"));
    Q(P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), ...f("back"));
    Q(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), ...f("top"));
    Q(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), ...f("bot"));
  };
  const cell = (c, aspect) => { // a label cell's uv rect, cropped to the face's aspect (w/h)
    const col = c % 4, row = Math.floor(c / 4), e = 0.004;
    let u0 = col / 4 + e, u1 = (col + 1) / 4 - e, v0 = 1 - (row + 1) / 2 + e, v1 = 1 - row / 2 - e;
    const cellA = (u1 - u0) * 2048 / ((v1 - v0) * 1024);
    if (aspect < cellA) { const k = (u1 - u0) * aspect / cellA, m = (u0 + u1) / 2; u0 = m - k / 2; u1 = m + k / 2; }
    else { const k = (v1 - v0) * cellA / aspect, m = (v0 + v1) / 2; v0 = m - k / 2; v1 = m + k / 2; }
    return { u0, u1, v0, v1 };
  };
  const steel = () => { ctx.albedo(null); ctx.color("#aeb3b8"); ctx.metalness(0.7); ctx.roughness(0.38); };

  // ---- the frame
  steel();
  box(-W / 2, 0, -0.04, W / 2, 0.12, 0.04); // base rail
  for (const s of [1, -1]) {
    S = s;
    box(-W / 2 + 0.02, 0, 0.04, W / 2 - 0.02, 0.11, DEEP); // kick plate
    for (const x of [-W / 2, W / 2 - 0.05]) box(x, 0, 0.0, x + 0.05, H - 0.15, 0.05); // uprights
    for (const [i, y] of SHELVES.entries()) {
      ctx.color("#c9cdd1"); box(-W / 2 + 0.05, y - 0.022, 0.03, W / 2 - 0.05, y, DEEP - (i ? 0.04 : 0)); // shelf deck
      ctx.color("#f4f1e6"); box(-W / 2 + 0.05, y - 0.04, DEEP - (i ? 0.04 : 0), W / 2 - 0.05, y + 0.012, DEEP + 0.008 - (i ? 0.04 : 0)); // ticket strip
      if (i) { steel(); for (const x of [-W / 2 + 0.07, W / 2 - 0.07]) box(x - 0.012, y - 0.15, 0.04, x + 0.012, y - 0.022, 0.3); } // brackets
      steel();
    }
    // pegboard spine, a 0.4 m tile at a time so the holes stay pinhole-sized
    ctx.albedo(PEG); ctx.color("#d9b98c"); ctx.metalness(0); ctx.roughness(0.85);
    const tiles = lod >= 3 ? 2 : 6;
    for (let i = 0; i < tiles; i++) for (let j = 0; j < 4; j++) {
      const x0 = -W / 2 + 0.05 + (i * (W - 0.1)) / tiles, x1 = -W / 2 + 0.05 + ((i + 1) * (W - 0.1)) / tiles, y0 = 0.12 + j * 0.4, y1 = 0.12 + (j + 1) * 0.4;
      Q(P(x0, y0, SPINE), P(x1, y0, SPINE), P(x1, y1, SPINE), P(x0, y1, SPINE), [0, 0], [tiles === 6 ? 1 : 3, 0], [tiles === 6 ? 1 : 3, 1], [0, 1]);
    }
    // header: Sedco blue with the yellow price flag
    ctx.albedo(null); ctx.color("#1d4f9e"); ctx.roughness(0.5); box(-W / 2, H - 0.17, 0, W / 2, H, 0.07);
    ctx.color("#f2c51c"); box(W / 2 - 0.62, H - 0.15, 0.07, W / 2 - 0.1, H - 0.02, 0.078);
    ctx.color("#ffffff"); box(-W / 2 + 0.1, H - 0.12, 0.07, -W / 2 + 0.75, H - 0.05, 0.075);
  }
  S = 1;
  if (lod >= 5) return { uvs };

  // ---- the stock
  const rnd = ctx.random;
  const bag = (cx, by, cz, w, h, c, lean, deep) => { // a pillow bag standing with its feet at by, face toward +Z of the side frame
    const r = cell(c, w / h), n = lod >= 3 ? 2 : 6, m = lod >= 3 ? 3 : 7, crimp = 0.06, b = deep * 0.5;
    const pt = (u, v, side) => {
      const vv = (v - crimp) / (1 - 2 * crimp), body = v > crimp && v < 1 - crimp ? 1 : 0;
      const z = side * (0.003 + body * b * Math.pow(Math.sin(Math.PI * u), 0.55) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, vv))), 0.5));
      const y = v * h, sag = body * 0.012 * Math.sin(Math.PI * u) * (1 - vv); // bags settle a little at the bottom
      return P(cx + (u - 0.5) * w * (1 + body * 0.02), by + y - sag, cz + z - lean * y);
    };
    const uvAt = (u, v, flip) => [r.u0 + (flip ? 1 - u : u) * (r.u1 - r.u0), r.v0 + v * (r.v1 - r.v0)];
    ctx.albedo(c >= 0 ? CHIPS : null); ctx.color("#ffffff"); ctx.roughness(0.32); ctx.metalness(0.15);
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = j / m, v1 = (j + 1) / m;
      Q(pt(u0, v0, 1), pt(u1, v0, 1), pt(u1, v1, 1), pt(u0, v1, 1), uvAt(u0, v0), uvAt(u1, v0), uvAt(u1, v1), uvAt(u0, v1));
      Q(pt(u1, v0, -1), pt(u0, v0, -1), pt(u0, v1, -1), pt(u1, v1, -1), uvAt(u1, v0, 1), uvAt(u0, v0, 1), uvAt(u0, v1, 1), uvAt(u1, v1, 1));
    }
  };
  const pbox = (cx, by, cz, c) => { // a printed box, its label on the front, the label's edge wrapping the sides and top
    const [w, h, d] = BOX[c], r = cell(c, w / h), e = 0.012;
    const front = [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]];
    const sideR = [[r.u1 - e, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u1 - e, r.v1]], sideL = [[r.u0, r.v0], [r.u0 + e, r.v0], [r.u0 + e, r.v1], [r.u0, r.v1]];
    const top = [[r.u0, r.v1 - e], [r.u1, r.v1 - e], [r.u1, r.v1], [r.u0, r.v1]];
    ctx.albedo(BOXES); ctx.color("#ffffff"); ctx.roughness(0.55); ctx.metalness(0);
    box(cx - w / 2, by, cz - d, cx + w / 2, by + h, cz, (f) => f === "front" ? front : f === "r" ? sideR : f === "l" ? sideL : f === "top" || f === "bot" ? top : sideR);
  };

  for (const s of [1, -1]) {
    S = s;
    const plan = s > 0 ? [[4, 7, 5], "sponge", "chips"] : [[5, 6, 4], "sponge", "chips"]; // bottom: big boxes · middle: spongebob · top: chips
    for (const [i, y] of SHELVES.entries()) {
      const front = DEEP - (i ? 0.06 : 0.02);
      let x = -W / 2 + 0.09;
      while (x < W / 2 - 0.12) {
        const gap = rnd() < 0.08; // an after-hours gap, nobody restocked
        if (plan[i] === "chips") {
          const c = Math.floor(rnd() * 8), w = 0.2, h = 0.3;
          if (x + w > W / 2 - 0.08) break;
          if (!gap) for (let k = 0; k < (lod >= 3 ? 1 : 2); k++) bag(x + w / 2, y, front - 0.03 - k * 0.09, w, h, c, 0.1 + k * 0.03, 0.08);
          x += w + 0.015;
        } else {
          const c = plan[i] === "sponge" ? Math.floor(rnd() * 4) : plan[i][Math.floor(rnd() * 3)], [w, , d] = BOX[c];
          const facing = c === 3 ? 3 : 1, fw = w * facing + 0.01 * (facing - 1);
          if (x + fw > W / 2 - 0.08) break;
          if (!gap) for (let f = 0; f < facing; f++) for (let k = 0; k < (lod >= 3 ? 1 : Math.max(1, Math.min(4, Math.floor(0.24 / d)))); k++) pbox(x + w / 2 + f * (w + 0.01), y, front - k * (d + 0.004), c);
          x += fw + 0.02;
        }
        // shelf ticket under each facing
        if (lod < 3) { ctx.albedo(null); ctx.color(rnd() < 0.3 ? "#f2c51c" : "#ffffff"); ctx.roughness(0.6); box(x - 0.11, y - 0.035, front + (i ? 0.065 : 0.025), x - 0.05, y - 0.008, front + (i ? 0.068 : 0.028)); }
      }
    }
    // pegboard hooks with hanging snacks: slim jims below, small chip bags above
    if (lod < 4) for (const [hi, hy] of HOOK_Y.entries()) for (let k = 0; k < 4; k++) {
      const hx = -W / 2 + 0.36 + k * 0.56;
      steel(); box(hx - 0.004, hy - 0.004, SPINE, hx + 0.004, hy + 0.004, SPINE + 0.26);
      if (rnd() < 0.12) continue; // a picked-over hook
      for (let j = 0; j < (lod >= 3 ? 1 : 3); j++) {
        if (hi === 0) bag(hx, hy - 0.2, SPINE + 0.22 - j * 0.06, 0.15, 0.2, Math.floor(rnd() * 8), 0, 0.045);
        else pbox(hx, hy - 0.21, SPINE + 0.24 - j * 0.05, 6);
      }
    }
  }
  S = 1;
  // one bag knocked over and lying on the bottom shelf, the store's only sign anyone was here
  if (lod < 3) { S = 1; const bx = 0.6, by = SHELVES[0] + 0.005, bz = DEEP - 0.05; ctx.albedo(CHIPS); ctx.color("#ffffff"); const r = cell(0, 0.66);
    Q(P(bx - 0.15, by + 0.03, bz - 0.2), P(bx + 0.15, by + 0.03, bz - 0.2), P(bx + 0.15, by + 0.05, bz), P(bx - 0.15, by + 0.05, bz), [r.u0, r.v1], [r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1]); }
  return { uvs };
}
export function collider() { return { kind: "box", width: 2.4, height: 1.9, depth: 0.92, center: [0, 0.95, 0] }; }
