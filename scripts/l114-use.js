// Level 114's pressables: the light switch (place.state.lit), and the far door in the void that lets you out to Level 9.
import { animate } from "builtin/tween";
const SFX = "/cdn/moodboard-realistic-gritty/";
import { kick, puff, ready } from "./lib/use-kick.js";
const HUM = SFX + "sfx-crt-monitor-high-pitch-whine-and-soft-electric-hum-loop.mp3";
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), pos = ctx.self.worldFeetPosition;
    if (s.kind === "television") {
      const p = ctx.place.players.find((p) => p.id === by);
      const feet = p?.worldFeetPosition ?? p?.feetPosition;
      const screen = ctx.getObject(ctx.self.id + "/screen");
      if (!feet || p.state.dead || !screen || Math.hypot(feet.x - pos.x, feet.y - pos.y, feet.z - pos.z) > 3) return;
      s.on = !s.on;
      s.verb = s.on ? "Turn off" : "Turn on";
      s.info = s.on ? "The broadcast repeats" : "A signal beneath the static";
      if (s.on) { screen.visible = true; animate(ctx, screen, { "scale.y": [0.02, 1.08, 1], "scale.x": [1.05, 1, 1] }, { duration: 0.22, easing: "easeOutQuad" }); } // the tube warms from a line
      else { animate(ctx, screen, { "scale.y": [1, 0.02], "scale.x": [1, 0.3] }, { duration: 0.18, easing: "easeInQuad" }); ctx.after(0.2, "dark", {}); } // and collapses to a dot
      kick(ctx, ctx.self, "rattle", { d: 0.4 });
      screen.audio = s.on ? { clip: HUM, loop: true, gain: 0.16, spatial: true, maxDistance: 5 } : null;
      ctx.emit("playSound", { clip: SFX + "sfx-old-crt-television-dial-click-static-burst.mp3", position: pos, volume: 0.45, maxDistance: 7 });
      if (s.on) {
        const have = String(p.state.pages ?? "").split(",").filter(Boolean);
        if (!have.includes("31")) {
          p.state.pages = [...have, "31"].join(",");
          p.state.pickedAt = ctx.now();
        }
        p.state.notice = { text: "The crawl reads: LEAVE THE CEILING LIGHT ON. IF YOU LEAVE, FOLLOW THE VOID TO THE FRONT DOOR.", at: ctx.now() };
      }
      return;
    }
    if (s.kind === "switch") {
      const lit = ctx.place.state.lit === false; ctx.place.state.lit = lit; s.verb = lit ? "Switch Off" : "Switch On"; s.info = lit ? "on" : "off";
      animate(ctx, ctx.self, { "rotation.pitch": [lit ? 14 : -14, lit ? -16 : 16, lit ? -14 : 14] }, { duration: 0.12, easing: "easeOutQuad" }); // the rocker flips
      ctx.emit("playSound", { clip: SFX + "sfx-plastic-wall-light-switch-click.mp3", position: pos, volume: 0.7 });
      if (lit) {
        ctx.emit("playSound", { clip: SFX + "sfx-fluorescent-tube-flicker-ping-then-steady-buzz.mp3", position: { ...pos, y: 2.4 }, volume: 0.5, maxDistance: 10 });
        puff(ctx, "glow", { ...pos, y: 2.3 }, { i: 4 });
        if (who?.state && ready(who.state, "l114:lit", 3 * 60000, ctx.now())) { who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 4); who.state.notice = { text: "The overhead light catches. The window goes back to being a window. Sanity +4", at: ctx.now() }; }
      }
      return; }
    if (s.kind === "janine-tape" && who) { // pocket it; HALOGEN plays it (I > Tapes)
      animate(ctx, ctx.self, { "feetPosition.y": [pos.y, pos.y + 0.06, pos.y], "rotation.yaw": [0, 200, 180] }, { duration: 0.45, easing: "easeOutQuad" }); // it flips over in your fingers before it goes in the bag
      const st = who.state, have = String(st.holotapes ?? "").split(",").filter(Boolean);
      if (!have.includes("janine")) { st.holotapes = [...have, "janine"].join(","); st.notice = { text: "M.E.G. Interview Log 10328 · in your bag · play it on HALOGEN (I > Tapes)", at: ctx.now() }; }
      else st.notice = { text: "Her tape's already in your bag. This is just where it sat.", at: ctx.now() };
      ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-cassette-tape-pickup-plastic-clack.mp3", position: pos, volume: 0.7 }, { audience: { player: by } });
      return; }
    if (s.kind === "sleep" && who) { // the lore exit: drift off in your old bed, wake on a Level 9 street
      kick(ctx, ctx.self, "squash", { d: 1.2, t: 0.5 }); // the mattress takes your weight
      who.state.notice = { text: "Blanket's too short; your feet stay out. You're asleep before you can fix it.", at: ctx.now() };
      ctx.emit("screenFlash", { color: "#000000", duration: 3.2, intensity: 1 }, { audience: { player: by } });
      ctx.emit("playSound", { clip: SFX + "sfx-blanket-rustle-settling-into-bed.mp3", position: pos, volume: 0.6 }, { audience: { player: by } });
      ctx.after(1.6, "wake", { by }); return; }
    if (s.kind === "out" && who) { ctx.emit("playSound", { clip: SFX + "sfx-old-wooden-hotel-door-creak-open.mp3", position: pos, volume: 0.6 }); ctx.cross(who, "level9"); }
  },
};
export function wake(ctx, { by }) { const who = ctx.getObject(by); if (!who || who.place !== "level114") return; who.state.notice = { text: "You wake on cold asphalt. Streetlights. Level 9.", at: ctx.now() }; ctx.cross(who, "level9"); }
export function dark(ctx) { const sc = ctx.getObject(ctx.self.id + "/screen"); if (sc && !ctx.self.state.on) { sc.visible = false; sc.scale = { x: 1, y: 1, z: 1 }; } }
