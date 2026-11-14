import V from './data/npc-voices.yml'
import CAST from './data/voice-cast.yml'
import TIMING from './data/voice-timing.yml'
let ACTED = {} // recorded performances (art/vo/act.py, the tape method): key: hash('<id>|<slug>') base36, value: the clip's sha
// One throat per character: the voice file's name is its prompt, so each character's words below ARE their voice.
// Every speaking helper builds its clip through vo(who, line); a new who falls back to a throat picked from its name.
const T = {
  // Level 5: hotel staff
  ambrose: 'smooth-baritone-old-british-hotel-concierge-polite-dry',
  dolores: 'warm-husky-middle-aged-woman-italian-cook-hearty',
  pip: 'quick-bright-young-man-nervous-bellhop-high-tenor',
  odette: 'soft-gentle-french-young-woman-maid-breathy',
  // Level 5: Housekeeping (M.E.G.)
  harlan: 'deep-gravel-big-man-gruff-quartermaster-slow',
  vesna: 'cool-low-eastern-european-woman-calm-guide',
  tobias: 'fast-nasal-wiry-young-man-clerk-sarcastic',
  imani: 'firm-confident-woman-soldier-clipped-alto',
  // Level 5: The Originals
  millie: 'plucky-1930s-american-woman-aviatrix-transatlantic-accent',
  whitlock: 'weathered-old-sea-captain-man-rough-british-gravel',
  vanderholt: 'pompous-rich-old-man-1880s-railway-baron-booming',
  zelda: 'bubbly-1920s-flapper-young-woman-sassy-transatlantic',
  wat: 'mild-old-english-monk-man-humble-medieval',
  // Levels 1-4
  reyes: 'steady-commanding-man-army-sergeant-african-accent',
  ito: 'kind-tired-woman-field-medic-soft-alto',
  vell: 'serene-whispery-woman-cult-sister-sweet-unsettling',
  hask: 'hollow-solemn-man-cult-brother-measured',
  quill: 'sly-chatty-man-trader-fast-talker',
  penny: 'chirpy-young-woman-wanderer-cheerful',
  nib: 'small-scratchy-young-woman-scavenger-skittish',
  moss: 'drowsy-mellow-woman-wanderer-low-relaxed',
  lin: 'sharp-alert-woman-patrol-scout-terse',
  gus: 'friendly-loud-big-man-wanderer-southern-drawl',
  dace: 'calm-deep-man-quartermaster-patient',
  bram: 'cheery-raspy-old-man-wanderer-irish-lilt',
  ale: 'plain-tired-man-survivor-flat',
}
// every named person's own voice (scripts/lib/data/npc-voices.yml), keyed by their id: it wins over the old cast keys above
for (const [k, v] of Object.entries(V ?? {})) if (!k.includes(':') && typeof v === 'string') T[k] = v
export const hasVoice = (id) => !!(V && typeof V[id] === 'string' && !String(id).includes(':'))
// the voice to speak an npc's line in: their own (npc-voices.yml) by id, else a cast key they carry, else one from the pool by id and sex
export const voiceKey = (o) => { const id = String(o?.id ?? 'x').split('/').pop(); return hasVoice(id) ? id : o?.state?.voice ?? `${id}#${(o?.state?.wear?.sex ?? o?.state?.look?.sex) === 'f' ? 'f' : 'm'}` }
const POOL = [
  'raspy-middle-aged-man-weary', 'bright-young-woman-curious', 'deep-slow-old-man-calm', 'quick-anxious-young-man',
  'husky-woman-dry-humor', 'soft-elderly-woman-kind', 'gruff-man-scottish-accent', 'crisp-woman-australian-accent',
  'nasal-man-new-york-accent', 'mellow-woman-southern-accent', 'booming-man-cheerful', 'breathy-young-woman-shy',
  'smoky-low-woman-tired-sardonic', 'warm-middle-aged-woman-motherly', 'sharp-young-woman-fast-talker', 'hoarse-old-woman-gravelly',
  'soft-spoken-young-man-gentle', 'reedy-old-man-nervous', 'smooth-man-french-accent', 'clipped-man-german-accent',
]
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
const MEN = POOL.filter((v) => /-man-|-man$|old-man/.test(v)), WOMEN = POOL.filter((v) => /woman/.test(v))
// a key 'npc-id' or 'npc-id#f' / '#m': a cast voice by name, else one from the pool by id, the right sex when known
export const throatOf = (who) => { const [k, sx] = String(who).split('#'); return T[k] ?? (sx === 'f' ? WOMEN : sx === 'm' ? MEN : POOL)[hash(k) % (sx === 'f' ? WOMEN : sx === 'm' ? MEN : POOL).length] }
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const slug = (line, n = 180) => String(line ?? '').slice(0, n).replace(/\d/g, (d) => ' ' + NUM[d] + ' ').replace(/[^a-z ]/gi, ' ').trim().toLowerCase().replace(/ +/g, '-')
// a line with no real word in it (empty, "hmm", "...", a stray symbol) makes the voice maker fill in its own test words: those stay silent, the subtitle still shows
const real = (sl) => sl.split('-').some((w) => w.length >= 3 && /[aeiouy]/.test(w) && !/^(hmm+|mmm*|uhh*|umm*|hm+|ahh*|ohh*|erm*)$/.test(w))
const actorId = (who) => String(who).split('#')[0]
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
// voice-acted.yml packs each sha as 43 base64url chars (a quarter smaller on every level's load); a 64-char hex sha still reads as is
const unpack = (s) => { s = String(s); if (s.length === 64) return s; let bits = 0, n = 0, hex = ''; for (const c of s) { bits = (bits << 6) | B64.indexOf(c); n += 6; while (n >= 4) { n -= 4; hex += ((bits >> n) & 15).toString(16) } bits &= (1 << n) - 1 } return hex.slice(0, 64) }
const asset = (sha) => `/cdn/value.${unpack(sha)}.mp3`
let recorded = new Map(Object.entries(ACTED).map(([key, sha]) => [asset(sha), (TIMING[key] ?? 0) * 100]))
// the table (214 KB) is read after the player stands, not before: every level's boot is that much lighter
import('./data/voice-acted.yml').then((m) => { ACTED = m?.default ?? m ?? {}; recorded = new Map(Object.entries(ACTED).map(([key, sha]) => [asset(sha), (TIMING[key] ?? 0) * 100])) }).catch(() => {})
export const isVoiceClip = (clip) => recorded.has(clip) || String(clip).includes('/voice-')
export const recordedDuration = (clip) => recorded.get(clip) || 0
export const hasCast = (who) => Object.hasOwn(CAST, actorId(who))
export function actedVoice(who, line) {
  const key = hash(actorId(who) + '|' + slug(line)).toString(36), sha = ACTED[key]
  if (!sha) return null
  // a take far longer than its words is a bad take (the voice maker padded a short line with laughs and repeats): silent, the subtitle stays
  const ms = (TIMING[key] ?? 0) * 100, words = String(line).split(/\s+/).filter(Boolean).length
  if (ms && ms > 2 * (1200 + words * 550)) return null
  return asset(sha)
}
export function vo(who, line, n) {
  const clip = actedVoice(who, line)
  if (clip) return clip
  // Shelly Nov 14: "turn off ai generated voice lines": a line with no recorded take stays a subtitle, nothing is made on the fly
  return null
}
