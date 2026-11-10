// Underwear sunk into the skin (Nov 10: the nude bodies' shorts read as two leg tubes, with skin and buttock pushing through the seat, and slits on the thighs).
// Every Under_* vertex closer than GAP to the body's skin (Body + Skin_*), or under it, moves out along the nearest skin face's normal to GAP; the small
// Under_bottom was only two leg tubes (no seat, crotch or hip band; the skin showed there), so the skin triangles in its height band that no tube covers are copied
// into it, 5 mm off the skin, with their own weights. Weights, UVs and normals of what was there are left as they are.
// Usage (outside the tree, with @gltf-transform/core, extensions, functions and meshoptimizer installed): node fix_under.mjs in.glb out.glb [gap_mm]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, sparse, meshopt } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import fs from 'node:fs'
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const [, , src, dst, gapMm = '4'] = process.argv, GAP = +gapMm / 1000
const doc = await io.read(src)
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
function closest(p, a, b, c) { // Ericson, Real-Time Collision Detection 5.1.5
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return a
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return b
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v] }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return c
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w] }
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + d5 - d6); return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w] }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]
}
const tris = []
for (const nd of doc.getRoot().listNodes()) {
  const m = nd.getMesh(); if (!m || !(nd.getName() === 'Body' || nd.getName().startsWith('Skin_'))) continue
  for (const p of m.listPrimitives()) { const pos = p.getAttribute('POSITION'), idx = p.getIndices().getArray()
    for (let t = 0; t < idx.length; t += 3) { const a = pos.getElement(idx[t], []), b = pos.getElement(idx[t + 1], []), c = pos.getElement(idx[t + 2], []); const n = norm(cross(sub(b, a), sub(c, a))); tris.push({ a, b, c, n, mn: [Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]), Math.min(a[2], b[2], c[2])], mx: [Math.max(a[0], b[0], c[0]), Math.max(a[1], b[1], c[1]), Math.max(a[2], b[2], c[2])] }) } }
}
console.log('skin triangles', tris.length)
for (const nd of doc.getRoot().listNodes()) {
  if (!nd.getName().startsWith('Under_') || !nd.getMesh()) continue
  for (const p of nd.getMesh().listPrimitives()) {
    const pos = p.getAttribute('POSITION'); let moved = 0, worst = 0
    for (let i = 0; i < pos.getCount(); i++) {
      const v = pos.getElement(i, []); let best = null, bd = 0.04
      for (const t of tris) { if (v[0] < t.mn[0] - bd || v[0] > t.mx[0] + bd || v[1] < t.mn[1] - bd || v[1] > t.mx[1] + bd || v[2] < t.mn[2] - bd || v[2] > t.mx[2] + bd) continue
        const q = closest(v, t.a, t.b, t.c), d = Math.hypot(v[0] - q[0], v[1] - q[1], v[2] - q[2]); if (d < bd) { bd = d; best = { q, n: t.n } } }
      if (!best) continue
      const sd = dot(sub(v, best.q), best.n); if (sd >= GAP) continue
      const push = GAP - sd; worst = Math.max(worst, push); pos.setElement(i, [v[0] + best.n[0] * push, v[1] + best.n[1] * push, v[2] + best.n[2] * push]); moved++
    }
    console.log(nd.getName(), 'vertices', pos.getCount(), 'moved', moved, 'worst push mm', (worst * 1000).toFixed(1))
  }
}
for (const nd of doc.getRoot().listNodes()) { // faces that look into the body are culled: wind them to match the skin they lie on
  if (nd.getName() !== 'Under_bottom' || !nd.getMesh()) continue // the bra is a thin fitted shell: turning its lining out only frays it
  for (const p of nd.getMesh().listPrimitives()) { const pos = p.getAttribute('POSITION'), ia = p.getIndices(), idx = ia.getArray().slice(); let flipped = 0
    for (let t = 0; t < idx.length; t += 3) {
      const a = pos.getElement(idx[t], []), b = pos.getElement(idx[t + 1], []), c = pos.getElement(idx[t + 2], []), n = norm(cross(sub(b, a), sub(c, a))), g = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]
      let best = null, bd = 0.05
      for (const s of tris) { if (g[0] < s.mn[0] - bd || g[0] > s.mx[0] + bd || g[1] < s.mn[1] - bd || g[1] > s.mx[1] + bd || g[2] < s.mn[2] - bd || g[2] > s.mx[2] + bd) continue
        const q = closest(g, s.a, s.b, s.c), d = Math.hypot(g[0] - q[0], g[1] - q[1], g[2] - q[2]); if (d < bd) { bd = d; best = s } }
      if (best && dot(n, best.n) < -0.2) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; flipped++ }
    }
    ia.setArray(idx); console.log(nd.getName(), 'faces turned outward', flipped, 'of', idx.length / 3) }
}
for (const nd of doc.getRoot().listNodes()) { // the seat
  if (nd.getName() !== 'Under_bottom') continue
  const prim = nd.getMesh().listPrimitives()[0], pos = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray()
  let lo = 9, hi = -9; for (let i = 0; i < pos.getCount(); i++) { const y = pos.getElement(i, [])[1]; lo = Math.min(lo, y); hi = Math.max(hi, y) }
  const tubes = []; for (let t = 0; t < idx.length; t += 3) { const a = pos.getElement(idx[t], []), b = pos.getElement(idx[t + 1], []), c = pos.getElement(idx[t + 2], []); tubes.push([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]) }
  const OFF = 0.010, COVER = 0.004, nv = pos.getCount()
  const sem = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']
  const add = Object.fromEntries(sem.map((s) => [s, []])); const addIdx = []
  for (const sn of doc.getRoot().listNodes()) {
    if (!sn.getMesh() || !(sn.getName() === 'Body' || sn.getName().startsWith('Skin_'))) continue
    for (const sp of sn.getMesh().listPrimitives()) { const spos = sp.getAttribute('POSITION'), sidx = sp.getIndices().getArray()
      for (let t = 0; t < sidx.length; t += 3) {
        const v = [0, 1, 2].map((k) => spos.getElement(sidx[t + k], [])), c = [0, 1, 2].map((d) => (v[0][d] + v[1][d] + v[2][d]) / 3)
        if (c[1] < lo + 0.12 || c[1] > hi || Math.abs(c[0]) > 0.2) continue
        if (v.some((q) => q[1] > hi + 1e-4)) continue
        if (tubes.some((q) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) < COVER)) continue
        const n = norm(cross(sub(v[1], v[0]), sub(v[2], v[0])))
        for (let k = 0; k < 3; k++) { const i = sidx[t + k]; add.POSITION.push(...[0, 1, 2].map((d) => v[k][d] + n[d] * OFF)); add.NORMAL.push(...sp.getAttribute('NORMAL').getElement(i, [])); add.TEXCOORD_0.push(...sp.getAttribute('TEXCOORD_0').getElement(i, [])); add.JOINTS_0.push(...sp.getAttribute('JOINTS_0').getElement(i, [])); add.WEIGHTS_0.push(...sp.getAttribute('WEIGHTS_0').getElement(i, [])); addIdx.push(nv + addIdx.length) }
      } }
  }
  const nAdd = addIdx.length
  const enc = (acc, v) => { if (!acc.getNormalized()) return v; const a = acc.getArray(), max = a instanceof Uint8Array ? 255 : a instanceof Uint16Array ? 65535 : a instanceof Int8Array ? 127 : a instanceof Int16Array ? 32767 : 1; return Math.round(Math.max(a instanceof Int8Array || a instanceof Int16Array ? -1 : 0, Math.min(1, v)) * max) } // a normalized accessor stores its floats scaled to integers
  for (const s of sem) { const acc = prim.getAttribute(s), old = acc.getArray(), arr = new old.constructor(old.length + add[s].length); arr.set(old); arr.set(add[s].map((v) => enc(acc, v)), old.length); acc.setArray(arr) }
  const ia = prim.getIndices(), oi = ia.getArray(), ni = new (nv + nAdd > 65535 ? Uint32Array : oi.constructor)(oi.length + nAdd); ni.set(oi); ni.set(addIdx, oi.length); ia.setArray(ni)
  console.log('seat triangles added', nAdd / 3, 'band y', lo.toFixed(3), hi.toFixed(3))
}
await doc.transform(dedup(), prune({ keepAttributes: true, keepLeaves: true }), sparse(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
fs.writeFileSync(dst, await io.writeBinary(doc)); console.log('wrote', dst)
