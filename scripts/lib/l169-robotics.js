// Level 169: Field Office 7 (Shelly #386655, #386742, #386756, #405130). Three people who SAY they work for Backrooms Robotics
// (no badge, no proof, a door they never open) and the problem they can't hide: their gunslinger units have gone frenzied out in the sand.
// Contract: places/level169/sim.js calls layRobotics(ctx, put, L) once a layout version and roboTick(ctx, L) each second.
// The robots are cat bodies in Backrooms Robotics chassis plating and a gunslinger's hat: kill one, search it, the plating and hat are yours.
// Words and barks: data/dlg-level169.yml (l169-bro-*, l169-bot-*), recorded by art/vo/act.py. Numbers are Savi's picks.
import D from "./data/dlg-level169.yml";
import { setQuest, tellQuest, finishLevelQuest } from "./quests.js";
import LV from "./data/level169.yml";
const T = LV.robots.rules, VARIANTS = LV.robots.variants; // every number and each variant's paint: data/level169.yml robots
const SERIAL = ["BR-0417", "BR-1129", "BR-2203", "BR-0066", "BR-3310", "BR-0981", "BR-7702", "BR-0150"];
const CREW = [
  { n: 1, name: "Desmond Vail", job: "site supervisor", look: { species: "cat", sex: "m", topw: "megjacket" }, at: [-9.2, 0.6], yaw: 90, arm: "fists" },
  { n: 2, name: "Wren Okoye", job: "field technician", look: { species: "cat", sex: "f", topw: "overalls" }, at: [-8.4, -1.2], yaw: 70, arm: "fists" },
  { n: 3, name: "Pruitt", job: "gate", look: { species: "cat", sex: "m", topw: "padjacket" }, at: [-8.2, 3.2], yaw: 110, arm: "revolver" },
];
const Q = { key: "l169bot", id: "faulty-units", name: "Faulty Units" };
const ID = (n) => "l169-bro-" + n;
const near = (a, b, r) => a && b && Math.hypot(a.x - b.x, a.z - b.z) < r;
const mk = (O) => ({ place: "level169", x: O.x, y: 0, z: O.z, label: "Field Office 7" });

