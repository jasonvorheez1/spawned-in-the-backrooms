// Level 2.1 "Locked": interactive set-pieces (Saltine stockpile, freezer-coil water collector, Base Alef lockout terminal, Exploration Wing forbidden berries,
// John Banks's blasting plunger, Quartermaster errand board) and the Smilers that prowl The Edges (places/level21/sim.js).
import { heard } from "./lib/hear.js";
import { raycast } from "builtin/physics";
import L from "./lib/data/level21.yml";
import { N, EDGE_X, LANE, cellAt, cellCenter, openings, isEdge } from "./lib/level21.js";
import { stepToward } from "./lib/maze21path.js";
import { npcState, npcMul, dmgAfterArmor } from "./lib/stats.js";

export const updateSchedule = { every: { seconds: 0.1 } };

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const H = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const say = (who, text, ctx) => { if (who?.state) who.state.notice = { text, at: ctx.now() }; };

const ALEF_LOGS = [
  "ALEF LOG [11 JUL 2020 · 03:18]: \"Wilson here. A solid steel shutter just dropped across the Level 2 stairwell. Blowtorches barely scratch it. All 53 of us are sealed in.\"",
  "ALEF LOG [14 JUL 2020 · 19:04]: \"Rations are down to quarter-shares. The heat from the lower pipes is 98°F and there's no running water in the halls. People are eyeing the specimen berries in Exploration.\"",
  "ALEF LOG [19 JUL 2020 · 11:42]: \"Connor found a room north of the checkered lockers—banks of humming refrigerators packed floor-to-ceiling with Saltines. He calls it 'Refrigerator Paradise'. Half the base is moving there.\"",
  "ALEF LOG [27 JUL 2020 · 22:15]: \"John Banks took six sticks of dynamite and a plunger box east into The Edges. He thinks the concrete roof is only five meters thick. If he blows a hole, maybe we reach the surface.\"",
  "ALEF LOG [02 AUG 2020 · 04:50]: \"Banks's blast only brought down rock and woke the Smilers in the east caverns. But the last survey team found a cold karst fissure at the far end of the lane—it leads down to Level 8.\"",
];

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, w = who.state, pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, cool = (s.cool ??= {});
    const snd = (n, v = 0.6) => heard(ctx, { clip: G(n), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: v, maxDistance: 14 });

    if (s.kind === "saltines") {
      if (now - (cool[uid] ?? -1e9) < 40000) return say(who, "Your mouth is still dry from the last sleeve of Saltines. Give it a moment.", ctx);
      cool[uid] = now; snd("plastic-bottle-pickup-rattle", 0.45);
      w.hunger = Math.min(100, (w.hunger ?? 100) + 38);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 8);
      w.thirst = Math.max(5, (w.thirst ?? 100) - 4);
      w.payout = { xp: 10, items: ["bar"], text: "You tear open a fresh sleeve of Saltine crackers and stuff a handful in your pocket. Dry, salty, and miraculously crisp. (Hunger +38, Sanity +8, +Ration Bar)" };
      return;
    }

    if (s.kind === "cooler") {
      if (now - (cool[uid] ?? -1e9) < 30000) return say(who, "The copper drip-line needs half a minute to refill the jug.", ctx);
      cool[uid] = now; snd("water-pour-splash-short", 0.55);
      w.thirst = Math.min(100, (w.thirst ?? 100) + 42);
      w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 80) + 10);
      return say(who, "You drink ice-cold condensation water distilled off the freezer coils. The oppressive heat of the halls fades for a moment. (Thirst +42, Health +10)", ctx);
    }

    if (s.kind === "comms") {
      snd("plastic-bottle-pickup-rattle", 0.35);
      const n = (s.said ??= {})[uid] = ((s.said ?? {})[uid] ?? -1) + 1;
      return say(who, ALEF_LOGS[n % ALEF_LOGS.length], ctx);
    }

    if (s.kind === "berries") {
      if (now - (cool[uid] ?? -1e9) < 60000) return say(who, "The specimen jar's remaining berries are still coalescing in the cold brine.", ctx);
      cool[uid] = now; snd("water-pour-splash-short", 0.4);
      if (ctx.random() < 0.65) {
        w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 80) + 40);
        w.hunger = Math.min(100, (w.hunger ?? 80) + 40);
        w.thirst = Math.min(100, (w.thirst ?? 80) + 40);
        w.sanity = Math.min(100, (w.sanity ?? 80) + 10);
        w.payout = { xp: 20, items: ["almond"], text: "You ignore Administration Memo #13 and swallow a handful of the crimson exploration berries. Sweet, icy juice floods your veins! (HP +40, Hunger +40, Thirst +40, +Almond Water)" };
      } else {
        w.sanity = Math.max(5, (w.sanity ?? 80) - 12);
        ctx.emit("screenFlash", { color: "#6a1890", duration: 0.9, intensity: 0.65 }, { audience: { player: who.id } });
        w.payout = { xp: 18, items: ["battery", "bandage"], text: "The berries taste like copper and static. The walls ripple for a second—and when your vision clears, you spot supplies tucked behind the specimen tray! (Sanity -12, +Battery, +Bandage)" };
      }
      return;
    }

    if (s.kind === "blaster") {
      if (now - (cool[uid] ?? -1e9) < 55000) return say(who, "The dynamo capacitor in Banks's plunger box is still recharging.", ctx);
      cool[uid] = now; snd("pickup-ammo", 0.6);
      ctx.emit("screenShake", { intensity: 0.25, duration: 0.45 }, { audience: { player: who.id } });
      const pick = ["ammo", "shells", "battery", "kit"][Math.floor(ctx.random() * 4)];
      w.payout = { xp: 15, items: [pick, "bandage"], text: "You Pop open John Banks's demolition chest and depress the T-handle plunger—sparks pop across the blasted concrete ceiling above, and you salvage spare gear from the crate! (+15 XP)" };
      return;
    }

    if (s.kind === "board") {
      const Q = [
        { name: "Wire for the Compressors", need: { wire: 3 }, xp: 65, items: ["almond", "battery", "cash:1500"], text: "Ned needs 3 spools of copper wire to keep Refrigerator Paradise's freezers running." },
        { name: "Steel for the Shutter Watch", need: { metal: 4 }, xp: 80, items: ["ammo", "bandage", "cash:2000"], text: "Goknar wants 4 scrap metal to reinforce the doors against the hounds." },
        { name: "Tape for the Steam Leaks", need: { tape: 3 }, xp: 70, items: ["almond", "almond", "cash:1800"], text: "Three rolls of duct tape to seal the scalding steam pipes in the halls." },
        { name: "Relays for Base Alef", need: { electronics: 2 }, xp: 95, items: ["firstaid", "shells", "cash:2800"], text: "Two electronics modules to keep Base Alef's emergency beacons alive." },
        { name: "Scout The Edges", need: null, xp: 140, items: ["firstaid", "ammo", "cash:4500"], text: "Venture past the white block rooms deep into The Edges (toward the Level 8 cave mouth) and report back." },
      ];
      const lap = Math.floor((w.l21q ?? 0) / Q.length), qi = (w.l21q ?? 0) % Q.length, q = Q[qi];
      if (!q.need && (w.l21Scouted ?? 0) < 1 && lap > 0) { w.l21q = (w.l21q ?? 0) + 1; return say(who, "Quartermaster Board: 'Scout The Edges' is already logged in the survey book.", ctx); }
      const mul = 1 + lap, need = q.need ? Object.fromEntries(Object.entries(q.need).map(([k, n]) => [k, n * mul])) : null, sc = w.scrap ?? {};
      const NAME = { wire: "copper wire", metal: "scrap metal", tape: "duct tape", electronics: "electronics" };
      const have = need ? Object.entries(need).every(([k, n]) => (sc[k] ?? 0) >= n) : (w.l21Scouted ?? 0) >= 1;
      if (!have) {
        const list = need ? Object.entries(need).map(([k, n]) => `${sc[k] ?? 0}/${n} ${NAME[k]}`).join(", ") : "not yet scouted";
        return say(who, `ALEF ERRAND ${qi + 1}${lap ? ` (round ${lap + 1})` : ""}: ${q.name}. ${q.text} Progress: ${list}.`, ctx);
      }
      if (need) { const left = { ...sc }; for (const [k, n] of Object.entries(need)) left[k] = (left[k] ?? 0) - n; w.scrap = left; }
      w.l21q = (w.l21q ?? 0) + 1; snd("pickup-ammo", 0.65);
      const xp = Math.round(q.xp * (1 + lap * 0.5));
      w.payout = { xp, items: q.items, text: `ERRAND COMPLETE: ${q.name}. Ned nods over a box of Saltines and hands over your share from the quartermaster lockbox. (+${xp} XP)` };
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
  const now = ctx.now(), mem = (ctx.self.session.m ??= { respawnAt: 0 });
  const players = ctx.place.players.filter((p) => (p.state?.hp ?? 1) > 0 && !(p.state?.downAt && now - p.state.downAt < 4500));

  // Track if any player has scouted deep into The Edges (for the Quartermaster board errand)
  for (const p of players) {
    const { cx } = cellAt(p.feetPosition.x, p.feetPosition.z);
    if (cx >= EDGE_X + 4 && !p.state.l21Scouted) {
      p.state.l21Scouted = 1;
      p.state.notice = { text: "You have scouted deep into The Edges. Ned and Goknar at Refrigerator Paradise will pay for this survey report.", at: now };
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
