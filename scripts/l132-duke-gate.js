// The Palace gate (Level 132): shut but for the festival. Knock, and the Palace answers with a notice.
import D from "./lib/data/l132-duke.yml"
export const ears = {
  press: (ctx, m) => {
    const p = m?.by ? ctx.getObject(m.by) : null
    ctx.emit("playSound", { clip: D.gate.knock, position: ctx.self.worldFeetPosition, volume: 0.7, maxDistance: 30 })
    if (p?.state) p.state.notice = { text: D.gate.notice, at: ctx.now() }
  },
}
