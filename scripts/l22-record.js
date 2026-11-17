// Level 22 "Ruins Left Behind": one paper of Emstable's (rows: scripts/lib/data/l22-records.yml). E rings press: the page opens
// in the reading panel like every read prop (player.state.reading -> pages.yml) and the quest book hears which record it was.
// The object carries tags ["usable"] and state { name, verb, page, rec }.
import D from "./lib/data/l22-records.yml";
import { noteRecord } from "./lib/level22-quest.js";
export const ears = {
  press: (ctx, m) => {
    const s = ctx.self.state ?? {}, p = m?.by && ctx.getObject(m.by), ps = p?.state;
    if (!ps || ps.dead) return;
    const rec = s.rec ?? String(ctx.self.id ?? "").split("/").pop();
    const page = s.page ?? D.records.find((r) => r.id === rec)?.page;
    if (!page) return;
    ps.reading = page;
    ctx.emit("playSound", { clip: D.sound, position: ctx.self.worldFeetPosition ?? ctx.self.feetPosition, volume: 0.35 });
    noteRecord(ctx, p, rec);
  },
};
