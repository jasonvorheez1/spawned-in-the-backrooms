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
  const crouchWant = !seated && body.id === ctx.player?.id && body.state?.crouch ? 0.62 : 1
  const ck = (ctx.self.session.crouchK ??= 1), crouchK = ck + (crouchWant - ck) * Math.min(1, dt * 10)
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
  if (rot) ctx.self.rotation = rot
}
