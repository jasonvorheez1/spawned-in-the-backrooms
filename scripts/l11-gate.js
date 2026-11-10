import { animate } from "builtin/tween";
// A locked steel gate (Level 11 unlockables). state: { key, host, name, open }. Hacking or logging into the terminal named by
// `host` grants player.state.l11Access += key (scripts/os.js unlock); then E here slides the gate down into the floor.
import { heard } from "./lib/hear.js";
const has = (p, key) => String(p?.state?.l11Access ?? "").split(",").includes(key);
function open(ctx, now) {
  const s = ctx.self.state; if (s.open) return; s.open = true; s.verb = "Walk through"; s.info = "open"
  const f = ctx.self.feetPosition, y0 = s.y0 ?? f.y; s.y0 = y0
  if (now) ctx.self.feetPosition = { ...f, y: y0 - (s.drop ?? 3.2) }
  else { ctx.emit("shake", { target: ctx.self.id, intensity: 0.04, duration: 0.4 }); animate(ctx, ctx.self, { "feetPosition.y": y0 - (s.drop ?? 3.2) }, { duration: 2.2, easing: "easeInOutQuad", delay: 0.35 }) } // a shudder, then it grinds down into its slot
  if (!now) heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-steel-security-gate-rolling-down-with-chain-rattle.mp3", position: { ...f, y: y0 + 1.2 }, volume: 0.9, maxDistance: 25 })
}
export function onSpawn(ctx) {
  const s = ctx.self.state; s.y0 = ctx.self.feetPosition.y
  // Nov 10 (Shelly: "the entrance to the tunnel is blocked again"): a rebuild re-lays the gate up while its saved state still reads open; an open gate always stands dropped
  if (s.open || (ctx.place.players ?? []).some((p) => has(p, s.key))) { s.open = false; open(ctx, true) }
}
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who) return
    if (s.open) { if (ctx.self.feetPosition.y > (s.y0 ?? 0) - 0.5) { s.open = false; open(ctx) } return } // open on paper, still standing: drop it
    if (has(who, s.key)) return open(ctx)
    const ex = s.exit, me = ctx.self.feetPosition, at = who.feetPosition // exit: { axis: "z", sign: 1 } = the side you leave from; a push bar opens it, no hack
    if (ex && Math.sign((at[ex.axis] ?? 0) - me[ex.axis]) === ex.sign) return open(ctx)
    who.state.notice = { text: `ACCESS DENIED. This gate answers to terminal ${s.host}.`, at: ctx.now() }
    heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-security-keypad-access-denied-double-buzz.mp3", position: { ...ctx.self.feetPosition, y: (s.y0 ?? 0) + 1.2 }, volume: 0.7, maxDistance: 12 }, { audience: { player: by } })
  },
}
