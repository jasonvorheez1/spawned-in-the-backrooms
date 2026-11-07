// B mode (7 Days / Minecraft style): a ghost of the chosen piece stands on a 1 m grid ahead of you, R turns it 90°,
// X (or the wheel) picks the next piece, a click builds it if you carry the scrap (player.state.scrap, scripts/player.js).
// Built pieces are static, tagged breakable: anything that hits them chips them back (scripts/lib/breakables.js).
import B from './lib/data/breakables.yml'
import { raycast, overlapPoint } from 'builtin/physics'

const piece = (s) => B.pieces[s.building] ? s.building : null
const canPay = (s, pc) => Object.entries(pc.cost).every(([k, n]) => (s.scrap?.[k] ?? 0) >= n)

function spot(ctx, s) {
  const pc = B.pieces[s.building], f = ctx.self.session.bfwd ?? { x: 0, z: -1 }, p = ctx.self.feetPosition
  const d = 1.4 + pc.size[2] / 2 + 0.6
  const x = Math.round(p.x + f.x * d), z = Math.round(p.z + f.z * d)
  const down = raycast(ctx, { x, y: p.y + 1.6, z }, { x: 0, y: -1, z: 0 }, { distance: 4, ignoreEntities: [ctx.self.id, ctx.self.session.ghost].filter(Boolean), physicsOnly: true })
  const y = down ? down.position.y : p.y
  const rot = ((s.buildRot ?? 0) % 4) * 90
  const swap = rot % 180 !== 0, hx = (swap ? pc.size[2] : pc.size[0]) / 2 - 0.08, hz = (swap ? pc.size[0] : pc.size[2]) / 2 - 0.04
  let ok = Math.abs(y - p.y) < 1.3
  if (ok) for (const [ox, oz] of [[0, 0], [hx, hz], [-hx, -hz], [hx, -hz], [-hx, hz]]) {
    const o = overlapPoint(ctx, { x: x + ox, y: y + Math.min(pc.size[1], 1.6) * 0.6, z: z + oz })
    if ((o?.objects ?? []).some((id) => id !== ctx.self.session.ghost && id !== ctx.self.id)) { ok = false; break }
  }
  return { x, y, z, rot, ok }
}

function dropGhost(ctx) { const g = ctx.self.session.ghost; if (g) { ctx.destroy(g); ctx.self.session.ghost = null; ctx.self.session.gk = null } }

export function onInput(ctx, input) {
  const s = ctx.self.state
  const sin = input.axes.aimYawSin, cos = input.axes.aimYawCos
  if (sin != null && cos != null) ctx.self.session.bfwd = { x: -sin, z: -cos }
  if (input.pressed.build) {
    if (piece(s)) { s.building = null; dropGhost(ctx) }
    else { s.building = s.buildLast && B.pieces[s.buildLast] ? s.buildLast : B.order[0]; s.buildRot ??= 0; s.invOpen = false }
    return
  }
  if (!piece(s)) return
  if (input.pressed.reload) s.buildRot = ((s.buildRot ?? 0) + 1) % 4
  if (input.pressed.cycleWeapon) { const i = B.order.indexOf(s.building); s.building = s.buildLast = B.order[(i + 1) % B.order.length] }
  if (input.pressed.attack) place(ctx, s)
}

function place(ctx, s) {
  const pc = B.pieces[s.building], at = spot(ctx, s)
  if (!canPay(s, pc)) { s.notice = 'Need ' + Object.entries(pc.cost).map(([k, n]) => n + ' ' + B.scrap[k].name).join(', '); s.noticeAt = ctx.now(); return }
  if (!at.ok) { s.notice = 'No room to build there'; s.noticeAt = ctx.now(); return }
  const sc = { ...s.scrap }; for (const [k, n] of Object.entries(pc.cost)) sc[k] -= n; s.scrap = sc
  ctx.spawn({
    tags: pc.bench ? ['breakable', 'built', 'bench'] : ['breakable', 'built'], feetPosition: { x: at.x, y: at.y, z: at.z }, rotation: { yaw: at.rot },
    primitive: { kind: 'scripted', script: 'scripts/build-geo.js', params: { kind: s.building, dmg: 0 } },
    material: { pbr: true }, physics: { body: 'static', collider: s.building === 'ramp' ? 'mesh' : 'box' },
    state: { mat: pc.mat, hp: pc.hp, maxHp: pc.hp, name: pc.name, size: Math.max(...pc.size), by: ctx.self.id },
  })
  ctx.emit('playSound', { clip: `/cdn/moodboard-realistic-gritty/sfx-${B.buildSound}.mp3`, position: { x: at.x, y: at.y + 1, z: at.z }, volume: 0.7, maxDistance: 20 })
  ctx.emit('fx', { position: { x: at.x, y: at.y + 0.1, z: at.z }, script: `fx
pop dust burst=8..12 on=disc(.8) life=.5..0.9 v=up(.3..0.7)+sdir()*.4 size=.2..0.35 acc=buoy(.2)+drag(1.5) col=<.62,.55,.4> a=0>.35:.3>.7:.15>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)` })
}

export function update(ctx) {
  const s = ctx.self.state
  if (!ctx.self.isLocal && ctx.self.isLocal !== undefined) return
  if (!piece(s)) { if (ctx.self.session.ghost) dropGhost(ctx); return }
  const pc = B.pieces[s.building], at = spot(ctx, s), good = at.ok && canPay(s, pc)
  const key = s.building + (good ? 1 : 0)
  if (ctx.self.session.gk !== key) {
    dropGhost(ctx)
    ctx.self.session.ghost = ctx.spawn({ audience: 'local', scope: 'session', tags: ['ghost'], castShadow: false, feetPosition: { x: at.x, y: at.y, z: at.z }, rotation: { yaw: at.rot },
      primitive: { kind: 'scripted', script: 'scripts/build-geo.js', params: { kind: s.building, dmg: 0 } },
      material: { color: good ? '#7dffb0' : '#ff6a4a', emissive: good ? '#2f9a5a' : '#9a2a1a', transparent: true, opacity: 0.42, depthWrite: false } })
    ctx.self.session.gk = key
  }
  const g = ctx.getObject(ctx.self.session.ghost)
  if (g) { const fp = g.feetPosition; if (fp.x !== at.x || fp.z !== at.z || Math.abs(fp.y - at.y) > 0.01) g.feetPosition = { x: at.x, y: at.y, z: at.z }; if ((g.state?.r ?? -1) !== at.rot) { g.rotation = { yaw: at.rot }; g.state = { r: at.rot } } }
}
