// Shared for Level 5's entity managers (rats, staff): safe ground, player reads, hits and the remains a kill leaves.
import { zoneAt } from "./level5.js";
import { dmgAfterArmor } from "./stats.js";
import { spawnRemains } from "./loot.js";
import E from "./data/l5-entities.json";
export const SND = (w) => `/cdn/moodboard-realistic-gritty/sfx-${w}.mp3`;
export const SAFE = new Set(E.safe);
export const zoneId = (x, z) => zoneAt(x, z)?.id ?? null;
export const isSafe = (x, z) => SAFE.has(zoneId(x, z));
export const flat = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
export const yawTo = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI;
export const maxHpOf = (s) => s?.maxHp ?? 100 + ((s?.level ?? 1) - 1) * 10;
export const downed = (p, now) => !!(p.state?.dead || (p.state?.hp ?? 1) <= 0 || (p.state?.downAt && now - p.state.downAt < 6000));
// players a hostile may hunt: alive, not on safe ground (creator's rule: they go unhostile when you die)
export const prey = (ctx, now) => ctx.place.players.filter((p) => !downed(p, now) && !isSafe(p.feetPosition.x, p.feetPosition.z));
export const aloneOf = (ctx, p, r) => !ctx.place.players.some((o) => o.id !== p.id && flat(o.feetPosition, p.feetPosition) < r);
export function hit(ctx, p, dmg, color = "#ff5040") {
  p.state.hp -= dmgAfterArmor(p.state.look, dmg);
  const at = { x: p.feetPosition.x, y: p.feetPosition.y + 1, z: p.feetPosition.z };
  ctx.emit("damageNumber", { position: at, value: dmg, color });
  return at;
}
// a kill: player.js drops generic remains; turn the nearest fresh ones into this creature's, or lay our own after a moment
export function claimRemains(ctx, pos, name, items, deadAt, now) {
  const r = ctx.query({ tags: ["remains"], radius: 2.2, center: pos }).find((o) => /^Smiler remains|^Remains/.test(o.state?.name ?? ""));
  if (r) { const o = ctx.getObject(r.id); if (o) { o.state.name = name; o.state.items = items.join(","); } return true; }
  if (now - deadAt > 1800) { spawnRemains(ctx, pos, items, name); return true; }
  return false;
}
// the player nearest a death gets the credit (melee kills land within reach; a shot from far still finds its shooter first among few)
export const killerOf = (ctx, pos) => ctx.place.players.map((p) => [p, flat(p.feetPosition, pos)]).filter(([, d]) => d < 30).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
export { E };
