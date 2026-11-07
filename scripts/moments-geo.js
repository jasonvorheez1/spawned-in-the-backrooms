// Level 0 "moments": the odd things a wanderer finds. One script, one mesh per kind (params.kind).
// Wall props: the wall face is local z = 0, the room is -z. Ceiling props: origin on the floor below.
import { N, S, H, HALF, wallX, wallZ, isArchWall, hasPit } from "./lib/maze.js";
const WALLPAPER = "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png";
const CEILING = "cdn/texture-white-acoustic-drop-ceiling-tile-grid.png";
const MANILA = "cdn/texture-plain-manila-folder-cardstock-paper.png";
let C, M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; const STACK = [];
const P = (x, y, z) => [M[0] * x + M[1] * y + M[2] * z + M[3], M[4] * x + M[5] * y + M[6] * z + M[7], M[8] * x + M[9] * y + M[10] * z + M[11]];
const mul = (b) => { const a = M, r = new Array(12); for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j]; r[i * 4 + 3] = a[i * 4] * b[3] + a[i * 4 + 1] * b[7] + a[i * 4 + 2] * b[11] + a[i * 4 + 3]; } M = r; };
const push = () => STACK.push(M), pop = () => { M = STACK.pop(); };
const at = (x, y, z) => mul([1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]);
const yaw = (d) => { const a = (d * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); mul([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]); };
const roll = (d) => { const a = (d * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); mul([c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]); };
const pitch = (d) => { const a = (d * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); mul([1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]); };
const q = (a, b, c, d) => C.quad(...P(...a), ...P(...b), ...P(...c), ...P(...d));
const t3 = (a, b, c) => C.tri(...P(...a), ...P(...b), ...P(...c));
function box(x0, y0, z0, x1, y1, z1, skip = "") {
  if (!skip.includes("t")) q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  if (!skip.includes("b")) q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  if (!skip.includes("f")) q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]); // -z (front)
  if (!skip.includes("k")) q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); // +z (back)
  if (!skip.includes("l")) q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  if (!skip.includes("r")) q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
}
const cbox = (cx, cy, cz, w, h, d, skip) => box(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, skip);
// a solid of revolution about local y: prof = [[r, y], ...] bottom to top
function lathe(prof, n = 10) {
  for (let i = 0; i < prof.length - 1; i++) for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
    q([Math.cos(a0) * r0, y0, Math.sin(a0) * r0], [Math.cos(a1) * r0, y0, Math.sin(a1) * r0], [Math.cos(a1) * r1, y1, Math.sin(a1) * r1], [Math.cos(a0) * r1, y1, Math.sin(a0) * r1]);
  }
  const top = prof[prof.length - 1]; if (top[0] > 0.001) for (let k = 0; k < n; k++) { const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2; t3([0, top[1], 0], [Math.cos(a1) * top[0], top[1], Math.sin(a1) * top[0]], [Math.cos(a0) * top[0], top[1], Math.sin(a0) * top[0]]); }
}
const cyl = (r, h, n = 8) => lathe([[r, 0], [r, h]], n);
const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---- kinds -------------------------------------------------------------------------------------------
function outlet() { // a dead outlet at head height, its plate yellowed, a grime halo round it
  C.color("oklch(0.66 0.07 80)"); box(-0.09, 1.66, -0.004, 0.09, 1.86, 0);
  C.color("oklch(0.9 0.03 90)"); C.roughness(0.4); box(-0.037, 1.7, -0.009, 0.037, 1.82, -0.003);
  C.color("oklch(0.18 0.01 80)");
  for (const y of [1.735, 1.785]) { box(-0.014, y - 0.009, -0.0105, -0.009, y + 0.009, -0.0085); box(0.009, y - 0.011, -0.0105, 0.014, y + 0.011, -0.0085); box(-0.003, y - 0.019, -0.0105, 0.003, y - 0.013, -0.0085); }
  C.color("oklch(0.5 0.01 90)"); box(-0.004, 1.756, -0.011, 0.004, 1.764, -0.009); C.roughness(null);
}
function falsedoor() { // a full door frame proud of the wall, its leaf swung open onto nothing: wallpaper behind
  const W = 0.47, D = 0.24, Hd = 2.12;
  C.albedo(WALLPAPER); C.color("oklch(0.98 0.012 90)");
  box(-W - 0.16, 0, -D, -W, Hd + 0.16, 0, "k"); box(W, 0, -D, W + 0.16, Hd + 0.16, 0, "k"); box(-W, Hd, -D, W, Hd + 0.16, 0, "kb");
  C.albedo(null); C.color("oklch(0.9 0.035 85)"); C.roughness(0.55); // painted reveal + casing
  box(-W - 0.01, 0, -D, -W + 0.005, Hd, -0.005); box(W - 0.005, 0, -D, W + 0.01, Hd, -0.005); box(-W, Hd - 0.005, -D, W, Hd + 0.01, -0.005);
  box(-W - 0.09, 0, -D - 0.02, -W, Hd + 0.09, -D); box(W, 0, -D - 0.02, W + 0.09, Hd + 0.09, -D); box(-W - 0.09, Hd, -D - 0.02, W + 0.09, Hd + 0.09, -D);
  C.color("oklch(0.62 0.05 75)"); box(-W, 0, -D + 0.02, W, 0.012, -0.005); // threshold
  push(); at(-W + 0.02, 0, -D - 0.03); yaw(-104); // the leaf: hinged on the left jamb, swung wide into the room
  C.color("oklch(0.6 0.075 62)"); C.roughness(0.5); box(0, 0.01, -0.02, 0.9, 2.08, 0.02);
  C.color("oklch(0.55 0.07 60)");
  for (const [y0, y1] of [[0.22, 0.95], [1.12, 1.9]]) { box(0.12, y0, -0.026, 0.42, y1, -0.02); box(0.48, y0, -0.026, 0.78, y1, -0.02); box(0.12, y0, 0.02, 0.42, y1, 0.026); box(0.48, y0, 0.02, 0.78, y1, 0.026); }
  C.color("oklch(0.72 0.06 85)"); C.metalness(0.8); C.roughness(0.3);
  push(); at(0.8, 1.0, -0.06); pitch(90); cyl(0.028, 0.04, 8); pop(); push(); at(0.8, 1.0, 0.02); pitch(90); cyl(0.028, 0.04, 8); pop();
  box(0.775, 0.98, -0.035, 0.825, 1.02, 0.035); C.metalness(null); C.roughness(null);
  pop();
}
export const FALSEDOOR_COLLIDER = [{ kind: "box", width: 0.16, height: 2.3, depth: 0.24, center: [-0.55, 1.15, -0.12] }, { kind: "box", width: 0.16, height: 2.3, depth: 0.24, center: [0.55, 1.15, -0.12] }];
function chair() { // a mesh-back office chair, seat facing -z, abandoned mid-swivel
  C.color("oklch(0.22 0.01 260)"); C.metalness(0.6); C.roughness(0.35);
  for (let i = 0; i < 5; i++) { push(); yaw(i * 72 + 12); box(-0.025, 0.07, -0.33, 0.025, 0.11, 0); push(); at(0, 0, -0.32); C.color("oklch(0.15 0.01 260)"); cbox(0, 0.035, 0, 0.04, 0.06, 0.06); C.color("oklch(0.22 0.01 260)"); pop(); pop(); }
  C.color("oklch(0.55 0.01 260)"); push(); at(0, 0.1, 0); cyl(0.025, 0.32, 8); pop();
  C.color("oklch(0.18 0.01 260)"); push(); at(0, 0.08, 0); cyl(0.045, 0.14, 8); pop();
  C.metalness(null); C.roughness(0.85); C.color("oklch(0.3 0.02 250)"); C.smooth();
  lathe([[0.24, 0.42], [0.255, 0.44], [0.255, 0.48], [0.235, 0.5], [0, 0.505]], 14); // seat cushion
  C.flat(); C.color("oklch(0.2 0.01 260)"); box(-0.03, 0.42, 0.18, 0.03, 0.62, 0.23); // back post
  push(); at(0, 0.58, 0.24); pitch(-8); C.color("oklch(0.28 0.02 250)"); cbox(0, 0.25, 0, 0.44, 0.5, 0.05); C.color("oklch(0.2 0.01 250)"); cbox(0, 0.25, 0.03, 0.4, 0.44, 0.012); pop();
  C.color("oklch(0.2 0.01 260)"); for (const s of [-1, 1]) { box(s * 0.25 - 0.02, 0.45, -0.02, s * 0.25 + 0.02, 0.66, 0.02); box(s * 0.25 - 0.035, 0.66, -0.17, s * 0.25 + 0.035, 0.69, 0.09); }
  C.roughness(null);
}
function vending() { // a drinks machine standing dark: cord coiled loose on the carpet, no plug anywhere near a socket
  const W = 0.46, D = 0.82, Hh = 1.86;
  C.color("oklch(0.42 0.13 28)"); C.roughness(0.45); C.metalness(0.3);
  box(-W, 0.06, -D, W, Hh, -0.02); C.color("oklch(0.2 0.01 30)"); box(-W + 0.02, 0, -D + 0.04, W - 0.02, 0.06, -0.04);
  C.color("oklch(0.88 0.02 90)"); box(-W - 0.005, Hh - 0.22, -D - 0.006, W + 0.005, Hh - 0.08, -D + 0.01); // header band
  C.color("oklch(0.45 0.14 28)"); for (let i = 0; i < 6; i++) box(-W + 0.06 + i * 0.13, Hh - 0.19, -D - 0.009, -W + 0.12 + i * 0.13, Hh - 0.11, -D - 0.005);
  C.color("oklch(0.12 0.01 260)"); C.metalness(0.1); box(-W + 0.05, 0.62, -D - 0.004, 0.14, Hh - 0.27, -D + 0.02); // dark interior behind glass
  const cans = ["oklch(0.5 0.17 25)", "oklch(0.55 0.13 250)", "oklch(0.75 0.14 95)", "oklch(0.55 0.15 145)", "oklch(0.85 0.02 90)", "oklch(0.45 0.12 300)"];
  for (let r = 0; r < 5; r++) { C.color("oklch(0.35 0.01 260)"); box(-W + 0.06, 0.66 + r * 0.19, -D + 0.01, 0.13, 0.675 + r * 0.19, -D + 0.12);
    C.color("oklch(0.92 0.02 90)"); for (let i = 0; i < 6; i++) box(-W + 0.09 + i * 0.1, 0.662 + r * 0.19, -D - 0.003, -W + 0.13 + i * 0.1, 0.672 + r * 0.19, -D + 0.004);
    for (let i = 0; i < 6; i++) { if (rnd(r * 7 + i, 3) < 0.28) continue; C.color(cans[(r * 2 + i) % 6]); push(); at(-W + 0.12 + i * 0.1, 0.675 + r * 0.19, -D + 0.06); cyl(0.032, 0.12, 7); pop(); } }
  C.color("oklch(0.25 0.03 220)", 0.32); C.roughness(0.05); C.metalness(0.2); box(-W + 0.04, 0.6, -D - 0.012, 0.15, Hh - 0.26, -D - 0.006); // glass
  C.roughness(0.4); C.metalness(0.6); C.color("oklch(0.3 0.01 260)"); box(0.18, 0.62, -D - 0.012, W - 0.04, Hh - 0.28, -D); // selector panel
  C.color("oklch(0.08 0.01 140)"); box(0.22, 1.36, -D - 0.016, W - 0.08, 1.44, -D - 0.01); // dead display
  C.color("oklch(0.55 0.2 25)"); box(0.33, 1.28, -D - 0.02, 0.37, 1.31, -D - 0.01); // red coin release
  C.color("oklch(0.7 0.01 260)"); for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) box(0.22 + c * 0.055, 1.08 + r * 0.06, -D - 0.018, 0.255 + c * 0.055, 1.115 + r * 0.06, -D - 0.01);
  C.color("oklch(0.1 0.01 260)"); box(0.36, 1.2, -D - 0.018, 0.37, 1.26, -D - 0.01); box(0.24, 0.92, -D - 0.018, 0.38, 0.94, -D - 0.01);
  C.color("oklch(0.15 0.01 260)"); box(-W + 0.08, 0.2, -D - 0.01, 0.1, 0.42, -D + 0.02); C.color("oklch(0.4 0.01 260)"); box(-W + 0.06, 0.18, -D - 0.02, 0.12, 0.2, -D); box(-W + 0.06, 0.42, -D - 0.02, 0.12, 0.44, -D);
  C.metalness(null); C.color("oklch(0.12 0.005 260)"); C.roughness(0.7); // the cord: out of the back, round the side, coiled, its plug face up
  let px = W - 0.06, pz = -0.08; const pts = [[W + 0.05, -0.1], [W + 0.25, -0.3], [W + 0.35, -0.65], [W + 0.6, -0.85], [W + 0.75, -0.7], [W + 0.62, -0.5], [W + 0.45, -0.62], [W + 0.55, -0.98]];
  for (const [x, z] of pts) { const dx = x - px, dz = z - pz, L = Math.hypot(dx, dz), nx = (-dz / L) * 0.009, nz = (dx / L) * 0.009; q([px - nx, 0.016, pz - nz], [px + nx, 0.016, pz + nz], [x + nx, 0.016, z + nz], [x - nx, 0.016, z - nz]); q([px + nx, 0.002, pz + nz], [px + nx, 0.016, pz + nz], [x + nx, 0.016, z + nz], [x + nx, 0.002, z + nz]); px = x; pz = z; }
  C.color("oklch(0.15 0.005 260)"); push(); at(px, 0, pz); yaw(20); box(-0.025, 0, -0.04, 0.025, 0.035, 0.02); C.color("oklch(0.75 0.06 85)"); C.metalness(0.9); box(-0.014, 0.012, -0.065, -0.008, 0.024, -0.04); box(0.008, 0.012, -0.065, 0.014, 0.024, -0.04); pop();
  C.metalness(null); C.roughness(null);
}
function payphone() { // a steel payphone under a little hood, handset on its hook, a coiled cord
  C.color("oklch(0.62 0.01 250)"); C.metalness(0.75); C.roughness(0.35);
  box(-0.24, 0.95, -0.03, 0.24, 2.02, 0); // back plate
  for (const s of [-1, 1]) box(s * 0.24 - 0.012, 1.0, -0.36, s * 0.24 + 0.012, 1.98, 0); // hood cheeks
  box(-0.252, 1.97, -0.36, 0.252, 2.02, 0); C.color("oklch(0.45 0.12 255)"); C.metalness(0.2); box(-0.252, 1.9, -0.37, 0.252, 1.97, -0.345); // blue header strip
  C.color("oklch(0.95 0.01 90)"); box(-0.06, 1.92, -0.372, 0.06, 1.95, -0.368); box(-0.02, 1.95, -0.372, 0.02, 1.962, -0.368); // phone icon
  C.color("oklch(0.32 0.01 250)"); C.metalness(0.7); box(-0.12, 1.18, -0.16, 0.12, 1.72, -0.03); // the phone body
  C.color("oklch(0.55 0.01 250)"); box(-0.105, 1.5, -0.165, 0.105, 1.69, -0.155);
  C.color("oklch(0.8 0.01 250)"); for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) box(-0.06 + c * 0.045 - 0.016, 1.3 + r * 0.045 - 0.014, -0.172, -0.06 + c * 0.045 + 0.016, 1.3 + r * 0.045 + 0.014, -0.16);
  C.color("oklch(0.1 0.01 250)"); box(0.06, 1.62, -0.17, 0.09, 1.66, -0.16); box(-0.08, 1.22, -0.168, 0.08, 1.25, -0.16); // coin slot + return
  C.color("oklch(0.85 0.03 90)"); C.metalness(0); box(-0.09, 1.53, -0.168, 0.04, 1.67, -0.164); // card with dead numbers
  C.color("oklch(0.25 0.01 250)"); for (let i = 0; i < 4; i++) box(-0.08, 1.55 + i * 0.028, -0.169, 0.03, 1.556 + i * 0.028, -0.166); // instruction lines
  C.color("oklch(0.2 0.01 250)"); C.metalness(0.3); C.roughness(0.6); // handset on the left hook
  box(-0.17, 1.3, -0.14, -0.13, 1.66, -0.1); cbox(-0.15, 1.645, -0.13, 0.07, 0.06, 0.08); cbox(-0.15, 1.315, -0.13, 0.07, 0.06, 0.08);
  C.color("oklch(0.45 0.01 250)"); C.metalness(0.8); box(-0.13, 1.56, -0.13, -0.12, 1.6, -0.06); // hook
  C.color("oklch(0.25 0.01 250)"); C.metalness(0.6); for (let i = 0; i < 9; i++) { const y = 1.3 - i * 0.025, a = i * 1.7; cbox(-0.15 + Math.cos(a) * 0.012, y, -0.12 + Math.sin(a) * 0.012, 0.016, 0.02, 0.016); } // armoured cord
  C.metalness(null); C.roughness(null);
}
function holetile() { // a ceiling tile pulled down: black above, the tile hanging by a corner, fluff and crumbs on the carpet
  const y = H - 0.004, a = 0.3;
  C.color("oklch(0.06 0.005 80)"); C.roughness(1); q([-a, y, a], [a, y, a], [a, y, -a], [-a, y, -a]);
  C.color("oklch(0.03 0.002 80)"); q([-a * 0.7, y - 0.001, a * 0.7], [a * 0.7, y - 0.001, a * 0.7], [a * 0.7, y - 0.001, -a * 0.7], [-a * 0.7, y - 0.001, -a * 0.7]);
  C.color("oklch(0.8 0.01 90)"); C.metalness(0.6); box(-a - 0.012, H - 0.03, -a - 0.012, a + 0.012, H - 0.004, -a); box(-a - 0.012, H - 0.03, a, a + 0.012, H - 0.004, a + 0.012); box(-a - 0.012, H - 0.03, -a, -a, H - 0.004, a); // T-grid lip, one rail bent away
  C.metalness(null); C.albedo(CEILING); C.color("oklch(0.9 0.03 85)");
  push(); at(-a, H - 0.03, -a); yaw(-20); pitch(-62); box(0, -0.015, 0, 0.56, 0, 0.5); pop(); // hanging tile, swung down from the corner
  C.albedo(null); C.color("oklch(0.8 0.08 70)"); C.roughness(0.95); // insulation fluff dangling
  for (let i = 0; i < 4; i++) { push(); at(-0.15 + i * 0.1, H - 0.004, 0.1 - i * 0.06); roll(rnd(i, 4) * 30 - 15); cbox(0, -0.06 - i * 0.02, 0, 0.05, 0.12 + i * 0.04, 0.04); pop(); }
  C.albedo(CEILING); C.color("oklch(0.85 0.03 85)"); // crumbs below
  for (let i = 0; i < 5; i++) { push(); at(rnd(i, 7) * 0.9 - 0.45, 0, rnd(i, 8) * 0.9 - 0.45); yaw(rnd(i, 9) * 180); pitch(rnd(i, 10) * 10); box(-0.08 + rnd(i, 1) * 0.03, 0, -0.06, 0.06 + rnd(i, 2) * 0.05, 0.015, 0.05 + rnd(i, 3) * 0.04); pop(); }
  C.albedo(null); C.roughness(null);
}
function stain(seed) { // a wet bloom spreading through the ceiling tiles
  const ring = (r, col, y, s, n = 14) => { C.color(col); const pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = r * (0.7 + 0.5 * rnd(i + s * 31, seed)); pts.push([Math.cos(a) * k + Math.sin(a * 3 + s) * r * 0.08, y, Math.sin(a) * k]); } for (let i = 0; i < n; i++) t3([0, y, 0], pts[(i + 1) % n], pts[i]); };
  C.roughness(0.3);
  ring(1.25, "oklch(0.78 0.055 78)", H - 0.003, 1); ring(1.05, "oklch(0.64 0.07 68)", H - 0.0035, 2); ring(0.92, "oklch(0.74 0.06 74)", H - 0.004, 3); ring(0.55, "oklch(0.56 0.07 62)", H - 0.0045, 4); ring(0.28, "oklch(0.45 0.06 58)", H - 0.005, 5, 10);
  C.color("oklch(0.4 0.05 60)"); C.roughness(0.1); for (let i = 0; i < 3; i++) { push(); at(-0.15 + i * 0.14, H - 0.006, 0.1 - i * 0.12); lathe([[0.012, -0.03], [0.02, -0.012], [0.015, 0]], 6); pop(); } // hanging drips
  C.roughness(null);
}
function bottle(lying) { push(); if (lying) { pitch(90); at(0, 0.035, 0); } C.color("oklch(0.93 0.02 90)", 0.55); C.roughness(0.1); lathe([[0.03, 0], [0.034, 0.01], [0.034, 0.16], [0.016, 0.21], [0.014, 0.23]], 8); C.color("oklch(0.85 0.06 75)"); push(); at(0, 0.07, 0); lathe([[0.0345, 0], [0.0345, 0.06]], 8); pop(); pop(); }
function camp() { // an old wanderer's corner: walls at local z = 0 and x = 0, room toward +x and -z
  C.roughness(0.9); C.smooth();
  push(); at(0.5, 0, -0.95); // sleeping bag along the back wall, half unzipped
  C.color("oklch(0.42 0.08 140)"); box(-0.38, 0, -0.95, 0.38, 0.09, 0.95, "b");
  C.color("oklch(0.55 0.12 50)"); box(-0.36, 0.09, -0.95, 0.36, 0.1, 0.4, "b"); // orange lining folded open
  C.color("oklch(0.36 0.07 140)"); for (let i = 0; i < 5; i++) box(-0.385, 0.088, -0.9 + i * 0.36, 0.385, 0.096, -0.88 + i * 0.36); // quilt lines
  C.color("oklch(0.42 0.08 140)"); push(); at(0.05, 0.1, 0.55); pitch(-12); box(-0.37, 0, -0.3, 0.37, 0.07, 0.38); pop(); // flap thrown back
  C.color("oklch(0.35 0.04 250)"); push(); at(0, 0.09, 0.78); roll(90); lathe([[0.1, -0.3], [0.12, -0.25], [0.12, 0.25], [0.1, 0.3], [0, 0.3]], 10); pop(); // rolled jacket pillow
  pop();
  C.flat(); C.color("oklch(0.38 0.06 60)"); push(); at(1.25, 0, -0.22); yaw(-15); box(-0.18, 0, -0.12, 0.18, 0.42, 0.12); C.color("oklch(0.32 0.05 60)"); box(-0.16, 0.12, -0.17, 0.16, 0.32, -0.12); box(-0.12, 0.42, -0.06, 0.12, 0.47, 0.06); C.color("oklch(0.25 0.03 60)"); box(-0.14, 0.05, 0.12, -0.11, 0.4, 0.15); box(0.11, 0.05, 0.12, 0.14, 0.4, 0.15); pop(); // backpack
  push(); at(1.05, 0, -1.35); // dead lantern: glass dark, wick burned to nothing
  C.color("oklch(0.25 0.04 150)"); C.metalness(0.5); C.roughness(0.5); cyl(0.07, 0.04, 10); push(); at(0, 0.2, 0); lathe([[0.07, 0], [0.05, 0.04], [0.01, 0.05]], 10); pop();
  C.color("oklch(0.35 0.02 80)", 0.45); C.metalness(0); C.roughness(0.1); push(); at(0, 0.04, 0); lathe([[0.05, 0], [0.06, 0.08], [0.05, 0.16]], 10); pop();
  C.color("oklch(0.15 0.01 80)"); push(); at(0, 0.04, 0); cyl(0.006, 0.05, 4); pop();
  C.color("oklch(0.3 0.01 80)"); C.metalness(0.7); for (const s of [-1, 1]) box(s * 0.065 - 0.004, 0.04, -0.004, s * 0.065 + 0.004, 0.22, 0.004); push(); at(0, 0.25, 0); for (let i = 0; i < 6; i++) { const a0 = (i / 6) * Math.PI, a1 = ((i + 1) / 6) * Math.PI; box(Math.cos(a0) * 0.06 - 0.003, Math.sin(a0) * 0.05, -0.003, Math.cos(a1) * 0.06 + 0.003, Math.sin(a1) * 0.05 + 0.005, 0.003); } pop();
  C.metalness(null); pop();
  const bt = [[1.3, -0.9, 0, 0], [1.42, -0.98, 0, 0], [0.95, -2.1, 1, 30], [1.4, -1.6, 1, 110], [1.7, -0.4, 1, 70], [0.15, -2.2, 0, 0]]; // empty almond water
  for (const [x, z, ly, yw] of bt) { push(); at(x, 0, z); yaw(yw); bottle(ly); pop(); }
  C.roughness(0.95); C.color("oklch(0.95 0.015 90)"); push(); at(1.05, 0.004, -1.05); yaw(18); box(-0.1, 0, -0.14, 0.1, 0.002, 0.14); C.color("oklch(0.4 0.03 260)"); for (let i = 0; i < 9; i++) box(-0.08, 0.002, -0.11 + i * 0.026, -0.08 + 0.1 + rnd(i, 5) * 0.06, 0.0028, -0.105 + i * 0.026); pop(); // the note
  C.color("oklch(0.82 0.04 90)"); push(); at(0.95, 0, -1.2); lathe([[0.048, 0], [0.036, 0.005], [0.024, 0.015], [0.022, 0.034]], 10);
  C.color("oklch(0.12 0 0)"); push(); at(0, 0.034, 0); cyl(0.003, 0.012, 4); pop(); pop(); // candle stub with melted wax puddle & charred wick
  C.color("oklch(0.7 0.07 75)"); box(0.88, 0.002, -1.14, 0.94, 0.006, -1.135); // matchstick
  C.color("oklch(0.15 0 0)"); box(0.932, 0.002, -1.142, 0.944, 0.007, -1.133); // burnt head
  C.color("oklch(0.6 0.12 30)"); push(); at(1.6, 0.003, -1.1); yaw(40); box(-0.06, 0, -0.03, 0.06, 0.006, 0.03); pop(); // a wrapper
  C.roughness(null);
}
function papers(seed) { // a drift of office paper across the carpet, a few balled up
  C.roughness(0.95);
  for (let i = 0; i < 16; i++) {
    const r = Math.sqrt(rnd(i, seed)) * 1.5, a = rnd(i, seed + 1) * 6.283, x = Math.cos(a) * r, z = Math.sin(a) * r;
    push(); at(x, 0.003 + i * 0.0012, z); yaw(rnd(i, seed + 2) * 360);
    if (rnd(i, seed + 3) < 0.2) { C.color("oklch(0.9 0.02 90)"); push(); at(0, 0.04, 0); pitch(rnd(i, 9) * 90); cbox(0, 0, 0, 0.08, 0.07, 0.075); pop(); }
    else { C.color(rnd(i, seed + 4) < 0.25 ? "oklch(0.86 0.07 90)" : "oklch(0.95 0.012 90)"); pitch(rnd(i, seed + 5) * 4 - 2); box(-0.105, 0, -0.148, 0.105, 0.0015, 0.148, "b"); C.color("oklch(0.55 0.02 260)"); for (let k = 0; k < 6; k++) box(-0.08, 0.0016, -0.12 + k * 0.03, -0.08 + 0.12 + rnd(k + i, 7) * 0.04, 0.002, -0.116 + k * 0.03); }
    pop();
  }
  C.roughness(null);
}
function troffer(lit) { // the one fixture still alive in the dark sector: dented, one tube dark, the diffuser cracked (the light itself is the object's fx)
  C.color("oklch(0.82 0.01 90)"); box(-0.66, H - 0.06, -0.36, 0.66, H - 0.005, 0.36, "t");
  if (lit) { C.color("oklch(0.95 0.02 95)"); C.emissive([1.2, 1.1, 0.85]); } else C.color("oklch(0.5 0.01 90)"); box(-0.6, H - 0.075, -0.25, 0.6, H - 0.06, -0.21); C.emissive(null);
  C.color("oklch(0.45 0.01 90)"); box(-0.6, H - 0.075, 0.21, 0.6, H - 0.06, 0.25);
  C.color("oklch(0.9 0.01 90)", 0.4); box(-0.62, H - 0.064, -0.33, 0.62, H - 0.062, 0.33);
}
function manila(p) { // bare manila-folder walls over every wall face of the patch (cx0..cx0+w-1, cz0..cz0+h-1)
  C.albedo(MANILA); C.color("oklch(0.96 0.05 88)"); C.roughness(0.85);
  const o = 0.104, y0 = 0.1, y1 = H - 0.004, lo = (c) => c * S - HALF;
  for (let cx = p.cx0; cx < p.cx0 + p.w; cx++) for (let cz = p.cz0; cz < p.cz0 + p.h; cz++) {
    const x0 = lo(cx), x1 = x0 + S, z0 = lo(cz), z1 = z0 + S;
    if (wallX(cx, cz) && !isArchWall(cx, cz, "x")) C.quad(x1 - o, y0, z0, x1 - o, y0, z1, x1 - o, y1, z1, x1 - o, y1, z0);
    if (wallX(cx - 1, cz) && !isArchWall(cx - 1, cz, "x")) C.quad(x0 + o, y0, z1, x0 + o, y0, z0, x0 + o, y1, z0, x0 + o, y1, z1);
    if (wallZ(cx, cz) && !isArchWall(cx, cz, "z")) C.quad(x1, y0, z1 - o, x0, y0, z1 - o, x0, y1, z1 - o, x1, y1, z1 - o);
    if (wallZ(cx, cz - 1) && !isArchWall(cx, cz - 1, "z")) C.quad(x0, y0, z0 + o, x1, y0, z0 + o, x1, y1, z0 + o, x0, y1, z0 + o);
  }
  C.albedo(null); C.roughness(null);
}
function forest(p) { // a pillar forest: the ceiling drops to 2.3 m and thin square columns stand in rows
  const LOW = 2.3, lo = (c) => c * S - HALF, X0 = lo(p.cx0), X1 = lo(p.cx0 + p.w), Z0 = lo(p.cz0), Z1 = lo(p.cz0 + p.h);
  C.albedo(CEILING); C.color("oklch(0.95 0.02 92)"); q([X0, LOW, Z0], [X1, LOW, Z0], [X1, LOW, Z1], [X0, LOW, Z1]);
  C.albedo(WALLPAPER); C.color("oklch(0.98 0.012 90)"); // soffit round the edge, down to the low ceiling
  q([X0, LOW, Z0], [X0, H, Z0], [X1, H, Z0], [X1, LOW, Z0]); q([X1, LOW, Z1], [X1, H, Z1], [X0, H, Z1], [X0, LOW, Z1]); q([X0, LOW, Z1], [X0, H, Z1], [X0, H, Z0], [X0, LOW, Z0]); q([X1, LOW, Z0], [X1, H, Z0], [X1, H, Z1], [X1, LOW, Z1]);
  for (const [x, z] of PILLARS(p)) box(x - 0.12, 0, z - 0.12, x + 0.12, LOW, z + 0.12, "tb");
  C.albedo(null); C.color("oklch(0.72 0.05 85)"); for (const [x, z] of PILLARS(p)) box(x - 0.135, 0, z - 0.135, x + 0.135, 0.1, z + 0.135, "b");
  for (let cx = p.cx0; cx < p.cx0 + p.w; cx++) for (let cz = p.cz0; cz < p.cz0 + p.h; cz++) { // a light panel per cell, set in the low ceiling
    const mx = lo(cx) + S / 2, mz = lo(cz) + S / 2;
    C.color("oklch(0.85 0.01 90)"); box(mx - 0.67, LOW - 0.03, mz - 0.37, mx + 0.67, LOW, mz + 0.37, "t");
    if ((cx + cz) % 4 === 3) { C.color("oklch(0.45 0.01 90)"); } else { C.color("#fffaf0"); C.emissive([2.2, 2.05, 1.6]); }
    q([mx - 0.62, LOW - 0.032, mz - 0.32], [mx + 0.62, LOW - 0.032, mz - 0.32], [mx + 0.62, LOW - 0.032, mz + 0.32], [mx - 0.62, LOW - 0.032, mz + 0.32]); C.emissive(null);
  }
}
export function PILLARS(p) { const out = [], lo = (c) => c * S - HALF; for (let cx = p.cx0; cx < p.cx0 + p.w; cx++) for (let cz = p.cz0; cz < p.cz0 + p.h; cz++) for (const a of [1, 3]) for (const b of [1, 3]) out.push([lo(cx) + a, lo(cz) + b]); return out; }

