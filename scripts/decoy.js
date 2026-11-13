// a test dummy: shows its hp, flashes when hit, folds at 0 and stands back up full after 3 s
export function update(ctx) {
  const s = ctx.self.state, now = ctx.now();
  if ((s.hp ?? 0) < (s.last ?? s.hp)) { ctx.emit("flash", { target: ctx.self.id, color: "#ff3030", duration: 0.12 }); ctx.emit("squash", { target: ctx.self.id, axis: "y", intensity: 0.15, duration: 0.2 }); }
  s.last = s.hp;
  if ((s.hp ?? 0) <= 0 && !s.downAt) { s.downAt = now; ctx.self.rotation = { yaw: 0, pitch: -80 }; ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-wooden-training-dummy-toppling-onto-concrete.mp3", position: ctx.self.feetPosition, volume: 0.8 }); }
  if (s.downAt && now - s.downAt > 3000) { s.downAt = 0; s.hp = s.maxHp; s.last = s.hp; ctx.self.rotation = { yaw: 0, pitch: 0 }; }
  ctx.sleep(0.15);
}
