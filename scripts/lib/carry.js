import { bring } from "./companion.js";
// Every threshold calls this just before it crosses a player. It notes the arrival marker the player is aimed at (player.js
// steps them onto it if the far level hadn't laid it yet), and what you hold (plus nearby companions) comes through with you
// (except into the Bonus Room or another room).
export function carryAcross(ctx, who, link) {
  const l = String(link ?? "");
  if (who?.state && l.includes("#") && !/world:|room:/.test(l)) who.state.xferTo = { link: l, at: ctx.now() }; // the marker to land on (scripts/player.js)
  if (!l || !who?.state || /world:|room:/.test(l) || /^\+?bonus(#|$)/.test(l)) return;
  bring(ctx, who, l);
  const ids = new Set();
  if (who.state.carryId) ids.add(who.state.carryId);
  const at = who.feetPosition;
  if (at) for (const o of ctx.query({ radius: 4, center: at })) if (o.state?.heldBy === who.id) ids.add(o.id);
  for (const id of ids) {
    if (String(id).startsWith("player/")) continue;
    const o = ctx.getObject(id); if (!o) continue;
    try { ctx.cross(o, l); } catch (e) { ctx.log("carryAcross", id, String(e?.message ?? e)); }
  }
}
