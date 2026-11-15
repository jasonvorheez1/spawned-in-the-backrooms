// What a sector does to the one standing in it: the picture (a look layer) and the air (their own fog and ambient).
// Both ride on the player, so two people in different sectors each see their own; both come off at the door and the seams.
export const L1_SPOTS = ["l1-from-l1c-r0", "l1-from-l1c-r1", "l1-from-l1c-r2", "l1-from-l1c-r3", "l1-from-l1c-r4", "l1-from-l1c-r5"]; // where a seam can let you out on Level 1 (places/level1/sim.js lays them)
const LOOK = { 2: "scripts/look-l1c-glitch.js", 3: "scripts/look-l1c-dark.js", 4: "scripts/look-l1c-mono.js" };
const AIR = {
  2: { fog: { kind: "linear", near: 22, far: 150, color: "oklch(0.97 0.03 150)" }, ambient: { light: { color: "oklch(0.97 0.03 160)", intensity: 0.75 } } },
  3: { fog: { kind: "linear", near: 3, far: 26, color: "oklch(0.015 0.005 330)" }, ambient: { light: { color: "oklch(0.6 0.05 340)", intensity: 0.02 } }, hemisphere: { skyColor: "oklch(0.3 0.03 340)", groundColor: "oklch(0.1 0.01 340)", intensity: 0.01 } },
  4: { fog: { kind: "linear", near: 120, far: 900, color: "oklch(0 0 0)" }, ambient: { light: { color: "oklch(1 0 0)", intensity: 0.3 } }, hemisphere: { skyColor: "oklch(1 0 0)", groundColor: "oklch(0.3 0 0)", intensity: 0.1 } },
};
const KEYS = ["fog", "ambient", "hemisphere"];
export function applySector(p, n) {
  if (p.state) p.state.l1cAir = n > 1 ? n : 0; // scripts/player.js takes the sector off anyone who turns up in another place still wearing it
  try { p.look = LOOK[n] ? [{ look: LOOK[n], fade: 1.5 }] : []; } catch { /* a body with no screen */ }
  try { for (const k of KEYS) { const v = AIR[n]?.[k]; if (v) p.atmosphere[k] = v; else delete p.atmosphere[k]; } } catch { /* same */ }
}
export const clearSector = (p) => applySector(p, 1);
