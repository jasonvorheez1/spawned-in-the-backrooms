// Ferry, the refrigerator in the kitchen of Level 169's house: the pieces (this file is also the geometry script of every piece) and where they stand.
// What Ferry does lives in scripts/ferry.js; what it says, in scripts/lib/data/ferry-notes.yml. Geometry is modelled in a viewer frame
// (+X the viewer's right, +Z out of the door toward the viewer) and turned half a turn on emit, so the finished thing faces -Z.
const SELF = "scripts/lib/l169-ferry.js";
const BEHAVIOR = "scripts/ferry.js";
export const DOOR = { w: 0.78, h: 1.56, d: 0.085, y0: 0.16, bulge: 0.012 }; // the leaf, origin at its hinge edge's foot
export const doorZ = (fx, fy) => DOOR.d + DOOR.bulge * Math.cos((Math.PI * (fx - DOOR.w / 2)) / DOOR.w) * Math.cos((Math.PI * (fy - DOOR.h / 2)) / DOOR.h); // how far the enamel stands out at a spot on the door
const MAGNETS = [["F", "oklch(0.62 0.21 28)"], ["E", "oklch(0.7 0.17 250)"], ["R", "oklch(0.83 0.17 95)"], ["R", "oklch(0.68 0.19 145)"], ["Y", "oklch(0.68 0.2 320)"], ["heart", "oklch(0.62 0.22 15)"], ["star", "oklch(0.82 0.16 85)"], ["sun", "oklch(0.74 0.17 55)"], ["tri", "oklch(0.66 0.17 230)"]];
const PAPER = ["#f7e56b", "#f6a9c4", "#a8e3a0", "#9fd3f2"];
const TINS = ["oklch(0.7 0.16 60)", "oklch(0.6 0.17 25)", "oklch(0.62 0.13 150)", "oklch(0.66 0.14 85)"];

