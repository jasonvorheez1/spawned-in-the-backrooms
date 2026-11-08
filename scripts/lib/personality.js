// Each NPC's temperament, seeded from its id (or state.temper): how they talk, how they greet, how they react to you.
// {u} is what they call you (lib/address.js). Reactions fire from the player's own talk.js social pass, once a minute per kind per person.
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }
export const TEMPERS = {
  warm: { style: 'kind and open, worries about people, softens bad news', hi: ['hey {u}. you okay?', 'oh, hi {u}.', 'there you are, {u}.'], drawn: ['hey, easy, {u}. put that down?', "you're scaring me a little, {u}."], hurt: ['oh no, you\'re bleeding. sit down a sec.', '{u}, you need patching up.'], sneak: ['...why are you creeping, {u}?'], close: ['hi. little close, but hi.'] },
  gruff: { style: 'short, blunt, grumbles, cares but hides it', hi: ['{u}.', 'mm. {u}.', 'what.'], drawn: ['point that somewhere else, {u}.', 'you swing that near me, you eat it.'], hurt: ["you look like hell. go get stitched.", "don't bleed on my stuff, {u}."], sneak: ['i hear you, {u}. stop that.'], close: ['back up.', 'personal space, {u}.'] },
  nervous: { style: 'jumpy, rambles, apologizes, expects the worst', hi: ['oh! oh. it\'s you. hi.', 'h-hey {u}.', "don't sneak up like that, {u}."], drawn: ['whoa whoa, okay, i didn\'t do anything!', 'please put that away please please'], hurt: ['is that blood? that\'s a lot of blood.', 'oh god, {u}, are you dying?'], sneak: ['AH. who, what, oh. you.'], close: ['um. hi. hello. why so close.'] },
  cocky: { style: 'brash, jokes, brags, teases', hi: ['look who crawled in. {u}!', 'sup, {u}.', "{u}! still alive? impressive."], drawn: ['ooh, scary. you even know how to use that?', 'cute weapon, {u}.'], hurt: ['ha, what hit you?', 'you look worse than the hounds, {u}.'], sneak: ['real stealthy, {u}. ninja.'], close: ['you wanna dance or what?'] },
  cold: { style: 'flat, distant, few words, watches you carefully', hi: ['...', '{u}.', 'hm.'], drawn: ['i see the weapon.', 'think carefully, {u}.'], hurt: ["you're wounded.", 'that will get infected.'], sneak: ['i saw you.'], close: ['step back.'] },
  chatty: { style: 'talks a lot, gossips, goes off on tangents', hi: ['{u}! you will NOT believe what i heard.', 'oh hey {u}, got a minute? no? okay.', 'hiii {u}.'], drawn: ['oh, we\'re doing weapons now? okay, okay.', 'you know a guy got shot doing exactly that, {u}.'], hurt: ['oof. that\'s gonna be a story. tell me later.', 'you\'re limping, {u}. what happened?'], sneak: ['are we playing hide and seek? i love this.'], close: ['oh hi! hi! okay hi.'] },
  devout: { style: 'speaks in faith and omens, calm, a little unsettling', hi: ['the deep sees you, {u}.', 'peace, {u}.', 'you were expected.'], drawn: ['steel will not save you from what waits below, {u}.', 'put it down. it offends.'], hurt: ['your blood calls to the water, {u}.', 'pain is a door. still, bind it.'], sneak: ['nothing hides from the deep, {u}.'], close: ['you stand in my prayer.'] },
  weary: { style: 'tired, sad, dry humor, been here too long', hi: ['hey {u}. still kicking.', 'mm, {u}. another day.', 'oh. hi.'], drawn: ['go on then. i\'m too tired to care.', 'put it away, {u}. not today.'], hurt: ['been there. it heals. mostly.', 'you should rest, {u}.'], sneak: ["i'm too tired to be surprised, {u}."], close: ['hey. you\'re in my light.'] },
}
const KEYS = Object.keys(TEMPERS)
export function temperOf(it) {
  const st = it.state ?? {}
  if (st.temper && TEMPERS[st.temper]) return st.temper
  if (st.faction === 'surrender') return 'devout'
  const h = hash(String(it.id).split('/').pop() + 'temper')
  if (st.role === 'medic' && h % 2) return 'warm'
  return KEYS.filter((k) => k !== 'devout')[h % (KEYS.length - 1)]
}
export function lineFor(it, kind, call) {
  const T = TEMPERS[temperOf(it)], pool = T[kind] ?? TEMPERS.weary[kind]
  const h = Math.floor(Math.random() * pool.length)
  return pool[h].replaceAll('{u}', call)
}
export const styleOf = (it) => TEMPERS[temperOf(it)].style
// temperament shapes the body too: attribute nudges (applied once over the rolled attr) and the nerve it leans to
export const TEMPER_STATS = {
  warm: { e: 1, g: 1 }, gruff: { h: 2, e: 1, g: -1 }, nervous: { a: 2, h: -1, o: 1 }, cocky: { a: 1, g: 1, l: 1, n: -1 },
  cold: { o: 2, n: 1, g: -1 }, chatty: { g: 2, n: -1 }, devout: { e: 2, n: 1, l: -1 }, weary: { e: 1, n: 1, a: -1 },
}
export const TEMPER_NERVE = { gruff: 'brave', nervous: 'coward', cocky: 'brave', cold: 'steady', devout: 'brave' }
