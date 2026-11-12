// Level 31 gift-counter gadgets: snacks.yml rows with a `use:` field land here from player.js useSnack.
const MUSIC = "/cdn/moodboard-toon-vibrant/music-muffled-80s-radio-pop-roller-rink-pa-speakers-loop.mp3";
const GLOW = ["oklch(0.85 0.25 140)", "oklch(0.7 0.25 350)", "oklch(0.8 0.15 210)"];
export function useGadget(ctx, token, v, n) {
  const s = ctx.self.state, now = ctx.now(), me = ctx.self.id, say = (text) => { s.notice = { text, at: now }; };
  const take = () => { s.snacks = { ...s.snacks, [token]: n - 1 }; };
  if (v.use === "glow") {
    take(); s.glowUntil = now + v.secs * 1000;
    ctx.spawn({ parent: me, tags: ["glow-necklace"], scope: "session", lifetime: v.secs, feetPosition: { x: 0, y: 1.35, z: 0 }, light: { kind: "point", color: GLOW[Math.floor(ctx.random() * GLOW.length)], intensity: 0.7, distance: 5 } });
    say(`${v.name} cracked. It glows for ${Math.round(v.secs / 60)} min`);
  } else if (v.use === "camera") {
    const left = (s.camShots ?? v.shots) - 1;
    ctx.emit("screenFlash", { color: "#ffffff", duration: 0.3, intensity: 1 }, { audience: { player: me } });
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-disposable-camera-shutter-click-flash-whine.mp3", position: ctx.self.feetPosition, volume: 0.6 });
    if (left <= 0) { take(); s.camShots = null; say("Click. That was the last shot"); } else { s.camShots = left; say(`Click. ${left} shots left`); }
  } else if (v.use === "walkman") {
    if (s.walkId && ctx.getObject(s.walkId)) { ctx.destroy(s.walkId); s.walkId = null; say("Walkman off"); return; }
    s.walkId = ctx.spawn({ parent: me, tags: ["walkman"], scope: "session", lifetime: v.secs, feetPosition: { x: 0, y: 1.5, z: 0 }, audio: { clip: MUSIC, gain: 0.18, loop: true, spatial: true, maxDistance: 5, bus: "music" } });
    say(`Walkman on. The tape runs ${Math.round(v.secs / 60)} min`);
  } else if (v.use === "slap") {
    ctx.emit("playSound", { clip: "/cdn/moodboard-toon-vibrant/sfx-slap-bracelet-snap-on-wrist.mp3", position: ctx.self.feetPosition, volume: 0.5 });
    say(`Snap. Max sanity +${v.maxSan} while you carry it`);
  }
}
