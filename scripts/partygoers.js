import { clearSight } from './lib/sight.js'
const walled = (ctx, a, b, ids) => !clearSight(ctx, { x: a.x, y: a.y + 1, z: a.z }, { x: b.x, y: b.y + 1, z: b.z }, ids) // Shelly: no hits through walls
// Level 26 (Shelly's Entity 67 + 110 lore): one manager steps every Partygoer and every Carnivorous Balloon on the ship.
// Partygoers: nearsighted (they see 9 m), slow, and never alone: the one that sees you calls the pack within 16 m.
// Their arms end in toothed mouths: a bite every 1.3 s. Tagged l8-hostile so every weapon and kick hits them.
// Balloons: stationary. Step within reach of the ribbon and it stings: damage, and you're rooted a beat.
import { knocked } from "./lib/knock.js";
const knockedHold = (ctx, p, now, dt) => !!p.state?.heldBy && knocked(ctx, p, now, dt);
import { dmgAfterArmor } from "./lib/stats.js"
import { animate } from "builtin/tween"
const T = { sight: 14, call: 22, walk: 1.4, hunt: 3.4, reach: 1.7, biteDmg: 16, biteMs: 1000, hp: 220, // her picks: tough enough to need a mag
  berserkAt: 100, rage: 4.6, clawReach: 2.2, clawDmg: 24, clawMs: 700, hatchOpen: 2200, hatchShut: 3200, glance: 0.8, // berserker: arms tuck in, chest snaps open; shut hatch turns 80% of a hit
  lungeMin: 3, lungeMax: 7, lungeWind: 450, lungeDash: 380, lungeSpeed: 10, lungeDmg: 26, lungeCd: 4200, // the pounce: a crouch tell, then a dash that knocks you back
  barrageMin: 5, barrageMax: 13, barrageCd: 9000, barrageCast: 1100, barrageN: 5, barrageFly: 1300, barrageDmg: 12, barrageR: 1.8, // her picks: the balloon special
  comboGap: 280, dodgeChance: 0.3, dodgeCd: 2500, dodgeSpeed: 6, screamSan: 6, screamSlow: 700,
  balloonReach: 1.4, stingDmg: 9, stingMs: 2500 }
