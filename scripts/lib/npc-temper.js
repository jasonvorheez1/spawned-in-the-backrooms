// Shared by every level's NPCs (Shelly Nov 13: "these types of fixes can also apply to every level not just one").
// A fix to how a person holds a weapon or loses their temper goes HERE, never in one level's script.

// what a body may wield: a child that names its kind (state.kind). Never a head, hair, ears or any wardrobe piece (cw-*),
// so no one ever swings their own hair again. Duplicates of the same weapon are spares to clear.
export function weaponsOf(ctx, me, headId = "head") {
  return (me?.children ?? [])
    .map((c) => (typeof c === "string" ? ctx.getObject(c) : c?.id ? ctx.getObject(c.id) : c))
    .filter((c) => c && c.state?.kind && !String(c.id).endsWith("/" + headId) && !/\/cw-/.test(String(c.id)) && (c.model || c.primitive));
}
export const heldWeapon = (ctx, me, headId) => weaponsOf(ctx, me, headId)[0] ?? null;

// temper: a first strike from a player is a warning (clumsy, a stray swing); only another inside the window is answered.
// Per player, on the NPC's own session. Returns "warn" or "answer". Bumps never reach here (talk.js "close" is only a remark).
export const STRIKE_WINDOW_MS = 20000;
export function strike(ctx, pid, windowMs = STRIKE_WINDOW_MS) {
  const ses = ctx.self.session, now = ctx.now(); ses.struck ??= {};
  const last = ses.struck[pid];
  if (last && now - last < windowMs) { ses.struck[pid] = 0; return "answer"; }
  ses.struck[pid] = now; return "warn";
}
