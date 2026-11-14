// A marked EXIT door on Level 109: the wiki's only way out, to Level 114. Level 114 is not built yet, so the door says so and nobody crosses.
export const ears = {
  press: (ctx, { by }) => { const who = ctx.getObject(by); if (!who?.state) return;
    if ((ctx.world.files ?? []).some((f) => f.startsWith("places/level114/"))) { ctx.cross(who, "level114"); return; }
    who.state.notice = { text: "The exit door holds. Level 114 is not open yet.", at: ctx.now() };
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-steel-door-latch-clunk-and-rattle.mp3", position: ctx.self.worldFeetPosition, volume: 0.6 }); },
};
