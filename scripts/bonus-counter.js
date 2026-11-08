// A Bonus Room counter (Tom's Diner, Liminal Clothes, Andrew's Furniture, the Teleport Station): E opens its menu (scripts/hub-ui.js).
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by); if (!who?.state) return
    who.state.hubShop = ctx.self.state.kind
    ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-soft-retro-mall-chime-two-tone.mp3", position: ctx.self.feetPosition, volume: 0.5 })
  },
}
