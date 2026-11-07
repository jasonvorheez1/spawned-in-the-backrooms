// A first-person camera on the declared `look` contract (templates/camera.js#camera:
// orientation.source "look"): the engine integrates the mouse at display rate with the rig's
// sensitivity / minPitch / maxPitch and owns the presented facing: read it back as ctx.self.view.
// The rig owns the EYE: every tick the camera sits at your eyes (at the body's drawn height), on a seat
// too, and faces where the view looks, so the camera's own row stays honest for everything that
// reads it (the audio listener, god-mode entry at the play camera). Numbers live in
// lib/data/camera.yml.
// Hiding your own body is THIS rig's decision (ctx.self.hideLocalPlayer: the rig's layer, which
// dies with the rig), never a flag on the camera def: a rewrite to an orbit rig shows the body again
// with nothing to un-set.
import CAMERA from './lib/data/camera.yml'
import W from './lib/weapons.js'
import { poseViewmodel } from './lib/vmpose.js'
import { raycast } from 'builtin/physics'

const RAD_TO_DEG = 180 / Math.PI
// The body the eye height is for: camera.yml's eyeHeight is the eye on a body drawn 1.8 m tall.
const BODY_HEIGHT = 1.8

export function finiteNumber(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback
}

// Seated on the ride: your body hangs under it, on the ride itself or on one of its parts.
function seatedOn(player, ride) {
  for (let p = player?.parent; p; p = p.parent) if (p.id === ride.id) return true
  return false
}

