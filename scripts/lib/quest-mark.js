import { MARKS } from "./zenith-quest.js";
import { nextQuestExit } from "./quest-route.js";

// Direct objective on this level, otherwise the first usable crossing toward it.
export function questMark(ctx, player, q) {
  const s = player?.state;
  if (!s || !q?.step) return null;
  const here = player.place ?? ctx.place?.id;
  const m = q.mark ?? (q.name === "The Zenith Survey" ? MARKS[s.zenQ] : null);
  if (!m) return null;
  if (m.place && m.place !== here) return nextQuestExit(ctx, player, m.place);
  const object = m.id && ctx.place?.objects?.[m.id];
  const p = object?.worldFeetPosition ?? object?.feetPosition ?? m;
  if (p.x == null || p.z == null) return null;
  return { x: p.x, y: p.y ?? 0, z: p.z };
}

export const yawTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z)) * 180 / Math.PI;
