import { keepPeople } from "../../scripts/lib/level-kit.js";
import { tickWalls } from "../../scripts/lib/breakables.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { fullLook, npcLook } from "../../scripts/lib/clothes.js";
import { raycast } from "builtin/physics";
import { heard } from "../../scripts/lib/hear.js";
// Level 2's referee: lays the halls, lights, camp and supplies once, then keeps the hounds and survivors topped up.
import L from "../../scripts/lib/data/level2.yml";
import MEG from "../../scripts/lib/data/meg.yml";
import { STAIR } from "../../scripts/lib/level2.js";
import { N, H, S, zoneOf, cellCenter, cellAt, openings, isOpen, hash, ARRIVE, BACK, SEALED, SIDE, HALL, HALL_H, CATWALK, inHall, inPipes, sideOf, flickerSector, SLUDGE2 } from "../../scripts/lib/level2.js";
import { spawnAlmond, spawnCrateL2, spawnWeapon, rollWeaponL2, spawnContainerL2 } from "../../scripts/lib/loot.js";
import { npcState, dmgAfterArmor } from "../../scripts/lib/stats.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
export const cadence = "250ms";
// the Survivors: critters in work clothes, the old Aiding Stragglers' heirs
const SURV = {
  "surv-wren": { name: "Wren · Survivor", role: "scout", voice: "wren", look: { species: "cat", sex: "f", eye: "#38b888", belly: "#fff2de", nose: "#ff8fa3", topw: "hoodie", top: "#8a6a4a", botw: "pants", bottom: "#3a3a40", shoes: "boots", shoec: "#2a2420", expr: "beam" }, at: [3.5, 1.5], gun: "pistol" },
  "surv-hollis": { name: "Hollis · Survivor Medic", role: "medic", voice: "hollis", look: { species: "dog", sex: "m", eye: "#94622c", belly: "#fce9d2", nose: "#2a1c18", topw: "longsleeve", top: "#d8d0c0", botw: "pants", bottom: "#4a4038", shoes: "boots", shoec: "#2a2420", expr: "smile" }, at: [5.5, 4.0], gun: "wrench" },
  "surv-mags": { name: "Mags · Survivor Trader", role: "quarter", voice: "mags", look: { species: "raccoon", sex: "f", eye: "#c27420", belly: "#eae6ec", tip: "#2a2830", nose: "#1c1a20", topw: "jacket", top: "#c27a2a", botw: "pants", bottom: "#3a3a3a", shoes: "boots", shoec: "#2a2420", hat: "beanie", hatc: "#5a2a2a", expr: "grin" }, at: [5.0, -3.6], gun: "shotgun" },
};
function survivor(ctx, id) {
  const g = SURV[id], a = cellCenter(1, ARRIVE.cz);
  ctx.spawn(id, { tags: ["npc"], feetPosition: { x: a.x + g.at[0], y: 0, z: a.z + g.at[1] }, rotation: { yaw: -90 }, physics: "character",
    ...critterSpec(npcLook(id, g.look, g.faction ?? "survivor", g.level ?? 8, g.role)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"], state: { name: g.name, role: g.role, voice: g.voice, ...npcState(ctx, "agent", MEG.hp) } });
  ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
}
const lit = (cx, cz) => zoneOf(cx, cz) !== "dark";

const slAt = {}; // per-player sludge hiss clock, this machine's
export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if (!(Math.abs(now - (ctx.session.wallTick ?? -1e9)) < 2000)) { ctx.session.wallTick = now; tickWalls(ctx); } // broken interior walls: holes drawn, regrown after a while (lib/breakables.js)
  if (!s.almondTidy) { s.almondTidy = 1; for (const o of ctx.query({ tags: ["almond"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const p = o.feetPosition ?? { x: 0, y: 0, z: 0 }; if (p.y < 0.15 && !(false)) ctx.destroy(o.id); } } // loose floor bottles cleared once: almond water lives in containers and drops now
  tickChatter(ctx, CHATTER.level2, {"surv-wren": "wren", "surv-hollis": "hollis", "surv-mags": "mags"}); // the camp talks among itself while someone's near
  if (!s.seeded) {
    s.seeded = true;
    ctx.spawn("l2-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level2-geo.js" }, material: { roughness: 0.9 } });
    ctx.spawn({ feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/level2-details-geo.js" }, material: { roughness: 0.85 } }); // lagged pipes, conduit, ducts, caged lamps, stains
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
    for (let i = 0; i < L.floorWeapons; i++) { const c = cellCenter(3 + Math.floor(ctx.random() * (N - 3)), Math.floor(ctx.random() * N)); spawnWeapon(ctx, { x: c.x - 0.7, z: c.z + 0.5 }, rollWeaponL2(ctx)); }
    for (const id of Object.keys(SURV)) survivor(ctx, id);
    s.gone = {};
  }
  if (!s.arrive2) { s.arrive2 = true; // where a doorway lets you out
    ctx.spawn("l2-from-l1", { feetPosition: { x: BACK.x + 2.6, y: 0.1, z: BACK.z }, rotation: { yaw: -90 } });
    ctx.spawn("l2-from-l3", { feetPosition: { x: SEALED.x - 2.6, y: 0.1, z: SEALED.z }, rotation: { yaw: 90 } });
  }
  if (!s.l3door) { // the barred "3" door at the east end opens onto Level 3 now
    s.l3door = true;
    ctx.spawn("l2-to-l3", { feetPosition: { x: SEALED.x - 0.7, y: 0, z: SEALED.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.4, depth: 1.4 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level3" } });
    ctx.spawn({ feetPosition: { x: SEALED.x - 0.6, y: 2.25, z: SEALED.z }, primitive: { kind: "box", width: 0.02, height: 0.3, depth: 1.2 }, material: { color: "oklch(0.25 0.03 150)" }, ui: '<div face="left" width="1.2m" style="font-size:100px;font-weight:900;color:#ffd890;text-align:center">LEVEL 3 · ELECTRICAL</div>' });
  }
  if ((s.rev ?? 0) >= 4 && (s.snapped ?? 0) < 1) { snapContainers(ctx); s.snapped = 1; }
  if (STAIR && (s.rev ?? 0) >= 4 && !s.stairV) sideRoom(ctx, STAIR); // rooms that were laid before the stairwell existed get it now
  if ((s.rev ?? 0) < 4) revamp(ctx, s); // the revamp lays itself over a few ticks: rooms, doors, the hall, vents
  if (s.sludgeV !== 1) { s.sludgeV = 1; laySludge2(ctx); }
  if (s.graffitiV !== 1) { s.graffitiV = 1; layGraffiti2(ctx); }
  // a fallen survivor is replaced after a while
  keepPeople(ctx, Object.keys(SURV), survivor);
  // hounds roam the far halls, kept topped up
  if ((!s.packMgr || !(s.packMgr in ctx.place.objects))) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  if (now - (s.houndAt ?? 0) > L.entityRespawn * 1000 || !s.houndAt) {
    s.houndAt = now;
    const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
    for (let i = have; i < L.hounds; i++) {
      const c = cellCenter(8 + Math.floor(ctx.random() * (N - 8)), Math.floor(ctx.random() * N));
      ctx.spawn({ tags: ["hound"], feetPosition: { x: c.x, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", 60, { xp: 40 }) });
    }
  }

  // player hazards: boiling black pipe fluid and scalding steam vents
  const players = ctx.place.players;
  if (players.length) {
    for (const p of players) {
      const ps = p.state; if (!ps || ps.hp == null || ps.hp <= 0) continue;
      const f = p.feetPosition, dt = 0.25;

      // boiling black sludge pools under cracked pipes
      for (const h of SLUDGE2) {
        if (Math.hypot(f.x - h.x, f.z - h.z) < 1.15 && f.y < 0.3) {
          ps.hp -= dmgAfterArmor(ps.look, (L.sludgeHurt ?? 7) * dt);
          ps.sanity = Math.max(0, (ps.sanity ?? 0) - (L.sludgeSanity ?? 3) * dt);
          if (now - (slAt[p.id] ?? -1e9) > 1500) {
            slAt[p.id] = now;
            heard(ctx, { maxDistance: 24, refDistance: 4, clip: GRIT("acid-sizzle-hiss"), position: f, volume: 0.5 }, { audience: { player: p.id } });
            ctx.emit("screenFlash", { color: "#25101a", duration: 0.3, intensity: 0.4 }, { audience: { player: p.id } });
            if (!p.session?.sludgeWarn) {
              p.session.sludgeWarn = 1;
              ps.notice = { text: "Boiling black fluid burns your boots! It is NOT almond water.", at: now };
            }
          }
          break;
        }
      }

      // scalding steam vents: high pressure jets burn wanderers
      for (const v of ctx.query({ tags: ["l2steam"], radius: 10, center: f })) {
        const vp = v.feetPosition;
        if (Math.hypot(f.x - vp.x, f.z - vp.z) < 1.45 && Math.abs(f.y + 1.2 - vp.y) < 1.3 && now - (ps.steamAt ?? 0) > 1600) {
          ps.steamAt = now;
          const dmg = L.steamHurt ?? 8;
          ps.hp -= dmgAfterArmor(ps.look, dmg);
          const at = { x: f.x, y: f.y + 1.2, z: f.z };
          heard(ctx, { maxDistance: 24, refDistance: 4, clip: GRIT("steam-pipe-hiss-loop"), position: at, volume: 0.85 });
          ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff8c3a" });
          ctx.emit("screenShake", { intensity: 0.35, duration: 0.25 }, { audience: { player: p.id } });
          ctx.emit("screenFlash", { color: "#ff7722", duration: 0.25, intensity: 0.5 }, { audience: { player: p.id } });
          const kx = f.x - vp.x, kz = f.z - vp.z, kd = Math.hypot(kx, kz) || 1;
          ctx.emit("cameraPunch", { direction: { x: kx / kd, y: 0.2, z: kz / kd }, intensity: 0.5 }, { audience: { player: p.id } });
          if (!p.session?.steamWarn) {
            p.session.steamWarn = 1;
            ps.notice = { text: "High-pressure steam scalds your skin!", at: now };
          }
        }
      }
    }
  }
}

// ---- the revamp: side rooms behind doors, the Boiler Hall, steam vents, flickering circuits
const GRIT = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const STEAM = `fx
pop steam rate=(flick(.3,1)^3)*?mobile:22|40 on=disc(.04) life=.7..1.3 v=<%dir|0,0,1>*(1.6..2.6)+sdir()*.35 size=.12..0.22 acc=buoy(.5)+curl(.5)*.6+drag(1.3) sz=$size*(.5>3.4) col=<.82,.84,.86> a=0>.08:.38>.6:.18>0 rot=spin(.3) r=sprite(smoke-puff,alpha)`;
const SPARKS = `fx
pop spark rate=(flick(1.4,1)^8)*260 on=disc(.06) life=.25..0.6 v=<%dir|0,0,1>*(1..2.5)+sdir()*1.6 size=.012..0.025 acc=grav()+drag(.4) floor=bounce(.3) sz=$size col=hdr(4,4,6)>hdr(3,1.6,.4) a=1>0 r=sprite(ember,add,velocity,.03)
pop zap n=1 r=light(<.65,.8,1>,(flick(1.4,1)^8)*14,5)`;
const flickFx = (col, k) => `fx\npop glow n=1 r=light(${col},(.15+.85*flick(${(3 + k * 5).toFixed(2)},.85))*6,11)`;
const FIREBOX = `fx
pop glow n=1 r=light(<1,.45,.15>,fire()*10,9)
pop ember rate=3 on=disc(.4) life=1..2 v=up(.6..1.2)+sdir()*.2 size=.015..0.03 acc=curl(.6)+drag(.4) col=hdr(4,1.6,.3)>hdr(1,.2,.04) a=(1>0)*flick(9,.4) sz=$size r=sprite(ember,add)`;
// the stairwell up to Level 2.1: a dead end shut with a steel blast shutter (break it: a sledge, a pick, a lot of lead), a shaft with a steep stair rising out of the ceiling into the dark.
// What the wiki calls the single access point, blocked by "a big metal wall" the day Base Alef was locked out.
function stairRoom(ctx, r, P, [nx, nz]) {
  ctx.place.state.stairV = 1;
  const yaw = Math.atan2(-nx, -nz) * 180 / Math.PI, E = S / 2;
  const step = (id, a, h, spec = {}) => ctx.spawn(id, { feetPosition: P(a, 0, 0), rotation: { yaw }, physics: "static", primitive: { kind: "box", width: 1.7, height: h, depth: 0.3 }, material: { color: "oklch(0.56 0.012 80)", texture: "cdn/texture-worn-poured-concrete-stair-tread.png", repeat: [2, 1], roughness: 0.9 }, ...spec });
  for (let i = 0; i < 13; i++) step(`l2-stair-${i}`, 1.85 - i * 0.3, (i + 1) * 0.25);
  const wall = (id, a, b, w, d) => ctx.spawn(id, { feetPosition: { ...P(a, b), y: 3.0 }, rotation: { yaw }, physics: "static", primitive: { kind: "box", width: w, height: 3.7, depth: d }, material: { color: "oklch(0.62 0.015 85)", texture: "cdn/texture-painted-cinderblock-wall-scuffed.png", wrap: "repeat", repeat: [1.2, 1.2], roughness: 0.9 } });
  wall("l2-stair-wb", -2.28, 0, 4.9, 0.3); wall("l2-stair-wl", 0, -2.28, 0.3, 4.9); wall("l2-stair-wr", 0, 2.28, 0.3, 4.9); wall("l2-stair-wf", E - 0.1, 0, 4.9, 0.3);
  ctx.spawn("l2-stair-roof", { feetPosition: { ...P(0, 0), y: 6.7 }, rotation: { yaw }, physics: "static", primitive: { kind: "box", width: 5, height: 0.25, depth: 5 }, material: { color: "oklch(0.2 0.01 60)", roughness: 1 } });
  ctx.spawn("l2-stair-lamp", { feetPosition: P(-1.0, 0, 5.6), light: { kind: "point", color: "oklch(0.75 0.14 70)", intensity: 5, distance: 9 } });
  // the shutter: ribbed steel across the door, a hazard stripe, stencilled
  ctx.spawn("l2-stair-block", { tags: ["breakable"], feetPosition: P(E - 0.12, 0, 0), rotation: { yaw }, physics: "static",
    primitive: { kind: "box", width: 1.3, height: 2.3, depth: 0.22 }, material: { color: "oklch(0.36 0.02 250)", roughness: 0.55, metalness: 0.6 },
    state: { mat: "sheet_steel", hp: 800, maxHp: 800, name: "Blast shutter (SUBLEVEL 2.1)" },
    ui: `<div face="front" width="1.3m" style="font-family:Arial,sans-serif;font-weight:900;text-align:center;line-height:1.1;color:#e6dcc0"><div style="background:repeating-linear-gradient(45deg,#d8a820 0 28px,#1a1a1a 28px 56px);height:70px"></div><div style="font-size:92px;margin-top:20px">SUBLEVEL 2.1</div><div style="font-size:42px;color:#e8a098">ACCESS SUSPENDED</div><div style="font-size:32px;margin-top:10px">M.E.G. BASE ALEF · AUTHORISED PERSONNEL</div></div>` });
  ctx.spawn("l2-from-l21", { feetPosition: P(1.6, 0, 0.1), rotation: { yaw: Math.atan2(nx, nz) * 180 / Math.PI } });
  ctx.spawn("l2-to-l21", { feetPosition: { ...P(-1.85, 0), y: 3.2 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.4, height: 2.4, depth: 0.8 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level21#l21-from-l2" } });
  ctx.spawn("l2-stair-glow", { feetPosition: { ...P(-1.7, 0), y: 4.3 }, primitive: { kind: "box", width: 1.2, height: 1.4, depth: 0.04 }, rotation: { yaw }, material: { color: "oklch(0.95 0.03 95)", emissive: "oklch(0.97 0.04 95)", emissiveIntensity: 2 } }); // white light at the top
}
const yawOf = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI; // the yaw that turns a front (-Z) toward (dx, dz)
// where each room type puts its containers, in the room's own frame: [a (out toward the door), b (across)]
const SLOTS = { boiler: [[-1.85, 1.2], [-1.85, -0.4]], locker: [[-1.85, -1.2], [-1.85, -0.5], [-1.85, 0.2]], pump: [[-1.85, 0], [1.5, -1.6], [1.5, 1.6]],
  office: [[-1.75, -1.5], [-1.75, 1.5], [0.2, 0]], cage: [[-1.7, 0], [1.4, -1.5], [1.4, 1.5]], break: [[-1.7, -1.2], [-1.75, 0.6]], electrical: [[-1.85, 0], [-1.9, -1.4]] };

function sideRoom(ctx, r) {
  const c = cellCenter(r.cx, r.cz), [nx, nz] = D4[r.o], tx = -nz, tz = nx, E = S / 2, T = L.types[r.type];
  const P = (a, b, y = 0) => ({ x: c.x + nx * a + tx * b, y, z: c.z + nz * a + tz * b });
  if (r.type === "stair") { stairRoom(ctx, r, P, [nx, nz]); return; }
  const style = r.type === "cage" ? "cage" : r.type === "electrical" ? "elec" : "steel";
  const label = T.label.charAt(0) + T.label.slice(1).toLowerCase();
  ctx.spawn(`l2-door-${r.i}`, { tags: ["door", "l2door"], feetPosition: P(E, -0.55), rotation: { yaw: Math.atan2(-tz, tx) * 180 / Math.PI }, physics: { body: "kinematic", collider: "box" },
    primitive: { kind: "scripted", script: "scripts/l2-props-geo.js", params: { kind: "door", style, seed: r.i } }, behavior: "scripts/l2-door.js",
    state: { name: `${label} door`, lock: r.lock, open: false, yaw0: Math.atan2(-tz, tx) * 180 / Math.PI, c: P(E, 0, 1.1) } });
  // the stencil over the door, on the tunnel side
  ctx.spawn({ feetPosition: P(E + 0.14, 0, 2.4), rotation: { yaw: yawOf(nx, nz) }, primitive: { kind: "box", width: 1.1, height: 0.22, depth: 0.02 }, material: { color: "oklch(0.3 0.01 250)", roughness: 0.8 },
    ui: `<div face="front" width="1.1m" style="font-size:150px;font-weight:900;color:#e6dcc0;text-align:center;letter-spacing:12px;line-height:1.4">${T.label}</div>` });
  // the room's lamp: a caged bulb, flickering on the electrical rooms
  const lamp = { feetPosition: P(0, 0, H - 0.2), primitive: { kind: "sphere", radius: 0.07 }, material: { color: T.light, emissive: T.light, emissiveIntensity: 3 } };
  if (r.type === "electrical") ctx.spawn({ ...lamp, fx: { script: flickFx(`<.6,.75,1>`, hash(r.cx, r.cz, 9)) } });
  else ctx.spawn({ ...lamp, light: { kind: "point", color: T.light, intensity: 5, distance: 8, shadow: { enabled: false } } });
  if (r.type === "electrical") ctx.spawn({ feetPosition: P(-0.5, 2.1 - 0.02, 1.6), fx: { script: SPARKS, params: { dir: { x: -tx, y: 0.3, z: -tz } } }, audio: { clip: GRIT("electrical-arc-buzz-loop"), gain: 0.3, loop: true, spatial: true, maxDistance: 9 } });
  if (r.type === "pump") {
    ctx.spawn({ feetPosition: P(-0.2, 0, 0.1), rotation: { pitch: -90 }, primitive: { kind: "plane", width: S - 0.8, height: S - 0.8 }, material: { kind: "water", color: "oklch(0.35 0.04 200)", opacity: 0.7, waveIntensity: 0.15 } });
    ctx.spawn({ feetPosition: P(0, 0, 1.5), audio: { clip: GRIT("water-drip-echo-loop"), gain: 0.25, loop: true, spatial: true, maxDistance: 10 } });
  }
  if (r.type === "boiler") ctx.spawn({ feetPosition: P(0.6, -1.4, 0.4), fx: { script: FIREBOX }, audio: { clip: GRIT("boiler-low-rumble-loop"), gain: 0.25, loop: true, spatial: true, maxDistance: 10 } });
  // what can be looted: its type's containers on their slots, facing the door
  const S0 = SLOTS[r.type] ?? [[-1.8, 0]], lockedRoom = !!T.lock;
  T.containers.forEach((k, j) => { const [a, b] = S0[j % S0.length], d = L.containers[k].size[2]; spawnContainerL2(ctx, k, P(a + (a < 0 ? d / 2 - 0.25 : 0), b), yawOf(nx, nz), { bonus: T.bonus ?? 0, noLock: lockedRoom, room: r.i }); });
}

function revamp(ctx, s) {
  const step = s.rev ?? 0;
  if (step === 0) {
    // lamps that now stand in the hall or inside a room go (each gets its own), lamps in a flickering circuit flicker
    for (const l of ctx.query({ tags: ["l2lamp"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
      const { cx, cz } = cellAt(l.feetPosition.x, l.feetPosition.z), o = ctx.place.objects[l.id]; if (!o) continue;
      if (inHall(cx, cz) || sideOf(cx, cz)) { ctx.destroy(l.id); continue; }
      if (flickerSector(cx, cz)) { const col = typeof o.material?.color === "string" ? o.material.color : JSON.stringify(o.material?.color ?? "oklch(0.95 0.02 200)"); o.light = null; o.fx = { script: flickFx(col.includes(" 65") ? "<1,.7,.4>" : "<.85,.92,1>", hash(cx, cz, 11)) }; }
    }
    ctx.spawn("l2-rooms", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level2-rooms-geo.js" }, material: { roughness: 0.85 } });
    // the Boiler Hall: high sodium lamps, the firebox, the drone, loot on the floor and up on the catwalk
    const cx = (HALL.x0 + HALL.x1) / 2, cz = (HALL.z0 + HALL.z1) / 2;
    for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) ctx.spawn({ feetPosition: { x: cx + dx, y: HALL_H - 0.6, z: cz + dz }, primitive: { kind: "cylinder", radiusTop: 0.15, radiusBottom: 0.35, height: 0.3 }, material: { color: "oklch(0.85 0.14 65)", emissive: "oklch(0.8 0.15 60)", emissiveIntensity: 2.5 }, light: { kind: "point", color: "oklch(0.8 0.13 62)", intensity: 16, distance: 22, shadow: { enabled: false } } });
    ctx.spawn({ feetPosition: { x: cx - 6.8, y: 2.2, z: cz }, fx: { script: FIREBOX }, audio: { clip: GRIT("boiler-low-rumble-loop"), gain: 0.4, loop: true, spatial: true, maxDistance: 26 } });
    spawnContainerL2(ctx, "lockbox", { x: HALL.x1 - 0.4 - 0.7, y: CATWALK + 0.01, z: HALL.z1 - 0.4 - 0.7 }, 225, { bonus: 1 });
    spawnContainerL2(ctx, "toolbox", { x: HALL.x0 + 1.2, z: cz + 3 }, -90);
    spawnContainerL2(ctx, "cabinet", { x: cx + 2, z: HALL.z1 - 0.7 }, 180);
    s.rev = 1; return;
  }
  if (step === 1 || step === 2) { const half = Math.ceil(SIDE.length / 2); for (const r of SIDE.slice((step - 1) * half, step * half)) sideRoom(ctx, r); s.rev = step + 1; return; }
  if (step === 3) {
    // steam vents: split joints along the wall pipes, in the pipe maze most of all; each hisses
    let n = 0;
    for (let cz = 0; cz < N && n < L.steamVents; cz++) for (let cx = 3; cx < N && n < L.steamVents; cx++) {
      const z = zoneOf(cx, cz); if (z === "camp" || inHall(cx, cz) || sideOf(cx, cz)) continue;
      if (hash(cx, cz, 515) > (inPipes(cx, cz) ? 0.5 : 0.07)) continue;
      const d = [0, 1, 2, 3].find((k) => !isOpen(cx, cz, k)); if (d == null) continue;
      const c = cellCenter(cx, cz), [dx, dz] = D4[d], off = S / 2 - 0.55;
      ctx.spawn({ tags: ["l2steam"], feetPosition: { x: c.x + dx * off, y: 1.6 + hash(cx, cz, 516) * 0.8, z: c.z + dz * off }, fx: { script: STEAM, params: { dir: { x: -dx, y: 0.15, z: -dz } } },
        audio: { clip: GRIT("steam-pipe-hiss-loop"), gain: 0.3, loop: true, spatial: true, maxDistance: 9 } });
      n++;
    }
    s.rev = 4;
  }
}

// every container backs flush onto its nearest wall and faces out (creator: "fix oddly placed stuff like this supply cabinet")
function snapContainers(ctx) {
  for (const r of ctx.query({ tags: ["container"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const o = ctx.getObject(r.id); if (!o?.bounds) continue;
    const sz = o.bounds.size, depth = Math.min(sz.x, sz.z), c = { x: o.bounds.center.x, y: r.feetPosition.y + Math.min(0.5, sz.y / 2), z: o.bounds.center.z };
    let best = null;
    for (const d of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) {
      const h = raycast(ctx, c, { x: d.x, y: 0, z: d.z }, { distance: 9, ignoreEntities: [r.id], physicsOnly: true, bodies: "static" });
      if (!h || String(h.id ?? "").startsWith("player") || ctx.getObject(h.id)?.tags?.includes("container")) continue;
      if (!best || h.distance < best.dist) best = { d, dist: h.distance };
    }
    if (!best) continue;
    const shift = best.dist - (depth / 2 + 0.03);
    o.feetPosition = { x: r.feetPosition.x + best.d.x * shift, y: r.feetPosition.y, z: r.feetPosition.z + best.d.z * shift };
    o.rotation = { yaw: Math.atan2(best.d.x, best.d.z) * 180 / Math.PI };
  }
}

const DRIP2 = `fx
pop drip rate=3 on=disc(.05) life=.6 v=<0,-1,0>*(.2..0.4) size=.025..0.04 acc=grav() floor=die col=<.02,.02,.03> a=1 sz=$size r=sprite(soft-disc,alpha)
pop fume rate=4 on=disc(.5).c(-1.9) life=1.5..2.5 v=up(.15..0.3) size=.2..0.35 acc=curl(.3)+drag(.8) sz=$size*(.6>2) col=<.12,.1,.14> a=0>.2:.25>.7:.1>0 r=sprite(smoke-puff,alpha)`;

function laySludge2(ctx) {
  for (const h of SLUDGE2) {
    ctx.spawn({ tags: ["l2sludge", "sludge"], feetPosition: { x: h.x, y: 0.015, z: h.z }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 1.15, segments: 20 }, material: { color: "oklch(0.08 0.01 280)", roughness: 0.08, metalness: 0.35 } });
    ctx.spawn({ tags: ["l2drip"], feetPosition: { x: h.wx, y: H - 0.25, z: h.wz }, fx: { script: DRIP2 }, audio: { clip: GRIT("water-drip-echo-loop"), gain: 0.2, loop: true, spatial: true, maxDistance: 8 } });
  }
}

function layGraffiti2(ctx) {
  const a = cellCenter(1, ARRIVE.cz);
  // over hallway heading east out of Survivor camp:
  ctx.spawn({ tags: ["l2sign"], feetPosition: { x: a.x + 8.5, y: 2.3, z: a.z }, rotation: { yaw: -90 }, primitive: { kind: "box", width: 1.8, height: 0.5, depth: 0.02 }, material: { color: "oklch(0.24 0.02 120)", roughness: 0.85 },
    ui: '<div face="left" width="1.8m" style="font-size:85px;font-weight:900;color:#d4f0b8;text-align:center;line-height:1.15">◄ OFFICE SPACE EL3A<div style="font-size:55px;color:#a8c880">SURVIVOR SANCTUARY · MEDIC & QUARTER</div></div>' });
  // directional sign along main hallway (cx=6, cz=12):
  const c6 = cellCenter(6, ARRIVE.cz);
  ctx.spawn({ tags: ["l2sign"], feetPosition: { x: c6.x, y: 1.7, z: c6.z - 2.45 }, rotation: { yaw: 0 }, primitive: { kind: "box", width: 1.6, height: 0.35, depth: 0.02 }, material: { color: "oklch(0.22 0.01 240)", roughness: 0.9 },
    ui: '<div face="front" width="1.6m" style="font-size:85px;font-weight:900;color:#e8d890;text-align:center;letter-spacing:4px">◄ SURVIVORS · WEST</div>' });
  // near entrance to Boiler Hall (cx=9, cz=10):
  const c9 = cellCenter(9, 10);
  ctx.spawn({ tags: ["l2sign"], feetPosition: { x: c9.x + 2.45, y: 1.8, z: c9.z }, rotation: { yaw: -90 }, primitive: { kind: "box", width: 1.8, height: 0.45, depth: 0.02 }, material: { color: "oklch(0.25 0.04 40)", roughness: 0.9 },
    ui: '<div face="left" width="1.8m" style="font-size:85px;font-weight:900;color:#ff9848;text-align:center;line-height:1.2">BOILER SECTOR<div style="font-size:55px;color:#ffd090">110°F EXTREME HEAT · SCALD HAZARDS</div></div>' });
  // near Pipe Maze (cx=15, cz=15):
  const c15 = cellCenter(15, 15);
  ctx.spawn({ tags: ["l2sign"], feetPosition: { x: c15.x + 2.45, y: 1.7, z: c15.z }, rotation: { yaw: -90 }, primitive: { kind: "box", width: 2.0, height: 0.45, depth: 0.02 }, material: { color: "oklch(0.25 0.03 20)", roughness: 0.9 },
    ui: '<div face="left" width="2.0m" style="font-size:80px;font-weight:900;color:#ffaa55;text-align:center;line-height:1.15">PIPE MAZE<div style="font-size:52px;color:#eedd88">DO NOT DRINK BLACK RUNOFF · SCALD HAZARDS</div></div>' });
  // stenciled caution on wall next to SEALED door:
  ctx.spawn({ tags: ["l2sign"], feetPosition: { x: SEALED.x - 0.6, y: 0.7, z: SEALED.z }, primitive: { kind: "box", width: 0.02, height: 0.45, depth: 1.6 }, material: { color: "oklch(0.22 0.03 30)" },
    ui: '<div face="left" width="1.6m" style="font-size:75px;font-weight:900;color:#ff6644;text-align:center;line-height:1.15">M.E.G. ADVISORY<div style="font-size:50px;color:#ffa088">LEVEL 3 CLASS 4 HAZARD · UNGROUNDED VOLTAGE</div></div>' });
}
