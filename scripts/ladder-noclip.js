// Shelly Nov 16 (#463086): "Walking underneath a ladder on any level will abruptly noclip wanderers to Level 325."
// A ladder is anything tagged "ladder", with state.kind "ladder", or "ladder" in its id. Underneath = your feet inside its
// footprint (0.3 m slack: a box collider stops you at its skin) at its base, walking, not climbing it.
// Savi's picks: checked 4x a second, at least 1.4 m tall, walking over 0.8 m/s; never in Boom Town itself, intake or the tutorial.
import { carryAcross } from "./lib/carry.js";
export const updateSchedule = { every: { seconds: 0.25 } };
const SKIP = new Set(["level325", "intake", "tutorial0", "testlab"]);
const isLadder = (q) => q.tags?.includes("ladder") || q.state?.kind === "ladder" || /ladder/.test(String(q.id).split("/").pop());
export function update(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now();
  if (!me.isLocal && me.isLocal !== undefined) return ctx.sleep(5);
  if (SKIP.has(me.place) || s.climbing || !me.grounded || s.dead || (s.hp ?? 100) <= 0) return;
  if (now - (ctx.session.ladderAt ?? 0) < 8000) return;
  const v = me.velocity ?? { x: 0, z: 0 }; if (Math.hypot(v.x ?? 0, v.z ?? 0) < 0.8) return;
  const f = me.feetPosition;
  for (const q of ctx.query({ radius: 3 })) {
    if (!isLadder(q)) continue;
    const b = ctx.getObject(q.id)?.bounds; if (!b || b.size.y < 1.4) continue;
    const m = 0.3;
    if (f.x < b.min.x - m || f.x > b.max.x + m || f.z < b.min.z - m || f.z > b.max.z + m) continue;
    if (f.y > b.min.y + 0.6 || f.y < b.min.y - 0.6) continue;
    ctx.session.ladderAt = now;
    s.notice = { text: "You step under the ladder. The floor isn't there.", at: now };
    ctx.emit("screenFlash", { color: "#fffdf0", duration: 0.35, intensity: 0.9 }, { audience: { player: me.id } });
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-noclip-reality-tear-drop.mp3", position: f, volume: 0.8, maxDistance: 12 });
    carryAcross(ctx, me, "level325"); ctx.cross(me, "level325");
    return;
  }
}
