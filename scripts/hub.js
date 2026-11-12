// The Bonus Room (johnadams2, Nov 8): the shared vaporwave mall hub. This behavior rides every player:
// it offers the mall after a death, opens the mall's counters (Tom's Diner, clothes, furniture, the Teleport Station)
// and answers their buttons. Food here is just for fun and never leaves the mall.
import { toHub, toSolo, HOMES, HUB_PLACE, lastLevel } from "./lib/hub.js"
import { animate } from "builtin/tween"
import { actedVoice } from "./lib/voices.js"
import B from "./lib/data/bonus.yml"
import FOODM from "./lib/data/bonus-food-models.yml"
import FURN from "./lib/data/furniture.yml"
import { parseCloth } from "./lib/clothes.js"
export const clothName = (tok) => { const p = parseCloth(tok); return p ? `${p.row?.name ?? p.kind}` : "shirt" }
const CASH = "/cdn/moodboard-realistic-gritty/sfx-cash-register-cha-ching-drawer.mp3"
const NOPE = "/cdn/moodboard-realistic-gritty/sfx-ui-denied-click.mp3"
const OFFER_MS = 15000 // her pick: how long the death card offers the mall

const tell = (ctx, s, text) => { s.notice = { text, at: ctx.now() } }
const ding = (ctx, clip) => ctx.emit("playSound", { clip, volume: 0.6 }, { audience: { player: ctx.self.id } })

export function update(ctx) {
  if (ctx.self.isLocal === false) return ctx.sleep()
  const s = ctx.self.state, ses = ctx.session, inHub = ctx.self.place === HUB_PLACE
  if (ses.ride) return rideStep(ctx, s, ses)
  if (s.trainHid) { s.trainHid = null; ctx.self.visible = true; ctx.view.camera = null } // off the train: you're seen again
  // a death outside the mall: once you're back on your feet, the mall is offered for a few seconds
  const down = !!(s.respawnAt || s.downAt)
  if (ses.hubDown && !down && s.t0Done && !inHub) s.hubOffer = { at: ctx.now() }
  ses.hubDown = down
  if (s.hubOffer && ctx.now() - s.hubOffer.at > OFFER_MS) s.hubOffer = null
  // walking out of the mall: what you ate there stays there
  if (!inHub && s.hubFood) s.hubFood = null
  if (inHub && s.hubOffer) s.hubOffer = null
  if (s.roomHop && ses.hubHopAt == null) ses.hubHopAt = ctx.now()
  if (s.roomHop && ctx.now() - ses.hubHopAt > 8000) { s.roomHop = null; ses.hubHopAt = null } // the hop landed (or failed); forget it
  if (inHub) { s.hubSeen = true; if (!s.hunger || s.hunger < 1) s.hunger = s.hunger ?? 100 } // no survival here: nothing drains (craft.js skips the mall)
  ctx.sleep(0.5)
}

function buyFood(ctx, s, key) {
  const f = B.food?.[key]; if (!f) return
  const cost = Math.round((f.price ?? 1) * 100)
  if ((s.cents ?? 0) < cost) { ding(ctx, NOPE); return tell(ctx, s, `Not enough Backdollars for ${f.name}.`) }
  s.cents -= cost; ding(ctx, CASH)
  s.hubFood = { key, at: ctx.now() } // held in your hand while you're in the mall; ui.js and the diner's models read it
  const m = FOODM[key]
  if (m) { // the food in your hand for a few bites, then gone: nothing leaves the mall
    const ses = ctx.session; if (ses.hubHeld && ctx.getObject(ses.hubHeld)) ctx.destroy(ses.hubHeld)
    const [w, h, d] = m.size
    ses.hubHeld = ctx.spawn({ parent: ctx.self.id, attachment: { bone: "RightHand" }, feetPosition: { x: 0, y: 0.04, z: 0.06 }, model: { id: m.model, forward: m.forward }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, visibleInFirstPerson: true, lifetime: 9, scope: "session" })
  }
  ctx.emit("playSound", { clip: f.drink ? "/cdn/moodboard-realistic-gritty/sfx-soda-bottle-gulp-swallow-ahh.mp3" : "/cdn/moodboard-realistic-gritty/sfx-crunchy-food-bite-chew.mp3", position: ctx.self.feetPosition, volume: 0.7 })
  tell(ctx, s, `${f.name}. ${f.line ?? "On the house's plate, not your belly. Enjoy."}`)
}
function buyCloth(ctx, s, i) {
  const row = B.clothes?.[i]; if (!row) return
  const [token, price] = row, c = { token, name: clothName(token), price }
  const cost = Math.round((price ?? 5) * 100)
  if ((s.cents ?? 0) < cost) { ding(ctx, NOPE); return tell(ctx, s, `Not enough Backdollars for the ${c.name}.`) }
  s.cents -= cost; ding(ctx, CASH)
  s.clothes = [...(s.clothes ? s.clothes.split(',').filter(Boolean) : []), token].join(',') // into your bag (I), to wear anywhere
  tell(ctx, s, `Bought the ${c.name}. It's in your bag (I) to wear.`)
}
function buyFurn(ctx, s, key) {
  const f = FURN.pieces?.[key]; if (!f) return
  const cost = Math.round((f.price ?? 10) * 100)
  if ((s.cents ?? 0) < cost) { ding(ctx, NOPE); return tell(ctx, s, `Not enough Backdollars for the ${f.name}.`) }
  s.cents -= cost; ding(ctx, CASH)
  s.furn = { ...(s.furn ?? {}), [key]: (s.furn?.[key] ?? 0) + 1 } // weightless: it waits in the build menu's Furniture tab (B)
  tell(ctx, s, `${f.name} bought. Place it from the Furniture tab in your build menu (B).`)
}

