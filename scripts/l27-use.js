// Level 27: walk into the tunnel's end and you come out where you went in (your tub, unless you came another way); press E at the spring to drink.
export function onTriggerEnter(ctx, other) {
  if (ctx.self.state.kind !== "exit" || !other?.state || other.state.level == null) return;
  const to = other.state.l27from || "home11#h-from-l27";
  ctx.emit("screenFlash", { color: "#000000", duration: 0.9, intensity: 1 }, { audience: { player: other.id } });
  ctx.emit("playSound", { clip: "cdn/sfx-shower-water-running-then-turned-off-squeak.mp3", volume: 0.6 }, { audience: { player: other.id } });
  ctx.cross(other, to);
}
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), w = who?.state; if (!w || ctx.self.state.kind !== "drink") return;
    const now = ctx.now();
    w.thirst = Math.min(100, (w.thirst ?? 100) + 35); w.sanity = (w.sanity ?? 0) + 5;
    w.notice = { text: "Warm and mineral, a little salty. Your head clears. Thirst +35", at: now };
    ctx.emit("playSound", { clip: "cdn/sfx-cupped-hands-scooping-and-drinking-water-gulp.mp3", position: ctx.self.feetPosition, volume: 0.7 });
  },
};
