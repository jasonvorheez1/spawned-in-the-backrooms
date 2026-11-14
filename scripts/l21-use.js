// Level 2.1 "Locked": interactive set-pieces (Saltine stockpile, freezer-coil water collector, Base Alef lockout terminal, Exploration Wing forbidden berries,
// John Banks's blasting plunger, Quartermaster errand board) and the Smilers that prowl The Edges (places/level21/sim.js).
import { heard } from "./lib/hear.js";
import { vo } from "./lib/voices.js";
import { raycast } from "builtin/physics";
import L from "./lib/data/level21.yml";
import { N, EDGE_X, LANE, cellAt, cellCenter, openings, isEdge } from "./lib/level21.js";
import { stepToward } from "./lib/maze21path.js";
import { npcState, npcMul, dmgAfterArmor } from "./lib/stats.js";
import { setEdgesStep } from "./lib/level21-quests.js";
import { addRep, repOf } from "./lib/rep.js";
import { errandStep, errandDone } from "./lib/quests.js";

export const updateSchedule = { every: { seconds: 0.1 } };

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const H = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;

const GOKNAR = [
  "Stop at the line. Hands. Okay.",
  "Edges are past the dead tubes. Fresh batteries or don't bother.",
  "Teeth in the dark and nothing else? Don't run. Light on it. Back up slow."
];
const NED = [
  "Saltines on the table. Take some. Take more. Please.",
  "Freezer coils sweat clean water. Cup's on the hook.",
  "Errand board's by the door. Copper wire, mostly. Always copper wire."
];

