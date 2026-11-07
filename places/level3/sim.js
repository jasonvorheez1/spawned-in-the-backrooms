// Level 3's referee, "Electrical Station": lays the halls, lamps, hazards and Base Gamma's checkpoint once,
// then runs the station: live boxes that arc, black sludge that burns, generators that overload and blow,
// assembly lines that keep turning out goods, hounds in brigades and deathmoth swarms drawn to light.
import L from "../../scripts/lib/data/level3.yml";
import MEG from "../../scripts/lib/data/meg.yml";
import { N, H, TH, S, HALF, zoneOf, zoneAt, cellCenter, cellAt, openings, hash, ARRIVE, BACK, LIFT, SLUDGE, SPARKS, GENS, LINES, ceilingAt } from "../../scripts/lib/level3.js";
import { spawnAlmond, spawnWeapon } from "../../scripts/lib/loot.js";
import { spawnCrateL3, rollWeaponL3 } from "../../scripts/lib/loot3.js";
import { npcState, dmgAfterArmor } from "../../scripts/lib/stats.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
export const cadence = "250ms";
const GRIT = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// Base Gamma's forward checkpoint: three M.E.G. agents keep the door home open
const GAMMA = {
  "gamma-reyes": { name: "Sgt. Reyes · M.E.G. Base Gamma", role: "scout", voice: "reyes", look: { species: "wolf", sex: "m", topw: "jacket", top: "#7a8a3a", botw: "pants", bottom: "#3a3a32", shoes: "boots", shoec: "#22201c", hat: "cap", hatc: "#4a5a2a", expr: "smile" }, at: [1.2, 3.0], gun: "shotgun" },
  "gamma-pell": { name: "Pell · M.E.G. Quartermaster", role: "quarter", voice: "pell", look: { species: "otter", sex: "f", topw: "jacket", top: "#b8c040", botw: "pants", bottom: "#3a3a3a", shoes: "boots", shoec: "#2a2420", expr: "grin" }, at: [3.0, -3.2], gun: "pistol" },
  "gamma-ito": { name: "Dr. Ito · M.E.G. Medic", role: "medic", voice: "ito", look: { species: "bunny", sex: "f", topw: "longsleeve", top: "#e8e4dc", botw: "skirt", bottom: "#4a4a52", shoes: "boots", shoec: "#2a2420", expr: "smile" }, at: [4.6, 1.6], gun: "wrench" },
};
function agent(ctx, id) {
  const g = GAMMA[id], a = cellCenter(0, ARRIVE.cz);
  ctx.spawn(id, { tags: ["npc"], feetPosition: { x: a.x + g.at[0], y: 0, z: a.z + g.at[1] }, rotation: { yaw: -90 }, physics: "character",
    primitive: { kind: "scripted", script: "scripts/critter2-geo.js", params: g.look }, material: { outline: { color: "#1d1420", width: 2.4 } },
    jiggle: { bones: ["Tail*", "Ear*"], amount: 0.6, bounce: 0.6 }, behavior: "scripts/meg-agent.js", state: { name: g.name, role: g.role, voice: g.voice, ...npcState(ctx, "agent", MEG.hp) } });
  ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, ...weaponBody(g.gun) });
}

