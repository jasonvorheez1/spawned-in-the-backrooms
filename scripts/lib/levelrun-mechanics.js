// Level ! ("Run for Your Life!"): Agility-driven chase mechanics, obstacle table, and pursuit tuning.
// Shared cleanly by places/levelrun/sim.js (geometry/triggers/horde), scripts/player.js (sprint/vault/dodge/stumble),
// and unit tests.
import { attrsOf } from "./stats.js";

export const CORRIDOR = {
  width: 5.8,
  halfW: 2.9,
  height: 3.6,
  startZ: 4.8,
  corridorStartZ: -5.5,
  collapseZ: -198,
  exitZ: -210,
  safePos: { x: 80, y: 0.1, z: 0 },
  safeYaw: -90,
};

// Obstacle beats along the red corridor (-Z): varied lanes and vaultable gurneys so steering, timing, and Agility matter.
// kind: "gurney" (low, vaultable with Jump), "cart" (tall, weave left/right), "spill" (slick hazard), "barrier" (crash barrier)
export const OBSTACLES = [
  { id: "lrun-obs-01", kind: "gurney", x: 0.0, z: -18, w: 2.2, h: 0.78, d: 0.95, vault: true },
  { id: "lrun-obs-02", kind: "cart", x: -1.35, z: -28, w: 1.9, h: 1.25, d: 0.95, vault: false },
  { id: "lrun-obs-03", kind: "spill", x: 0.9, z: -36, w: 2.4, h: 0.04, d: 2.2, vault: false },
  { id: "lrun-obs-04", kind: "gurney", x: 1.25, z: -46, w: 2.1, h: 0.78, d: 0.95, vault: true },
  { id: "lrun-obs-05", kind: "barrier", x: -0.9, z: -56, w: 2.8, h: 1.15, d: 0.75, vault: false },
  { id: "lrun-obs-06", kind: "gurney", x: -0.2, z: -67, w: 2.6, h: 0.78, d: 0.95, vault: true },
  { id: "lrun-obs-07", kind: "cart", x: 1.45, z: -76, w: 1.95, h: 1.25, d: 0.95, vault: false },
  { id: "lrun-obs-08", kind: "spill", x: -0.8, z: -86, w: 2.5, h: 0.04, d: 2.3, vault: false },
  { id: "lrun-obs-09", kind: "barrier", x: 1.05, z: -96, w: 2.7, h: 1.15, d: 0.75, vault: false },
  { id: "lrun-obs-10", kind: "gurney", x: -1.1, z: -106, w: 2.2, h: 0.78, d: 0.95, vault: true },
  { id: "lrun-obs-11", kind: "gurney", x: 1.15, z: -114, w: 2.2, h: 0.78, d: 0.95, vault: true },
  { id: "lrun-obs-12", kind: "cart", x: 0.0, z: -124, w: 2.1, h: 1.25, d: 0.95, vault: false },
  { id: "lrun-obs-13", kind: "spill", x: 1.0, z: -134, w: 2.4, h: 0.04, d: 2.2, vault: false },
  { id: "lrun-obs-14", kind: "barrier", x: -1.1, z: -144, w: 2.8, h: 1.15, d: 0.75, vault: false },
  { id: "lrun-obs-15", kind: "gurney", x: 0.15, z: -154, w: 2.7, h: 0.78, d: 0.95, vault: true },
  { id: "lrun-obs-16", kind: "cart", x: -1.4, z: -164, w: 2.0, h: 1.25, d: 0.95, vault: false },
  { id: "lrun-obs-17", kind: "spill", x: -0.4, z: -173, w: 2.6, h: 0.04, d: 2.3, vault: false },
  { id: "lrun-obs-18", kind: "gurney", x: 0.9, z: -182, w: 2.3, h: 0.78, d: 0.95, vault: true },
  { id: "lrun-obs-19", kind: "barrier", x: -0.95, z: -190, w: 2.6, h: 1.15, d: 0.75, vault: false },
];

// Agility drives sprint efficiency, jump/vault boost, stumble recovery, and dodge cooldown in Level !.
// Balanced so low Agility (1-4) remains completable with clean routing while high Agility (7-10) feels noticeably sharper.
export function agilityProfile(state) {
  const rawAgi = attrsOf(state).a ?? 5;
  const agi = Math.max(1, Math.min(10, rawAgi));
  const delta = agi - 5;
  return {
    agi,
    sprintDrainMul: Math.max(0.55, 1 - delta * 0.07),
    speedMul: 1 + delta * 0.035,
    jumpMul: 1 + Math.max(-0.08, delta * 0.045),
    stumbleMs: Math.max(220, Math.round(680 - delta * 75)),
    stumbleSpeedKeep: Math.min(0.84, Math.max(0.36, 0.44 + delta * 0.06)),
    dodgeCooldownMs: Math.max(1100, Math.round(2500 - delta * 220)),
    dodgeSpeed: 10.2 + delta * 0.5,
    dodgeStaminaCost: Math.max(7, Math.round(15 - delta * 1.1)),
    vaultBoost: 1.7 + Math.max(0, agi - 2) * 0.32,
  };
}

// Checks whether the player's position touches a corridor obstacle footprint.
export function hitObstacle(pos, yOffset = 0) {
  if (!pos) return null;
  for (const o of OBSTACLES) {
    const dx = Math.abs(pos.x - o.x);
    const dz = Math.abs(pos.z - o.z);
    if (dx <= o.w / 2 + 0.28 && dz <= o.d / 2 + 0.32) {
      // Airborne players clearing a vaultable obstacle count as a clean vault rather than a stumble.
      if (o.vault && yOffset >= 0.42) return { obs: o, vaulted: true };
      if (o.kind === "spill" && yOffset >= 0.35) return { obs: o, vaulted: true };
      return { obs: o, vaulted: false };
    }
  }
  return null;
}

// Advances the lead pursuer Z position along -Z during the live chase.
// Keeps tension high without unfair instant-teleports or letting high Agility casually AFK.
export function stepHordeZ(playerZ, hordeZ, dt, state) {
  const p = agilityProfile(state);
  const gap = hordeZ - playerZ; // positive means horde is behind the player (along +Z)
  // Pressure, not a wall: far back it closes fast; right behind you it breathes down your neck
  // just under walking pace, so a winded low-Agility runner still crawls ahead. Sprinters gain ground.
  let chaseSpeed = 7.0;
  if (gap > 20) chaseSpeed = 8.95;
  else if (gap > 13) chaseSpeed = 8.0;
  else if (gap < 4) chaseSpeed = 4.2 + Math.max(0, p.agi - 5) * 0.08;
  // never past the runner: the pack piles up 1.2 m behind whoever stops, biting
  return Math.max(CORRIDOR.collapseZ + 3, playerZ + 1.2, hordeZ - chaseSpeed * dt);
}
