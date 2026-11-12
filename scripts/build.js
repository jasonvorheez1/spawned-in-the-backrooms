// B mode, rebuilt (Nov 8, Shelly: "massively overhaul base building"). Aim where you look: a ghost of the piece snaps to a
// 2 m grid (foundations and floors fill a square, walls, doorways and doors sit on its sides and turn themselves, stairs
// take two squares, loose things sit on a half-metre grid). Pieces stack: aim at a wall's top for the next storey.
// 1-7 pick a tab, X / the wheel the piece, R turns it (on a side: flips it), a click builds it with your scrap.
// Tab 7 is tools: Repair, Upgrade (plank > sheet > brick, timber > concrete…), Demolish (your own, half the parts back).
// In your own home every piece rides your save (state.homeKeep.built, rebuilt by places/home11/sim.js).
import { heard } from './lib/hear.js'
import B from './lib/data/breakables.yml'
import { raycast, overlapPoint, getInputRay } from 'builtin/physics'
import { builtSpec, pieceOf, furnModel, tabsFor, doorPrim } from './lib/build-piece.js'
import L5P from './lib/data/level5-people.yml'

const BASE = B.tabs, REACH = B.buildReach ?? 7, CAP = B.buildCap ?? 250
const isTool = (k) => !!B.tools?.[k]
// the tabs this player sees: the scrap tabs, then Furniture holding what they own from the mall
const valid = (k) => !!(pieceOf(k) || isTool(k))
const tabOf = (s, k) => Math.max(0, tabsFor(s).findIndex((t) => t.pieces.includes(k)))
const has = (s, k) => s.scrap?.[k] ?? 0
const canPay = (s, cost, pc) => pc?.furn ? (s.furn?.[pc.furn] ?? 0) >= 1 : Object.entries(cost).every(([k, n]) => has(s, k) >= n)
const needText = (cost) => Object.entries(cost).map(([k, n]) => n + ' ' + (B.scrap[k]?.name ?? k)).join(', ')
const say = (ctx, s, t) => { s.notice = t; s.noticeAt = ctx.now() }
const D = Math.PI / 180
const snapYaw = (f) => (((Math.round(Math.atan2(-f.x, -f.z) / D / 90) * 90) % 360) + 360) % 360
const turn = (ox, oz, rot) => { const c = Math.cos(rot * D), s = Math.sin(rot * D); return { x: ox * c + oz * s, z: -ox * s + oz * c } }
const SND = { wood: 'hammer-nail-wood-build', metal: 'metal-sheet-bolted-ratchet-clank', concrete: 'trowel-mortar-brick-set-scrape', brick: 'trowel-mortar-brick-set-scrape', pipe: 'metal-sheet-bolted-ratchet-clank' }
const clip = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
// your own home: the house in Infinite City, or the Level 5 room or suite you booked, while the key lasts (Shelly, Nov 12)
const L5R = { suite: 5.5, room: 4 } // m from the room's trunk that count as inside it (Savi's picks)
function inL5Room(ctx, s) {
  if (ctx.self.place !== 'level5' || !s.l5room || (s.l5until ?? 0) < ctx.now()) return false
  const t = (L5P.suites?.[s.l5room] ?? L5P.rooms?.[s.l5room])?.trunk; if (!t) return false
  const f = ctx.self.feetPosition, r = s.l5room.startsWith('suite') ? L5R.suite : L5R.room
  return Math.hypot(f.x - t[0], f.z - t[1]) < r
}
const atHome = (ctx, s) => (ctx.self.place === 'home11' && !!s.home11) || inL5Room(ctx, s)

function look(ctx) {
  const r = ctx.self.session.bray, me = ctx.self.feetPosition
  if (!r) { const f = ctx.self.session.bfwd ?? { x: 0, z: -1 }; return { o: { x: me.x, y: me.y + 1.6, z: me.z }, d: { x: f.x, y: -0.35, z: f.z }, f } }
  const h = Math.hypot(r.direction.x, r.direction.z) || 1
  return { o: r.origin, d: r.direction, f: { x: r.direction.x / h, z: r.direction.z / h } }
}
function ignore(ctx) { return [ctx.self.id, ctx.self.session.ghost].filter(Boolean) }

// what the crosshair rests on, within reach
function hit(ctx) {
  const L = look(ctx), me = ctx.self.feetPosition
  const back = Math.hypot(L.o.x - me.x, L.o.z - me.z) // third person: the eye stands behind you
  return { L, h: raycast(ctx, L.o, L.d, { distance: REACH + back + 1, ignoreEntities: ignore(ctx), physicsOnly: true }) }
}

