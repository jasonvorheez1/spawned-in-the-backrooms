import { raycast } from 'builtin/physics'
import { humanBody, HUMAN, critterSpec, isNewCat } from './lib/critter-model.js'
// the cat's first-person arms: the same cut of her own cat body scripts/player.js holds weapons with (CAT_FPARM there); at = feet from the eye
const CAT_FPARM = { f: '/cdn/value.1a50c4f098271ae5981ef730799d0a2e9913570abeb76d1475ab61869585a26a.glb', m: '/cdn/value.0ac8ed9fa781f9f7a002a249ccb98c55be6cd8f29698bb508e008517c604cc25.glb' }
const CAT_AT = { f: { y: -0.36, z: 0.28 }, m: { y: -0.385, z: 0.28 } }
function vmSkin(hex) { const n = parseInt(String(hex ?? '#efcfb4').slice(1), 16), k = 0.72; return '#' + [16, 8, 0].map((b) => Math.round(((n >> b) & 255) * k).toString(16).padStart(2, '0')).join('') } // as scripts/player.js's viewmodel arm
// Ladder climbing, every level. A ladder is any object tagged "ladder" with state.ladder = { h, yaw, mat }:
// its feet at the foot of the rungs, yaw = the way a climber faces it (forward = into the ladder), h = rise to the top step-off.
// Walk into it holding W: you take hold. W climbs, S climbs down, Space lets go and drops you back. At the top, W steps you off onto
// the deck; at the bottom, S steps you off. From the top, walk back over the edge facing away and you take hold to climb down.
// Third person plays the climb clip at the pace you climb; first person hides the weapon and shows both your arms reaching rung over rung.
// Runs after scripts/swim.js and owns the body's velocity while it holds on.
const SPEED = 1.6, STAND = 0.36, RUNG = 0.32 // her picks: m/s up a ladder, how far out the chest hangs, rung spacing for sound and hands
const CLIP_UP = 'cdn/clip-climb-loop.glb', CLIP_DOWN = 'cdn/clip-climbing-down-wall-loop.glb'
const SND = {
  wood: '/cdn/moodboard-realistic-gritty/sfx-hand-and-boot-gripping-old-wooden-ladder-rung-creak.mp3',
  metal: '/cdn/moodboard-realistic-gritty/sfx-boot-stepping-on-steel-ladder-rung-hollow-clank.mp3',
}
const FP_ARM = { // first-person forearms cut from Shelly's human bodies (same meshes scripts/player.js holds weapons with)
  f: { R: '/cdn/value.2d938d9446aaeb01c15e41213e80f5a4d2c7e1507bc655714fb04eac001794fa.glb', L: '/cdn/value.7f8d66209a679e498e2b417b0accaf0b9ce819769be93f697762794ff5dc409b.glb' },
  m: { R: '/cdn/value.7217b9235387299104686cdd782ec11f1801444037bd8eceefe445e11001b020.glb', L: '/cdn/value.70fede1b834eff766531f0b51f4772832f8ac989f9f48cffe988120bba1970cb.glb' } }

const VAULT = 450 // ms: the pull-up from the top rung onto the deck
const fwd = (yaw) => { const r = (yaw * Math.PI) / 180; return { x: -Math.sin(r), z: -Math.cos(r) } }
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180
const mem = (ctx) => (ctx.self.session.climb ??= { z: 0, jump: false, on: null, scanAt: 0, near: [], travel: 0, ph: 0 })

export function onInput(ctx, input) {
  const m = mem(ctx)
  m.z = input.axes?.moveZ ?? 0
  if (input.pressed?.jump) m.jump = true
  if (input.pressed?.interact) m.use = true // E at the foot of a ladder takes hold too
}

function ladderOf(ctx, id) {
  const o = ctx.getObject(id), L = o?.state?.ladder
  if (!o || !L) return null
  const b = o.worldFeetPosition ?? o.feetPosition
  return { id, base: { x: b.x, y: b.y, z: b.z }, h: L.h ?? 3, yaw: L.yaw ?? 0, mat: L.mat ?? 'wood', top: L.top !== false, f: fwd(L.yaw ?? 0) }
}