let C = null;
const V = (p) => [-p[0], p[1], -p[2]];
const quad = (a, b, c, d) => { a = V(a); b = V(b); c = V(c); d = V(d); C.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]); };
const tri = (a, b, c) => { a = V(a); b = V(b); c = V(c); C.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
function coords(h, r, n, cuts) {
  const a = [];
  for (let i = 0; i <= n; i++) a.push(-h + r - r * Math.tan((Math.PI / 4) * (1 - i / n)));
  for (const c of [...(cuts ?? [])].sort((p, q) => p - q)) if (c > -h + r + 1e-4 && c < h - r - 1e-4) a.push(c);
  for (let i = 0; i <= n; i++) a.push(h - r + r * Math.tan((Math.PI / 4) * (i / n)));
  return a.filter((v, i) => !i || v - a[i - 1] > 1e-6);
}
// a box with every edge and corner rolled to radius r; flat faces split at cuts so a hole or a dent has vertices to use
function rbox(c, w, h, d, r, o = {}) {
  const H = [w / 2, h / 2, d / 2], n = o.n ?? 3;
  r = Math.min(r, H[0], H[1], H[2]);
  const ax = [0, 1, 2].map((a) => coords(H[a], r, n, o.cuts?.[a]));
  const cs = Math.cos(o.rot ?? 0), sn = Math.sin(o.rot ?? 0);
  const pt = (k, s, i, j, u, v) => {
    const p = [0, 0, 0]; p[i] = u; p[j] = v; p[k] = s * H[k];
    const q = p.map((x, a) => Math.max(-(H[a] - r), Math.min(H[a] - r, x)));
    const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2], l = Math.hypot(dx, dy, dz) || 1;
    let x = q[0] + (r * dx) / l, y = q[1] + (r * dy) / l; const z = q[2] + (r * dz) / l;
    if (o.rot) { const t = x * cs - y * sn; y = x * sn + y * cs; x = t; }
    const out = [x + c[0], y + c[1], z + c[2]];
    return o.warp ? o.warp(out) : out;
  };
  for (const [i, j, k, s] of [[1, 2, 0, 1], [2, 1, 0, -1], [2, 0, 1, 1], [0, 2, 1, -1], [0, 1, 2, 1], [1, 0, 2, -1]]) {
    if (o.faces && !o.faces(k, s)) continue;
    const U = ax[i], W = ax[j];
    for (let a = 0; a < U.length - 1; a++) for (let b = 0; b < W.length - 1; b++) {
      if (o.skip) { const m = [0, 0, 0]; m[i] = (U[a] + U[a + 1]) / 2; m[j] = (W[b] + W[b + 1]) / 2; m[k] = s * H[k]; if (o.skip(k, s, m)) continue; }
      const p0 = pt(k, s, i, j, U[a], W[b]), p1 = pt(k, s, i, j, U[a + 1], W[b]), p2 = pt(k, s, i, j, U[a + 1], W[b + 1]), p3 = pt(k, s, i, j, U[a], W[b + 1]);
      if (o.inv) quad(p3, p2, p1, p0); else quad(p0, p1, p2, p3);
    }
  }
}
const bar = (x0, y0, x1, y1, t, depth, n = 2) => rbox([(x0 + x1) / 2, (y0 + y1) / 2, depth / 2], Math.hypot(x1 - x0, y1 - y0) + t, t, depth, Math.min(t, depth) * 0.46, { rot: Math.atan2(y1 - y0, x1 - x0), n });
// a flat shape, star-shaped about its middle, raised off the door with a rolled rim. pts run anticlockwise seen from the front
function slab(pts, depth, bev) {
  let cx = 0, cy = 0; for (const p of pts) { cx += p[0] / pts.length; cy += p[1] / pts.length; }
  let R = 0; for (const p of pts) R += Math.hypot(p[0] - cx, p[1] - cy) / pts.length;
  const k = 1 - bev / R, inn = pts.map((p) => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = inn[i], ib = inn[(i + 1) % pts.length];
    tri([cx, cy, depth], [ia[0], ia[1], depth], [ib[0], ib[1], depth]);
    quad([a[0], a[1], depth - bev], [b[0], b[1], depth - bev], [ib[0], ib[1], depth], [ia[0], ia[1], depth]);
    quad([a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], depth - bev], [a[0], a[1], depth - bev]);
  }
}
function lathe(prof, seg, y0 = 0) {
  for (let i = 0; i < prof.length - 1; i++) for (let s = 0; s < seg; s++) {
    const a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2, [r0, h0] = prof[i], [r1, h1] = prof[i + 1];
    const P = (r, h, a) => [r * Math.cos(a), y0 + h, r * Math.sin(a)];
    if (r0 < 1e-5) tri(P(r0, h0, a0), P(r1, h1, a0), P(r1, h1, a1));
    else if (r1 < 1e-5) tri(P(r0, h0, a1), P(r0, h0, a0), P(r1, h1, a0));
    else quad(P(r0, h0, a1), P(r0, h0, a0), P(r1, h1, a0), P(r1, h1, a1));
  }
}
const ENAMEL = "cdn/texture-cream-enamel-painted-steel.png";
const enamel = () => { C.albedo(ENAMEL); C.color("oklch(0.95 0.035 95)"); C.metalness(0); C.roughness(0.32); };
const chrome = () => { C.albedo(null); C.color("oklch(0.86 0.005 250)"); C.metalness(1); C.roughness(0.18); };
const plastic = (col, rough = 0.45) => { C.albedo(null); C.color(col); C.metalness(0); C.roughness(rough); };
const HOLE = { x: 0.33, y0: 0.22, y1: 1.66 }, CAB = { cy: 0.925, cz: -0.02, w: 0.8, h: 1.65, d: 0.56 }; // the cabinet: front plane at z 0.26

