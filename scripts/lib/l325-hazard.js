// Level 325 hazards: what a collapse does to a body. Distance, cover and what you wear decide it; Agility gives a dive clear.
// Numbers are Savi's picks. Called by places/level325/sim.js at each debris landing and at the impact.
import { attrsOf } from "./stats.js";
import { distToLobe, coverAt } from "./level325.js";
export const HIT = { core: 95, wash: 34, debris: 30, debrisR: 3.6, washR: 34, dustS: 40 };
// the life lane edits ONLY this: what gear does. debris and dust multiply the hurt, stumble true = you trip on rubble
export function gearMods(player) { return { debris: 1, dust: 1, stumble: true }; }
export function agilityOf(p) { try { return attrsOf(p.state, 0).a ?? 5; } catch { return 5; } }
function hurt(ctx, p, dmg, text) {
  if (dmg < 1) return;
  const agi = agilityOf(p), dive = ctx.random() < agi * 0.05; // AGI 5 = one in four dives clear of half of it
  const d = Math.round(dive ? dmg * 0.5 : dmg);
  p.state.hp ??= 100; p.state.hp -= d;
  p.state.notice = { text: dive ? text + " You dive and it only clips you." : text, at: ctx.now() };
  ctx.emit("screenShake", { intensity: Math.min(1, d / 40), duration: 0.5 }, { audience: { player: p.id } });
  ctx.emit("screenFlash", { color: "oklch(0.75 0.02 80)", duration: 0.35, intensity: 0.5 }, { audience: { player: p.id } });
}
export function debrisHit(ctx, pos, key) {
  for (const p of ctx.place.players) {
    const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
    if (d > HIT.debrisR || coverAt(ctx, p.feetPosition.x, p.feetPosition.z, key)) continue;
    hurt(ctx, p, HIT.debris * (1 - d / HIT.debrisR * 0.5) * gearMods(p).debris, "Falling concrete catches you.");
  }
}
// the tower meets the ground. returns per-player outcome for the sim's witness flags
export function impact(ctx, t) {
  const out = [];
  for (const p of ctx.place.players) {
    const x = p.feetPosition.x, z = p.feetPosition.z, d = distToLobe(t, x, z);
    if (d > 150) continue;
    const cover = coverAt(ctx, x, z, t.key);
    let dmg = d < 15 ? HIT.core : d < HIT.washR ? HIT.wash * (1 - (d - 15) / (HIT.washR - 15)) : 0;
    if (cover && d >= 15) dmg *= 0.15; // a slab overhead takes the wash, nothing takes the tower itself
    if (d >= 15) dmg *= gearMods(p).debris;
    hurt(ctx, p, dmg, d < 15 ? "The tower comes down on you." : "The wash of debris slams into you.");
    ctx.emit("screenShake", { intensity: Math.max(0.08, 1 - d / 150), duration: 1.6 }, { audience: { player: p.id } });
    out.push({ p, d, cover, dmg });
  }
  return out;
}
