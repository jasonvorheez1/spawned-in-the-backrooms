// The skin-stealer's one body, for every level that spawns one (Level 1, 9, 10, 109 pens).
// A spawn carries this model from its first frame; the retired scripts/stealer-geo.js drew only a speck, so a
// stealer no manager swapped (109's pens, Level 10) stood invisible. revealed: the creature part shows.
export const STEALER_GLB = "/cdn/value.6cc392a43a5cb12b4557b1fb35e23d329ad01c9d707b4267d923bdc14abcde2d.glb";
export const stealerModel = (rev) => ({ id: STEALER_GLB, forward: "+z", parts: { disguise: { visible: false }, creature: { visible: !!rev }, shed: { visible: false } } });
