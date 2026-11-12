// A set-down Wind-up Music Box: plays until state.until, slows for its last bars, then falls silent. E picks it up.
import { MB } from "./lib/musicbox.js"
export function update(ctx) {
  const st = ctx.self.state, now = ctx.now()
  if (!st.wound) return ctx.sleep()
  const left = (st.until - now) / 1000
  if (left <= 0) {
    st.wound = false; st.info = "Wound down. The dancer stopped facing you"
    ctx.self.audio = null; ctx.self.fx = null
    const d = ctx.self.children?.find?.((c) => c.id?.endsWith("dancer")); if (d) d.rotation = { yaw: 180 }
    return ctx.sleep()
  }
  // the dancer turns with the tune; the last bars drag as the spring gives out
  const slow = left < MB.slowAt ? Math.max(0.55, left / MB.slowAt) : 1
  if (ctx.self.audio && Math.abs((ctx.self.audio.pitch ?? 1) - slow) > 0.04) ctx.self.audio.pitch = slow
  const d = ctx.getObject(ctx.self.id + "/dancer"); if (d) d.rotation = { yaw: ((now / 1000) * 70 * slow) % 360 }
  ctx.sleep(0.1)
}
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by); if (!p?.state) return
    p.state.snacks = { ...(p.state.snacks ?? {}), musicbox: (p.state.snacks?.musicbox ?? 0) + 1 }
    p.state.notice = { text: "Wind-up Music Box picked up", at: ctx.now() }
    ctx.destroy(ctx.self.id)
  },
}
