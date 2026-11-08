// The Bonus Room (johnadams2, Nov 8): the shared vaporwave mall hub. This behavior rides every player:
// it offers the mall after a death, opens the mall's counters (Tom's Diner, clothes, furniture, the Teleport Station)
// and answers their buttons. Food here is just for fun and never leaves the mall.
import { toHub, toSolo, HOMES, HUB_PLACE } from "./lib/hub.js"
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
    if (d.v === "level0") return toSolo(ctx, "main")
    const h = HOMES.find((x) => x.key === d.v)
    if (h && h.has(s)) return toSolo(ctx, h.to)
    ding(ctx, NOPE); tell(ctx, s, "You haven't unlocked that home yet.")
  }
}
