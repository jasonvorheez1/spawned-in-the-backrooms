// Sleep (Shelly, Nov 16): every bed sleeps. E on a bed, or E beside one with nothing else in focus.
// Solo: the hours menu (scripts/rest.js) and the world clock jumps. Multiplayer: the clock is everyone's, so you sleep
// and heal, but the clock only jumps once every player in this place is in bed (Savi's pick). Level 178: you drift
// off and wake in Lumiria (Level 132), the same crossing the warm spring gives.
const BED = /\b(bed|beds|futon|cot|cots|bunk|bunks|mattress|bedroll|bedrolls|hammock)\b/i;
const NOT = /monitor|bunker|towel|yukata|lamp|side ?table|bedside|flower ?bed|seabed|riverbed|bed ?frame sign/i;
export function isBed(o) {
  if (!o) return false;
  const words = [o.state?.name, o.state?.kind, String(o.id ?? "").split("/").pop()?.replace(/[-_]/g, " "), ...(o.tags ?? [])].filter(Boolean).join(" ");
  return BED.test(words) && !NOT.test(words);
}
export const bedNear = (ctx, r = 2.6) => ctx.query({ radius: r }).find((o) => isBed(o)) ?? null;
// true when it handled the press
export function goToBed(ctx, bed) {
  const s = ctx.self.state, now = ctx.now();
  if (ctx.self.place === "level178") { if (bed?.id) ctx.emit("press", { by: ctx.self.id }, { to: bed.id }); return true; } // the futon itself rests you, then carries you to Lumiria (l178-prop.js)
  s.waitOpen = true; s.waitBed = true; s.bedId = bed?.id ?? null;
  return true;
}