const ARC = `fx
pop spark rate=(flick(1.1,1)^10)*320 on=disc(.05) life=.2..0.55 v=<%dir|0,0,1>*(1.5..3)+sdir()*1.8 size=.012..0.03 acc=grav()+drag(.4) floor=bounce(.3) sz=$size col=hdr(4,5,8)>hdr(3,1.6,.4) a=1>0 r=sprite(ember,add,velocity,.03)
pop zap n=1 r=light(<.6,.75,1>,(flick(1.1,1)^10)*18,6)`;
const DRIP = `fx
pop drip rate=3 on=disc(.05) life=.6 v=<0,-1,0>*(.2..0.4) size=.025..0.04 acc=grav() floor=die col=<.02,.02,.03> a=1 sz=$size r=sprite(soft-disc,alpha)
pop fume rate=4 on=disc(.5).c(-1.9) life=1.5..2.5 v=up(.15..0.3) size=.2..0.35 acc=curl(.3)+drag(.8) sz=$size*(.6>2) col=<.12,.1,.14> a=0>.2:.25>.7:.1>0 r=sprite(smoke-puff,alpha)`;
const BLOW = `fx
pop flash burst=1 life=.25 size=3 col=hdr(6,5,4) a=1>0 sz=$size*(1>2) r=sprite(soft-disc,add)
pop spark burst=120 life=.4..1.2 v=sdir()*(3..8)+up(1) size=.015..0.04 acc=grav()+drag(.6) floor=bounce(.3) col=hdr(5,4,2)>hdr(2,.6,.1) a=1>0 sz=$size r=sprite(ember,add,velocity,.04)
pop smoke burst=24 life=2..3.5 v=sdir()*(.5..1.5)+up(.8) size=.5..0.9 acc=buoy(.4)+drag(1.2) sz=$size*(.6>2.6) col=<.15,.14,.13> a=0>.1:.5>.6:.3>0 r=sprite(smoke-puff,alpha)
pop light burst=1 life=.5 r=light(<1,.8,.5>,(1>0)*60,14)`;
const WARN = `fx
pop spark rate=90 on=box(2,.1,1) life=.2..0.5 v=sdir()*(1..2.5)+up(1.2) size=.01..0.025 acc=grav()+drag(.4) col=hdr(4,5,8) a=1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop glow n=1 r=light(<.55,.7,1>,flick(7,.9)*12,8)`;

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if (!s.seeded) {
    s.seeded = true;
    ctx.spawn("l3-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level3-geo.js" }, material: { roughness: 0.9 } });
    // lamps: bare caged bulbs in warm sodium, a cold tube here and there; the blind halls get nothing
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const z = zoneOf(cx, cz), c = cellCenter(cx, cz), r = hash(cx, cz, 201), top = ceilingAt(cx, cz);
      if (z === "dark" || z === "vault" || (z === "gamma" && (cx + cz) % 2)) continue;
      if (z !== "gamma" && z !== "gen" && z !== "line" && r > 0.42) continue;
      const cold = z === "line" || hash(cx, cz, 203) < 0.25, col = z === "gamma" ? "oklch(0.92 0.06 95)" : cold ? "oklch(0.93 0.03 210)" : "oklch(0.82 0.13 62)";
      ctx.spawn({ tags: ["l3lamp"], feetPosition: { x: c.x + (hash(cx, cz, 205) - 0.5), y: top - 0.25, z: c.z + (hash(cx, cz, 207) - 0.5) }, primitive: { kind: "sphere", radius: 0.07 },
        material: { color: col, emissive: col, emissiveIntensity: 3 }, light: { kind: "point", color: col, intensity: z === "tight" ? 3 : 5.5, distance: z === "tight" ? 7 : 11, shadow: { enabled: false } } });
    }
    // the door home, west wall: a green LEVEL 2 plate and a light over it
    ctx.spawn("l3-back", { feetPosition: { x: BACK.x + 0.6, y: 0, z: BACK.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.4, depth: 1.3 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level2" } });
    ctx.spawn({ feetPosition: { x: BACK.x + 0.52, y: 2.6, z: BACK.z }, primitive: { kind: "box", width: 0.02, height: 0.4, depth: 1.2 }, material: { color: "oklch(0.25 0.03 150)" },
      ui: '<div face="right" width="1.2m" style="font-size:110px;font-weight:900;color:#d8f0c0;text-align:center">LEVEL 2</div>' });
    // Base Gamma: a hand-painted plate, a stove, the agents
    const a = cellCenter(1, ARRIVE.cz);
    ctx.spawn({ feetPosition: { x: a.x + 6.2, y: 1.7, z: a.z - 5.6 }, rotation: { yaw: 0 }, primitive: { kind: "box", width: 2.4, height: 0.7, depth: 0.03 }, material: { color: "oklch(0.3 0.03 140)", roughness: 0.9 },
      ui: '<div face="front" width="2.4m" style="font-size:150px;font-weight:900;color:#e8f0d0;text-align:center;line-height:1.1">M.E.G. · GAMMA<div style="font-size:80px;color:#c8d880">checkpoint. no further w/o escort</div></div>' });
    ctx.spawn({ feetPosition: { x: a.x + 2.5, y: 0, z: a.z + 0.5 }, primitive: { kind: "cylinder", radiusTop: 0.25, radiusBottom: 0.3, height: 0.4 }, material: { color: "oklch(0.25 0.01 250)", metalness: 0.6 },
      fx: { script: `fx\npop flame rate=16 on=disc(.12).c(.4) life=.3..0.6 v=up(.7) size=.08..0.14 sz=$size*(1>.2) col=hdr(4,2,.6)>hdr(1.4,.4,.1) a=0>.15:1>.7:.6>0 r=sprite(flame-wisp,add)\npop glow n=1 at=disc(.1).c(.6) r=light(<1,.6,.3>,fire()*6,8)` },
      audio: { clip: GRIT("campfire-crackle-loop"), gain: 0.2, loop: true, spatial: true, maxDistance: 10 } });
    for (const id of Object.keys(GAMMA)) agent(ctx, id);
    // the freight lift east: dead, a sign on its gate
    ctx.spawn({ feetPosition: { x: LIFT.x - 0.5, y: 1.4, z: LIFT.z }, primitive: { kind: "box", width: 0.02, height: 0.5, depth: 1.1 }, material: { color: "oklch(0.6 0.13 80)" },
      ui: '<div face="left" width="1.1m" style="font-size:120px;font-weight:900;color:#1a1410;text-align:center;line-height:1.1">LIFT 4<div style="font-size:70px">no power</div></div>' });
    ctx.spawn({ feetPosition: { x: LIFT.x - 1.2, y: 2.6, z: LIFT.z }, light: { kind: "point", color: "oklch(0.7 0.16 30)", intensity: 2.5, distance: 6 } });
    // hazards: black sludge pooled under leaking pipes; live junction boxes that arc
    for (const h of SLUDGE) {
      ctx.spawn({ tags: ["sludge"], feetPosition: { x: h.x, y: 0.015, z: h.z }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 1.1, segments: 20 }, material: { color: "oklch(0.1 0.01 300)", roughness: 0.05, metalness: 0.3 } });
      ctx.spawn({ feetPosition: { x: h.wx, y: ceilingAt(h.cx, h.cz) - 0.3, z: h.wz }, fx: { script: DRIP }, audio: { clip: GRIT("water-drip-echo-loop"), gain: 0.18, loop: true, spatial: true, maxDistance: 8 } });
    }
    for (const h of SPARKS) {
      const [nx, nz] = D4[h.d];
      ctx.spawn({ tags: ["live-box", "breakable"], feetPosition: { x: h.wx - nx * 0.1, y: 1.2, z: h.wz - nz * 0.1 }, physics: { body: "static", collider: "box" }, state: { mat: "machine", hp: 90, maxHp: 90, name: "Junction box" }, primitive: { kind: "box", width: 0.45, height: 0.6, depth: 0.45 }, material: { color: "oklch(0.55 0.01 240)", metalness: 0.6, roughness: 0.5 },
        fx: { script: ARC, params: { dir: { x: -nx, y: 0.2, z: -nz } } }, audio: { clip: GRIT("electrical-arc-buzz-loop"), gain: 0.3, loop: true, spatial: true, maxDistance: 9 } });
    }
    // generators hum
    for (const g of GENS) ctx.spawn(`l3-gen-${g.i}`, { feetPosition: { x: g.x, y: 1.2, z: g.z }, audio: { clip: GRIT("generator-heavy-hum-loop"), gain: 0.35, loop: true, spatial: true, maxDistance: 16 } });
    for (const l of LINES) ctx.spawn({ feetPosition: { x: (l.x0 + l.x1) / 2, y: 1.2, z: l.z }, audio: { clip: GRIT("factory-conveyor-clank-loop"), gain: 0.3, loop: true, spatial: true, maxDistance: 14 } });
    // supplies: crates in dead ends and rooms, almond water, the odd weapon on the floor
    let crates = 0;
    for (let cx = 5; cx < N && crates < L.crates; cx++) for (let cz = 0; cz < N && crates < L.crates; cz++) {
      const z = zoneOf(cx, cz); if (z === "vault") continue;
      const chance = z === "gen" ? 0.3 : openings(cx, cz).length === 1 ? 0.45 : 0.04;
      if (hash(cx, cz, 301) > chance) continue;
      const c = cellCenter(cx, cz); spawnCrateL3(ctx, { x: c.x + (hash(cx, cz, 303) - 0.5) * 1.2, z: c.z + (hash(cx, cz, 305) - 0.5) * 1.2 }, z === "gen" ? "gen" : "crate"); crates++;
    }
    const open = (cx, cz) => zoneOf(cx, cz) !== "vault" && zoneOf(cx, cz) !== "gamma";
    for (let i = 0, n = 0; n < L.almonds && i < 400; i++) { const cx = 4 + Math.floor(ctx.random() * (N - 4)), cz = Math.floor(ctx.random() * N); if (!open(cx, cz)) continue; const c = cellCenter(cx, cz); spawnAlmond(ctx, { x: c.x + 0.6, z: c.z - 0.5 }); n++; }
    for (let i = 0, n = 0; n < L.floorWeapons && i < 400; i++) { const cx = 6 + Math.floor(ctx.random() * (N - 6)), cz = Math.floor(ctx.random() * N); if (!open(cx, cz)) continue; const c = cellCenter(cx, cz); spawnWeapon(ctx, { x: c.x - 0.6, z: c.z + 0.4 }, rollWeaponL3(ctx)); n++; }
    s.gen = {}; s.line = {}; s.gone = {};
  }

  // ---- the station, every tick
  const players = ctx.place.players;
  if (players.length) {
    s.gen ??= {};
    for (const p of players) {
      const ps = p.state; if (!ps || ps.hp == null || ps.hp <= 0) continue;
      const f = p.feetPosition, dt = 0.25;
      // sludge: it burns through boots and the fumes get in your head
      for (const h of SLUDGE) if (Math.hypot(f.x - h.x, f.z - h.z) < 1.05 && f.y < 0.3) { ps.hp -= dmgAfterArmor(ps.look, L.sludgeHurt * dt); ps.sanity = Math.max(0, (ps.sanity ?? 0) - L.sludgeSanity * dt); if (!p.session?.sl || now - (ps.slAt ?? 0) > 1500) { ps.slAt = now; ctx.emit("playSound", { clip: GRIT("acid-sizzle-hiss"), position: f, volume: 0.5 }, { audience: { player: p.id } }); ctx.emit("screenFlash", { color: "#201028", duration: 0.3, intensity: 0.35 }, { audience: { player: p.id } }); } break; }
      // live boxes arc into whoever brushes past
      for (const h of SPARKS) {
        const [nx, nz] = D4[h.d], bx = h.wx - nx * 0.1, bz = h.wz - nz * 0.1;
        if (Math.hypot(f.x - bx, f.z - bz) < L.sparkReach && now - (ps.zapAt ?? 0) > 2500) {
          ps.zapAt = now; ps.hp -= dmgAfterArmor(ps.look, L.sparkHurt);
          const at = { x: f.x, y: f.y + 1.1, z: f.z };
          ctx.emit("fx", { position: at, script: BLOW.replace("burst=120", "burst=40").replace("size=3", "size=1.2").replace(/pop smoke[^\n]*\n/, "") });
          ctx.emit("playSound", { clip: GRIT("electric-zap-shock"), position: at, volume: 0.9 });
          ctx.emit("damageNumber", { position: at, value: L.sparkHurt, color: "#9cc8ff" });
          ctx.emit("screenShake", { intensity: 0.4, duration: 0.25 }, { audience: { player: p.id } });
          ctx.emit("screenFlash", { color: "#b8d8ff", duration: 0.25, intensity: 0.6 }, { audience: { player: p.id } });
        }
      }
    }
    // generators overload: the hum climbs, sparks fly, then it blows. get out of the room when it warns you
    for (const g of GENS) {
      const k = String(g.i), st = s.gen[k] ?? { next: now + (L.genOverload.every[0] + ctx.random() * (L.genOverload.every[1] - L.genOverload.every[0])) * 1000 };
      if (!s.gen[k]) s.gen = { ...s.gen, [k]: st };
      const near = players.some((p) => Math.hypot(p.feetPosition.x - g.x, p.feetPosition.z - g.z) < 20);
      if (!near) continue;
      if (!st.warn && now > st.next - L.genOverload.warn * 1000) {
        s.gen = { ...s.gen, [k]: { ...st, warn: true } };
        ctx.spawn(`l3-genwarn-${k}`, { feetPosition: { x: g.x, y: 1.6, z: g.z }, fx: { script: WARN }, audio: { clip: GRIT("electrical-overload-whine-rise"), gain: 0.7, loop: false, spatial: true, maxDistance: 22 }, lifetime: L.genOverload.warn + 0.5 });
      } else if (st.warn && now > st.next) {
        const at = { x: g.x, y: 1.4, z: g.z };
        ctx.emit("fx", { position: at, script: BLOW });
        ctx.emit("playSound", { clip: GRIT("transformer-explosion-blast"), position: at, volume: 1, maxDistance: 40 });
        ctx.emit("shockwave", { position: at, speed: 14, thickness: 1.5, intensity: 0.6 });
        for (const p of players) {
          const d = Math.hypot(p.feetPosition.x - g.x, p.feetPosition.z - g.z);
          if (d < 18) ctx.emit("screenShake", { intensity: Math.max(0.15, 1 - d / 18), duration: 0.5 }, { audience: { player: p.id } });
          if (d < L.genOverload.radius && p.state?.hp > 0) { const dmg = Math.round(L.genOverload.hurt * (1 - d / (L.genOverload.radius * 1.4))); p.state.hp -= dmgAfterArmor(p.state.look, dmg); ctx.emit("damageNumber", { position: { ...p.feetPosition, y: p.feetPosition.y + 1.4 }, value: dmg, color: "#ffb060" }); }
        }
        for (const m of ctx.query({ anyTags: ["hound", "moths"], radius: L.genOverload.radius, center: at })) if (!m.state?.dead) m.state.hp -= L.genOverload.hurt; // it takes creatures with it too
        s.gen = { ...s.gen, [k]: { next: now + (L.genOverload.every[0] + ctx.random() * (L.genOverload.every[1] - L.genOverload.every[0])) * 1000 } };
      }
    }
    // assembly lines keep running for nobody: goods drop into the bin at the end
    s.line ??= {};
    for (const l of LINES) {
      const k = String(l.i); if (now - (s.line[k] ?? 0) < L.lineEvery * 1000) continue;
      s.line = { ...s.line, [k]: now };
      const end = { x: l.x1 + 1.3, z: l.z };
      if (ctx.query({ tags: ["container"], radius: 2.5, center: { ...end, y: 0 } }).length >= L.lineMax) continue;
      spawnCrateL3(ctx, { x: end.x + (ctx.random() - 0.5) * 1.4, z: end.z + (ctx.random() - 0.5) * 1.6 }, "line", "Line output box");
      ctx.emit("playSound", { clip: GRIT("machine-press-stamp-thunk"), position: { x: (l.x0 + l.x1) / 2, y: 1, z: l.z }, volume: 0.6, maxDistance: 18 });
    }
  }

  // Base Gamma's agents come back after a while if they fall
  for (const id of Object.keys(GAMMA)) {
    const o = ctx.place.objects[id];
    if (o && !o.state?.dead) { if (s.gone?.[id]) { const g = { ...s.gone }; delete g[id]; s.gone = g; } continue; }
    if (!s.gone?.[id]) s.gone = { ...s.gone, [id]: now };
    else if (now - s.gone[id] > MEG.respawn * 1000) { const g = { ...s.gone }; delete g[id]; s.gone = g; if (o) ctx.destroy(id); agent(ctx, id); }
  }
  // hounds in brigades, deathmoth swarms, kept topped up far from the checkpoint
  if (!s.packMgr) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  const hasMoths = ctx.world.files.includes("templates/deathmoths.js") && ctx.world.files.includes("scripts/deathmoths.js");
  if (hasMoths && !s.mothMgr) s.mothMgr = ctx.spawn({ behavior: "scripts/deathmoths.js" });
  if (now - (s.houndAt ?? 0) > L.entityRespawn * 1000 || !s.houndAt) {
    s.houndAt = now;
    const far = () => { for (let i = 0; i < 50; i++) { const cx = 8 + Math.floor(ctx.random() * (N - 8)), cz = Math.floor(ctx.random() * N), z = zoneOf(cx, cz); if (z !== "vault" && z !== "gamma") return cellCenter(cx, cz); } return cellCenter(N - 2, 2); };
    const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
    for (let i = have, c = far(); i < L.hounds; i++) { if (i % 3 === 0) c = far(); ctx.spawn({ tags: ["hound"], feetPosition: { x: c.x + (i % 3) * 0.8, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", 70, { xp: 50 }) }); }
    if (hasMoths) {
      const mothsHave = ctx.query({ tags: ["moths"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((m) => !m.state?.dead).length;
      for (let i = mothsHave; i < L.moths; i++) { const c = far(); ctx.spawn({ template: "templates/deathmoths.js#swarm", feetPosition: { x: c.x, y: 1.4, z: c.z }, state: { home: { x: c.x, z: c.z } } }); }
    }
  }
}
