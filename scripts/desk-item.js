// One piece off Ferry's map desk (art/desk-split): E uses it. kind: map | compass | books | mug | pencils.
// compass is taken (5 reads, restocked in an hour); the mug is drunk dry and refilled in an hour; map, books, pencils stay.
import { COMPASS } from "./lib/compass.js";
import { animate } from "builtin/tween";
import { kick, ready } from "./lib/use-kick.js";
const RESTOCK_S = 3600; // her pick: an hour, like the pantry
const SFX = (n) => `cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const BOOK_LINES = [
  "\"Water first. Shade second. Pride never.\" Ferry's hand, in the margin.",
  "A field guide to desert plants. Half the pages are pressed flowers.",
  "A logbook of travellers who passed through. Some names are crossed out.",
];
export const ears = {
  press: (ctx, { by } = {}) => {
    const me = ctx.self, st = me.state, now = ctx.now();
    const p = ctx.place.players.find((q) => q.id === by); if (!p) return;
    const s = p.state, at = me.worldFeetPosition;
    const say = (text) => { s.notice = { text, at: now }; };
    const snd = (n, v = 0.6) => ctx.emit("playSound", { clip: SFX(n), position: at, volume: v, maxDistance: 10 });
    const f = me.feetPosition, yaw = typeof me.rotation === "number" ? me.rotation : me.rotation?.yaw ?? 0;
    if (st.kind === "map") { kick(ctx, me, "flutter", { d: 0.6 }); snd("paper-map-unfolded-crinkle"); say("Ferry's map · the well, the checkpoint road north, and a red X past the cliffs she never explained"); return; }
    if (st.kind === "compass") {
      if (st.taken) return;
      s.compass = (s.compass ?? 0) + COMPASS.charges; s.pickedAt = now;
      say(`Old compass · ${s.compass} windings · use it to open, again to switch what it seeks`); snd("brass-compass-lid-snapped-shut-click");
      hands(ctx, p);
      animate(ctx, me, { "feetPosition.y": [f.y, f.y + 0.2], "rotation.yaw": [yaw, yaw + 270] }, { duration: 0.28, easing: "easeOutQuad" }); st.home ??= { x: f.x, y: f.y, z: f.z };
      st.taken = true; ctx.after(0.3, "stow"); ctx.after(RESTOCK_S, "restock"); return;
    }
    if (st.kind === "mug") {
      if (st.empty) { say("Coffee ring and a dead fly. Ferry refills it when she's back."); return; }
      hands(ctx, p);
      animate(ctx, me, { "rotation.pitch": [0, -35, -35, 0], "feetPosition.y": [f.y, f.y + 0.12, f.y + 0.12, f.y] }, { duration: 0.9, easing: "easeInOutQuad" }); // lifted, tipped, set back down
      s.thirst = Math.min(100, (s.thirst ?? 100) + 8); st.empty = true; st.verb = "Look"; st.info = "empty, a ring of coffee at the bottom";
      say("Cold coffee, gritty with sand · +8 water"); snd("sipping-from-tin-mug-swallow"); ctx.after(RESTOCK_S, "restock"); return;
    }
    if (st.kind === "books") {
      kick(ctx, me, "hop"); kick(ctx, me, "flutter", { d: 0.5 });
      const line = BOOK_LINES[(st.page = ((st.page ?? -1) + 1) % BOOK_LINES.length)];
      if (now - (s.deskReadAt ?? -1e12) > RESTOCK_S * 1000) { s.sanity = Math.min(100, (s.sanity ?? 100) + 4); s.deskReadAt = now; say(`${line} · +4 sanity`); } else say(line);
      snd("old-hardcover-book-pages-turned"); return;
    }
    if (st.kind === "pencils") { kick(ctx, me, "rattle", { d: 1.5 }); snd("pencil-scribbling-on-paper-short");
      if (ready(s, "desk-pencil", RESTOCK_S * 1000, now)) { s.sanity = Math.min(100, (s.sanity ?? 100) + 3); say("You pencil your own route onto her map. She'll erase it. She always does. · +3 sanity"); }
      else say("Your line's still there. Smudged. She's been leaning on it."); return; }
  },
};
export function stow(ctx) { ctx.self.visible = false; }
export function restock(ctx) {
  const st = ctx.self.state;
  if (st.kind === "compass") { st.taken = false; if (st.home) ctx.self.feetPosition = st.home; ctx.self.visible = true; }
  if (st.kind === "mug") { st.empty = false; st.verb = "Drink"; st.info = "cold coffee, still half full"; }
}

// your hands (Shelly, Nov 15: "interact like grab and drink stuff with my hands"): the presser's body reaches and lifts, then lets go
export function hands(ctx, p) {
  if (!p?.anim) return;
  const at = ctx.now();
  p.state.fixtureHandsAt = at;
  p.anim.hands = { clip: "cdn/clip-pickup.glb", loop: "once", weight: 1.2, mask: { from: "Spine" }, blendIn: 0.15, blendOut: 0.3 };
  ctx.after(1.1, "handsOff", { id: p.id, at });
}
export function handsOff(ctx, { id, at } = {}) {
  const p = ctx.place.players.find((q) => q.id === id);
  if (p?.anim && p.state.fixtureHandsAt === at) p.anim.hands = null;
}
