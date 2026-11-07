// Level 3's distant sound: machinery that clanks somewhere off in the station, and, rarely, crying, whispers or a far
// "help" from inside a dark sector near you. One manager; each player hears their own, placed in the world.
import { N, zoneOf, cellCenter, cellAt, inGamma } from "./lib/level3.js";
import A from "./lib/data/l3-ambience.yml";
const GRIT = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
export const updateSchedule = { every: { seconds: 5 } };
let DARK = null;
export function update(ctx) {
  if (!DARK) { DARK = []; for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) if (zoneOf(cx, cz) === "dark") DARK.push(cellCenter(cx, cz)); }
  const now = ctx.now(), last = (ctx.self.session.voiceAt ??= {});
  for (const p of ctx.place.players) {
    const f = p.feetPosition, k = cellAt(f.x, f.z); if (!k || inGamma(k.cx, k.cz)) continue;
    if (ctx.random() < A.clank.chance) {
      const a = ctx.random() * 6.283, d = A.clank.near + ctx.random() * (A.clank.far - A.clank.near);
      ctx.emit("playSound", { clip: GRIT(A.clanks[Math.floor(ctx.random() * A.clanks.length)]), position: { x: f.x + Math.cos(a) * d, y: 2, z: f.z + Math.sin(a) * d }, volume: A.clank.volume, pitch: 0.85 + ctx.random() * 0.3, refDistance: 4, maxDistance: 40 }, { audience: { player: p.id } });
    }
    if (now - (last[p.id] ?? -1e9) < A.voice.cooldown * 1000 || ctx.random() >= A.voice.chance) continue;
    const near = DARK.filter((c) => { const d = Math.hypot(c.x - f.x, c.z - f.z); return d > 6 && d < A.voice.reach; });
    if (!near.length) continue;
    const c = near[Math.floor(ctx.random() * near.length)]; last[p.id] = now;
    ctx.emit("playSound", { clip: A.voices[Math.floor(ctx.random() * A.voices.length)], position: { x: c.x, y: 1.4, z: c.z }, volume: A.voice.volume, refDistance: 3, maxDistance: 32 }, { audience: { player: p.id } });
  }
}
