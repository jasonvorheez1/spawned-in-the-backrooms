// Level 178 sliding shoji and the kitchen tap: E (scripts/interact.js `usable`) rings press; numbers in lib/data/level178.yml.
import { animate } from "builtin/tween";
import L from "./lib/data/level178.yml";
const STREAM = `fx
pop water rate=?mobile:30|60 on=disc(.008) life=.22..0.28 v=<0,-0.6,0> acc=grav() size=.01..0.016 col=<.82,.9,1> a=.55 sz=$size r=sprite(soft-disc,alpha,velocity,.04)`;
function leaf(ctx, instant) {
  const s = ctx.self.state, id = ctx.self.id + "/leaf", x = s.open ? s.openX : s.closedX;
  if (!ctx.getObject(id)) return;
  animate(ctx, id, { "feetPosition.x": x }, { duration: instant ? 0.01 : L.shoji.ease, easing: "easeOutCubic" });
}
function tap(ctx) {
  const s = ctx.self.state, id = ctx.self.id + "/stream", has = !!ctx.getObject(id), sp = L.tap.spout;
  if (s.on && !has) ctx.spawn("stream", { parent: ctx.self.id, feetPosition: { x: sp[0], y: sp[1], z: sp[2] }, fx: { script: STREAM },
    audio: { clip: "cdn/sfx-kitchen-tap-water-running-into-steel-sink-loop.mp3", loop: true, gain: L.tap.gain, spatial: true, maxDistance: L.tap.maxDistance } });
  if (!s.on && has) ctx.destroy(id);
}
export function onSpawn(ctx) { if (ctx.self.state.kind === "shoji") leaf(ctx, true); else tap(ctx); }
export const ears = {
  press: (ctx) => {
    const s = ctx.self.state, at = ctx.self.worldFeetPosition;
    if (s.kind === "shoji") {
      s.open = !s.open; s.verb = s.open ? "Close" : "Open"; leaf(ctx, false);
      ctx.emit("playSound", { clip: "cdn/sfx-wooden-shoji-paper-door-sliding-in-wood-track.mp3", position: at, volume: 0.45 });
    } else if (s.kind === "tap") {
      s.on = !s.on; s.verb = s.on ? "Turn off" : "Turn on"; tap(ctx);
      ctx.emit("playSound", { clip: "cdn/sfx-steel-kitchen-tap-lever-click.mp3", position: at, volume: 0.4 });
    }
  },
};
