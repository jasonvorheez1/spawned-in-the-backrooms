// Wall-based sound culling. Every positioned playSound goes through heard(): for each player in earshot a ray runs from the
// sound to their head over static colliders; each wall between costs volume (0.32 a wall, two walls and it's a murmur,
// three and it's culled), and the reach shrinks so a sound through a wall dies sooner. Clear line: full volume.
import { raycast } from "builtin/physics";
import { isVoiceClip, recordedDuration } from "./voices.js";
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
// One voice per listener. A new dialogue choice can interrupt a line already playing.
const VOICE_GAP = 1800, VOICE_REPEAT = 20000, lastVoice = new Map();
const SFX_GAP = 600, GUN_GAP = 40, lastSfx = new Map(); // the same one-shot to the same listener within SFX_GAP ms is one sound (a holster flapping, a backlog)
function soundOk(ctx, pid, clip, voice, foreground) {
  if (!clip) return true;
  if (!voice) {
    const k = pid + "|" + clip, t = lastSfx.get(k), now = ctx.now();
    const gap = /gun|shot|shell|pump|magazine|reload|rifle|carbine|smg|slide-rack|dry-fire/.test(String(clip)) ? GUN_GAP : SFX_GAP; // a gun's own beats (a bullet every 90 ms, a shell every 550) each sound
    if (t && now - t < gap) return false;
    lastSfx.set(k, now); if (lastSfx.size > 500) lastSfx.clear();
    return true;
  }
  const now = ctx.now(), v = lastVoice.get(pid);
  if (!v) return true;
  if (!foreground) return now >= v.until && (v.clip !== clip || now - v.at >= VOICE_REPEAT);
  if (v.clip === clip && now < v.until) return false;
  stopVoice(ctx, pid);
  return true;
}
function stopVoice(ctx, pid) {
  const v = lastVoice.get(pid);
  if (v?.id != null && ctx.now() < v.until) {
    ctx.emit("stopSound", { soundId: v.id }, { audience: { player: pid } });
  }
  lastVoice.delete(pid);
}
export function heard(ctx, p, opts, speech) {
  if (p && 'clip' in p && !p.clip) {
    if (speech?.listener) stopVoice(ctx, speech.listener);
    return null;
  }
  const voice = p?.bus === "Voice" || isVoiceClip(p?.clip);
  if (voice && !p.bus) p = { ...p, bus: "Voice" };
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
    const foreground = speech?.listener === pl.id;
    if (speech?.ambient && pl.state?.talkWith) continue;
    if (!soundOk(ctx, pl.id, p.clip, voice, foreground)) continue;
    id = ctx.emit("playSound", w ? { ...p, volume: (p.volume ?? 1) * k, maxDistance: reach, refDistance: Math.min(p.refDistance ?? reach / 6, reach / 3) } : p, { ...(opts ?? {}), audience: { player: pl.id } });
    if (voice) {
      const now = ctx.now(), ms = recordedDuration(p.clip) || speech?.duration || VOICE_GAP;
      if (lastVoice.size >= 200) lastVoice.delete(lastVoice.keys().next().value);
      lastVoice.set(pl.id, { id, at: now, until: now + ms + 100, clip: p.clip });
    }
  }
  return id;
}
