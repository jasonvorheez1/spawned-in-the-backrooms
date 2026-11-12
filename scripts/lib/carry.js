// Every threshold calls this just before it crosses a player. It notes the arrival marker the player is aimed at (player.js
// steps them onto it if the far level hadn't laid it yet), and what you hold comes through with you (the creator, Nov 11: "if i noclip holding something i should be able to take it
// with me (except bonus rooms)"). Called just before a threshold crosses a player: the prop in their hands (state.carryId,
// scripts/grab.js) and any creature they have by the scruff (state.heldBy) cross to the same link, and grab.js keeps
// carrying them on the far side. Never into the Bonus Room or another room: those links (toHub, toSolo) don't come here,
// and a link that names a room or the bonus place is refused anyway.
export function carryAcross(ctx, who, link) {
  const l = String(link ?? "");
  if (who?.state && l.includes("#") && !/world:|room:/.test(l)) who.state.xferTo = { link: l, at: ctx.now() }; // the marker to land on (scripts/player.js)
  if (!l || !who?.state || /world:|room:/.test(l) || /^\+?bonus(#|$)/.test(l)) return;
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
