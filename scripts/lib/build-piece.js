// One built piece's spec, shared by B-mode (scripts/build.js) and the home rebuild (places/home11/sim.js),
// so a wall you put up in your house comes back the same when the house is rebuilt for you.
// `at` is the SLOT: the snapped centre and turn the builder chose. A door hangs off its slot at the hinge.
import B from './data/breakables.yml'
const rad = (d) => d * Math.PI / 180
export function hingeOf(at) { const r = rad(at.rot ?? 0); return { x: at.x - 0.5 * Math.cos(r), y: at.y, z: at.z + 0.5 * Math.sin(r) } } // the leaf's left edge on the wall line
export function builtSpec(kind, at, by, opts = {}) {
  const pc = B.pieces[kind]
  if (!pc) return null
  const tags = ['breakable', 'built']
  if (pc.bench) tags.push('bench')
  if (pc.door) tags.push('door')
  if (pc.store) tags.push('container', 'storage')
  const slot = { x: at.x, y: at.y, z: at.z, rot: at.rot ?? 0 }
  const feet = pc.door ? hingeOf(slot) : { x: at.x, y: at.y, z: at.z }
  const state = { mat: pc.mat, hp: pc.hp, maxHp: pc.hp, name: pc.name, size: Math.max(...pc.size), by, byUser: opts.byUser ?? null, buildKind: kind, slot, stayGone: true }
  if (pc.door) Object.assign(state, { open: false, c: { x: at.x, y: at.y + 1, z: at.z }, yaw0: slot.rot })
  if (pc.store) { state.items = ''; if (opts.id && opts.owner) { state.saveKey = 'hst_' + opts.id; state.items = opts.owner['hst_' + opts.id] ?? '' } }
  if (pc.trap) state.trap = pc.trap
  const spec = {
    tags, feetPosition: feet, rotation: { yaw: slot.rot },
    primitive: { kind: 'scripted', script: 'scripts/build-geo.js', params: { kind, dmg: 0 } },
    material: { pbr: true }, physics: { body: pc.door ? 'kinematic' : 'static', collider: pc.collider ?? (kind === 'ramp' ? 'mesh' : 'box') },
    state,
  }
  if (pc.door) spec.behavior = 'scripts/build-door.js'
  if (pc.trap) { spec.physics = { body: 'static', collider: 'box', trigger: true }; spec.behavior = 'scripts/build-spikes.js' }
  if (pc.light) spec.children = [{ feetPosition: { x: 0, y: 1.55, z: 0 }, light: { kind: 'point', color: 'oklch(0.9 0.08 80)', intensity: 2.2, distance: 11 } }]
  return spec
}