export function update(ctx, dt) {
  if (ctx.self.isLocal === false) return
  const me = ctx.self, s = me.state, m = mem(ctx), p = me.feetPosition
  if (s.level == null || s.dead || (s.hp ?? 1) <= 0 || s.sit || s.menuOpen) { if (m.on) letGo(ctx, m); m.jump = false; return }
  const now = ctx.now()
  // the pull-up over the top: up first, then forward onto the deck, over VAULT ms, instead of a jump cut
  if (m.vault) {
    const v = m.vault, k = Math.min(1, (now - v.t0) / VAULT), up = Math.min(1, k * 1.8), fw = Math.max(0, (k - 0.35) / 0.65)
    const e = (x) => 1 - (1 - x) * (1 - x)
    me.feetPosition = { x: v.from.x + (v.to.x - v.from.x) * e(fw), y: v.from.y + (v.to.y - v.from.y) * e(up), z: v.from.z + (v.to.z - v.from.z) * e(fw) }
    me.velocity = { x: 0, y: 0, z: 0 }
    if (k >= 1) { m.vault = null; me.velocity = { x: v.f.x * 1.5, y: 0, z: v.f.z * 1.5 } }
    return
  }

  if (!m.on) {
    if (s.climbing) s.climbing = false // a climb cut by a reload or a crossing leaves no hold behind: hands and weapon come back
    if (now - m.scanAt > 300) { m.scanAt = now; m.near = ctx.query({ tags: ['ladder'], radius: 12, select: 'ids' }) }
    if (!m.near?.length) { m.jump = false; m.use = false; return }
    const look = me.camera?.rotation?.yaw ?? (typeof me.rotation === 'number' ? me.rotation : me.rotation?.yaw ?? 0)
    const vel = me.velocity ?? { x: 0, z: 0 }, spd = Math.hypot(vel.x, vel.z)
    for (const id of m.near) {
      const L = ladderOf(ctx, id); if (!L) continue
      const toward = spd > 0.5 ? (vel.x * L.f.x + vel.z * L.f.z) / spd : null // Shelly Nov 12 "i also cant climb still": the camera's yaw reads 180 off the ladder's yaw, so the way the body MOVES decides: into the rungs from below, back over the edge from the top
      const dx = p.x - L.base.x, dz = p.z - L.base.z, along = dx * L.f.x + dz * L.f.z, side = Math.abs(dx * L.f.z - dz * L.f.x), dy = p.y - L.base.y
      if (side > 0.9) continue
      // from below: in front of it, facing it, pushing forward
      // Shelly Nov 12 "ii still cant climb": facing and velocity tests refused real approaches; now W (or E) anywhere at the foot takes hold unless you're walking away from it
      if ((m.z > 0.3 || m.use) && along > -1.3 && along < 0.4 && dy > -1.4 && /* Shelly Nov 12: the fort ladder's foot sits ~0.7 m above the sand, so the ground under it read as 'below the ladder' */ dy < L.h - 0.4 && (toward == null || toward > -0.3)) { grab(ctx, m, L, Math.max(dy, 0.05)); break }
      // from the top: standing on the deck behind it, facing away, walking back over the edge
      if (L.top && along > -0.2 && along < 1.4 && dy > L.h - 0.4 && dy < L.h + 0.9 && (toward == null ? ((m.z > 0.3 && Math.abs(wrap(look - L.yaw - 180)) < 70) || (m.z < -0.3 && Math.abs(wrap(look - L.yaw)) < 70)) : (Math.abs(m.z) > 0.3 && toward < -0.4))) { grab(ctx, m, L, L.h - 1.05); break }
    }
    m.jump = false; m.use = false
    return
  }
  m.use = false

  const L = ladderOf(ctx, m.on)
  if (!L) { letGo(ctx, m); return }
  const dy = p.y - L.base.y
  if (m.jump) { // let go: push off backward
    m.jump = false; letGo(ctx, m)
    me.velocity = { x: -L.f.x * 2.2, y: 2.5, z: -L.f.z * 2.2 }
    return
  }
  const want = m.z // W is +1 here: up
  // stalled under a deck or rail while pushing up near the top counts as reaching it
  if (want > 0.3 && dy > L.h - 2.2) { if (p.y - (m.lastY ?? p.y) < 0.004) m.stall = (m.stall ?? 0) + dt; else m.stall = 0 } else m.stall = 0
  m.lastY = p.y
  if (want > 0.3 && L.top && (dy >= L.h - 0.9 || m.stall > 0.2)) { // over the top: step off onto the deck, found by ray
    let land = null
    for (const d of [0.9, 1.2, 1.6, 2.0]) {
      const o = { x: L.base.x + L.f.x * d, y: L.base.y + L.h + 2.5, z: L.base.z + L.f.z * d }
      const r = raycast(ctx, o, { x: 0, y: -1, z: 0 }, { distance: 5, physicsOnly: true, ignoreEntities: [me.id] })
      if (r && r.distance > 0.05 && r.position.y > L.base.y + L.h - 0.6) { land = { x: o.x, y: r.position.y + 0.05, z: o.z }; break }
    }
    land ??= { x: L.base.x + L.f.x * 0.9, y: L.base.y + L.h + 0.1, z: L.base.z + L.f.z * 0.9 }
    letGo(ctx, m); m.stall = 0
    m.vault = { from: { x: p.x, y: p.y, z: p.z }, to: land, f: L.f, t0: ctx.now() }
    sound(ctx, L, p, 0.5)
    return
  }
  if (want < -0.3 && (dy <= 0.04 || me.grounded)) { letGo(ctx, m); me.velocity = { x: -L.f.x * 1.2, y: 0, z: -L.f.z * 1.2 }; return }

  // hold on: the chest hangs STAND out from the rungs, the body faces in, up or down at the climb pace
  const tx = L.base.x - L.f.x * STAND, tz = L.base.z - L.f.z * STAND
  const vy = want > 0.3 ? SPEED : want < -0.3 ? -SPEED : 0
  me.velocity = { x: (tx - p.x) * 10, y: dy > L.h - 0.9 && vy > 0 ? 0 : vy, z: (tz - p.z) * 10 }
  me.rotation = { yaw: L.yaw }
  if (s.crouch) s.crouch = false

  // the pace: the clip and the hands advance with the height gained, so a stop is a stop
  const moved = Math.abs(vy) * dt
  m.ph = (m.ph + (vy >= 0 ? 1 : -1) * moved / (RUNG * 2) + 1) % 1
  m.travel += moved
  if (m.travel > RUNG) { m.travel = 0; sound(ctx, L, p, 0.32) }
  const dir = vy > 0 ? 1 : vy < 0 ? -1 : 0
  if (dir !== m.dir) {
    m.dir = dir
    me.anim.climb = { clip: dir < 0 ? CLIP_DOWN : CLIP_UP, loop: 'loop', weight: 5, speed: dir === 0 ? 0 : 1.15, blendIn: 0.15 }
  }
  hands(ctx, m, dir)
}

