// The doorway of a Level 3 steel door: with the door open, stepping in brings you out of its twin on the far side of the wall,
// that door swung open behind you. Runs on the walker's machine (onTriggerEnter), so the move is theirs and instant.
export function onTriggerEnter(ctx, other) {
  const st = ctx.self.state, door = ctx.getObject(st.door);
  if (!door?.state?.open) return;
  if (!ctx.place.players?.some((p) => p.id === other?.id)) return;
  const now = ctx.now(); if (now - (other.state?.hatchAt ?? 0) < 1200) return; // just came through: no ping-pong
  other.state.hatchAt = now;
  const twin = ctx.getObject(st.twin); if (twin) twin.state.open = true;
  other.feetPosition = { x: st.to.x, y: 0.05, z: st.to.z };
  other.velocity = { x: 0, y: 0, z: 0 };
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-steel-door-creak-open.mp3", position: { x: st.to.x, y: 1, z: st.to.z }, volume: 0.35, maxDistance: 18 });
}
