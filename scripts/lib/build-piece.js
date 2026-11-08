// One built piece's spec, shared by B-mode (scripts/build.js) and the home rebuild (places/home11/sim.js),
// so a wall you put up in your house comes back the same when the house is rebuilt for you.
import B from './data/breakables.yml'
export function builtSpec(kind, at, by) {
  const pc = B.pieces[kind]
  if (!pc) return null
  return {
    tags: pc.bench ? ['breakable', 'built', 'bench'] : ['breakable', 'built'], feetPosition: { x: at.x, y: at.y, z: at.z }, rotation: { yaw: at.rot ?? 0 },
    primitive: { kind: 'scripted', script: 'scripts/build-geo.js', params: { kind, dmg: 0 } },
    material: { pbr: true }, physics: { body: 'static', collider: kind === 'ramp' ? 'mesh' : 'box' },
    state: { mat: pc.mat, hp: pc.hp, maxHp: pc.hp, name: pc.name, size: Math.max(...pc.size), by, buildKind: kind },
  }
}
