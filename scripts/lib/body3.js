// A body's weapon work as others (and the third-person camera) see it: players and NPCs alike, human or furry.
// Shelly's clips by family (scripts/lib/data/combat-anims.yml) play on anim channels with an upper-body mask so the legs keep the gait;
// IK reach seats the hands only where no clip can: a long gun's stock at the shoulder and the left hand on its foregrip. The first-person arm is scripts/lib/vmpose.js.
import { animate } from 'builtin/tween'
import W, { baseOf } from './weapons.js'
import CA from './data/combat-anims.yml'
import { firstPersonGun } from './fp-gun.js'
import { HOLD } from './weapon-look.js'

const RAD = Math.PI / 180
const FAM = {}
for (const [f, ks] of Object.entries(CA.families ?? {})) for (const k of ks) FAM[k] = f
// which family a weapon plays: the table first, then what the weapon is (ranged two-handed = long gun)
// a long gun's mesh runs along its own +Z; turned pitch -90 it lies along the Mixamo hand's fingers, and sits back so the grip (not its middle) is in the palm
// a long gun in the RightHand bone's frame, turned 180 about its up for the KF rifle clips (checked on debug mannequins Nov 9): the inverse of the hand's world turn in the gun aim clip (T-pose rest), so the barrel runs along the body's facing; grip sits in the palm
// the shotgun mesh's barrel runs -Z; the scripted long guns (weapon-geo.js) run +Z with the grip 0.14 up the bore: they turn 180 about their up and slide back so the grip, not the butt, sits in the fist (checked on debug mannequins Nov 9)
// Nov 13: every other long gun takes its turn from its first-person fit (scripts/lib/fp-gun.js), which already knows which way its mesh runs
// and how far it is tilted: the scripted guns turn 180 there (barrel +Z) and get the rifle turn as is; the Tripo coach gun, hunting rifle and
// laser rifle run -Z like the shotgun (they were held stock-first) and the hunting and laser rifles' barrels rise in their files (-25, -17).
// hand turn = RIFLE_Q * yaw180^-1 * fp turn: for the shotgun this lands on its hand-tuned turn within 2 degrees, the check that the rule holds.
const RIFLE_Q = { x: 0.352, y: -0.433, z: -0.342, w: -0.756 }, RIFLE_AT = { x: -0.003, y: -0.072, z: -0.066 }
const SHOTGUN_Q = { x: -0.342, y: 0.756, z: -0.352, w: -0.433 }, SHOTGUN_AT = { x: -0.041, y: -0.056, z: -0.048 }
// where each Tripo long gun's grip lands in the palm (RightHand frame), fitted on preview renders of both body styles
// (the shotgun's spot moved by the difference of their first-person offsets, which were all fitted against the same fist)
const HELD_AT = { coach_gun: { x: 0.094, y: -0.118, z: -0.004 }, hunting_rifle: { x: 0.138, y: -0.256, z: -0.017 }, laser_rifle: { x: 0.08, y: 0.08, z: -0.033 } } // the ZR-7 then slid forward along itself (hand +y) so its pistol grip, not its middle, is in the palm
const qmul = (a, b) => ({ w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z, x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w })
const eulerQ = (yaw, pitch, roll) => { const h = Math.PI / 360, cy = Math.cos(yaw * h), sy = Math.sin(yaw * h), cp = Math.cos(pitch * h), sp = Math.sin(pitch * h), cr = Math.cos(roll * h), sr = Math.sin(roll * h); return { x: cy * sp * cr + sy * cp * sr, y: sy * cp * cr - cy * sp * sr, z: cy * cp * sr - sy * sp * cr, w: cy * cp * cr + sy * sp * sr } }
const UNYAW = { x: 0, y: -1, z: 0, w: 0 } // yaw 180 undone
const r4 = (q) => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4), z: +q.z.toFixed(4), w: +q.w.toFixed(4) })
// a one-handed gun on the critters' hand needs no turn; the human rig's RightHand stands it barrel-up (seen live Nov 13, revolver and pistols alike),
// so there it turns pitch 90 and rolls over, and its grip sinks into the palm (fitted on preview renders)
const HUMAN_PISTOL_Q = { pitch: 90, roll: 180 }
// melee pieces whose file runs head-first along the critter hand's grip axis: in the fist they swung handle-out, the blade or head by the knuckles
// (the scripted blades and the Tripo hatchet and fire axe; checked at each family's contact frame on the cat, Nov 13). Turned end for end, grip back in the palm.
const HAND_FLIP = new Set(['carbine']) // Shelly Nov 13: the carbine sat backwards in the paw at hipfire, right in the sights
const MELEE_FLIP = new Set(['machete', 'katana', 'sword', 'shiv', 'switchblade', 'hatchet', 'pickaxe'])
// the hatchet and pickaxe files have their origin up by the head: turned and slid down the handle so the fist closes on its end and the head leads the swing (both cats, carry and contact frames).
// the fire axe is left as it was: its file is built off-centre (head at the origin, handle off to one side) and no turn seats it; it needs its own fit
const MELEE_AT = { hatchet: -0.4, pickaxe: -0.4 }
export function heldRot(kind, human = false) {
  if (!human && !W[kind]?.ranged && MELEE_FLIP.has(baseOf(kind ?? ''))) return { rotation: { yaw: 180 }, feetPosition: { x: 0, y: 0, z: MELEE_AT[baseOf(kind)] ?? HOLD[baseOf(kind)] ?? 0 } }
  if (famOf(kind) !== 'long') return human && W[kind]?.ranged ? { rotation: HUMAN_PISTOL_Q, feetPosition: { x: 0, y: 0.02, z: 0.04 } } : {}
  const base = baseOf(kind ?? ''), fp = firstPersonGun(base, W[kind]?.look)
  if (base === 'shotgun') return { rotation: SHOTGUN_Q, feetPosition: SHOTGUN_AT }
  if (HAND_FLIP.has(base)) return { rotation: r4(qmul(RIFLE_Q, UNYAW)), feetPosition: SHOTGUN_AT } // its mesh runs the other way in the paw than in the sights
  if (!fp || (fp.turn[0] === 180 && !fp.turn[1] && !fp.turn[2])) return { rotation: RIFLE_Q, feetPosition: RIFLE_AT }
  const minusZ = Math.abs(fp.turn[0]) < 90
  return { rotation: r4(qmul(qmul(RIFLE_Q, UNYAW), eulerQ(...fp.turn))), feetPosition: HELD_AT[base] ?? (minusZ ? SHOTGUN_AT : RIFLE_AT) }
}
export function famOf(kind) {
  const base = baseOf(kind ?? 'fists'), wp = W[kind] ?? W[base] ?? {}
  if (FAM[base]) return FAM[base]
  if (wp.ranged) return wp.two ? 'long' : 'pistol'
  if (base === 'fishing_rod') return 'cast'
  return 'club'
}
const HEAD_LEVEL = { duration: 1, tracks: { Neck: { pitch: [0, 0] }, Head: { pitch: [0, 0] } } } // rest pose: eyes ahead
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
// a stagger take on a hit: one of the pack's 18 at random (Shelly Nov 10 'implement staggering')
export function stagger3(ctx, me) { const L = CA.common.stagger; if (!L?.length) return 0; const row = L[Math.floor(ctx.random() * L.length)]; return play(me, ALT(me, 'hit0', 'hit1'), row, { now: ctx.now() }) }
// a common take by name (hit, knockdown, getup, throw, block)
export function react3(ctx, me, what) { return play(me, what === 'hit' ? 'hit' : 'react', CA.common[what], { now: ctx.now() }) }

