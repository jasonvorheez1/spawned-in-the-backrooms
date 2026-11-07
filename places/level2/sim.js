// Level 2's referee: lays the halls, lights, camp and supplies once, then keeps the hounds and survivors topped up.
import L from "../../scripts/lib/data/level2.yml";
import MEG from "../../scripts/lib/data/meg.yml";
import { N, H, S, zoneOf, cellCenter, openings, hash, ARRIVE, BACK, SEALED } from "../../scripts/lib/level2.js";
import { spawnAlmond, spawnCrateL2, spawnWeapon, rollWeaponL2 } from "../../scripts/lib/loot.js";
import { npcState } from "../../scripts/lib/stats.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
export const cadence = "250ms";
// the Survivors: critters in work clothes, the old Aiding Stragglers' heirs
const SURV = {
  "surv-wren": { name: "Wren · Survivor", role: "scout", voice: "wren", look: { species: "cat", sex: "f", topw: "hoodie", top: "#8a6a4a", botw: "pants", bottom: "#3a3a40", shoes: "boots", shoec: "#2a2420", expr: "smile" }, at: [3.5, 1.5], gun: "pistol" },
  "surv-hollis": { name: "Hollis · Survivor Medic", role: "medic", voice: "hollis", look: { species: "dog", sex: "m", topw: "shirt", top: "#d8d0c0", botw: "pants", bottom: "#4a4038", shoes: "boots", shoec: "#2a2420", expr: "smile" }, at: [5.5, 4.0], gun: "wrench" },
  "surv-mags": { name: "Mags · Survivor Trader", role: "quarter", voice: "mags", look: { species: "raccoon", sex: "f", topw: "jacket", top: "#c27a2a", botw: "pants", bottom: "#3a3a3a", shoes: "boots", shoec: "#2a2420", hat: "beanie", hatc: "#5a2a2a", expr: "grin" }, at: [5.0, -3.6], gun: "shotgun" },
};
function survivor(ctx, id) {
  const g = SURV[id], a = cellCenter(1, ARRIVE.cz);
  ctx.spawn(id, { tags: ["npc"], feetPosition: { x: a.x + g.at[0], y: 0, z: a.z + g.at[1] }, rotation: { yaw: -90 }, physics: "character",
    primitive: { kind: "scripted", script: "scripts/critter-geo.js", params: g.look }, material: { outline: { color: "#1d1420", width: 2.4 } },
    jiggle: { bones: ["Tail*", "Ear*"], amount: 0.6, bounce: 0.6 }, behavior: "scripts/meg-agent.js", state: { name: g.name, role: g.role, voice: g.voice, ...npcState(ctx, "agent", MEG.hp) } });
  ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, ...weaponBody(g.gun) });
}
const lit = (cx, cz) => zoneOf(cx, cz) !== "dark";

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if (!s.seeded) {
    s.seeded = true;
    ctx.spawn("l2-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level2-geo.js" }, material: { roughness: 0.9 } });
    // tube lights: industrial white or sodium orange, uneven, some hanging crooked; dead circuits get a violet emergency lamp now and then
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const c = cellCenter(cx, cz), r = hash(cx, cz, 201), z = zoneOf(cx, cz);
      if (z === "camp") continue;
      if (lit(cx, cz)) {
        if (r > 0.55) continue;
        const orange = hash(cx, cz, 203) < 0.3, col = orange ? "oklch(0.85 0.12 65)" : "oklch(0.95 0.02 200)";
        const along = openings(cx, cz).some((d) => d === 1 || d === 3) && !openings(cx, cz).some((d) => d === 0 || d === 2) ? 0 : 90;
        ctx.spawn({ tags: ["l2lamp"], feetPosition: { x: c.x, y: H - 0.32, z: c.z }, rotation: { yaw: along, roll: r < 0.08 ? 12 : 0 }, primitive: { kind: "box", width: 0.22, height: 0.07, depth: 1.25 },
          material: { color: col, emissive: col, emissiveIntensity: 2.4 }, light: { kind: "point", color: col, intensity: orange ? 5 : 6, distance: 11, shadow: { enabled: false } } });
      } else if (r < 0.18) {
        ctx.spawn({ tags: ["l2violet"], feetPosition: { x: c.x, y: H - 0.4, z: c.z }, primitive: { kind: "box", width: 0.18, height: 0.1, depth: 0.3 },
          material: { color: "oklch(0.6 0.25 300)", emissive: "oklch(0.55 0.26 300)", emissiveIntensity: 2.5 }, light: { kind: "point", color: "oklch(0.55 0.24 300)", intensity: 3, distance: 9, shadow: { enabled: false } } });
      }
    }
    // the camp sign: plywood a survivor spray-painted, drips and all
    const SIGN_TEX = "/cdn/value.184984b3698a8e811d65fabd0495cb2d59125220555cc5346558efc46ebf9c4b.png";
    // the camp: three warm lanterns and a stove
    const a = cellCenter(1, ARRIVE.cz);
    for (const [dx, dz] of [[2, 0], [5, 4.5], [5, -4.5]]) ctx.spawn({ feetPosition: { x: a.x + dx, y: 1.0, z: a.z + dz }, primitive: { kind: "sphere", radius: 0.08 }, material: { color: "oklch(0.85 0.14 70)", emissive: "oklch(0.85 0.14 70)", emissiveIntensity: 2 }, light: { kind: "point", color: "oklch(0.85 0.14 70)", intensity: 5, distance: 12, shadow: { enabled: false } } });
    ctx.spawn({ feetPosition: { x: a.x + 5, y: 0.85, z: a.z - 4.7 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.14, height: 0.12 }, material: { color: "oklch(0.3 0.01 250)", metalness: 0.6 },
      fx: { script: `fx\npop flame rate=18 on=disc(.07) life=.3..0.5 v=up(.6) size=.06..0.1 sz=$size*(1>.2) col=hdr(1.2,2,4)>hdr(.4,.6,2) a=0>.15:1>.7:.6>0 r=sprite(flame-wisp,add)\npop glow n=1 r=light(<.6,.7,1>,fire()*2,4)` } });
    ctx.spawn({ feetPosition: { x: a.x + 3, y: 2.4, z: a.z + 0.01 - 2.45 }, primitive: { kind: "box", width: 2.4, height: 0.8, depth: 0.02 }, material: { texture: SIGN_TEX, roughness: 0.95 }, rotation: { roll: -2 } });
    // the doors: home to Level 1 in the west wall; the barred "3" door in the east
    ctx.spawn("l2-back", { feetPosition: { x: BACK.x + 0.7, y: 0, z: BACK.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.4, depth: 1.4 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level1" } });
    ctx.spawn({ feetPosition: { x: BACK.x + 0.55, y: 2.45, z: BACK.z }, primitive: { kind: "box", width: 0.02, height: 0.45, depth: 1.2 }, material: { color: "oklch(0.25 0.02 150)" },
      ui: '<div face="right" width="1.2m" style="font-size:110px;font-weight:900;color:#d8f0c0;text-align:center">LEVEL 1</div>' });
    ctx.spawn({ feetPosition: { x: BACK.x + 1.2, y: 2.6, z: BACK.z }, light: { kind: "point", color: "oklch(0.8 0.12 150)", intensity: 3, distance: 6 } });
    ctx.spawn({ feetPosition: { x: SEALED.x - 0.6, y: 1.3, z: SEALED.z }, primitive: { kind: "box", width: 0.02, height: 0.9, depth: 0.9 }, material: { color: "oklch(0.55 0.13 60)" },
      ui: '<div face="left" width="0.9m" style="font-size:600px;font-weight:900;color:#1a1410;text-align:center;line-height:1">3</div>' });
    ctx.spawn({ feetPosition: { x: SEALED.x - 1.0, y: 2.7, z: SEALED.z }, light: { kind: "point", color: "oklch(0.7 0.15 30)", intensity: 2, distance: 6 } });
    // supplies
    let crates = 0;
    for (let cx = 3; cx < N && crates < L.crates; cx++) for (let cz = 0; cz < N && crates < L.crates; cz++) {
      const z = zoneOf(cx, cz), chance = z === "room" ? 0.45 : openings(cx, cz).length === 1 ? 0.35 : 0.03;
      if (hash(cx, cz, 301) > chance) continue;
      const c = cellCenter(cx, cz); spawnCrateL2(ctx, { x: c.x + (hash(cx, cz, 303) - 0.5) * 1.6, z: c.z + (hash(cx, cz, 305) - 0.5) * 1.6 }); crates++;
    }
    for (let i = 0; i < L.almonds; i++) { const c = cellCenter(3 + Math.floor(ctx.random() * (N - 3)), Math.floor(ctx.random() * N)); spawnAlmond(ctx, { x: c.x + 0.8, z: c.z - 0.6 }); }
    for (let i = 0; i < L.floorWeapons; i++) { const c = cellCenter(3 + Math.floor(ctx.random() * (N - 3)), Math.floor(ctx.random() * N)); spawnWeapon(ctx, { x: c.x - 0.7, z: c.z + 0.5 }, rollWeaponL2(ctx)); }
    for (const id of Object.keys(SURV)) survivor(ctx, id);
    s.gone = {};
  }
  // a fallen survivor is replaced after a while
  for (const id of Object.keys(SURV)) {
    const o = ctx.place.objects[id];
    if (o && !o.state?.dead) { if (s.gone?.[id]) { const g = { ...s.gone }; delete g[id]; s.gone = g; } continue; }
    if (!s.gone?.[id]) s.gone = { ...s.gone, [id]: now };
    else if (now - s.gone[id] > MEG.respawn * 1000) { const g = { ...s.gone }; delete g[id]; s.gone = g; if (o) ctx.destroy(id); survivor(ctx, id); }
  }
  // hounds roam the far halls, kept topped up
  if (!s.packMgr) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  if (now - (s.houndAt ?? 0) > L.entityRespawn * 1000 || !s.houndAt) {
    s.houndAt = now;
    const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
    for (let i = have; i < L.hounds; i++) {
      const c = cellCenter(8 + Math.floor(ctx.random() * (N - 8)), Math.floor(ctx.random() * N));
      ctx.spawn({ tags: ["hound"], feetPosition: { x: c.x, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", 60, { xp: 40 }) });
    }
  }
}
