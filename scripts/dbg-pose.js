// debug room gallery: a mannequin plays the clip its row names, on a loop, so every new clip can be judged on the real bodies
export function onSpawn(ctx) { pose(ctx) }
export function update(ctx) { if (!ctx.self.session.posed) pose(ctx); ctx.sleep() }
function pose(ctx) {
  const s = ctx.self.state; if (!s?.clip) return
  ctx.self.anim.base = { clip: s.clip, loop: "loop", weight: 1 }
  ctx.self.session.posed = true
}