const ALEF_LOGS = [
  "ALEF LOG [11 JUL 2020 · 03:18]: \"Wilson here. A solid steel shutter just dropped across the Level 2 stairwell. Blowtorches barely scratch it. All 53 of us are sealed in.\"",
  "ALEF LOG [14 JUL 2020 · 19:04]: \"Rations are down to quarter-shares. The heat from the lower pipes is 98°F and there's no running water in the halls. People are eyeing the specimen berries in Exploration.\"",
  "ALEF LOG [19 JUL 2020 · 11:42]: \"Connor found a room north of the checkered lockers. Banks of humming refrigerators packed floor-to-ceiling with Saltines. He calls it 'Refrigerator Paradise'. Half the base is moving there.\"",
  "ALEF LOG [27 JUL 2020 · 22:15]: \"John Banks took six sticks of dynamite and a plunger box east into The Edges. He thinks the concrete roof is only five meters thick. If he blows a hole, maybe we reach the surface.\"",
  "ALEF LOG [02 AUG 2020 · 04:50]: \"Banks's blast only brought down rock and woke the Smilers in the east caverns. But the last survey team found a cold karst fissure at the far end of the lane. It leads down to Level 8.\"",
];

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, w = who.state, pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, cool = (s.cool ??= {});
    const snd = (n, v = 0.6) => heard(ctx, { clip: G(n), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: v, maxDistance: 14 });

    if (s.kind === "saltines") {
      if (now - (cool[uid] ?? -1e9) < 40000) {
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.1, z: pos.z }, text: "MOUTH DRY", color: "#e8b060", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      cool[uid] = now;
      snd("container-open-rustle", 0.6);
      w.hunger = Math.min(100, (w.hunger ?? 100) + 38);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 8);
      w.thirst = Math.max(5, (w.thirst ?? 100) - 4);
      w.payout = { xp: 0, items: ["bar"] };
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.5, z: pos.z }, text: "+38 HUNGER", color: "#60f090", size: 1.1 }, { audience: { player: who.id } });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+8 SANITY", color: "#80ffaa", size: 0.9 }, { audience: { player: who.id } });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 0.9, z: pos.z }, text: "+RATION BAR", color: "#f2d870", size: 1.0 }, { audience: { player: who.id } });
      return;
    }

    if (s.kind === "cooler") {
      if (now - (cool[uid] ?? -1e9) < 30000) {
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.1, z: pos.z }, text: "REFILLING JUG...", color: "#60b0e0", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      cool[uid] = now;
      snd("water-pour-splash-short", 0.65);
      w.thirst = Math.min(100, (w.thirst ?? 100) + 42);
      w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 80) + 10);
      ctx.emit("flash", { target: who.id, color: "#40d8ff", duration: 0.35 });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.4, z: pos.z }, text: "+42 THIRST", color: "#50d0ff", size: 1.1 }, { audience: { player: who.id } });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.1, z: pos.z }, text: "+10 HP", color: "#ff8080", size: 0.9 }, { audience: { player: who.id } });
      return;
    }

    if (s.kind === "comms") {
      heard(ctx, { clip: G("old-computer-boot-startup-chime"), position: pos, volume: 0.65, maxDistance: 12 });
      heard(ctx, { clip: G("walkie-talkie-radio-click-static-burst"), position: pos, volume: 0.45, maxDistance: 8 });
      const n = (s.said ??= {})[uid] = ((s.said ?? {})[uid] ?? -1) + 1;
      const log = ALEF_LOGS[n % ALEF_LOGS.length];
      const header = log.match(/ALEF LOG \[[^\]]+\]/)?.[0] ?? "ALEF LOG";
      const body = log.replace(/^ALEF LOG \[[^\]]+\]:\s*"/, '').replace(/"$/, '');
      // Show, don't tell: physically update the CRT terminal screen UI in 3D space
      ctx.self.ui = `<div face="front" width="0.9m" style="font-family:monospace;color:#7aff9a;font-size:24px;text-align:left;line-height:1.2;padding:10px;background:rgba(2,18,5,0.92);border:2px solid #3fa860"><div style="font-size:26px;color:#afffca;border-bottom:1px solid #3fa860;margin-bottom:6px;font-weight:bold">${header}</div>${body}</div>`;
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 0.6, z: pos.z }, text: `LOG #${n % ALEF_LOGS.length + 1} READ`, color: "#7aff9a", size: 0.9 }, { audience: { player: who.id } });
      return;
    }

    if (s.kind === "berries") {
      if (now - (cool[uid] ?? -1e9) < 60000) {
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "JAR EMPTY", color: "#e88090", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      cool[uid] = now;
      snd("water-pour-splash-short", 0.45);
      if (ctx.random() < 0.65) {
        // Show, don't tell: sweet juice rush with crimson/cyan pulse and rising chord chime
        w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 80) + 40);
        w.hunger = Math.min(100, (w.hunger ?? 80) + 40);
        w.thirst = Math.min(100, (w.thirst ?? 80) + 40);
        w.sanity = Math.min(100, (w.sanity ?? 80) + 10);
        w.payout = { xp: 0, items: ["almond"] };
        ctx.emit("screenFlash", { color: "#ff2060", duration: 0.6, intensity: 0.7 }, { audience: { player: who.id } });
        heard(ctx, { clip: G("level-up-jingle-retro-terminal-chime-rising-three-notes"), position: pos, volume: 0.75, maxDistance: 12 });
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.7, z: pos.z }, text: "+40 HP & RESTORE", color: "#60ff90", size: 1.2 }, { audience: { player: who.id } });
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.4, z: pos.z }, text: "+ALMOND WATER", color: "#60d0ff", size: 1.0 }, { audience: { player: who.id } });
      } else {
        // Show, don't tell: toxic hallucinogenic distortion with purple screen warping, camera punch, and whispers
        w.sanity = Math.max(5, (w.sanity ?? 80) - 12);
        w.payout = { xp: 0, items: ["battery", "bandage"] };
        ctx.emit("screenFlash", { color: "#8010c0", duration: 1.2, intensity: 0.8 }, { audience: { player: who.id } });
        ctx.emit("cameraPunch", { direction: { x: 0.35, y: -0.2, z: 0.25 }, intensity: 0.45 }, { audience: { player: who.id } });
        heard(ctx, { clip: G("low-whisper-breath-swell-unsettling"), position: pos, volume: 0.85, maxDistance: 14 }, { audience: { player: who.id } });
        heard(ctx, { clip: G("static-burst-glitch-threshold"), position: pos, volume: 0.6, maxDistance: 12 });
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.5, z: pos.z }, text: "-12 SANITY", color: "#c060ff", size: 1.1 }, { audience: { player: who.id } });
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+BATTERY & BANDAGE", color: "#f2d870", size: 1.0 }, { audience: { player: who.id } });
      }
      return;
    }

    if (s.kind === "blaster") {
      if (now - (cool[uid] ?? -1e9) < 55000) {
        snd("locked-trunk-latch-rattle", 0.5);
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.1, z: pos.z }, text: "PLUNGER LOCKED", color: "#e89050", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      cool[uid] = now;
      // Show, don't tell: heavy detonation rumble on the ceiling, sparks flash, camera shake and rock clatter
      heard(ctx, { clip: G("wrist-device-lower-click-crt-power-off"), position: pos, volume: 0.8, maxDistance: 16 });
      heard(ctx, { clip: G("deep-rock-rumble-from-far-underground"), position: { x: pos.x, y: pos.y + 3, z: pos.z }, volume: 0.9, maxDistance: 40 });
      heard(ctx, { clip: G("heavy-wooden-object-smash-impact-thud"), position: pos, volume: 0.75, maxDistance: 24 });
      ctx.emit("flash", { target: who.id, color: "#ffe080", duration: 0.2 });
      ctx.emit("screenShake", { intensity: 0.4, duration: 0.6 }, { audience: { player: who.id } });
      ctx.emit("cameraPunch", { direction: { x: 0, y: -0.3, z: 0.2 }, intensity: 0.4 }, { audience: { player: who.id } });
      const pick = ["ammo", "shells", "battery", "kit"][Math.floor(ctx.random() * 4)];
      w.payout = { xp: 0, items: [pick, "bandage"] };
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.3, z: pos.z }, text: `+${pick.toUpperCase()} & BANDAGE`, color: "#f2d870", size: 1.1 }, { audience: { player: who.id } });
      return;
    }

    if (s.kind === "board") {
      if (repOf(w, "survivors") <= -35) { ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "THE BOARD IGNORES YOU (SURVIVORS HATE YOU)", color: "#e06050", size: 0.9 }, { audience: { player: who.id } }); return; }
      const Q = [
        { name: "Wire for the Compressors", need: { wire: 3 }, xp: 65, items: ["almond", "battery", "cash:1500"], text: "Ned needs 3 spools of copper wire to keep Refrigerator Paradise's freezers running." },
        { name: "Steel for the Shutter Watch", need: { metal: 4 }, xp: 80, items: ["ammo", "bandage", "cash:2000"], text: "Goknar wants 4 scrap metal to reinforce the doors against the hounds." },
        { name: "Tape for the Steam Leaks", need: { tape: 3 }, xp: 70, items: ["almond", "almond", "cash:1800"], text: "Three rolls of duct tape to seal the scalding steam pipes in the halls." },
        { name: "Relays for Base Alef", need: { electronics: 2 }, xp: 95, items: ["firstaid", "shells", "cash:2800"], text: "Two electronics modules to keep Base Alef's emergency beacons alive." },
        { name: "Scout The Edges", need: null, xp: 140, items: ["firstaid", "ammo", "cash:4500"], text: "Venture past the white block rooms deep into The Edges (toward the Level 8 cave mouth) and report back." },
      ];
      const lap = Math.floor((w.l21q ?? 0) / Q.length), qi = (w.l21q ?? 0) % Q.length, q = Q[qi];
      if (!q.need && lap > 0) {
        w.l21q = (w.l21q ?? 0) + 1;
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "ALREADY LOGGED", color: "#e8c070", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      const mul = 1 + lap, need = q.need ? Object.fromEntries(Object.entries(q.need).map(([k, n]) => [k, n * mul])) : null, sc = w.scrap ?? {};
      const NAME = { wire: "copper wire", metal: "scrap metal", tape: "duct tape", electronics: "electronics" };
      const have = need ? Object.entries(need).every(([k, n]) => (sc[k] ?? 0) >= n) : (w.l21Scouted ?? 0) >= 1;
      if (!have) {
        const list = need ? Object.entries(need).map(([k, n]) => `${sc[k] ?? 0}/${n} ${NAME[k]}`).join(", ") : "explore further east";
        errandStep(w, "l21-" + q.name, q.name, need // the board's job in the journal, as an errand (scripts/lib/quests.js)
          ? `${q.text} Bring ${Object.entries(need).map(([k, n]) => `${n} ${NAME[k]}`).join(" and ")} back to the quartermaster's errand board in Refrigerator Paradise.`
          : `${q.text} Then press the quartermaster's errand board in Refrigerator Paradise.`, { place: "level21", id: ctx.self.id });
        ctx.self.ui = `<div face="front" width="1.4m" style="font-family:Arial,sans-serif;font-weight:900;color:#e8e0c0;text-align:center;background:#181814;padding:8px;border:2px solid #8b7355"><div style="font-size:46px;color:#f2d870;border-bottom:1px solid #8b7355;margin-bottom:6px">ERRAND: ${q.name.toUpperCase()}</div><div style="font-size:32px;color:#ffffff;margin-bottom:4px">REQUIRED: ${list.toUpperCase()}</div><div style="font-size:24px;color:#a8d8c8">SEE NED IN REFRIGERATOR PARADISE</div></div>`;
        snd("container-open-rustle", 0.5);
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: `ERRAND: ${q.name.toUpperCase()} (${list.toUpperCase()})`, color: "#f2d870", size: 1.15 }, { audience: { player: who.id } });
        return;
      }
      if (need) { const left = { ...sc }; for (const [k, n] of Object.entries(need)) left[k] = (left[k] ?? 0) - n; w.scrap = left; }
      w.l21q = (w.l21q ?? 0) + 1; snd("pickup-ammo", 0.65);
      const xp = Math.round(q.xp * (1 + lap * 0.5));
      const sv = repOf(w, "survivors"), bonus = sv >= 35 ? 0.25 : sv >= 12 ? 0.1 : 0; // friends of the camp are paid better, as in every level
      const items = q.items.map((it) => (bonus && String(it).startsWith("cash:") ? `cash:${Math.round(Number(String(it).slice(5)) * (1 + bonus))}` : it));
      const tier = addRep(w, "survivors", 2);
      w.payout = { xp, items, text: `ERRAND DONE: ${q.name}${bonus ? " · Survivors bonus" : ""}${tier ? ` · ${tier}` : " · Survivors +2"}` };
      errandDone(w, "l21-" + q.name, q.name, `Done for the quartermaster's board in Refrigerator Paradise. Paid ${xp} XP, cash and supplies.`);
      const line = "That'll do it. Freezers stay cold another week.";
      heard(ctx, { clip: vo("l21-ned", line), position: pos, volume: 0.9, maxDistance: 16 });
      ctx.self.ui = `<div face="front" width="1.4m" style="font-family:Arial,sans-serif;font-weight:900;color:#e8e0c0;text-align:center;background:#181814;padding:8px;border:2px solid #3fa860"><div style="font-size:46px;color:#7aff9a;border-bottom:1px solid #3fa860;margin-bottom:6px">ERRAND COMPLETED!</div><div style="font-size:32px;color:#ffffff;margin-bottom:4px">${q.name.toUpperCase()} (+${xp} XP)</div><div style="font-size:24px;color:#a8d8c8">BOUNTY PAID IN CASH &amp; SUPPLIES</div></div>`;
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.5, z: pos.z }, text: `+${xp} XP`, color: "#ffd700", size: 1.3 }, { audience: { player: who.id } });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.1, z: pos.z }, text: `ERRAND DONE: ${q.name.toUpperCase()}`, color: "#80ffaa", size: 1.0 }, { audience: { player: who.id } });
      return;
    }

    if (s.kind === "goknar") {
      const n = (s.said ??= {})[uid] = ((s.said ?? {})[uid] ?? -1) + 1;
      const line = GOKNAR[n % GOKNAR.length];
      heard(ctx, { clip: vo("l21-goknar", line), position: pos, volume: 1.0, maxDistance: 14 });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.9, z: pos.z }, text: `"${line}"`, color: "#7aff9a", size: 1.05 });
      return;
    }

    if (s.kind === "ned") {
      const n = (s.said ??= {})[uid] = ((s.said ?? {})[uid] ?? -1) + 1;
      const line = NED[n % NED.length];
      heard(ctx, { clip: vo("l21-ned", line), position: pos, volume: 1.0, maxDistance: 14 });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.9, z: pos.z }, text: `"${line}"`, color: "#ffd460", size: 1.05 });
      return;
    }
  },
};