// the gun's aim channel and its pitch pose: mode ready | aim | aimWalk | aimJog | aimCrouch | aimCrouchWalk | null; pitch radians, up positive.
// Written only when the mode or the 6-degree pitch step changes, so a held aim costs no traffic.
export function aimPose(me, fam, mode, pitch = 0) {
  const ss = me.session, G = CA.gun[fam]
  if (ss.aim3 === undefined) ss.aim3 = me.anim.aim ? '?' : null; ss.headUp3 ??= !!me.anim.headUp // a reload empties the session but keeps the channels: a left-over aim or head hold is cleared, never stuck over the gait
  const key = mode && G ? fam + mode : null
  if (ss.aim3 !== key) { ss.aim3 = key; me.anim.aim = key ? { ...chan(G[mode] ?? G.aim) } : null; ss.aimP3 = null }
  const step = !key ? 0 : mode === 'ready' ? (G.readyPitch ?? 0) : Math.round(pitch / RAD / 6) * 6 // ready: the aim hold dipped low (readyPitch), so the gun stays seated in both hands
  // Shelly Nov 13: "hipfire makes my character's head face down": the low-ready dip bends the whole upper body, head too; hold neck and head at rest over it
  const hold = key && mode === 'ready'
  if (!!ss.headUp3 !== !!hold) { ss.headUp3 = !!hold; me.anim.headUp = hold ? { clip: HEAD_LEVEL, weight: 60, loop: 'loop', blend: 'override', blendIn: 0.2, blendOut: 0.2 } : null }
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
const chan = (r) => ({ clip: r.clip, weight: r.weight ?? 4, loop: r.loop || r.freeze ? 'loop' : 'once', speed: r.freeze ? 0.00001 : r.speed ?? 1, ...(r.time != null ? { time: r.time } : {}), mask: MASK[r.mask ?? 'upper'], blendIn: r.blendIn ?? 0.15, blendOut: r.blendOut ?? 0.3 }) // freeze: one frame of the take held (a carry pose)
// a melee weapon out: carried across the body between swings (the family's ready row); off while a swing plays so the take reads at full strength,
// and off for fists, a holstered weapon, a seat, a fall, a talk or a menu
function meleeReady(me, s, now) {
  carry3(me, s.equipped, !s.sheathed && !s.sit && !isDown(s, now) && !s.mj?.seats && !s.os && !s.talkWith && !s.building && now - (s.swingAt ?? 0) > 1000)
}
// the carry channel for any body (players above; armed NPCs in scripts/meg-agent.js): written only when it changes
export function carry3(me, kind, on) {
  const ss = me.session, fam = famOf(kind), R = CA.melee?.[fam]?.ready, key = on && R ? fam : null
  if (ss.ready3 === undefined) ss.ready3 = me.anim.ready ? '?' : null
  if (ss.ready3 !== key) { ss.ready3 = key; me.anim.ready = key ? chan(R) : null }
}
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
const pitchOf = (cam) => { if (cam && typeof cam.w === 'number' && cam.pitch == null) return Math.asin(Math.max(-1, Math.min(1, 2 * (cam.w * cam.x - cam.y * cam.z)))); let p = cam?.pitch ?? 0; if (Math.abs(p) > 1.6) p *= RAD; return p }
// the camera's look reads as a quaternion (x, y, z, w) on the live engine, not { yaw, pitch }: its yaw in degrees either way (cam.yaw alone read 0, so a third-person aim never turned with the look)
const camYaw = (cam) => { if (!cam) return 0; if (typeof cam.yaw === 'number') return cam.yaw; if (typeof cam.w === 'number') return Math.atan2(2 * (cam.w * cam.y + cam.x * cam.z), 1 - 2 * (cam.x * cam.x + cam.y * cam.y)) / RAD; return 0 }
// down: the 3.2 s a fall takes (the death camera's window). downAt is a stamp that is never cleared, so a plain truthy test held every gun pose off for good after a first death
const isDown = (s, now) => !!s.downAt && now - s.downAt < 3200
// the player's hands each tick (scripts/critter.js merges the bones it returns): aim/ready clips for guns, IK only for a long gun's grip, the rows and the rod.
// `aiming` also tells the body to face the camera.
export function stance(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now()
  tick3(me, now)
  { const w0 = W[s.equipped ?? 'fists']; if ((!w0 || w0.ranged || s.rowHands || s.fishingState) && me.session.ready3) { me.session.ready3 = null; me.anim.ready = null } } // the melee carry ends with the melee weapon
  // rowing the dory (scripts/l7-dory.js writes where the oar handles are): both hands on the handles, whatever is equipped
  if (s.rowHands && now - s.rowHands.at < 500 && s.sit) {
    aimPose(me, null, null)
    const h = s.rowHands, pt = (a) => ({ x: a[0], y: a[1], z: a[2] })
    return { bones: { RightHand: { reach: { to: pt(h.r), blendIn: 0.1, blendOut: 0.3 } }, LeftHand: { reach: { to: pt(h.l), blendIn: 0.1, blendOut: 0.3 } } }, aiming: false }
  }
  // active fishing stance: both hands holding the rod elevated over water, facing the cast
  if (s.fishingState && !s.sheathed && !s.sit && !isDown(s, now)) {
    aimPose(me, null, null)
    const cam = me.camera?.rotation ?? null, yaw = camYaw(cam) * RAD
    const f = { x: -Math.sin(yaw), z: -Math.cos(yaw) }, r = { x: Math.cos(yaw), z: -Math.sin(yaw) }, p = me.feetPosition, y0 = p.y + (s.crouch ? 1.0 : 1.4)
    const isBite = s.fishingState.phase === 'bite', isReel = s.fishingState.phase === 'reeling'
    const pc = isBite ? -0.32 : isReel ? 0.38 : 0.18, c = Math.cos(pc), sn = Math.sin(pc)
    const at = (fwd, side, up) => ({ x: p.x + f.x * c * fwd + r.x * side, y: y0 + sn * fwd + up, z: p.z + f.z * c * fwd + r.z * side })
    return { bones: { RightHand: { reach: { to: at(0.48, 0.12, isBite ? -0.1 : 0.04), blendIn: 0.12, blendOut: 0.25 } }, LeftHand: { reach: { to: at(0.68, 0.05, isBite ? -0.06 : 0.18), blendIn: 0.12, blendOut: 0.25 } } }, aiming: true }
  }
  const wp = W[s.equipped ?? 'fists'], ss = me.session
  // a reload plays Gunplay's handling once per reload
  if (s.reloading && wp?.ranged) { if (!ss.rel3) { ss.rel3 = true; handle3(ctx, me, 'reload', s.equipped) } } else ss.rel3 = false
  if (!wp?.ranged || s.sheathed || s.sit || isDown(s, now) || s.mj?.seats) { aimPose(me, null, null); if (wp && !wp.ranged) meleeReady(me, s, now); return null }
  if (s.os || s.talkWith || s.building) { aimPose(me, famOf(s.equipped), 'ready', 0); return { bones: null, aiming: false } } // in a talk, a menu or build mode the gun stays at low ready: with no clip at all it hung from a slack hand, muzzle at the floor (Shelly's screenshot at the camp)
  const cam = me.camera?.rotation ?? null; if (!cam) return null
  const aiming = !s.reloading && (!!s.ads || now - (s.swingAt ?? 0) < 1400)
  // resting hands ride the BODY's facing; only an aimed gun follows the camera (Shelly: arms moving with the camera)
  const fam = famOf(s.equipped), yaw = aiming ? camYaw(cam) * RAD : bodyYaw(me)
  let pitch = aiming ? pitchOf(cam) : 0
  if (aiming && s.tp && s.aimPt) { const e = me.feetPosition, dy = s.aimPt.y - (e.y + (s.crouch ? 1.0 : 1.45)), hh = Math.hypot(s.aimPt.x - e.x, s.aimPt.z - e.z); if (hh > 1.2) pitch = Math.atan2(dy, hh) } // third person: the camera looks down on you from behind, so its pitch folded the body forward; aim at the crosshair's point instead
  pitch = Math.max(-0.7, Math.min(0.7, pitch)) // and never past 40 degrees, whatever the camera does
  aimPose(me, fam, s.reloading ? 'ready' : aimMode(me, aiming, s.crouch), pitch)
  // the clips pose the arms; on our own bodies a long gun's left hand also closes on the gun itself (it rides the gun, never a world point, so it can't flop). Shelly Nov 11: her plymodel held the gun right, the basic bodies' left arm hung off it
  const worn = !!(s.look?.modelUrl || s.look?.model), gun = me.session?.heldObj
  if (fam === 'long' && gun && ctx.getObject(gun)) /* Nov 15 revamp: worn bodies too; on the ash rifle carry the plymodel's support paw floated off the gun (seen on Shelly's screen) */ return { bones: { LeftHand: { reach: { object: gun, offset: { x: 0, y: -0.04, z: 0.43 }, blendIn: 0.18, blendOut: 0.25 } } }, aiming, armed: true }
  return { bones: null, aiming, armed: true }
}
