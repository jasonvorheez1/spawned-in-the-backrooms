// Enemy footsteps, heard on each player's own machine (scripts/lib/data/foe-steps.yml): no shared state, nothing sent to others.
import T from "./lib/data/foe-steps.yml";
export const updateSchedule = { every: 3 }; // ~10 checks a second
const KINDS = Object.keys(T.kinds);
const seen = new Map(); // id → { x, z, dist, at }
export function update(ctx, dt) {
  if (!ctx.self.isLocal) { ctx.sleep(); return; }
  const me = ctx.self.feetPosition; if (!me) return;
  const now = ctx.now(), rows = ctx.query({ anyTags: KINDS, radius: T.hear });
  const live = new Set();
  for (const r of rows) {
    if (r.state?.dead || (r.state?.hp ?? 1) <= 0) continue;
    const kind = KINDS.find((k) => r.tags.includes(k)); if (!kind) continue;
    const K = T.kinds[kind], p = r.feetPosition; live.add(r.id);
    const m = seen.get(r.id);
    if (!m) { seen.set(r.id, { x: p.x, z: p.z, dist: 0, at: now }); continue; }
    const step = Math.hypot(p.x - m.x, p.z - m.z), sec = Math.max(0.001, (now - m.at) / 1000);
    m.x = p.x; m.z = p.z; m.at = now;
    if (step > 3) { m.dist = 0; continue; } // a teleport, not a walk
    const sp = step / sec; if (sp < 0.4) { m.dist = Math.min(m.dist, K.stride * 0.5); continue; }
    m.dist += step; if (m.dist < K.stride) continue;
    m.dist -= K.stride;
    const run = sp >= K.run, [lo, hi] = K.pitch;
    ctx.emit("playSound", { clip: K.clip, position: { x: p.x, y: p.y + 0.1, z: p.z }, volume: K.v * (run ? 1.25 : 1) * (0.85 + ctx.random() * 0.3), pitch: (lo + ctx.random() * (hi - lo)) * (run ? 1.08 : 1), refDistance: 2, maxDistance: T.hear }, { audience: { player: ctx.self.id } });
  }
  for (const id of seen.keys()) if (!live.has(id)) seen.delete(id);
}
