// A Hub level door (the frame object hd-<id>, tagged usable) and the threshold behind its slab (hd-<id>-t).
// Three stand open for good. The rest take their own Level Key: the key is spent, the slab slides, and it shuts again on its own.
// Nothing about an unlock is saved: the next visitor finds it shut. Lockpicks never see it (it is no 'door' to scripts/lockpick.js).
import { animate } from "builtin/tween";
import { doorById, KEY_NAMES, sealed } from "./lib/thehub.js";
import { hasKey, spendKey, keysOf } from "./lib/hubkeys.js";
import { carryAcross } from "./lib/carry.js";
import { notify } from "./lib/notify.js";
const SLIDE = 2.75, HOLD = 25;
const S = (n) => `cdn/sfx-${n}.mp3`;
const GRIND = S("massive-concrete-slab-door-grinding-open-on-steel-track-stone-scrape-rumble"), THUD = S("heavy-concrete-slab-door-slamming-shut-deep-stone-boom"), KEYIN = S("large-iron-key-turning-in-heavy-old-lock-clunk"), DEAD = S("iron-key-rattling-in-wrong-lock-refusing-dull-clack");
const mid = (o) => ({ x: o.worldFeetPosition.x, y: 1.4, z: o.worldFeetPosition.z });
function slide(ctx, open) {
  const leaf = ctx.getObject(ctx.self.id + "/leaf"); if (!leaf) return;
  animate(ctx, leaf, { "feetPosition.x": open ? SLIDE : 0 }, { duration: open ? 3.2 : 2.4, easing: open ? "easeInOutQuad" : "easeInQuad" });
  ctx.emit("playSound", { clip: GRIND, position: mid(ctx.self), volume: 0.9, refDistance: 6, maxDistance: 70 });
  if (!open) ctx.after(2.4, "shut");
}
export function shut(ctx) { ctx.emit("playSound", { clip: THUD, position: mid(ctx.self), volume: 1, refDistance: 8, maxDistance: 90 }); ctx.emit("screenShake", { intensity: 0.15, duration: 0.25 }, { audience: { nearby: mid(ctx.self), radius: 12 } }); }
export function close(ctx) { if (!ctx.self.state.open || ctx.self.state.always) return; ctx.self.state.open = false; ctx.self.state.name = "Concrete door"; slide(ctx, false); }
export const ears = {
  press(ctx, { by }) {
    const d = doorById(ctx.self.id), who = ctx.getObject(by), st = ctx.self.state; if (!d || !who) return;
    if (st.open) return notify(ctx, who, d.open && !d.open.place ? "Cold air. No floor you can see past the sill. Nobody has come back to say what Level 178 does with people." : (d.open?.place === "level1" ? "It stands open. Level 1 past the sill, and a marked door there that leads back here." : d.open?.place === "level178" ? "It stands open. Warm cedar and running water past the sill, and a paper door there that leads back here." : "It stands open. Whatever is past it, the way back will not be this one."));
    if (d.to && sealed(ctx, d.to)) { ctx.emit("playSound", { clip: DEAD, position: mid(ctx.self), volume: 0.6, maxDistance: 20 }); return notify(ctx, who, "Sealed. The keyhole is filled with set concrete. Whatever is past this one is not ready for anyone yet."); }
    if (d.to && hasKey(who.state, d.to)) {
      spendKey(who, d.to); st.open = true; st.name = "Open door"; slide(ctx, true); ctx.after(HOLD, "close");
      ctx.emit("playSound", { clip: KEYIN, position: mid(ctx.self), volume: 0.9, maxDistance: 30 });
      who.state.hubUsed = { ...(who.state.hubUsed ?? {}), [d.to]: (who.state.hubUsed?.[d.to] ?? 0) + 1 };
      return notify(ctx, who, "The key turns once and is gone from your hand. The slab starts to move.");
    }
    ctx.emit("playSound", { clip: DEAD, position: mid(ctx.self), volume: 0.6, maxDistance: 20 });
    notify(ctx, who, keysOf(who.state).length ? "Your key does not fit this lock. The mark on its bow is not the mark over this door." : "Locked. A keyhole the size of your thumb, and nothing in it for a pick to catch.");
  },
};
// the threshold: only a body that walks through an open door goes anywhere
export function onTriggerEnter(ctx, other) {
  if (!other?.state || other.state.level == null) return;
  const door = ctx.getObject(ctx.self.state.door), d = doorById(ctx.self.state.door); if (!door?.state.open || !d) return;
  const to = d.open ? d.open.place : d.to;
  if (sealed(ctx, to)) return;
  if (!to) return notify(ctx, other, "You put a foot over the sill and there is nothing under it. Not this door. Not yet.");
  ctx.emit("screenFlash", { color: "#000000", duration: 1.1, intensity: 1 }, { audience: { player: other.id } });
  other.state.clipKind = "wall"; other.state.hubFrom = d.id;
  other.state.notice = { text: to === "level178" ? "Level 178. Kyoto Dreams. The paper door behind you leads back to the Hub." : to === "level1" ? "Level 1. The marked door behind you leads back to the Hub." : `${KEY_NAMES[to] ?? d.open?.name ?? "Somewhere"}. The door you came through is not behind you.`, at: ctx.now() };
  carryAcross(ctx, other, to);
  const previous = other.state.hubTenthCrossed;
  if (d.id === "t10-a3" && (other.state.hubDinaAsk || other.state.hubLedger)) other.state.hubTenthCrossed = 1;
  const result = ctx.cross(other, to === "level1" ? "level1#l1-from-hub" : to === "level178" ? "level178#l178-from-hub" : to); // Shelly Nov 14: Level 1 is the Hub's way in and out, you land beside its door back
  if (result?.crossed === false) other.state.hubTenthCrossed = previous;
}
