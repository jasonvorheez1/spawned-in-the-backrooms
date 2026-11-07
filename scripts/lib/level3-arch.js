// Level 3 crawl hall tube: an oval brick culvert (a squared ellipse) from the floor channel up to the crown (TH) over one span
// of a tight cell, its end rings closing out to the liner and up to the flat ceiling. inset pulls it inward (a rib), 0 = the tube surface.
// The profile keeps >= 0.47 m half width from 0.35 m up, so a 0.35 m capsule walks it; the floor channel is the flat strip between.
import { TW, TH, cellCenter } from "./level3.js";
import { face } from "./shapes.js";
export function profile(segs, inset = 0) { // [u, y]: up the right wall from the floor channel, over the crown, down the left
  const c = TH / 2, r = TH / 2 - inset, hw = TW - inset, d = 0.2, n = segs * 2, out = [];
  for (let i = 0; i <= n; i++) {
    const f = -Math.PI / 2 + d + (i / n) * (2 * Math.PI - 2 * d), s = Math.sin(f);
    out.push([Math.sign(Math.cos(f)) * hw * Math.pow(Math.max(0, 1 - s ** 4), 0.25), Math.max(0.005, c + r * s)]);
  }
  return out;
}
export function vault(ctx, cx, cz, span, inset = 0, segs = 8, a0 = span.a0, a1 = span.a1, ends = true) {
  const c = cellCenter(cx, cz), across = span.ax === "x" ? c.z : c.x, hw = TW - inset;
  const P = (a, u, y) => span.ax === "x" ? [a, y, across + u] : [across + u, y, a];
  const ring = profile(segs, inset);
  for (let i = 0; i < ring.length - 1; i++) {
    const [u0, y0] = ring[i], [u1, y1] = ring[i + 1], um = (u0 + u1) / 2, ym = (y0 + y1) / 2 - TH / 2;
    face(ctx, P(a0, u0, y0), P(a1, u0, y0), P(a1, u1, y1), P(a0, u1, y1), span.ax === "x" ? [0, -ym, -um] : [-um, -ym, 0]);
    if (ends) for (const [a, s] of [[a0, -1], [a1, 1]]) { // close the gap between the oval and the square liner/ceiling
      const n = span.ax === "x" ? [-s, 0, 0] : [0, 0, -s];
      if (ym > 0) face(ctx, P(a, u0, y0), P(a, u1, y1), P(a, u1, TH), P(a, u0, TH), n);
      else { const e = Math.sign(um) * hw; face(ctx, P(a, u0, y0), P(a, u1, y1), P(a, e, y1), P(a, e, y0), n); }
    }
  }
}
