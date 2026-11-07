// Level 3's distant sound: machinery that clanks somewhere off in the station, and, rarely, crying, whispers or a far
// "help" from inside a dark sector near you. One manager; each player hears their own, placed in the world.
import { heard } from "./lib/hear.js";
import { N, zoneOf, cellCenter, cellAt, inGamma, hash } from "./lib/level3.js";
import A from "./lib/data/l3-ambience.yml";
const GRIT = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
export const updateSchedule = { every: { seconds: 5 } };
let DARK = null;
const FLK = `fx
pop glow n=1 r=light(<.95,.97,1>,(flick(1.3,1)^.2)*flick(13,.3)*2.6,9)`;
// the lamps sim.js lays: a few tubes dead, some flickering, a quiet buzz on some; each lamp marked once it is set
function tuneLamps(ctx) {
  let hum = 0;
  for (const r of ctx.query({ tags: ["l3lamp"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    if (r.state?.t) continue;
    const o = ctx.getObject(r.id), k = cellAt(r.feetPosition.x, r.feetPosition.z); if (!o || !k) continue;
    const z = zoneOf(k.cx, k.cz), h = hash(k.cx, k.cz, 911);
    if (z !== "gamma" && z !== "tight" && h < 0.12) { o.light = null; o.material = { ...o.material, emissive: "oklch(0.2 0.01 60)", emissiveIntensity: 0.2 }; }
    else if (z !== "gamma" && z !== "tight" && h < 0.3) { o.light = null; o.fx = { script: FLK }; }
    else if (z !== "gamma" && o.light) { o.light = { ...o.light, intensity: 3 }; o.material = { ...o.material, emissiveIntensity: 1.6 }; }
    if (hash(k.cx, k.cz, 913) < 0.18 && hum++ < 26) o.audio = { clip: GRIT("fluorescent-light-buzz-loop"), gain: 0.12, loop: true, spatial: true, maxDistance: 9 };
    o.state = { ...(o.state ?? {}), t: 1 };
  }
  for (const r of ctx.query({ tags: ["live-box"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { // an arc's flash once whited out the hall
    const o = ctx.getObject(r.id), f = o?.fx?.script; if (f && !f.includes("*1.5,4)")) o.fx = { ...o.fx, script: f.replace(/\*(18,6|6,5)\)/, "*1.5,4)") };
  }
}
export function update(ctx) {
  if (ctx.now() - (ctx.self.session.tunedAt ?? -1e9) > 30000) { ctx.self.session.tunedAt = ctx.now(); tuneLamps(ctx); }
  if (!DARK) { DARK = []; for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) if (zoneOf(cx, cz) === "dark") DARK.push(cellCenter(cx, cz)); }
  const now = ctx.now(), last = (ctx.self.session.voiceAt ??= {});
  for (const p of ctx.place.players) {
    const f = p.feetPosition, k = cellAt(f.x, f.z); if (!k || inGamma(k.cx, k.cz)) continue;
    if (ctx.random() < A.clank.chance) {
      const a = ctx.random() * 6.283, d = A.clank.near + ctx.random() * (A.clank.far - A.clank.near);
      heard(ctx, { clip: GRIT(A.clanks[Math.floor(ctx.random() * A.clanks.length)]), position: { x: f.x + Math.cos(a) * d, y: 2, z: f.z + Math.sin(a) * d }, volume: A.clank.volume, pitch: 0.85 + ctx.random() * 0.3, refDistance: 4, maxDistance: 40 }, { audience: { player: p.id } });
    }
    if (now - (last[p.id] ?? -1e9) < A.voice.cooldown * 1000 || ctx.random() >= A.voice.chance) continue;
    const near = DARK.filter((c) => { const d = Math.hypot(c.x - f.x, c.z - f.z); return d > 6 && d < A.voice.reach; });
    if (!near.length) continue;
    const c = near[Math.floor(ctx.random() * near.length)]; last[p.id] = now;
    heard(ctx, { clip: A.voices[Math.floor(ctx.random() * A.voices.length)], position: { x: c.x, y: 1.4, z: c.z }, volume: A.voice.volume, refDistance: 3, maxDistance: 32 }, { audience: { player: p.id } });
  }
}
