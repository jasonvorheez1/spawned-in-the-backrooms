// A threshold between levels: walk into it and you cross. state.to = the place you arrive in.
export function onTriggerEnter(ctx, other) {
  if (!other?.state || other.state.level == null || !ctx.self.state.to) return;
  ctx.emit("screenFlash", { color: "#fff6c8", duration: 0.6, intensity: 0.8 }, { audience: { player: other.id } });
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-static-burst-glitch-threshold.mp3", position: other.feetPosition, volume: 0.8 }, { audience: { player: other.id } });
  ctx.cross(other, ctx.self.state.to);
}
