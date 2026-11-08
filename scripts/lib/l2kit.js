// Level 2's modelled kit: Blender modules (art/level2/build.py, compact.py, encode.py -> scripts/lib/l2kit-data/<part>.js, packed; AO and grime baked
// into vertex colour) drawn as ONE instance set per part, placed per cell from the seeded layout (scripts/lib/level2.js).
// Visual only: scripts/level2-geo.js keeps the collider shells. Walls follow params.cut (breakables.syncWalls).
import { N, S, H, HALF, isOpen, openings, zoneOf, hash, cellCenter, inHall, inPipes, sideOf, HALL_H, isStairCell } from "./level2.js";
const T = 0.4;
const TEX = {
  concrete: "cdn/texture-chalky-stained-concrete-wall.png", floor: "cdn/texture-grimy-wet-utility-concrete-floor.png",
  ceil: "cdn/texture-dirty-concrete-ceiling-slab.png", lag: "cdn/texture-dirty-canvas-pipe-lagging.png",
  galv: "cdn/texture-galvanized-sheet-metal-duct.png", steel: "cdn/texture-scratched-worn-steel.png",
  green: "cdn/texture-scratched-worn-steel.png", red: "cdn/texture-scratched-worn-steel.png", housing: "cdn/texture-scratched-worn-steel.png",
};
const METAL = { steel: [0.55, 0.55], green: [0.35, 0.6], red: [0.3, 0.55], galv: [0.6, 0.45], housing: [0.3, 0.6], brass: [0.8, 0.4], band: [0, 0.9], rubber: [0, 0.8], stain: [0, 0.3], paint: [0, 0.8] };
const GAIN = { concrete: 2.2, floor: 2.3, ceil: 3, lag: 2.2, paint: 3.5, galv: 1.6, housing: 1.5 };
const closed = (cx, cz, d) => !isOpen(cx, cz, d);
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const hallEdge = (cx, cz, d) => inHall(cx, cz) || inHall(cx + D4[d][0], cz + D4[d][1]);
const pipeEdge = (cx, cz, d) => inPipes(cx, cz) && inPipes(cx + D4[d][0], cz + D4[d][1]);
const WALL_YAW = [270, 180, 90, 0]; // a module whose +z faces into the cell, for the wall on side d
const tunnel = (cx, cz) => { const z = zoneOf(cx, cz); return z !== "camp" && z !== "room" && !inPipes(cx, cz) && !inHall(cx, cz) && !sideOf(cx, cz); };

