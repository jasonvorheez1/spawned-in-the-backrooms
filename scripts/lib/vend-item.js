// What a vending machine drops: a 2000s can, bottle or chip bag in the snack's colour (snacks.yml color). Shared by the machine (scripts/l61-use.js) and the grabbing hand (scripts/player.js).
import SNACKS from "./data/snacks.yml";
const BAG = new Set(["doritos", "coolranch", "chips", "bar"]), BOTTLE = new Set(["coke", "sprite", "snapple", "gatorade", "sobe", "almond", "purified_water"]);
export function itemSpec(tok) {
  const c = SNACKS[tok]?.color ?? "#d8d0c0";
  if (BAG.has(tok)) return { primitive: { kind: "box", width: 0.13, height: 0.18, depth: 0.035 }, material: { color: c, roughness: 0.35, metalness: 0.5 } };
  if (BOTTLE.has(tok)) return { primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.032, height: 0.2 }, material: { color: tok === "coke" ? "#3a1a10" : c, roughness: 0.08, metalness: 0.1, opacity: 0.9, transparent: true }, children: [{ feetPosition: { x: 0, y: 0.06, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.0335, radiusBottom: 0.0335, height: 0.05 }, material: { color: c, roughness: 0.5 } }] };
  return { primitive: { kind: "cylinder", radiusTop: 0.032, radiusBottom: 0.032, height: 0.122 }, material: { color: c, roughness: 0.25, metalness: 0.75 }, children: [{ feetPosition: { x: 0, y: 0.122, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.027, radiusBottom: 0.03, height: 0.006 }, material: { color: "#c8ccd0", metalness: 1, roughness: 0.3 } }] };
}
