// The tee worn under open-front tops (jacket, blazer, vest): only the front strip of the plain Ward_tee (|x| < BAND, facing forward) is kept, every
// vertex settled TARGET mm off the skin. The outer garments hug the skin too, so a whole inner tee fought them (white patches through the jacket);
// a strip as wide as the opening shows where the jacket parts and is hidden behind it elsewhere. Usage (outside the tree, gltf-transform installed):
//   node inner_tee.mjs body.glb Ward_tee.glb out.glb [target_mm] [band_mm]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, sparse, meshopt } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import fs from 'node:fs'
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const [, , bodyF, wardF, dst, mm = '1', bandMm = '55'] = process.argv, TARGET = +mm / 1000, BAND = +bandMm / 1000
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
function closest(p, a, b, c) {
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
const body = await io.read(bodyF), tris = []
for (const nd of body.getRoot().listNodes()) {
  const m = nd.getMesh(); if (!m || !(nd.getName() === 'Body' || nd.getName().startsWith('Skin_'))) continue
  for (const p of m.listPrimitives()) { const pos = p.getAttribute('POSITION'), idx = p.getIndices().getArray()
    for (let t = 0; t < idx.length; t += 3) { const a = pos.getElement(idx[t], []), b = pos.getElement(idx[t + 1], []), c = pos.getElement(idx[t + 2], []); tris.push({ a, b, c, n: norm(cross(sub(b, a), sub(c, a))), mn: [Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]), Math.min(a[2], b[2], c[2])], mx: [Math.max(a[0], b[0], c[0]), Math.max(a[1], b[1], c[1]), Math.max(a[2], b[2], c[2])] }) } }
}
const doc = await io.read(wardF); let moved = 0, total = 0
for (const nd of doc.getRoot().listNodes()) {
  if (!nd.getMesh()) continue
  for (const p of nd.getMesh().listPrimitives()) {
    const pos = p.getAttribute('POSITION'); const targets = p.listTargets()
    for (let i = 0; i < pos.getCount(); i++) {
      total++; const v = pos.getElement(i, []); let best = null, bd = 0.15
      for (const t of tris) { if (v[0] < t.mn[0] - bd || v[0] > t.mx[0] + bd || v[1] < t.mn[1] - bd || v[1] > t.mx[1] + bd || v[2] < t.mn[2] - bd || v[2] > t.mx[2] + bd) continue
        const q = closest(v, t.a, t.b, t.c), d = Math.hypot(v[0] - q[0], v[1] - q[1], v[2] - q[2]); if (d < bd) { bd = d; best = { q, n: t.n } } }
      if (!best) continue
      const sd = dot(sub(v, best.q), best.n), move = TARGET - sd; if (Math.abs(move) < 1e-5) continue
      pos.setElement(i, [v[0] + best.n[0] * move, v[1] + best.n[1] * move, v[2] + best.n[2] * move]); moved++
    }
  }
}
let kept = 0
for (const nd of doc.getRoot().listNodes()) { if (!nd.getMesh()) continue
  for (const p of nd.getMesh().listPrimitives()) { const pos = p.getAttribute('POSITION'), ia = p.getIndices(), idx = ia.getArray(), keep = []
    for (let t = 0; t < idx.length; t += 3) { const a = pos.getElement(idx[t], []), b = pos.getElement(idx[t + 1], []), c = pos.getElement(idx[t + 2], []), n = norm(cross(sub(b, a), sub(c, a)))
      if (Math.max(Math.abs(a[0]), Math.abs(b[0]), Math.abs(c[0])) < BAND && n[2] > 0.15) { keep.push(idx[t], idx[t + 1], idx[t + 2]); kept++ } }
    ia.setArray(new idx.constructor(keep)) } }
console.log('vertices', total, 'settled', moved, 'front strip triangles', kept)
await doc.transform(dedup(), prune({ keepAttributes: true, keepLeaves: true }), sparse(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
fs.writeFileSync(dst, await io.writeBinary(doc)); console.log('wrote', dst)