// ---- The Smilers of The Edges (scripts/lib/data/level21.yml smilers: 3)
const SMILER_MODEL = { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" };
const CLIP = {
  idle: "cdn/clip-crouch-idle-loop.glb",
  skitter: "cdn/clip-crouch-walk-loop.glb",
  freeze: "cdn/clip-block-loop.glb",
  "lunge-bite": "cdn/clip-attack.glb",
  recoil: "cdn/clip-hit-react.glb",
  death: "cdn/clip-die.glb",
};
const POOF = `fx
pop shade burst=22..30 life=.8..1.4 on=box(.8,.5,1.2).c(.3) v=sdir()*(.4..1.2)+up(.6) size=.3..0.6 acc=buoy(.6)+curl(.6)+drag(1.2) col=<.04,.03,.06> a=0>.5:.6>0 sz=$size*(.6>1.6) rot=spin(.4) r=sprite(smoke-puff,alpha)`;

function hasSight(ctx, a, b, idA, idB) {
  const dx = b.x - a.x, dy = (b.y ?? 0) - (a.y ?? 0), dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d > 16) return false;
  const l = Math.hypot(dx, dy, dz) || 1;
  return !raycast(ctx, { x: a.x, y: (a.y ?? 0) + 1.1, z: a.z }, { x: dx / l, y: dy / l, z: dz / l }, { distance: l, physicsOnly: true, bodies: "static", ignoreEntities: [idA, idB] });
}

