// where every piece of the studio stands, metres from the studio's feet (the dais centre). the canvas faces +Z.
export const L = {
  canvas: { x: 0.2, y: 2.16, z: -1.805, w: 1.68, h: 1.12 },
  frame: { x: 0.2, y: 1.6, z: -1.85 },
  pedestal: { x: 1.35, y: 0, z: -1.2 },
  top: { x: 1.35, y: 0.8, z: -1.2 },           // a model's feet on the pedestal
  fitPedestal: { w: 1.0, h: 1.15 },            // a model fits this box on the pedestal
  shelf: { x: -1.78, y: 0, z: -0.3 },          // runs along Z, open toward +X
  levels: [0.12, 0.77, 1.42],
  slots: [-0.8, 0, 0.8],
  fitShelf: { w: 0.7, d: 0.46, h: 0.56 },
};
