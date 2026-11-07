// Crafting and survival (scripts/lib/data/craft.yml). Hunger and thirst fall with time; at 0 you waste away (hp stops at 1).
// Scrap becomes ammo, kits, batteries and fuses at your hands (Y) or at a workbench you built (B, then look at it and press E).
// Recipes are gated by a Fallout-style skill level, and spare skill points buy a chance of an extra item.
// State: player.state.hunger, thirst (0..100), craftOpen ('hand' | 'bench'), craftBench (the bench's id).
import { heard } from "./lib/hear.js";
import C from './lib/data/craft.yml'
import B from './lib/data/breakables.yml'
import { skillsOf, SKILLS, canCarry } from './lib/stats.js'
import { takeToken, gain } from './player.js'
import { recipeStatus, maxMakes, CATS } from './lib/craft.js'

const SKN = Object.fromEntries(SKILLS.map((k) => [k.k, k.name]))
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const note = (s, ctx, text) => { s.notice = { text, at: ctx.now() } }

export function onInput(ctx, input) {
  const s = ctx.self.state
  if (s.level == null) return
  if (input.pressed?.craft) { if (s.craftOpen) s.craftOpen = ''; else if (!s.lootOpen && !s.sheetOpen && !s.invOpen && !s.talkWith) { s.craftOpen = 'hand'; s.craftBench = '' } }
  const d = input.actionData?.make
  if (input.pressed?.make && d && typeof d.k === 'string') act(ctx, s, d)
}

function act(ctx, s, d) {
  if (d.k === 'close') { s.craftOpen = ''; return }
  if (d.k === 'tab') { if (CATS.some(([c]) => c === d.c)) s.craftTab = d.c; return }
  if (d.k !== 'make' || !s.craftOpen) return
  const id = String(d.id), r = C.recipes[id]; if (!r) return
  const st = recipeStatus(s, id)
  const deny = (t) => { note(s, ctx, t); heard(ctx, { clip: SND('ui-denied-click'), position: ctx.self.feetPosition, volume: 0.35, maxDistance: 8 }, { audience: { player: ctx.self.id } }) }
  if (!st.benchOk) return deny('Needs a workbench')
  if (!st.skillOk) return deny(`Needs ${SKN[r.skill[0]]} ${r.skill[1]}`)
  if (st.lack.length) return deny(`Missing ${st.lack.map((k) => B.scrap[k]?.name ?? k).join(', ')}`)
  const want = d.n === 'max' ? maxMakes(s, id) : Math.max(1, Math.min(10, +d.n || 1)) // ×1, ×5 or MAX from the menu
  let made = 0, extra = 0, why = ''
  for (let i = 0; i < want && maxMakes(s, id) > 0; i++) {
    const cw = canCarry(s, r.out[0] === 'ammo' ? 'ammo' : r.out[0]); if (!cw.ok) { why = cw.msg; break }
    const sc = { ...s.scrap }; for (const [k, n] of Object.entries(r.in)) sc[k] -= n; s.scrap = sc
    const out = [...r.out]
    if (r.skill && ctx.random() < Math.max(0, st.got - st.need) / 100) { out.push(r.out[0]); extra++ } // spare skill: an extra one
    for (const t of out) takeToken(ctx, t)
    made++
  }
  if (!made) return deny(why || 'Nothing made')
  gain(ctx, (r.skill?.[1] ?? 5) * 0.2 * made) // a little XP for every make, more for harder recipes (Savi's pick)
  note(s, ctx, `Made ${r.name}${made > 1 ? ' ×' + made : ''}${extra ? ` (+${extra} extra)` : ''}${why ? ' · ' + why : ''}`)
  heard(ctx, { clip: SND(r.bench ? 'hammer-nail-wood-build' : 'bandage-wrap-cloth'), position: ctx.self.feetPosition, volume: 0.6, maxDistance: 14 })
}

export function update(ctx, dt) {
  const s = ctx.self.state, m = (ctx.self.session.craft ??= { h: null, t: null, acc: 0 })
  if (s.level == null) return
  const N = C.needs
  if (m.h == null) { m.h = s.hunger ?? 100; m.t = s.thirst ?? 100 }
  if (ctx.self.place === 'level6') { m.h = s.hunger ?? m.h; m.t = s.thirst ?? m.t; return } // Shelly: no hunger or thirst drain in Level 6
  const mul = s.sprinting ? N.sprintMul : 1
  // the bars follow the state (eating and drinking write it from scripts/player.js)
  if (s.hunger != null && Math.abs(s.hunger - Math.round(m.h)) > 1) m.h = s.hunger
  if (s.thirst != null && Math.abs(s.thirst - Math.round(m.t)) > 1) m.t = s.thirst
  m.h = Math.max(0, m.h - N.hungerPerSec * mul * dt); m.t = Math.max(0, m.t - N.thirstPerSec * mul * dt)
  const h = Math.round(m.h), t = Math.round(m.t)
  if (h !== s.hunger) s.hunger = h
  if (t !== s.thirst) s.thirst = t
  if ((m.h <= 0 || m.t <= 0) && s.hp > 1) s.hp = Math.max(1, s.hp - N.starveHp * dt)
  if (m.h < N.low || m.t < N.low) s.sanity = Math.max(0, (s.sanity ?? 0) - N.lowSanity * dt)
  m.acc += dt
  if (m.acc >= 0.5) { // a bench you walk away from closes
    m.acc = 0
    if (s.payout) { const p = s.payout; s.payout = null; gain(ctx, p.xp ?? 0); for (const t of p.items ?? []) takeToken(ctx, t); if (p.text) s.notice = { text: p.text, at: ctx.now() } } // rewards other things owe you (Level 4's office tasks)
    if (s.craftOpen === 'bench') { const b = s.craftBench ? ctx.getObject(s.craftBench) : null, p = ctx.self.feetPosition; if (!b || Math.hypot(b.feetPosition.x - p.x, b.feetPosition.z - p.z) > 4.5) s.craftOpen = '' }
  }
}