function cabBody(lod, inner) {
  const n = lod >= 3 ? 1 : 4;
  enamel(); C.smooth();
  if (!inner) {
  rbox([0, CAB.cy, CAB.cz], CAB.w, CAB.h, CAB.d, 0.06, { n, cuts: [[-HOLE.x, HOLE.x], [HOLE.y0 - CAB.cy, HOLE.y1 - CAB.cy], []], skip: (k, s, m) => k === 2 && s === 1 && Math.abs(m[0]) < HOLE.x && m[1] > HOLE.y0 - CAB.cy && m[1] < HOLE.y1 - CAB.cy });
  // the liner: white, seen from inside
  plastic("oklch(0.97 0.008 220)", 0.5); C.flat();
  rbox([0, (HOLE.y0 + HOLE.y1) / 2, 0.01], HOLE.x * 2, HOLE.y1 - HOLE.y0, 0.5, 0.001, { n: 1, inv: true, faces: (k, s) => !(k === 2 && s === 1) });
  }
  C.smooth();
  if (lod <= 3) {
    for (const y of [0.5, 0.82, 1.12]) { plastic("oklch(0.93 0.012 210)", 0.3); rbox([0, y, 0.0], 0.655, 0.014, 0.44, 0.006, { n: 1 }); chrome(); rbox([0, y + 0.012, 0.215], 0.655, 0.012, 0.012, 0.005, { n: 1 }); }
    plastic("oklch(0.9 0.05 165)", 0.25); rbox([0, 0.345, 0.02], 0.62, 0.21, 0.42, 0.03, { n: 2 }); // crisper drawer
    chrome(); rbox([0, 0.4, 0.236], 0.3, 0.02, 0.016, 0.007, { n: 1 });
    C.albedo(null); C.color("oklch(0.8 0.01 240)"); C.metalness(0.9); C.roughness(0.4); rbox([0, 1.52, 0.19], 0.62, 0.24, 0.02, 0.008, { n: 1 }); // the ice box flap
  }
}
function feet(lod) {
  plastic("oklch(0.22 0.01 60)", 0.7);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rbox([sx * 0.33, 0.055, CAB.cz + sz * 0.21], 0.07, 0.11, 0.07, 0.02, { n: lod >= 3 ? 1 : 2 });
}
function door(lod) {
  const D = DOOR, n = lod >= 3 ? 1 : 3, cx = [], cy = [];
  if (lod <= 2) { for (let x = 0.06; x < D.w - 0.05; x += 0.06) cx.push(x - D.w / 2); for (let y = 0.06; y < D.h - 0.05; y += 0.06) cy.push(y - D.h / 2); }
  enamel(); C.smooth();
  rbox([D.w / 2, D.h / 2, D.d / 2], D.w, D.h, D.d, 0.04, { n, cuts: [cx, cy, []], warp: (p) => {
    if (p[2] <= D.d / 2) return p;
    const f = (p[2] - D.d / 2) / (D.d / 2), dent = 0.013 * Math.exp(-((p[0] - 0.55) ** 2 + (p[1] - 0.36) ** 2 * 0.7) / 0.0032);
    return [p[0], p[1], p[2] + f * (doorZ(p[0], p[1]) - D.d) - f * dent];
  } });
  if (lod >= 4) return;
  chrome(); // the pull: a long chrome bar on two posts, on the free edge
  rbox([0.7, 0.98, D.d + 0.05], 0.03, 0.34, 0.026, 0.012, { n: 2 });
  for (const y of [0.85, 1.11]) rbox([0.7, y, D.d + 0.022], 0.026, 0.034, 0.05, 0.01, { n: 2 });
  rbox([0.39, 0.2, doorZ(0.39, 0.2) + 0.002], 0.6, 0.016, 0.01, 0.004, { n: 1 }); // trim line
  rbox([0.39, 1.5, doorZ(0.39, 1.5) + 0.002], 0.16, 0.03, 0.01, 0.004, { n: 1 }); // maker's badge
  plastic("oklch(0.96 0.008 220)", 0.5); // the inner panel and its bottle rail
  rbox([D.w / 2, D.h / 2, -0.012], 0.62, 1.38, 0.03, 0.012, { n: 2 });
  rbox([D.w / 2, 0.42, -0.06], 0.6, 0.1, 0.07, 0.012, { n: 1, faces: (k, s) => !(k === 1 && s === 1) });
  plastic("oklch(0.3 0.01 250)", 0.8); rbox([D.w / 2, D.h / 2, 0.004], 0.7, 1.48, 0.012, 0.005, { n: 1 }); // rubber seal
}
const LET = { // strokes in a cell 0.8 wide, 1.4 tall
  F: [[0, 0, 0, 1.4], [0, 1.4, 0.8, 1.4], [0, 0.75, 0.6, 0.75]],
  E: [[0, 0, 0, 1.4], [0, 1.4, 0.8, 1.4], [0, 0.72, 0.6, 0.72], [0, 0, 0.8, 0]],
  Y: [[0, 1.4, 0.4, 0.7], [0.8, 1.4, 0.4, 0.7], [0.4, 0.7, 0.4, 0]],
  R: (() => { const a = [[0, 0, 0, 1.4], [0, 1.4, 0.42, 1.4], [0, 0.7, 0.42, 0.7], [0.32, 0.7, 0.8, 0]]; let p = [0.42, 1.4]; for (let i = 1; i <= 5; i++) { const t = Math.PI / 2 - (i / 5) * Math.PI, q = [0.42 + 0.35 * Math.cos(t), 1.05 + 0.35 * Math.sin(t)]; a.push([p[0], p[1], q[0], q[1]]); p = q; } return a; })(),
};
function magnet(k, col, lod) {
  plastic(col, 0.35); C.smooth();
  const dep = 0.012;
  if (LET[k]) { const s = 0.045, t = 0.014; for (const [x0, y0, x1, y1] of LET[k]) bar((x0 - 0.4) * s, y0 * s + t / 2, (x1 - 0.4) * s, y1 * s + t / 2, t, dep, lod >= 3 ? 1 : 2); return; }
  const pts = [], N = lod >= 3 ? 10 : 28;
  if (k === "heart") for (let i = 0; i < N; i++) { const t = -(i / N) * Math.PI * 2; pts.push([0.0021 * 16 * Math.sin(t) ** 3, 0.036 + 0.0021 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); }
  else if (k === "star") for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.017 : 0.036; pts.push([r * Math.cos(a), 0.036 + r * Math.sin(a)]); }
  else if (k === "tri") for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i / 3) * Math.PI * 2; pts.push([0.036 * Math.cos(a), 0.03 + 0.036 * Math.sin(a)]); }
  else for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; pts.push([0.032 * Math.cos(a), 0.032 + 0.032 * Math.sin(a)]); }
  slab(pts, dep, 0.004);
}
function note(size, col) { // a square of paper stuck by its top edge, the foot lifting a little
  plastic(col, 0.9); C.smooth();
  const N = 6, z = (v) => 0.0015 + 0.006 * (1 - v) ** 2, P = (u, v) => [(u - 0.5) * size, v * size, z(v)];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) quad(P(i / N, j / N), P((i + 1) / N, j / N), P((i + 1) / N, (j + 1) / N), P(i / N, (j + 1) / N));
}
function bottle(lod) { // grey almond water in a glass bottle, cold
  const seg = lod >= 3 ? 8 : 16; C.smooth();
  C.albedo(null); C.color("oklch(0.9 0.025 95)"); C.metalness(0); C.roughness(0.12);
  lathe([[0, 0], [0.034, 0], [0.037, 0.008], [0.037, 0.125], [0.033, 0.15], [0.02, 0.185], [0.0155, 0.2], [0.0155, 0.225]], seg);
  plastic("oklch(0.5 0.1 235)", 0.6); lathe([[0.0375, 0.045], [0.0385, 0.048], [0.0385, 0.107], [0.0375, 0.11]], seg); // label
  C.color("oklch(0.75 0.02 250)"); C.metalness(0.9); C.roughness(0.3); lathe([[0.0155, 0.222], [0.019, 0.224], [0.019, 0.242], [0.016, 0.246], [0, 0.246]], seg); // cap
}
function tin(col, lod) {
  const seg = lod >= 3 ? 8 : 18; C.smooth();
  C.albedo(null); C.color("oklch(0.8 0.008 250)"); C.metalness(0.9); C.roughness(0.3);
  lathe([[0, 0], [0.04, 0], [0.043, 0.003], [0.043, 0.008], [0.041, 0.011], [0.041, 0.097], [0.043, 0.1], [0.043, 0.105], [0.04, 0.108], [0.038, 0.104], [0, 0.104]], seg);
  plastic(col, 0.7); lathe([[0.0412, 0.014], [0.042, 0.016], [0.042, 0.092], [0.0412, 0.094]], seg);
  plastic("oklch(0.95 0.03 95)", 0.7); lathe([[0.0421, 0.04], [0.0425, 0.042], [0.0425, 0.066], [0.0421, 0.068]], seg);
}
function dial(lod) { // the thermostat on the ice box flap
  chrome(); C.smooth();
  const pts = []; for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; pts.push([0.034 * Math.cos(a), 0.034 + 0.034 * Math.sin(a)]); }
  slab(pts, 0.018, 0.005);
  plastic("oklch(0.6 0.2 250)", 0.4); bar(0, 0.034, 0, 0.06, 0.008, 0.022, 1);
}
export function geometry(ctx) {
  C = ctx; const p = ctx.params ?? {}, lod = ctx.lod ?? 1;
  if (p.part === "door") door(lod);
  else if (p.part === "magnet") magnet(p.k, p.col, lod);
  else if (p.part === "note") note(p.size ?? 0.13, p.col);
  else if (p.part === "bottle") bottle(lod);
  else if (p.part === "tin") tin(p.col, lod);
  else if (p.part === "dial") dial(lod);
  else if (p.inner) cabBody(lod, true); // the Tripo shell (art/ferry-fridge) is the body; only shelves, crisper and flap are drawn here
  else { cabBody(lod); feet(lod); }
  ctx.albedo(null); ctx.color(null); ctx.metalness(null); ctx.roughness(null);
}
export function collider(ctx) {
  const p = ctx.params ?? {};
  if (p.part) return null;
  const { cy, cz, w, h, d } = CAB; // the shell only: the inside stays open so a look reaches the shelves
  return [
    { kind: "box", width: w, height: h, depth: 0.06, center: [0, cy, -(cz - d / 2 + 0.03)] },
    { kind: "box", width: 0.07, height: h, depth: d, center: [-(w / 2 - 0.035), cy, -cz] },
    { kind: "box", width: 0.07, height: h, depth: d, center: [w / 2 - 0.035, cy, -cz] },
    { kind: "box", width: w, height: 0.09, depth: d, center: [0, 1.705, -cz] },
    { kind: "box", width: w, height: 0.22, depth: d, center: [0, 0.11, -cz] },
  ];
}
// viewer-frame spot -> the row's own frame (the half turn)
const at = (x, y, z) => ({ x: -x, y, z: -z });
export function shelfSpot(kind, i) { // where stocked item i stands, viewer frame
  const col = i % 4, row = i >> 2;
  if (kind === "water") return [-0.24 + col * 0.16 + (row ? 0.0 : 0.0), row ? 1.127 : 0.827, 0.1];
  return [-0.24 + col * 0.16 + (row ? 0.08 : 0), 0.507, row ? -0.06 : 0.1];
}
const SHELL = "/cdn/value.91413621234bed7b9f4ac2f3f4a651a430fbd08d3edcf2f580d582e78c4b5f4f.glb", LEAF = "/cdn/value.f55236e60e8068274df5108e801f4d80fbefeb3df6922f26731bfb0967933903.glb"; // Tripo fridge, split in art/ferry-fridge/build.py
export function layFerry(ctx, put, L) {
  const F = L.house.ferry, cap = L.ferry.capacity, id = "l169-ferry-plan";
  const old = ctx.getObject(id)?.state, keep = old && typeof old.water === "number" ? { water: old.water, food: old.food, at: old.at } : { water: cap, food: cap, at: ctx.now() };
  const far = { max: 45 }, part = (params) => ({ kind: "scripted", script: SELF, params });
  const kid = (role, extra) => ({ behavior: BEHAVIOR, visibleRange: far, castShadow: false, ...extra, state: { root: id, role, ...(extra.state ?? {}) } });
  const mats = { pbr: true };
  const children = [];
  const doorKids = [];
  MAGNETS.forEach(([k, col], i) => doorKids.push({ id: "m" + i, tags: ["l169-ferry-magnet"], feetPosition: at(0.14 + i * 0.06, 1.25, doorZ(0.14 + i * 0.06, 1.25)), rotation: { yaw: 0, pitch: 0, roll: 0 }, pivot: "center", primitive: part({ part: "magnet", k, col }), material: mats, visibleRange: far, castShadow: false }));
  PAPER.forEach((col, i) => doorKids.push({ id: "n" + i, tags: ["l169-ferry-note"], feetPosition: at(0.13 + i * 0.18, 1.39, doorZ(0.13 + i * 0.18, 1.39) + 0.002), scale: { x: 1, y: 1, z: 1 }, primitive: part({ part: "note", size: 0.13, col }), material: { roughness: 0.9 }, visibleRange: far, castShadow: false, state: { line: "" },
    ui: `<div face="front" width="0.13m" style="width:130px;height:130px;box-sizing:border-box;padding:12px 9px 8px;display:flex;align-items:center;justify-content:center;text-align:center;font:700 23px/1.08 'Segoe Print','Bradley Hand','Chalkboard SE','Comic Sans MS',cursive;color:#23304f;transform:rotate(-2deg)">{{ state.line }}</div>` }));
  children.push(kid("door", { id: "door", tags: ["usable", "interact", "l169-ferry-door"], feetPosition: at(-DOOR.w / 2, DOOR.y0, 0.262), rotation: { yaw: 0 }, model: { id: LEAF, offset: [-0.39, 0, 0] }, visibleRange: { max: 450 }, castShadow: true, state: { name: "Ferry", verb: "Open", prompt: "Open Ferry", info: "" }, children: doorKids }));
  for (let i = 0; i < cap; i++) { const [x, y, z] = shelfSpot("water", i); children.push(kid("water", { id: "w" + i, tags: ["usable", "interact"], feetPosition: at(x, y, z), rotation: { yaw: i * 67 }, primitive: part({ part: "bottle" }), material: mats, state: { name: "cold almond water", verb: "Take", prompt: "Take cold almond water", info: "Stays water while it stays cold", taken: true } })); }
  for (let i = 0; i < cap; i++) { const [x, y, z] = shelfSpot("food", i); children.push(kid("food", { id: "f" + i, tags: ["usable", "interact"], feetPosition: at(x, y, z), rotation: { yaw: i * 53 }, primitive: part({ part: "tin", col: TINS[i % TINS.length] }), material: mats, state: { name: "tinned peaches", verb: "Eat", prompt: "Eat tinned peaches", info: "Hunger +35", taken: true } })); }
  children.push(kid("chill", { id: "dial", tags: ["usable", "interact"], feetPosition: at(0.2, 1.49, 0.2), primitive: part({ part: "dial" }), material: mats, state: { name: "", verb: "Hold the door open and cool your bottles", prompt: "Hold the door open and cool your bottles", info: "", taken: true } }));
  children.push({ id: "cold", feetPosition: at(0, 1.3, 0.12) });
  children.push({ id: "shell", feetPosition: { x: 0, y: 0, z: 0 }, model: { id: SHELL }, castShadow: true, receiveShadow: true }); // carries the inside light and the compressor's hum while the door is open
  put(id, { tags: ["l169-ferry"], feetPosition: { x: F.x, z: F.z, y: { terrain: L.house.floorUp } }, rotation: { yaw: F.yaw }, primitive: part({ inner: true }), material: mats, physics: "static", behavior: BEHAVIOR, state: { ...keep, open: false, name: "Ferry" }, children });
}
