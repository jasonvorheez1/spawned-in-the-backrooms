// Level !: the adrenaline shot on the crash cart by the corridor mouth (Shelly Nov 17: "something at the start that helps, I want it harder").
// Run past it and you take it: 30 s of faster legs and lungs (scripts/lib/levelrun-mechanics.js agilityProfile reads lrunAdrenOn).
export function onTriggerEnter(ctx, other) {
  if (!other?.isLocal || !String(other.id).startsWith("player/")) return
  const s = other.state; if (s.lrunAdrenOn || s.lrunCut) return
  s.lrunAdren = ctx.now(); s.lrunAdrenOn = 1
  const v = ctx.getObject("lrun-adrenaline/vial"); if (v) v.visible = false
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-auto-injector-pen-click-and-hiss-into-thigh.mp3", volume: 1 }, { audience: { player: other.id } })
  ctx.emit("playSound", { clip: "/cdn/moodboard-gothic-horror/sfx-heartbeat-pounding-faster-and-faster.mp3", volume: 0.7 }, { audience: { player: other.id } })
  ctx.emit("screenFlash", { color: "#fff2c0", duration: 0.35, intensity: 0.5 }, { audience: { player: other.id } })
  ctx.emit("cameraPunch", { direction: { x: 0, y: 0, z: -1 }, intensity: 0.6 }, { audience: { player: other.id } })
  s.notice = { text: "Adrenaline. Your heart's hammering. Run.", at: ctx.now() }
}