export function geometry(ctx) {
  C = ctx; M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; STACK.length = 0;
  const p = ctx.params ?? {}, k = p.kind ?? "outlet";
  const far = (ctx.lod ?? 1) >= 3 && ["outlet", "papers", "stain", "holetile", "troffer"].includes(k); // small things shrink to a speck far away
  if (far) { C.quad(0, H - 0.001, 0, 0.01, H - 0.001, 0, 0.01, H - 0.001, 0.01, 0, H - 0.001, 0.01); return; }
  if (k === "outlet") outlet(); else if (k === "falsedoor") falsedoor(); else if (k === "chair") chair(); else if (k === "vending") vending();
  else if (k === "payphone") payphone(); else if (k === "holetile") holetile(); else if (k === "stain") stain(p.seed ?? 1); else if (k === "camp") camp();
  else if (k === "papers") papers(p.seed ?? 1); else if (k === "troffer") troffer(p.lit !== false); else if (k === "manila") manila(p); else if (k === "forest") forest(p);
  ctx.color(null); ctx.emissive(null); ctx.roughness(null); ctx.metalness(null); ctx.albedo(null);
}
export function collider(ctx) {
  const p = ctx.params ?? {}, k = p.kind;
  if (k === "forest") return PILLARS(p).map(([x, z]) => ({ kind: "box", width: 0.24, height: 2.3, depth: 0.24, center: [x, 1.15, z] }));
  if (k === "falsedoor") return [...FALSEDOOR_COLLIDER, { kind: "box", width: 0.06, height: 2.08, depth: 0.9, center: [-0.5, 1.05, -0.7] }];
  if (k === "vending") return { kind: "box", width: 0.92, height: 1.86, depth: 0.8, center: [0, 0.93, -0.42] };
  if (k === "chair") return { kind: "cylinder", radiusTop: 0.3, radiusBottom: 0.3, height: 1.1, center: [0, 0.55, 0] };
  if (k === "payphone") return { kind: "box", width: 0.5, height: 1.0, depth: 0.36, center: [0, 1.5, -0.18] };
  if (k === "camp") return { kind: "box", width: 0.36, height: 0.45, depth: 0.3, center: [1.25, 0.22, -0.22] };
  return [];
}
