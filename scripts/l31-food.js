// Level 31 food court: the trash cans, the staff door, the clerk's tray watch and the seated customers. One script, state.kind picks the part.
import { L31_ZONE_X } from "./lib/level31-food.js";
const SIT = { m: "cdn/clip-sit-loop.glb", f: "cdn/clip-sit-female-loop.glb" };
const tell = (ctx, pl, text) => { pl.state.notice = { text, at: ctx.now() }; };
export const updateSchedule = { every: { seconds: 0.5 } };
export const ears = {
  press: (ctx, p) => {
    const pl = ctx.place.players.find((x) => x.id === p?.by), k = ctx.self.state.kind; if (!pl) return;
    if (k === "trash") {
      const had = pl.state.l31tray || pl.state.l31banned;
      pl.state.l31tray = false; pl.state.l31banned = false;
      tell(ctx, pl, had ? "Tray cleared." : "Nothing to throw away.");
      ctx.emit("playSound", { clip: "cdn/sfx-trash-can-flap-swing-thud.mp3", position: ctx.self.worldFeetPosition, volume: 0.5, maxDistance: 14 });
    } else if (k === "door") {
      tell(ctx, pl, "Locked.");
      ctx.emit("playSound", { clip: "cdn/sfx-locked-door-handle-rattle.mp3", position: ctx.self.worldFeetPosition, volume: 0.5, maxDistance: 14 });
    }
  },
};
export function update(ctx) {
  const me = ctx.self, k = me.state.kind;
  if (k === "sitter") { if (!me.anim.sit) me.anim.sit = { clip: SIT[me.state.sex === "f" ? "f" : "m"], weight: 1, loop: true }; return ctx.sleep(5); }
  if (k !== "clerk") return ctx.sleep();
  const h = me.state.home, p = me.feetPosition; // stays at the till
  if (h && Math.hypot(p.x - h.x, p.z - h.z) > 0.6) me.feetPosition = { x: h.x, y: p.y, z: h.z };
  for (const pl of ctx.place.players) {
    const s = pl.state;
    if (s.l31tray && !s.l31banned && pl.feetPosition.x < L31_ZONE_X) { s.l31banned = true; tell(ctx, pl, "You left the food court with your tray."); }
  }
}
