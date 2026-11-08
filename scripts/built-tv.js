// A CRT TV placed from the build menu (scripts/lib/build-piece.js): E flips the same channels as the green house's set, the last press turns it off.
import TV from "./lib/data/tv-channels.yml";
const kid = (ctx, n) => ctx.getObject(`${ctx.self.id}/${n}`);
export const ears = {
  press: (ctx, { by }) => {
    const w = ctx.getObject(by)?.state, n = TV.channels.length, ch = ((ctx.self.state.ch ?? n) + 1) % (n + 1); // n = off; a new set starts off
    ctx.self.state.ch = ch;
    const scr = kid(ctx, "screen"), snd = kid(ctx, "sound"), glow = kid(ctx, "glow");
    ctx.emit("playSound", { clip: "cdn/sfx-old-crt-television-channel-click-static-burst.mp3", position: ctx.self.feetPosition, volume: 0.5 });
    if (ch === n) {
      if (scr) scr.visible = false; if (snd) snd.audio = null; if (glow) glow.light = { kind: "point", color: "oklch(0.8 0.06 240)", intensity: 0, distance: 4 };
      ctx.self.state.verb = "Turn on"; if (w) w.notice = { text: "TV off", at: ctx.now() }; return;
    }
    const c = TV.channels[ch];
    if (scr) { scr.visible = true; scr.material = { ...(scr.material ?? {}), texture: c.video, emissive: "#ffffff", emissiveIntensity: 0.9, roughness: 0.2 }; }
    if (snd) snd.audio = { clip: c.audio, loop: true, gain: 0.35, spatial: true, maxDistance: 12, bus: "Ambience" };
    if (glow) glow.light = { kind: "point", color: "oklch(0.8 0.06 240)", intensity: 0.5, distance: 4 };
    ctx.self.state.verb = "Change channel"; if (w) w.notice = { text: `CH ${ch + 1}: ${c.name}`, at: ctx.now() };
  },
};
