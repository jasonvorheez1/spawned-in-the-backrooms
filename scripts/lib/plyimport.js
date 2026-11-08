// A Tower Unite .plymodel, read on the player's own page and worn as their body.
// Layout read off the file: section table at 0x4a (count) / 0x4b (start, count, material, n) u32 each;
// u32 indices end at the "01 01 2c 00 00 00" vertex header; 44-byte vertices (pos f32x3 @0, uv f32x2 @20);
// then one TGA per material. UE UVs are top-left origin like glTF, used as-is.
const findBytes = (d, pat, from = 0) => { outer: for (let i = from; i <= d.length - pat.length; i++) { for (let j = 0; j < pat.length; j++) if (d[i + j] !== pat[j]) continue outer; return i } return -1 }
function tga(d, o) {
  const idl = d[o], type = d[o + 2]
  if (d[o + 1] !== 0 || (type !== 2 && type !== 10)) return null
  for (let i = 3; i < 12; i++) if (d[o + i] !== 0) return null
  const w = d[o + 12] | (d[o + 13] << 8), h = d[o + 14] | (d[o + 15] << 8), bpp = d[o + 16], desc = d[o + 17]
  if ((bpp !== 24 && bpp !== 32) || w < 8 || h < 8 || w > 4096 || h > 4096) return null
  const B = bpp / 8, N = w * h, px = new Uint8ClampedArray(N * 4), alpha = B === 4 && (desc & 15) > 0
  let p = o + 18 + idl, n = 0, amax = 0
  const put = (s) => { const i = n * 4; px[i] = d[s + 2]; px[i + 1] = d[s + 1]; px[i + 2] = d[s]; px[i + 3] = alpha ? d[s + 3] : 255; if (px[i + 3] > amax) amax = px[i + 3]; n++ }
  if (type === 2) { if (p + N * B > d.length) return null; while (n < N) { put(p); p += B } }
  else while (n < N) { if (p >= d.length) return null; const c = d[p++], k = (c & 127) + 1; if (c & 128) { for (let j = 0; j < k && n < N; j++) put(p); p += B } else for (let j = 0; j < k && n < N; j++) { put(p); p += B } }
  if (amax < 10) for (let i = 3; i < px.length; i += 4) px[i] = 255
  if (!(desc & 32)) { const row = w * 4, t = new Uint8ClampedArray(row); for (let y = 0; y < h >> 1; y++) { const a = y * row, b = (h - 1 - y) * row; t.set(px.subarray(a, a + row)); px.copyWithin(a, b, b + row); px.set(t, b) } }
  return { w, h, px, end: p }
}
async function png({ w, h, px }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0)
  const b = await new Promise((r) => c.toBlob(r, 'image/png')); return new Uint8Array(await b.arrayBuffer())
}
export async function plyToGlb(buf) {
  const d = new Uint8Array(buf), dv = new DataView(buf)
  if (String.fromCharCode(d[0], d[1], d[2], d[3]) !== 'MODL') throw new Error('not a plymodel (no MODL header)')
  // header: (offset, size) u32 pairs from 0x12, each block right after the last
  // newer files carry a version string first (v3: "1.4"), so the table's start moves: take the start whose chain runs longest
  const chain = (start) => { const b = []; for (let o = start; o + 8 <= d.length && b.length < 32; o += 8) { const off = dv.getUint32(o, true), size = dv.getUint32(o + 4, true); if (b.length && off !== b[b.length - 1].off + b[b.length - 1].size) break; if (off < start || off + size > d.length) break; b.push({ off, size }) } return b }
  let blocks = []; for (let st = 0x0c; st < 0x60; st++) { const b = chain(st); if (b.length > blocks.length) blocks = b }
  const so = blocks[0]?.off ?? 0x4a, nsec = d[so]; if (!nsec || nsec > 64) throw new Error('no mesh sections')
  const secs = []; for (let i = 0; i < nsec; i++) { const o = so + 1 + 16 * i; secs.push([dv.getUint32(o, true), dv.getUint32(o + 4, true), dv.getUint32(o + 8, true)]) }
  let vb = blocks.findIndex((b) => d[b.off] === 1 && d[b.off + 1] === 1 && dv.getUint32(b.off + 2, true) >= 24 && dv.getUint32(b.off + 2, true) <= 128 && (b.size - 9) % dv.getUint32(b.off + 2, true) === 0)
  let vh, stride, n
  if (vb >= 0) { vh = blocks[vb].off; stride = dv.getUint32(vh + 2, true); n = (blocks[vb].size - 9) / stride }
  else { vh = -1; for (const st of [44, 48, 40, 52, 36, 56, 32, 64]) { vh = findBytes(d, [1, 1, st, 0, 0, 0]); if (vh >= 0) { stride = st; break } } if (vh < 0) throw new Error('no vertex block'); n = 0 }
  const total = Math.max(...secs.map((s) => s[0] + s[1])), i0 = vh - total * 4
  if (i0 < 0) throw new Error('index block out of range')
  const I = new Uint32Array(total); let maxI = 0
  for (let i = 0; i < total; i++) { I[i] = dv.getUint32(i0 + i * 4, true); if (I[i] + 1 > maxI) maxI = I[i] + 1 }
  if (!n) n = maxI
  if (maxI > n) throw new Error('indices past the vertices')
  const vs = vh + 9, P = new Float32Array(n * 3), UV = new Float32Array(n * 2)
  let ymin = Infinity, ymax = -Infinity
  // up axis: older exports stand on -Y, newer (v3) on +Z; the taller of the two is up
  let ey0 = Infinity, ey1 = -Infinity, ez0 = Infinity, ez1 = -Infinity
  for (let v = 0; v < n; v++) { const o = vs + v * stride, yy = dv.getFloat32(o + 4, true), zz = dv.getFloat32(o + 8, true); ey0 = Math.min(ey0, yy); ey1 = Math.max(ey1, yy); ez0 = Math.min(ez0, zz); ez1 = Math.max(ez1, zz) }
  const zUp = ez1 - ez0 > ey1 - ey0 // z-up files (Unreal) face +X: turned to face the game's forward (-Z)
  for (let v = 0; v < n; v++) { const o = vs + v * stride; const rx = dv.getFloat32(o, true), ry = dv.getFloat32(o + 4, true), rz = dv.getFloat32(o + 8, true); const x = zUp ? -ry : rx, y = zUp ? rz : -ry, z = zUp ? -rx : -rz; // z-up (Tower Unite v3, Unreal): the body faces +X in the file, turned onto the game's -Z P.set([x, y, z], v * 3); UV[v * 2] = dv.getFloat32(o + 20, true); UV[v * 2 + 1] = dv.getFloat32(o + 24, true); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y) }
  const s = 1.8 / (ymax - ymin || 1), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (let v = 0; v < n; v++) { P[v * 3] *= s; P[v * 3 + 1] = (P[v * 3 + 1] - ymin) * s; P[v * 3 + 2] *= s; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[v * 3 + k]); mx[k] = Math.max(mx[k], P[v * 3 + k]) } }
  const Nn = new Float32Array(n * 3)
  for (let t = 0; t + 2 < total; t += 3) { const [a, b, c] = [I[t] * 3, I[t + 1] * 3, I[t + 2] * 3]; const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]; const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; for (const q of [a, b, c]) for (let k = 0; k < 3; k++) Nn[q + k] += f[k] }
  for (let v = 0; v < n; v++) { const l = Math.hypot(Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]) || 1; for (let k = 0; k < 3; k++) Nn[v * 3 + k] /= l }
  const texs = []; let o = vs + n * stride
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], IEND = [0x49, 0x45, 0x4e, 0x44]
  while (o < d.length - 18 && texs.length < 16) {
    if (d[o] === 0x89 && findBytes(d.subarray(o, o + 8), PNG) === 0) { const e = findBytes(d, IEND, o); if (e > 0) { texs.push(d.slice(o, e + 8)); o = e + 8; continue } }
    if (d[o] === 0xff && d[o + 1] === 0xd8 && d[o + 2] === 0xff) { let e = o + 2; while (e < d.length - 1 && !(d[e] === 0xff && d[e + 1] === 0xd9)) e++; const img = await createImageBitmap(new Blob([d.slice(o, e + 2)])).catch(() => null); if (img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); const b = await new Promise((r) => c.toBlob(r, 'image/png')); texs.push(new Uint8Array(await b.arrayBuffer())); o = e + 2; continue } }
    const t = d[o + 1] === 0 && (d[o + 2] === 2 || d[o + 2] === 10) ? tga(d, o) : null; if (t) { texs.push(await png(t)); o = t.end } else o++
  }
  const parts = [], views = [], acc = []; let len = 0
  const add = (bytes, target) => { views.push({ buffer: 0, byteOffset: len, byteLength: bytes.byteLength, ...(target ? { target } : {}) }); const padn = (4 - (bytes.byteLength % 4)) % 4; parts.push(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), new Uint8Array(padn)); len += bytes.byteLength + padn; return views.length - 1 }
  const A = (view, componentType, count, type, extra = {}) => { acc.push({ bufferView: view, componentType, count, type, ...extra }); return acc.length - 1 }
  const aP = A(add(P, 34962), 5126, n, 'VEC3', { min: mn, max: mx }), aN = A(add(Nn, 34962), 5126, n, 'VEC3'), aU = A(add(UV, 34962), 5126, n, 'VEC2')
  const R = fileRig(d, dv, vh, vs, n, stride, zUp, s, ymin) || autoRig(P, n), aJ = A(add(R.JO, 34962), 5123, n, 'VEC4'), aW = A(add(R.W, 34962), 5126, n, 'VEC4'), aIB = A(add(R.IBM), 5126, R.J.length, 'MAT4')
  const images = texs.map((t) => ({ bufferView: add(t), mimeType: 'image/png' }))
  const mats = [], prims = []
  for (const [start, count, mat] of secs) {
    const ai = A(add(I.slice(start, start + count), 34963), 5125, count, 'SCALAR')
    mats.push({ pbrMetallicRoughness: { ...(texs.length ? { baseColorTexture: { index: Math.min(mat, texs.length - 1) } } : {}), metallicFactor: 0, roughnessFactor: 0.75 }, alphaMode: 'MASK', alphaCutoff: 0.4, doubleSided: true })
    prims.push({ attributes: { POSITION: aP, NORMAL: aN, TEXCOORD_0: aU, JOINTS_0: aJ, WEIGHTS_0: aW }, indices: ai, material: mats.length - 1 })
  }
  const jn = R.J.map((j, i) => { const kids = R.J.map((k, ki) => (k.parent === i ? ki + 1 : -1)).filter((x) => x > 0); return { name: j.name, translation: j.lt, rotation: j.lq, ...(kids.length ? { children: kids } : {}) } })
  const roots = R.J.map((j, i) => (j.parent < 0 ? i + 1 : -1)).filter((x) => x > 0)
  const arm = R.arm ? [{ name: 'Armature', ...R.arm, children: roots }] : []
  const g = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: R.arm ? [0, R.J.length + 1] : [0, ...roots] }], nodes: [{ name: 'body', mesh: 0, skin: 0 }, ...jn, ...arm], skins: [{ skeleton: R.arm ? R.J.length + 1 : roots[0], joints: R.J.map((_, i) => i + 1), inverseBindMatrices: aIB }], meshes: [{ primitives: prims }], materials: mats, accessors: acc, bufferViews: views, buffers: [{ byteLength: len }],
    ...(texs.length ? { textures: texs.map((_, i) => ({ source: i, sampler: 0 })), samplers: [{ wrapS: 10497, wrapT: 10497 }], images } : {}) }
  let js = new TextEncoder().encode(JSON.stringify(g)); const jp = (4 - (js.length % 4)) % 4; if (jp) { const t = new Uint8Array(js.length + jp).fill(32); t.set(js); js = t }
  const head = new DataView(new ArrayBuffer(20)); head.setUint32(0, 0x46546c67, true); head.setUint32(4, 2, true); head.setUint32(8, 28 + js.length + len, true); head.setUint32(12, js.length, true); head.setUint32(16, 0x4e4f534a, true)
  const bh = new DataView(new ArrayBuffer(8)); bh.setUint32(0, len, true); bh.setUint32(4, 0x004e4942, true)
  return new Blob([head, js, bh, ...parts], { type: 'model/gltf-binary' })
}
// the file's own rig: Tower Unite plymodels carry their Unreal skeleton (pelvis, spine_01, thigh_l …) as records
//   0x01, name length, name, 3x4 inverse bind (mesh space, rows), 3x4 local pose (rows), i32 parent, u32 index
// and each vertex names 8 bones (bytes 28-35) with u8 weights (36-43). Joints keep the file's names and pose;
// the mesh was turned and scaled into game space (A), so joints ride an Armature node holding A and IBM' = IBM·A⁻¹.
function fileRig(d, dv, vh, vs, n, stride, zUp, sc, ymin) {
  if (stride < 44) return null
  const J = [], mat = (o) => { const m = []; for (let k = 0; k < 12; k++) m.push(dv.getFloat32(o + k * 4, true)); return m }
  const lim = Math.min(vh > 0 ? vh : d.length, 65536)
  for (let o = 0; o + 2 < lim; o++) {
    if (d[o] !== 1) continue
    const L = d[o + 1]; if (L < 2 || L > 48) continue
    let ok = true, name = ''
    for (let k = 0; k < L; k++) { const c = d[o + 2 + k]; if (!((c >= 97 && c <= 122) || c === 95 || (k && c >= 48 && c <= 57))) { ok = false; break } name += String.fromCharCode(c) }
    if (!ok) continue
    const r = o + 2 + L; if (r + 104 > d.length) break
    const par = dv.getInt32(r + 96, true), idx = dv.getUint32(r + 100, true)
    if (idx !== J.length || par < -1 || par > 400) continue
    J.push({ name, parent: par, ib: mat(r), lm: mat(r + 48) }); o = r + 103
  }
  if (J.length < 8 || J.some((j) => j.parent >= J.length) || !J.some((j) => j.parent < 0)) return null
  // the turn the vertices took: p = A r (A = T(0,-ymin·s,0) · s · M)
  const M = zUp ? [[0, -1, 0], [0, 0, 1], [-1, 0, 0]] : [[1, 0, 0], [0, -1, 0], [0, 0, -1]], ty = -ymin * sc
  const q = (m) => { const [a, b, c] = m, tr = a[0] + b[1] + c[2]; let x, y, z, w; if (tr > 0) { const S = Math.sqrt(tr + 1) * 2; w = S / 4; x = (c[1] - b[2]) / S; y = (a[2] - c[0]) / S; z = (b[0] - a[1]) / S } else if (a[0] > b[1] && a[0] > c[2]) { const S = Math.sqrt(1 + a[0] - b[1] - c[2]) * 2; w = (c[1] - b[2]) / S; x = S / 4; y = (a[1] + b[0]) / S; z = (a[2] + c[0]) / S } else if (b[1] > c[2]) { const S = Math.sqrt(1 + b[1] - a[0] - c[2]) * 2; w = (a[2] - c[0]) / S; x = (a[1] + b[0]) / S; y = S / 4; z = (b[2] + c[1]) / S } else { const S = Math.sqrt(1 + c[2] - a[0] - b[1]) * 2; w = (b[0] - a[1]) / S; x = (a[2] + c[0]) / S; y = (b[2] + c[1]) / S; z = S / 4 } const l = Math.hypot(x, y, z, w) || 1; return [x / l, y / l, z / l, w / l] }
  const rows3 = (m) => [[m[0], m[1], m[2]], [m[4], m[5], m[6]], [m[8], m[9], m[10]]]
  const mm = (a, b) => a.map((r) => [0, 1, 2].map((c) => r[0] * b[0][c] + r[1] * b[1][c] + r[2] * b[2][c]))
  for (const j of J) {
    let R = rows3(j.lm); const sx = Math.hypot(R[0][0], R[1][0], R[2][0]) || 1; R = R.map((r) => r.map((v) => v / sx))
    let t = [j.lm[3] * sc, j.lm[7] * sc, j.lm[11] * sc]
    if (j.parent < 0) { R = mm(M, R); t = [M[0][0] * t[0] + M[0][1] * t[1] + M[0][2] * t[2], M[1][0] * t[0] + M[1][1] * t[1] + M[1][2] * t[2] + ty, M[2][0] * t[0] + M[2][1] * t[1] + M[2][2] * t[2]] }
    j.lt = t; j.lq = q(R)
  }
  // A⁻¹ = Mᵀ · (1/s) · T(0,+ymin·s,0); IBM' = IBM · A⁻¹, written column-major
  const Ai = [[M[0][0] / sc, M[1][0] / sc, M[2][0] / sc, 0], [M[0][1] / sc, M[1][1] / sc, M[2][1] / sc, 0], [M[0][2] / sc, M[1][2] / sc, M[2][2] / sc, 0], [0, 0, 0, 1]]
  for (let r = 0; r < 3; r++) Ai[r][3] = -(Ai[r][1] * ty)
  // rest frames in game space, then each joint re-seated with no rest turn at the same pivot (what clip retargeting expects):
  // world position of joint i = A · (inverse of its file bind) · origin
  const Pw = J.map((j) => { const B = [[j.ib[0], j.ib[1], j.ib[2]], [j.ib[4], j.ib[5], j.ib[6]], [j.ib[8], j.ib[9], j.ib[10]]], tb = [j.ib[3], j.ib[7], j.ib[11]]
    const o = [0, 1, 2].map((r) => -(B[0][r] * tb[0] + B[1][r] * tb[1] + B[2][r] * tb[2])) // Bᵀ(-t): the joint's file-space position
    return [0, 1, 2].map((r) => sc * (M[r][0] * o[0] + M[r][1] * o[1] + M[r][2] * o[2]) + (r === 1 ? ty : 0)) })
  J.forEach((j, i) => { const pp = j.parent >= 0 ? Pw[j.parent] : [0, 0, 0]; j.lt = [Pw[i][0] - pp[0], Pw[i][1] - pp[1], Pw[i][2] - pp[2]]; j.lq = [0, 0, 0, 1] })
  const IBM = new Float32Array(J.length * 16)
  J.forEach((j, i) => IBM.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -Pw[i][0], -Pw[i][1], -Pw[i][2], 1], i * 16))
  // weights: the four strongest of eight, renormalized; an unweighted vertex rides the root's first child
  const JO = new Uint16Array(n * 4), W = new Float32Array(n * 4), fb = Math.max(0, J.findIndex((j) => j.name === 'pelvis'))
  let bad = 0
  for (let v = 0; v < n; v++) {
    const o = vs + v * stride, inf = []
    for (let k = 0; k < 8; k++) { const w = d[o + 36 + k], b = d[o + 28 + k]; if (w && b < J.length) inf.push([b, w]) }
    inf.sort((a, b) => b[1] - a[1]); const top = inf.slice(0, 4), sum = top.reduce((a, x) => a + x[1], 0)
    if (!sum) { bad++; JO[v * 4] = fb; W[v * 4] = 1; continue }
    top.forEach(([b, w], k) => { JO[v * 4 + k] = b; W[v * 4 + k] = w / sum })
  }
  if (bad > n * 0.5) return null
  return { J, JO, W, IBM }
}
// auto-rig (only for a file with no skeleton): a Mixamo-named humanoid skeleton fitted to the mesh's own extents, each vertex skinned to its two nearest bones on its side
function autoRig(P, n) {
  const H = 1.8, side = (x) => (x > 0.012 ? 1 : x < -0.012 ? -1 : 0), X = (v) => P[v * 3], Y = (v) => P[v * 3 + 1], Z = (v) => P[v * 3 + 2]
  // landmarks read off the mesh: feet, arm line, crotch
  let lx = 0, ln = 0, fz0 = Infinity, fz1 = -Infinity, mxL = 0, mxR = 0
  for (let v = 0; v < n; v++) { if (Y(v) < 0.05 * H) { lx += Math.abs(X(v)); ln++; fz0 = Math.min(fz0, Z(v)); fz1 = Math.max(fz1, Z(v)) } if (Y(v) > 0.3 * H && Y(v) < 0.9 * H) { if (X(v) > mxR) mxR = X(v); if (-X(v) > mxL) mxL = -X(v) } }
  const legX = Math.max(0.03 * H, ln ? lx / ln : 0.09 * H), fzMid = isFinite(fz0) ? (fz0 + fz1) / 2 : 0, legBack = isFinite(fz1) ? fz1 + 0.04 * H : 0.1 * H
  const span = Math.min(mxL, mxR), tpose = span > 0.26 * H
  let ay = 0, an = 0; if (tpose) for (let v = 0; v < n; v++) if (Math.abs(X(v)) > 0.75 * span && Y(v) > 0.3 * H) { ay += Y(v); an++ }
  const armY = tpose && an ? ay / an : 0.72 * H, shX = tpose ? Math.max(0.06 * H, 0.3 * span) : 0.1 * H
  let crotch = 0.45 * H; for (let y = 0.06 * H; y < armY - 0.1 * H; y += 0.01 * H) { let c = 0; for (let v = 0; v < n; v++) if (Math.abs(Y(v) - y) < 0.005 * H && Math.abs(X(v)) < 0.25 * legX && Z(v) < legBack) c++; if (c >= 3) { crotch = y; break } }
  const hipY = crotch + 0.04 * H, ank = 0.045 * H, knee = (crotch + ank) / 2, neckY = armY + 0.06 * H, headY = neckY + 0.05 * H
  const sh = (sd) => [sd * shX, armY, fzMid]
  const hand = (sd) => { const S = sh(sd); let best = null, bd = 0; for (let v = 0; v < n; v++) { const x = X(v), y = Y(v), z = Z(v); if (x * sd < shX * 1.2 || y < 0.15 * H || y > headY) continue; const dd = Math.hypot(x - S[0], y - S[1], z - S[2]); if (dd > bd) { bd = dd; best = [x, y, z] } } return best || [sd * shX * 1.8, armY - 0.25 * H, fzMid] }
  const J = [], add = (name, parent, pos) => { J.push({ name: 'mixamorig:' + name, parent, pos }); return J.length - 1 }
  const lerpY = (t) => hipY + (armY - hipY) * t
  const hips = add('Hips', -1, [0, hipY, fzMid]), sp = add('Spine', hips, [0, lerpY(0.3), fzMid]), sp1 = add('Spine1', sp, [0, lerpY(0.6), fzMid]), sp2 = add('Spine2', sp1, [0, lerpY(0.9), fzMid])
  const neck = add('Neck', sp2, [0, neckY, fzMid]), head = add('Head', neck, [0, headY, fzMid]); add('HeadTop_End', head, [0, H, fzMid])
  const segs = [[hips, sp, 0], [sp, sp1, 0], [sp1, sp2, 0], [sp2, neck, 0], [neck, head, 0], [head, J.length - 1, 0]]
  const armOut = shX * 0.85 / H
  for (const [sd, L] of [[-1, 'Left'], [1, 'Right']]) { // the model faces -Z, so its left is -X
    const tip = hand(sd), S = sh(sd), wr = S.map((c, k) => c + (tip[k] - c) * 0.85), el = S.map((c, k) => c + (wr[k] - c) * 0.5)
    const c = add(L + 'Shoulder', sp2, [sd * shX * 0.35, armY, fzMid]), a = add(L + 'Arm', c, S), f = add(L + 'ForeArm', a, el), h = add(L + 'Hand', f, wr), e = add(L + 'HandEnd', h, tip)
    const ul = add(L + 'UpLeg', hips, [sd * legX, crotch, fzMid]), lg = add(L + 'Leg', ul, [sd * legX, knee, fzMid]), ft = add(L + 'Foot', lg, [sd * legX, ank, fzMid]), toe = add(L + 'ToeBase', ft, [sd * legX, 0.015 * H, fz0 + (fz1 - fz0) * 0.3]), te = add(L + 'Toe_End', toe, [sd * legX, 0.015 * H, fz0])
    segs.push([c, a, sd, armOut * 0.4], [a, f, sd, armOut], [f, h, sd, armOut], [h, e, sd, armOut], [ul, lg, sd, 0, 1], [lg, ft, sd, 0, 1], [ft, toe, sd, 0, 1], [toe, te, sd, 0, 1])
  }
  const segD = (q, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], aq = [q[0] - a[0], q[1] - a[1], q[2] - a[2]]; const t = Math.max(0, Math.min(1, (aq[0] * ab[0] + aq[1] * ab[1] + aq[2] * ab[2]) / ((ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2) || 1))); return Math.hypot(aq[0] - ab[0] * t, aq[1] - ab[1] * t, aq[2] - ab[2] * t) }
  const JO = new Uint16Array(n * 4), W = new Float32Array(n * 4)
  for (let v = 0; v < n; v++) {
    const q = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], sv = side(q[0]); let b1 = -1, d1 = Infinity, b2 = -1, d2 = Infinity
    for (const [a, b, sd, out, leg] of segs) { if (sd && sv && sd !== sv) continue; if (out && Math.abs(q[0]) < out * H) continue; if (leg && (q[2] > legBack || q[1] > hipY + 0.02 * H)) continue; if (sd && !sv && !leg && q[1] < armY - 0.1 * H) continue; const dd = segD(q, J[a].pos, J[b].pos); if (dd < d1) { b2 = b1; d2 = d1; b1 = a; d1 = dd } else if (dd < d2 && a !== b1) { b2 = a; d2 = dd } }
    const w1 = 1 / Math.pow(d1 + 0.01, 4), w2 = b2 >= 0 ? 1 / Math.pow(d2 + 0.01, 4) : 0
    JO[v * 4] = b1; JO[v * 4 + 1] = Math.max(0, b2); W[v * 4] = w1 / (w1 + w2); W[v * 4 + 1] = w2 / (w1 + w2)
  }
  const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]
  const qinv = (q) => [-q[0], -q[1], -q[2], q[3]]
  const qrot = (q, v) => { const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qinv(q)); return [p[0], p[1], p[2]] }
  const fromY = (d) => { const l = Math.hypot(...d) || 1, u = d.map((c) => c / l), dt = u[1]; if (dt < -0.9999) return [0, 0, 1, 0]; const ax = [u[2], 0, -u[0]], w = 1 + dt, m = Math.hypot(ax[0], ax[1], ax[2], w); return [ax[0] / m, ax[1] / m, ax[2] / m, w / m] }
  J.forEach((j, i) => { const kid = J.findIndex((k) => k.parent === i); j.wq = kid >= 0 ? fromY(J[kid].pos.map((c, k) => c - j.pos[k])) : j.parent >= 0 ? J[j.parent].wq : [0, 0, 0, 1] })
  J.forEach((j) => { const pq = j.parent >= 0 ? J[j.parent].wq : [0, 0, 0, 1], pp = j.parent >= 0 ? J[j.parent].pos : [0, 0, 0]; j.lq = qmul(qinv(pq), j.wq); j.lt = qrot(qinv(pq), j.pos.map((c, k) => c - pp[k])) })
  const IBM = new Float32Array(J.length * 16)
  J.forEach((j, i) => { const iq = qinv(j.wq), x = qrot(iq, [1, 0, 0]), y = qrot(iq, [0, 1, 0]), z = qrot(iq, [0, 0, 1]), t = qrot(iq, j.pos).map((c) => -c); IBM.set([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, t[0], t[1], t[2], 1], i * 16) })
  return { J, JO, W, IBM }
}
let busy = false
export async function plyUpload(input) {
  const f = input.files?.[0], st = document.getElementById('ply-st'), say = (t) => { if (st) st.textContent = t }
  if (!f || busy) return
  busy = true; say('reading ' + f.name + '…')
  try {
    const glb = await plyToGlb(await f.arrayBuffer())
    say('uploading…')
    const r = await window.spawn.assets.upload({ blob: glb, name: f.name.replace(/\.[^.]*$/, '') + '.glb' })
    if (r?.url) { sendAction('dress', { k: 'modelUrl', v: r.url }); say('wearing ' + f.name) } else say('upload failed')
  } catch (e) { say(e?.code === 'guest_not_allowed' ? 'sign in to upload' : e?.code === 'rate_limited' ? 'too fast, try again in a bit' : /glb|editor|not.allowed/i.test(String(e?.message || e?.code)) ? 'model uploads are for builders here' : "couldn't read that file: " + (e?.message || e)); console.warn('[plyimport]', f.name, e) }
  busy = false; input.value = ''
}
