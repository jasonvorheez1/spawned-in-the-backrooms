// A playable cabinet (tag "usable", state.kind "arcade"): E starts its game on the presser's screen (scripts/arcade-play.js runs it).
// The cabinet answers in the room: a coin clinks, the cabinet rocks, the marquee throws light.
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), now = ctx.now()
    if (!who || who.state.arcade || now - (who.state.arcadeClosedAt ?? 0) < 600) return
    who.state.arcade = { id: ctx.self.id, game: ctx.self.state.game ?? 'blockpanic', at: now, phase: 'attract' }
    const p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition
    ctx.emit('playSound', { clip: 'cdn/sfx-arcade-coin-drop-clink-into-cabinet-slot.mp3', position: { x: p.x, y: p.y + 1, z: p.z }, volume: 0.55, maxDistance: 12 })
    ctx.emit('shake', { target: ctx.self.id, intensity: 0.035, duration: 0.3 })
    ctx.spawn({ feetPosition: { x: p.x, y: p.y + 1.6, z: p.z }, light: { kind: 'point', color: '#05ffa1', intensity: 2.6, distance: 4, shadow: { enabled: false } }, lifetime: 1.2 })
  },
}
