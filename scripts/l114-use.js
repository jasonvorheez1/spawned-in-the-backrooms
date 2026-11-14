// Level 114's pressables: the light switch (place.state.lit), and the far door in the void that lets you out to Level 9.
const SFX = "/cdn/moodboard-realistic-gritty/";
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), pos = ctx.self.worldFeetPosition;
    if (s.kind === "switch") {
      const lit = ctx.place.state.lit === false; ctx.place.state.lit = lit; s.verb = lit ? "Switch Off" : "Switch On"; s.info = lit ? "on" : "off";
      ctx.emit("playSound", { clip: SFX + "sfx-plastic-wall-light-switch-click.mp3", position: pos, volume: 0.7 }); return; }
    if (s.kind === "out" && who) { ctx.emit("playSound", { clip: SFX + "sfx-old-wooden-hotel-door-creak-open.mp3", position: pos, volume: 0.6 }); ctx.cross(who, "level9"); }
  },
};
