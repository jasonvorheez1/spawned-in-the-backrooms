import TV from "./lib/data/tv-channels.yml";
// The screen on a placed CRT (scripts/lib/build-piece.js): E flips through the green house's channels, then off.
export const ears = {
  press: (ctx, { by }) => {
    const w = ctx.getObject(by)?.state, n = TV.channels.length, ch = ((ctx.self.state.ch ?? n) + 1) % (n + 1); // n = off
    ctx.self.state.ch = ch;
    ctx.emit("playSound", { clip: "cdn/sfx-old-crt-television-channel-click-static-burst.mp3", position: ctx.self.worldFeetPosition, volume: 0.5 });
    if (ch === n) { ctx.self.visible = false; ctx.self.audio = null; ctx.self.state.verb = "Turn on"; if (w) w.notice = { text: "TV off", at: ctx.now() }; return; }
    const c = TV.channels[ch];
    ctx.self.visible = true; ctx.self.material = { ...ctx.self.material, texture: c.video };
    ctx.self.audio = { clip: c.audio, loop: true, gain: 0.35, spatial: true, maxDistance: 12, bus: "Ambience" };
    ctx.self.state.verb = "Change channel";
    if (w) w.notice = { text: `CH ${ch + 1}: ${c.name}`, at: ctx.now() };
  },
};
