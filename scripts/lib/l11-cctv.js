// Sedco Spotlight's CCTV desk (Level 11): eight live cameras on the city. Each sweeps between aim A and aim B on its own clock.
// eye: the camera head; a/b: the two ends of its sweep; fov: its lens wide open (W/S zooms in to ZOOM_MIN). Savi's picks, Nov 13.
export const ZOOM_MIN = 0.35
export const CAMS = [
  { tag: 'CAM 01', where: '11TH AVE · SEDCO CORNER', eye: { x: 16.6, y: 6.2, z: 10.4 }, a: { x: 0, y: 0, z: 40 }, b: { x: -4, y: 0, z: -12 }, fov: 62, sweep: 22 },
  { tag: 'CAM 02', where: 'SEDCO SALES FLOOR', eye: { x: 26.3, y: 2.9, z: 18.6 }, a: { x: 18.4, y: 0.6, z: 12.0 }, b: { x: 18.2, y: 0.6, z: 17.6 }, fov: 70, sweep: 14 },
  { tag: 'CAM 03', where: 'CANAL WALK · PUMP HOUSE', eye: { x: 21.0, y: 4.6, z: -13.2 }, a: { x: -12, y: -1, z: -22 }, b: { x: 30, y: -1, z: -24 }, fov: 58, sweep: 26 },
  { tag: 'CAM 04', where: '14TH ST SUBWAY · B2 VAULT GATE', eye: { x: 15.1, y: -0.55, z: 66.6 }, a: { x: 13.6, y: -2.7, z: 63.4 }, b: { x: 12.6, y: -2.7, z: 64.6 }, fov: 66, sweep: 10, vault: true },
  { tag: 'CAM 05', where: "MARROKA PIZZERIA · COUNTER", eye: { x: -17.0, y: 3.0, z: 38.6 }, a: { x: -25.2, y: 1, z: 44.6 }, b: { x: -22, y: 0.6, z: 40.5 }, fov: 64, sweep: 16 },
  { tag: 'CAM 06', where: 'MUNICIPAL YARD · K-9', eye: { x: 12.4, y: 3.4, z: -1.6 }, a: { x: 8.8, y: 0.3, z: -5.0 }, b: { x: 4, y: 0.3, z: -9 }, fov: 56, sweep: 18 },
  { tag: 'CAM 07', where: 'CAPITAL APTS · STOOP', eye: { x: -33.6, y: 4.2, z: 51.8 }, a: { x: -38.5, y: 0, z: 58 }, b: { x: -30, y: 0, z: 62 }, fov: 60, sweep: 20 },
  { tag: 'CAM 08', where: 'B3 · MAINTENANCE · NO ACCESS', eye: { x: 17.6, y: -0.9, z: 71.2 }, a: { x: 13.3, y: -2.6, z: 68.4 }, b: { x: 18.9, y: -2.6, z: 69.2 }, fov: 72, sweep: 30, haunt: true },
]
