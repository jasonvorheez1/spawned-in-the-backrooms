import { screen } from "./lib/screen.js"

export const ears = {
  press(ctx, event) {
    const player = event?.by && ctx.getObject(event.by)
    const s = player?.state, p = player?.feetPosition, panel = ctx.self.feetPosition
    if (!s || !p || s.t0n !== 2 || s.t0Done || s.dead || player.place !== ctx.self.place) return
    if (screen(s, player.place) !== "play" || Math.hypot(p.x - panel.x, p.y - panel.y, p.z - panel.z) > 3.2) return
    s.t0cut = { id: "halogen", at: ctx.now() }
  },
}
