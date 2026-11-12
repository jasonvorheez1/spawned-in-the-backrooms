// A playable cabinet (tag "usable", state.kind "arcade"): E starts its game on the presser's screen (scripts/arcade-play.js runs it).
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), now = ctx.now()
    if (!who || who.state.arcade || now - (who.state.arcadeClosedAt ?? 0) < 600) return
    who.state.arcade = { id: ctx.self.id, game: ctx.self.state.game ?? 'blockpanic', at: now, phase: 'attract' }
  },
}
