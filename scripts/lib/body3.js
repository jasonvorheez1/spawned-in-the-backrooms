// A body's weapon work as others (and the third-person camera) see it: players and NPCs alike, human or furry.
// Shelly's clips by family (scripts/lib/data/combat-anims.yml) play on anim channels with an upper-body mask so the legs keep the gait;
// IK reach seats the hands only where no clip can: a long gun's stock at the shoulder and the left hand on its foregrip. The first-person arm is scripts/lib/vmpose.js.
import { animate } from 'builtin/tween'
import W, { baseOf } from './weapons.js'
import CA from './data/combat-anims.yml'

const RAD = Math.PI / 180
const FAM = {}
for (const [f, ks] of Object.entries(CA.families ?? {})) for (const k of ks) FAM[k] = f
// which family a weapon plays: the table first, then what the weapon is (ranged two-handed = long gun)
// a long gun's mesh runs along its own +Z; turned pitch -90 it lies along the Mixamo hand's fingers, and sits back so the grip (not its middle) is in the palm
// a long gun in the RightHand bone's frame, turned 180 about its up for the KF rifle clips (checked on debug mannequins Nov 9): the inverse of the hand's world turn in the gun aim clip (T-pose rest), so the barrel runs along the body's facing; grip sits in the palm
export const heldRot = (kind) => famOf(kind) === 'long' ? { rotation: { x: -0.342, y: 0.756, z: -0.352, w: -0.433 }, feetPosition: { x: -0.041, y: -0.056, z: -0.048 } } : {}
export function famOf(kind) {
  const base = baseOf(kind ?? 'fists'), wp = W[kind] ?? W[base] ?? {}
  if (FAM[base]) return FAM[base]
  if (wp.ranged) return wp.two ? 'long' : 'pistol'
  if (base === 'fishing_rod') return 'cast'
  return 'club'
}
const MASK = { upper: { from: 'Spine' }, full: undefined }
// one table row onto one channel; returns the seconds until its blow lands
export function play(me, ch, row, o = {}) {
  if (!row?.clip) return 0
  const speed = (row.speed ?? 1) * (o.speed ?? 1)
  const lead = o.lead ?? CA.lead ?? 0.12
  const start = row.time ?? (row.hit != null ? Math.max(0, row.hit - lead * speed) : 0) // skip the wind-up so the blow lands `lead` after the click
  const loop = row.loop && !row.once ? 'loop' : 'once'
  me.anim[ch] = { clip: row.clip, weight: row.weight ?? 4, loop, speed, time: start, mask: MASK[row.mask ?? 'upper'], blendIn: row.blendIn ?? 0.1, blendOut: row.blendOut ?? 0.25, ...(row.clamp ? { clampWhenFinished: true } : {}) }
  if (row.cut || loop === 'once') { const ss = me.session; (ss.cut3 ??= {})[ch] = o.now + 1000 * (row.cut ?? Math.max(0.3, 2.6 - start) / speed) }
  return row.hit != null ? (row.hit - start) / speed : 0
}
// release channels whose take is over (a cut row, a once clip): call each tick from the body's owner
export function tick3(me, now) {
  const c = me.session.cut3; if (!c) return
  for (const ch in c) if (now >= c[ch]) { if (me.anim[ch]) me.anim[ch] = null; delete c[ch] }
}
const ALT = (me, a, b) => { const ss = me.session, ch = ss.alt3 === a ? b : a; ss.alt3 = ch; if (me.anim[ch === a ? b : a]) me.anim[ch === a ? b : a] = null; return ch } // a repeat of the same clip restarts on the other channel