export function onInput(ctx, input) {
  if (!input.pressed?.hub) return
  const d = input.actionData?.hub ?? {}, s = ctx.self.state
  if (d.k === "go") { s.hubOffer = null; toHub(ctx); return }
  if (d.k === "close") { s.hubShop = null; return }
  if (ctx.self.place !== HUB_PLACE || !s.hubShop) return
  if (d.k === "food") return buyFood(ctx, s, d.v)
  if (d.k === "cloth") return buyCloth(ctx, s, d.v)
  if (d.k === "furn") return buyFurn(ctx, s, d.v)
  if (d.k === "travel") {
    s.hubShop = null; s.hubFood = null
    if (ctx.session.ride) return
    if (d.v === "level0") return board(ctx, s, "main", false)
    if (d.v === "testlab") return board(ctx, s, "testlab", false) // the Test Range (Shelly, Nov 10)
    if (d.v === "last") { const l = lastLevel(s); if (l) return board(ctx, s, l, true) }
    const h = HOMES.find((x) => x.key === d.v)
    if (h && h.has(s)) return board(ctx, s, h.to, false)
    ding(ctx, NOPE); tell(ctx, s, "You haven't unlocked that home yet.")
  }
}

// The boarding scene (Shelly: the train gets an animation and a cutscene of you getting on). Her picks: the car at bc-train, doors on its platform side (+x), ~6.5 s.
const TRAIN = { id: "bc-train", x: -22.3, y: 5.15, z: -14, door: { x: -21.1, z: -14 }, start: { x: -18.6, z: -14 } }
const RIDE = { walk: 1.9, board: 2.4, depart: 3.0, pull: 6.0, leave: 6.6, slide: 45 } // seconds into the scene; metres the car slides out
const CHIME = "cdn/sfx-subway-train-door-closing-two-tone-chime-and-pneumatic-hiss.mp3"
const DEPART = "cdn/sfx-subway-train-electric-motor-whine-accelerating-away-rails-clatter.mp3"
// Rico, the Bonus Line attendant, sees each rider off (Shelly Nov 12: "put rico there in cutscenes")
const RICO = { id: "bonus-rico", post: { x: -19.5, y: 5.5, z: -3.5, yaw: 180 }, door: { x: -19.9, y: 5.5, z: -12.4, yaw: 200 } }
const CALLS = ["All aboard! Arms in!", "Marigold's leaving, rider!", "Doors closing. Eyes front!", "Next stop, wherever you left off!"]
  .map((line) => actedVoice(RICO.id, line)).filter(Boolean)
