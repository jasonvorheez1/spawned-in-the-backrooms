// A sign board, built by style (scripts/lib/sign-style.js picks one per sign): params { style, w, h, d, base, accent }.
// Origin at the bottom centre; the lettered face is the flat plane at z = -d/2 (the ui panel sits on it), everything else sits behind
// or stands proud of it by a few millimetres (nails, rivets, screws). Styles: plank, tin, enamel, plywood, cardboard, street, plaque.
let C, R;
const rnd = () => R();
function shade(css, dl) { const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(css ?? ""); if (!m) return css ?? "oklch(0.3 0.02 70)"; const l = Math.max(0.03, Math.min(0.97, +m[1] + dl)); return `oklch(${l.toFixed(3)} ${m[2]} ${m[3]})`; }
// a hexahedron from 8 corners, k = (x?1:0) + (y?2:0) + (z?4:0); every face outward
function hexa(c) {
  const q = (a, b, d, e) => C.quad(...c[a], ...c[b], ...c[d], ...c[e]);
  q(0, 2, 3, 1); q(4, 5, 7, 6); q(0, 4, 6, 2); q(1, 3, 7, 5); q(0, 1, 5, 4); q(2, 6, 7, 3);
}
function box(x0, y0, z0, x1, y1, z1) { hexa([[x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0], [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1]]); }
// an outline (CCW seen from the front, x right, y up) pushed from z0 (the face) back to z1
function prism(pts, z0, z1) {
  let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    C.tri(cx, cy, z0, bx, by, z0, ax, ay, z0); C.tri(cx, cy, z1, ax, ay, z1, bx, by, z1);
    C.quad(ax, ay, z0, bx, by, z0, bx, by, z1, ax, ay, z1);
  }
}
function rounded(x0, y0, x1, y1, r, n = 5) {
  const out = [], cs = [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = ((a0 + (90 * i) / n) * Math.PI) / 180; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
const dot = (x, y, z, s, proud) => box(x - s, y - s, z - proud, x + s, y + s, z + 0.004); // a nail head, rivet or screw on the face

function plank(w, h, d, base) {
  const n = Math.max(2, Math.min(5, Math.round(h / 0.2))), gap = 0.012, bh = (h - gap * (n - 1)) / n, z0 = -d / 2;
  for (let i = 0; i < n; i++) {
    const y0 = i * (bh + gap), y1 = y0 + bh, l0 = -w / 2 - 0.04 + rnd() * 0.08, l1 = l0 + (rnd() - 0.5) * 0.05, r0 = w / 2 - 0.04 + rnd() * 0.08, r1 = r0 + (rnd() - 0.5) * 0.05;
    const bz = z0 + d * (0.7 + rnd() * 0.3);
    C.color(shade(base, (rnd() - 0.5) * 0.07)); C.roughness(0.92);
    hexa([[l0, y0, z0], [r0, y0, z0], [l1, y1, z0], [r1, y1, z0], [l0, y0, bz], [r0, y0, bz], [l1, y1, bz], [r1, y1, bz]]);
    C.color("oklch(0.24 0.01 50)"); C.metalness(0.6); C.roughness(0.5);
    for (const sx of [-0.3, 0.3]) dot(sx * w, y0 + bh / 2 + (rnd() - 0.5) * 0.03, z0, 0.007, 0.003);
    C.metalness(null);
  }
  C.color(shade(base, -0.06)); C.roughness(0.9);
  for (const sx of [-0.3, 0.3]) box(sx * w - 0.035, -0.03, d / 2, sx * w + 0.035, h + 0.02, d / 2 + 0.03); // battens behind
}
function tin(w, h, d, base, accent) {
  const z0 = -d / 2, lip = Math.min(0.025, w * 0.03);
  C.color(base); C.roughness(0.55); C.metalness(0.35);
  prism([[-w / 2, 0], [w / 2, 0], [w / 2, h - 0.03], [w / 2 - 0.03, h], [-w / 2, h]], z0, z0 + 0.008); // one top corner clipped off
  C.color(shade(base, -0.08)); // the rolled lip, flush with the face, deeper behind
  box(-w / 2, 0, z0, w / 2, lip, d / 2); box(-w / 2, h - lip, z0, w / 2 - 0.03, h, d / 2);
  box(-w / 2, lip, z0, -w / 2 + lip, h - lip, d / 2); box(w / 2 - lip, lip, z0, w / 2, h - 0.03, d / 2);
  C.color("oklch(0.62 0.02 80)"); C.metalness(0.8); C.roughness(0.4);
  for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) dot(x * (w / 2 - lip * 1.6), h / 2 + y * (h / 2 - lip * 1.6), z0, 0.009, 0.004);
  C.metalness(null); C.color(accent ?? "oklch(0.42 0.11 45)"); C.roughness(0.95); // rust run from two rivets
  for (const x of [-1, 1]) { const rx = x * (w / 2 - lip * 1.6), len = h * (0.2 + rnd() * 0.25); box(rx - 0.006, h - lip * 1.6 - len, z0 - 0.0015, rx + 0.006, h - lip * 1.6, z0); }
}
function enamel(w, h, d, base, accent) {
  const z0 = -d / 2, r = Math.min(w, h) * 0.12, b = Math.min(w, h) * 0.05;
  C.color(base); C.roughness(0.25); C.metalness(0.1); prism(rounded(-w / 2, 0, w / 2, h, r), z0, d / 2);
  C.color(accent ?? "oklch(0.9 0.02 90)"); // the raised border line
  const o = rounded(-w / 2 + b, b, w / 2 - b, h - b, Math.max(0.005, r - b)), ii = rounded(-w / 2 + b * 1.6, b * 1.6, w / 2 - b * 1.6, h - b * 1.6, Math.max(0.004, r - b * 1.6));
  for (let i = 0; i < o.length; i++) { const j = (i + 1) % o.length; C.quad(o[i][0], o[i][1], z0 - 0.002, ii[i][0], ii[i][1], z0 - 0.002, ii[j][0], ii[j][1], z0 - 0.002, o[j][0], o[j][1], z0 - 0.002); }
  C.color("oklch(0.7 0.01 90)"); C.metalness(0.8); C.roughness(0.35);
  for (const [x, y] of [[-1, 0], [1, 0]]) dot(x * (w / 2 - b * 0.5), h / 2 + y, z0, 0.007, 0.003);
  C.color("oklch(0.15 0.01 250)"); C.metalness(0.4); C.roughness(0.8); // two chips knocked out of the enamel at the edge
  for (let i = 0; i < 2; i++) { const x = (rnd() - 0.5) * w * 0.9, y = rnd() < 0.5 ? b * 0.4 : h - b * 0.4, s = 0.01 + rnd() * 0.012; box(x - s, y - s * 0.6, z0 - 0.0008, x + s, y + s * 0.6, z0); }
  C.metalness(null);
}
function plywood(w, h, d, base) {
  const z0 = -d / 2, ch = Math.min(w, h) * 0.18;
  C.color(base); C.roughness(0.95);
  prism([[-w / 2, 0], [w / 2 - ch * 0.4, 0], [w / 2, ch * 0.5], [w / 2, h], [-w / 2 + ch, h], [-w / 2, h - ch * 0.6]], z0, z0 + 0.018); // sawn off-square
  C.color(shade(base, 0.12)); box(-w / 2 + 0.02, 0.02, z0 + 0.006, w / 2 - 0.02, h - 0.02, z0 + 0.012); // the plies show at the edge
  C.color("oklch(0.55 0.02 80)"); C.metalness(0.7);
  for (const [x, y] of [[-0.42, 0.85], [0.4, 0.82], [-0.4, 0.15], [0.38, 0.12]]) box(x * w - 0.012, y * h - 0.002, z0 - 0.002, x * w + 0.012, y * h + 0.002, z0); // staples
  C.metalness(null);
}
function cardboard(w, h, d, base) {
  const z0 = -d / 2, pts = [], n = 10;
  const edge = (ax, ay, bx, by) => { for (let i = 0; i < n; i++) { const t = i / n, j = (rnd() - 0.5) * 0.02; pts.push([ax + (bx - ax) * t + (ay === by ? 0 : j), ay + (by - ay) * t + (ax === bx ? 0 : j)]); } };
  edge(-w / 2, 0, w / 2, 0); edge(w / 2, 0, w / 2, h); edge(w / 2, h, -w / 2, h); edge(-w / 2, h, -w / 2, 0);
  C.color(base ?? "oklch(0.62 0.07 70)"); C.roughness(1); prism(pts, z0, z0 + 0.006);
  C.color("oklch(0.85 0.05 85)", 0.8); C.roughness(0.3); // packing tape over the top corners
  for (const x of [-1, 1]) { const cx = x * (w / 2 - 0.04); hexa([[cx - 0.09, h - 0.08, z0 - 0.001], [cx - 0.03, h - 0.11, z0 - 0.001], [cx + 0.03, h + 0.04, z0 - 0.001], [cx + 0.09, h + 0.01, z0 - 0.001], [cx - 0.09, h - 0.08, z0 + 0.0002], [cx - 0.03, h - 0.11, z0 + 0.0002], [cx + 0.03, h + 0.04, z0 + 0.0002], [cx + 0.09, h + 0.01, z0 + 0.0002]]); }
}
function street(w, h, d, base, accent) {
  const z0 = -d / 2, r = h * 0.22;
  C.color(base); C.roughness(0.4); C.metalness(0.3); prism(rounded(-w / 2, 0, w / 2, h, r), z0, z0 + 0.01);
  C.color(accent ?? "oklch(0.95 0.01 90)"); const b = h * 0.06, i0 = rounded(-w / 2 + b, b, w / 2 - b, h - b, r - b), i1 = rounded(-w / 2 + b * 1.5, b * 1.5, w / 2 - b * 1.5, h - b * 1.5, r - b * 1.5);
  for (let i = 0; i < i0.length; i++) { const j = (i + 1) % i0.length; C.quad(i0[i][0], i0[i][1], z0 - 0.001, i1[i][0], i1[i][1], z0 - 0.001, i1[j][0], i1[j][1], z0 - 0.001, i0[j][0], i0[j][1], z0 - 0.001); }
  C.color("oklch(0.45 0.01 250)"); C.metalness(0.7); box(-0.05, h * 0.15, z0 + 0.01, 0.05, h * 0.85, d / 2 + 0.03); // the clamp behind
  C.metalness(null);
}
function plaque(w, h, d, base, accent) {
  const z0 = -d / 2, f = Math.min(w, h) * 0.07;
  C.color(base); C.roughness(0.6); box(-w / 2 + f, f, z0 + 0.004, w / 2 - f, h - f, d / 2); // the inset field
  C.color(accent ?? "oklch(0.72 0.11 85)"); C.metalness(0.9); C.roughness(0.3); // a bevelled brass frame
  const fr = (ax, ay, bx, by, cx2, cy2, dx, dy) => hexa([[ax, ay, z0], [bx, by, z0], [dx, dy, z0], [cx2, cy2, z0], [ax, ay, d / 2], [bx, by, d / 2], [dx, dy, d / 2], [cx2, cy2, d / 2]]);
  fr(-w / 2, 0, w / 2, 0, -w / 2 + f, f, w / 2 - f, f); fr(-w / 2 + f, h - f, w / 2 - f, h - f, -w / 2, h, w / 2, h);
  fr(-w / 2, 0, -w / 2 + f, f, -w / 2, h, -w / 2 + f, h - f); fr(w / 2 - f, f, w / 2, 0, w / 2 - f, h - f, w / 2, h);
  C.metalness(null);
}

export function geometry(ctx) {
  C = ctx; R = ctx.random; const p = ctx.params ?? {};
  const w = p.w ?? 1, h = p.h ?? 0.5, d = Math.max(0.01, p.d ?? 0.05), base = p.base ?? "oklch(0.3 0.02 70)", st = p.style ?? "plywood";
  if ((ctx.lod ?? 1) >= 4) { C.color(base); box(-w / 2, 0, -d / 2, w / 2, h, d / 2); return; }
  if (st === "plank") plank(w, h, d, base); else if (st === "tin") tin(w, h, d, base, p.accent); else if (st === "enamel") enamel(w, h, d, base, p.accent);
  else if (st === "cardboard") cardboard(w, h, d, base); else if (st === "street") street(w, h, d, base, p.accent); else if (st === "plaque") plaque(w, h, d, base, p.accent);
  else plywood(w, h, d, base);
  C.color(null); C.roughness(null); C.metalness(null);
}
export function collider() { return null; }