// a melee swing or a punch, the moment it is thrown (scripts/player.js, scripts/meg-agent.js); combo walks the family's combo rows. Returns seconds to the blow.
export function swing3(ctx, kind, heavy, combo, me = ctx.self) {
  const fam = famOf(kind), now = ctx.now()
  if (fam === 'cast') { // the fishing cast stays a keyed throw: no clip in the packs casts a rod
    const sp = me.model ? 'bones.Spine02' : 'bones.Spine2'
    animate(ctx, me.id, { 'bones.RightArm.pitch': [0, -135, 25, -10, 0], 'bones.RightForeArm.pitch': [0, -75, -15, -30, 0], [`${sp}.pitch`]: [0, -12, 16, 4, 0] }, { duration: 0.65 })
    return 0.35
  }
  const M = CA.melee[fam] ?? CA.melee.club, rows = M.combo ?? []
  const row = heavy > 0.3 && M.heavy ? M.heavy : rows[(combo ?? 0) % Math.max(1, rows.length)]
  return play(me, ALT(me, 'melee0', 'melee1'), row, { now, speed: heavy > 0.3 ? 1 : 1 })
}
// the shot: the family's fire take once, and a short kick through the shoulders
export function fire3(ctx, me = ctx.self, kind) {
  const fam = famOf(kind ?? me.state.arm ?? me.state.equipped), G = CA.gun[fam] ?? CA.gun.pistol, now = ctx.now()
  const row = me.state.crouch ? G.fireCrouch ?? G.fire : G.fire
  play(me, ALT(me, 'fire0', 'fire1'), row, { now }) // the clip's own recoil only: no keyed kick over it (Shelly Nov 9: procedural poses look off)
}
// a reload or flourish take (Gunplay), once
export function handle3(ctx, me = ctx.self, what = 'reload', kind) {
  const G = CA.gun[famOf(kind ?? me.state.arm ?? me.state.equipped)] ?? CA.gun.pistol
  play(me, 'reload', G[what], { now: ctx.now() })
}
// a common take by name (hit, knockdown, getup, throw, block)
export function react3(ctx, me, what) { return play(me, what === 'hit' ? 'hit' : 'react', CA.common[what], { now: ctx.now() }) }

// the gun's aim channel and its pitch pose: mode ready | aim | aimWalk | aimJog | aimCrouch | aimCrouchWalk | null; pitch radians, up positive.
// Written only when the mode or the 6-degree pitch step changes, so a held aim costs no traffic.
export function aimPose(me, fam, mode, pitch = 0) {
  const ss = me.session, G = CA.gun[fam]
  const key = mode && G ? fam + mode : null
  if (ss.aim3 !== key) { ss.aim3 = key; me.anim.aim = key ? { ...chan(G[mode] ?? G.aim) } : null; ss.aimP3 = null }
  const step = !key ? 0 : mode === 'ready' ? (G.readyPitch ?? 0) : Math.round(pitch / RAD / 6) * 6 // ready: the aim hold dipped low (readyPitch), so the gun stays seated in both hands
  if (ss.aimP3 !== step) {
    ss.aimP3 = step
    if (!step) { if (me.anim.aimp) me.anim.aimp = null }
    else {
      const crouch = /Crouch/.test(mode), row = step > 0 ? (crouch ? G.upCrouch : G.up) : (crouch ? G.downCrouch : G.down)
      const k = Math.min(0.92, Math.abs(step) / 90), w = (G[mode]?.weight ?? 4) * k / (1 - k) // a lerp between the level aim and the 90-degree pose
      me.anim.aimp = { ...chan(row), weight: Math.min(40, w), blendIn: 0.12, blendOut: 0.2 }
    }
  }
}
const chan = (r) => ({ clip: r.clip, weight: r.weight ?? 4, loop: r.loop ? 'loop' : 'once', speed: r.speed ?? 1, mask: MASK[r.mask ?? 'upper'], blendIn: r.blendIn ?? 0.15, blendOut: r.blendOut ?? 0.3 })
export const aimMode = (me, aiming, crouch) => { const v = me.velocity ?? {}, sp = Math.hypot(v.x ?? 0, v.z ?? 0); return !aiming ? 'ready' : crouch ? (sp > 0.4 ? 'aimCrouchWalk' : 'aimCrouch') : sp > 3.2 ? 'aimJog' : sp > 0.4 ? 'aimWalk' : 'aim' }
// the long gun's hands: stock at the right shoulder along the look, left hand on the foregrip of the held body (or out along the barrel)
export function longHands(me, held, yaw, pitch, aiming, crouch, len = 0.62) {
  const f = { x: -Math.sin(yaw), z: -Math.cos(yaw) }, r = { x: Math.cos(yaw), z: -Math.sin(yaw) }, p = me.feetPosition, sc = me.scale?.y ?? 1, y0 = p.y + (crouch ? 1.0 : 1.38) * sc
  const pc = aiming ? pitch : -0.5, c = Math.cos(pc), sn = Math.sin(pc)
  const at = (fwd, side, up) => ({ x: p.x + f.x * c * fwd + r.x * side, y: y0 + sn * fwd + up, z: p.z + f.z * c * fwd + r.z * side })
  const R = aiming ? at(0.24, 0.14, -0.12) : at(0.26, 0.2, -0.32)
  const L = aiming ? at(0.3 + len, 0.0, -0.06) : at(0.26 + len * 0.8, 0.02, -0.32)
  const pole = { x: p.x - r.x * 0.6, y: y0 - 0.6, z: p.z - r.z * 0.6 }
  // the right hand holds the grip at the shoulder pocket; the left hand is solved onto the held gun's foregrip
  return { RightHand: { reach: { to: R, blendIn: 0.15, blendOut: 0.25 } }, LeftHand: { reach: held ? { object: held, offset: { x: 0, y: -0.04, z: len * 0.7 }, pole, blendIn: 0.18, blendOut: 0.25 } : { to: L, pole, blendIn: 0.18, blendOut: 0.25 } } }
}

