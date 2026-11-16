import { animate } from "builtin/tween";
// One good on Ferry's pantry shelf: E takes it into the bag (player.state.snacks), it leaves the shelf, and Ferry restocks it in an hour.
const RESTOCK_S = 3600; // her pick: an hour of play
export const ears = {
  press: (ctx, { by } = {}) => {
    const me = ctx.self, st = me.state;
    if (st.taken) return;
    const p = ctx.place.players.find((q) => q.id === by); if (!p) return;
    const ps = p.state, tok = st.token, now = ctx.now();
    ps.snacks = { ...(ps.snacks ?? {}), [tok]: (ps.snacks?.[tok] ?? 0) + 1 }; ps.pickedAt = now;
    ps.notice = { text: `${st.name} · in your bag`, at: now };
    ctx.emit("playSound", { clip: st.jar ? "cdn/moodboard-realistic-gritty/sfx-glass-jar-lifted-off-wooden-shelf-clink.mp3" : "cdn/moodboard-realistic-gritty/sfx-tin-can-lifted-off-wooden-shelf-scrape.mp3", position: me.worldFeetPosition, volume: 0.6, maxDistance: 12 });
    hands(ctx, p);
    st.taken = true; const f = me.feetPosition; st.home ??= { x: f.x, y: f.y, z: f.z };
    animate(ctx, me, { "feetPosition.y": [f.y, f.y + 0.035, f.y + 0.18], scale: [1, 1.08, 0.35] }, { duration: 0.28, easing: "easeInQuad" }); // tilts off the shelf toward your hand
    ctx.after(0.3, "stow");
    ctx.after(RESTOCK_S, "restock");
  },
};
export function stow(ctx) { ctx.self.visible = false; }
export function restock(ctx) { const st = ctx.self.state; st.taken = false; if (st.home) ctx.self.feetPosition = st.home; ctx.self.scale = 1; ctx.self.visible = true; }

// your hands (Shelly, Nov 15: "interact like grab and drink stuff with my hands"): the presser's body reaches and lifts, then lets go
export function hands(ctx, p) { if (!p?.anim) return; p.anim.hands = { clip: "cdn/clip-pickup.glb", loop: false, weight: 1, blend: 0.15 }; ctx.after(1.1, "handsOff", { id: p.id }); }
export function handsOff(ctx, { id } = {}) { const p = ctx.place.players.find((q) => q.id === id); if (p?.anim) p.anim.hands = null; }
