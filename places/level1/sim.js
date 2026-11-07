import { npcState } from "../../scripts/lib/stats.js";
import MEG from "../../scripts/lib/data/meg.yml";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
// Level 1's referee: lays the lamps, crates, supplies and thresholds once, then runs the Flickering.
import L from "../../scripts/lib/data/level1.yml";
import { N, H, zoneOf, lampAt, cellCenter, shelfSlots, BACK, ONWARD, ARRIVE, hash, S, HALF, hasPillar } from "../../scripts/lib/level1.js";
import { spawnAlmond, spawnCrateL1 } from "../../scripts/lib/loot.js";
export const cadence = "250ms";
const LAMP_ON = 9;
// the M.E.G. agents are critters like the players: lime hi-vis jackets, the agency's look
const AGENT = {
  "meg-ale": { name: "Ale · M.E.G. Scout", role: "scout", look: { species: "fox", sex: "f", topw: "jacket", top: "#b6e04a", botw: "pants", bottom: "#4a5a3a", shoes: "boots", shoec: "#2a2420", hat: "cap", hatc: "#b6e04a", expr: "smile" } },
  "meg-ortiz": { name: "Dr. Ortiz · M.E.G. Medic", role: "medic", look: { species: "bunny", sex: "f", topw: "jacket", top: "#eef2f0", botw: "pants", bottom: "#4a5a3a", shoes: "boots", shoec: "#2a2420", neck: "scarf", neckc: "#b6e04a", expr: "smile" } },
  "meg-callum": { name: "Callum · Quartermaster", role: "quarter", look: { species: "bear", sex: "m", topw: "jacket", top: "#b6e04a", botw: "pants", bottom: "#4a5a3a", shoes: "boots", shoec: "#2a2420", hat: "beanie", hatc: "#7a3a2a", expr: "grin" } },
};
const AGENTS = [["meg-ale", 2.6, -0.6], ["meg-ortiz", 11.5, -3.6], ["meg-callum", 7.9, -1.6]];
export function agentSpec(a, id, dx, dz) {
  const g = AGENT[id];
  return { tags: ["npc"], feetPosition: { x: a.x + dx, y: 0, z: a.z + dz }, rotation: { yaw: 90 }, physics: "character",
    primitive: { kind: "scripted", script: "scripts/critter-geo.js", params: g.look }, material: { outline: { color: "#1d1420", width: 2.4 } },
    jiggle: { bones: ["Tail*", "Ear*"], amount: 0.6, bounce: 0.6 }, behavior: "scripts/meg-agent.js", state: { name: g.name, role: g.role } };
}
const STOVE = `fx
pop flame rate=26 on=disc(.18) life=.4..0.7 v=up(1.1)+cone(18)*(.2..0.5) size=.14..0.26 acc=curl(.5)+buoy(1.6)+drag(1.5) sz=$size*(.5>1:.25>.12) col=hdr(4,2.6,1)>hdr(2.6,1,.25)>hdr(.5,.1,.03) a=0>.15:1>.7:.8>0 r=sprite(flame-wisp,add)
pop smoke on=@flame?.2 life=1.5..2.5 size=.15..0.25 acc=buoy(.8)+curl(.3)*.4+drag(.8) sz=$size*(.7>2.6) col=<.3,.28,.26> a=0>.2:.25>0 r=sprite(smoke-puff,alpha)
pop glow n=1 r=light(<1,.55,.24>,fire()*6,7)`;

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if (!s.seeded) {
    s.seeded = true;
    ctx.spawn("l1-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level1-geo.js" }, material: { roughness: 0.85, emissiveIntensity: 2 } });
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const k = lampAt(cx, cz); if (!k) continue;
      const c = cellCenter(cx, cz), tube = k === "tube";
      ctx.spawn({ tags: ["l1lamp"], feetPosition: { x: c.x, y: H - (tube ? 0.08 : 0.5), z: c.z }, primitive: tube ? { kind: "box", width: 0.35, height: 0.06, depth: 2.4 } : { kind: "sphere", radius: 0.09 },
        material: { color: "oklch(0.97 0.02 220)", emissive: "oklch(0.95 0.03 220)", emissiveIntensity: 2.2 },
        light: { kind: "point", color: tube ? "oklch(0.95 0.02 220)" : "oklch(0.9 0.08 80)", intensity: tube ? LAMP_ON : 2.5, distance: tube ? 20 : 9, shadow: { enabled: false } } });
    }
    ctx.spawn({ feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/level1-props-geo.js" }, material: { roughness: 0.85 } }); // clutter, camp and guide line
    { const c = cellCenter(ARRIVE.cx, ARRIVE.cz); for (const [dx, dz, col] of [[3.4, 3.4, "oklch(0.85 0.14 70)"], [-5, 0, "oklch(0.85 0.12 80)"], [1, 8.2, "oklch(0.9 0.08 90)"]]) ctx.spawn({ feetPosition: { x: c.x + dx, y: 0.9, z: c.z + dz }, primitive: { kind: "sphere", radius: 0.07 }, material: { color: col, emissive: col, emissiveIntensity: 2 }, light: { kind: "point", color: col, intensity: 4, distance: 11, shadow: { enabled: false } } }); } // camp lanterns
    ctx.spawn({ feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/level1-details-geo.js" }, material: { roughness: 0.85 } }); // beams, sprinkler pipes, wet stains, strip lights
    for (let i = 2; i < N; i += 2) for (let j = 2; j < N; j += 2) { // stencilled grid letters and numbers on the pillars, as in a real car park
      if (!hasPillar(i, j) || hash(i, j, 401) > 0.55) continue;
      const x = i * S - HALF, z = j * S - HALF, letter = String.fromCharCode(65 + ((i / 2 - 1) % 15)) + (j / 2);
      ctx.spawn({ feetPosition: { x, y: 0.5, z: z + 0.465 }, rotation: { yaw: 0 }, primitive: { kind: "box", width: 0.01, height: 0.01, depth: 0.01 }, ui: '<div face="front" width="0.6m" style="font-size:220px;font-weight:800;color:#3a4048;text-align:center;opacity:.8">' + letter + '</div>' });
    }
    // supplies: crates on the racks first, then loose ones; almond water; M.E.G. landmarks near arrival
    let crates = 0;
    for (let cx = 0; cx < N && crates < L.crates; cx++) for (let cz = 0; cz < N && crates < L.crates; cz++) {
      const slots = shelfSlots(cx, cz); if (!slots.length || hash(cx, cz, 91) > 0.7) continue;
      const p = slots[Math.floor(hash(cx, cz, 93) * slots.length)];
      spawnCrateL1(ctx, p); crates++;
    }
    for (let i = 0; i < L.almonds; i++) {
      const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N);
      if (zoneOf(cx, cz) === "corridors" && ctx.random() < 0.7) continue;
      spawnAlmond(ctx, cellCenter(cx, cz));
    }
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
    for (let i = 0; i < 3; i++) spawnAlmond(ctx, { x: a.x + 2 + i * 0.4, z: a.z - 2 });
    ctx.spawn({ id: "meg-cloth", feetPosition: { x: a.x + 2.4, y: 0, z: a.z - 2.6 }, primitive: { kind: "box", width: 1.4, height: 0.02, depth: 0.9 }, material: { color: "oklch(0.85 0.2 125)" },
      ui: '<div face="top" width="1.3m" style="font-size:120px;font-weight:900;color:#1d2a10;text-align:center">M.E.G.</div>' });
    // the thresholds: home to level 0
    ctx.spawn("l1-back", { feetPosition: { x: BACK.x + 0.5, y: 0, z: BACK.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.8, height: 2.4, depth: 2.2 }, visible: false, behavior: "scripts/level-door.js", state: { to: "main" } });
    ctx.spawn({ feetPosition: { x: BACK.x + 0.4, y: 0, z: BACK.z }, light: { kind: "point", color: "oklch(0.85 0.12 92)", intensity: 3, distance: 6 } });
    s.nextFlicker = now + 60000;
  }
  if (!s.l2door) { s.l2door = true; // the pipeworks: a green door in the east wall, down into Level 2
    ctx.spawn("l1-onward", { feetPosition: { x: ONWARD.x - 0.3, y: 0, z: ONWARD.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.8, height: 2.4, depth: 1.6 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level2" } });
    ctx.spawn("l1-onward-door", { feetPosition: { x: ONWARD.x + 0.45, y: 0, z: ONWARD.z }, physics: "static", primitive: { kind: "box", width: 0.12, height: 2.25, depth: 1.25 }, material: { color: "oklch(0.5 0.11 150)", metalness: 0.4, roughness: 0.6 },
      ui: '<div face="left" width="1.1m" style="font-size:150px;font-weight:900;color:#e8f0d0;text-align:center;letter-spacing:8px">LEVEL 2</div>' });
    ctx.spawn({ feetPosition: { x: ONWARD.x - 0.6, y: 2.6, z: ONWARD.z }, light: { kind: "point", color: "oklch(0.8 0.12 150)", intensity: 2.5, distance: 7 } });
  }
  if (!s.megCamp) { s.megCamp = true; // the M.E.G. waypoint: the camp, its fire, its lamps, and three agents
    if (ctx.place.objects["meg-cloth"]) ctx.destroy("meg-cloth");
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
    ctx.spawn("meg-camp", { feetPosition: { x: a.x, y: 0, z: a.z }, physics: { body: "static", collider: "mesh" }, primitive: { kind: "scripted", script: "scripts/meg-camp-geo.js" } });
    ctx.spawn("meg-stove", { feetPosition: { x: a.x + 9.5, y: 0.72, z: a.z - 2.8 }, fx: { script: STOVE }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-small-fire-crackle-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 14 } });
    ctx.spawn("meg-radio", { feetPosition: { x: a.x + 6.9, y: 1, z: a.z - 0.6 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-radio-static-chatter-loop.mp3", gain: 0.12, loop: true, spatial: true, maxDistance: 10 } });
    for (const [dx, dz, col] of [[6, 4.2, "oklch(0.85 0.12 75)"], [6, -4.2, "oklch(0.85 0.12 75)"], [13, 0, "oklch(0.92 0.04 220)"]]) ctx.spawn({ feetPosition: { x: a.x + dx, y: 2.3, z: a.z + dz }, light: { kind: "point", color: col, intensity: 2.5, distance: 9 } });
    for (const [id, dx, dz] of AGENTS) ctx.spawn(id, agentSpec(a, id, dx, dz));
  }
  if (s.megCamp) { // a fallen agent is replaced after a while; the new one holds no grudge
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz), t0 = ctx.now(); s.megGone ??= {};
    for (const [id, dx, dz] of AGENTS) {
      if (ctx.place.objects[id]) { if (s.megGone[id]) delete s.megGone[id]; continue; }
      if (!s.megGone[id]) s.megGone[id] = t0;
      else if (t0 - s.megGone[id] > MEG.respawn * 1000) { delete s.megGone[id]; const sp = agentSpec(a, id, dx, dz); ctx.spawn(id, sp); ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, ...weaponBody("pistol") }); }
    }
  }
  if (!s.puddles) { s.puddles = true;
    for (let i = 0; i < 70; i++) { const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N); if (zoneOf(cx, cz) !== "halls" && zoneOf(cx, cz) !== "storage") continue;
      const c = cellCenter(cx, cz), r = 0.6 + ctx.random() * 1.4;
      ctx.spawn({ tags: ["puddle"], feetPosition: { x: c.x + (ctx.random() - 0.5) * 5, y: 0.012, z: c.z + (ctx.random() - 0.5) * 5 }, rotation: { yaw: ctx.random() * 360, pitch: -90 }, scale: { x: 1, y: 0.5 + ctx.random() * 0.5, z: 1 }, primitive: { kind: "circle", radius: r, segments: 20 }, material: { color: "oklch(0.18 0.01 240 / 0.75)", roughness: 0.05, metalness: 0.3, transparent: true } });
    }
  }
  if (now >= (s.nextClang ?? 0)) { s.nextClang = now + 9000 + ctx.random() * 14000;
    for (const p of ctx.place.players) { const a = ctx.random() * 6.283;
      ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-distant-metal-pipe-clang-echo.mp3", position: { x: p.feetPosition.x + Math.cos(a) * 14, y: H - 0.3, z: p.feetPosition.z + Math.sin(a) * 14 }, volume: 0.5, maxDistance: 40 }, { audience: { player: p.id } }); }
  }
  // the pack: a manager, and hounds kept topped up (more while the lights are out)
  if (!s.packMgr) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  const want = L.hounds + (s.flicker === "dark" ? L.flickerHounds : 0);
  const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
  if (have < want && now >= (s.nextHound ?? 0)) {
    s.nextHound = now + (s.flicker === "dark" ? 1500 : L.entityRespawn * 1000);
    for (let tries = 0; tries < 20; tries++) {
      const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N), z = zoneOf(cx, cz);
      if (z !== "halls" && z !== "storage") continue;
      if (Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) < 4) continue;
      const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["hound"], feetPosition: { x: c.x, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", L.houndHp, { xp: L.xpHound }) });
      break;
    }
  }
  // the skin-stealers: a manager, and a few kept walking the halls
  if (!s.stealMgr) s.stealMgr = ctx.spawn({ behavior: "scripts/stealers.js" });
  const stealers = ctx.query({ tags: ["stealer"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
  if (stealers < L.stealers && now >= (s.nextStealer ?? 0)) {
    s.nextStealer = now + (s.stealersSeeded ? L.entityRespawn * 1000 : 0);
    for (let tries = 0; tries < 20; tries++) {
      const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N);
      if (zoneOf(cx, cz) !== "halls" || Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) < 5) continue;
      const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["stealer"], feetPosition: { x: c.x, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/stealer-geo.js", params: { revealed: false } }, state: npcState(ctx, "stealer", L.stealerHp, { xp: L.xpStealer }) });
      break;
    }
    if (stealers + 1 >= L.stealers) s.stealersSeeded = true;
  }
  // the Flickering: a stutter, then black, then the lights come back
  const lamps = () => ctx.query({ tags: ["l1lamp"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  const set = (on) => { for (const r of lamps()) { const o = ctx.place.objects[r.id]; if (!o) continue; o.light = { ...o.light, intensity: on ? (o.light?.distance > 10 ? LAMP_ON : 2.5) : 0 }; o.material = { ...o.material, emissiveIntensity: on ? 2.2 : 0 }; } };
  if (!s.flicker && now >= s.nextFlicker) { s.flicker = "warn"; s.flickerAt = now; ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-fluorescent-light-flicker-buzz.mp3", volume: 0.5 }, { audience: { place: ctx.place.id } }); }
  if (s.flicker === "warn") { const t = (now - s.flickerAt) / 1000; set(Math.floor(t * 6) % 3 !== 0); if (t > L.flickerWarn) { s.flicker = "dark"; s.flickerAt = now; s.darkFor = (L.flickerLength[0] + ctx.random() * (L.flickerLength[1] - L.flickerLength[0])) * 1000; set(false); } }
  else if (s.flicker === "dark" && now - s.flickerAt > s.darkFor) { s.flicker = null; set(true); afterFlicker(ctx); s.nextFlicker = now + (L.flickerEvery[0] + ctx.random() * (L.flickerEvery[1] - L.flickerEvery[0])) * 1000; }
}

// when the lights come back: the extra hunters slink off, and fresh crates have appeared on the racks (the wiki's "after a Flickering")
function afterFlicker(ctx) {
  const hounds = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead);
  for (const h of hounds.slice(L.hounds)) ctx.destroy(h.id);
  const have = ctx.query({ tags: ["crate"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).length;
  let add = Math.min(8, L.crates - have);
  for (let tries = 0; add > 0 && tries < 200; tries++) {
    const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N), slots = shelfSlots(cx, cz);
    if (!slots.length) continue;
    spawnCrateL1(ctx, slots[Math.floor(ctx.random() * slots.length)]); add--;
  }
}