function ricoCall(ctx, on) {
  const r = ctx.getObject(RICO.id); if (!r) return
  const p = RICO.door
  if (on) { // the camera cuts as the scene starts, so a far-off Rico is set a few steps away under the cut, then walks to the doors
    r.state.sceneUntil = ctx.now() + (RIDE.leave + 1) * 1000; r.anim.rico = null
    const f = r.feetPosition, dx = f.x - p.x, dz = f.z - p.z, d = Math.hypot(dx, dz) || 1
    const st = d > 4 ? { x: p.x + dx / d * 3.4, z: p.z + dz / d * 3.4 } : { x: f.x, z: f.z }
    r.feetPosition = { x: st.x, y: p.y, z: st.z }; r.rotation = { lookAt: { x: p.x, y: p.y, z: p.z } }
    r.anim.walk = { clip: "cdn/clip-walk-loop.glb", weight: 3, loop: true }
    animate(ctx, r, { "feetPosition.x": p.x, "feetPosition.z": p.z }, { duration: RIDE.walk, easing: "linear" })
    r.anim.wave = null
  } else { r.state.sceneUntil = 0; r.anim.walk = null; r.anim.wave = null } // his routine (scripts/rico.js) picks up from where he stands
  if (!on || !CALLS.length) return
  const last = ctx.session.ricoCall, choices = CALLS.filter((clip) => clip !== last)
  const clip = choices[Math.floor(ctx.random() * choices.length)] ?? CALLS[0]
  ctx.session.ricoCall = clip
  ctx.emit("playSound", { clip, position: { x: p.x, y: p.y + 1.6, z: p.z }, volume: 0.95, bus: "Voice", maxDistance: 20 })
}
function board(ctx, s, to, keep) {
  const me = ctx.self, now = ctx.now()
  ricoCall(ctx, true)
  ctx.session.ride = { to, keep, t0: now, phase: 0 }
  s.stungUntil = now + RIDE.leave * 1000 + 500 // the scene holds your feet
  me.feetPosition = { x: TRAIN.start.x, y: TRAIN.y + 0.35, z: TRAIN.start.z }; me.rotation = { yaw: 90 } // facing the car (-x)
  const real = ctx.place.objects[TRAIN.id]
  ctx.session.rideTrain = ctx.spawn({ audience: "local", scope: "session", feetPosition: { x: TRAIN.x, y: TRAIN.y, z: TRAIN.z }, rotation: { yaw: 90 }, model: real?.model ?? undefined, layout: real?.layout ?? { box: { min: { x: -7.75, y: 0, z: -1.3 }, max: { x: 7.75, y: 4, z: 1.3 } } } })
  me.hidden = [...(me.hidden ?? []).filter((h) => h !== TRAIN.id), TRAIN.id]
  ctx.view.camera = { eye: { x: -14.5, y: 7.4, z: -7.5 }, aim: { x: -20.8, y: 6.4, z: -14 }, fov: 50 }
}
function rideStep(ctx, s, ses) {
  const r = ses.ride, t = (ctx.now() - r.t0) / 1000, me = ctx.self
  if (t < RIDE.walk) { const k = t / RIDE.walk; me.velocity = { x: (TRAIN.door.x - TRAIN.start.x) / RIDE.walk, y: 0, z: 0 }; me.anim.walk = { clip: "cdn/clip-walk-loop.glb", weight: 1, loop: true }; void k; return }
  if (r.phase < 1) { r.phase = 1; me.velocity = { x: 0, y: 0, z: 0 }; me.anim.walk = null; { const rc = ctx.getObject(RICO.id); if (rc) { rc.anim.walk = null; rc.rotation = { yaw: RICO.door.yaw }; rc.anim.wave = { clip: "cdn/clip-wave.glb", weight: 3, mask: { from: "Spine" } } } } ctx.view.camera = { eye: { x: -18.2, y: 7.1, z: -9.8 }, aim: { x: -19.9, y: 6.9, z: -12.4 }, fov: 45 } } // Rico's close-up as he calls it
  if (t >= RIDE.board && r.phase < 2) { r.phase = 2; me.visible = false; s.trainHid = true
    ctx.emit("playSound", { clip: CHIME, position: { x: TRAIN.door.x, y: TRAIN.y + 1.5, z: TRAIN.door.z }, volume: 0.7 })
    ctx.view.camera = { eye: { x: -13, y: 7.8, z: -2 }, aim: { x: -22, y: 6.5, z: -16 }, fov: 55 } }
  if (t >= RIDE.depart && r.phase < 3) { r.phase = 3; const tr = ses.rideTrain
    ctx.emit("playSound", { clip: DEPART, position: { x: TRAIN.x, y: TRAIN.y + 1.5, z: TRAIN.z }, volume: 0.8 })
    if (tr && ctx.getObject(tr)) animate(ctx, ctx.getObject(tr), { "feetPosition.z": TRAIN.z - RIDE.slide }, { duration: RIDE.pull - RIDE.depart + 0.6, easing: "easeInQuad" }) }
  if (t >= RIDE.pull && r.phase < 4) { r.phase = 4; ctx.emit("screenFlash", { color: "#000000", duration: 0.7, intensity: 1 }, { audience: { player: me.id } }) }
  if (t >= RIDE.leave) {
    const tr = ses.rideTrain; if (tr && ctx.getObject(tr)) ctx.destroy(tr)
    me.hidden = (me.hidden ?? []).filter((h) => h !== TRAIN.id)
    ses.ride = null; ses.rideTrain = null; s.stungUntil = 0
    ricoCall(ctx, false)
    if (r.keep) s.wakeAtSave = true
    toSolo(ctx, r.to, me, r.keep)
  }
}
