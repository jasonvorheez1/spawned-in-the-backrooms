// Level 0 moments that do something: the payphone that rings as you near it, the wanderer's note,
// and the far-sound emitter in the dark sector. state.kind picks the job.
import { heard } from "./lib/hear.js";
import { distance } from "builtin/vec3";
import { animate } from "builtin/tween";
const G = "cdn/moodboard-realistic-gritty/";
const RING = G + "sfx-old-payphone-mechanical-bell-ringing-loop.mp3";
const STATIC = G + "sfx-telephone-earpiece-line-static-hiss-and-crackle.mp3";
const PICKUP = G + "sfx-payphone-handset-lifted-off-metal-hook-clunk.mp3";
const WHISPER = "cdn/voice-dry-breathy-close-whispering-stranger-saying-" + encodeURIComponent("you walked past the way out twice. it moved again. don't trust the lights.") + ".mp3";
const FAR = [G + "sfx-distant-heavy-door-slam-echo-down-empty-hallway.mp3", G + "sfx-distant-slow-footsteps-on-damp-carpet-echo.mp3", G + "sfx-distant-fluorescent-tube-pop-and-glass-tinkle-echo.mp3"];
const DRIP = G + "sfx-slow-water-drips-into-shallow-puddle-loop.mp3";
const TEAR = G + "sfx-damp-wallpaper-strip-tearing-off-drywall.mp3";
const BUZZ = G + "sfx-exposed-live-wire-electrical-buzz-and-crackle.mp3";
const SPARK = `fx
pop spark burst=10..16 life=.2..0.5 v=sdir()*(1..2.5)+up(.5) size=.01..0.02 acc=grav() col=hdr(5,3.4,1.2) a=1>0 sz=$size r=sprite(ember,add,velocity,.02)`;
export { DRIP, STATIC };
const HARRIS = "/cdn/value.e08d2269e43a27187b456f25c25415a8282a384820411cdd5870a796a5bf6f6c.mp3", HARRIS_MS = 34000; // trimmed: the take repeated "if my wife ever… never mind" three times (Shelly: "talks about his wife on loop")

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), now = ctx.now();
    const pos = { ...ctx.self.worldFeetPosition, y: 1.6 };
    if (s.kind === "payphone") {
      if (now < (s.quietUntil ?? 0)) { heard(ctx, { clip: STATIC, position: pos, volume: 0.35, maxDistance: 8 }); if (who) who.state.notice = { text: "Dial tone. Nothing else.", at: now }; return; }
      s.quietUntil = now + 150000; ctx.self.audio = null; ctx.self.session.ring = false;
      heard(ctx, { clip: PICKUP, position: pos, volume: 0.6, maxDistance: 12 });
      heard(ctx, { clip: STATIC, position: pos, volume: 0.5, maxDistance: 10 });
      heard(ctx, { clip: WHISPER, position: pos, volume: 0.9, maxDistance: 6, bus: "Voice" });
      if (who) who.state.notice = { text: "…static… a whisper: “don't trust the lights.”", at: now };
    } else if (s.kind === "stairs" && who) { // a stairwell: the flight between the maze and the Manila Rooms below
      heard(ctx, { clip: s.sound, position: pos, volume: 0.8, maxDistance: 10 });
      ctx.emit("screenFlash", { color: "#000000", duration: 0.6, intensity: 1 }, { audience: { player: who.id } });
      who.feetPosition = s.to; who.velocity = { x: 0, y: 0, z: 0 }; who.rotation = { yaw: s.yaw };
    } else if (s.kind === "note" && who) {
      who.state.notice = { text: s.text, at: now };
    } else if (s.kind === "cassette" && who) {
      heard(ctx, { clip: PICKUP, position: pos, volume: 0.8, maxDistance: 12 });
      heard(ctx, { clip: STATIC, position: pos, volume: 0.4, maxDistance: 10 });
      if (now < (s.playingUntil ?? 0)) return; // one playback at a time
      s.playingUntil = now + HARRIS_MS;
      heard(ctx, { clip: HARRIS, position: pos, volume: 1, maxDistance: 9, bus: "Voice" }); // Investigator Harris, voiced (Shelly: "actual voice acting")
      who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 20);
      who.state.sub = {
        who: "INVESTIGATOR HARRIS · CASSETTE",
        t: "Day nineteen. If you're hearing this, you found the Manila Room. Sit down. Breathe. The hum can't get in here. Don't touch the standing water out there, and don't follow anything that sounds like a voice you know. Chalk arrows run west. The wall that flickers is the way out. Level One. I tried it once and came back. I'm going to try again. Harris. Investigator Harris.",
        at: now,
        d: HARRIS_MS,
      };
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 0.8, z: pos.z },
        text: "+20 SANITY (MANILA SANCTUARY LOG)",
        color: "#ffd36a",
        size: 1.1,
      }, { audience: { player: who.id } });
    } else if (s.kind === "damp-carpet" && who) {
      heard(ctx, { clip: DRIP, position: pos, volume: 0.85, maxDistance: 10 });
      who.state.sub = {
        who: "WET CARPET",
        t: "Soaked through. Warm, like something slept on it. Smells like mildew and old engine oil. You would not drink this.",
        at: now,
        d: 6500,
      };
      if (who.state.sanity > 5) who.state.sanity -= 2;
    } else if (s.kind === "peeling-wallpaper") { // no caption: the paper comes down and the wall says it
      const flap = ctx.getObject(ctx.self.id + "/flap"); s.open = !s.open; s.verb = s.open ? "Press It Back" : "Peel It Back";
      if (flap) animate(ctx, flap, { "rotation.yaw": s.open ? -150 : -14 }, { duration: s.open ? 0.7 : 0.45, easing: s.open ? "easeOutBounce" : "easeOutCubic" });
      heard(ctx, { clip: s.open ? TEAR : G + "sfx-clothing-rustle-getting-up-from-seat.mp3", position: pos, volume: 0.8, maxDistance: 10 });
      if (s.open && s.idx === 1) { heard(ctx, { clip: BUZZ, position: pos, volume: 0.5, maxDistance: 8 }); ctx.emit("fx", { position: { ...pos, y: 1.3 }, script: SPARK }); }
    } else if (s.kind === "meg-board" && who) {
      heard(ctx, { clip: G + "sfx-clothing-rustle-getting-up-from-seat.mp3", position: pos, volume: 0.7, maxDistance: 10 });
      who.state.sub = {
        who: "PINNED NOTICE",
        t: "Typed, then fixed in pen.\n• Don't drink off the carpet.\n• When the lights get loud, keep walking. Standing still is worse.\n• If something in the dark is smiling, look at it and back off slow. Don't run.\n• Somebody marked arrows in chalk, heading west. We haven't checked where they go.\n(pen) They go to a wall. Ask me how I know.",
        at: now,
        d: 9000,
      };
    } else if (s.kind === "noclip-wall" && who) {
      heard(ctx, { clip: STATIC, position: pos, volume: 0.8, maxDistance: 10 });
      who.state.sub = {
        who: "WARPED WALLPAPER",
        t: "Cold. It gives a little under your palm. The hiss is coming from inside.",
        at: now,
        d: 6000,
      };
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
