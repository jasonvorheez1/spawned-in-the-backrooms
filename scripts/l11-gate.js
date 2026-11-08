// A locked steel gate (Level 11 unlockables). state: { key, host, name, open }. Hacking or logging into the terminal named by
// `host` grants player.state.l11Access += key (scripts/os.js unlock); then E here slides the gate down into the floor.
import { heard } from "./lib/hear.js";
const has = (p, key) => String(p?.state?.l11Access ?? "").split(",").includes(key);
function open(ctx, now) {
  const s = ctx.self.state; if (s.open) return; s.open = true; s.verb = "Walk through"; s.info = "open"
  const f = ctx.self.feetPosition, y0 = s.y0 ?? f.y; s.y0 = y0
  ctx.self.feetPosition = { ...f, y: y0 - (s.drop ?? 3.2) } // drops into its slot; a press-slide reads as a gate, not a teleport
  if (!now) heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-steel-security-gate-rolling-down-with-chain-rattle.mp3", position: { ...f, y: y0 + 1.2 }, volume: 0.9, maxDistance: 25 })
}
export function onSpawn(ctx) {
  const s = ctx.self.state; s.y0 = ctx.self.feetPosition.y
  if ((ctx.place.players ?? []).some((p) => has(p, s.key))) { s.open = false; open(ctx, true) }
}
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who || s.open) return
    if (has(who, s.key)) return open(ctx)
    who.state.notice = { text: `ACCESS DENIED. This gate answers to terminal ${s.host}.`, at: ctx.now() }
    heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-security-keypad-access-denied-double-buzz.mp3", position: { ...ctx.self.feetPosition, y: (s.y0 ?? 0) + 1.2 }, volume: 0.7, maxDistance: 12 }, { audience: { player: by } })
  },
}
