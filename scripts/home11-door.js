import TV from "./lib/data/tv-channels.yml";
// Inside the green house: the front door goes back to the porch, the bed rests you.
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), w = who?.state; if (!w) return;
    const now = ctx.now(), k = ctx.self.state.kind;
    if (k === "exit") {
      ctx.emit("playSound", { clip: "cdn/sfx-wooden-front-door-opens-and-closes.mp3", position: ctx.self.feetPosition, volume: 0.8 });
      ctx.emit("screenFlash", { color: "#000000", duration: 0.6, intensity: 0.9 }, { audience: { player: who.id } });
      ctx.cross(who, "level11#l11-from-home");
      return;
    }
    if (k === "tv") {
      const n = TV.channels.length, ch = ((ctx.self.state.ch ?? 0) + 1) % n, c = TV.channels[ch];
      ctx.self.state.ch = ch;
      ctx.self.material = { ...ctx.self.material, texture: c.video };
      const snd = ctx.getObject("h-tv-sound"); if (snd) snd.audio = { ...snd.audio, clip: c.audio };
      ctx.emit("playSound", { clip: "cdn/sfx-old-crt-television-channel-click-static-burst.mp3", position: ctx.self.feetPosition, volume: 0.5 });
      w.notice = { text: `CH ${ch + 1}: ${c.name}`, at: now };
      return;
    }
    if (k === "bed") {
      if (now - (w.homeRest ?? 0) < 60000) { w.notice = { text: "You just slept. You're not tired.", at: now }; return; }
      w.homeRest = now; w.sanity = Math.min(150, (w.sanity ?? 80) + 40); w.hp = (w.hp ?? 0) + 60;
      ctx.emit("screenFlash", { color: "#000000", duration: 1.6, intensity: 1 }, { audience: { player: who.id } });
      w.notice = { text: "You sleep for a while. +40 sanity, +60 HP.", at: now };
    }
  },
};
