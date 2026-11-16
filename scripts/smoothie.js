import S from "./lib/data/smoothies.yml"
// the Squeeze Play counter: a press opens the mixing menu; the blender kicks on; Sal greets whoever walks up
export const ears = {
  press: (ctx, p) => {
    const pl = ctx.place.players.find((x) => x.id === p?.by)
    if (!pl) return
    pl.state.smoothieOpen = true
    pl.state.smoothieMsg = null
    ctx.emit("playSound", { clip: "/cdn/moodboard-toon-vibrant/sfx-countertop-blender-short-pulse-whirr.mp3", position: { x: 7.5, y: 1.2, z: 12 }, volume: 0.45, maxDistance: 12 })
    ctx.emit("shake", { target: ctx.self.id, intensity: 0.02, duration: 0.4 })
    const last = ctx.self.session.hi ?? 0
    if (ctx.now() - last > 20000) { ctx.self.session.hi = ctx.now(); ctx.emit("playSound", { clip: S.lines.hello, position: { x: 7.5, y: 1.6, z: 12 }, bus: "Voice", refDistance: 4, maxDistance: 18 }) }
  },
}
