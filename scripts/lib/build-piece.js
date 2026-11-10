// One built piece's spec, shared by B-mode (scripts/build.js) and the home rebuild (places/home11/sim.js),
// so a wall you put up in your house comes back the same when the house is rebuilt for you.
// `at` is the SLOT: the snapped centre and turn the builder chose. A door hangs off its slot at the hinge.
import B from './data/breakables.yml'
import F from './data/furniture.yml'
// a buildable kind's row: a scrap piece, or furn_<key> = a piece of mall furniture (scripts/lib/data/furniture.yml), paid from player.state.furn
export function pieceOf(kind) {
  if (B.pieces[kind]) return B.pieces[kind]
  if (typeof kind === 'string' && kind.startsWith('furn_')) { const f = F.pieces?.[kind.slice(5)]; if (f) return { name: f.name, mat: 'wood', hp: 150, size: f.size ?? [1, 1, 1], snap: 'free', furn: kind.slice(5), model: f.model, forward: f.forward, cost: {} } }
  return null
}
export function tabsFor(s) { const own = furnOrder().filter((k) => (s.furn?.[k] ?? 0) > 0).map((k) => 'furn_' + k); return own.length ? [...B.tabs, { name: 'Furniture', pieces: own }] : B.tabs }
export const furnOrder = () => F.order ?? Object.keys(F.pieces ?? {})
const TV_AT = { x: 0, y: 0.78, z: -0.01, w: 0.66, h: 0.48 } // the tube's face on the crt_tv model: centre x, height share, inset from the front, size (m)
export function furnModel(pc) { const [w, h, d] = pc.size; return { model: { id: pc.model, ...(pc.forward ? { forward: pc.forward } : {}) }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } } } }
const rad = (d) => d * Math.PI / 180
export function hingeOf(at) { const r = rad(at.rot ?? 0); return { x: at.x - 0.5 * Math.cos(r), y: at.y, z: at.z + 0.5 * Math.sin(r) } } // the leaf's left edge on the wall line
// a built door's leaf: scripts/door-geo.js, origin its bottom hinge corner (= hingeOf(slot)), running +x, opening toward -z (build-door.js swings +100)
export function doorPrim(kind) { return { kind: 'scripted', script: 'scripts/door-geo.js', params: { style: kind === 'door_metal' ? 'metal' : 'wood', part: 'leaf', w: 1.0, h: 2.1, hingeSide: 'left', swing: -1, dmg: 0 } } }
export function builtSpec(kind, at, by, opts = {}) {
  const pc = pieceOf(kind)
  if (!pc) return null
  const tags = ['breakable', 'built']
  if (pc.bench) tags.push('bench')
  if (pc.door) tags.push('door')
  if (pc.store) tags.push('container', 'storage')
  const slot = { x: at.x, y: at.y, z: at.z, rot: at.rot ?? 0 }
  const feet = pc.door ? hingeOf(slot) : { x: at.x, y: at.y, z: at.z }
  const state = { mat: pc.mat, hp: pc.hp, maxHp: pc.hp, name: pc.name, size: Math.max(...pc.size), by, byUser: opts.byUser ?? null, buildKind: kind, slot, stayGone: true, ...(pc.bench ? { station: pc.bench === true ? 'bench' : pc.bench } : {}) }
  if (pc.door) Object.assign(state, { open: false, c: { x: at.x, y: at.y + 1, z: at.z }, yaw0: slot.rot })
  if (pc.store) { state.items = ''; if (opts.id && opts.owner) { state.saveKey = 'hst_' + opts.id; state.items = opts.owner['hst_' + opts.id] ?? '' } }
  if (pc.trap) state.trap = pc.trap
  const spec = {
    tags, feetPosition: feet, rotation: { yaw: slot.rot },
    primitive: pc.door ? doorPrim(kind) : { kind: 'scripted', script: 'scripts/build-geo.js', params: { kind, dmg: 0 } },
    material: { pbr: true }, physics: { body: pc.door ? 'kinematic' : 'static', collider: pc.collider ?? (kind === 'ramp' ? 'mesh' : 'box') },
    state,
  }
  if (pc.furn) { delete spec.primitive; delete spec.material; Object.assign(spec, furnModel(pc)); spec.physics = { body: 'static', collider: 'box' }; spec.tags.push('furniture') }
  if (pc.furn === 'crt_tv') { // a working set: same channels as the green house (scripts/built-tv.js)
    spec.behavior = 'scripts/built-tv.js'; spec.tags.push('usable'); Object.assign(state, { kind: 'tv', verb: 'Turn on' })
    const [, h, d] = pc.size
    spec.children = [
      { id: 'screen', visible: false, feetPosition: { x: TV_AT.x, y: h * TV_AT.y, z: -d / 2 + TV_AT.z }, rotation: { yaw: 180 }, primitive: { kind: 'plane', width: TV_AT.w, height: TV_AT.h }, material: { emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.2 }, castShadow: false },
      { id: 'sound', feetPosition: { x: 0, y: h * 0.75, z: -d / 2 } },
      { id: 'glow', feetPosition: { x: 0, y: h * 0.75, z: -d / 2 - 0.4 }, light: { kind: 'point', color: 'oklch(0.8 0.06 240)', intensity: 0, distance: 4 } },
    ]
  }
  if (pc.door) spec.behavior = 'scripts/build-door.js'
  if (pc.trap) { spec.physics = { body: 'static', collider: 'box', trigger: true }; spec.behavior = 'scripts/build-spikes.js' }
  if (pc.light) spec.children = [{ feetPosition: { x: 0, y: 1.55, z: 0 }, light: { kind: 'point', color: 'oklch(0.9 0.08 80)', intensity: 2.2, distance: 11 } }]
  return spec
}
