// Level !: the auto-injector on the crash cart by the corridor mouth (Shelly Nov 17: "it should be an item not an auto use thing").
// Walking up to the cart puts one Epinephrine auto-injector (stim_shot, scripts/lib/data/snacks.yml) in your bag; you use it when you choose.
// While its effect runs, Level !'s sprint is stronger (scripts/lib/levelrun-mechanics.js agilityProfile reads the med_stim effect).
export function onTriggerEnter(ctx, other) {
  if (!other?.isLocal || !String(other.id).startsWith("player/")) return
  const s = other.state; if (s.lrunCut || s.lrunGotShot) return
  s.lrunGotShot = 1
  s.snacks = { ...(s.snacks ?? {}), stim_shot: (s.snacks?.stim_shot ?? 0) + 1 }
  const v = ctx.getObject("lrun-adrenaline/vial"); if (v) v.visible = false
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-plastic-syringe-pocketed-quick-rustle.mp3", volume: 0.9 }, { audience: { player: other.id } })
  s.notice = { text: "Epinephrine auto-injector · in your bag. Use it when they're on you.", at: ctx.now() }
}
