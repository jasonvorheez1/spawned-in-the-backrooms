// Level 3 crawl hall vault: a brick barrel arch from the springline (TSP) to the crown (TH) over one span of a tight cell,
// end spandrels closing the gap up to the flat ceiling. inset pulls it inward (a rib), 0 = the vault surface itself.
import { TW, TSP, TH, cellCenter } from "./level3.js";
import { face } from "./shapes.js";
export function vault(ctx, cx, cz, span, inset = 0, segs = 8, a0 = span.a0, a1 = span.a1, ends = true) {
  const c = cellCenter(cx, cz), across = span.ax === "x" ? c.z : c.x, hw = TW - inset, rise = TH - TSP - inset;
  const P = (a, u, y) => span.ax === "x" ? [a, y, across + u] : [across + u, y, a];
  const ring = Array.from({ length: segs + 1 }, (_, i) => { const t = (i / segs) * Math.PI; return [hw * Math.cos(t), TSP + rise * Math.sin(t)]; });
  for (let i = 0; i < segs; i++) {
    const [u0, y0] = ring[i], [u1, y1] = ring[i + 1], um = (u0 + u1) / 2, ym = (y0 + y1) / 2 - TSP;
    face(ctx, P(a0, u0, y0), P(a1, u0, y0), P(a1, u1, y1), P(a0, u1, y1), span.ax === "x" ? [0, -ym, -um] : [-um, -ym, 0]);
    if (ends) for (const [a, s] of [[a0, -1], [a1, 1]]) face(ctx, P(a, u0, y0), P(a, u1, y1), P(a, u1, TH), P(a, u0, TH), span.ax === "x" ? [-s, 0, 0] : [0, 0, -s]);
  }
}
