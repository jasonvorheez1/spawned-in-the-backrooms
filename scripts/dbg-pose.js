// debug room gallery: a mannequin loops the clip its row names, so every new clip can be judged on the real bodies
// each row's model.parts shows ONE outfit (the bare glb shows every garment stacked: a ragged band at the waist)
export function onSpawn(ctx) { pose(ctx) }
export function update(ctx) { pose(ctx); ctx.sleep(5) }
function pose(ctx) {
  const s = ctx.self.state; if (!s?.clip) return
  if (ctx.self.anim.idle?.clip !== s.clip) ctx.self.anim.idle = { clip: s.clip, loop: true, weight: 1 }
}
