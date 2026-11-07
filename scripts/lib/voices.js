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
const POOL = [
  'raspy-middle-aged-man-weary', 'bright-young-woman-curious', 'deep-slow-old-man-calm', 'quick-anxious-young-man',
  'husky-woman-dry-humor', 'soft-elderly-woman-kind', 'gruff-man-scottish-accent', 'crisp-woman-australian-accent',
  'nasal-man-new-york-accent', 'mellow-woman-southern-accent', 'booming-man-cheerful', 'breathy-young-woman-shy',
]
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
export const throatOf = (who) => T[who] ?? POOL[hash(who) % POOL.length]
const slug = (line, n = 180) => String(line ?? '').slice(0, n).replace(/[^a-z ]/gi, '').trim().toLowerCase().replace(/ +/g, '-')
export const vo = (who, line, n) => `/cdn/voice-${throatOf(who)}-saying-${slug(line, n)}.mp3`
