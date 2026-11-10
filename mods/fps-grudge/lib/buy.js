// The quick-buy table, one source for scripts/player.js (the keys) and scripts/ui.js (the menu).
// B opens it; 1–8 picks a category; 1–9 buys that row; Esc / Backspace steps back.
import { WEAPONS } from "./guns.js";
import C from "./data/combat.yml";
import N from "./data/grenades.yml";
export const GRENADE_PRICE = N.frag.price, GRENADE_MAX = N.frag.max;
export const BUY_CATS = [
  { id: "pistol", label: "Pistols" },
  { id: "smg", label: "SMGs" },
  { id: "shotgun", label: "Shotguns" },
  { id: "rifle", label: "Rifles" },
  { id: "sniper", label: "Snipers" },
  { id: "gear", label: "Armour & Grenades" },
  { id: "launcher", label: "Launchers" },
  { id: "melee", label: "Melee" },
];
export function buyRows(cat) {
  if (cat === "gear") return [{ kind: "armor", id: "armor", name: "Plate Vest", price: 650 }, ...N.order.map((k) => ({ kind: "grenade", id: k, name: N[k].name, price: N[k].price, max: N[k].max, key: N[k].key })), { kind: "molotov", id: "molotov", name: "Molotov", price: C.molotov.price, max: C.molotov.max }, { kind: "syringe", id: "syringe", name: "Syringe", price: C.syringe.price, max: C.syringe.max }];
  return WEAPONS.filter((w) => w.cls === cat).slice(0, 9).map((w) => ({ kind: "weapon", id: w.id, name: w.name, price: w.price }));
}
