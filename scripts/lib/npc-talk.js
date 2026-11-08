import { styleOf, temperOf } from './personality.js'
import { addressFor } from './address.js'
import { lifeOf } from './npc-life.js'
import LORE from './data/npc-lore.yml'
import { vo } from './voices.js';
// Free talk with NPCs: who they are, what the model is told, how its answer is read, the skill roll,
// and the trader's prices. Pure helpers: scripts/talk.js (on the player) does the calling and the writes.
// Numbers live in data/talk.yml and data/shops.yml.
import T from './data/talk.yml'
import SH from './data/shops.yml'
import W from './weapons.js'
import { parseCloth } from './clothes.js'
import { skillsOf } from './stats.js'

export const TALK = T, SHOPS = SH
export const CHECKS = ['speech', 'barter', 'melee', 'unarmed', 'medicine', 'survival', 'guns', 'sneak']
export const INTENTS = ['none', 'join', 'leave', 'trade_discount', 'gift', 'hostile']
export const MOODS = ['calm', 'happy', 'annoyed', 'angry', 'scared']
export const nameOf = (it) => String(it?.state?.name ?? 'Stranger').split(' ·')[0]
export const keyOf = (pl) => pl.userId ?? pl.id
export const isTrader = (it) => SH.roles.includes(it?.state?.role)
export const faction = (it, place) => { const id = String(it?.id ?? '').split('/').pop(); if (it?.state?.factionName) return it.state.factionName; return id.startsWith('tbd') ? 'T.B.D. (hoarders who only trade for strange useless objects)' : id.startsWith('amor') ? 'Amor Incrementum (a tiny agricultural cult that grows mold and distrusts outsiders)' : id.startsWith('l4-') ? 'none, a wanderer living in an office on Level 4' : id.startsWith('surv') || place === 'level2' ? 'Survivor' : 'M.E.G.' }
const DEFV = { scout: 'ale', medic: 'ortiz', quarter: 'callum' }
export const voiceOf = (it) => it?.state?.voice ?? DEFV[it?.state?.role] ?? `${String(it?.id ?? 'x').split('/').pop()}#${(it?.state?.wear?.sex ?? it?.state?.look?.sex) === 'f' ? 'f' : 'm'}` // no cast voice: their own, from the pool
export const VO = (who, line) => vo(who, line)
const feel = (r) => (r <= -60 ? 'you hate them' : r <= -25 ? 'you dislike them' : r < 10 ? 'neutral, you barely know them' : r < 40 ? 'you like them okay' : r < 70 ? 'you like them' : 'you trust them a lot')

