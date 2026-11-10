// ASHLINE gun math: a weapon row + its fitted attachments → the numbers the trigger, the camera and the HUD read.
import W from "./data/weapons.yml";
import A from "./data/attachments.yml";
export const WEAPONS = W.weapons;
export const MIGRATE = W.migrate ?? {};
export const ATTACHMENTS = A.attachments;
export const SLOTS = ["optic", "muzzle", "barrel", "grip", "mag", "stock"];
const byW = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
const byA = Object.fromEntries(ATTACHMENTS.map((a) => [a.id, a]));
export const weapon = (id) => byW[id] ?? byW[MIGRATE[id]] ?? byW.scrap9;
export const attachment = (id) => byA[id] ?? null;
export const fits = (a, w) => !a.fits || a.fits.includes(w.cls);
// kit = { id, att: { optic: "acog", ... } }
export function stats(kit) {
  const w = weapon(kit?.id);
  const s = { ...w, spreadMul: 1, recoilMul: 1, adsTime: 0.22, dmgMul: 1, rangeMul: 1, magMul: 1, reloadMul: 1, moveMul: 1, lenMul: 1, zoomMax: 0, reticle: w.scoped ? "cross" : "iron", suppressed: !!w.suppressed, laser: false, flash: 1 };
  if (w.scoped) { s.zoom = w.zoom ?? 6; s.zoomMax = 0; s.adsTime = 0.3; }
  for (const slot of SLOTS) {
    const a = attachment(kit?.att?.[slot]);
    if (!a || !fits(a, w)) continue;
    if (a.zoom) { s.zoom = a.zoom; s.zoomMax = a.zoomMax ?? 0; s.reticle = a.reticle; }
    if (a.adsTime) s.adsTime *= a.adsTime;
    if (a.spread) s.spreadMul *= a.spread;
    if (a.recoil) s.recoilMul *= a.recoil;
    if (a.dmg) s.dmgMul *= a.dmg;
    if (a.range) s.rangeMul *= a.range;
    if (a.mag) s.magMul *= a.mag;
    if (a.reload) s.reloadMul *= a.reload;
    if (a.move) s.moveMul *= a.move;
    if (a.len) s.lenMul *= a.len;
    if (a.suppressed) s.suppressed = true;
    if (a.laser) s.laser = true;
    if (a.flash) s.flash *= a.flash;
  }
  // Grudge tiers + character attributes ride the kit as one multiplier set (scripts/lib/grudge.js perkOf), written by scripts/career.js
  const pk = kit?.perk;
  if (pk) { s.dmgMul *= pk.dmg ?? 1; s.recoilMul *= pk.recoil ?? 1; s.reloadMul *= pk.reload ?? 1; s.spreadMul *= pk.spread ?? 1; s.moveMul *= pk.move ?? 1; s.adsTime *= pk.ads ?? 1; s.rangeMul *= pk.range ?? 1; }
  s.tier = kit?.tier ?? 1;
  s.damage = Math.round(w.dmg * s.dmgMul);
  s.magSize = Math.max(1, Math.round(w.mag * s.magMul));
  s.reloadS = w.reload * s.reloadMul;
  s.hip = w.spread * s.spreadMul;
  s.adsSpread = w.ads * s.spreadMul;
  s.kick = w.recoil * s.recoilMul;
  s.reach = w.range * s.rangeMul;
  s.speed = w.move * s.moveMul;
  s.interval = 60000 / w.rpm;
  return s;
}
export function kitPrice(kit) {
  let p = weapon(kit.id).price;
  for (const slot of SLOTS) { const a = attachment(kit.att?.[slot]); if (a) p += a.price; }
  return p;
}