// the snapped slot for a piece: { x, y, z, rot, ok, why }
function slot(ctx, s, kind) {
  const pc = pieceOf(kind), me = ctx.self.feetPosition, { L, h } = hit(ctx), f = L.f
  let p, up = false
  if (h) { p = h.position; up = (h.normal?.y ?? 0) > 0.6 } else p = { x: L.o.x + L.d.x * 5, y: L.o.y + L.d.y * 5, z: L.o.z + L.d.z * 5 }
  if (!up) { // a wall face or thin air: drop to what is underneath, just this side of it
    const n = h?.normal ?? { x: -f.x, z: -f.z }
    const q = { x: p.x + (n.x ?? 0) * 0.3, y: p.y + 0.15, z: p.z + (n.z ?? 0) * 0.3 }
    const d = raycast(ctx, q, { x: 0, y: -1, z: 0 }, { distance: 8, ignoreEntities: ignore(ctx), physicsOnly: true })
    p = { x: q.x, y: d ? d.position.y : me.y, z: q.z }
  }
  const y = Math.round(p.y * 100) / 100, R = s.buildRot ?? 0, snap = pc.snap ?? 'free'
  let x, z, rot
  if (snap === 'cell' || snap === 'stairs') {
    const px = p.x + f.x * 0.3, pz = p.z + f.z * 0.3 // a point on a shared edge leans into the square you look toward
    x = Math.floor(px / 2) * 2 + 1; z = Math.floor(pz / 2) * 2 + 1
    rot = (snapYaw(f) + R * 90) % 360
    if (snap === 'stairs') { const o = turn(0, -1, rot); x += o.x; z += o.z }
  } else if (snap === 'edge') {
    const cx = Math.floor(p.x / 2) * 2 + 1, cz = Math.floor(p.z / 2) * 2 + 1, dx = p.x - cx, dz = p.z - cz
    if (Math.abs(dx) > Math.abs(dz)) { x = cx + (dx < 0 ? -1 : 1); z = cz; rot = 90 } else { x = cx; z = cz + (dz < 0 ? -1 : 1); rot = 0 }
    if (R % 2) rot += 180
  } else { x = Math.round(p.x * 2) / 2; z = Math.round(p.z * 2) / 2; rot = (snapYaw(f) + R * 90) % 360 }
  const at = { x, y, z, rot }
  if (Math.hypot(x - me.x, z - me.z) > REACH || Math.abs(y - me.y) > 7) return { ...at, ok: false, why: 'Too far' }
  // anything already standing in it (the floor it rests on is below its middle, so it never counts)
  const [w, ht, dp] = pc.size, hx = w / 2 - 0.15, hz = Math.max(0, dp / 2 - 0.06), ys = [y + Math.min(ht, 1.6) * 0.5 + 0.03]
  if (snap === 'stairs') ys.push(y + 1.6)
  const pts = [[0, 0], [hx, hz], [-hx, -hz], [hx, -hz], [-hx, hz]]
  if (snap === 'stairs') pts.push([0, 1.4], [0, -1.4])
  const ign = new Set(ignore(ctx))
  for (const yy of ys) for (const [ox, oz] of pts) {
    const o = turn(ox, oz, rot), objs = overlapPoint(ctx, { x: x + o.x, y: yy, z: z + o.z })?.objects ?? []
    const block = objs.find((id) => !ign.has(id) && !ctx.getObject(id)?.physics?.trigger)
    if (block) return { ...at, ok: false, why: String(block).startsWith('player') ? 'Step out of the way' : 'Something is in the way' }
  }
  return { ...at, ok: true, why: '' }
}

function target(ctx) { // the built piece under the crosshair, for the tools
  const { h } = hit(ctx), me = ctx.self.feetPosition
  if (!h?.id) return null
  const o = ctx.getObject(h.id)
  if (!o?.tags?.includes('built') || Math.hypot(o.feetPosition.x - me.x, o.feetPosition.z - me.z) > REACH) return null
  return o
}
const mine = (ctx, s, o) => o.state?.byUser ? o.state.byUser === ctx.self.userId : (o.state?.by === ctx.self.id || (atHome(ctx, s) && String(o.id).startsWith('hb-')))
const half = (cost, f) => Object.fromEntries(Object.entries(cost).map(([k, n]) => [k, Math.max(1, Math.ceil(n * f))]))
const pay = (s, cost, sign = -1) => { const sc = { ...(s.scrap ?? {}) }; for (const [k, n] of Object.entries(cost)) sc[k] = (sc[k] ?? 0) + sign * n; s.scrap = sc }
const slotOf = (o) => o.state?.slot ?? { x: o.feetPosition.x, y: o.feetPosition.y, z: o.feetPosition.z, rot: 0 }

