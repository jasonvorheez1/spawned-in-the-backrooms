// Bakes scripts/critter2-geo.js (the code-built critter) into a skinned .glb with the same bones, weights and colours.
// usage: bun art/critter-glb/export.mjs '<params json>' out.glb
import * as G from "../../scripts/critter2-geo.js";
import fs from "fs";
const params = JSON.parse(process.argv[2] || "{}"), out = process.argv[3] || "/workspace/bw/critter-out.glb";
const pos = [], col = [];
let cur = [1, 1, 1], smooth = false;
const hex = (c) => { if (typeof c !== "string") return [1,1,1]; const h = c.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6), 16); const s = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return [s((n >> 16) & 255), s((n >> 8) & 255), s(n & 255)]; };
const ctx = { params, lod: 1, tri: (...v) => { pos.push(...v); col.push(...cur, ...cur, ...cur); }, color: (c) => { cur = hex(c); }, flat: () => { smooth = false; }, smooth: () => { smooth = true; }, metalness() {}, roughness() {} };
const { joints, weights } = G.geometry(ctx);
const B = G.skeleton(), names = Object.keys(B);
const nv = pos.length / 3;
// normals per face (flat); the importer can smooth by merge
const nrm = new Float32Array(pos.length);
for (let i = 0; i < nv; i += 3) { const a = pos.slice(i*3, i*3+3), b = pos.slice(i*3+3, i*3+6), c = pos.slice(i*3+6, i*3+9); const u = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], v = [c[0]-a[0], c[1]-a[1], c[2]-a[2]]; let n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]; const l = Math.hypot(...n) || 1; n = n.map((x) => x / l); for (let k = 0; k < 3; k++) nrm.set(n, (i + k) * 3); }
const bufs = [], views = [], accs = [];
let off = 0;
const add = (arr, type, comp, count, target, minmax) => { const b = Buffer.from(arr.buffer); const pad = (4 - (b.length % 4)) % 4; bufs.push(b, Buffer.alloc(pad)); views.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) }); off += b.length + pad; const a = { bufferView: views.length - 1, componentType: comp, count, type }; if (minmax) Object.assign(a, minmax); accs.push(a); return accs.length - 1; };
const P = new Float32Array(pos); const mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9]; for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i*3+k]); mx[k] = Math.max(mx[k], P[i*3+k]); }
const aP = add(P, "VEC3", 5126, nv, 34962, { min: mn, max: mx });
const aN = add(nrm, "VEC3", 5126, nv, 34962);
const aC = add(new Float32Array(col), "VEC3", 5126, nv, 34962);
const aJ = add(new Uint16Array(joints), "VEC4", 5123, nv, 34962);
const aW = add(new Float32Array(weights), "VEC4", 5126, nv, 34962);
const ibm = new Float32Array(names.length * 16);
names.forEach((n, i) => { const p = B[n].pivot; ibm.set([1,0,0,0, 0,1,0,0, 0,0,1,0, -p[0],-p[1],-p[2],1], i * 16); });
const aI = add(ibm, "MAT4", 5126, names.length);
const nodes = names.map((n) => { const p = B[n].pivot, pp = B[n].parent ? B[B[n].parent].pivot : [0,0,0]; return { name: n, translation: [p[0]-pp[0], p[1]-pp[1], p[2]-pp[2]] }; });
names.forEach((n, i) => { const par = B[n].parent; if (par) { const pi = names.indexOf(par); (nodes[pi].children ??= []).push(i); } });
const meshNode = nodes.length; nodes.push({ name: "CritterBody", mesh: 0, skin: 0 });
const roots = names.map((n, i) => (B[n].parent ? -1 : i)).filter((i) => i >= 0);
const armNode = nodes.length; nodes.push({ name: "Armature", children: roots });
const gltf = { asset: { version: "2.0", generator: "critter2-geo bake" }, scene: 0, scenes: [{ nodes: [armNode, meshNode] }], nodes,
  meshes: [{ name: "CritterBody", primitives: [{ attributes: { POSITION: aP, NORMAL: aN, COLOR_0: aC, JOINTS_0: aJ, WEIGHTS_0: aW }, material: 0 }] }],
  materials: [{ name: "fur", pbrMetallicRoughness: { baseColorFactor: [1,1,1,1], metallicFactor: 0, roughnessFactor: 0.85 } }],
  skins: [{ joints: names.map((_, i) => i), inverseBindMatrices: aI, skeleton: roots[0] }],
  accessors: accs, bufferViews: views, buffers: [{ byteLength: off }] };
const bin = Buffer.concat(bufs);
let js = Buffer.from(JSON.stringify(gltf)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
fs.writeFileSync(out, Buffer.concat([head, ch(js.length, 0x4e4f534a), js, ch(bin.length, 0x004e4942), bin]));
console.log("verts", nv, "tris", nv / 3, "bones", names.length, "->", out);
