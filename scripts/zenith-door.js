// Zenith Station's sliding doors (places/level01/sim.js lays them): two leaves part on their track when someone (or a cleaning bot) comes near.
// state: { leaves: [idA, idB], base: {x,y,z}, ax: {x,z} (the slide axis), mode: "auto" | "stuck" | "sealed" }
// stuck doors grind between a hand's width and a shoulder's width open, throwing sparks; sealed doors stay shut on their red light.
import { animate } from "builtin/tween";
export const updateSchedule = { every: { seconds: 0.25 } };
const HISS = "cdn/sfx-pneumatic-sliding-metal-door-hiss-open.mp3";
const SHUT = "cdn/sfx-sliding-metal-door-thud-shut-soft-hiss.mp3";
const GRIND = "cdn/sfx-jammed-sliding-door-motor-grinding-clunk-electric-spark.mp3";
const SPARK = `fx
pop spark burst=14..22 life=.2..0.45 v=sdir()*(2..4.5)+<0,1.5,0> size=.015..0.03 acc=grav()*.8 col=hdr(5,3,1)>hdr(2,.6,.1) a=1>0 sz=$size floor=bounce(.3) r=sprite(ember,add,velocity,.02)
pop flash burst=1 life=.08 at=point() r=light(<1,.7,.4>,6,3)`;
function place(ctx, open, dur) {
  const s = ctx.self.state, b = s.base, ax = s.ax;
  s.leaves.forEach((id, i) => {
    const leaf = ctx.getObject(id); if (!leaf) return;
    const side = i === 0 ? -1 : 1, off = side * (0.38 + 0.74 * open);
    animate(ctx, leaf, { "feetPosition.x": b.x + ax.x * off, "feetPosition.z": b.z + ax.z * off }, { duration: dur, easing: "easeInOutQuad" });
  });
}
export function update(ctx) {
  const s = ctx.self.state, ses = ctx.self.session;
  if (!s.leaves || s.mode === "sealed") return ctx.sleep(30);
  const p = s.base, now = ctx.now();
  if (s.mode === "stuck") {
    if (now < (ses.next ?? 0)) return;
    ses.next = now + 2200 + ctx.random() * 2600;
    const open = 0.18 + ctx.random() * 0.16;
    place(ctx, open, 0.35);
    ctx.emit("playSound", { clip: GRIND, position: { x: p.x, y: 2, z: p.z }, volume: 0.5, refDistance: 2, maxDistance: 18 });
    ctx.emit("fx", { position: { x: p.x + s.ax.x * 0.3, y: 2.25, z: p.z + s.ax.z * 0.3 }, script: SPARK });
    return;
  }
  let near = false;
  for (const pl of ctx.place.players) { const f = pl.feetPosition; if (Math.hypot(f.x - p.x, f.z - p.z) < 2.7 && Math.abs(f.y - p.y) < 2.5) { near = true; break; } }
  if (!near) for (const b of ctx.query({ tags: ["zbot"], center: p, radius: 1.8 })) { near = true; break; }
  if (near === !!ses.open) return;
  ses.open = near;
  place(ctx, near ? 1 : 0, near ? 0.55 : 0.7);
  ctx.emit("playSound", { clip: near ? HISS : SHUT, position: { x: p.x, y: 1.6, z: p.z }, volume: 0.55, refDistance: 2, maxDistance: 16 });
}
