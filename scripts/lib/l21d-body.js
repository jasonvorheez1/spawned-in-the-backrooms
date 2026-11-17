// Level 21's entity bodies: three Tripo meshes, each its own sculpt (art notes: /workspace/l21d). foeBody(kind) → spec fragment.
// Tripo's bytes face +X, so each carries forward "+x"; the layout box stands it at its true height on the floor.
// None is rigged with clips (Tripo's rigs came back without animations), so scripts/l21d-foes.js moves them in code.
const BODIES = {
  clicker: { id: "/cdn/value.385d0376cfcd31c508f793c54cd60a74561a41bf5078adf3851561d034bd372d.glb", h: 1.9 },   // gaunt eyeless humanoid, 1.9 m
  stalker: { id: "/cdn/value.4d5a2f8ebbe0ed659efb6efa2cca22ca8481f48442727babe84cdce0f17db8d9.glb", h: 1.34 },  // on all fours: 1.2 m at the shoulder, 1.9 m long
  warden: { id: "/cdn/value.f5d23d882770b1b58995fec8f339406269a48e3b252280a6f92d129d7f6040df.glb", h: 2.3 },    // the dark wing's doorman, 2.3 m
};
export const CLIPS = {}; // no baked clips: life is code (lean, sway, rear-back, lunge)
export function foeBody(kind) {
  const b = BODIES[kind] ?? BODIES.clicker;
  return { model: { id: b.id, forward: "+x" }, layout: { box: { min: { y: 0 }, max: { y: b.h } } } };
}