function spawnEdgeSmiler(ctx, idx) {
  let cx = 0, cz = 0;
  for (let t = 0; t < 20; t++) { // an open floor cell, never inside rock (a body spawned in rock falls out and lands at the arrival)
    cx = EDGE_X + 1 + Math.floor(ctx.random() * (N - EDGE_X - 2)); cz = Math.floor(ctx.random() * N);
    if (openings(cx, cz).length) break;
  }
  const c = cellCenter(cx, cz);
  const glowMat = { color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 4.5 };
  return ctx.spawn(`l21-smiler-${idx}-${Math.floor(ctx.now() / 1000) % 100000}`, {
    tags: ["l21-smiler", "smiler"], feetPosition: { x: c.x, y: 0.4, z: c.z }, rotation: { yaw: ctx.random() * 360 },
    scale: 1.6, model: SMILER_MODEL, physics: { body: "character" },
    state: { ...npcState(ctx, "smiler", 75, { xp: 45 }), name: "Smiler (The Edges)" },
    children: [
      { feetPosition: { x: -0.09, y: 0.92, z: -0.22 }, primitive: { kind: "sphere", radius: 0.032 }, material: glowMat },
      { feetPosition: { x: 0.09, y: 0.92, z: -0.22 }, primitive: { kind: "sphere", radius: 0.032 }, material: glowMat },
      { feetPosition: { x: 0, y: 0.82, z: -0.23 }, primitive: { kind: "torus", radius: 0.11, tube: 0.018, arc: 3.14 }, rotation: { roll: 180 }, material: glowMat },
    ],
  });
}

