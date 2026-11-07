// A suite's steamer trunk and luggage rack (scripts/l5-people.js lays them). The trunk opens only for the player whose
// userId rented that suite (the concierge writes state.renter); its items stay on the trunk between visits. The rack stows
// spare almond water, bobby pins, fire salt and meat into the trunk.
const MEATS = ["steak", "fish", "chicken", "spam", "sardines", "rat"];
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by); if (!p?.state) return;
    const me = ctx.self, s = me.state, now = ctx.now(), uid = p.userId ?? p.id;
    const tr = s.kind === "trunk" ? me : ctx.getObject(`l5-people-trunk-${s.suite}`);
    const book = ctx.place.state.l5rent?.[s.suite];
    if (!tr || tr.state.renter !== uid || !book || book.uid !== uid || book.until < now) { p.state.notice = { text: "Locked. This isn't your suite's trunk.", at: now }; ctx.emit("playSound", { maxDistance: 8, refDistance: 1.5, clip: "/cdn/moodboard-realistic-gritty/sfx-locked-trunk-latch-rattle.mp3", position: me.feetPosition, volume: 0.6 }, { audience: { nearby: me.feetPosition, radius: 12 } }); return; }
    if (s.kind === "trunk") { p.state.lootOpen = me.id; p.state.lootName = "Steamer trunk"; p.state.lootList = s.items ?? ""; p.state.focus = null; ctx.emit("playSound", { maxDistance: 8, refDistance: 1.5, clip: "/cdn/moodboard-realistic-gritty/sfx-old-steamer-trunk-lid-creak-open.mp3", position: me.feetPosition, volume: 0.6 }, { audience: { nearby: me.feetPosition, radius: 12 } }); return; }
    const add = [], ps = p.state;
    for (let i = 0; i < (ps.almonds ?? 0); i++) add.push("almond:grey"); ps.almonds = 0;
    for (let i = 0; i < (ps.bobbypins ?? 0); i++) add.push("bobbypin"); ps.bobbypins = 0;
    for (let i = 0; i < (ps.firesalt ?? 0); i++) add.push("firesalt"); ps.firesalt = 0;
    const meat = { ...(ps.meat ?? {}) }; for (const c of MEATS) { for (let i = 0; i < (meat[c] ?? 0); i++) add.push(`meat:${c}`); meat[c] = 0; } ps.meat = meat;
    if (!add.length) { ps.notice = { text: "Nothing spare to stow.", at: now }; return; }
    tr.state.items = [tr.state.items, ...add].filter(Boolean).join(","); ps.notice = { text: `Stowed ${add.length} in the trunk`, at: now };
  },
};
