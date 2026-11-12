// A box with rounded, bevelled edges: an extrude whose outline + bevel fill w x h x d exactly (feet at its bottom, centred).
// r: edge radius in metres (default: up to 4 cm, never more than 30% of the thinnest side).
export function rbox(w, h, d, r) {
  r = Math.max(0.002, r ?? Math.min(0.04, Math.min(w, h, d) * 0.3));
  const W = Math.max(0.001, w - 2 * r), H = Math.max(0.001, h - 2 * r);
  return { kind: "extrude", shape: [[-W / 2, 0], [W / 2, 0], [W / 2, H], [-W / 2, H]], depth: Math.max(0.001, d - 2 * r),
    bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 4 };
}