const PARTY = ["cdn/clip-chicken-dance-loop.glb", "cdn/clip-clap-loop.glb", "cdn/clip-laugh-loop.glb", "cdn/clip-step-hip-hop-dance-loop.glb", "cdn/clip-cheer-loop.glb"] // idle partying between hunts
const BALLOON = "/cdn/value.bbcd28912111e39613cec71f06224b7742148d3493106c89a76f739e3003f366.glb"
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const CLIP = { idle: "cdn/clip-idle-loop.glb", walk: "cdn/clip-walk-loop.glb", run: "cdn/clip-run-loop.glb" }
function gait(ctx, p, name, rate = 1) { // the body's legs follow its speed; one write when the gait changes
  const k = name + rate, seen = (ctx.self.session.gait ??= {})
  if (seen[p.id] === k) return; seen[p.id] = k
  p.anim.base = { clip: CLIP[name], loop: true, weight: 1, speed: rate, blend: 0.25 }
}
function once(p, clip, weight = 1) { p.anim.act = { clip, loop: false, weight, blend: 0.1 } }
function party(ctx, p, on) { // a loop on its own channel: the pack dances and claps until it smells you
  const seen = (ctx.self.session.party ??= {}), k = on ? PARTY[(p.id.length + Math.floor(ctx.now() / 9000)) % PARTY.length] : ""
  if (seen[p.id] === k) return; seen[p.id] = k
  p.anim.party = on ? { clip: k, loop: true, weight: 1, blend: 0.4 } : null
}
function bite(ctx, p, prey, dmg, snd) {
  if (walled(ctx, p.feetPosition, prey.feetPosition, [p.id, prey.id])) return
  prey.state.hp -= dmgAfterArmor(prey.state.look, dmg)
  const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z }
  ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4040" })
  ctx.emit("playSound", { clip: SND(snd), position: at, volume: 0.9 })
  ctx.emit("screenShake", { intensity: 0.4, duration: 0.25 }, { audience: { player: prey.id } })
  ctx.emit("cameraPunch", { direction: { x: prey.feetPosition.x - p.feetPosition.x, y: 0, z: prey.feetPosition.z - p.feetPosition.z }, intensity: 0.4 }, { audience: { player: prey.id } })
  ctx.emit("squash", { target: p.id, axis: "y", intensity: 0.15, duration: 0.2 })
}
export function update(ctx, dt) {
  const players = ctx.place.players; if (!players.length) return ctx.sleep(1)
  const now = ctx.now(), g = ctx.place.gravity?.y ?? -9.8
  const pack = ctx.query({ tags: ["partygoer"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })
  for (const p of pack) {
    const s = p.state
    if ((s.hp ?? T.hp) <= 0 && !s.dying) { // it folds and drops first: the body stays a beat on the deck
      s.dying = now; p.velocity = { x: 0, y: 0, z: 0 }; once(p, "cdn/clip-die.glb"); gait(ctx, p, "idle")
      ctx.emit("playSound", { clip: SND("inhuman-shriek-in-a-dead-relatives-voice"), position: p.feetPosition, volume: 0.7 })
      continue
    }
    if (s.dying) { // the body lies where it fell for an hour (rules: bodies removed after 1 h), then the black smoke takes it
      if (now - s.dying < 3600000) { if (now - s.dying < 2200) p.velocity = { x: 0, y: (p.velocity?.y ?? 0) + g * dt, z: 0 }; else if (!s.corpse) { s.corpse = true; p.velocity = { x: 0, y: 0, z: 0 }; p.anim.act = { clip: "cdn/clip-die.glb", loop: false, weight: 1, clamp: true }; p.anim.base = null; p.anim.party = null } continue }
      ctx.emit("fx", { position: { ...p.feetPosition, y: p.feetPosition.y + 1 }, script: `fx
pop smoke burst=30 on=sphere(.4) life=1.5..2.5 v=up(1.2)+sdir()*.6 size=.3..0.6 acc=buoy(.6)+drag(1) sz=$size*(.6>2.2) col=<.05,.05,.05> a=0>.7:.5>.7:.3>0 r=sprite(smoke-puff,alpha)` })
      ctx.emit("playSound", { clip: SND("deflating-party-balloon-squeal-and-thud"), position: p.feetPosition, volume: 0.8 })
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
      ctx.emit("playSound", { clip: SND("deflating-party-balloon-squeal-and-thud"), position: p.feetPosition, volume: 1 })
      ctx.emit("playSound", { clip: SND("inhuman-shriek-in-a-dead-relatives-voice"), position: p.feetPosition, volume: 1 })
      ctx.emit("flash", { target: p.id, color: "#ff2020", duration: 0.4 })
      ctx.emit("fx", { position: { ...p.feetPosition, y: p.feetPosition.y + 1.3 }, script: SPLIT })
    }
    if (s.berserk && now >= (s.hatchNext ?? 0)) { // the hatch snaps open again: the window to hit its face
      s.hatchUntil = now + T.hatchOpen; s.hatchNext = now + T.hatchOpen + T.hatchShut
      ctx.emit("playSound", { clip: SND("chitin-carapace-cracking-open"), position: p.feetPosition, volume: 0.9 })
      ctx.emit("highlightSet", { target: p.id, color: "#ff3030", style: "pulse", duration: T.hatchOpen / 1000 })
    }
    if (s.lastHp != null && (s.hp ?? T.hp) < s.lastHp) {
      if (s.hunting && now >= (s.dodgeAt ?? 0) && ctx.random() < T.dodgeChance && !s.move) { // a sidestep roll out of your line of fire
        s.dodgeAt = now + T.dodgeCd; s.move = "dodge"; s.moveUntil = now + 450; s.dodgeDir = ctx.random() < 0.5 ? -1 : 1
        once(p, "cdn/clip-roll.glb")
        ctx.emit("playSound", { clip: SND("distorted-party-blower-and-giggle"), position: p.feetPosition, volume: 0.6 })
      } else { once(p, "cdn/clip-hit-react.glb", 0.8); s.stunUntil = Math.max(s.stunUntil ?? 0, now + 200) }
    }
    s.lastHp = s.hp ?? T.hp
    let prey = null, best = s.hunting ? T.sight * 1.8 : T.sight
    for (const pl of players) { if ((pl.state.hp ?? 1) <= 0) continue; const d = flat(pl.feetPosition, p.feetPosition); if (d < best) { best = d; prey = pl } }
    if (prey && !s.hunting) { // seen: it screams, the pack hears it in its head and turns as one
      s.hunting = true; s.move = "scream"; s.moveUntil = now + 900
      once(p, "cdn/clip-angry.glb")
      p.rotation = { yaw: Math.atan2(-(prey.feetPosition.x - p.feetPosition.x), -(prey.feetPosition.z - p.feetPosition.z)) * 180 / Math.PI }
      ctx.emit("playSound", { clip: SND("inhuman-shriek-in-a-dead-relatives-voice"), position: p.feetPosition, volume: 1 })
      ctx.emit("playSound", { clip: SND("distorted-party-blower-and-giggle"), position: p.feetPosition, volume: 0.9 })
      if (best < T.sight) { prey.state.stungUntil = Math.max(prey.state.stungUntil ?? 0, now + T.screamSlow); if (typeof prey.state.san === "number") prey.state.san -= T.screamSan
        ctx.emit("screenShake", { intensity: 0.25, duration: 0.5 }, { audience: { player: prey.id } }) }
      for (const o of pack) if (o.id !== p.id && flat(o.feetPosition, p.feetPosition) < T.call) o.state.hunting = true
    }
    if (!prey && s.hunting && !players.some((pl) => flat(pl.feetPosition, p.feetPosition) < T.sight * 2.5)) s.hunting = false
    party(ctx, p, !s.hunting)
    const target = prey && s.hunting ? prey.feetPosition : (s.hunting && players[0] ? players[0].feetPosition : s.home ?? p.feetPosition)
    const d = flat(target, p.feetPosition), speed = s.berserk ? T.rage : s.hunting ? T.hunt : T.walk
    const dx = d > 0.01 ? (target.x - p.feetPosition.x) / d : 0, dz = d > 0.01 ? (target.z - p.feetPosition.z) / d : 0
    const face = () => { p.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI } }
    const vy = (p.velocity?.y ?? 0) + g * dt
    if (knockedHold(ctx, p, now, dt)) continue
    if (s.down) { // kicked flat: flung, tipped onto its back, then it scrambles up
      if (s.down.fly && knocked(ctx, p, now, dt)) continue
      if (!s.down) continue
      const t = now - s.down.at, k = Math.max(0, 1 - t / 450), yaw = typeof p.rotation === "number" ? p.rotation : (p.rotation?.yaw ?? 0)
      if (!s.down.fell) { s.down.fell = 1; s.move = null; s.combo = null; p.anim.act = { clip: "cdn/clip-fall-loop.glb", loop: true, weight: 1, blend: 0.08 }; animate(ctx, p.id, { "rotation.pitch": [0, -80] }, { duration: 0.3, easing: "easeOutQuad" }) }
      p.velocity = { x: s.down.x * k, y: vy, z: s.down.z * k }; gait(ctx, p, "idle")
      if (t > s.down.ms && !s.down.up) { s.down.up = 1; animate(ctx, p.id, { "rotation.pitch": [-80, 0] }, { duration: 0.35, easing: "easeOutBack" }); once(p, "cdn/clip-land.glb")
        ctx.emit("playSound", { clip: SND("distorted-party-blower-and-giggle"), position: p.feetPosition, volume: 0.7 }) }
      if (t > s.down.ms + 400) { s.down = null; p.rotation = { yaw, pitch: 0 }; s.stunUntil = 0 }
      continue
    }
    if (s.kb) { const t = now - s.kb.at; if (t < s.kb.ms) { const k = 1 - t / s.kb.ms; p.velocity = { x: s.kb.x * k, y: vy, z: s.kb.z * k }; once(p, "cdn/clip-hit-react.glb"); continue } s.kb = null }
    if (s.move && now >= (s.moveUntil ?? 0)) { // a move ends: the lunge's tell becomes its dash
      if (s.move === "windup") { s.move = "lunge"; s.moveUntil = now + T.lungeDash; s.lungeHit = false; once(p, "cdn/clip-attack.glb")
        ctx.emit("playSound", { clip: SND("teeth-snapping-chomp"), position: p.feetPosition, volume: 1 }) }
      else s.move = null
    }
    if (s.move === "barrage" && now >= (s.moveUntil ?? 0)) { s.move = null; once(p, "cdn/clip-ual-overhandthrow-ada55cac.glb") }
    if (s.move === "scream") { p.velocity = { x: 0, y: vy, z: 0 }; gait(ctx, p, "idle"); continue }
    if (s.move === "windup") { p.velocity = { x: 0, y: vy, z: 0 }; face(); gait(ctx, p, "idle"); continue }
    if (s.move === "dodge") { const sx = -dz * s.dodgeDir, sz = dx * s.dodgeDir; p.velocity = { x: sx * T.dodgeSpeed, y: vy, z: sz * T.dodgeSpeed }; continue }
    if (s.move === "lunge") {
      p.velocity = { x: dx * T.lungeSpeed, y: vy, z: dz * T.lungeSpeed }; face(); gait(ctx, p, "run", 1.4)
      if (prey && !s.lungeHit && best < T.reach + 0.4) { s.lungeHit = true; s.move = null; s.nextBite = now + T.biteMs
        bite(ctx, p, prey, T.lungeDmg, "fast-whoosh-and-rubber-smack")
        ctx.emit("impulse", { target: prey.id, impulse: { x: dx * 420, y: 160, z: dz * 420 } })
        ctx.emit("hitstop", { duration: 0.06 }, { audience: { player: prey.id } }) }
      continue
    }
    if (s.combo && now >= s.combo.at) { // the second mouth bites a beat after the first
      const c = s.combo; s.combo = null
      if (prey && best < T.reach + 0.3) { once(p, "cdn/clip-kick.glb", 0.6); bite(ctx, p, prey, Math.round(c.dmg * 0.7), "teeth-snapping-chomp") }
    }
    if (prey && s.hunting && best > T.barrageMin && best < T.barrageMax && now >= (s.barrageAt ?? now + 1) && now >= (s.stunUntil ?? 0)) { // the special: a leap, a fistful of balloons, a rain of pops
      s.barrageAt = now + T.barrageCd + ctx.random() * 3000; s.move = "barrage"; s.moveUntil = now + T.barrageCast; face()
      p.velocity = { x: 0, y: 6.5, z: 0 }; p.anim.act = { clip: "cdn/clip-magic-spell-casting-loop.glb", loop: true, weight: 1, blend: 0.1 }
      ctx.emit("playSound", { clip: SND("rubber-balloons-squeaking-and-inflating-fast"), position: p.feetPosition, volume: 1 })
      ctx.emit("playSound", { clip: SND("distorted-party-blower-and-giggle"), position: p.feetPosition, volume: 1 })
      ctx.emit("highlightSet", { target: p.id, color: "#ffd84a", style: "glow", duration: T.barrageCast / 1000 })
      const fly = (ctx.self.session.fly ??= [])
      for (let i = 0; i < T.barrageN; i++) {
        const a = (i / T.barrageN) * 6.283, o = { x: p.feetPosition.x + Math.cos(a) * 0.9, y: p.feetPosition.y + 2.6, z: p.feetPosition.z + Math.sin(a) * 0.9 }
        const t = { x: prey.feetPosition.x + (ctx.random() - 0.5) * 4, y: prey.feetPosition.y, z: prey.feetPosition.z + (ctx.random() - 0.5) * 4 }
        const id = ctx.spawn({ model: { id: BALLOON }, layout: { box: { min: { x: -0.22, y: 0, z: -0.22 }, max: { x: 0.22, y: 0.6, z: 0.22 } } }, feetPosition: o, lifetime: 4, audience: "near" })
        const hang = T.barrageCast / 1000 + i * 0.12, dur = hang + T.barrageFly / 1000
        animate(ctx, id, { "feetPosition.x": [o.x, o.x, t.x], "feetPosition.y": [o.y, o.y + 1.4, t.y + 0.3], "feetPosition.z": [o.z, o.z, t.z] }, { duration: dur, easing: "easeInQuad" })
        animate(ctx, id, { "rotation.yaw": "+=720" }, { duration: dur })
        fly.push({ id, t, at: now + dur * 1000 })
      }
      continue
    }
    if (s.move === "barrage") { p.velocity = { x: 0, y: vy, z: 0 }; face(); continue }
    if (prey && s.hunting && !s.berserk && best > T.lungeMin && best < T.lungeMax && now >= (s.lungeAt ?? 0) && now >= (s.stunUntil ?? 0)) { // the pounce, telegraphed by a crouch and a squash
      s.lungeAt = now + T.lungeCd + ctx.random() * 1500; s.move = "windup"; s.moveUntil = now + T.lungeWind
      once(p, "cdn/clip-crouch-idle-loop.glb"); face()
      ctx.emit("squash", { target: p.id, axis: "y", intensity: 0.25, duration: T.lungeWind / 1000 })
      ctx.emit("playSound", { clip: SND("distorted-party-blower-and-giggle"), position: p.feetPosition, volume: 1 })
      continue
    }
    if (now < (s.stunUntil ?? 0) || d < (prey ? T.reach * 0.8 : 0.5)) { p.velocity = { x: 0, y: vy, z: 0 }; gait(ctx, p, "idle"); if (prey) face() }
    else {
      gait(ctx, p, speed > 2 ? "run" : "walk", speed > 2 ? speed / 3.4 : 0.8)
      const weave = s.hunting && d > 2.5 ? Math.sin(now / 380 + p.id.length) * 0.45 : 0 // closes in on a zig-zag, harder to line up
      const vx = dx - dz * weave, vz = dz + dx * weave, n = Math.hypot(vx, vz) || 1
      p.velocity = { x: vx / n * speed, y: vy, z: vz / n * speed }; face()
    }
    const reach = s.berserk ? T.clawReach : T.reach, dmg = s.berserk ? T.clawDmg : T.biteDmg
    if (prey && best < reach && now >= (s.nextBite ?? 0)) {
      s.nextBite = now + (s.berserk ? T.clawMs : T.biteMs)
      once(p, s.berserk ? "cdn/clip-throw.glb" : "cdn/clip-attack.glb")
      bite(ctx, p, prey, dmg, s.berserk ? "fast-whoosh-and-rubber-smack" : "teeth-snapping-chomp")
      if (!s.berserk) s.combo = { at: now + T.comboGap, dmg }
    }
  }
  const fly = (ctx.self.session.fly ??= [])
  for (let i = fly.length - 1; i >= 0; i--) { // each barrage balloon lands and pops: confetti, a bang, a hit on whoever stands there
    const b = fly[i]; if (now < b.at) continue; fly.splice(i, 1)
    ctx.destroy(b.id)
    ctx.emit("fx", { position: { ...b.t, y: b.t.y + 0.4 }, script: POP })
    ctx.emit("playSound", { clip: SND("loud-balloon-pop-bang"), position: b.t, volume: 1 })
    for (const pl of players) { const d = flat(pl.feetPosition, b.t); if (d > T.barrageR) continue
      pl.state.hp -= dmgAfterArmor(pl.state.look, T.barrageDmg)
      ctx.emit("damageNumber", { position: { ...pl.feetPosition, y: pl.feetPosition.y + 1.2 }, value: T.barrageDmg, color: "#ffd84a" })
      ctx.emit("impulse", { target: pl.id, impulse: { x: (pl.feetPosition.x - b.t.x) * 120, y: 140, z: (pl.feetPosition.z - b.t.z) * 120 } })
      ctx.emit("screenShake", { intensity: 0.35, duration: 0.3 }, { audience: { player: pl.id } }) }
  }
  const gas = (ctx.self.session.gas ??= [])
  const bobbed = (ctx.self.session.bob ??= {})
  for (const b of ctx.query({ tags: ["l26-balloon"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    if (!bobbed[b.id]) { // they ride the air currents (lore: no legs, only drafts): a slow bob and a lazy turn, each on its own beat
      bobbed[b.id] = 1; const ph = (b.id.length * 0.37) % 1
      animate(ctx, b.id, { "feetPosition.y": "+=0.18" }, { duration: 2.2 + ph, easing: "easeInOutSine", direction: "alternate", loop: true })
      animate(ctx, b.id, { "rotation.yaw": "+=40" }, { duration: 5 + ph * 3, easing: "easeInOutSine", direction: "alternate", loop: true })
    }
    if ((b.state.hp ?? 10) <= 0) { // popped: the ammonia sac goes up in a choking cloud for 6 s
      gas.push({ x: b.feetPosition.x, y: b.feetPosition.y, z: b.feetPosition.z, until: now + 6000 })
      ctx.emit("fx", { position: { ...b.feetPosition, y: b.feetPosition.y + 1.1 }, script: GAS })
      ctx.emit("playSound", { clip: SND("balloon-pop-then-hissing-gas"), position: b.feetPosition, volume: 1 })
      const it = ["latex"]; if (ctx.random() < 0.55) it.push("latex"); if (ctx.random() < 0.06) it.push(ctx.random() < 0.6 ? "weapon:balloon_pistol" : "weapon:balloon_shotgun") // salvage (Shelly Nov 14): the skin is the ammo
      ctx.spawn({ tags: ["container", "remains", "l26-husk"], feetPosition: { x: b.feetPosition.x, z: b.feetPosition.z, y: { terrain: 0 } }, lifetime: 120, physics: "none",
        model: { id: BALLOON_GLB }, scale: { x: 1.3, y: 0.18, z: 1.3 }, state: { name: "Popped balloon", verb: "Search", items: it.join(",") } })
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
      ctx.emit("shake", { target: b.id, intensity: 0.5, duration: 0.6 })
      ctx.emit("squash", { target: b.id, axis: "y", intensity: 0.3, duration: 0.35 })
      ctx.emit("cameraPunch", { direction: { x: pl.feetPosition.x - b.feetPosition.x, y: 0, z: pl.feetPosition.z - b.feetPosition.z }, intensity: 0.35 }, { audience: { player: pl.id } })
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
pop confetti burst=40 on=sphere(.25) life=1.2..2 v=sdir()*(2..4)+up(2) size=.04..0.08 spin=-8..8 acc=grav()*.35+drag(1.6) col=<1,.85,.2>..<.2,.6,1> a=1>.8:1>0 rot=$age*$spin floor=stick r=sprite(soft-disc,alpha)
pop smoke burst=12 on=sphere(.3) life=1.2..2 v=up(.8)+sdir()*.4 size=.3..0.5 acc=buoy(.5)+drag(1) sz=$size*(.6>2) col=<.9,.85,.6> a=0>.4:.4>0 r=sprite(smoke-puff,alpha)`
const POP = `fx
pop confetti burst=45 on=sphere(.2) life=1..1.8 v=sdir()*(2.5..5)+up(2) size=.04..0.08 spin=-8..8 acc=grav()*.35+drag(1.8) col=<1,.3,.4>..<.3,.8,1> a=1>.8:1>0 rot=$age*$spin floor=stick r=sprite(soft-disc,alpha)
pop ring burst=1 life=.25 size=1.6 sz=$size*(.3>1) col=<1,.95,.7> a=.8>0 r=sprite(soft-disc,add)`
