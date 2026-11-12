// Level 13 fridge: a real container (scripts/interact.js loot flow) that restocks itself. The flats look after whoever stays.
// state: { name, verb, kind: "fridge13", items, lamp (its light's id), emptyAt, wasOpen }
import { heard } from "./lib/hear.js";
import L13 from "./lib/data/level13.yml";
export const updateSchedule = { every: { seconds: 0.5 } };
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
export function rollFridge(ctx) {
  const W = Object.entries(L13.fridgeLoot), tot = W.reduce((a, [, w]) => a + w, 0), [lo, hi] = L13.fridgeItems;
  const n = lo + Math.floor(ctx.random() * (hi - lo + 1)), out = [];
  for (let i = 0; i < n; i++) { let r = ctx.random() * tot; for (const [k, w] of W) { r -= w; if (r <= 0) { out.push(k); break; } } }
  if (!out.includes("almond") && ctx.random() < 0.5) out[0] = "almond";
  return out.join(",");
}
export function update(ctx) {
  const st = ctx.self.state, now = ctx.now(), id = ctx.self.id;
  const open = ctx.place.players.some((p) => p.state?.lootOpen === id);
  if (open !== !!st.wasOpen) {
    st.wasOpen = open;
    const lamp = st.lamp && ctx.getObject(st.lamp);
    if (lamp) lamp.light = { kind: "point", color: "oklch(0.95 0.04 95)", intensity: open ? 1.3 : 0, distance: 3 };
    heard(ctx, { clip: SND(open ? "old-refrigerator-door-open-seal-pop-rattle" : "old-refrigerator-door-close-soft-thump"), position: ctx.self.worldFeetPosition, volume: 0.55, maxDistance: 12 });
  }
  const empty = !String(st.items ?? "");
  if (!empty) { if (st.emptyAt) st.emptyAt = 0; return; }
  if (!st.emptyAt) { st.emptyAt = now; return; }
  if (!open && now - st.emptyAt >= L13.fridgeRestockS * 1000) { // restocked while nobody is looking in
    st.items = rollFridge(ctx); st.full = null; st.refillAt = 0; st.scavved = false; st.emptyAt = 0;
    heard(ctx, { clip: SND("refrigerator-compressor-kick-on-hum-short"), position: ctx.self.worldFeetPosition, volume: 0.3, maxDistance: 8 });
  }
}