export function layRobotics(ctx, put, L) {
  const O = L.robotics, g = (dx, dz, up = 0) => ({ x: O.x + dx, z: O.z + dz, y: { terrain: up } });
  put("l169-bro-outpost", { feetPosition: g(0, 0), primitive: { kind: "scripted", script: "scripts/l169-outpost-geo.js" }, material: { pbr: true }, physics: { body: "static", collider: "mesh" }, castShadow: true, receiveShadow: true, visibleRange: { max: 600 } });
  put("l169-bro-sign", { tags: ["interact"], feetPosition: g(-5.12, 0, 2.35), rotation: { yaw: 90 }, primitive: { kind: "box", width: 2.2, height: 0.42, depth: 0.04 }, material: { color: "oklch(0.25 0.01 250)", metalness: 0.4, roughness: 0.6 },
    state: { prompt: "Read the sign", note: "BACKROOMS ROBOTICS · FIELD OFFICE 7. Somebody stencilled it. Somebody else scratched a question mark after ROBOTICS." },
    ui: `<div face="front" width="2.2m" style="font:800 120px 'Arial Black',sans-serif;color:#f2d24a;letter-spacing:6px;text-align:center;padding:30px 20px 0">BACKROOMS ROBOTICS</div><div face="front" width="2.2m" style="font:600 70px monospace;color:#e8e4d6;text-align:center;padding:170px 0 0">FIELD OFFICE 7 · AUTHORISED ONLY</div>` });
  put("l169-bro-door", { tags: ["interact"], feetPosition: g(-5.2, 0, 0.2), primitive: { kind: "box", width: 0.1, height: 2.1, depth: 1.2 }, visible: false,
    state: { prompt: "Try the door", note: "Locked. A red light on the keypad. Something inside hums, steady, like a fridge the size of a room." } });
  for (const [k, dx, dz] of [["a", -6.6, -5.6], ["b", 6.6, 5.6]]) put("l169-bro-flood-" + k, { feetPosition: g(dx, dz, 4.1), light: { kind: "point", color: "oklch(0.92 0.05 90)", intensity: 2.2, distance: 16 } });
  put("l169-bro-tablelamp", { feetPosition: g(-8.1, 0, 2.1), light: { kind: "point", color: "oklch(0.85 0.1 70)", intensity: 1.2, distance: 6 } });
  put("l169-bro-hum", { feetPosition: g(3.3, 4.5, 1), audio: { clip: "cdn/moodboard-realistic-gritty/sfx-diesel-generator-idling-steady-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 30 } });
  put("l169-bro-locker", { tags: ["usable", "container"], feetPosition: g(4.6, -4.55, 0.2), rotation: { yaw: 0 }, primitive: { kind: "box", width: 0.01, height: 0.01, depth: 0.01 }, visible: false,
    state: { kind: "container", name: "Parts crate", verb: "Search", owner: ID(2), ownerName: "Wren Okoye", items: ["scrap_metal", "scrap_metal", "battery", "almond"] } });
  Promise.all([import("./critter-model.js"), import("./clothes.js"), import("./stats.js")]).then(([{ critterSpec }, { npcLook }, { npcState }]) => {
    for (const c of CREW) {
      if (ctx.getObject(ID(c.n))) continue;
      const p = g(c.at[0], c.at[1]), y = (ctx.place.terrain?.heightAt?.(p.x, p.z) ?? 0) + 0.2;
      ctx.spawn(ID(c.n), { audience: "all", tags: ["npc", "essential", "l169-bro"], feetPosition: { x: p.x, y, z: p.z }, rotation: { yaw: c.yaw }, physics: "character",
        ...critterSpec(npcLook(ID(c.n), c.look, "survivor", 6)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
        state: { ...npcState(ctx, "wanderer", 220), name: c.name + " · \"Backrooms Robotics\"", job: c.job, role: "wanderer", voice: ID(c.n), faction: "brobotics", factionName: "Backrooms Robotics (so they say)", dlg: ID(c.n), essential: true, arm: c.arm,
          home: { x: p.x, z: p.z }, rounds: [{ x: p.x, y, z: p.z, dwell: 30, act: null, look: { x: O.x, z: O.z } }], ri: 0 } });
    }
  });
}

function spawnBot(ctx, id, pos, face) {
  const r = () => ctx.random(); let pick = r() * VARIANTS.reduce((a, b) => a + b.w, 0), V = VARIANTS[0];
  for (const v of VARIANTS) { if ((pick -= v.w) <= 0) { V = v; break; } }
  const serial = SERIAL[Math.floor(r() * SERIAL.length)], who = "l169-bot-" + V.v;
  Promise.all([import("./critter-model.js"), import("./clothes.js"), import("./stats.js"), import("./weapon-look.js")]).then(([{ critterSpec }, { npcLook }, { npcState }, { weaponBody }]) => {
    if (ctx.place.objects[id]) return;
    const look = { species: "cat", sex: V.sex, topw: "robochassis", hat: "cowboy" };
    const dress = { robot: V.enamel, hair: "none", fluff: [], beard: "none", eyew: "none", neck: V.neck, neckc: V.neckc, botw: "pants", bottom: V.bottom, botp: "", shoes: "boots", shoec: "#3a2a1e", shoep: "", tail: "whip", snout: "button", ears: "upright", headS: 1, heightS: 1, buildS: 1 };
    const worn = { ...npcLook(id, look, "frenzied", 8), ...dress }, body = critterSpec(worn);
    ctx.spawn(id, { audience: "all", tags: ["npc", "l169-bot", "l8-hostile", "wretched"], feetPosition: pos, rotation: { yaw: Math.atan2(face.x, face.z) * 180 / Math.PI }, physics: "character",
      ...body, behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { ...(body.state ?? {}), look: worn, ...npcState(ctx, "agent", V.hp), gearLevel: 8, name: `${V.tag} ${serial} · frenzied unit`, role: "survivor", faction: "lightless", factionName: "Backrooms Robotics units, gone frenzied", nerve: "frenzied", arm: V.arm,
        barks: D[who]?.barks, dlg: who, voice: who, variant: V.v, rounds: [{ x: pos.x, y: pos.y, z: pos.z, dwell: 20, act: null, look: { x: pos.x + face.x * 10, z: pos.z + face.z * 10 } }], ri: 0, home: { x: pos.x, z: pos.z } } });
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: V.arm }, ...weaponBody(V.arm) });
    ctx.emit("playSound", { clip: "/cdn/moodboard-toon-vibrant/sfx-cartoon-robot-boot-up-whirr-and-spur-jingle.mp3", position: pos, volume: 0.9, maxDistance: 50 });
  });
}

// a unit walks its post toward the nearest player (meg-agent walks state.rounds), so it closes inside sight (meg.yml sight) and the fight starts; rewritten only when the player moved T.stalk m
function stalk(o, ps) {
  if (!ps.length || o.state?.follow) return;
  const f = o.feetPosition; let p = null, bd = Infinity;
  for (const q of ps) { if (q.state?.dead) continue; const d = Math.hypot(q.feetPosition.x - f.x, q.feetPosition.z - f.z); if (d < bd) { bd = d; p = q; } }
  if (!p) return;
  const r = o.state.rounds?.[0], at = p.feetPosition;
  if (r && Math.hypot(r.x - at.x, r.z - at.z) < T.stalk) return;
  o.state.rounds = [{ x: at.x, y: at.y, z: at.z, dwell: 600, act: null, look: { x: at.x, z: at.z } }]; o.state.ri = 0;
}

function quest(ctx, L) {
  const O = L.robotics;
  for (const p of ctx.place.players) {
    const s = p.state; if (!s) continue; const q = s[Q.key] ?? 0;
    if (!q && s.talkWith === ID(1)) { s[Q.key] = 1; s.l169botK = 0; setQuest(s, Q.id, { name: Q.name, step: `Put down frenzied Backrooms Robotics units in the open desert (0/${T.need})`, mark: mk(O) }); tellQuest(ctx, p, "New quest: Faulty Units"); }
    else if (q === 1 && (s.l169botK ?? 0) >= T.need) { s[Q.key] = 2; setQuest(s, Q.id, { name: Q.name, step: "Go back to Desmond Vail at Field Office 7", mark: mk(O) }); tellQuest(ctx, p, `Faulty Units · ${T.need} units down. Desmond will want to hear it.`); }
    else if (q === 2 && s.talkWith === ID(1)) finishLevelQuest(ctx, p, Q.key, Q, { xp: T.xp, cents: T.cents, items: [], by: "survivors", text: "Quest Completed: Faulty Units" });
  }
}

export function roboTick(ctx, L) {
  const s = ctx.place.state, now = ctx.now(), O = L.robotics; if (!O) return;
  if (!ctx.getObject(ID(1))) layRobotics(ctx, (id, spec) => { if (ctx.getObject(id)) ctx.destroy(id); return ctx.spawn(id, spec); }, L);
  for (const c of CREW) { const o = ctx.getObject(ID(c.n)); if (o?.state) { if (o.state.dead) o.state.dead = false; if ((o.state.hp ?? 1) < (o.state.maxHp ?? 1)) o.state.hp = o.state.maxHp; } } // essential
  const ps = ctx.place.players.filter((p) => p.feetPosition), bots = ctx.query({ tags: ["l169-bot"], radius: 1e6, center: { x: 0, y: 0, z: 0 } });
  let living = 0;
  for (const b of bots) {
    const o = ctx.getObject(b.id); if (!o) continue;
    const d = Math.min(Infinity, ...ps.map((p) => Math.hypot(p.feetPosition.x - b.feetPosition.x, p.feetPosition.z - b.feetPosition.z)));
    const dead = o.state?.dead || (o.state?.hp ?? 1) <= 0;
    if (dead) {
      if (!o.state.credited) { o.state.credited = true; o.state.diedAt = now; for (const p of ps) if (p.state?.[Q.key] === 1 && near(p.feetPosition, b.feetPosition, T.credit)) { p.state.l169botK = (p.state.l169botK ?? 0) + 1; setQuest(p.state, Q.id, { name: Q.name, step: `Put down frenzied Backrooms Robotics units in the open desert (${Math.min(T.need, p.state.l169botK)}/${T.need})`, mark: mk(O) }); } }
      if (now - (o.state.diedAt ?? now) > T.returnMs || d > 200) ctx.destroy(b.id);
    } else if (d > T.far) ctx.destroy(b.id); else { living++; stalk(o, ps); }
  }
  quest(ctx, L);
  if (!ps.length) return;
  if (s.botNext == null) { s.botNext = now + T.first; return; }
  if (now < s.botNext || living >= T.maxAlive) return;
  const hunting = ps.some((p) => p.state?.[Q.key] === 1);
  s.botNext = now + (hunting ? T.questEvery : T.every) + ctx.random() * T.jitter;
  const safe = (x, z) => !near({ x, z }, L.house.center, 70) && !near({ x, z }, L.well, 45) && !near({ x, z }, O, 28);
  const pool = ps.filter((p) => !p.state?.dead && safe(p.feetPosition.x, p.feetPosition.z) && p.feetPosition.y > -5);
  if (!pool.length) { s.botNext = now + 10000; return; }
  const p = pool[Math.floor(ctx.random() * pool.length)];
  for (let tries = 0; tries < 6; tries++) {
    const a = ctx.random() * Math.PI * 2, rr = T.minR + ctx.random() * (T.maxR - T.minR), x = p.feetPosition.x + Math.cos(a) * rr, z = p.feetPosition.z + Math.sin(a) * rr;
    if (!safe(x, z)) continue;
    const face = { x: -Math.cos(a), z: -Math.sin(a) }, side = { x: -face.z, z: face.x }, n = Math.min(T.maxAlive - living, 1 + Math.floor(ctx.random() * T.packMax));
    s.botSeq = (s.botSeq ?? 0) + 1;
    for (let i = 0; i < n; i++) { const bx = x + side.x * i * 1.6, bz = z + side.z * i * 1.6, y = (ctx.place.terrain?.heightAt?.(bx, bz) ?? p.feetPosition.y) + 0.15; spawnBot(ctx, `l169bot-${s.botSeq}-${i}`, { x: bx, y, z: bz }, face); }
    return;
  }
  s.botNext = now + 10000;
}
