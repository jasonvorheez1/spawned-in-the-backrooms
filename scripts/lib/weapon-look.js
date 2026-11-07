// What a weapon looks like: its Tripo mesh (fitted in art/weapons/build.py to the old scripted weapon's frame:
// length along +Z, handle at the origin), or the scripted shape for a kind with no mesh (fists, anything new).
// offset y = the fitted mesh's lowest point, so the file's origin sits on the object's feet like the old geometry did.
// A variant ("crowbar~taped", scripts/lib/weapons.js) wears its base's body, a tint on the mesh, and its look drawn over it.
import W, { baseOf } from './weapons.js'
import { MESHPROF } from './weapon-prof.js'
const RUST = "oklch(0.45 0.11 45)", DUCT = "oklch(0.62 0.01 250)", LEATHER = "oklch(0.4 0.07 50)", LIME = "oklch(0.84 0.2 128)", NAIL = "oklch(0.7 0.01 250)", STAIN = "oklch(0.3 0.1 25)"
// the shaft at file z: [x, y, r]
function shaftAt(z, p) {
  if (z <= p[0][0]) return p[0].slice(1); if (z >= p[p.length - 1][0]) return p[p.length - 1].slice(1)
  for (let i = 1; i < p.length; i++) if (z <= p[i][0]) { const a = p[i - 1], b = p[i], t = (z - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t] }
}
// a ring around the shaft from file z0 to z1. The engine stands a mesh centred on c and turned half round, so file (x, y, z) -> (c.x - x, y + oy, c.z - z)
function ring(mp, oy, z0, z1, k, color, rough = 0.6, metal = 0) {
  const [x, y, r] = shaftAt((z0 + z1) / 2, mp.p), h = Math.abs(z1 - z0), R = r * k
  return { primitive: { kind: "cylinder", radiusTop: R, radiusBottom: R, height: h, radialSegments: 12 }, rotation: { pitch: 90 }, pivot: "center",
    feetPosition: { x: mp.c[0] - x, y: y + oy - h / 2, z: mp.c[1] - (z0 + z1) / 2 }, material: { color, roughness: rough, metalness: metal }, castShadow: false }
}
function meshLook(base, look, oy) {
  if (base === 'pistol' && look === 'mag') // an extended magazine out of the butt, brass base plate: the grip's foot sits at file z≈0.17, y≈-0.096
    return [{ primitive: { kind: "box", width: 0.024, height: 0.07, depth: 0.03 }, feetPosition: { x: 0, y: -0.096 + oy - 0.06, z: 0.114 - 0.175 }, material: { color: "oklch(0.22 0.01 260)", roughness: 0.45, metalness: 0.6 }, castShadow: false },
            { primitive: { kind: "box", width: 0.026, height: 0.006, depth: 0.034 }, feetPosition: { x: 0, y: -0.096 + oy - 0.066, z: 0.114 - 0.175 }, material: { color: "oklch(0.75 0.13 85)", roughness: 0.3, metalness: 0.9 }, castShadow: false }]
  const mp = MESHPROF[base]; if (!mp) return [] // the fire axe and shotgun lie on a slant: their name and stats carry the variant
  const [g0, g1] = mp.grip, [h0, h1] = mp.head, out = []
  if (look === 'rust') for (const t of [0.15, 0.45, 0.8]) { const z = g1 + (h1 - g1) * t; out.push(ring(mp, oy, z, z + 0.025, 1.06, RUST, 1, 0.1)) }
  else if (look === 'tape') { out.push(ring(mp, oy, g0, g1, 1.1, DUCT, 0.55)); for (const t of [0.2, 0.55, 0.85]) { const z = g0 + (g1 - g0) * t; out.push(ring(mp, oy, z, z + 0.006, 1.16, "oklch(0.5 0.01 250)", 0.6)) } }
  else if (look === 'edge') out.push(ring(mp, oy, g0, g1, 1.08, LEATHER, 0.8))
  else if (look === 'meg') { out.push(ring(mp, oy, g1, g1 + 0.02, 1.1, LIME, 0.45)); out.push(ring(mp, oy, (h0 + h1) / 2, (h0 + h1) / 2 + 0.015, 1.06, LIME, 0.45)) }
  else if (look === 'nails') {
    out.push(ring(mp, oy, h0 + (h1 - h0) * 0.3, h0 + (h1 - h0) * 0.6, 1.02, STAIN, 0.7))
    for (let k = 0; k < 6; k++) { const z = h0 + ((k + 0.5) / 6) * (h1 - h0), [x, y, r] = shaftAt(z, mp.p), a = k * 2.4 + 0.5, L = 0.06, d = r + L / 2 - 0.012
      out.push({ primitive: { kind: "cylinder", radiusTop: 0.0018, radiusBottom: 0.003, height: L, radialSegments: 5 }, pivot: "center", rotation: { roll: a * 57.3 - 90 },
        feetPosition: { x: mp.c[0] - (x + Math.cos(a) * d), y: y + Math.sin(a) * d + oy - L / 2, z: mp.c[1] - z }, material: { color: NAIL, roughness: 0.4, metalness: 0.8 }, castShadow: false }) }
  }
  return out
}
const MESH = { // kind: [model, offset y, scale, the mesh's material slot]
  table_leg:  ["/cdn/value.4aaf9c7c64978c958d23a7a8a6304f31accb3d391d52f3043893a6d990453b17.glb", 0.003, 0, "tripo_material_56fe44d9-5412-443c-9632-5e086b2d0eb9"],
  pipe_scrap: ["/cdn/value.c2acc9e5cc7bdb121a5f3b529386a19df1bf55cd5184137d85ddb57d1978f7d9.glb", -0.006, 0, "tripo_material_38b8e37f-c1cb-4f2c-995d-80f28638caf6"],
  crowbar:    ["/cdn/value.26a60582c956ed9c19efc83291207f82a25034b07e680abcc16ab6d45a6c39de.glb", 0.025, 0, "tripo_material_6333f5c1-aa76-413a-8dd2-d7483635f47f"],
  bat:        ["/cdn/value.b9230b65f07cc34951b4d05d221181af8b81a9c9ff633c17ee867660dc01d4a1.glb", 0.0, 0, "tripo_material_ed96b284-b120-41ec-a6e8-b5a6c27428df"],
  hatchet:    ["/cdn/value.d5b03aa12f7ca58bef143468cf20432b163cb8a0b43a9d4d72190c9228502761.glb", 0.012, 0, "tripo_material_be6f1bf1-a677-4411-ad71-24b6df60e92c"],
  fire_axe:   ["/cdn/value.4cfc50ea098875687d7a11fbd93a6b8adc191957807e0b002f30007a8eead02e.glb", 0.008, 0.62, "tripo_material_3cfa6f0b-ba20-4b5f-9185-3a08bf3967ed"],
  pistol:     ["/cdn/value.bd1a0ff99d2e34491523ee49853ebddcbe4ec10b685abfb66bab58f6db1cbb00.glb", -0.064, 0, "tripo_material_b831ab79-8033-43a9-83a4-7a26d07345fd"],
  shotgun:    ["/cdn/value.5a2a421d33cd848a6df5ae7bf263814fc33ed17392a1dca306d6006fc6b33c34.glb", -0.032, 0, "tripo_material_7b83893e-ced9-4331-b685-1a4a787052e6"],
};
// each mesh's box centre in the scripted frame (x, z), from art/weapons/fit.json
const CENTER = { table_leg: [0, 0.3325], pipe_scrap: [0, 0.415], crowbar: [0, 0.4425], bat: [0, 0.4895], hatchet: [0.07, 0.417], fire_axe: [0.0175, 0.5395], pistol: [0, 0.114], shotgun: [0.002, 0.452] }
export function weaponBody(kind) {
  const base = baseOf(kind), w = W[kind] ?? {}, m = MESH[base], look = w.look, short = look === 'sawn' ? 0.72 : 1
  const body = m
    ? { model: { id: m[0], offset: [0, m[1], 0] } }
    : { primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind: base } }, ...(w.tint ? { material: { color: w.tint } } : {}) }
  const sc = m?.[2] || 1
  if (sc !== 1 || short !== 1) body.scale = { x: sc, y: sc, z: sc * short }
  // the look rides along: on a scripted body it is drawn by weapon-geo.js in the same frame; on a mesh it is a few plain
  // primitives laid along the mesh's own measured shaft (scripts/lib/weapon-prof.js), so it hugs the real model
  if (look && !m) body.children = [{ primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind: base, look } }, castShadow: false }]
  else if (look && m) { const ch = meshLook(base, look, m[1]); if (ch.length) body.children = ch }
  return body
}
