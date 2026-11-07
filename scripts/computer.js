// A working computer (tag "usable", state.kind "computer"): press E and Back OS(tm) boots on your screen (scripts/os.js runs it,
// scripts/os-ui.js draws it). state: host, lock ('' | 'science:N' | 'pw:...'), unlocked (true once cracked: it stays admin).
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), now = ctx.now()
    if (!who || who.state.os || now - (who.state.osClosedAt ?? 0) < 600) return
    who.state.os = { id: ctx.self.id, host: s.host, lock: s.unlocked ? '' : s.lock || '', user: s.unlocked ? 'admin' : 'guest', app: 'boot', at: now, term: [], sel: '' }
    ctx.emit('playSound', { clip: '/cdn/moodboard-realistic-gritty/sfx-old-computer-boot-startup-chime.mp3', position: { ...ctx.self.feetPosition, y: 1.2 }, volume: 0.6, maxDistance: 10 }, { audience: { player: by } })
  },
}
