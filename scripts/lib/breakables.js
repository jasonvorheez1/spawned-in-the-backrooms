// Breakables: what a swing or a shot does to the world itself. Numbers live in lib/data/breakables.yml.
// An entity is breakable by tag "breakable" + state { mat, hp, maxHp }. Level 0's generated walls are one mesh ("level0"):
// a wall is keyed "x:cx:cz" / "z:cx:cz", its hp in place.state.wallHp, broken ones in place.state.broken { key: at } (the sim regrows them).
import B from './data/breakables.yml'
import { attrsOf } from './stats.js'
import { baseOf } from './weapons.js'
import { raycast } from 'builtin/physics'
import { N, S, H, HALF, wallX, wallZ, isArchWall, inHub, EXIT } from './maze.js'
import { GRIDS, gridOfObj, wallFrame } from './wallgrid.js'
export { B }
const EDGED = ['hatchet', 'fire_axe', 'rebar', 'screwdriver', 'knife', 'machete']
export const classOf = (wp, kind) => (wp?.ranged ? 'firearm' : EDGED.includes(baseOf(kind ?? '')) ? 'edged' : 'blunt')
export const strFactor = (s) => B.strength.base + B.strength.per * (attrsOf(s).h ?? 5)
const HIT_SND = '/cdn/value.cfc58a0b0cfdf122917ab195d01064a2ae5f076683edb408518787bb3f64c070.mp3' // the existing pipe-thud pack
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`

// ---- Level 0 walls
const exitCell = (cx, cz) => cx === EXIT.cx && cz === EXIT.cz
export function wallProtected(axis, cx, cz) {
  const ox = axis === 'x' ? cx + 1 : cx, oz = axis === 'z' ? cz + 1 : cz
  if (cx < 0 || cz < 0 || ox >= N || oz >= N || ox <= 0 && axis === 'x' || oz <= 0 && axis === 'z') return true // the map's edge
  if (axis === 'x' && (cx >= N - 1)) return true
  if (axis === 'z' && (cz >= N - 1)) return true
  if (inHub(cx, cz) || inHub(ox, oz)) return true // the safe room's shell
  if (exitCell(cx, cz) || exitCell(ox, oz)) return true // never the way out
  return false
}
export function wallKeyAt(pos, normal) {
  if (Math.abs(normal?.y ?? 0) > 0.6) return null
  const axis = Math.abs(normal.x) > Math.abs(normal.z) ? 'x' : 'z'
  const cx = axis === 'x' ? Math.round((pos.x + HALF) / S) - 1 : Math.floor((pos.x + HALF) / S)
  const cz = axis === 'z' ? Math.round((pos.z + HALF) / S) - 1 : Math.floor((pos.z + HALF) / S)
  const has = axis === 'x' ? cx >= 0 && cx < N - 1 && wallX(cx, cz) : cz >= 0 && cz < N - 1 && wallZ(cx, cz)
  if (!has || isArchWall(cx, cz, axis)) return null
  const V = B.voxel ?? { cols: 4, rows: 3 }, a = (axis === 'x' ? cz : cx) * S - HALF - 0.1, len = S + 0.2
  const u = Math.max(0, Math.min(V.cols - 1, Math.floor(((axis === 'x' ? pos.z : pos.x) - a) / (len / V.cols))))
  const v = Math.max(0, Math.min(V.rows - 1, Math.floor(pos.y / (H / V.rows))))
  return { key: `${axis}:${cx}:${cz}`, vox: `${axis}:${cx}:${cz}:${u}:${v}`, u, v, axis, cx, cz, prot: wallProtected(axis, cx, cz) }
}
export const brokenList = (st) => Object.keys(st?.broken ?? {}).sort()
export function syncLevel0(ctx) {
  const o = ctx.place.objects.level0; if (!o) return
  const list = brokenList(ctx.place.state), cur = (o.primitive?.params?.broken ?? []).join(',')
  if (cur !== list.join(',')) o.primitive = { kind: 'scripted', script: 'scripts/level0-geo.js', params: { broken: list } }
}

// ---- walls below Level 0 (lib/wallgrid.js): same keys and voxels, per place, each wall its own material
const VG = (G) => ({ cols: G.cols ?? 4, rows: G.rows ?? 3 })
export function gridWallAt(G, pos, normal, key) {
  let axis, cx, cz
  if (key) { [axis, cx, cz] = key.split(':'); cx = +cx; cz = +cz }
  else {
    if (Math.abs(normal?.y ?? 0) > 0.6) return null
    axis = Math.abs(normal.x) > Math.abs(normal.z) ? 'x' : 'z'
    cx = axis === 'x' ? Math.round((pos.x + G.HALF) / G.S) - 1 : Math.floor((pos.x + G.HALF) / G.S)
    cz = axis === 'z' ? Math.round((pos.z + G.HALF) / G.S) - 1 : Math.floor((pos.z + G.HALF) / G.S)
    // only a hit on the wall's face itself (not a pillar, a rack or a door frame near it)
    const f = (axis === 'x' ? cx + 1 : cz + 1) * G.S - G.HALF
    if (Math.abs((axis === 'x' ? pos.x : pos.z) - f) > G.T + 0.15) return null
    if (!G.has(axis, cx, cz)) return null
  }
  const V = VG(G), fr = wallFrame(G, axis, cx, cz)
  const u = Math.max(0, Math.min(V.cols - 1, Math.floor(((axis === 'x' ? pos.z : pos.x) - fr.a0) / (fr.len / V.cols))))
  const v = Math.max(0, Math.min(V.rows - 1, Math.floor(pos.y / (G.H / V.rows))))
  const sk = G.skin(axis, cx, cz)
  return { key: `${axis}:${cx}:${cz}`, vox: `${axis}:${cx}:${cz}:${u}:${v}`, u, v, axis, cx, cz, prot: G.prot(axis, cx, cz), mat: sk.mat, G }
}
const patchId = (k) => 'wp-' + k.replace(/:/g, '_')
// which grid this place uses: the caller's word (a sim names its place, a hit names its wall), else the level mesh present
const gridHere = (ctx, gname) => (gname && GRIDS[gname] ? gname : Object.keys(GRIDS).reverse().find((k) => ctx.place.objects[GRIDS[k].obj]))
export function syncWalls(ctx, gname) {
  const name = gridHere(ctx, gname); if (!name) return
  const G = GRIDS[name], o = ctx.place.objects[G.obj]; void pl
  const br = ctx.place.state.broken ?? {}, walls = {}
  for (const k of Object.keys(br)) { const p = k.split(':'), w = p.slice(0, 3).join(':'); (walls[w] ??= []); if (p.length === 5) walls[w].push(`${p[3]}:${p[4]}`); else walls[w].whole = true }
  const cut = Object.keys(walls).sort(), cur = (o.primitive?.params?.cut ?? []).join(',')
  if (cur !== cut.join(',')) o.primitive = { ...o.primitive, kind: 'scripted', script: G.script, params: { ...(o.primitive?.params ?? {}), cut } }
  const want = new Set()
  for (const w of cut) {
    if (walls[w].whole) continue
    const id = patchId(w), [axis, cx, cz] = w.split(':'), fr = wallFrame(G, axis, +cx, +cz), sk = G.skin(axis, +cx, +cz), V = VG(G)
    want.add(id)
    const params = { len: fr.len, H: G.H, T: G.T, cols: V.cols, rows: V.rows, seed: (+cx * 31 + +cz * 17) % 97, broken: walls[w].sort(), tex: sk.tex, col: sk.col, rough: sk.rough, rebar: !!B.materials[sk.mat]?.rebar, core: sk.mat === 'brick' ? 'oklch(0.5 0.05 40)' : undefined }
    const ex = ctx.place.objects[id]
    if (!ex) ctx.spawn(id, { tags: ['wallpatch'], feetPosition: { x: fr.center.x, y: 0, z: fr.center.z }, rotation: { yaw: axis === 'x' ? 0 : 90 }, physics: { body: 'static', collider: 'mesh' }, receiveShadow: true, castShadow: false, primitive: { kind: 'scripted', script: 'scripts/wallpatch-geo.js', params }, material: { roughness: 0.9 }, state: { wall: w } })
    else if (Math.abs(ex.feetPosition.x - fr.center.x) > 0.05 || Math.abs(ex.feetPosition.z - fr.center.z) > 0.05 || ex.primitive?.params?.len !== params.len) { ctx.destroy(id); want.delete(id) }
    else if ((ex.primitive?.params?.broken ?? []).join(',') !== params.broken.join(',')) ex.primitive = { kind: 'scripted', script: 'scripts/wallpatch-geo.js', params }
  }
  for (const r of ctx.query({ tags: ['wallpatch'], select: 'ids' })) { const id = r.id ?? r; if (!want.has(id)) ctx.destroy(id) }
}
// the sims call this: broken walls grow back after regrowMinutes (never with someone in the gap), then the mesh follows
// props the levels lay without a material (containers, Level 2 boxes, Level 3 live junction boxes) join the breakables here
const PROP_MAT = { 'live-box': 'junction', l2box: 'sheet_steel', container: 'wood' }
const L2_MAT = { toolbox: 'sheet_steel', locker: 'sheet_steel', vending: 'sheet_steel', cabinet: 'sheet_steel', valvebox: 'pipe', pipebox: 'pipe', crate: 'wood', pallet: 'wood', desk: 'wood' }
export function sweepProps(ctx) {
  for (const t of ['live-box', 'l2box', 'container']) for (const o of ctx.query({ tags: [t], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const st = o.state ?? {}
    if (o.tags?.includes('breakable') && st.mat && st.hp != null && !(t === 'live-box' && st.mat === 'machine')) continue
    const h = ctx.getObject(o.id); if (!h) continue
    const mat = t === 'live-box' ? 'junction' : t === 'l2box' ? (L2_MAT[st.kind] ?? 'sheet_steel') : (st.mat ?? PROP_MAT[t])
    const hp = Math.round((B.materials[mat]?.hp ?? 80) * (t === 'live-box' ? 1 : 0.5))
    if (!h.tags.includes('breakable')) h.tags = [...h.tags, 'breakable']
    h.state.mat = mat; if (st.hp == null || st.mat !== mat) { h.state.hp = hp; h.state.maxHp = hp }
  }
}

export function tickWalls(ctx, gname) {
  sweepProps(ctx)
  const name = gridHere(ctx, gname); if (!name) return
  const G = GRIDS[name], br = ctx.place.state.broken, now = ctx.now()
  if (br) for (const [k, at] of Object.entries(br)) {
    if (now - at < B.regrowMinutes * 60000) continue
    const [ax, cx, cz] = k.split(':'), c = wallFrame(G, ax, +cx, +cz).center
    if (ctx.place.players.some((p) => Math.abs(p.feetPosition.x - c.x) < 1.4 && Math.abs(p.feetPosition.z - c.z) < 1.4)) continue
    delete br[k]
  }
  syncWalls(ctx, name)
}

// ---- drops
export const toolOf = (kind) => B.tools?.[baseOf(kind ?? '')] ?? 'rough'
// 7dtd-style: every base item is its own roll scaled by the tool's fit, then each rare part rolls on its own
export function rollDrops(ctx, mat, kind) {
  const out = [], h = B.harvest?.[mat]?.[toolOf(kind)], mul = h?.mul ?? 1
  for (const [t, a, b] of B.materials[mat]?.drops ?? []) {
    const n = (a + ctx.random() * (b - a + 1)) * mul * (0.6 + ctx.random() * 0.8)
    for (let i = 0; i < Math.floor(n); i++) out.push(t)
  }
  for (const [t, pct, a, b] of h?.rare ?? []) if (ctx.random() * 100 < pct) { const n = a + Math.floor(ctx.random() * (b - a + 1)); for (let i = 0; i < n; i++) out.push(t) }
  return out
}
function crumble(ctx, at, mat, big) {
  const m = B.materials[mat] ?? B.materials.wood, [r, g, b] = m.dust
  const FX = `fx
