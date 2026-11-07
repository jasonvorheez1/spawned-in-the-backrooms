// The old compass: a lootable item with a few reads left. A read points the needle toward one or two things
// nearby, vaguely on purpose: a direction rounded to eight points with a wobble, a distance in words, a kind in
// words ("a way out", "voices", "something breathing", "something worth taking"). Low sanity makes it lie more.
import { cellCenter, EXIT } from './maze.js'
import { BACK as BACK1, ONWARD as ONWARD1 } from './level1.js'
import { BACK as BACK2, SEALED as SEALED2 } from './level2.js'
import { BACK as BACK3, LIFT as LIFT3 } from './level3.js'
// her picks: 5 reads a compass, 70 m sense range, the needle shows 8 s
export const COMPASS = { charges: 5, range: 70, show: 8000, wobble: 35, spinBase: 0.12 }
const D = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
function exitsOf(place) {
  if (place === 'level1') return [BACK1, ONWARD1]
  if (place === 'level2') return [BACK2, SEALED2]
  if (place === 'level3') return [BACK3, LIFT3]
  if (place === 'main') return [cellCenter(EXIT.cx, EXIT.cz)]
  return []
}
const KINDS = {
  exit: ['a way out', 'a door somewhere', 'a draft, like an exit'],
  people: ['voices', 'someone alive', 'footsteps that sound human'],
  creature: ['something breathing', 'something that hunts', 'something you should avoid'],
  loot: ['something worth taking', 'supplies, maybe', 'a stash, maybe'],
}
const word = (d) => (d < 15 ? 'close' : d < 40 ? 'not far' : 'far')
// heading in the HUD compass's frame: 0 = N (-z), 90 = E (+x)
const headingOf = (dx, dz) => ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360
export function useCompass(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now()
  if (!(s.compass > 0)) { s.notice = { text: 'No compass', at: now }; return }
  if (now - (s.compassRead?.at ?? -1e9) < 2500) return
  s.compass -= 1
  const p = me.feetPosition, R = COMPASS.range, found = []
  const near = (rows, kind) => { const r = rows.filter((o) => o.id !== me.id)[0]; if (r) found.push({ kind, dx: r.feetPosition.x - p.x, dz: r.feetPosition.z - p.z }) }
  let ex = null, ed = Infinity
  for (const e of exitsOf(me.place)) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < ed) { ed = d; ex = e } }
  if (ex) found.push({ kind: 'exit', dx: ex.x - p.x, dz: ex.z - p.z })
  const others = []
  near(ctx.query({ tags: ['npc'], radius: R }), 'people'); if (found.length > (ex ? 1 : 0)) others.push(found.pop())
  near(ctx.query({ anyTags: ['hound', 'smiler', 'lurker', 'stealer'], radius: R }), 'creature'); if (found.length > (ex ? 1 : 0)) others.push(found.pop())
  near(ctx.query({ anyTags: ['crate', 'container', 'weapon', 'almond', 'ammo', 'shells'], excludeTags: ['remains'], radius: R }), 'loot'); if (found.length > (ex ? 1 : 0)) others.push(found.pop())
  if (others.length) found.push(others[Math.floor(ctx.random() * others.length)]) // one other thing, never a full census
  const san = Math.max(0, Math.min(1, (s.sanity ?? 100) / 100))
  const spun = !found.length || ctx.random() < COMPASS.spinBase + (1 - san) * 0.35
  const hints = spun ? [] : found.map((f) => {
    const h = (headingOf(f.dx, f.dz) + (ctx.random() * 2 - 1) * COMPASS.wobble + 360) % 360
    const pt = D[Math.round(h / 45) % 8], pool = KINDS[f.kind]
    return { k: f.kind, h: Math.round(h / 45) * 45 % 360, t: `${pool[Math.floor(ctx.random() * pool.length)]}, ${word(Math.hypot(f.dx, f.dz))}, ${pt}` }
  })
  s.compassRead = { at: now, spun, hints, left: s.compass }
  ctx.emit('playSound', { clip: '/cdn/moodboard-realistic-gritty/sfx-old-brass-compass-lid-click.mp3', position: p, volume: 0.6, maxDistance: 8 }, { audience: { player: me.id } })
  if (s.compass <= 0) s.notice = { text: 'The compass needle comes loose. It is useless now.', at: now + 3000 }
}
