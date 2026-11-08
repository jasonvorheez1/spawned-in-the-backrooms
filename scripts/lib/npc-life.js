// one npc's life, stable from its id: shared by talk (the backstory it speaks from) and meg-agent (what it does about it)
import LORE from './data/npc-lore.yml'
const hash = (id) => { let h = 2166136261; for (const c of String(id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const pick = (a, h, k) => a[(h >>> k) % a.length]
export function lifeOf(id) {
  const h = hash(String(id).split('/').pop())
  return { origin: pick(LORE.origins, h, 0), years: pick(LORE.years, h, 3), want: pick(LORE.wants, h, 7), fear: pick(LORE.fears, h, 11), quirk: pick(LORE.quirks, h, 15) }
}
// which live things a fear reacts to (tags), and what they say in its grip
export const FEAR_TAGS = { hounds: ['hound'], smilers: ['smiler'], facelings: ['faceling', 'staff-faceling'], 'the sound behind the walls': ['lurker'], 'the dark when the lights die': ['lurker', 'smiler'] }
export const FEAR_LINES = ["no no no, not that.", "stay back. stay BACK.", "oh god. move, move.", "i can't. i can't do this again."]
// a line now and then when a player is near, from what they want
export const WANT_LINES = (w) => [`i just want ${w}.`, `not asking for much. ${w}.`, `some days it's all i think about. ${w}.`]
