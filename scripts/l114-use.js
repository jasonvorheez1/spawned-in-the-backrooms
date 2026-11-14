// Level 114's pressables: the light switch (place.state.lit), and the far door in the void that lets you out to Level 9.
const SFX = "/cdn/moodboard-realistic-gritty/";
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), pos = ctx.self.worldFeetPosition;
    if (s.kind === "switch") {
      const lit = ctx.place.state.lit === false; ctx.place.state.lit = lit; s.verb = lit ? "Switch Off" : "Switch On"; s.info = lit ? "on" : "off";
      ctx.emit("playSound", { clip: SFX + "sfx-plastic-wall-light-switch-click.mp3", position: pos, volume: 0.7 }); return; }
    if (s.kind === "janine-tape" && who) { // pocket it; HALOGEN plays it (I > Tapes)
      const st = who.state, have = String(st.holotapes ?? "").split(",").filter(Boolean);
      if (!have.includes("janine")) { st.holotapes = [...have, "janine"].join(","); st.notice = { text: "M.E.G. Interview Log 10328 · in your bag · play it on HALOGEN (I > Tapes)", at: ctx.now() }; }
      else st.notice = { text: "You already have the interview tape.", at: ctx.now() };
      ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-cassette-tape-pickup-plastic-clack.mp3", position: pos, volume: 0.7 }, { audience: { player: by } });
      return; }
    if (s.kind === "sleep" && who) { // the lore exit: drift off in your old bed, wake on a Level 9 street
      who.state.notice = { text: "You curl up under the too-small blanket. The room hums. You drift off...", at: ctx.now() };
      ctx.emit("screenFlash", { color: "#000000", duration: 3.2, intensity: 1 }, { audience: { player: by } });
      ctx.emit("playSound", { clip: SFX + "sfx-blanket-rustle-settling-into-bed.mp3", position: pos, volume: 0.6 }, { audience: { player: by } });
      ctx.after(1.6, "wake", { by }); return; }
    if (s.kind === "out" && who) { ctx.emit("playSound", { clip: SFX + "sfx-old-wooden-hotel-door-creak-open.mp3", position: pos, volume: 0.6 }); ctx.cross(who, "level9"); }
  },
};
export function wake(ctx, { by }) { const who = ctx.getObject(by); if (!who || who.place !== "level114") return; who.state.notice = { text: "You wake on cold asphalt. Streetlights. Level 9.", at: ctx.now() }; ctx.cross(who, "level9"); }