// a stable life story for anyone without a written persona: origin, time down here, a want, a fear, a habit
function backstory(id) { const L = lifeOf(id); return `${L.origin}. Been in the Backrooms ${L.years}. Wants ${L.want}. Scared of ${L.fear}. ${L.quirk}.` }
export function systemPrompt({ it, place, pl, rapport, following }) {
  const sk = skillsOf(pl.state ?? {}), id = String(it.id).split('/').pop()
  const persona = T.personas[id] ?? backstory(id)
  const lv = LORE.levels[place] ?? '', fac = LORE.factions[it.state?.faction] ?? ''
  const mem = it.state?.mem?.[keyOf(pl)] ?? null
  const call = addressFor(it, pl, mem), known = !!mem?.named
  const nameLine = known ? `Their name is ${pl.displayName}; they told you.` : `You do NOT know their name; they never told you. Never use or guess it. You call them "${call}" (or nothing), the way you'd naturally address a stranger. If they tell you their name, use it from then on.`
  const memLine = mem ? `You have met them ${mem.met} time${mem.met === 1 ? '' : 's'} before.${mem.notes?.length ? ' What you remember about them: ' + mem.notes.join('; ') + '.' : ''}` : `You have never met them before. Treat them as a stranger.`
  const seen = (it.state?.sawKill ? `You saw a killing recently${it.state.sawKill.by === pl.id ? ', and it was THIS person who did it' : ''}. ` : '') + (it.state?.angry?.[pl.id] ? 'They wronged you before. ' : '')
  return [
    `You are voicing one character in a grim multiplayer survival game set in the Backrooms. Never break character.`,
    `Who you are: ${persona}`, `Your temperament: ${temperOf(it)}: ${styleOf(it)}. Let it color every line: word choice, rhythm, what you notice.`,
    `What you know of this place: ${lv}`, fac ? `Your people: ${fac}` : '', `Memory: ${memLine} ${seen}Bring up what you remember when it fits, the way a person would.`,
    `Faction: ${faction(it, place)}. Job: ${it.state?.role ?? 'none'}. Where you are: ${T.places[place] ?? place}.`,
    `Talking to you: a wanderer. ${nameLine} Level ${pl.state?.level ?? 1}. How good they are (0-100): speech ${sk.speech}, barter ${sk.barter}, melee ${sk.melee}, medicine ${sk.medicine}. A low number means clumsy, a high one means smooth.`,
    `How you feel about them: ${rapport} on a -100..100 scale (${feel(rapport)}).${following ? ' They talked you into travelling with them and you are with them now.' : ''}`,
    `What you can do, as intent: join (agree to travel with them; only if they really earned it), leave (stop travelling with them), trade_discount (agree to better prices), gift (hand them some small supply), hostile (you are done and will fight them; only after real threats or cruelty), none.`,
    `If they try to persuade, haggle, intimidate, lie or charm you about something that matters, add check: { skill (one of ${CHECKS.join(', ')}), difficulty 20-95 } plus failReply, what you say if they blow it. The game rolls their skill + d20 against the difficulty; your reply is what you say if they pass.`,
    `How you talk: like someone who's been stuck down here a long time, not a writer. Usually one or two short lines. Fragments are fine. Trail off, change the subject, answer a question with a question, or don't answer at all if you don't want to. Say the specific thing (which hallway, whose boots, what the soup cost you), never the general one. Use your own little habits of speech and repeat them. You can be wrong, petty, distracted, funny or curt.`,
    `Never sound like an assistant or a narrator: no "I understand", "great question", "feel free", "stay safe out there", "it's important to", "in the Backrooms, ...", no tidy summaries, no offering help unprompted, no flowery description, no em-dashes, no ending on a moral. Don't explain lore they didn't ask about. Never mention games, numbers, rapport, skills or rolls.`,
    `Choices are what THIS wanderer might say next to you, in their voice, short (under 8 words), fitting this place and this moment: if the level is safe, nobody asks what to avoid. Mix one practical, one personal, one blunt or odd.`,
    `Answer with JSON only: {"reply":"...","mood":"calm|happy|annoyed|angry|scared","rapportDelta":-30..30,"intent":"none|join|leave|trade_discount|gift|hostile","check":{"skill":"speech","difficulty":50},"failReply":"...","remember":"one short fact worth keeping about them from this exchange, or empty","choices":["brief follow-up player prompt 1","brief follow-up player prompt 2","brief follow-up player prompt 3"]} (check, failReply and choices only when appropriate).`,
  ].join('\n')
}

export function userMessage(history, text, who) {
  const lines = (history ?? []).slice(-T.memory).map(([w, t]) => `${w === 'p' ? who : w === 'n' ? 'You' : '(' + t + ')'}${w === 'x' ? '' : ': ' + t}`)
  return `${lines.length ? 'The conversation so far:\n' + lines.join('\n') + '\n\n' : ''}${who} says: ${text}\n\nYour JSON:`
}