function dust(ctx, at, big) {
  ctx.emit('fx', { position: { x: at.x, y: at.y + 0.1, z: at.z }, script: `fx
pop dust burst=${big ? '14..20' : '8..12'} on=disc(${big ? 1.1 : 0.7}) life=.5..0.9 v=up(.3..0.7)+sdir()*.4 size=.2..0.35 acc=buoy(.2)+drag(1.5) col=<.62,.55,.4> a=0>.35:.3>.7:.15>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)
pop chips burst=6..10 on=disc(.5) life=.4..0.8 v=up(1.5..2.5)+sdir()*1.2 size=.03..0.06 acc=grav() col=<.55,.42,.28> a=1 floor=stick r=sprite(soft-disc,alpha)` })
}
function thunk(ctx, mat, at, v = 0.7) { heard(ctx, { clip: clip(SND[mat] ?? SND.wood), position: { x: at.x, y: at.y + 1, z: at.z }, volume: v, maxDistance: 22 }) }

// home bookkeeping: what you built in your own house rides your save
function keepSet(s, id, row) { const k = { ...(s.homeKeep ?? {}) }, b = { ...(k.built ?? {}) }; if (row) b[id] = row; else delete b[id]; k.built = b; s.homeKeep = k }
const newId = (ctx) => 'hb-' + Math.round(ctx.now()).toString(36) + Math.floor(ctx.random() * 1296).toString(36)

function spawnPiece(ctx, s, kind, at) {
  if (atHome(ctx, s)) {
    if (Object.keys(s.homeKeep?.built ?? {}).length >= 120) { say(ctx, s, 'Your house holds 120 built pieces'); return null }
    const id = newId(ctx)
    ctx.spawn(id, builtSpec(kind, at, ctx.self.id, { byUser: ctx.self.userId, id, owner: s }))
    keepSet(s, id, { kind, x: at.x, y: at.y, z: at.z, rot: at.rot })
    return id
  }
  return ctx.spawn(builtSpec(kind, at, ctx.self.id, { byUser: ctx.self.userId }))
}

