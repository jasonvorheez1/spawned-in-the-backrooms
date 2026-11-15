// The old compass (overhauled Nov 15). Press it to open a live brass dial; press again to switch what the needle seeks:
// way out -> people -> supplies -> danger -> closed. While open it burns windings (data/compass.yml); a creature close by
// makes it shiver, low sanity makes it lie, and the dial says warmer or colder as you walk.
import { heard } from "./hear.js";
import { cellCenter, EXIT } from './maze.js'
import { BACK as BACK1, ONWARD as ONWARD1 } from './level1.js'
import { BACK as BACK2, SEALED as SEALED2 } from './level2.js'
import { BACK as BACK3, LIFT as LIFT3 } from './level3.js'
import C from './data/compass.yml'
export const COMPASS = C
function exitsOf(ctx, place, p) {
  if (place === 'level1') return [BACK1, ONWARD1]
  if (place === 'level2') return [BACK2, SEALED2]
  if (place === 'level3') return [BACK3, LIFT3]
  if (place === 'gamma') return [{ x: 0, z: 40 }]
  if (place === 'main') return [cellCenter(EXIT.cx, EXIT.cz)]
  return ctx.query({ anyTags: ['door', 'exit', 'portal', 'threshold'], radius: 200, center: p }).slice(0, 3).map((o) => o.feetPosition)
}
const QUERY = {
  people: { tags: ['npc'] },
  loot: { anyTags: ['crate', 'container', 'weapon', 'almond', 'ammo', 'shells'], excludeTags: ['remains'] },
  danger: { anyTags: ['hound', 'smiler', 'lurker', 'stealer', 'duller', 'partygoer', 'skinstealer', 'hostile'] },
}
const word = (d) => (d < 8 ? 'right here' : d < 20 ? 'close' : d < 45 ? 'not far' : 'far')
const headingOf = (dx, dz) => ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360 // 0 = N (-z), 90 = E (+x)
const click = (ctx, clip) => heard(ctx, { clip: `/cdn/moodboard-realistic-gritty/sfx-${clip}.mp3`, position: ctx.self.feetPosition, volume: 0.55, maxDistance: 8 }, { audience: { player: ctx.self.id } })
// the quick slot / inventory press: open, cycle, close
export function useCompass(ctx) {
  const s = ctx.self.state, now = ctx.now()
  if (!(s.compass > 0)) { s.notice = { text: 'No compass', at: now }; return }
  const cur = s.compassOn?.mode, i = cur ? C.modes.indexOf(cur) : -1
  if (i >= C.modes.length - 1) { s.compassOn = null; s.compassRead = null; click(ctx, 'old-brass-compass-lid-snapped-shut-click'); return }
  s.compassOn = { mode: C.modes[i + 1], at: now }
  ctx.self.session.cmpNext = 0
  click(ctx, i < 0 ? 'old-brass-compass-lid-click' : 'small-brass-dial-ratchet-tick')
}
// player update: the needle while open
export function compassTick(ctx, dt) {
  const me = ctx.self, s = me.state, on = s.compassOn, ses = me.session
  if (!on) return
  if (!(s.compass > 0)) { s.compassOn = null; s.compassRead = null; return }
  ses.cmpWind = (ses.cmpWind ?? 0) + dt
  if (ses.cmpWind >= C.windSeconds) {
    ses.cmpWind = 0; s.compass -= 1
    if (s.compass <= 0) { s.compassOn = null; s.compassRead = null; s.notice = { text: 'The spring gives out. The needle hangs loose: this compass is spent.', at: ctx.now() }; click(ctx, 'thin-metal-spring-snapping-twang'); return }
  }
  const now = ctx.now()
  if (now < (ses.cmpNext ?? 0)) return
  ses.cmpNext = now + C.refreshMs
  const p = me.feetPosition
  let t = null
  if (on.mode === 'exit') { let bd = Infinity; for (const e of exitsOf(ctx, me.place, p)) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; t = e } } }
  else { const r = ctx.query({ ...QUERY[on.mode], radius: C.range }).find((o) => o.id !== me.id); if (r) t = r.feetPosition }
  const near = ctx.query({ ...QUERY.danger, radius: C.shiver })[0]
  const san = Math.max(0, Math.min(1, (s.sanity ?? 100) / 100))
  const spun = !t || (san < C.spinBelow && ctx.random() < 0.5)
  let h = null, d = null, trend = 0
  if (!spun) {
    d = Math.hypot(t.x - p.x, t.z - p.z)
    const wob = C.wobble + (1 - san) * C.madWobble
    h = Math.round((headingOf(t.x - p.x, t.z - p.z) + (ctx.random() * 2 - 1) * wob + 360) % 360)
    const last = ses.cmpLastD
    if (last != null && ses.cmpLastMode === on.mode) trend = d < last - 0.6 ? 1 : d > last + 0.6 ? -1 : 0
    ses.cmpLastD = d; ses.cmpLastMode = on.mode
  }
  const left = Math.max(0, Math.round((s.compass - 1) * C.windSeconds + (C.windSeconds - ses.cmpWind)))
  const next = { mode: on.mode, h, w: d == null ? null : word(d), trend, spun, shiver: !!near, left }
  const prev = s.compassRead
  if (!prev || prev.h !== next.h || prev.w !== next.w || prev.trend !== next.trend || prev.spun !== next.spun || prev.shiver !== next.shiver || prev.mode !== next.mode || Math.abs((prev.left ?? 0) - left) >= 5) s.compassRead = { ...next, at: now }
}
