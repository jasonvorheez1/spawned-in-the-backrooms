// The debug room's slots: one table the room's sim reads to keep every test item in place.
// Room spans x 88..112, z -10..10, centred on (100, 0), far from the maze's cells.
import W from "./data/weapons.yml";
export const ROOM = { x0: 88, x1: 112, z0: -10, z1: 10, cx: 100 };
export const WEAPON_SLOTS = W.order.slice(1).map((kind, i) => ({ kind, x: 89.6, z: -6 + i * 2 }));
export const ALMOND_SLOTS = [-4, -2, 0, 2].map((z) => ({ x: 110.4, z }));
export const AMMO_SLOTS = [5, 7].map((z) => ({ x: 110.4, z }));
export const SMILER_PEN = { x: 94, z: -8 };
export const LURKER_PEN = { x: 106, z: -8 };
