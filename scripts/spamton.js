// Spamton's dumpster (Level 11 alley). state.up = the player he's fighting: the lid flies open, he stands up in it, pink glow.
// The battle itself lives on the player (scripts/spamton-fight.js); this only shows him.
import { animate } from "builtin/tween";

function show(ctx, up) {
  const id = ctx.self.id;
  const sp = ctx.getObject(id + "/spamton"), lid = ctx.getObject(id + "/lid"), glow = ctx.getObject(id + "/glow");
  if (sp) sp.visible = !!up;
  if (lid) animate(ctx, lid, { "rotation.pitch": up ? -110 : 0 }, { duration: up ? 0.18 : 0.4, easing: up ? "easeOutBack" : "easeOutBounce" });
  if (glow?.light) glow.light = { ...glow.light, intensity: up ? 3 : 0 };
  if (up) ctx.emit("shake", { target: id, intensity: 0.12, duration: 0.35 });
}
export function onSpawn(ctx) { ctx.self.session.shown = null; show(ctx, ctx.self.state.up); }
export function update(ctx) {
  const up = ctx.self.state.up ?? null;
  if (up !== ctx.self.session.shown) { ctx.self.session.shown = up; show(ctx, up); }
  if (up && !ctx.place.players.some((p) => p.id === up)) ctx.self.state.up = null; // he left mid-fight
  if (up) { // on his strings: he sways in the bin, and the light beats
    const sp = ctx.getObject(ctx.self.id + "/spamton"), glow = ctx.getObject(ctx.self.id + "/glow"), t = ctx.now() / 1000;
    if (sp) { sp.rotation = { yaw: Math.sin(t * 2.2) * 14, roll: Math.sin(t * 3.1) * 4 }; sp.feetPosition = { x: 0, y: 1.0 + Math.sin(t * 5) * 0.05, z: 0 }; }
    if (glow?.light) glow.light = { ...glow.light, intensity: 2 + Math.abs(Math.sin(t * 6)) * 2 };
  }
  ctx.sleep(up ? 0.1 : undefined);
}