function place(ctx, s) {
  const kind = s.building, pc = pieceOf(kind), at = slot(ctx, s, kind)
  if (!at.ok) { say(ctx, s, at.why); return }
  if (!canPay(s, pc.cost, pc)) { say(ctx, s, pc.furn ? 'None left to place' : 'Need ' + needText(pc.cost)); return }
  if (!atHome(ctx, s)) {
    const n = ctx.query({ tags: ['built'], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((o) => o.state?.byUser === ctx.self.userId).length
    if (n >= CAP) { say(ctx, s, `You have ${CAP} pieces standing here. Demolish some first.`); return }
  }
  if (!spawnPiece(ctx, s, kind, at)) return
  if (pc.furn) s.furn = { ...(s.furn ?? {}), [pc.furn]: (s.furn?.[pc.furn] ?? 1) - 1 }; else pay(s, pc.cost)
  if (pc.furn && !(s.furn[pc.furn] > 0)) { s.building = BASE[0].pieces[0]; s.buildLast = s.building }
  say(ctx, s, pc.name + (atHome(ctx, s) ? ' built · saved to your home' : ' built'))
  thunk(ctx, pc.mat, at); dust(ctx, at, pc.size[0] * pc.size[2] > 2)
}

function useTool(ctx, s) {
  const o = target(ctx)
  if (!o) { say(ctx, s, 'Aim at something you built'); return }
  const kind = o.state.buildKind, pc = pieceOf(kind); if (!pc) return
  const at = slotOf(o)
  if (pc.furn && s.building !== 'tool_demolish') { say(ctx, s, pc.name + ' is furniture. Demolish picks it up.'); return }
  if (s.building === 'tool_repair') {
    const max = o.state.maxHp ?? pc.hp, miss = 1 - Math.max(0, o.state.hp ?? max) / max
    if (miss < 0.01) { say(ctx, s, pc.name + ' is already sound'); return }
    const cost = half(pc.cost, 0.5 * miss)
    if (!canPay(s, cost)) { say(ctx, s, 'Repair needs ' + needText(cost)); return }
    pay(s, cost); o.state.hp = max
    if (o.primitive?.params?.dmg) o.primitive = { ...o.primitive, params: { ...o.primitive.params, dmg: 0 } }
    ctx.emit('damageNumber', { position: { x: at.x, y: at.y + 1.6, z: at.z }, text: 'REPAIRED', color: '#7fd1a0', size: 0.9 })
    say(ctx, s, pc.name + ' repaired'); thunk(ctx, pc.mat, at, 0.6)
  } else if (s.building === 'tool_upgrade') {
    const up = pc.up && B.pieces[pc.up]
    if (!up) { say(ctx, s, pc.name + ' is as strong as it gets'); return }
    if (!mine(ctx, s, o)) { say(ctx, s, 'Not yours to rebuild'); return }
    if (!canPay(s, up.cost)) { say(ctx, s, `${up.name} needs ` + needText(up.cost)); return }
    const home = atHome(ctx, s) && String(o.id).startsWith('hb-')
    if (home) keepSet(s, o.id, null)
    ctx.destroy(o.id)
    if (!spawnPiece(ctx, s, pc.up, at)) return
    pay(s, up.cost)
    say(ctx, s, `${pc.name} → ${up.name}`); thunk(ctx, up.mat, at); dust(ctx, at, true)
    ctx.emit('damageNumber', { position: { x: at.x, y: at.y + 1.8, z: at.z }, text: `+${up.hp - pc.hp} HP`, color: '#ffb642', size: 1 })
  } else if (s.building === 'tool_demolish') {
    if (!mine(ctx, s, o)) { say(ctx, s, 'Not yours to take down'); return }
    if (o.tags?.includes('storage') && String(o.state.items ?? '')) { say(ctx, s, 'Empty the locker first'); return }
    if (pc.furn) { s.furn = { ...(s.furn ?? {}), [pc.furn]: (s.furn?.[pc.furn] ?? 0) + 1 }; if (atHome(ctx, s) && String(o.id).startsWith('hb-')) keepSet(s, o.id, null); ctx.destroy(o.id); say(ctx, s, pc.name + ' picked up'); dust(ctx, at, false); return }
    const back = Object.fromEntries(Object.entries(pc.cost).map(([k, n]) => [k, Math.floor(n * 0.5)]).filter(([, n]) => n > 0))
    pay(s, back, +1)
    if (atHome(ctx, s) && String(o.id).startsWith('hb-')) keepSet(s, o.id, null)
    ctx.destroy(o.id)
    say(ctx, s, `${pc.name} taken down · got back ` + (Object.keys(back).length ? needText(back) : 'nothing'))
    heard(ctx, { clip: clip('wooden-planks-pried-apart-creak-crash'), position: { x: at.x, y: at.y + 1, z: at.z }, volume: 0.7, maxDistance: 22 }); dust(ctx, at, true)
  }
}

function dropGhost(ctx) { const g = ctx.self.session.ghost; if (g) { ctx.destroy(g); ctx.self.session.ghost = null; ctx.self.session.gk = null } }
function clearHl(ctx) { const m = ctx.self.session; if (m.hl) { ctx.emit('highlightClear', { target: m.hl }, { audience: { player: ctx.self.id } }); m.hl = null } }
function pick(s, k) { s.building = k; s.buildLast = k; s.buildTab = tabOf(s, k) }

const inBonus = (ctx) => String(ctx.self.place ?? '').startsWith('bonus')

export function onInput(ctx, input) {
  const s = ctx.self.state
  const sin = input.axes.aimYawSin, cos = input.axes.aimYawCos
  if (sin != null && cos != null) ctx.self.session.bfwd = { x: -sin, z: -cos }
  const ray = getInputRay(ctx, input); if (ray) ctx.self.session.bray = ray
  if (!atHome(ctx, s)) { // building only in your own home (Shelly, Nov 12: "only base build in player homes"); the Bonus Room was already off (Nov 10)
    if (input.pressed.build) ctx.emit('uiEvent', { name: 'toast', payload: { text: ctx.self.place === 'level5' && s.l5room ? 'Build inside your booked room' : 'You can only build in your home: your house or a booked Level 5 room' } }, { audience: { player: ctx.self.id } })
    if (valid(s.building)) { s.building = null; dropGhost(ctx); clearHl(ctx) }
    return
  }
  if (input.pressed.build) {
    if (valid(s.building)) { s.building = null; dropGhost(ctx); clearHl(ctx) }
    else { pick(s, valid(s.buildLast) ? s.buildLast : BASE[0].pieces[0]); s.buildRot ??= 0; s.invOpen = false }
    return
  }
  if (!valid(s.building)) return
  const TABS = tabsFor(s), FLAT = TABS.flatMap((t) => t.pieces)
  for (let i = 0; i < TABS.length; i++) if (input.pressed['bc' + (i + 1)]) { const t = TABS[i], mem = s.buildPick?.[i]; pick(s, t.pieces.includes(mem) ? mem : t.pieces[0]); return }
  if (input.pressed.reload) s.buildRot = ((s.buildRot ?? 0) + 1) % 4
  const step = input.pressed.cycleWeapon ? 1 : input.pressed.buildPrev ? -1 : 0
  if (step) { const i = FLAT.indexOf(s.building); pick(s, FLAT[(i + step + FLAT.length) % FLAT.length]); s.buildPick = { ...(s.buildPick ?? {}), [s.buildTab]: s.building } }
  if (input.pressed.attack) { if (isTool(s.building)) useTool(ctx, s); else place(ctx, s) }
}

export function update(ctx) {
  const s = ctx.self.state
  if (!ctx.self.isLocal && ctx.self.isLocal !== undefined) return
  if (inBonus(ctx) && valid(s.building)) { s.building = null; dropGhost(ctx); clearHl(ctx); return }
  if (!valid(s.building)) { if (ctx.self.session.ghost) dropGhost(ctx); clearHl(ctx); return }
  const m = ctx.self.session
  if (isTool(s.building)) { // tools: no ghost, the piece you look at glows and the menu names it
    dropGhost(ctx)
    const o = target(ctx), id = o?.id ?? null
    if (id !== m.hl) { clearHl(ctx); if (id) { ctx.emit('highlightSet', { target: id, color: s.building === 'tool_demolish' ? '#ff6a4a' : '#7dffb0', style: 'outline', width: 2 }, { audience: { player: ctx.self.id } }); m.hl = id } }
    let t = null
    if (o) { const pc = pieceOf(o.state.buildKind); t = { name: pc?.name ?? o.state.name, hp: Math.max(0, Math.round(o.state.hp ?? 0)), max: o.state.maxHp ?? pc?.hp ?? 0, up: pc?.up ? pieceOf(pc.up)?.name : null, mine: mine(ctx, s, o) } }
    const key = JSON.stringify(t); if (m.tkey !== key) { m.tkey = key; s.buildTarget = t }
    return
  }
  clearHl(ctx); if (s.buildTarget) { s.buildTarget = null; m.tkey = 'null' }
  const pc = pieceOf(s.building), at = slot(ctx, s, s.building), pays = canPay(s, pc.cost, pc), good = at.ok && pays
  const why = at.ok ? (pays ? '' : 'Not enough scrap') : at.why
  if (s.buildWhy !== why) s.buildWhy = why
  const key = s.building + (good ? 1 : 0)
  const feet = pc.door ? (() => { const o = turn(-0.5, 0, at.rot); return { x: at.x + o.x, y: at.y, z: at.z + o.z } })() : { x: at.x, y: at.y, z: at.z }
  if (m.gk !== key) {
    dropGhost(ctx)
    const look = pc.furn ? furnModel(pc) : { primitive: pc.door ? doorPrim(s.building) : { kind: 'scripted', script: 'scripts/build-geo.js', params: { kind: s.building, dmg: 0 } } }
    m.ghost = ctx.spawn({ audience: 'local', scope: 'session', tags: ['ghost'], castShadow: false, feetPosition: feet, rotation: { yaw: at.rot }, ...look,
      material: { color: good ? '#7dffb0' : '#ff6a4a', emissive: good ? '#2f9a5a' : '#9a2a1a', transparent: true, opacity: 0.42, depthWrite: false } })
    m.gk = key
  }
  const g = ctx.getObject(m.ghost)
  if (g) { const fp = g.feetPosition; if (fp.x !== feet.x || fp.z !== feet.z || Math.abs(fp.y - feet.y) > 0.01) g.feetPosition = feet; if (m.grot !== at.rot) { g.rotation = { yaw: at.rot }; m.grot = at.rot } }
}
