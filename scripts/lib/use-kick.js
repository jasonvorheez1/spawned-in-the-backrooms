// The press answers in the thing's own body: one small motion, one specific sound, now and then a puff or a spark.
// Used by the Level 109, Level 169 and Hub usables. MOVES are the named motions; a row in a script's table picks one.
import { animate } from "builtin/tween";
export const SFX = "/cdn/moodboard-realistic-gritty/";
const FX = {
  spark: `fx
pop s burst=10..16 life=.2..0.45 v=sdir()*(1.2..2.6)+up(.6) size=.012..0.025 acc=grav()*.8+drag(.6) col=hdr(5,3,1)>hdr(2,.7,.2) a=1>0 sz=$size r=sprite(ember,add,velocity,.02)
pop f burst=1 life=.12 r=light(<1,.8,.5>,6,3)`,
  steam: `fx
pop p burst=8..12 life=.8..1.4 v=up(.6..1.1)+sdir()*.25 size=.1..0.2 acc=buoy(.4)+drag(1.2) col=<.9,.92,.95> a=0>.3:.25>.7:.1>0 sz=$size*(.6>2.2) rot=spin(.3) r=sprite(smoke-puff,alpha)`,
  dust: `fx
pop d burst=6..10 life=.6..1 v=sdir()*(.2..0.5)+up(.15) size=.06..0.14 acc=drag(1.4)+grav()*.05 col=<.62,.57,.48> a=0>.28:.3>.6:.12>0 sz=$size*(.7>1.8) r=sprite(smoke-puff,alpha)`,
  drops: `fx
pop w burst=8..14 life=.35..0.6 v=sdir()*(.4..0.9)+up(.8) size=.01..0.02 acc=grav() col=<.75,.85,.95> a=.8>0 sz=$size r=sprite(soft-disc,alpha)`,
  glow: `fx
pop g burst=1 life=.5 a=1>0 r=light(<1,.85,.6>,%i|3*(1>0),4)`,
};
// MOVES: what the whole object does in the first 0.2 s (base pose read from the call, never assumed past yaw)
export function kick(ctx, obj, move, o = {}) {
  if (!obj || !move) return;
  const p = obj.feetPosition ?? { x: 0, y: 0, z: 0 }, y = p.y ?? 0, yaw = o.yaw ?? 0, d = o.d ?? 1;
  const T = { duration: o.t ?? 0.35, easing: "easeOutQuad" };
  switch (move) {
    case "rattle": return animate(ctx, obj, { "rotation.roll": [0, 3 * d, -3 * d, 1.5 * d, 0] }, T);
    case "nod": return animate(ctx, obj, { "rotation.pitch": [0, -5 * d, 2 * d, 0] }, T);
    case "hop": return animate(ctx, obj, { "feetPosition.y": [y, y + 0.04 * d, y] }, { ...T, duration: o.t ?? 0.25 });
    case "sink": return animate(ctx, obj, { "feetPosition.y": [y, y - 0.015 * d, y - 0.015 * d, y] }, T);
    case "squash": return animate(ctx, obj, { scale: [1, 1 - 0.05 * d, 1 + 0.025 * d, 1] }, T);
    case "swing": return animate(ctx, obj, { "rotation.yaw": [yaw, yaw + 14 * d, yaw - 3 * d, yaw] }, { ...T, duration: o.t ?? 0.6 });
    case "flutter": return animate(ctx, obj, { "rotation.pitch": [0, -9 * d, 4 * d, -2 * d, 0] }, { ...T, duration: o.t ?? 0.7 });
    case "spin": return animate(ctx, obj, { "rotation.yaw": [yaw, yaw + 360 * d] }, { duration: o.t ?? 0.8, easing: "easeOutCubic" });
  }
}
export function snd(ctx, clip, pos, volume = 0.6, maxDistance = 14) {
  ctx.emit("playSound", { clip: clip.startsWith("/") || clip.startsWith("cdn/") ? clip : SFX + clip, position: pos, volume, maxDistance });
}
export function puff(ctx, kind, pos, params) { if (FX[kind]) ctx.emit("fx", { position: pos, script: FX[kind], params }); }
// one stamp per presser per thing on the presser's own state, so a rebuilt corridor can't be farmed by walking away and back
export function ready(w, id, ms, now) {
  const m = w.useCd ?? {}; if (now < (m[id] ?? 0)) return false;
  const keep = Object.entries(m).filter(([, t]) => t > now).slice(-40);
  w.useCd = { ...Object.fromEntries(keep), [id]: now + ms }; return true;
}