const bodyYaw = (me) => { const q = me.rotation; if (typeof q === 'number') return q * RAD; if (q && q.w != null) return Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)); return (q?.yaw ?? 0) * RAD }
const pitchOf = (cam) => { let p = cam?.pitch ?? 0; if (Math.abs(p) > 1.6) p *= RAD; return p }
// the player's hands each tick (scripts/critter.js merges the bones it returns): aim/ready clips for guns, IK only for a long gun's grip, the rows and the rod.
// `aiming` also tells the body to face the camera.
export function stance(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now()
  tick3(me, now)
  // rowing the dory (scripts/l7-dory.js writes where the oar handles are): both hands on the handles, whatever is equipped
  if (s.rowHands && now - s.rowHands.at < 500 && s.sit) {
    aimPose(me, null, null)
    const h = s.rowHands, pt = (a) => ({ x: a[0], y: a[1], z: a[2] })
    return { bones: { RightHand: { reach: { to: pt(h.r), blendIn: 0.1, blendOut: 0.3 } }, LeftHand: { reach: { to: pt(h.l), blendIn: 0.1, blendOut: 0.3 } } }, aiming: false }
  }
  // active fishing stance: both hands holding the rod elevated over water, facing the cast
  if (s.fishingState && !s.sheathed && !s.sit && !s.downAt) {
    aimPose(me, null, null)
    const cam = me.camera?.rotation ?? null, yaw = (cam?.yaw ?? 0) * RAD
    const f = { x: -Math.sin(yaw), z: -Math.cos(yaw) }, r = { x: Math.cos(yaw), z: -Math.sin(yaw) }, p = me.feetPosition, y0 = p.y + (s.crouch ? 1.0 : 1.4)
    const isBite = s.fishingState.phase === 'bite', isReel = s.fishingState.phase === 'reeling'
    const pc = isBite ? -0.32 : isReel ? 0.38 : 0.18, c = Math.cos(pc), sn = Math.sin(pc)
    const at = (fwd, side, up) => ({ x: p.x + f.x * c * fwd + r.x * side, y: y0 + sn * fwd + up, z: p.z + f.z * c * fwd + r.z * side })
    return { bones: { RightHand: { reach: { to: at(0.48, 0.12, isBite ? -0.1 : 0.04), blendIn: 0.12, blendOut: 0.25 } }, LeftHand: { reach: { to: at(0.68, 0.05, isBite ? -0.06 : 0.18), blendIn: 0.12, blendOut: 0.25 } } }, aiming: true }
  }
  const wp = W[s.equipped ?? 'fists'], ss = me.session
  // a reload plays Gunplay's handling once per reload
  if (s.reloading && wp?.ranged) { if (!ss.rel3) { ss.rel3 = true; handle3(ctx, me, 'reload', s.equipped) } } else ss.rel3 = false
  if (!wp?.ranged || s.sheathed || s.sit || s.downAt || s.os || s.talkWith || s.mj?.seats || s.building) { aimPose(me, null, null); return null }
  const cam = me.camera?.rotation ?? null; if (!cam) return null
  const aiming = !s.reloading && (!!s.ads || now - (s.swingAt ?? 0) < 1400)
  // resting hands ride the BODY's facing; only an aimed gun follows the camera (Shelly: arms moving with the camera)
  const fam = famOf(s.equipped), yaw = aiming ? (cam.yaw ?? 0) * RAD : bodyYaw(me), pitch = aiming ? pitchOf(cam) : 0
  aimPose(me, fam, s.reloading ? 'ready' : aimMode(me, aiming, s.crouch), pitch)
  // no IK on the hands: the clips alone pose the arms (the reach solver chased world points and read as floppy, physics arms)
  return { bones: null, aiming }
}