pop chunk burst=${big ? '26..34' : '12..18'} on=box(<${big ? '1.6,1.1,.15' : '.5,.4,.5'}>) life=1.4..2.2 v=sdir()*(1.5..3.5)+up(1..2.5) size=.06..0.2 spin=-8..8 acc=grav()+drag(.4) col=<${r * 0.8},${g * 0.8},${b * 0.8}> a=1>.8:1>0 sz=$size rot=$age*$spin floor=bounce(.3) r=mesh(box,1,.6,.8)
pop dust burst=${big ? 14 : 7} on=box(<${big ? '1.6,1.1,.3' : '.5,.4,.5'}>) life=1.6..2.6 v=sdir()*(.4..1)+up(.2..0.6) size=.5..0.9 acc=buoy(.2)+drag(1.2) col=<${r},${g},${b}> a=0>.45:.2>.7:.25>0 sz=$size*(.6>2.2) rot=spin(.2) r=sprite(smoke-puff,alpha)`
  ctx.emit('fx', { position: at, script: m.sparks ? FX + `
pop spark burst=18..26 life=.2..0.5 v=sdir()*(3..6)+up(1..2) size=.015..0.03 acc=grav()*.6 col=hdr(5,3,1)>hdr(2,.7,.1) a=1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop arc n=1 life=.3 r=light(<.6,.75,1>,12,6)` : FX })
  ctx.emit('playSound', { clip: SND(m.breakSound ?? B.breakSound), position: at, volume: 0.9, maxDistance: 28 })
  ctx.emit('screenShake', { intensity: big ? 0.25 : 0.12, duration: 0.25 }, { audience: { nearby: at, radius: 8 } })
}
function chip(ctx, at, normal, mat, dmg) {
  const [r, g, b] = (B.materials[mat] ?? B.materials.wood).dust, n = normal ?? { x: 0, y: 1, z: 0 }
  ctx.emit('fx', { position: at, params: { normal: n }, script: `fx
