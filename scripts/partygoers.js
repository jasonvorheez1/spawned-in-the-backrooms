// Level 26 (Shelly's Entity 67 + 110 lore): one manager steps every Partygoer and every Carnivorous Balloon on the ship.
// Partygoers: nearsighted (they see 9 m), slow, and never alone: the one that sees you calls the pack within 16 m.
// Their arms end in toothed mouths: a bite every 1.3 s. Tagged l8-hostile so every weapon and kick hits them.
// Balloons: stationary. Step within reach of the ribbon and it stings: damage, and you're rooted a beat.
import { dmgAfterArmor } from "./lib/stats.js"
const T = { sight: 9, call: 16, walk: 1.1, hunt: 2.3, reach: 1.6, biteDmg: 7, biteMs: 1300, hp: 90, // her picks
  balloonReach: 1.4, stingDmg: 9, stingMs: 2500 }
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
export function update(ctx, dt) {
  const players = ctx.place.players; if (!players.length) return ctx.sleep(1)
  const now = ctx.now(), g = ctx.place.gravity?.y ?? -9.8
  const pack = ctx.query({ tags: ["partygoer"] })
  for (const p of pack) {
    const s = p.state
    if ((s.hp ?? T.hp) <= 0) {
      ctx.emit("fx", { position: { ...p.feetPosition, y: p.feetPosition.y + 1 }, script: `fx
pop smoke burst=30 on=sphere(.4) life=1.5..2.5 v=up(1.2)+sdir()*.6 size=.3..0.6 acc=buoy(.6)+drag(1) sz=$size*(.6>2.2) col=<.05,.05,.05> a=0>.7:.5>.7:.3>0 r=sprite(smoke-puff,alpha)` })
      ctx.emit("playSound", { clip: SND("wet-flesh-tear-and-collapse"), position: p.feetPosition, volume: 0.8 })
      ctx.destroy(p.id); continue
    }
    let prey = null, best = s.hunting ? T.sight * 1.8 : T.sight
    for (const pl of players) { if ((pl.state.hp ?? 1) <= 0) continue; const d = flat(pl.feetPosition, p.feetPosition); if (d < best) { best = d; prey = pl } }
    if (prey && !s.hunting) { // seen: the pack hears it in its head and turns as one
      s.hunting = true
      ctx.emit("playSound", { clip: SND("distorted-party-blower-and-giggle"), position: p.feetPosition, volume: 0.9 })
      for (const o of pack) if (o.id !== p.id && flat(o.feetPosition, p.feetPosition) < T.call) o.state.hunting = true
    }
    if (!prey && s.hunting && !players.some((pl) => flat(pl.feetPosition, p.feetPosition) < T.sight * 2.5)) s.hunting = false
    const target = prey && s.hunting ? prey.feetPosition : (s.hunting ? players[0].feetPosition : s.home ?? p.feetPosition)
    const d = flat(target, p.feetPosition), speed = s.hunting ? T.hunt : T.walk
    if (now < (s.stunUntil ?? 0) || d < (prey ? T.reach * 0.8 : 0.5)) p.velocity = { x: 0, y: p.velocity.y + g * dt, z: 0 }
    else {
      const dx = (target.x - p.feetPosition.x) / d, dz = (target.z - p.feetPosition.z) / d
      p.velocity = { x: dx * speed, y: p.velocity.y + g * dt, z: dz * speed }
      p.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI }
    }
    if (prey && best < T.reach && now >= (s.nextBite ?? 0)) {
      s.nextBite = now + T.biteMs
      prey.state.hp -= dmgAfterArmor(prey.state.look, T.biteDmg)
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z }
      ctx.emit("damageNumber", { position: at, value: T.biteDmg, color: "#ff4040" })
      ctx.emit("playSound", { clip: SND("wet-teeth-bite-chomp"), position: at, volume: 0.9 })
      ctx.emit("screenShake", { intensity: 0.35, duration: 0.25 }, { audience: { player: prey.id } })
      ctx.emit("squash", { target: p.id, axis: "y", intensity: 0.12, duration: 0.2 })
    }
  }
  for (const b of ctx.query({ tags: ["l26-balloon"] })) {
    for (const pl of players) {
      const top = { x: b.feetPosition.x, z: b.feetPosition.z }
      if (flat(pl.feetPosition, top) > T.balloonReach || now < (b.state.nextSting ?? 0)) continue
      b.state.nextSting = now + T.stingMs
      pl.state.hp -= T.stingDmg; pl.state.stungUntil = now + 1500
      const at = { x: pl.feetPosition.x, y: pl.feetPosition.y + 0.6, z: pl.feetPosition.z }
      ctx.emit("damageNumber", { position: at, value: T.stingDmg, color: "#c8ff60" })
      ctx.emit("playSound", { clip: SND("wet-whip-crack-and-sizzle"), position: at, volume: 0.8 })
      ctx.emit("screenFlash", { color: "#b8ff70", duration: 0.35, intensity: 0.4 }, { audience: { player: pl.id } })
      ctx.emit("shake", { target: b.id, intensity: 0.3, duration: 0.5 })
    }
  }
  ctx.sleep(0.1)
}
