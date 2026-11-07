// The player's own body as others (and the third-person camera) see it: how it stands with a weapon in its hands, and the swing, the punch and the kick of a shot.
// The first-person arm is scripts/lib/vmpose.js; this is the same weapons seen from outside. IK reach points the hands (so no rig axis is guessed); the swings are bone tweens.
import { animate } from 'builtin/tween'
import W, { baseOf } from './weapons.js'

const RAD = Math.PI / 180
// how each weapon is swung (the same families as scripts/lib/vmpose.js): bone keys over the swing, seconds
const STYLE = { table_leg: 'club', pipe_scrap: 'club', crowbar: 'club', bat: 'club', rebar: 'club', wrench: 'club', stun_baton: 'club', golf_club: 'club', tire_iron: 'club', baton: 'club',
  hatchet: 'chop', cleaver: 'chop', fire_axe: 'heavy', sledgehammer: 'heavy', pickaxe: 'heavy', knife: 'stab', screwdriver: 'stab', lineman_machete: 'slash' }
const SWING = {
  club: { d: 0.5, arm: [0, -95, 40, 0], yaw: [0, -22, 28, 0], fore: [0, -40, 10, 0], spine: [0, 25, -20, 0] },
  slash: { d: 0.42, arm: [0, -70, 12, 0], yaw: [0, -55, 55, 0], fore: [0, -25, 10, 0], spine: [0, 35, -32, 0] },
  stab: { d: 0.32, arm: [0, -25, -70, 0], yaw: [0, -8, 6, 0], fore: [0, -85, 5, 0], spine: [0, 8, -6, 0] },
  chop: { d: 0.5, arm: [0, -115, 55, 0], yaw: [0, -10, 12, 0], fore: [0, -50, 15, 0], spine: [0, 12, -14, 0] },
  heavy: { d: 0.8, arm: [0, -160, 70, 0], yaw: [0, 0, 6, 0], fore: [0, -70, 20, 0], spine: [0, 10, -10, 0], pitch: [0, -14, 20, 0] },
}
const spineOf = (me) => (me.model ? 'bones.Spine02' : 'bones.Spine2')

// a melee swing or a punch, called the moment the blow is thrown (scripts/player.js); `combo` alternates the side
export function swing3(ctx, kind, heavy, combo) {
  const me = ctx.self, base = baseOf(kind), sp = spineOf(me)
  if (kind === 'fists') { // alternate hands; a power punch winds up further
    const hand = combo % 2 ? 'Left' : 'Right', k = 1 + 0.5 * heavy
    animate(ctx, me.id, { [`bones.${hand}Arm.pitch`]: [0, -30 * k, -75 * k, 0], [`bones.${hand}ForeArm.pitch`]: [0, -90, -5, 0], [`${sp}.yaw`]: [0, (hand === 'Left' ? -1 : 1) * 14, (hand === 'Left' ? 1 : -1) * 18, 0] }, { duration: 0.32 + 0.12 * heavy })
    return
  }
  const S = SWING[STYLE[base]] ?? SWING.club, side = combo % 2 ? -1 : 1, k = 1 + 0.35 * heavy
  const keys = { 'bones.RightArm.pitch': S.arm.map((v) => v * k), 'bones.RightArm.yaw': S.yaw.map((v) => v * side), 'bones.RightForeArm.pitch': S.fore, [`${sp}.yaw`]: S.spine.map((v) => v * side) }
  if (S.pitch) keys[`${sp}.pitch`] = S.pitch
  animate(ctx, me.id, keys, { duration: S.d * (1 + 0.45 * heavy) })
}
// the shot's kick through the shoulders
export function fire3(ctx) {
  const me = ctx.self
  animate(ctx, me.id, { [`${spineOf(me)}.pitch`]: [0, 6, 0], 'bones.RightArm.pitch': [0, 10, 0] }, { duration: 0.18 })
}

const pitchOf = (cam) => { let p = cam?.pitch ?? 0; if (Math.abs(p) > 1.6) p *= RAD; return p }
// what the hands do while the player is not mid-swing: a gun is aimed (both hands out along the look) or carried low and ready; null leaves the arms to the gait.
// returns bones for ctx.self.bones (scripts/critter.js merges them); `aiming` also tells the body to face the camera.
export function stance(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now()
  // rowing the dory (scripts/l7-dory.js writes where the oar handles are): both hands on the handles, whatever is equipped
  if (s.rowHands && now - s.rowHands.at < 500 && s.sit) {
    const h = s.rowHands, pt = (a) => ({ x: a[0], y: a[1], z: a[2] })
    return { bones: { RightHand: { reach: { to: pt(h.r), blendIn: 0.1, blendOut: 0.3 } }, LeftHand: { reach: { to: pt(h.l), blendIn: 0.1, blendOut: 0.3 } } }, aiming: false }
  }
  const wp = W[s.equipped ?? 'fists']
  if (!wp?.ranged || s.sheathed || s.sit || s.downAt || s.os || s.talkWith || s.mj?.seats || s.building || s.reloading) return null
  const cam = me.camera?.rotation ?? null; if (!cam) return null
  const yaw = (cam.yaw ?? 0) * RAD, pitch = pitchOf(cam)
  const aiming = !!s.ads || now - (s.swingAt ?? 0) < 1400
  const f = { x: -Math.sin(yaw), z: -Math.cos(yaw) }, r = { x: Math.cos(yaw), z: -Math.sin(yaw) }, p = me.feetPosition, y0 = p.y + (s.crouch ? 1.0 : 1.4)
  const pc = aiming ? pitch : -0.45, c = Math.cos(pc), sn = Math.sin(pc) // ready: muzzle down at about 25 degrees
  const at = (fwd, side, up) => ({ x: p.x + f.x * c * fwd + r.x * side, y: y0 + sn * fwd + up, z: p.z + f.z * c * fwd + r.z * side })
  const two = !!wp.two || baseOf(s.equipped) === 'pistol' || baseOf(s.equipped) === 'revolver'
  const b = { RightHand: { reach: { to: aiming ? at(0.62, 0.1, -0.06) : at(0.38, 0.16, -0.3), blendIn: 0.12, blendOut: 0.25 } } }
  if (two) b.LeftHand = { reach: { to: aiming ? at(wp.two ? 1.0 : 0.66, wp.two ? -0.04 : 0.02, -0.06) : at(wp.two ? 0.58 : 0.4, 0.0, -0.3), blendIn: 0.15, blendOut: 0.25 } }
  return { bones: b, aiming }
}