export function update(ctx, dt) {
  // The eye sits inside the body, so the body is not drawn for its owner (everyone else still sees it).
  ctx.self.hideLocalPlayer = true

  // Aiming down sights eases the field of view in (player.state.ads is written by scripts/player.js).
  const ps = ctx.player?.state, sess = (ctx.self.session.cam ??= { t: 0 })
  const goal = ps?.ads ? 1 : 0
  sess.t += (goal - sess.t) * (1 - Math.exp(-finiteNumber(CAMERA.adsSpeed, 12) * dt))
  if (Math.abs(goal - sess.t) < 0.002) sess.t = goal
  const fov0 = finiteNumber(CAMERA.fov, 60), fovAds = finiteNumber(W[ps?.equipped]?.fovAds, finiteNumber(CAMERA.fovAdsDefault, 50))
  ctx.self.fov = fov0 + (fovAds - fov0) * sess.t

  // The arm and weapon you hold are moved here, once per display frame, so they never step with the game tick.
  poseViewmodel(ctx, dt)

  const target = ctx.self.target
  if (!target) return

  // While you drive, the target is the ride (a kart, a horse, a ship). Seated on it, the eye is your
  // own on the seat: the ride's feet sit under the whole ride, so an eye there is inside anything
  // taller than you.
  const seated = seatedOn(ctx.player, target) ? ctx.player : null
  const body = seated ?? target
  // Your body's height as drawn, along its own up (its model's own size, its fit and every parent's
  // scale), so a ride that rolls does not move the eye. A playing clip never changes this height: the box
  // is the model's own, so a walk poses the model and leaves the box and the eye where they are. A thing
  // you drive and do not sit on keeps its scale.
  const height = body.id === ctx.player?.id ? 2 * body.bounds?.obb.halfExtents.y : undefined
  const eyeHeight = finiteNumber(CAMERA.eyeHeight, 1.6) * (height > 0 ? height / BODY_HEIGHT : finiteNumber(body.effectiveScale?.y, 1))
  const sat = body.id === ctx.player?.id && body.state?.sit && body.state.sit.phase !== 'up'
  const crouchWant = sat ? 0.7 : !seated && body.id === ctx.player?.id && body.state?.crouch ? 0.62 : 1
  const ck = (ctx.self.session.crouchK ??= 1), crouchK = ck + (crouchWant - ck) * Math.min(1, dt * (sat || ck < 0.69 ? 4.5 : 10))
  ctx.self.session.crouchK = crouchK
  const pos = seated ? seated.worldFeetPosition : target.feetPosition
  ctx.self.feetPosition = { x: pos.x, y: pos.y + eyeHeight * crouchK, z: pos.z }

  // The presented facing (radians) as the one rotation grammar (degrees): undefined before the first frame.
  const view = ctx.self.view
  let rot = view ? { yaw: view.yaw * RAD_TO_DEG, pitch: view.pitch * RAD_TO_DEG } : null

  // At a computer: you sit, and the eye glides in until the monitor fills the view (Back OS draws over it).
  const os = ps?.os, comp = os?.id ? ctx.getObject(os.id) : null, dv = ctx.self.session.dive ??= { k: 0 }
  dv.k += ((comp ? 1 : 0) - dv.k) * Math.min(1, dt * (comp ? 2.2 : 2.6))
  if (comp) dv.c = { ...comp.feetPosition }
  if (dv.k > 0.002 && dv.c) {
    const c = dv.c, e = ctx.self.feetPosition
    const scr = { x: c.x, y: c.y + 0.28, z: c.z } // the monitor's face, her pick
    const hx = e.x - scr.x, hz = e.z - scr.z, hl = Math.hypot(hx, hz) || 1
    const sitEye = { x: pos.x, y: pos.y + 1.15, z: pos.z } // a seated eye
    const near = { x: scr.x + (hx / hl) * 0.42, y: scr.y + 0.02, z: scr.z + (hz / hl) * 0.42 }
    const k = dv.k * dv.k * (3 - 2 * dv.k), k1 = Math.min(1, k * 2), k2 = Math.max(0, k * 2 - 1)
    const mid = { x: e.x + (sitEye.x - e.x) * k1, y: e.y + (sitEye.y - e.y) * k1, z: e.z + (sitEye.z - e.z) * k1 }
    const eye = { x: mid.x + (near.x - mid.x) * k2, y: mid.y + (near.y - mid.y) * k2, z: mid.z + (near.z - mid.z) * k2 }
    ctx.self.feetPosition = eye
    const dx = scr.x - eye.x, dy = scr.y - eye.y, dz = scr.z - eye.z
    const want = { yaw: Math.atan2(-dx, -dz) * RAD_TO_DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * RAD_TO_DEG }
    if (!rot) rot = want
    else { let dyaw = ((want.yaw - rot.yaw + 540) % 360) - 180; rot = { yaw: rot.yaw + dyaw * k, pitch: rot.pitch + (want.pitch - rot.pitch) * k } }
  } else if (!comp) dv.c = null
  // in conversation: the view narrows and turns onto their face, Bethesda-style; leaving, or a fight closing the talk (scripts/talk.js), eases it back
  const tw = ps?.talkWith && !ps?.shopOpen && !ps?.downAt ? (ctx.place?.objects?.[ps.talkWith] ?? null) : null, tz = ctx.self.session.talkCam ??= { k: 0 }
  tz.k += ((tw && !tw.state?.dead ? 1 : 0) - tz.k) * Math.min(1, dt * (tw ? 3 : 7))
  if (tw) { const b = tw.bounds; tz.c = b ? { x: b.center.x, y: b.max.y - (b.size.y * 0.18), z: b.center.z } : { ...tw.feetPosition, y: tw.feetPosition.y + 1.3 } }
  if (tz.k > 0.002 && tz.c) {
    const k = tz.k * tz.k * (3 - 2 * tz.k), e = ctx.self.feetPosition, c = tz.c
    ctx.self.fov = ctx.self.fov + (38 - ctx.self.fov) * k // her pick: 60 → 38
    const dx = c.x - e.x, dy = c.y - e.y, dz = c.z - e.z
    const want = { yaw: Math.atan2(-dx, -dz) * RAD_TO_DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * RAD_TO_DEG }
    if (!rot) rot = want
    else { const dyaw = ((want.yaw - rot.yaw + 540) % 360) - 180; rot = { yaw: rot.yaw + dyaw * k, pitch: rot.pitch + (want.pitch - rot.pitch) * k } }
  } else if (!tw) tz.c = null
  // taken: the eye leaves your head and pulls back and up, circling slowly over the body as it falls (DOWN_MS in player.js)
  const down = ps?.downAt ? ctx.now() - ps.downAt : 1e9
  if (down < 3200 && ctx.player?.feetPosition) {
    ctx.self.hideLocalPlayer = false
    const b = ctx.player.bounds?.center ?? { ...ctx.player.feetPosition, y: ctx.player.feetPosition.y + 0.5 }
    const dc = ctx.self.session.deathCam ??= { at: ps.downAt, yaw: (rot?.yaw ?? 0) * Math.PI / 180 }
    if (dc.at !== ps.downAt) { dc.at = ps.downAt; dc.yaw = (rot?.yaw ?? 0) * Math.PI / 180 }
    const t = Math.min(1, down / 1400), e = 1 - Math.pow(1 - t, 3), a = dc.yaw + down / 1000 * 0.35
    const r = 1.2 + e * 3.2, h = 0.6 + e * 2.4
    const eye = { x: b.x + Math.sin(a) * r, y: b.y + h, z: b.z + Math.cos(a) * r }
    ctx.self.feetPosition = eye
    const dx = b.x - eye.x, dy = b.y - eye.y, dz = b.z - eye.z
    rot = { yaw: Math.atan2(-dx, -dz) * RAD_TO_DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * RAD_TO_DEG }
  } else if (ctx.self.session.deathCam) ctx.self.session.deathCam = null
  // sitting down / standing up: the eye leaves your head for a moment, swings out to the side and watches the body settle
  const st = ps?.sit, sc = ctx.self.session.sitCam ??= { k: 0 }
  const want3 = st && (st.phase === 'down' || st.phase === 'up' || (st.phase === 'sat' && ctx.now() - (st.satAt ?? 0) < 250)) ? 1 : 0
  sc.k += (want3 - sc.k) * Math.min(1, dt * (want3 ? 5 : 6))
  if (sc.k > 0.01 && ctx.player && down >= 3200) {
    ctx.self.hideLocalPlayer = sc.k < 0.35
    const wp = ctx.player.worldFeetPosition ?? ctx.player.feetPosition
    const b = { x: wp.x, y: wp.y + 0.9, z: wp.z }
    if (want3 && sc.yaw == null) sc.yaw = (rot?.yaw ?? 0) * Math.PI / 180
    const a = (sc.yaw ?? 0) + 0.9, k = sc.k * sc.k * (3 - 2 * sc.k)
    const out = { x: b.x + Math.sin(a) * 2.4, y: b.y + 0.9, z: b.z + Math.cos(a) * 2.4 }
    const e0 = ctx.self.feetPosition
    ctx.self.feetPosition = { x: e0.x + (out.x - e0.x) * k, y: e0.y + (out.y - e0.y) * k, z: e0.z + (out.z - e0.z) * k }
    const dx = b.x - out.x, dy = b.y - out.y, dz = b.z - out.z
    const look = { yaw: Math.atan2(-dx, -dz) * RAD_TO_DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * RAD_TO_DEG }
    if (rot) { const dyaw = ((look.yaw - rot.yaw + 540) % 360) - 180; rot = { yaw: rot.yaw + dyaw * k, pitch: rot.pitch + (look.pitch - rot.pitch) * k } } else rot = look
  } else if (!want3) sc.yaw = null
  // third person (middle mouse toggles it, scripts/view3.js): over the right shoulder. The distance and shoulder follow what you are doing (aiming tucks the eye in,
  // sprinting backs it off and widens the view, crouching lowers it); a thick ray sweeps from the shoulder so a wall or a low ceiling pushes the eye in without
  // clipping, and it eases back out slowly so it never pops. While it is out, the point under the crosshair is kept in player.state.aimPt so shots fly where it points.
  const tc = ctx.self.session.tpCam ??= { k: 0, d: 3.1, sh: 0.52, h: 1.6, sp: 0, at: 0 }, tpWant = ps?.tp && !ps?.sit && !ps?.talkWith && !comp && down >= 3200 && !ps?.mj?.seats ? 1 : 0
  tc.d ??= 3.1; tc.sh ??= 0.52; tc.h ??= 1.6; tc.sp ??= 0; tc.at ??= 0 // a session note from an older version of this script keeps working
  tc.k += (tpWant - tc.k) * Math.min(1, dt * 7)
  if (tc.k > 0.01 && ctx.player && rot) {
    ctx.self.hideLocalPlayer = tc.k < 0.3
    const v = ctx.player.velocity ?? { x: 0, z: 0 }, speed = Math.hypot(v.x, v.z), ads = !!ps?.ads, crouch = !!ps?.crouch, sprint = speed > 6.2 && !ads
    const wantD = ads ? 1.7 : sprint ? 3.7 : crouch ? 2.5 : 3.1, wantSh = ads ? 0.38 : sprint ? 0.3 : 0.52, wantH = crouch ? 1.15 : 1.6, ez = Math.min(1, dt * 6)
    tc.sh += (wantSh - tc.sh) * ez; tc.h += (wantH - tc.h) * ez; tc.sp += ((sprint ? 1 : 0) - tc.sp) * Math.min(1, dt * 4)
    const wp = ctx.player.worldFeetPosition ?? ctx.player.feetPosition, pivot = { x: wp.x, y: wp.y + tc.h, z: wp.z }
    const yw = rot.yaw * Math.PI / 180, pt = rot.pitch * Math.PI / 180
    const back = { x: Math.sin(yw) * Math.cos(pt), y: -Math.sin(pt), z: Math.cos(yw) * Math.cos(pt) }, right = { x: Math.cos(yw), z: -Math.sin(yw) }
    let sh = tc.sh; const hs = raycast(ctx, pivot, { x: right.x, y: 0, z: right.z }, { distance: sh + 0.25, radius: 0.12, physicsOnly: true, ignoreEntities: [ctx.player.id] }); if (hs) sh = Math.max(0, hs.distance - 0.25)
    const from = { x: pivot.x + right.x * sh, y: pivot.y + 0.1, z: pivot.z + right.z * sh }
    const hit = raycast(ctx, from, back, { distance: wantD + 0.3, radius: 0.22, physicsOnly: true, ignoreEntities: [ctx.player.id] })
    const free = hit ? Math.max(0.25, hit.distance - 0.3) : wantD
    tc.d = free < tc.d ? free : tc.d + (free - tc.d) * Math.min(1, dt * 2.5) // pushed in at once, eased back out
    const e0 = ctx.self.feetPosition, k = tc.k * tc.k * (3 - 2 * tc.k), dist = tc.d * tc.k
    const out = { x: from.x + back.x * dist, y: from.y + back.y * dist, z: from.z + back.z * dist }
    ctx.self.feetPosition = { x: e0.x + (out.x - e0.x) * k, y: e0.y + (out.y - e0.y) * k, z: e0.z + (out.z - e0.z) * k }
    ctx.self.fov = ctx.self.fov + 7 * tc.sp * tc.k // the view opens up when you run
    if (ps && ctx.now() - tc.at > 100) { // the crosshair's point in the world, ten times a second
      tc.at = ctx.now()
      const eye = ctx.self.feetPosition, fwd = { x: -back.x, y: -back.y, z: -back.z }, h = raycast(ctx, eye, fwd, { distance: 150, physicsOnly: true, ignoreEntities: [ctx.player.id] })
      const pt3 = h ? h.position : { x: eye.x + fwd.x * 150, y: eye.y + fwd.y * 150, z: eye.z + fwd.z * 150 }, o = ps.aimPt
      if (!o || Math.hypot(o.x - pt3.x, o.y - pt3.y, o.z - pt3.z) > 0.15) ps.aimPt = { x: Math.round(pt3.x * 100) / 100, y: Math.round(pt3.y * 100) / 100, z: Math.round(pt3.z * 100) / 100 }
    }
  } else if (ps?.aimPt) ps.aimPt = null
  if (rot) ctx.self.rotation = rot
}
