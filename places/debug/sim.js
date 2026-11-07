import { weaponBody } from "../../scripts/lib/weapon-look.js";
// The debug room's referee: puts every test item back a few seconds after it is taken or killed.
import L from "../../scripts/lib/data/level0.yml";
import W from "../../scripts/lib/data/weapons.yml";
import { WEAPON_SLOTS, ALMOND_SLOTS, AMMO_SLOTS, SMILER_PEN, LURKER_PEN } from "../../scripts/lib/debug-layout.js";
export const cadence = "1s";
const REFILL = 4000; // ms before a taken item comes back (her pick)

const near = (rows, p) => rows.some((r) => Math.hypot(r.feetPosition.x - p.x, r.feetPosition.z - p.z) < 0.6);
function due(s, key, now) { if (!s[key]) { s[key] = now + REFILL; return false; } if (now < s[key]) return false; delete s[key]; return true; }

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  const weapons = ctx.query({ tags: ["weapon"] }), almonds = ctx.query({ tags: ["almond"] }), ammo = ctx.query({ tags: ["ammo"] });
  for (const w of WEAPON_SLOTS) {
    if (near(weapons, w)) { delete s["w" + w.kind]; continue; }
    if (s.seeded && !due(s, "w" + w.kind, now)) continue;
    ctx.spawn({ tags: ["weapon"], state: { kind: w.kind }, feetPosition: { x: w.x, y: 0.02, z: w.z }, rotation: 90, ...weaponBody(w.kind) });
  }
  ALMOND_SLOTS.forEach((a, i) => {
    if (near(almonds, a)) { delete s["a" + i]; return; }
    if (s.seeded && !due(s, "a" + i, now)) return;
    ctx.spawn({ tags: ["almond"], feetPosition: { x: a.x, y: 0.02, z: a.z }, model: "/cdn/value.a762c3c5b45b825a10d0e93b00d009ae455200b423a5b63cda9e8d34bbc7750c.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } });
  });
  AMMO_SLOTS.forEach((a, i) => {
    if (near(ammo, a)) { delete s["m" + i]; return; }
    if (s.seeded && !due(s, "m" + i, now)) return;
    ctx.spawn({ tags: ["ammo"], feetPosition: { x: a.x, y: 0.02, z: a.z }, primitive: { kind: "box", width: 0.14, height: 0.07, depth: 0.09 }, material: { color: "oklch(0.72 0.12 85)", metalness: 0.7, roughness: 0.4, emissive: "oklch(0.6 0.1 85)", emissiveIntensity: 0.5 } });
  });
  const smilers = ctx.query({ tags: ["smiler"] }).filter((m) => !m.state?.dead).length;
  if (!smilers && s.want_smiler && !(s.want_smiler = false))
    ctx.spawn({ tags: ["smiler"], feetPosition: { x: SMILER_PEN.x, y: 0.05, z: SMILER_PEN.z }, primitive: { kind: "scripted", script: "scripts/smiler-geo.js" }, physics: { body: "character" }, material: { emissiveIntensity: 3.5 }, state: { hp: L.smilerHp } });
  const lurkers = ctx.query({ tags: ["lurker"] }).filter((m) => !m.state?.dead).length;
  if (!lurkers && s.want_lurker && !(s.want_lurker = false))
    ctx.spawn({ tags: ["lurker"], feetPosition: { x: LURKER_PEN.x, y: 0.05, z: LURKER_PEN.z }, primitive: { kind: "scripted", script: "scripts/lurker-geo.js" }, physics: { body: "character" }, state: { hp: L.lurkerHp, kind: "lurker" } });
  s.seeded = true;
}
