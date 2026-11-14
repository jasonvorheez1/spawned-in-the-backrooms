// The S.S. Fun gangway, both ends. mode "board": the shell door on the grounded hull, walk in or press to board Level 26.
// mode "deck": the gate on Level 26's port rail; it opens on the place the ship has grounded in, else reads the sea.
import { where } from "./lib/ssfun-voyage.js";
import { notify } from "./lib/notify.js";
import { carryAcross } from "./lib/carry.js";
import { PLACE_LABELS } from "./lib/places.js";
const label = (p) => PLACE_LABELS?.[p] ?? p;
function go(ctx, who) {
  const st = ctx.self.state;
  if (st.mode === "board") { ctx.emit("screenFlash", { color: "#2f5a35", duration: 1.2, intensity: 1 }, { audience: { player: who.id } });
    who.state.notice = { text: "Up the gangway, into music through the steel. The S.S. Fun =).", at: ctx.now() }; carryAcross(ctx, who, "level26"); return ctx.cross(who, "level26#ssfun-gate"); }
  const w = where(ctx.now());
  if (!w.place) return notify(ctx, who, `Grey-green water all the way down. Next landfall: ${label(w.next)}, in about ${Math.ceil(w.left / 60000)} min.`);
  ctx.emit("screenFlash", { color: "#2f5a35", duration: 1.2, intensity: 1 }, { audience: { player: who.id } });
  who.state.notice = { text: `Down the gangway into ${label(w.place)}. The ship sails in ${Math.ceil(w.left / 60000)} min.`, at: ctx.now() };
  carryAcross(ctx, who, w.place); return ctx.cross(who, `${w.place}#ssfun-foot`);
}
export const ears = { press(ctx, { by }) { const who = ctx.getObject(by); if (who) go(ctx, who); } };
export function onTriggerEnter(ctx, other) { if (ctx.self.state.mode === "board" && other?.state?.level != null) go(ctx, other); }
export function update(ctx) { // the deck gate's sign keeps the schedule
  if (ctx.self.state.mode !== "deck") return ctx.sleep();
  const w = where(ctx.now()), t = w.place ? `Gangway down · ${label(w.place)} · sails in ${Math.ceil(w.left / 60000)} min` : `At sea · next ${label(w.next)} in ${Math.ceil(w.left / 60000)} min`;
  if (ctx.self.state.sign !== t) { ctx.self.state.sign = t; ctx.self.state.name = w.place ? `Gangway to ${label(w.place)}` : "Gangway (stowed)"; }
  ctx.sleep(5);
}
