// Level 26 (Shelly's Entity 67 + 110 lore): one manager steps every Partygoer and every Carnivorous Balloon on the ship.
// Partygoers: nearsighted (they see 9 m), slow, and never alone: the one that sees you calls the pack within 16 m.
// Their arms end in toothed mouths: a bite every 1.3 s. Tagged l8-hostile so every weapon and kick hits them.
// Balloons: stationary. Step within reach of the ribbon and it stings: damage, and you're rooted a beat.
import { dmgAfterArmor } from "./lib/stats.js"
const T = { sight: 9, call: 16, walk: 1.1, hunt: 2.3, reach: 1.6, biteDmg: 7, biteMs: 1300, hp: 90, // her picks
  berserkAt: 45, rage: 3.1, clawReach: 2.1, clawDmg: 13, clawMs: 850, hatchOpen: 2200, hatchShut: 3200, glance: 0.8, // berserker: arms gone, chest claws out; shut hatch turns 80% of a hit

  balloonReach: 1.4, stingDmg: 9, stingMs: 2500 }
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const CLIP = { idle: "cdn/clip-idle-loop.glb", walk: "cdn/clip-walk-loop.glb", run: "cdn/clip-run-loop.glb" }
function gait(ctx, p, name, rate = 1) { // the body's legs follow its speed; one write when the gait changes
  const k = name + rate, seen = (ctx.self.session.gait ??= {})
  if (seen[p.id] === k) return; seen[p.id] = k
  p.anim.base = { clip: CLIP[name], loop: true, weight: 1, speed: rate, blend: 0.25 }
}
function once(p, clip, weight = 1) { p.anim.act = { clip, loop: false, weight, blend: 0.1 } }
export function update(ctx, dt) {
  const players = ctx.place.players; if (!players.length) return ctx.sleep(1)
  const now = ctx.now(), g = ctx.place.gravity?.y ?? -9.8
  const pack = ctx.query({ tags: ["partygoer"] })
  for (const p of pack) {
    const s = p.state
    if ((s.hp ?? T.hp) <= 0 && !s.dying) { // it folds and drops first: the body stays a beat on the deck
      s.dying = now; p.velocity = { x: 0, y: 0, z: 0 }; once(p, "cdn/clip-die.glb"); gait(ctx, p, "idle")
      ctx.emit("playSound", { clip: SND("inhuman-shriek-in-a-dead-relatives-voice"), position: p.feetPosition, volume: 0.7 })
      continue
    }
    if (s.dying) { if (now - s.dying < 2200) { p.velocity = { x: 0, y: p.velocity.y + g * dt, z: 0 }; continue }
      ctx.emit("fx", { position: { ...p.feetPosition, y: p.feetPosition.y + 1 }, script: `fx
pop smoke burst=30 on=sphere(.4) life=1.5..2.5 v=up(1.2)+sdir()*.6 size=.3..0.6 acc=buoy(.6)+drag(1) sz=$size*(.6>2.2) col=<.05,.05,.05> a=0>.7:.5>.7:.3>0 r=sprite(smoke-puff,alpha)` })
      ctx.emit("playSound", { clip: SND("wet-flesh-tear-and-collapse"), position: p.feetPosition, volume: 0.8 })
      ctx.destroy(p.id); continue
    }
    // berserker (lore: cut the arms, the chest carapace opens, hit it then): below half it sheds its eel arms and the hatch cycles
    const hp = s.hp ?? T.hp
    if (s.berserk && s.lastHp != null && hp < s.lastHp && !(now < (s.hatchUntil ?? 0))) { // hit on a shut carapace: glances off like stone
      s.hp = hp + (s.lastHp - hp) * T.glance
      ctx.emit("playSound", { clip: SND("blade-glancing-off-stone-clank"), position: p.feetPosition, volume: 0.8 })
      ctx.emit("damageNumber", { position: { ...p.feetPosition, y: p.feetPosition.y + 1.6 }, text: "GLANCED", color: "#cccccc" })
    }
    if (!s.berserk && hp <= T.berserkAt) {
      s.berserk = true; s.hunting = true; s.hatchUntil = now + T.hatchOpen; s.hatchNext = now + T.hatchOpen + T.hatchShut
      ctx.emit("playSound", { clip: SND("wet-flesh-tear-and-collapse"), position: p.feetPosition, volume: 1 })
      ctx.emit("playSound", { clip: SND("inhuman-shriek-in-a-dead-relatives-voice"), position: p.feetPosition, volume: 1 })
      ctx.emit("flash", { target: p.id, color: "#ff2020", duration: 0.4 })
      ctx.emit("fx", { position: { ...p.feetPosition, y: p.feetPosition.y + 1.3 }, script: SPLIT })
    }
    if (s.berserk && now >= (s.hatchNext ?? 0)) { // the hatch snaps open again: the window to hit its face
      s.hatchUntil = now + T.hatchOpen; s.hatchNext = now + T.hatchOpen + T.hatchShut
      ctx.emit("playSound", { clip: SND("chitin-carapace-cracking-open"), position: p.feetPosition, volume: 0.9 })
      ctx.emit("highlightSet", { target: p.id, color: "#ff3030", style: "pulse", duration: T.hatchOpen / 1000 })
    }
    if (s.lastHp != null && (s.hp ?? T.hp) < s.lastHp) { once(p, "cdn/clip-hit-react.glb", 0.8); s.stunUntil = Math.max(s.stunUntil ?? 0, now + 250) }
    s.lastHp = s.hp ?? T.hp
    let prey = null, best = s.hunting ? T.sight * 1.8 : T.sight
    for (const pl of players) { if ((pl.state.hp ?? 1) <= 0) continue; const d = flat(pl.feetPosition, p.feetPosition); if (d < best) { best = d; prey = pl } }
    if (prey && !s.hunting) { // seen: the pack hears it in its head and turns as one
      s.hunting = true
      ctx.emit("playSound", { clip: SND("distorted-party-blower-and-giggle"), position: p.feetPosition, volume: 0.9 })
      for (const o of pack) if (o.id !== p.id && flat(o.feetPosition, p.feetPosition) < T.call) o.state.hunting = true
    }
    if (!prey && s.hunting && !players.some((pl) => flat(pl.feetPosition, p.feetPosition) < T.sight * 2.5)) s.hunting = false
    const target = prey && s.hunting ? prey.feetPosition : (s.hunting ? players[0].feetPosition : s.home ?? p.feetPosition)
    const d = flat(target, p.feetPosition), speed = s.berserk ? T.rage : s.hunting ? T.hunt : T.walk
    if (now < (s.stunUntil ?? 0) || d < (prey ? T.reach * 0.8 : 0.5)) { p.velocity = { x: 0, y: p.velocity.y + g * dt, z: 0 }; gait(ctx, p, "idle") }
    else {
      gait(ctx, p, speed > 2 ? "run" : "walk", speed > 2 ? speed / 3.4 : 0.8)
      const dx = (target.x - p.feetPosition.x) / d, dz = (target.z - p.feetPosition.z) / d
      p.velocity = { x: dx * speed, y: p.velocity.y + g * dt, z: dz * speed }
      p.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI }
    }
    const reach = s.berserk ? T.clawReach : T.reach, dmg = s.berserk ? T.clawDmg : T.biteDmg
    if (prey && best < reach && now >= (s.nextBite ?? 0)) {
      s.nextBite = now + (s.berserk ? T.clawMs : T.biteMs)
      once(p, "cdn/clip-attack.glb")
      prey.state.hp -= dmgAfterArmor(prey.state.look, dmg)
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z }
      ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4040" })
      ctx.emit("playSound", { clip: SND(s.berserk ? "fast-claw-slash-flesh" : "wet-teeth-bite-chomp"), position: at, volume: 0.9 })
      ctx.emit("screenShake", { intensity: 0.35, duration: 0.25 }, { audience: { player: prey.id } })
      ctx.emit("squash", { target: p.id, axis: "y", intensity: 0.12, duration: 0.2 })
    }
  }
  const gas = (ctx.self.session.gas ??= [])
  for (const b of ctx.query({ tags: ["l26-balloon"] })) {
    if ((b.state.hp ?? 10) <= 0) { // popped: the ammonia sac goes up in a choking cloud for 6 s
      gas.push({ x: b.feetPosition.x, y: b.feetPosition.y, z: b.feetPosition.z, until: now + 6000 })
      ctx.emit("fx", { position: { ...b.feetPosition, y: b.feetPosition.y + 1.1 }, script: GAS })
      ctx.emit("playSound", { clip: SND("balloon-pop-then-hissing-gas"), position: b.feetPosition, volume: 1 })
      ctx.destroy(b.id); continue
    }
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
  for (let i = gas.length - 1; i >= 0; i--) {
    const c = gas[i]; if (now > c.until) { gas.splice(i, 1); continue }
    for (const pl of players) if (flat(pl.feetPosition, c) < 3 && now >= (pl.state.gasAt ?? 0)) {
      pl.state.gasAt = now + 700; pl.state.hp -= 3
      ctx.emit("damageNumber", { position: { ...pl.feetPosition, y: pl.feetPosition.y + 1.2 }, value: 3, color: "#d8ff80" })
    }
  }
  ctx.sleep(0.1)
}
const GAS = `fx
pop gas burst=70 on=sphere(.3) life=4..6 v=sdir()*(.6..1.6) size=.6..1.2 acc=drag(1.3)+curl(.3)+buoy(.05) sz=$size*(.5>3) col=<.75,.85,.4> a=0>.45:.4>.75:.3>0 rot=spin(.15) r=sprite(smoke-puff,alpha)`
const SPLIT = `fx
pop gore burst=26 on=sphere(.25) life=.6..1 v=sdir()*(2..4)+up(1.5) size=.05..0.1 acc=grav() col=<.45,.02,.02> a=1>0 floor=stick r=sprite(soft-disc,alpha)
pop smoke burst=12 on=sphere(.3) life=1.2..2 v=up(.8)+sdir()*.4 size=.3..0.5 acc=buoy(.5)+drag(1) sz=$size*(.6>2) col=<.04,.04,.04> a=0>.6:.4>0 r=sprite(smoke-puff,alpha)`
