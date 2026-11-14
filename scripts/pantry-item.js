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
    st.taken = true; me.visible = false;
    ctx.after(RESTOCK_S, "restock");
  },
};
export function restock(ctx) { ctx.self.state.taken = false; ctx.self.visible = true; }