pop bits burst=6..10 life=.5..0.9 v=<%normal|0,1,0>*(1.5..3)+sdir()*(.6..1.2) size=.02..0.06 spin=-9..9 acc=grav()+drag(.6) col=<${r * 0.85},${g * 0.85},${b * 0.85}> a=1>.7:1>0 sz=$size rot=$age*$spin floor=die r=mesh(box,1,.6,.8)
pop puff burst=3..4 life=.6..1 v=<%normal|0,1,0>*(.4..0.8)+sdir()*.2 size=.18..0.3 acc=buoy(.3)+drag(1.6) col=<${r},${g},${b}> a=0>.4:.25>.7:.15>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)` })
  ctx.emit('damageNumber', { position: { x: at.x + n.x * 0.15, y: at.y + 0.2, z: at.z + n.z * 0.15 }, value: Math.round(dmg), color: '#ffb642', size: 0.8 })
  ctx.emit('playSound', { clip: HIT_SND, position: at, volume: 0.6, pitch: ['metal', 'sheet_steel', 'pipe', 'conduit', 'junction'].includes(mat) ? 1.5 : ['drywall', 'brick', 'cinderblock', 'concrete'].includes(mat) ? 0.8 : 1.1, maxDistance: 18 })
}
export function spawnRubble(ctx, at, items, name = 'Rubble') {
  if (!items.length) return
  ctx.spawn({ tags: ['container', 'rubble'], lifetime: 300, feetPosition: { x: at.x, y: at.y, z: at.z }, rotation: ctx.random() * 360, primitive: { kind: 'scripted', script: 'scripts/build-geo.js', params: { kind: 'rubble' } }, state: { name, items: items.join(',') } })
}

// one hit on a breakable entity or a wall. dmg is already the structure damage. Returns true if it landed on something breakable.
export function damageEntity(ctx, o, dmg, at, normal, kind) {
  const mat = o.state?.mat ?? 'wood'
  if (o.state.hp == null) o.state.hp = B.materials[mat]?.hp ?? 60
  o.state.hp -= dmg
  chip(ctx, at, normal, mat, dmg)
  ctx.emit('shake', { target: o.id, intensity: 0.04, duration: 0.15 })
  const left = o.state.hp, max = o.state.maxHp ?? B.materials[mat]?.hp ?? 60
  if (o.primitive?.script === 'scripts/build-geo.js') { // cracks: drawn in quarter steps
    const step = Math.min(3, Math.floor((1 - Math.max(0, left) / max) * 4))
    if ((o.primitive.params?.dmg ?? 0) !== step && left > 0) o.primitive = { ...o.primitive, params: { ...o.primitive.params, dmg: step } }
  }
  if (left <= 0 && !o.state.broke) {
    o.state.broke = true
    const fp = o.feetPosition, big = (o.state.size ?? 1) > 1.5
    crumble(ctx, { x: fp.x, y: fp.y + 0.6, z: fp.z }, mat, big)
    const rare = rollDrops(ctx, mat, kind), items = [...rare, ...(o.state.items ? String(o.state.items).split(',').filter(Boolean) : [])]
    spawnRubble(ctx, { x: fp.x, y: fp.y + 0.02, z: fp.z }, items, o.state.items ? (o.state.name ?? 'Wreck') : mat === 'machine' ? `${o.state.name ?? 'Machine'} parts` : 'Rubble')
    const good = rare.filter((t) => !['scrap_metal', 'scrap_wood', 'drywall', 'nails', 'wire', 'rubble', 'rust_flakes', 'mortar_dust', 'bricks', 'cinder', 'tile_shard'].includes(t))
    if (good.length) { ctx.emit('damageNumber', { position: { x: fp.x, y: fp.y + 1.4, z: fp.z }, text: `+${good.length} parts`, color: '#7fd1a0', size: 1 }); ctx.emit('playSound', { clip: SND('mechanical-parts-salvage-clink'), position: fp, volume: 0.8 }) }
    ctx.destroy(o.id)
  }
  return true
}
export function damageWall(ctx, w, dmg, at, normal, kind) {
  const st = ctx.place.state, V = B.voxel ?? { cols: 4, rows: 3 }
  if (w.prot) { chip(ctx, at, normal, w.mat ?? 'concrete', 0); return true } // shells, edges and exits never give
  if (w.G) return damageGridWall(ctx, w, dmg, at, normal, kind)
  st.wallHp ??= {}; st.broken ??= {}
  const vhp = Math.round(B.materials.drywall.hp * B.wallHpMul / V.cols)
  if (st.wallHp[w.vox] == null) st.wallHp[w.vox] = vhp
  st.wallHp[w.vox] -= dmg
  chip(ctx, at, normal, 'drywall', dmg)
  if (st.wallHp[w.vox] > 0) return true
  const gone = (u, v) => u < 0 || u >= V.cols || v < 0 || !!st.broken[`${w.key}:${u}:${v}`]
  const pop = (u, v) => {
    const k = `${w.key}:${u}:${v}`; delete st.wallHp[k]; st.broken[k] = ctx.now()
    const a = (w.axis === 'x' ? w.cz : w.cx) * S - HALF - 0.1 + (u + 0.5) * (S + 0.2) / V.cols, y = (v + 0.5) * H / V.rows, p = (w.axis === 'x' ? w.cx + 1 : w.cz + 1) * S - HALF
    const c = w.axis === 'x' ? { x: p, y, z: a } : { x: a, y, z: p }
    crumble(ctx, c, 'drywall', false)
    spawnRubble(ctx, { x: c.x + (normal?.x ?? 0) * 0.5, y: 0.02, z: c.z + (normal?.z ?? 0) * 0.5 }, rollDrops(ctx, 'drywall', kind))
  }
  pop(w.u, w.v)
  // no support: a chunk with a hole under it and holes (or the wall's end) both sides comes down with it
  for (let pass = 0; pass < V.rows; pass++) for (let v = 1; v < V.rows; v++) for (let u = 0; u < V.cols; u++)
    if (!gone(u, v) && gone(u, v - 1) && gone(u - 1, v) && gone(u + 1, v)) pop(u, v)
  // every chunk gone: store the wall whole so the mesh params stay short
  let all = true; for (let u = 0; u < V.cols && all; u++) for (let v = 0; v < V.rows; v++) if (!gone(u, v)) { all = false; break }
  if (all) { for (let u = 0; u < V.cols; u++) for (let v = 0; v < V.rows; v++) delete st.broken[`${w.key}:${u}:${v}`]; st.broken[w.key] = ctx.now() }
  ctx.emit('screenShake', { intensity: 0.15, duration: 0.2 }, { audience: { nearby: at, radius: 6 } })
  syncLevel0(ctx)
  return true
}
function damageGridWall(ctx, w, dmg, at, normal, kind) {
  const st = ctx.place.state, G = w.G, V = VG(G), mat = w.mat, m = B.materials[mat] ?? B.materials.drywall
  st.wallHp ??= {}; st.broken ??= {}
  if (st.broken[w.key] || st.broken[w.vox]) return true
  if (st.wallHp[w.vox] == null) st.wallHp[w.vox] = Math.round((m.wallHp ?? m.hp * 2) / V.cols)
  st.wallHp[w.vox] -= dmg
  chip(ctx, at, normal, mat, dmg)
  if (st.wallHp[w.vox] > 0) return true
  const fr = wallFrame(G, w.axis, w.cx, w.cz)
  const gone = (u, v) => u < 0 || u >= V.cols || v < 0 || !!st.broken[`${w.key}:${u}:${v}`]
  const pop = (u, v) => {
    const k = `${w.key}:${u}:${v}`; delete st.wallHp[k]; st.broken[k] = ctx.now()
    const a = fr.a0 + (u + 0.5) * fr.len / V.cols, y = (v + 0.5) * G.H / V.rows
    const c = w.axis === 'x' ? { x: fr.fixed, y, z: a } : { x: a, y, z: fr.fixed }
    crumble(ctx, c, mat, false)
    spawnRubble(ctx, { x: c.x + (normal?.x ?? 0) * (G.T + 0.4), y: 0.02, z: c.z + (normal?.z ?? 0) * (G.T + 0.4) }, rollDrops(ctx, mat, kind), `${m.name} rubble`)
  }
  pop(w.u, w.v)
  for (let pass = 0; pass < V.rows; pass++) for (let v = 1; v < V.rows; v++) for (let u = 0; u < V.cols; u++)
    if (!gone(u, v) && gone(u, v - 1) && gone(u - 1, v) && gone(u + 1, v)) pop(u, v)
  let all = true; for (let u = 0; u < V.cols && all; u++) for (let v = 0; v < V.rows; v++) if (!gone(u, v)) { all = false; break }
  if (all) { for (let u = 0; u < V.cols; u++) for (let v = 0; v < V.rows; v++) delete st.broken[`${w.key}:${u}:${v}`]; st.broken[w.key] = ctx.now() }
  ctx.emit('screenShake', { intensity: 0.15, duration: 0.2 }, { audience: { nearby: at, radius: 6 } })
  syncWalls(ctx)
  return true
}
// the swing / shot reaching the world: rays from chest and waist along the aim. Returns true when it struck structure.
export function strike(ctx, s, wp, kind, base, fwd, pitch = 0) {
  const p = ctx.self.feetPosition, cls = classOf(wp, kind)
  const reach = wp.ranged ? Math.min(wp.range ?? 30, 40) : (wp.reach ?? 1.2) + 0.9
  const cp = Math.cos(pitch), dir = { x: fwd.x * cp, y: Math.sin(pitch), z: fwd.z * cp }
  let hit = null
  for (const [y, d] of [[1.45, dir], [0.6, { x: fwd.x, y: 0, z: fwd.z }]]) {
    hit = raycast(ctx, { x: p.x, y: p.y + y, z: p.z }, d, { distance: reach, ignoreEntities: [ctx.self.id], physicsOnly: true })
    if (hit) break
  }
  if (!hit?.id) return false
  const mul = (B.materials.drywall.mul[cls] ?? 1)
  const fac = (wp.ranged ? 1 : strFactor(s)) * (kind === 'fists' ? B.fistsMul : 1)
  if (hit.id === 'level0') {
    const w = wallKeyAt(hit.position, hit.normal); if (!w) return false
    return damageWall(ctx, w, base * mul * fac, hit.position, hit.normal, kind)
  }
  const gname = gridOfObj(hit.id), patch = !gname && String(hit.id).startsWith('wp-') ? ctx.getObject(hit.id) : null
  if (gname || patch) {
    const G = GRIDS[gname ?? Object.keys(GRIDS).find((k) => ctx.place.objects[GRIDS[k].obj])]; if (!G) return false
    const w = gridWallAt(G, hit.position, hit.normal, patch?.state?.wall); if (!w) return false
    const m = B.materials[w.mat] ?? B.materials.drywall
    return damageWall(ctx, w, base * (m.mul[cls] ?? 1) * (m.toolMul?.[toolOf(kind)] ?? 1) * fac, hit.position, hit.normal, kind)
  }
  const o = ctx.getObject(hit.id)
  let t = o
  while (t && !t.tags?.includes('breakable') && t.parent?.id) t = ctx.getObject(t.parent.id)
  if (!t?.tags?.includes('breakable') || t.state?.broke) return false
  const m = B.materials[t.state?.mat ?? 'wood'] ?? B.materials.wood
  return damageEntity(ctx, t, base * (m.mul[cls] ?? 1) * (m.toolMul?.[toolOf(kind)] ?? 1) * fac, hit.position, hit.normal, kind)
}
