// The wanderer's HALOGEN stats (scripts/lib/stats.js): the character sheet (K), spending attribute and skill
// points, slow HP regeneration from Endurance, and reading the creature you look at (state.target, drawn by
// scripts/stats-ui.js). The effects themselves are applied where they matter: scripts/player.js (damage, speed,
// stamina, reload, carry weight), the creatures' scripts (their own attributes) and scripts/interact.js (Scavenge).
import { getInputRay, raycast } from 'builtin/physics'
import { ATTRS, SKILLS, ATTR_MAX, SKILL_MAX, START, attrsOf, spentOf, skillsOf, tagsOf, derived, packAttrs, npcMul } from './lib/stats.js'
import L0 from './lib/data/level0.yml'
import L1 from './lib/data/level1.yml'
import G from './lib/data/meg.yml'
// what one hit from each kind takes off you, before its own Hardiness: shown as a plain DAM number
const HIT = { smiler: L0.biteDamage, lurker: L0.lurkerBite, hound: L1.houndBite, stealer: L1.stealerHit, npc: G.playerShot }

const FOES = [['smiler', 'Smiler'], ['lurker', 'Lurker'], ['hound', 'Hound'], ['stealer', 'Stranger'], ['npc', 'M.E.G. agent']]
const mem = (ctx) => (ctx.self.session.stats ??= { ray: null, acc: 0, key: '' })

export function onInput(ctx, input) {
  const s = ctx.self.state, m = mem(ctx)
  const ray = getInputRay(ctx, input); if (ray) m.ray = ray
  if (s.level == null) return
  if (input.pressed?.sheet) { s.sheetOpen = !s.sheetOpen && !s.lootOpen; if (s.sheetOpen) s.invOpen = false }
  const d = input.actionData?.stat
  if (input.pressed?.stat && d && typeof d.k === 'string') spend(s, d)
}

export function spend(s, d) {
  if (d.k === 'close') { s.sheetOpen = false; return }
  const i = Number(d.i)
  if (d.k === 'attr' && i >= 0 && i < ATTRS.length && (s.apts ?? 0) > 0) {
    const a = attrsOf(s), key = ATTRS[i].k
    if (a[key] >= ATTR_MAX) return
    a[key] += 1; s.attr = packAttrs(a); s.apts -= 1
  } else if (d.k === 'skill' && i >= 0 && i < SKILLS.length && (s.spts ?? 0) > 0) {
    const sp = spentOf(s)
    if (skillsOf(s)[SKILLS[i].k] >= SKILL_MAX) return
    sp[i] += 1; s.skl = sp.join(','); s.spts -= 1
  } else if (d.k === 'tag' && i >= 0 && i < SKILLS.length && (s.tagsLeft ?? 0) > 0) { // tag a skill, once: +15
    const tg = tagsOf(s), key = SKILLS[i].k
    if (tg.includes(key)) return
    s.tags = [...tg, key].join(','); s.tagsLeft -= 1
  }
}

// the creature in the middle of the screen: near the look ray, with nothing solid between
function look(ctx, ray) {
  const o = ray.origin, dir = ray.direction
  let best = null, bestAng = 1e9
  for (const [tag, label] of FOES) for (const c of ctx.query({ tags: [tag], radius: 30 })) {
    if (c.state?.dead) continue
    const p = c.feetPosition, vx = p.x - o.x, vy = p.y + 1.0 - o.y, vz = p.z - o.z, dist = Math.hypot(vx, vy, vz)
    if (dist < 0.3 || dist > 28) continue
    const ang = Math.acos(Math.max(-1, Math.min(1, (vx * dir.x + vy * dir.y + vz * dir.z) / dist)))
    if (ang > Math.max(0.05, Math.atan(0.7 / dist)) || ang >= bestAng) continue
    if (raycast(ctx, o, { x: vx / dist, y: vy / dist, z: vz / dist }, { distance: dist - 0.3, physicsOnly: true, ignoreEntities: [c.id, ctx.self.id], bodies: 'static' })) continue
    best = { c, label, tag }; bestAng = ang
  }
  return best
}

export function update(ctx, dt) {
  const s = ctx.self.state, m = mem(ctx)
  if (s.level == null) return
  if (s.attr == null) Object.assign(s, START) // a new wanderer: 5 in everything, 5 points, three skills to tag
  else if (s.sver !== 2) { // an older sheet: attributes stay, skills become the thirteen Fallout-style ones with their points
    const n = attrsOf(s).n
    Object.assign(s, { skl: START.skl, tags: '', tagsLeft: START.tagsLeft, sver: 2, spts: (s.level - 1) * (10 + Math.floor(n / 2)), apts: s.apts ?? 0 })
  }
  const dv = derived(s)
  if (s.hp > 0 && dv.hpRegen > 0 && !(s.downAt && ctx.now() - s.downAt < 3000)) { // slow regeneration, only up to 70% of max
    const cap = (100 + (s.level - 1) * 10 + dv.hpBonus) * 0.7
    if (s.hp < cap) s.hp = Math.min(cap, s.hp + dv.hpRegen * dt)
  }
  m.acc += dt
  if (m.acc < 0.25) return
  m.acc = 0
  let tgt = null
  if (m.ray && !s.sheetOpen && !s.lootOpen) {
    const f = look(ctx, m.ray)
    if (f) {
      const st = f.c.state ?? {}, ob = attrsOf(s).o, mu = npcMul(st)
      const hp = Math.max(0, Math.round(st.hp ?? 0)), mx = st.maxHp ?? hp
      tgt = { id: f.c.id, name: st.name ?? f.label, title: st.title ?? '', hp, mx, attr: ob >= 7 && st.attr ? st.attr : '', info: ob >= 5 && HIT[f.tag] ? `DAM ${Math.round(HIT[f.tag] * mu.dmg)}` : '' }
      if (ob < 3) { tgt.hp = -1 } // too unobservant to judge its health
    }
  }
  const key = tgt ? `${tgt.id}|${tgt.hp}|${tgt.attr}` : ''
  if (key !== m.key) { m.key = key; s.target = tgt }
}
