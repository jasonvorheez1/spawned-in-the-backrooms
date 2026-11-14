// Level 6.1 food tray as a real object: spawned into a player's hands (player.state.l61Hold = its id, l61Tray = when),
// carried and thrown by scripts/grab.js, set down with E, taken back with E or Z, slid into the return rack (scripts/l61-use.js).
// Ids start "snacktray-", never "l61-": the level's rebuild wipes l61- roots.
// the empty moulded tray (Tripo, fitted in art/l61-tripo-fit/build.py: 0.46 x 0.065 x 0.31 m, feet origin); the meal on it is its children, by order
export const TRAY_MODEL = "/cdn/value.7dce5d8a25bbf4f4f3841988aedb6109cf353fbddc263cf1e68dd4ddb980fd81.glb";
import FOOD from "./data/bonus-food-models.yml";
const FIT = { // Tripo then Studio (art/l61-tripo-fit/build.py), feet origin
  plate: { model: "/cdn/value.4855edb39e5d71348b9d525fadd939ecb40086bb9ffc24c8daa9ee4a8642ae99.glb", w: 0.26 },
  mug: { model: "/cdn/value.576793eb000bea5267305695a7d529d11db108319af52abfdfcec00b9db2f3f3.glb", w: 0.1 },
  beer: { model: "/cdn/value.59bd14bc7f67ec88f2eab70096b821cbcb3bef5f6aa1920f47b859ac41120f18.glb", w: 0.07 },
};
const FOOD_OF = { // a menu item -> the model that sits on the tray for it
  chilidog: "hotdog", burger: "cheezburger", pizza: "pizza", doritos: "fries", coolranch: "fries", coke: "coke", dew: "lemonade",
  jackcoke: "lemonade", margarita: "lemonade", whiskey: "lemonade", almond: "water",
  gibplate: "plate", diner_coffee: "mug", budweiser: "beer", corona: "beer", millerlite: "beer", smirnoffice: "beer",
};
const FLOOR = 0.016; // the tray's well floor above its feet
// the meal laid out left to right across the tray: food first, drinks to the right
export function mealKids(items = []) {
  const keys = items.map((i) => FOOD_OF[i]).filter(Boolean);
  const drink = (k) => ["coke", "lemonade", "water", "mug", "beer"].includes(k);
  keys.sort((a, b) => drink(a) - drink(b));
  const out = [], n = Math.min(keys.length, 3);
  for (let i = 0; i < n; i++) {
    const k = keys[i], x = n === 1 ? 0 : -0.14 + (0.28 * i) / (n - 1);
    const f = FIT[k], m = FOOD[k];
    if (f) out.push({ feetPosition: { x: k === "plate" && n > 1 ? -0.09 : x, y: FLOOR, z: 0 }, model: { id: f.model, forward: "+z" }, castShadow: false });
    else if (m) out.push({ feetPosition: { x, y: FLOOR, z: 0 }, rotation: { yaw: k === "hotdog" ? 90 : -30 }, model: { id: m.model, forward: m.forward }, castShadow: false });
  }
  return out;
}
export const TRAY_KG = 1.4;          // tray + a meal (Savi's pick)
export const TRAY_LIFE = 3600;       // a tray left lying is bussed away after an hour
export const CLATTER = "/cdn/moodboard-realistic-gritty/sfx-plastic-cafeteria-tray-clatter-hit.mp3";
export const isTray = (o) => !!o?.tags?.includes("snacktray");
// spawn a tray in front of `who` and hand it to them; grab.js on their machine takes it up
export function handTray(ctx, who, n, info, items) {
  const f = who.feetPosition, id = `snacktray-${String(who.id).replace(/[^a-z0-9]/gi, "").slice(-10)}-${n}-${Math.floor(ctx.now() % 1e6)}`;
  ctx.spawn(id, {
    tags: ["snacktray"],
    feetPosition: { x: f.x, y: f.y + 0.75, z: f.z },
    model: { id: TRAY_MODEL },
    children: mealKids(items),
    behavior: "scripts/l61-use.js",
    lifetime: TRAY_LIFE,
    state: { kind: "snacktray", name: "Food tray", verb: "Pick up", info: info ?? "Snackrooms food tray", tint: "#ffd84a", carryKg: TRAY_KG, items: items ?? [], mat: "plastic", hp: 999, maxHp: 999 },
  });
  who.state.l61Hold = id; who.state.l61Tray = ctx.now();
  return id;
}
