// Lumiria square props (scripts/lib/l132-square.js lays them): E rings press. state.kind: read (state.page, pages.yml) · note (state.line) · drink.
import D from "./lib/data/l132-square.yml";
export const ears = {
  press: (ctx, m) => {
    const s = ctx.self.state, p = m?.by && ctx.getObject(m.by), ps = p?.state, at = ctx.self.worldFeetPosition;
    if (!ps) return;
    if (s.kind === "read") { ps.reading = s.page; ctx.emit("playSound", { clip: D.sounds.page, position: at, volume: 0.35 }); return; }
    if (s.kind === "drink") ps.thirst = Math.min(100, (ps.thirst ?? 100) + D.fountain.thirst);
    if (s.snd) ctx.emit("playSound", { clip: s.snd, position: at, volume: 0.4 });
    if (s.line) ps.notice = { text: s.line, at: ctx.now() };
  },
};
