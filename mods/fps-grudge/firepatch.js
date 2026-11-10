// ASHLINE fire patch (a molotov's burn): every tick s it burns players and raiders standing inside radius (flat) and height,
// credited to the thrower like a frag: no friendly fire, the thrower takes half. Tag a dummy `burnable` and it burns too.
// state: { ownerId, team, until, nextAt }. Numbers: lib/data/combat.yml molotov.
import C from "./lib/data/combat.yml";
import * as RAG from "./lib/ragdoll.js";
const M = C.molotov;
export function update(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now();
  if (now >= (s.until ?? 0)) { ctx.destroy(me.id); return; }
  if (now < (s.nextAt ?? 0)) return;
  s.nextAt = now + M.tick * 1000;
  const c = me.feetPosition, owner = s.ownerId, team = s.team || "";
  const targets = [];
  for (const r of ctx.query({ anyTags: ["raider", "burnable"], center: c, radius: M.radius + 1.5 })) { const o = ctx.getObject(r.id); if (o && (o.state?.hp ?? 0) > 0 && !o.state?.dead) targets.push(o); }
  for (const pl of ctx.place.players) if (!pl.state?.dead && (pl.state?.hp ?? 100) > 0) targets.push(pl);
  let hits = 0;
  for (const t of targets) {
    const f = t.feetPosition;
    if (Math.hypot(f.x - c.x, f.z - c.z) > M.radius || f.y < c.y - 0.6 || f.y > c.y + M.height) continue;
    const isOwner = t.id === owner, tt = t.state?.team || "";
    if (!isOwner && team && tt && tt === team) continue;
    const d = isOwner ? Math.round(M.dmg / 2) : M.dmg, st = t.state, isP = ctx.place.players.some((p) => p.id === t.id);
    st.hitFrom = { x: c.x, y: c.y, z: c.z };
    if (isP) { st.hurtAt = now; st.hurtFrom = st.hitFrom; st.lastHitAt = now; st.burnAt = now; }
    st.hp = (st.hp ?? 100) - d; st.lastHitBy = owner; st.hitAt = now;
    if (t.tags?.includes("raider")) RAG.mark(t, d, c, now);
    hits++;
  }
  if (hits) ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-flesh-sizzle-burn.mp3", position: c, volume: 0.45, maxDistance: 20 });
}
