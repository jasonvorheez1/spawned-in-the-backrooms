// Level 0 moments that do something: the payphone that rings as you near it, the wanderer's note,
// and the far-sound emitter in the dark sector. state.kind picks the job.
import { heard } from "./lib/hear.js";
import { distance } from "builtin/vec3";
const G = "cdn/moodboard-realistic-gritty/";
const RING = G + "sfx-old-payphone-mechanical-bell-ringing-loop.mp3";
const STATIC = G + "sfx-telephone-earpiece-line-static-hiss-and-crackle.mp3";
const PICKUP = G + "sfx-payphone-handset-lifted-off-metal-hook-clunk.mp3";
const WHISPER = "cdn/voice-dry-breathy-close-whispering-stranger-saying-" + encodeURIComponent("you walked past the way out twice. it moved again. don't trust the lights.") + ".mp3";
const FAR = [G + "sfx-distant-heavy-door-slam-echo-down-empty-hallway.mp3", G + "sfx-distant-slow-footsteps-on-damp-carpet-echo.mp3", G + "sfx-distant-fluorescent-tube-pop-and-glass-tinkle-echo.mp3"];
const DRIP = G + "sfx-slow-water-drips-into-shallow-puddle-loop.mp3";
export { DRIP };

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), now = ctx.now();
    if (s.kind === "payphone") {
      const pos = { ...ctx.self.worldFeetPosition, y: 1.6 };
      if (now < (s.quietUntil ?? 0)) { heard(ctx, { clip: STATIC, position: pos, volume: 0.35, maxDistance: 8 }); if (who) who.state.notice = { text: "Dial tone. Nothing else.", at: now }; return; }
      s.quietUntil = now + 150000; ctx.self.audio = null; ctx.self.session.ring = false;
      heard(ctx, { clip: PICKUP, position: pos, volume: 0.6, maxDistance: 12 });
      heard(ctx, { clip: STATIC, position: pos, volume: 0.5, maxDistance: 10 });
      heard(ctx, { clip: WHISPER, position: pos, volume: 0.9, maxDistance: 6, bus: "Voice" });
      if (who) who.state.notice = { text: "…static… a whisper: “don't trust the lights.”", at: now };
    } else if (s.kind === "note" && who) {
      who.state.notice = { text: s.text, at: now };
    }
  },
};

export function update(ctx) {
  const s = ctx.self.state, me = ctx.self.worldFeetPosition, now = ctx.now(), ss = ctx.self.session;
  if (s.kind === "payphone") {
    const near = ctx.place.players.some((p) => distance(p.feetPosition, me) < 7);
    const ring = near && now >= (s.quietUntil ?? 0);
    if (ring !== !!ss.ring) { ss.ring = ring; ctx.self.audio = ring ? { clip: RING, loop: true, gain: 0.45, spatial: true, maxDistance: 22 } : null; }
    return ctx.sleep(0.5);
  }
  if (s.kind === "far") { // a sound from somewhere you are not, every minute or two, only when someone is near enough to wonder
    ss.next ??= now + 20000 + ctx.random() * 40000;
    if (now >= ss.next) {
      ss.next = now + 45000 + ctx.random() * 75000;
      const p = ctx.place.players.find((p) => distance(p.feetPosition, me) < 90);
      if (p) {
        const a = ctx.random() * 6.283, r = 6 + ctx.random() * 12;
        heard(ctx, { clip: FAR[Math.floor(ctx.random() * FAR.length)], position: { x: me.x + Math.cos(a) * r, y: 1.5, z: me.z + Math.sin(a) * r }, volume: 0.55, refDistance: 6, maxDistance: 70 });
      }
    }
    return ctx.sleep(5);
  }
  return ctx.sleep(30);
}
