// What an NPC calls you. Nobody knows your name on sight: until you tell them (mem.named), each person uses their own word,
// picked once from who they are (faction, job) and seeded by their id, so the same medic always calls you "hon".
const BY = {
  surrender: ['lamb', 'little fish', 'dry one', 'pilgrim', 'offering'],
  meg: ['wanderer', 'civilian', 'wanderer', 'traveler', 'unregistered'],
  homely: ['dear', 'neighbor', 'love', 'sweetheart'],
  medic: ['hon', 'patient', 'kiddo', 'friend'],
  trader: ['customer', 'friend', 'buddy', 'pal'],
  scout: ['wanderer', 'stranger', 'rookie', 'you', 'fresh meat'],
  quarter: ['newcomer', 'stranger', 'wanderer'],
  psychic: ['lost one', 'dreamer', 'drifter'],
  socialite: ['darling', 'sweetie', 'my dear'],
  any: ['stranger', 'wanderer', 'kid', 'pal', 'friend', 'buddy', 'drifter', 'you there', 'mister', 'chief', 'traveler'],
}
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }
export function termFor(it) {
  const st = it.state ?? {}, id = String(it.id).split('/').pop()
  if (st.callYou) return st.callYou
  const pool = BY[st.faction] ?? BY[st.role] ?? BY.any
  const h = hash(id)
  return (h % 3 === 0 ? BY.any : pool)[h % (h % 3 === 0 ? BY.any : pool).length]
}
export function addressFor(it, pl, mem) {
  return mem?.named && pl?.displayName ? pl.displayName : termFor(it)
}
// does the player's line tell them their name?
export function saysName(text, name) {
  if (!name) return false
  const t = String(text).toLowerCase(), n = name.toLowerCase()
  return t.includes(n) && /\b(i'?m|i am|my name|name'?s|call me|it'?s)\b/.test(t) || t.trim() === n
}
