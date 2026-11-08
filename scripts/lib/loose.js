// Loose things answer being hit, kicked, thrown or shot by what they're made of (scripts/lib/data/loose.yml):
// glass shatters, bottles spill a slick, plates crack, cans crumple, wood splinters, electronics spark,
// cakes splat, poppers burst confetti, balloons pop, candles snuff, extinguishers spray and rocket off, gas blows up.
import L from './data/loose.yml'
import { heard } from './hear.js'
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const NOT = ['wall', 'gridwall', 'level0', 'npc', 'player', 'critter', 'door', 'remains', 'wreck', 'container', 'l8-hostile', 'partygoer']
const K = Object.entries(L.kinds)
const words = (o) => `${o.id} ${o.state?.name ?? ''} ${o.state?.kind ?? ''}`.toLowerCase()
export function looseOf(o) {
  if (!o || NOT.some((t) => o.tags?.includes(t))) return null
  if (o.state?.loose) return L.kinds[o.state.loose] ? { key: o.state.loose, ...L.kinds[o.state.loose] } : null
  const w = words(o)
  for (const [key, k] of K) if (k.match.some((m) => new RegExp(`(^|[^a-z])${m}`).test(w))) return { key, ...k }
  return null
}
// give it the breakable tags once, so swings, shots and throws find it
export function arm(o) {
  const k = looseOf(o); if (!k) return null
  if (!o.tags.includes('breakable')) o.tags = [...o.tags, 'breakable']
  o.state.loose ??= k.key; o.state.mat ??= k.mat; o.state.hp ??= k.hp; o.state.maxHp ??= k.hp
  if (k.act === 'bounce' || k.act === 'crumple') o.state.stayGone = true
  return k
}
const fx = (ctx, at, script, params) => ctx.emit('fx', { position: at, script, params })
const SHARDS = (c) => `fx
pop shard burst=26..38 on=sphere(.15) life=.9..1.6 v=sdir()*(2..4.5)+up(1..2.5) size=.015..0.05 spin=-14..14 acc=grav()+drag(.3) col=<${c}> a=.85 sz=$size rot=$age*$spin floor=stick r=mesh(box,1,.1,.7)
pop glint burst=10 on=sphere(.2) life=.25..0.5 v=sdir()*(1..2) size=.03..0.06 col=hdr(3,3,3) a=1>0 sz=$size r=sprite(soft-disc,add)`
const SPILL = `fx
pop drops burst=20..30 on=sphere(.1) life=.5..0.9 v=sdir()*(1..2.5)+up(.8..1.6) size=.03..0.06 acc=grav() col=<.75,.6,.3> a=.8 sz=$size floor=die r=sprite(soft-disc,alpha)`
const CONFETTI = `fx
pop bit burst=60..80 on=sphere(.1) life=1.6..2.6 v=sdir()*(2..4)+up(2..4) size=.03..0.05 spin=-10..10 acc=grav()*.35+drag(1.6)+curl(.6) tint=<1,.3,.5>..<.3,.8,1> col=$tint a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=mesh(box,1,.05,.6)
pop bang burst=1 life=.15 r=light(<1,.85,.6>,20,6)`
const SPARKS = `fx
pop spark burst=30..44 life=.2..0.6 v=sdir()*(3..6)+up(1..2) size=.015..0.03 acc=grav()*.6 col=hdr(5,3,1)>hdr(2,.7,.1) a=1>0 sz=$size floor=bounce(.3) r=sprite(ember,add,velocity,.03)
pop smoke burst=6 on=sphere(.2) life=1.5..2.5 v=up(.4..0.8) size=.3..0.5 acc=buoy(.3)+drag(1) col=<.2,.2,.22> a=0>.4:.2>.6:.2>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)
pop arc burst=1 life=.3 r=light(<.6,.75,1>,14,6)`
const SPLAT = `fx
pop gob burst=22..30 on=sphere(.15) life=.6..1 v=sdir()*(1.5..3)+up(.5..1.5) size=.05..0.12 acc=grav() tint=<1,.92,.85>..<1,.55,.7> col=$tint a=1 sz=$size floor=stick r=sprite(soft-disc,alpha)`
const POOF = `fx
pop poof burst=1 life=.1 r=light(<1,.8,.6>,4,3)
pop wisp burst=4 life=1..1.6 v=up(.3..0.6) size=.05..0.1 acc=buoy(.4)+curl(.3) col=<.6,.6,.6> a=0>.4:.3>0 sz=$size*(1>4) r=sprite(smoke-puff,alpha)`
const BOOM = `fx
pop fire burst=40..55 on=sphere(.4) life=.4..0.9 v=sdir()*(3..7)+up(1..3) size=.4..0.9 acc=drag(2.4)+buoy(1) col=hdr(5,2.6,.8)>hdr(2,.6,.1)>hdr(.3,.1,.03) a=1>.6:1>0 sz=$size*(.5>1.6) rot=spin(.4) r=sprite(flame-wisp,add)
pop smoke burst=20 on=sphere(.6) life=2..3.5 v=sdir()*(1..2.5)+up(1.5..3) size=.8..1.4 acc=buoy(.6)+drag(1.1)+curl(.4) col=<.12,.11,.1> a=0>.6:.15>.6:.3>0 sz=$size*(.6>2.6) r=sprite(smoke-puff,alpha)
pop debris burst=18 life=1..1.8 v=sdir()*(5..9)+up(2..4) size=.04..0.1 spin=-10..10 acc=grav() col=<.25,.24,.22> a=1 sz=$size rot=$age*$spin floor=bounce(.3) r=mesh(box,1,.5,.8)
pop flash burst=1 life=.35 r=light(<1,.6,.25>,60,14)`
const SPRAY = `fx
pop jet rate=90 on=point() life=.5..0.9 v=<%dir|0,0,1>*(5..8)+sdir()*.6 size=.15..0.3 acc=drag(2.2)+buoy(.2) col=<.95,.96,.98> a=.7>.3:.5>0 sz=$size*(.5>3) r=sprite(smoke-puff,alpha)`
// one hard knock (a landing, a throw striking, a kick): breaks it if the energy clears its kind's bar
export function impact(ctx, o, speed, kg, at) {
  const k = arm(o); if (!k || o.state.broke) return false
  const e = 0.5 * (kg ?? k.kg) * speed * speed
  if (k.act === 'bounce') { if (speed > 3) heard(ctx, { clip: SND('plastic-cup-clatter-bounce'), position: at, volume: Math.min(0.9, speed / 10), maxDistance: 14 }); if (o.tags.includes('breakable') && /hat/.test(words(o))) ctx.emit('squash', { target: o.id, axis: 'y', intensity: 0.4, duration: 0.25 }); return false }
  if (e < k.breakAt) { if (speed > 2.5) heard(ctx, { clip: SND(k.mat === 'glass' ? 'glass-bottle-clink-knock' : k.mat === 'wood' ? 'wood-furniture-thump-knock' : 'metal-object-clunk-drop'), position: at, volume: Math.min(0.8, speed / 9), maxDistance: 14 }); return false }
  breakIt(ctx, o, k, at, { x: 0, y: 1, z: 0 })
  return true
}
// it breaks: its own act. Returns true when the act owns what's left (no generic rubble)
export function breakIt(ctx, o, k, at, n) {
  k ??= looseOf(o); if (!k) return false
  o.state.broke = true
  const p = at ?? { x: o.feetPosition.x, y: o.feetPosition.y + 0.3, z: o.feetPosition.z }
  switch (k.act) {
    case 'shatter': fx(ctx, p, SHARDS(k.mat === 'glass' ? '.75,.85,.82' : '.92,.9,.86')); heard(ctx, { clip: SND(k.mat === 'glass' ? 'glass-shatter-tinkle' : 'ceramic-plate-smash-shards'), position: p, volume: 0.9, maxDistance: 24 }); break
    case 'spill': fx(ctx, p, SHARDS('.4,.55,.35')); fx(ctx, p, SPILL); heard(ctx, { clip: SND('glass-bottle-smash-liquid-splash'), position: p, volume: 0.9, maxDistance: 24 })
      ctx.spawn({ tags: ['soupslick'], behavior: 'scripts/soup-slick.js', lifetime: 40, feetPosition: { x: p.x, y: o.feetPosition.y + 0.01, z: p.z }, primitive: { kind: 'circle', radius: 0.7 }, rotation: { pitch: -90 }, material: { color: 'oklch(0.55 0.08 80 / 0.55)', roughness: 0.05, transparent: true }, physics: { body: 'static', trigger: true } }); break // a slick: walkers lose their feet
    case 'confetti': case 'pop': fx(ctx, p, CONFETTI); heard(ctx, { clip: SND(k.act === 'pop' ? 'balloon-pop-loud' : 'party-popper-bang-confetti'), position: p, volume: 1, maxDistance: 30 }); ctx.emit('noise', { position: p, radius: 16, kind: 'pop' }, { audience: { nearby: p, radius: 16 } }); break
    case 'splat': fx(ctx, p, SPLAT); heard(ctx, { clip: SND('wet-cake-splat'), position: p, volume: 0.8, maxDistance: 16 }); break
    case 'snuff': fx(ctx, p, POOF); heard(ctx, { clip: SND('candle-blown-out-puff'), position: p, volume: 0.5, maxDistance: 8 }); if (o.light) o.light = null; if (o.fx) o.fx = null; o.state.broke = false; o.state.hp = k.hp; return 'keep'
    case 'crumple': ctx.emit('squash', { target: o.id, axis: 'y', intensity: 0.5, duration: 0.2 }); o.scale = { x: 1.15, y: 0.45, z: 1.15 }; heard(ctx, { clip: SND('aluminum-can-crush-crumple'), position: p, volume: 0.8, maxDistance: 14 }); o.state.broke = false; o.state.hp = 999; o.state.loose = 'plastic'; return 'keep'
    case 'dent': ctx.emit('shake', { target: o.id, intensity: 0.1, duration: 0.3 }); heard(ctx, { clip: SND('metal-sheet-clang-hit'), position: p, volume: 0.9, maxDistance: 20 }); return false
    case 'spark': fx(ctx, p, SPARKS); heard(ctx, { clip: SND('electronics-smash-sparks-buzz'), position: p, volume: 0.9, maxDistance: 22 }); return false
    case 'splinter': return false // the old crumble: wood chunks, scrap wood and nails
    case 'spray': { // the valve shears: white jet, and the can rockets off along it
      const a = ctx.random() * Math.PI * 2, d = { x: Math.cos(a), y: 0.35, z: Math.sin(a) }
      o.physics = { body: 'dynamic', collider: 'box', mass: k.kg, friction: 0.4 }
      o.velocity = { x: -d.x * L.spray.thrust, y: 3, z: -d.z * L.spray.thrust }
      o.fx = { script: SPRAY, params: { dir: d } }
      heard(ctx, { clip: SND('fire-extinguisher-burst-hiss-spray'), position: p, volume: 1, maxDistance: 30 })
      for (const m of ctx.query({ anyTags: ['npc', 'hound', 'smiler', 'lurker', 'stealer', 'partygoer', 'l8-hostile'], center: p, radius: 3.5 })) if (m.state) m.state.stunUntil = ctx.now() + 1800 // blinded in the cloud
      ctx.after(L.spray.seconds, 'looseSpent', { id: o.id })
      return 'keep'
    }
    case 'explode': {
      fx(ctx, p, BOOM); heard(ctx, { clip: SND('gas-canister-explosion-boom'), position: p, volume: 1, maxDistance: 60 })
      ctx.emit('shockwave', { position: p, speed: 18, thickness: 0.6, intensity: 1 }, { audience: { nearby: p, radius: 40 } })
      ctx.emit('screenShake', { intensity: 0.6, duration: 0.5 }, { audience: { nearby: p, radius: 18 } })
      ctx.emit('noise', { position: p, radius: 40, kind: 'explosion' }, { audience: { nearby: p, radius: 40 } })
      const R = L.explode.radius
      for (const t of ctx.query({ center: p, radius: R })) {
        if (t.id === o.id) continue
        const h = ctx.getObject(t.id); if (!h || !h.state) continue
        const dx = t.feetPosition.x - p.x, dz = t.feetPosition.z - p.z, dist = Math.hypot(dx, dz) || 0.1, f = 1 - dist / R, dmg = Math.round(L.explode.damage * f)
        if (dmg <= 0) continue
        if (h.tags?.includes('player') || h.tags?.includes('npc') || h.tags?.includes('l8-hostile') || h.tags?.includes('partygoer') || ['hound', 'smiler', 'lurker', 'stealer'].some((x) => h.tags?.includes(x))) {
          h.state.hp = (h.state.hp ?? 60) - dmg
          if (!h.tags.includes('player')) h.state.down = { x: (dx / dist) * 8 * f, z: (dz / dist) * 8 * f, at: ctx.now(), ms: 1200, fly: true, y0: h.feetPosition.y }
          ctx.emit('damageNumber', { position: { x: t.feetPosition.x, y: t.feetPosition.y + 1.6, z: t.feetPosition.z }, value: dmg, color: '#ff8a3a' })
        } else if (h.tags?.includes('breakable') && h.id !== o.id && !h.state.broke) { const kk = looseOf(h); if (kk && kk.act !== 'explode') impact(ctx, h, 12 * f, kk.kg, t.feetPosition); else h.state.hp = (h.state.hp ?? 60) - dmg * 2 }
      }
      return false
    }
  }
  return false
}
// a kick on a loose thing in front: it flies, and lands hard
export function kickLoose(ctx, f, s) {
  const p = ctx.self.feetPosition
  let best = null, bd = L.kick.reach
  for (const t of ctx.query({ radius: L.kick.reach + 0.5 })) {
    const o = ctx.getObject(t.id); if (!o || o.parent || o.state?.broke) continue
    const dx = t.feetPosition.x - p.x, dz = t.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > bd || (d > 0.3 && (dx * f.x + dz * f.z) / d < 0.55)) continue
    const k = looseOf(o); if (!k || k.kg > 30) continue
    const b = o.bounds?.size; if (b && b.x * b.y * b.z > 1.5) continue
    best = o; bd = d
  }
  if (!best) return false
  const k = arm(best), hard = 1 + ((s?.attr ? 0 : 0)), sp = L.kick.speed * hard / Math.max(1, Math.sqrt(k.kg / 2))
  best.physics = { body: 'dynamic', collider: 'box', mass: k.kg, friction: 0.6 }
  best.velocity = { x: f.x * sp, y: 2.5, z: f.z * sp }
  const at = { x: best.feetPosition.x, y: best.feetPosition.y + 0.3, z: best.feetPosition.z }
  if (k.breakAt <= 2) breakIt(ctx, best, k, at) // a popper, a balloon: the boot sets it off
  else track(ctx, best, k.kg)
  heard(ctx, { clip: SND('kick-object-thud'), position: at, volume: 0.8, maxDistance: 16 })
  ctx.emit('cameraPunch', { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.2 }, { audience: { player: ctx.self.id } })
  return true
}
// flights: anything thrown or kicked by this player, watched until it lands; a hard stop is an impact
export function track(ctx, o, kg) { const fl = (ctx.self.session.loose ??= {}); fl[o.id] = { at: ctx.now(), kg, last: 0 } }
export function stepFlights(ctx) {
  const fl = ctx.self.session.loose; if (!fl) return
  for (const id of Object.keys(fl)) {
    const r = fl[id], o = ctx.getObject(id), age = ctx.now() - r.at
    if (!o || age > 4000 || o.state?.broke) { delete fl[id]; continue }
    const v = o.velocity ?? { x: 0, y: 0, z: 0 }, sp = Math.hypot(v.x, v.y, v.z)
    if (age > 120 && r.last > 3 && sp < r.last * 0.45) { impact(ctx, o, r.last, r.kg, { x: o.feetPosition.x, y: o.feetPosition.y + 0.2, z: o.feetPosition.z }); delete fl[id]; continue }
    if (age > 400 && sp < 0.6) { delete fl[id]; continue }
    r.last = sp
  }
}
