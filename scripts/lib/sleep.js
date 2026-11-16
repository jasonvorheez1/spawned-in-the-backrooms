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
  if (ctx.self.place === "level178") {
    ctx.emit("screenFlash", { color: "oklch(0.04 0.01 60)", duration: 2.6, intensity: 1 }, { audience: { player: ctx.self.id } });
    ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-bedsheets-rustle-settle-sigh.mp3", volume: 0.55 }, { audience: { player: ctx.self.id } });
    s.notice = { text: "The futon's warm. You're asleep before you finish the thought...", at: now };
    s.hp = Math.min(s.maxHp ?? s.hpMax ?? 100, (s.hp ?? 0) + 20); s.sanity = Math.min(100, (s.sanity ?? 0) + 25);
    ctx.cross(ctx.self, "level132#l132-arrive"); // under the fade; no player timer (they can stall after a host change)
    return true;
  }
  s.waitOpen = true; s.waitBed = true; s.bedId = bed?.id ?? null;
  return true;
}