function grab(ctx, m, L, y) {
  const me = ctx.self, s = me.state
  m.on = L.id; m.dir = null; m.travel = 0; m.ph = 0
  s.climbing = true // scripts/player.js hides the weapon, scripts/humanoid-locomotion.js holds the air/landing clips
  me.feetPosition = { x: L.base.x - L.f.x * STAND, y: L.base.y + y, z: L.base.z - L.f.z * STAND }
  me.velocity = { x: 0, y: 0, z: 0 }
  sound(ctx, L, me.feetPosition, 0.5)
}

function letGo(ctx, m) {
  const me = ctx.self
  m.on = null; m.dir = null
  if (me.state.climbing) me.state.climbing = false
  me.anim.climb = null
  if (m.fp) { ctx.destroy(m.fp); m.fp = null; m.fpL = m.fpR = null }
}

function sound(ctx, L, p, volume) {
  ctx.emit('playSound', { clip: SND[L.mat] ?? SND.wood, position: { x: p.x, y: p.y + 1, z: p.z }, volume, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 14 })
}

// first person: both forearms in front of the eye, fists on the rungs, one reaching up while the other pulls down (riding the body, which faces the ladder, so looking around leaves the hands on the rungs; this machine only)
function hands(ctx, m, dir) {
  const me = ctx.self, s = me.state
  if (s.tp) { if (m.fp) { ctx.destroy(m.fp); m.fp = null } return }
  const sx = s.look?.sex === 'f' || s.look?.sex == null ? 'f' : 'm'
  const cat = !HUMAN && !s.look?.modelUrl && isNewCat(s.look ?? {})
  if (m.fp && m.fpCat !== cat) { ctx.destroy(m.fp); m.fp = null }
  if (!m.fp && cat) { // her own cat arms, one paw per copy, each reaching on its rung (Shelly: "i still use the human hands when i climb")
    let cs = null; try { cs = critterSpec(s.look ?? {}) } catch (e) {}
    const at = CAT_AT[sx], base = { model: { ...(cs?.model ?? {}), id: CAT_FPARM[sx] }, ...(cs?.scale ? { scale: cs.scale } : {}), castShadow: false, visibleInFirstPerson: true, audience: 'local' }
    m.fp = ctx.spawn({ parent: me.id, feetPosition: { x: 0, y: 1.6, z: -0.42 }, audience: 'local', scope: 'session', castShadow: false, visibleInFirstPerson: true,
      children: [
        { ...base, id: 'r', feetPosition: { x: 0, y: at.y, z: at.z }, bones: { 'mixamorig:LeftArm': { scale: 0 } } },
        { ...base, id: 'l', feetPosition: { x: 0, y: at.y, z: at.z }, bones: { 'mixamorig:RightArm': { scale: 0 } } },
      ] })
    m.fpR = m.fp + '/r'; m.fpL = m.fp + '/l'; m.fpCat = true; m.fpAt = at
  }
  if (!m.fp) {
    m.fpCat = false; m.fpAt = null
    let skinM = null; try { const hb = humanBody(s.look ?? {}); if (hb?.materials?.Body_Skin) skinM = { Body_Skin: { ...hb.materials.Body_Skin, color: vmSkin(hb.materials.Body_Skin.color), roughness: 0.78, metalness: 0, emissive: '#000000' } } } catch (e) {}
    const arm = skinM ? { id: FP_ARM[sx].R, materials: skinM } : FP_ARM[sx].R
    m.fp = ctx.spawn({ parent: me.id, feetPosition: { x: 0, y: 1.6, z: -0.42 }, audience: 'local', scope: 'session', castShadow: false, visibleInFirstPerson: true,
      children: [
        { id: 'r', feetPosition: { x: 0.2, y: -0.24, z: 0 }, rotation: { pitch: 15, yaw: 0, roll: 0 }, model: arm, castShadow: false, visibleInFirstPerson: true, audience: 'local' },
        { id: 'l', feetPosition: { x: -0.2, y: -0.24, z: 0 }, rotation: { pitch: 15, yaw: 0, roll: 0 }, scale: { x: -1, y: 1, z: 1 }, model: arm, castShadow: false, visibleInFirstPerson: true, audience: 'local' },
      ] })
    m.fpR = m.fp + '/r'; m.fpL = m.fp + '/l'
  }
  // a hand reaches up a rung while the other pulls down, swapping every rung; at rest both hold where they are
  const a = Math.sin(m.ph * Math.PI * 2), lift = 0.11
  const R = ctx.getObject(m.fpR), Lh = ctx.getObject(m.fpL)
  if (m.fpCat) { const at = m.fpAt
    if (R) R.feetPosition = { x: 0, y: at.y + a * lift, z: at.z - Math.max(0, a) * 0.04 }
    if (Lh) Lh.feetPosition = { x: 0, y: at.y - a * lift, z: at.z - Math.max(0, -a) * 0.04 }
    return }
  if (R) R.feetPosition = { x: 0.2, y: -0.24 + a * lift, z: -Math.max(0, a) * 0.04 }
  if (Lh) Lh.feetPosition = { x: -0.2, y: -0.24 - a * lift, z: -Math.max(0, -a) * 0.04 }
}
