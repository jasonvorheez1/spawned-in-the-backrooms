// A Bonus Room counter (Tom's Diner, Liminal Clothes, Andrew's Furniture, the Teleport Station): E opens its menu (scripts/hub-ui.js).
// The counter answers first: its own bell or rattle, a jolt, a light over the till.
const SAY = {
  diner: { clip: "/cdn/moodboard-toon-vibrant/sfx-diner-counter-service-bell-ding.mp3", col: "#ffcf60" },
  clothes: { clip: "/cdn/moodboard-toon-vibrant/sfx-wire-hangers-rattle-on-clothes-rail.mp3", col: "#ff71ce" },
  furniture: { clip: "/cdn/moodboard-toon-vibrant/sfx-desk-bell-tap-and-catalog-page-flip.mp3", col: "#ffe14a" },
  station: { clip: "/cdn/moodboard-scifi-neon/sfx-teleport-console-power-up-hum-rising.mp3", col: "#38f4ff" },
}
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by); if (!who?.state) return
    who.state.hubShop = ctx.self.state.kind
    const say = SAY[ctx.self.state.kind] ?? { clip: "/cdn/moodboard-scifi-neon/sfx-soft-retro-mall-chime-two-tone.mp3", col: "#ff71ce" }
    const c = ctx.self.state.c ?? ctx.self.feetPosition
    ctx.emit("playSound", { clip: say.clip, position: c, volume: 0.5 })
    ctx.emit("shake", { target: ctx.self.id, intensity: 0.025, duration: 0.25 })
    ctx.spawn({ feetPosition: { x: c.x, y: c.y + 0.6, z: c.z }, light: { kind: "point", color: say.col, intensity: 2.2, distance: 4, shadow: { enabled: false } }, lifetime: 0.9 })
  },
}