export function update(ctx, dt) {
  if (ctx.self.id !== "l21-life") return;
  if (!ctx.place.players.length) { ctx.sleep(2); return; } // nobody in this level: rest
  const now = ctx.now(), mem = (ctx.self.session.m ??= { respawnAt: 0 });
  const players = ctx.place.players.filter((p) => (p.state?.hp ?? 1) > 0 && !(p.state?.downAt && now - p.state.downAt < 4500));

  // Show, don't tell: discovery chime and golden floating badge when entering deep uncharted caves
  for (const p of players) {
    const { cx } = cellAt(p.feetPosition.x, p.feetPosition.z);
    if (cx >= EDGE_X + 4 && !p.state.l21Scouted) {
      p.state.l21Scouted = 1;
      heard(ctx, { clip: G("eerie-low-chime-level-up"), position: p.feetPosition, volume: 0.85, maxDistance: 20 }, { audience: { player: p.id } });
      ctx.emit("damageNumber", { position: { x: p.feetPosition.x, y: p.feetPosition.y + 1.8, z: p.feetPosition.z }, text: "THE EDGES: SCOUTED", color: "#ffd700", size: 1.3 }, { audience: { player: p.id } });
      if ((p.state.edgesQ ?? 0) >= 1 && (p.state.edgesQ ?? 0) < 3) {
        setEdgesStep(ctx, p, 3, "The Edges threshold scouted! Report the status back to Goknar at the doorway post.");
      }
    }
  }

  // Keep L.smilers active inside The Edges (cx >= EDGE_X)
  const all = ctx.query({ tags: ["l21-smiler"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  const live = all.filter((w) => !w.state?.dead && (w.state?.hp ?? 1) > 0);
  if (now > mem.respawnAt && live.length < (L.smilers ?? 3)) {
    mem.respawnAt = now + 45000;
    for (let i = live.length; i < (L.smilers ?? 3); i++) spawnEdgeSmiler(ctx, i);
  }

  for (const w of all) {
    const m = (mem[w.id] ??= {}), st = w.state ?? {}, pos = w.feetPosition, mu = npcMul(st);
    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!m.dieAt) {
        m.dieAt = now; w.velocity = { x: 0, y: -1, z: 0 };
        w.anim.act = { clip: CLIP.death, loop: "once", blend: "override", weight: 4, clampWhenFinished: true };
        heard(ctx, { clip: H("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 30 });
      } else if (!m.gone && now - m.dieAt > 1700) {
        m.gone = true;
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF });
        ctx.destroy(w.id);
      }
      continue;
    }

    // Acquire target in The Edges (or players holding a flashlight near The Edges)
    if (now >= (m.look ?? 0)) {
      m.look = now + 350 + ctx.random() * 200;
      let best = null, bd = Infinity;
      for (const p of players) {
        const pp = p.feetPosition, pc = cellAt(pp.x, pp.z);
        if (pc.cx < EDGE_X - 2) continue; // Smilers stay in and around The Edges
        const d = Math.hypot(pp.x - pos.x, pp.z - pos.z);
        const range = p.state?.light ? 16 : 11;
        if (d < range && d < bd && hasSight(ctx, pos, pp, w.id, p.id)) { best = p; bd = d; }
      }
      if (best && !m.prey) heard(ctx, { clip: H("smiler-wet-giggle-hiss-stalking"), position: pos, volume: 0.9, maxDistance: 28 });
      m.prey = best?.id ?? null;
    }

    const prey = m.prey ? players.find((p) => p.id === m.prey) : null;
    let goal = null, speed = 1.35, frozen = false;
    if (prey) {
      goal = prey.feetPosition;
      const pd = Math.hypot(goal.x - pos.x, goal.z - pos.z);
      const yaw = prey.camera?.rotation?.yaw;
      if (yaw != null) {
        const r = (yaw * Math.PI) / 180, fx = -Math.sin(r), fz = -Math.cos(r);
        const tx = pos.x - goal.x, tz = pos.z - goal.z, tl = Math.hypot(tx, tz) || 1;
        const staring = (fx * tx + fz * tz) / tl > 0.82;
        if (staring && prey.state?.light && pd < 13) {
          frozen = true; speed = 0;
          if (!m.lit) { m.lit = true; w.anim.act = { clip: CLIP.recoil, loop: "once", blend: "override", weight: 4 }; heard(ctx, { clip: H("smiler-light-flinch-shriek"), position: pos, volume: 0.8, maxDistance: 22 }); }
        } else {
          m.lit = false;
          speed = staring ? 1.6 : pd < 9 ? 5.6 : 3.6;
        }
      }
      if (!frozen && pd < 1.65 && now > (m.biteAt ?? 0)) {
        m.biteAt = now + 1700;
        w.anim.act = { clip: CLIP["lunge-bite"], loop: "once", blend: "override", weight: 4 };
        heard(ctx, { clip: H("smiler-lunge-snap-shriek"), position: pos, volume: 1, maxDistance: 25 });
        const dmg = Math.max(1, Math.round(dmgAfterArmor(prey.state.look, 20 * mu.dmg)));
        prey.state.hp -= dmg;
        prey.state.sanity = Math.max(0, (prey.state.sanity ?? 80) - 9);
        ctx.emit("damageNumber", { position: { x: goal.x, y: goal.y + 1.3, z: goal.z }, value: dmg, color: "#ff3830" });
        ctx.emit("screenShake", { intensity: 0.45, duration: 0.28 }, { audience: { player: prey.id } });
      }
    } else {
      if (!m.roam || now > (m.roamUntil ?? 0) || Math.hypot(pos.x - m.roam.x, pos.z - m.roam.z) < 0.6) {
        const rx = EDGE_X + Math.floor(ctx.random() * (N - EDGE_X));
        const rz = Math.floor(ctx.random() * N);
        m.roam = cellCenter(rx, rz);
        m.roamUntil = now + 6000;
      }
      goal = m.roam;
    }

    if (frozen) {
      if (m.mode !== "freeze") { m.mode = "freeze"; w.anim.body = { clip: CLIP.freeze, loop: "loop", speed: 0.6 }; }
      w.velocity = { x: 0, y: (w.velocity?.y ?? 0) - 20 * dt, z: 0 };
      continue;
    }

    const sight = prey && hasSight(ctx, pos, prey.feetPosition, w.id, prey.id);
    const way = !sight && goal ? stepToward(pos.x, pos.z, goal.x, goal.z, 25) : null;
    const tgt = way && way.cells > 0 ? way.next : goal;
    const dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz) || 1;
    let vx = (dx / d) * speed, vz = (dz / d) * speed;
    if (cellAt(pos.x + vx * 0.4, pos.z + vz * 0.4).cx < EDGE_X - 1) { vx = 0; vz = 0; m.roam = null; } // keep within The Edges
    w.velocity = { x: vx, y: (w.velocity?.y ?? 0) - 20 * dt, z: vz };
    if (vx || vz) w.rotation = { yaw: (Math.atan2(-vx, -vz) * 180) / Math.PI };
    const mode = Math.hypot(vx, vz) > 0.1 ? "skitter" : "idle";
    if (m.mode !== mode) { m.mode = mode; w.anim.body = { clip: CLIP[mode], loop: "loop", speed: speed > 3 ? 1.5 : 1 }; }
  }
}
