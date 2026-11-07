// The Beverly Room's pressables (state.kind): the unfinished Mahjong game wants you away from it.
const SND = "/cdn/moodboard-realistic-gritty/sfx-low-whisper-breath-swell-unsettling.mp3";
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by); if (!who) return;
    if (ctx.self.state.kind !== "mahjong") return;
    who.state.notice = { text: "You feel a strong urge to step away from it.", at: ctx.now() };
    const me = ctx.self.worldFeetPosition, p = who.worldFeetPosition;
    let dx = p.x - me.x, dz = p.z - me.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    who.state.l5Shove = { x: p.x + dx * 1.5, z: p.z + dz * 1.5, at: ctx.now() };
    ctx.emit("impulse", { target: by, impulse: { x: dx * 420, y: 60, z: dz * 420 } });
    ctx.emit("playSound", { clip: SND, position: { x: me.x, y: 1, z: me.z }, volume: 0.6 });
  },
};