// every edge that stands (the same test the collider uses), as [cx, cz, axis, tall]
function edges(cut) {
  const out = [];
  for (let cx = -1; cx < N; cx++) for (let cz = -1; cz < N; cz++) {
    if (cz >= 0 && (cx < 0 || closed(cx, cz, 0)) && !pipeEdge(cx, cz, 0) && !cut.has(`x:${cx}:${cz}`)) out.push([cx, cz, "x", hallEdge(cx, cz, 0)]);
    if (cx >= 0 && (cz < 0 || closed(cx, cz, 1)) && !pipeEdge(cx, cz, 1) && !cut.has(`z:${cx}:${cz}`)) out.push([cx, cz, "z", hallEdge(cx, cz, 1)]);
  }
  return out;
}
export function placements(part, params = {}) {
  const P = [], cut = new Set(params.cut ?? []), tallS = HALL_H / H;
  const put = (x, y, z, yaw, sy = 1, s = 1) => P.push({ offset: [x, y, z], yaw, scale: [s, sy, s] });
  if (part === "wall") for (const [cx, cz, a, tall] of edges(cut)) {
    if (a === "x") put((cx + 1) * S - HALF, 0, (cz + 0.5) * S - HALF, 90, tall ? tallS : 1);
    else put((cx + 0.5) * S - HALF, 0, (cz + 1) * S - HALF, hash(cx, cz, 7) < 0.5 ? 0 : 180, tall ? tallS : 1);
  }
  if (part === "pier") {
    const at = new Map();
    for (const [cx, cz, a, tall] of edges(cut)) {
      const ends = a === "x" ? [[cx + 1, cz], [cx + 1, cz + 1]] : [[cx, cz + 1], [cx + 1, cz + 1]];
      for (const [i, j] of ends) { const k = i * 100 + j; at.set(k, Math.max(at.get(k) ?? 0, tall ? 1 : 0.5)); }
    }
    for (const [k, t] of at) put(Math.floor(k / 100) * S - HALF, 0, (k % 100) * S - HALF, 0, t === 1 ? tallS : 1);
  }
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const c = cellCenter(cx, cz), z = zoneOf(cx, cz), o = openings(cx, cz), r = hash(cx, cz, 301);
    const alongZ = o.some((d) => d === 1 || d === 3) && !o.some((d) => d === 0 || d === 2);
    if (part === "corner" && z !== "camp" && !inPipes(cx, cz)) {
      const x0 = cx * S - HALF + T, x1 = (cx + 1) * S - HALF - T, z0 = cz * S - HALF + T, z1 = (cz + 1) * S - HALF - T;
      for (const [dx, dz, X, Z, yaw] of [[0, 1, x1, z1, 180], [0, 3, x1, z0, 270], [2, 1, x0, z1, 90], [2, 3, x0, z0, 0]])
        if (closed(cx, cz, dx) && closed(cx, cz, dz)) put(X, 0, Z, yaw, inHall(cx, cz) ? tallS : 1);
    }
    if (part === "ceil" && !inHall(cx, cz) && !isStairCell(cx, cz)) put(c.x, H, c.z, alongZ ? 90 : 0);
    const drain = z !== "camp" && hash(cx, cz, 303) < 0.2;
    if ((part === "floor" && !drain) || (part === "floordrain" && drain)) put(c.x, 0, c.z, (alongZ ? 0 : 90) + (r < 0.5 ? 0 : 180));
    if (part === "piperun" && tunnel(cx, cz)) for (const d of [0, 1, 2, 3]) {
      if (!closed(cx, cz, d) || hash(cx * 4 + d, cz, 31) >= 0.6) continue;
      const w = S / 2 - T; put(c.x + D4[d][0] * w, 0, c.z + D4[d][1] * w, WALL_YAW[d]);
    }
    if (part === "tray" && tunnel(cx, cz) && hash(cx, cz, 305) < 0.85) {
      if (o.some((d) => d === 0 || d === 2)) put(c.x, H, c.z + 0.9, 0);
      if (o.some((d) => d === 1 || d === 3)) put(c.x + 0.9, H, c.z, 90);
    }
    if (part === "duct" && tunnel(cx, cz) && hash(cx, cz, 307) < 0.45) {
      if (alongZ) put(c.x - 1.15, H, c.z, 90); else if (o.some((d) => d === 0 || d === 2)) put(c.x, H, c.z - 1.15, 0);
    }
    if (part === "lamp" && z !== "camp" && z !== "dark" && hash(cx, cz, 201) <= 0.55 && !inHall(cx, cz) && !sideOf(cx, cz))
      put(c.x, H - 0.32, c.z, alongZ ? 0 : 90);
  }
  return P;
}
// unpacks a module file written by art/level2/encode.py into { hi, lo, uv } groups of { m, p, n, u, c, i }
const B64 = new Uint8Array(128); "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("").forEach((ch, i) => { B64[ch.charCodeAt(0)] = i; });
const UNPACKED = new Map();
export function unpack(D) {
  if (UNPACKED.has(D)) return UNPACKED.get(D);
  const s = D.b, len = Math.floor(s.length * 3 / 4) - (s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0), by = new Uint8Array(len);
  for (let i = 0, o = 0; i < s.length; i += 4) {
    const n = (B64[s.charCodeAt(i)] << 18) | (B64[s.charCodeAt(i + 1)] << 12) | (B64[s.charCodeAt(i + 2)] << 6) | B64[s.charCodeAt(i + 3)];
    if (o < len) by[o++] = n >> 16; if (o < len) by[o++] = (n >> 8) & 255; if (o < len) by[o++] = n & 255;
  }
  let at = 0; const u16 = () => { const v = by[at] | (by[at + 1] << 8); at += 2; return v; };
  const out = { hi: [], lo: [], uv: D.uv };
  for (const h of D.g) {
    const [lv, m, nv, ni, x0, y0, z0, x1, y1, z1, u0, v0, u1, v1] = h, p = new Array(nv * 3), n = new Array(nv * 3), c = new Array(nv * 3), i = new Array(ni);
    const lo = [x0, y0, z0], sp = [(x1 - x0) / 65535, (y1 - y0) / 65535, (z1 - z0) / 65535];
    for (let k = 0; k < nv * 3; k++) p[k] = lo[k % 3] + u16() * sp[k % 3];
    for (let k = 0; k < nv; k++) {
      let x = by[at++] / 255 * 2 - 1, y = by[at++] / 255 * 2 - 1; const z = 1 - Math.abs(x) - Math.abs(y);
      if (z < 0) { const ox = x; x = (1 - Math.abs(y)) * (ox >= 0 ? 1 : -1); y = (1 - Math.abs(ox)) * (y >= 0 ? 1 : -1); }
      const l = Math.hypot(x, y, z) || 1; n[k * 3] = x / l; n[k * 3 + 1] = y / l; n[k * 3 + 2] = z / l;
    }
    for (let k = 0; k < nv; k++) { const v = u16(); c[k * 3] = (v >> 11) / 31; c[k * 3 + 1] = ((v >> 5) & 63) / 63; c[k * 3 + 2] = (v & 31) / 31; }
    let u = null;
    if (D.uv) { u = new Array(nv * 2); for (let k = 0; k < nv; k++) { u[k * 2] = u0 + u16() * (u1 - u0) / 65535; u[k * 2 + 1] = v0 + u16() * (v1 - v0) / 65535; } }
    for (let k = 0; k < ni; k++) i[k] = u16();
    (lv ? out.lo : out.hi).push({ m, p, n, c, u, i });
  }
  UNPACKED.set(D, out);
  return out;
}
// emits one module (hi then lo) and its instance records
export function kit(ctx, part, packed) {
  const D = unpack(packed);
  const pos = [], nor = [], uvs = [], col = [];
  const emit = (groups) => {
    let n = 0;
    for (const g of groups) {
      ctx.albedo(TEX[g.m] ?? null); const mr = METAL[g.m] ?? [0, 0.9]; ctx.metalness(mr[0]); ctx.roughness(mr[1]);
      const I = g.i, gn = GAIN[g.m] ?? 1;
      for (let k = 0; k < I.length; k += 3) {
        const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3, p = g.p;
        ctx.tri(p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2]);
        for (const v of [I[k], I[k + 1], I[k + 2]]) { nor.push(g.n[v * 3], g.n[v * 3 + 1], g.n[v * 3 + 2]); if (g.u) uvs.push(g.u[v * 2], g.u[v * 2 + 1]); col.push(Math.min(1, g.c[v * 3] * gn), Math.min(1, g.c[v * 3 + 1] * gn), Math.min(1, g.c[v * 3 + 2] * gn)); }
        n += 3;
      }
    }
    return n;
  };
  const far = (ctx.lod ?? 1) >= 3; // far levels: the low module alone
  const nHi = far ? 0 : emit(D.hi), nLo = emit(D.lo);
  ctx.albedo(null); ctx.metalness(null); ctx.roughness(null);
  const recs = placements(part, ctx.params);
  ctx.instances({ layout: { offset: "float32x3", yaw: "float32", scale: "float32x3" }, count: recs.length,
    lods: far ? [{ indices: [0, nLo], distance: 0 }] : [{ indices: [0, nHi], distance: 0 }, { indices: [nHi, nHi + nLo], distance: part === "lamp" || part === "tray" ? 12 : 18 }],
    bounds: { min: [-HALF - 2, -1, -HALF - 2], max: [HALF + 2, HALL_H + 1, HALF + 2] } });
  for (const r of recs) ctx.instance(r);
  return D.uv ? { normals: nor, uvs, colors: col } : { normals: nor, colors: col, uvProjection: "triplanar" };
}

