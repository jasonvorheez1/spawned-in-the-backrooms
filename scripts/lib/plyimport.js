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
  const nsec = d[0x4a]; if (!nsec || nsec > 32) throw new Error('not a plymodel')
  const secs = []; for (let i = 0; i < nsec; i++) { const o = 0x4b + 16 * i; secs.push([dv.getUint32(o, true), dv.getUint32(o + 4, true), dv.getUint32(o + 8, true)]) }
  const vh = findBytes(d, [1, 1, 0x2c, 0, 0, 0]); if (vh < 0) throw new Error('no vertices')
  const total = Math.max(...secs.map((s) => s[0] + s[1])), i0 = vh - total * 4
  const I = new Uint32Array(total); let n = 0
  for (let i = 0; i < total; i++) { I[i] = dv.getUint32(i0 + i * 4, true); if (I[i] + 1 > n) n = I[i] + 1 }
  const vs = vh + 9, P = new Float32Array(n * 3), UV = new Float32Array(n * 2)
  let ymin = Infinity, ymax = -Infinity
  for (let v = 0; v < n; v++) { const o = vs + v * 44; const x = dv.getFloat32(o, true), y = -dv.getFloat32(o + 4, true), z = -dv.getFloat32(o + 8, true); P.set([x, y, z], v * 3); UV[v * 2] = dv.getFloat32(o + 20, true); UV[v * 2 + 1] = dv.getFloat32(o + 24, true); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y) }
  const s = 1.8 / (ymax - ymin || 1), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (let v = 0; v < n; v++) { P[v * 3] *= s; P[v * 3 + 1] = (P[v * 3 + 1] - ymin) * s; P[v * 3 + 2] *= s; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[v * 3 + k]); mx[k] = Math.max(mx[k], P[v * 3 + k]) } }
  const Nn = new Float32Array(n * 3)
  for (let t = 0; t + 2 < total; t += 3) { const [a, b, c] = [I[t] * 3, I[t + 1] * 3, I[t + 2] * 3]; const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]; const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; for (const q of [a, b, c]) for (let k = 0; k < 3; k++) Nn[q + k] += f[k] }
  for (let v = 0; v < n; v++) { const l = Math.hypot(Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]) || 1; for (let k = 0; k < 3; k++) Nn[v * 3 + k] /= l }
  const texs = []; let o = vs + n * 44
  while (o < d.length - 18 && texs.length < 16) { const t = d[o + 1] === 0 && (d[o + 2] === 2 || d[o + 2] === 10) ? tga(d, o) : null; if (t) { texs.push(await png(t)); o = t.end } else o++ }
  const parts = [], views = [], acc = []; let len = 0
  const add = (bytes, target) => { views.push({ buffer: 0, byteOffset: len, byteLength: bytes.byteLength, ...(target ? { target } : {}) }); const padn = (4 - (bytes.byteLength % 4)) % 4; parts.push(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), new Uint8Array(padn)); len += bytes.byteLength + padn; return views.length - 1 }
  const A = (view, componentType, count, type, extra = {}) => { acc.push({ bufferView: view, componentType, count, type, ...extra }); return acc.length - 1 }
  const aP = A(add(P, 34962), 5126, n, 'VEC3', { min: mn, max: mx }), aN = A(add(Nn, 34962), 5126, n, 'VEC3'), aU = A(add(UV, 34962), 5126, n, 'VEC2')
  const images = texs.map((t) => ({ bufferView: add(t), mimeType: 'image/png' }))
  const mats = [], prims = []
  for (const [start, count, mat] of secs) {
    const ai = A(add(I.slice(start, start + count), 34963), 5125, count, 'SCALAR')
    mats.push({ pbrMetallicRoughness: { ...(texs.length ? { baseColorTexture: { index: Math.min(mat, texs.length - 1) } } : {}), metallicFactor: 0, roughnessFactor: 0.75 }, alphaMode: 'MASK', alphaCutoff: 0.4, doubleSided: true })
    prims.push({ attributes: { POSITION: aP, NORMAL: aN, TEXCOORD_0: aU }, indices: ai, material: mats.length - 1 })
  }
  const g = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: prims }], materials: mats, accessors: acc, bufferViews: views, buffers: [{ byteLength: len }],
    ...(texs.length ? { textures: texs.map((_, i) => ({ source: i, sampler: 0 })), samplers: [{ wrapS: 10497, wrapT: 10497 }], images } : {}) }
  let js = new TextEncoder().encode(JSON.stringify(g)); const jp = (4 - (js.length % 4)) % 4; if (jp) { const t = new Uint8Array(js.length + jp).fill(32); t.set(js); js = t }
  const head = new DataView(new ArrayBuffer(20)); head.setUint32(0, 0x46546c67, true); head.setUint32(4, 2, true); head.setUint32(8, 28 + js.length + len, true); head.setUint32(12, js.length, true); head.setUint32(16, 0x4e4f534a, true)
  const bh = new DataView(new ArrayBuffer(8)); bh.setUint32(0, len, true); bh.setUint32(4, 0x004e4942, true)
  return new Blob([head, js, bh, ...parts], { type: 'model/gltf-binary' })
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
  } catch (e) { say(e?.code === 'guest_not_allowed' ? 'sign in to upload' : e?.code === 'rate_limited' ? 'too fast, try again in a bit' : /glb|editor|not.allowed/i.test(String(e?.message || e?.code)) ? 'model uploads are for builders here' : "couldn't read that file") }
  busy = false; input.value = ''
}
