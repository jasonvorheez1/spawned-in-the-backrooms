// Wall-based sound culling. Every positioned playSound goes through heard(): for each player in earshot a ray runs from the
// sound to their head over static colliders; each wall between costs volume (0.32 a wall, two walls and it's a murmur,
// three and it's culled), and the reach shrinks so a sound through a wall dies sooner. Clear line: full volume.
import { raycast } from "builtin/physics";
const PER_WALL = 0.32, MAX_WALLS = 3, REACH_PER_WALL = 0.6; // Savi's picks
function walls(ctx, a, b) {
  let o = { ...a }, n = 0;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz);
  if (len < 0.5) return 0;
  const dir = { x: dx / len, y: dy / len, z: dz / len };
  let left = len;
  while (n < MAX_WALLS && left > 0.4) {
    const h = raycast(ctx, o, dir, { distance: left, bodies: "static", physicsOnly: true });
    if (!h || h.distance > left - 0.3) break;
    n++; const step = h.distance + 0.35; left -= step;
    o = { x: o.x + dir.x * step, y: o.y + dir.y * step, z: o.z + dir.z * step };
  }
  return n;
}
// voice gate: a tab coming back from the background replays a backlog of NPC lines at once. Each listener hears one
// voice line at a time (a gap of VOICE_GAP ms), and the same line twice inside VOICE_REPEAT ms is dropped. Savi's picks.
const VOICE_GAP = 1800, VOICE_REPEAT = 20000, lastVoice = new Map();
function voiceOk(ctx, pid, clip) {
  if (!clip || !String(clip).includes("/voice-")) return true;
  const now = ctx.now(), v = lastVoice.get(pid);
  if (v && (now - v.at < VOICE_GAP || (v.clip === clip && now - v.at < VOICE_REPEAT))) return false;
  lastVoice.set(pid, { at: now, clip });
  if (lastVoice.size > 200) lastVoice.clear();
  return true;
}
export function heard(ctx, p, opts) {
  const pos = p?.position;
  if (!pos || !ctx.place?.players) return ctx.emit("playSound", p, opts);
  const max = p.maxDistance ?? 30, aud = opts?.audience, only = aud?.player ?? null;
  const near = aud?.nearby ? { c: aud.nearby, r: aud.radius ?? max } : null;
  const src = { x: pos.x, y: (pos.y ?? 0) + 0.15, z: pos.z };
  let id;
  for (const pl of ctx.place.players) {
    if (only && pl.id !== only) continue;
    const f = pl.feetPosition; if (!f) continue;
    const d = Math.hypot(f.x - pos.x, f.z - pos.z);
    if (d > max + 2 || (near && Math.hypot(f.x - near.c.x, f.z - near.c.z) > near.r + 2)) continue;
    const w = walls(ctx, src, { x: f.x, y: f.y + 1.5, z: f.z });
    if (w >= MAX_WALLS) continue;
    const k = Math.pow(PER_WALL, w), reach = max * Math.pow(REACH_PER_WALL, w);
    if (d > reach) continue;
    if (!voiceOk(ctx, pl.id, p.clip)) continue;
    id = ctx.emit("playSound", w ? { ...p, volume: (p.volume ?? 1) * k, maxDistance: reach, refDistance: Math.min(p.refDistance ?? reach / 6, reach / 3) } : p, { ...(opts ?? {}), audience: { player: pl.id } });
  }
  return id;
}
