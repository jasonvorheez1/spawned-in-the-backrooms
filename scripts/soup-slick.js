// a puddle of thrown soup: steams, and anyone walking (an NPC, a hound) through it loses their feet for a moment.
// Players skate on it (scripts/player.js reads tag soupslick); spiders tumble (scripts/l8-life.js). It fades with its lifetime.
const STEAM = `fx
pop steam rate=6 on=disc(1) life=1.2..2 v=up(.3..0.6) size=.25..0.45 acc=buoy(.3)+curl(.3)+drag(1) col=<.9,.88,.82> a=0>.18:.2>.7:.1>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)
pop sheen n=10 on=disc(1) size=.05..0.1 col=<1,.85,.5> a=.5*flick(.6,.4) r=sprite(soft-disc,add)`
export const updateSchedule = { every: { seconds: 0.25 } }
export function onSpawn(ctx) { ctx.self.fx = { script: STEAM } }
export function update(ctx) {
  const now = ctx.now()
  for (const m of ctx.query({ anyTags: ['npc', 'hound', 'smiler', 'lurker', 'stealer'], radius: 1.3 })) {
    if (m.state?.dead || (m.state?.stunUntil ?? 0) > now) continue
    m.state.stunUntil = now + 1500
    ctx.emit('squash', { target: m.id, axis: 'y', intensity: 0.35, duration: 0.3 })
    ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 1.8, z: m.feetPosition.z }, text: 'SLIPPED', color: '#e8b060', size: 0.8 })
  }
}
