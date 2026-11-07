// Level 5's things you press that aren't people (state.kind): a radio (E turns the polonaise off and on, for the whole room),
// a sealed door (the lore's other levels: it tells you what's behind it and why it won't open).
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const say = (who, text, ctx) => { if (who) who.state.notice = { text, at: ctx.now() }; };
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by);
    if (s.kind === "radio") {
      s.on = !s.on;
      ctx.self.audio = s.on ? { ...s.track } : null;
      ctx.emit("playSound", { clip: G("radio-dial-click-static"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.6, maxDistance: 10 });
      s.verb = s.on ? "Switch off" : "Switch on";
      say(who, s.on ? "The valves glow. The violins come back mid-bar, as if they never stopped." : "Click. The room is suddenly very large and very quiet.", ctx);
      return;
    }
    if (s.kind === "sealed") {
      ctx.emit("playSound", { clip: G(s.sound ?? "heavy-door-handle-rattle-locked"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.7, maxDistance: 12 });
      say(who, s.text, ctx);
    }
  },
};
