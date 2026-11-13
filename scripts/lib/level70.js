// Level 70 "Froidetown" (backrooms-wiki.wikidot.com/level-70): a snowed-in Canadian city on a planetoid. This file is the ONE map every
// Level 70 file builds to. Ground is y = 0 inside every zone disc and along the street; rolling snow beyond (scripts/terrain70.js).
// Entered from Level 31 by a white door engraved 70. Layout: Savi's picks, Nov 13.
export const ARRIVE = { x: 0, y: 0.1, z: 42 }; // just outside the white door of the stairwell hut, facing north up Kelpie Street
export const HUT = { x: 0, z: 47 }; // brick stairwell hut the white door is set in (door faces -z)
export const STREET = { x: 0, z0: 40, z1: -120, w: 9 }; // Kelpie Street, runs north (-z)
export const ZONES = {
  suburb: { x: -40, z: -14, r: 24, name: "Burns Crescent" },      // suburban house with windowless basement, igloo, snowed-in car
  office: { x: 36, z: -22, r: 20, name: "Calor Office Block" },   // office + parking basement: the almond water valve room
  pocket: { x: 0, z: -72, r: 22, name: "Noahtown" },              // the habitable pocket: market stalls, barrel fires, Froidetownites
  hotel: { x: 34, z: -80, r: 18, name: "Parliament Hotel" },      // the hotel used as parliament
  froston: { x: 62, z: 16, r: 18, name: "Froston" },              // abandoned B.N.T.G. extraction camp
  iceshed: { x: -92, z: -78, r: 34, name: "Iceshed" },            // frosted woods, Carnifices of Gelu camp
};
export const RIVER = { z: -140, w: 22 }; // the frozen Burns River, runs east-west
export const L70_NAMES = { l70_street: "Kelpie Street", l70_suburb: "Burns Crescent", l70_office: "Calor Office Block", l70_pocket: "Noahtown", l70_hotel: "Parliament Hotel", l70_froston: "Froston", l70_iceshed: "Iceshed", l70_river: "The Burns River", l70_wild: "Froidetown" };
export function zoneAt(x, z) {
  for (const [k, v] of Object.entries(ZONES)) if (Math.hypot(x - v.x, z - v.z) < v.r) return k;
  if (Math.abs(z - RIVER.z) < RIVER.w / 2) return "river";
  if (Math.abs(x - STREET.x) < STREET.w / 2 + 2 && z < STREET.z0 + 8 && z > STREET.z1) return "street";
  return "wild";
}
// 0 on built ground, 1 in open snow: the terrain generator and scatter both read it
export function wildness(x, z) {
  let d = 1e9;
  for (const v of Object.values(ZONES)) d = Math.min(d, Math.hypot(x - v.x, z - v.z) - v.r);
  if (z < STREET.z0 + 12 && z > STREET.z1 - 4) d = Math.min(d, Math.abs(x - STREET.x) - (STREET.w / 2 + 3));
  d = Math.min(d, Math.hypot(x - HUT.x, z - HUT.z) - 10);
  d = Math.min(d, Math.abs(z - RIVER.z) - RIVER.w / 2);
  return Math.min(1, Math.max(0, d / 14));
}
