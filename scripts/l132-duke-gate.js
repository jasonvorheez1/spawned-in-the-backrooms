// The Palace gate (Level 132): shut but for the festival. A knock rattles the gate; a lamp shows in the spy-hatch,
// and once an hour per player the guard lowers a royal ration on a string. The festival notice still answers.
import D from "./lib/data/l132-duke.yml"
import { animate } from "builtin/tween"
const LINES = [
  "A hatch opens. A ration on a string comes down. 'Festival's not yet. Eat that and go.'",
  "A hatch opens. A ration, a sigh, a hatch shutting. The Duke feeds his loiterers.",
]
export const ears = {
  press: (ctx, m) => {
    const p = m?.by ? ctx.getObject(m.by) : null, now = ctx.now(), pos = ctx.self.worldFeetPosition
    const ses = (ctx.self.session.knock ??= {}); if (now - (ses[m?.by] ?? 0) < 900) return; ses[m?.by] = now
    const r = ctx.self.rotation, yaw = typeof r === "number" ? r : r?.yaw ?? 0
    animate(ctx, ctx.self, { "rotation.yaw": [yaw, yaw + 0.8, yaw - 0.6, yaw + 0.3, yaw] }, { duration: 0.5, easing: "linear" })
    ctx.emit("playSound", { clip: D.gate.knock, position: pos, volume: 0.7, maxDistance: 30 })
    ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-iron-gate-chains-rattle-heavy.mp3", position: pos, volume: 0.45, maxDistance: 24 })
    ctx.spawn({ feetPosition: { x: pos.x, y: pos.y + 2.4, z: pos.z }, tags: ["l132", "l132-pulse"], light: { kind: "point", color: "oklch(0.8 0.13 65)", intensity: 3, distance: 6, shadow: { enabled: false } }, lifetime: 2.5 })
    const w = p?.state; if (!w) return
    const used = w.l132used ?? {}
    if (now - (used.gate ?? -1e12) > 3600000) {
      w.l132used = { ...used, gate: now }
      w.snacks = { ...(w.snacks ?? {}), royal_ration: (w.snacks?.royal_ration ?? 0) + 1 }
      const i = (ctx.self.state.i ?? 0) % LINES.length; ctx.self.state.i = i + 1
      w.notice = { text: LINES[i], at: now }
    } else w.notice = { text: D.gate.notice, at: now }
  },
}
