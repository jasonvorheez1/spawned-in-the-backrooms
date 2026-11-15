// A stamp from another room's clock can sit hours in this room's future (Spawn ticket 79696: two rooms counted time
// from different starts). A past-event stamp in the future keeps a fade black or a stun held forever, so once per
// place arrival each one more than a minute ahead is pulled back to "long ago". Game-clock keys (_clock*) are left alone.
const AHEAD = 60000
const HOLDS = new Set(['stunUntil', 'stungUntil', 'moveUntil', 'tarUntil', 'soakUntil', 'quietUntil'])
export function clockHeal(ctx) {
  const me = ctx.self, ses = me.session
  if (ses.clockHealPlace === me.place) return
  ses.clockHealPlace = me.place
  const s = me.state, now = ctx.now(), fixed = []
  for (const k in s) {
    if (k.startsWith('_clock')) continue
    const v = s[k]
    if (typeof v === 'number' && v < 1e12 && v > now + AHEAD && (/(At|fade)$/.test(k) || HOLDS.has(k))) { s[k] = HOLDS.has(k) ? 0 : now - 600000; fixed.push(k) }
    else if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.at === 'number' && v.at < 1e12 && v.at > now + AHEAD) { s[k] = { ...v, at: now - 600000 }; fixed.push(k + '.at') }
  }
  if (fixed.length) ctx.log('[clock-heal]', me.place, fixed.join(','))
}
