// Level 22: the top floor's ceiling came down, and the rubble climbs out through a hole in Level 21's floor (Wikidot exit).
// Nov 17 (gavi/favi pass): Shelly walked straight from the car to the light and out in a minute, skipping Emstable.
// The heap only holds once you've stood on the bottom floor (Floor 21): before that it slides you back.
export function onTriggerEnter(ctx, other) {
  if (!other?.isLocal || !String(other.id).startsWith("player/")) return
  const o = ctx.getObject(other.id); if (!o?.state) return
  if (!(o.state.l22?.floors ?? []).includes(21)) {
    o.state.notice = { text: "The heap shifts and slides you back down. Loose all the way to the top. Whatever's holding this level up is further down.", at: ctx.now() }
    o.velocity = { x: 0, y: 2, z: 4 }
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-concrete-rubble-pile-slides-and-settles.mp3", volume: 0.8 }, { audience: { player: o.id } })
    return
  }
  o.state.notice = { text: "You haul yourself up through the floor of somewhere else.", at: ctx.now() }
  ctx.cross(o, "level21")
}
