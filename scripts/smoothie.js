// the Squeeze Play counter: a press opens the mixing menu for whoever pressed
export const ears = {
  press: (ctx, p) => {
    const pl = ctx.place.players.find((x) => x.id === p?.by)
    if (pl) pl.state.smoothieOpen = true
  },
}
