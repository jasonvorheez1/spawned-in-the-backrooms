// Things that move on their own: a behavior any prop can wear. state.anim says how:
//   { kind: "spin", sec }                       turns round its up axis once every `sec` seconds (ceiling fans)
//   { kind: "sway", deg, sec, axis, phase }     swings about its origin, hung from the ceiling or a web (cables, hanging lamps, webs, cocoons)
//   { kind: "pulse", amp, sec, phase }          swells and settles (glow caps breathing)
//   { kind: "creak", from, to, sec, phase }     a door stirring in the draught: yaw drifts between two angles
// The engine does the tweening (builtin/tween), so a hundred of these cost the sim nothing per tick.
import { animate } from "builtin/tween";

function start(ctx) {
  const a = ctx.self.state?.anim; if (!a || ctx.self.session.ambientOn) return;
  ctx.self.session.ambientOn = true;
  const id = ctx.self.id, sec = a.sec ?? 3, delay = (a.phase ?? 0) * sec;
  if (a.kind === "spin") animate(ctx, id, { "rotation.yaw": [0, 360] }, { duration: sec, easing: "linear", loop: true, delay });
  else if (a.kind === "sway") animate(ctx, id, { [`rotation.${a.axis ?? "roll"}`]: [-(a.deg ?? 6), a.deg ?? 6] }, { duration: sec, easing: "easeInOutSine", direction: "alternate", loop: true, delay });
  else if (a.kind === "pulse") { const s = a.amp ?? 1.18; animate(ctx, id, { "scale.x": [1, s], "scale.y": [1, s], "scale.z": [1, s] }, { duration: sec, easing: "easeInOutSine", direction: "alternate", loop: true, delay }); }
  else if (a.kind === "creak") animate(ctx, id, { "rotation.yaw": [a.from ?? 0, a.to ?? 6] }, { duration: sec, easing: "easeInOutSine", direction: "alternate", loop: true, delay });
}
// the state may not be there yet when the object spawns, so the first update starts it too, then the object sleeps
export function onSpawn(ctx) { start(ctx); }
export function update(ctx) { start(ctx); ctx.sleep(); }
