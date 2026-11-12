import S from "./lib/data/smoothies.yml"
// the Squeeze Play counter: a press opens the mixing menu; Sal greets whoever walks up
export const ears = {
  press: (ctx, p) => {
    const pl = ctx.place.players.find((x) => x.id === p?.by)
    if (!pl) return
    pl.state.smoothieOpen = true
    pl.state.smoothieMsg = null
    const last = ctx.self.session.hi ?? 0
    if (ctx.now() - last > 20000) { ctx.self.session.hi = ctx.now(); ctx.emit("playSound", { clip: S.lines.hello, position: { x: 7.5, y: 1.6, z: 12 }, bus: "Voice", refDistance: 4, maxDistance: 18 }) }
  },
}
