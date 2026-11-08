// Level 6.1's bent wall: a stretch of wall that buckles away from the room, cold blue behind its cracks (the way to the Blue Channel). Touch it and it is like cold water; it lets go of you. (The Blue Channel itself is not built yet.)
export function onTriggerEnter(ctx, other) {
  const w = other?.state; if (!w || w.level == null) return;
  const now = ctx.now(); if (now - (w.bentAt ?? -1e9) < 8000) return; w.bentAt = now;
  ctx.emit("screenFlash", { color: "#7ad0ff", duration: 0.9, intensity: 0.7 }, { audience: { player: other.id } });
  ctx.emit("cameraPunch", { direction: { x: -1, y: 0, z: 0 }, intensity: 0.5 }, { audience: { player: other.id } });
  w.sanity = Math.max(0, (w.sanity ?? 80) - 4);
  w.notice = { text: "The wall gives under your hand like cold water, and blue light comes through the cracks. Something beyond it is walking the other way. You take your hand back.", at: now };
  other.feetPosition = { x: other.feetPosition.x - 2.2, y: other.feetPosition.y, z: other.feetPosition.z };
}