const clean = (t) => String(t ?? '').replace(/\s+/g, ' ').replace(/^["']|["']$/g, '').trim().slice(0, 260)
// whatever the model said, only these fields in these ranges come out
export function parseReply(text) {
  let o = null
  const s = String(text ?? ''), a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) { try { o = JSON.parse(s.slice(a, b + 1)) } catch { o = null } }
  if (!o || typeof o.reply !== 'string' || !o.reply.trim()) return null
  const d = Math.max(-T.deltaCap, Math.min(T.deltaCap, Math.round(Number(o.rapportDelta) || 0)))
  const c = o.check && CHECKS.includes(String(o.check.skill).toLowerCase()) ? { skill: String(o.check.skill).toLowerCase(), difficulty: Math.max(10, Math.min(110, Math.round(Number(o.check.difficulty) || 50))) } : null
  const remember = typeof o.remember === 'string' ? clean(o.remember).slice(0, 90) : ''
  const choices = Array.isArray(o.choices) ? o.choices.filter((x) => typeof x === 'string' && x.trim()).map((x) => clean(x)).slice(0, 4) : null
  return {
    reply: clean(o.reply), failReply: c ? clean(o.failReply) || null : null,
    mood: MOODS.includes(o.mood) ? o.mood : 'calm', rapportDelta: d,
    intent: INTENTS.includes(o.intent) ? o.intent : 'none', check: c,
    choices, remember,
  }
}

// a skill roll: skill + 1..roll against difficulty, judged here, never by the model
export function rollCheck(ctx, s, check) {
  const v = skillsOf(s)[check.skill] ?? 0, r = 1 + Math.floor(ctx.random() * T.roll)
  return { ok: v + r >= check.difficulty, v, r }
}

// ---- trading ----
export function stockOf(it) { const id = String(it.id).split('/').pop(); return SH.shops[id] ?? SH.shops.default }
export function freshStock(it) { return Object.fromEntries(stockOf(it).map(([t, n, p]) => [t, [n, p]])) }
export const buyPrice = (base, barter, disc = 0) => Math.max(1, Math.round(base * (SH.buyMul - barter / SH.barterDiv) * (1 - disc)))
export const sellPrice = (base, barter) => Math.max(1, Math.round(base * SH.sellShare * (0.75 + barter / SH.barterDiv)))
const csv = (v) => String(v ?? '').split(',').filter(Boolean)
// what a player can sell, one row per kind: [token, have, base]
// the shop's sections, from a token's shape
export const SECTIONS = [['weapon', 'WEAPONS'], ['ammo', 'AMMO'], ['aid', 'MEDICAL'], ['food', 'FOOD & DRINK'], ['cloth', 'APPAREL'], ['gear', 'GEAR & PARTS']]
export function sectionOf(t) {
  if (t.startsWith('weapon:')) return 'weapon'
  if (t.startsWith('cloth:')) return 'cloth'
  if (t === 'ammo' || t === 'shells') return 'ammo'
  if (['bandage', 'firstaid', 'kit', 'tape'].includes(t)) return 'aid'
  if (t.startsWith('meat:') || t === 'almond' || ['ration', 'royal_ration', 'beans', 'bar', 'lobby_wafer'].includes(t)) return 'food'
  return 'gear'
}
export const money = (c) => '$' + (Math.max(0, c ?? 0) / 100).toFixed(2)
export function sellables(s) {
  const out = [], P = SH.sell
  if ((s.almonds ?? 0) > 0) out.push(['almond', s.almonds, P.almond ?? 3])
  if ((s.ammo ?? 0) >= W.ammo.perPickup) out.push(['ammo', Math.floor(s.ammo / W.ammo.perPickup), P.ammo])
  if ((s.shells ?? 0) >= W.shells.perPickup) out.push(['shells', Math.floor(s.shells / W.shells.perPickup), P.shells])
  for (const [k, f] of [['fuse', 'fuses'], ['valve', 'valves'], ['keycard', 'keycards'], ['firesalt', 'firesalt']]) if ((s[f] ?? 0) > 0) out.push([k, s[f], P[k]])
  const ws = {}; for (const k of csv(s.weapons)) if (k !== 'fists' && W[k]) ws[k] = (ws[k] ?? 0) + 1
  for (const [k, n] of Object.entries(ws)) out.push(['weapon:' + k, n, P.weapon[W[k].rarity] ?? P.weapon.common])
  const cs = {}; for (const t of csv(s.clothes)) if (parseCloth(t)) cs[t] = (cs[t] ?? 0) + 1
  for (const [t, n] of Object.entries(cs)) out.push([t, n, P.cloth[parseCloth(t).row.rarity] ?? P.cloth.common])
  return out
}
// take one of a sellable out of the player's state; false if they don't have it
export function removeOne(s, token) {
  if (token === 'almond') { if (!((s.almonds ?? 0) > 0)) return false; s.almonds -= 1; return true }
  if (token === 'ammo') { if ((s.ammo ?? 0) < W.ammo.perPickup) return false; s.ammo -= W.ammo.perPickup; return true }
  if (token === 'shells') { if ((s.shells ?? 0) < W.shells.perPickup) return false; s.shells -= W.shells.perPickup; return true }
  const F = { fuse: 'fuses', valve: 'valves', keycard: 'keycards', firesalt: 'firesalt' }[token]
  if (F) { if (!((s[F] ?? 0) > 0)) return false; s[F] -= 1; return true }
  if (token.startsWith('weapon:')) {
    const k = token.slice(7), ws = csv(s.weapons), i = ws.indexOf(k); if (i < 0) return false
    ws.splice(i, 1); s.weapons = ws.join(',')
    if (s.equipped === k && !ws.includes(k)) s.equipped = 'fists'
    return true
  }
  if (token.startsWith('cloth:')) { const cs = csv(s.clothes), i = cs.indexOf(token); if (i < 0) return false; cs.splice(i, 1); s.clothes = cs.join(','); return true }
  return false
}
