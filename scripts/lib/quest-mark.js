// Where a tracked quest points (Shelly, Nov 9: "a quest marker for active objectives", then "up to 3").
// A quest's journal entry may carry mark = { place, x, y, z } or { place, id }; the Zenith Survey's steps are mapped here.
import { KADE, ZEN_ENTRY } from "./zenith-quest.js";
const ZEN_WALL = { place: "main", x: ZEN_ENTRY.x - 1, y: 0, z: ZEN_ENTRY.z };
function zenith(s, here) {
  const q = s.zenQ;
  if (q === 1 || q === 3) return ZEN_WALL;
  if (q === 2 || q === 5) return here === "level01" ? { place: "level01", id: "z-exit", fallback: null } : { place: "main", id: KADE };
  if (q === 4) return here === "level01" ? { place: "level01", id: "z-drive" } : ZEN_WALL;
  return null;
}
// { x, y, z } in the player's place for one journal entry, or null
export function questMark(ctx, player, q) {
  const s = player?.state; if (!s || !q?.step) return null;
  const here = player.place ?? ctx.place?.id;
  const m = q.mark ?? (q.name === "The Zenith Survey" ? zenith(s, here) : null);
  if (!m || (m.place && m.place !== here)) return null;
  if (m.id) { const o = ctx.place?.objects?.[m.id]; const p = o?.feetPosition; if (p) return { x: p.x, y: p.y, z: p.z }; if (m.x == null) return null; }
  return { x: m.x, y: m.y ?? 0, z: m.z };
}
// the heading (camera-yaw degrees) from a point to the mark
export const yawTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z)) * 180 / Math.PI;