// lays the kit once per room (ids l2kit-<part>) and turns the old shell and details to their kit mode; safe to call again
export const PARTS = ["wall", "pier", "corner", "ceil", "floor", "floordrain", "piperun", "tray", "duct", "lamp"];
export function spawnKit(ctx) {
  const geo = ctx.place.objects["l2-geo"], cut = geo?.primitive?.params?.cut ?? [];
  for (const part of PARTS) if (!ctx.place.objects[`l2kit-${part}`])
    ctx.spawn(`l2kit-${part}`, { tags: ["l2kit"], feetPosition: { x: 0, y: 0, z: 0 }, castShadow: false, receiveShadow: true, material: { roughness: 0.9 },
      primitive: { kind: "scripted", script: `scripts/l2kit/${part}-geo.js`, params: part === "wall" || part === "pier" ? { cut } : {} } });
  if (geo && !geo.primitive?.params?.kit) geo.primitive = { ...geo.primitive, params: { ...(geo.primitive?.params ?? {}), kit: true } };
  const det = ctx.place.objects["l2-details"] ?? Object.values(ctx.place.objects).find((o) => o?.primitive?.script === "scripts/level2-details-geo.js");
  if (det && !det.primitive?.params?.kit) det.primitive = { ...det.primitive, params: { ...(det.primitive?.params ?? {}), kit: true } };
}
