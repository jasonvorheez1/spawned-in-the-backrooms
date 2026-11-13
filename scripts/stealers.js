import { canStrike } from "./lib/hunt.js";
// Level 1's skin-stealers (Wikidot lore + Shelly's sheet): it wears a critter it killed, a skin a little too tall and
// too thin, walking stiff. Docile: it wanders and parrots words it has heard (your name) without understanding them,
// until it is hungry or you hurt it. Then the skin splits. Its blood runs clear. Almond water burns it.
// At 3 m the skin splits down the chest: a shriek, the screen shakes,
// a wet red long-limbed thing unfolds, lunges and slashes twice. Each slash opens a bleed that ticks on.

import { knocked } from "./lib/knock.js";
import { heard } from "./lib/hear.js";
import L from "./lib/data/level1.yml";
import { zoneAt, safeZone } from "./lib/level1.js";
import { npcMul, dmgAfterArmor } from "./lib/stats.js";
import { critterSpec, GAIT_LIB } from "./lib/critter-model.js";
import { npcLook } from "./lib/clothes.js";
import { stepToward as stepToward1 } from "./lib/maze1path.js";
import { wallSteer, wedged, shotAt } from "./lib/hunt.js";
import { raycast } from "builtin/physics";

const GLB = "/cdn/value.6cc392a43a5cb12b4557b1fb35e23d329ad01c9d707b4267d923bdc14abcde2d.glb";
const MODEL = (rev) => ({
  id: GLB,
  forward: "+z",
  parts: { disguise: { visible: false }, creature: { visible: rev }, shed: { visible: false } },
});

const SPECIES = ["cat", "dog", "fox", "bunny", "bear", "deer", "mouse", "wolf", "raccoon", "panda", "pig"];

function hashOf(str) {
  let h = 2166136261;
  for (const c of String(str)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Stolen skin: a whole critter, its own clothes still on, stretched over something taller
function wearSkin(ctx, e) {
  const id = e.id + "/skin";
  if (ctx.getObject(id)) return;
  const h = hashOf(e.id);
  const look = npcLook(e.id, {
    species: SPECIES[h % SPECIES.length],
    sex: (h >> 4) % 2 ? "f" : "m",
    expr: "neutral",
  }, "wanderer", 1);

  ctx.spawn("skin", {
    parent: e.id,
    feetPosition: { x: 0, y: 0, z: 0 },
    scale: { x: 0.9, y: 1.08, z: 0.9 },
    ...critterSpec(look),
    state: { fur: look.fur ?? null },
  });
}

function shedSkin(ctx, e) {
  const id = e.id + "/skin";
  if (ctx.getObject(id)) ctx.destroy(id);
}

const MIMIC = (n) => [
  [`${n}?`, null],
  [`${n}. ${n}. come here, ${n}.`, null],
  ["hello? is someone there?", 0],
  ["wait, don't go. i need help.", 1],
  ["over here, friend.", 2],
  [`h-hello, ${n}. hello. hel-lo.`, null],
];

const HUNGER_S = 150; // seconds of wandering before it gets hungry
const T = {
  reveal: 3,
  revealFor: 1.3,
  lungeFrom: 4.5,
  lungeSpeed: 9,
  lungeFor: 0.45,
  reach: 1.8,
  slashAt: [0.25, 0.7],
  comboFor: 1.1,
  slashDmg: 0.6,
  bleed: 3,
  bleedEvery: 0.7,
  bleedFor: 4.2,
};

const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const CALL = [
  "/cdn/voice-skinstealer-saying-hello-is-someone-there.mp3",
  "/cdn/voice-skinstealer-saying-wait-dont-go-i-need-help.mp3",
  "/cdn/voice-skinstealer-saying-over-here-friend.mp3",
];

const SPLIT = `fx
pop gore burst=26..34 on=box(.25,.5,.1).c(1.25) life=.5..0.9 v=<0,0,-1>*(.5..1.6)+sdir()*(1..2.4)+up(1) size=.03..0.07 acc=grav()+drag(.6) col=oklch(.9 .03 30)..oklch(.82 .05 20) a=.45 sz=$size floor=stick r=sprite(soft-disc,alpha)
pop mist burst=8 on=box(.2,.4,.1).c(1.2) life=.6..1 v=sdir()*(.3..0.7) size=.25..0.45 acc=drag(1.5) col=oklch(.85 .03 30) a=0>.2:.3>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;

const CUT = `fx
pop blood burst=14..20 life=.4..0.8 v=sdir()*(1.2..2.8)+up(.8) size=.025..0.05 acc=grav()+drag(.4) col=oklch(.35 .17 25)..oklch(.48 .2 28) a=1 sz=$size floor=stick r=sprite(soft-disc,alpha,velocity,.02)`;

const DRIP = `fx
pop drip burst=3..5 life=.5..0.8 v=sdir()*.3 size=.02..0.035 acc=grav() col=oklch(.38 .17 25) a=1 floor=stick r=sprite(soft-disc,alpha)`;

const POOF = `fx
pop gore burst=24 on=box(.4,1.2,.4).c(.7) life=.6..1.2 v=sdir()*(.6..1.6)+up(.6) size=.04..0.09 acc=grav()+drag(.8) col=oklch(.88 .04 25) a=.45 floor=stick r=sprite(soft-disc,alpha)
pop mist burst=12 on=box(.4,1,.4).c(.7) life=.8..1.4 v=sdir()*(.3..0.8) size=.3..0.5 acc=drag(1.4)+buoy(.2) col=<.8,.75,.72> a=0>.25:.5>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;

const fxCol = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return String(c).replace(/\s+/g, " "); const n = parseInt(m[1], 16); return `<${(((n >> 16) & 255) / 255).toFixed(2)},${(((n >> 8) & 255) / 255).toFixed(2)},${((n & 255) / 255).toFixed(2)}>`; }; // the fx grammar reads <r,g,b> or oklch(), never #hex
const FUR = (c0) => { const c = fxCol(c0); return `fx
pop fur burst=30..40 on=box(.25,.6,.12).c(1.1) life=.6..1.1 v=sdir()*(1.2..2.6)+up(1.2) size=.05..0.11 spin=-8..8 acc=grav()*.8+drag(1.2) col=${c} a=1 sz=$size rot=$age*$spin floor=stick r=sprite(soft-disc,alpha)`; };

function play(e, m, ch, clip, opt = {}) {
  const k = clip ? clip + (opt.tag ?? "") : null;
  if (m[ch] === k) return;
  m[ch] = k;
  e.anim[ch] = clip ? { clip, weight: ch === "act" ? 4 : 1, loop: false, ...opt } : null;
}

// Throttled line of sight raycast to avoid heavy physics checks every frame
function checkSightThrottled(ctx, m, now, a, b, ignoreId, targetId) {
  const dx = b.x - a.x;
  const dy = (b.y ?? 0) - (a.y ?? 0);
  const dz = b.z - a.z;
  const d2 = dx * dx + dz * dz;

  if (d2 > 14 * 14) return false;

  if (m.los && now < m.los.until && m.los.targetId === targetId) {
    return m.los.clear;
  }

  const l = Math.sqrt(d2 + dy * dy) || 1;
  const hit = raycast(
    ctx,
    { x: a.x, y: (a.y ?? 0) + 0.6, z: a.z },
    { x: dx / l, y: dy / l, z: dz / l },
    { distance: l, physicsOnly: true, bodies: "static", ignoreEntities: [ignoreId, targetId] }
  );

  const clear = !hit;
  m.los = {
    clear,
    until: now + 150 + (dx % 50),
    targetId,
  };
  return clear;
}

export function update(ctx, dt) {
  if (!ctx.place.players.length) { ctx.sleep(2); return; }
  const now = ctx.now();
  const mem = (ctx.self.session.m ??= {});
  const bleeds = (ctx.self.session.b ??= {});

  const players = ctx.place.players.filter(
    (p) => !safeZone(zoneAt(p.feetPosition.x, p.feetPosition.z)) && !(p.state?.downAt && now - p.state.downAt < 4500)
  );

  // Bleeds tick on in the manager's own loop: small hits, a drip each
  for (const pid in bleeds) {
    const b = bleeds[pid];
    const p = ctx.place.players.find((q) => q.id === pid);

    // Red almond water stops the bleeding
    if (!p || now > b.until || (p.state?.hp ?? 0) <= 0 || (p.state?.redAt ?? 0) > b.from) {
      delete bleeds[pid];
      continue;
    }

    if (now >= b.next) {
      b.next = now + T.bleedEvery * 1000;
      p.state.hp -= T.bleed;
      const at = { x: p.feetPosition.x, y: p.feetPosition.y + 1.1, z: p.feetPosition.z };
      ctx.emit("damageNumber", { position: at, value: T.bleed, color: "#a01010", size: 0.7 });
      ctx.emit("fx", { position: at, script: DRIP });
    }
  }

  if (!mem.stealersAt || now > mem.stealersAt || !mem.allStealers) {
    mem.stealersAt = now + 1200;
    mem.allStealers = ctx.query({ tags: ["stealer"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  }
  const allStealers = mem.allStealers;

  for (const e of allStealers) {
    const m = (mem[e.id] ??= { ph: "skin" });
    const pos = e.feetPosition;
    const st = e.state ?? {};
    if (knocked(ctx, e, now, dt)) continue;
    const mu = npcMul(st);
    const o = ctx.place.objects[e.id];
    if (!o) continue;

    if (!st.mesh || st.mesh < 2) {
      o.primitive = null;
      o.model = MODEL(!!st.revealed);
      o.state.mesh = 2;
      if (st.revealed) m.ph = "hunt";
    }

    if (!st.revealed && !m.skinOn) {
      m.skinOn = true;
      wearSkin(ctx, o);
      m.hunger ??= ctx.random() * 0.6;
      m.hp0 = st.hp;
    }

    if (m.ph === "skin") {
      m.hunger = (m.hunger ?? 0) + dt / HUNGER_S;
      if (st.hp != null && m.hp0 != null && st.hp < m.hp0) m.angry = true;
      m.hp0 = st.hp;
    }

    // Death handling
    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!m.deadAt) {
        m.deadAt = now;
        if (!st.dead) o.state.dead = true;
        e.velocity = { x: 0, y: -2, z: 0 };
        play(e, m, "base", null);
        play(e, m, "act", "Death", { clampWhenFinished: true });
        heard(ctx, { maxDistance: 32, refDistance: 5, clip: SND("flesh-tear-wet-shriek"), position: pos, volume: 0.8, pitch: 0.7 });
      } else if (now - m.deadAt > 2600 && !m.gone && now > (st.inspectUntil ?? 0)) {
        m.gone = true;
        ctx.emit("fx", { position: pos, script: POOF });
        heard(ctx, { maxDistance: 24, refDistance: 4, clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9 });
        ctx.destroy(e.id);
      }
      continue;
    }

    // Almond water: it burns; disguise splits, then it reels
    if ((st.splashedAt ?? 0) > (m.splash ?? 0)) {
      m.splash = st.splashedAt;
      m.stunUntil = now + 1600;
      if (m.ph === "skin") {
        o.state.revealed = true;
        o.model = MODEL(true);
        shedSkin(ctx, o);
        ctx.emit("fx", { position: pos, script: SPLIT });
        ctx.emit("screenShake", { intensity: 0.5, duration: 0.4 }, { audience: { nearby: pos, radius: 9 } });
      }
      m.ph = "hunt";
      m.at = now;
      play(e, m, "act", "Reveal", { clampWhenFinished: true, tag: now });
      heard(ctx, { clip: SND("flesh-tear-wet-shriek"), position: pos, volume: 1, pitch: 1.35, maxDistance: 34 });
    }

    if (now < (m.stunUntil ?? 0)) {
      e.velocity = { x: 0, y: (e.velocity?.y ?? 0) - 20 * dt, z: 0 };
      continue;
    }
    if (m.stunUntil && !m.stunDone) {
      m.stunDone = true;
      play(e, m, "act", null);
    }
    if (now >= (m.stunUntil ?? 0) + 50) {
      m.stunDone = false;
    }

    // shot from beyond its 22 m call range: the crack of the round turns the skin that way (player.js writes state.shot on every hit)
    const sh = shotAt(st, now);
    if (sh && (!m.last || m.last.at < sh.at)) {
      m.last = { x: sh.x, z: sh.z, vx: sh.vx ?? 0, vz: sh.vz ?? 0, at: sh.at };
      if (m.ph === "skin") m.angry = true; // you hurt it: the skin walks your way and splits at 8 m
    }

    // Find closest player using squared distance
    let prey = null;
    let bestDistSq = L.stealerCallRange * L.stealerCallRange;
    for (const p of players) {
      const pdx = p.feetPosition.x - pos.x;
      const pdz = p.feetPosition.z - pos.z;
      const d2 = pdx * pdx + pdz * pdz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        prey = p;
      }
    }
    const best = prey ? Math.sqrt(bestDistSq) : Infinity;
    const t = (now - (m.at ?? 0)) / 1000;

    // The split: occurs once at ~3m when hungry or provoked
    const hungry = (m.hunger ?? 0) >= 1 || m.angry;
    if (m.ph === "skin" && prey && (best < T.reveal || (m.angry && best < 8)) && hungry) {
      m.ph = "reveal";
      m.at = now;
      const fur = ctx.getObject(o.id + "/skin")?.state?.fur ?? "oklch(.6 .08 60)";
      o.state.revealed = true;
      o.model = MODEL(true);
      shedSkin(ctx, o);
      ctx.emit("fx", { position: { x: pos.x, y: pos.y, z: pos.z }, script: FUR(fur) });
      play(e, m, "act", "Reveal", { clampWhenFinished: true });
      const chest = { x: pos.x, y: pos.y, z: pos.z };
      ctx.emit("fx", { position: chest, script: SPLIT });
      heard(ctx, { clip: SND("flesh-tear-wet-shriek"), position: chest, volume: 1, maxDistance: 34 });
      ctx.emit("screenShake", { intensity: 0.6, duration: 0.5 }, { audience: { nearby: pos, radius: 9 } });
      if (prey.state) {
        prey.state.sanity = Math.max(0, (prey.state.sanity ?? 100) - L.stealerSanity);
      }
    }

    if (m.ph === "reveal" && t > T.revealFor) {
      m.ph = "hunt";
      m.at = now;
      play(e, m, "act", null);
    }

    // Parrots voice lines
    if (m.ph === "skin" && prey && now >= (m.call ?? 0)) {
      m.call = now + 6000 + ctx.random() * 6000;
      const lines = MIMIC(String(prey.displayName ?? "friend").toLowerCase());
      const [lineText, ci] = lines[Math.floor(ctx.random() * lines.length)];
      prey.state.sub = { who: "???", t: lineText, at: now, d: 3200 };
      if (ci != null) {
        heard(ctx, {
          clip: CALL[ci],
          position: { x: pos.x, y: pos.y + 1.6, z: pos.z },
          volume: 0.9,
          pitch: 0.9 + ctx.random() * 0.15,
          maxDistance: L.stealerCallRange + 6,
        });
      }
    }

    // Hunt and attack transitions
    if (m.ph === "hunt" && prey && now >= (m.cool ?? 0)) {
      if (best < T.reach) {
        m.ph = "combo";
        m.at = now;
        m.hits = 0;
        m.who = prey.id;
        play(e, m, "act", "Slash", { tag: now });
      } else if (best < T.lungeFrom && now >= (m.lungeCool ?? 0)) {
        m.ph = "lunge";
        m.at = now;
        m.lungeCool = now + 3000;
        play(e, m, "act", "Lunge");
        heard(ctx, { maxDistance: 20, refDistance: 3, clip: SND("claw-slash-flesh"), position: pos, volume: 0.5, pitch: 0.6 });
      }
    }

    if (m.ph === "lunge" && (t > T.lungeFor || (prey && best < T.reach))) {
      if (prey && best < T.reach) {
        m.ph = "combo";
        m.at = now;
        m.hits = 0;
        m.who = prey.id;
        play(e, m, "act", "Slash", { tag: now });
      } else {
        m.ph = "hunt";
        m.at = now;
        play(e, m, "act", null);
      }
    }

    // Slashing combo sequence
    if (m.ph === "combo") {
      if (m.hits < 2 && t > T.slashAt[m.hits]) {
        if (m.hits === 1) play(e, m, "act", "Slash", { tag: now });
        m.hits++;
        const targetPlayer = ctx.place.players.find((q) => q.id === m.who);
        const hitDist = targetPlayer ? Math.hypot(targetPlayer.feetPosition.x - pos.x, targetPlayer.feetPosition.z - pos.z) : Infinity;

        if (targetPlayer && hitDist < T.reach + 0.6 && canStrike(ctx, pos, targetPlayer, T.reach + 0.6, [e.id, targetPlayer.id])) {
          const dmg = dmgAfterArmor(targetPlayer.state.look, Math.round(L.stealerHit * T.slashDmg * mu.dmg));
          targetPlayer.state.hp -= dmg;
          const at = { x: targetPlayer.feetPosition.x, y: targetPlayer.feetPosition.y + 1.2, z: targetPlayer.feetPosition.z };
          ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff3030" });
          ctx.emit("fx", { position: at, script: CUT });
          heard(ctx, { maxDistance: 20, refDistance: 3, clip: SND("claw-slash-flesh"), position: at, volume: 1 });
          ctx.emit("cameraPunch", { direction: { x: m.hits === 1 ? 1 : -1, y: 0, z: 0 }, intensity: 0.4 }, { audience: { player: targetPlayer.id } });
          ctx.emit("hitstop", { duration: 0.03 }, { audience: { player: targetPlayer.id } });
          bleeds[targetPlayer.id] = { from: now, until: now + T.bleedFor * 1000, next: now + T.bleedEvery * 1000 };
        } else {
          heard(ctx, { maxDistance: 20, refDistance: 3, clip: SND("claw-slash-flesh"), position: pos, volume: 0.35, pitch: 1.4 });
        }
      }
      if (t > T.comboFor) {
        m.hunger = Math.max(0, (m.hunger ?? 0) - 0.35);
        m.ph = "hunt";
        m.at = now;
        m.cool = now + L.stealerCooldown * 1000;
        play(e, m, "act", null);
      }
    }

    // Navigation and pathfinding
    let goal;
    if (prey && m.ph === "skin" && !hungry) {
      const pd = best;
      goal = pd > 4.5 ? prey.feetPosition : pos;
      if (pd <= 4.5) {
        e.rotation = { yaw: Math.atan2(-(prey.feetPosition.x - pos.x), -(prey.feetPosition.z - pos.z)) * 57.2958 };
      }
    } else if (prey) {
      goal = prey.feetPosition;
    } else if (m.last && now - m.last.at < 8000) {
      // the shot's ground: a stiff hurried walk for where the shooter stood, forgotten on arrival
      goal = m.last;
      if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < 1) m.last = null;
    } else {
      if (!m.roam || now > m.until) {
        const a = ctx.random() * 6.283;
        m.roam = { x: pos.x + Math.cos(a) * 8, z: pos.z + Math.sin(a) * 8 };
        m.until = now + 6000;
      }
      goal = m.roam;
    }

    const sight = prey && checkSightThrottled(ctx, m, now, pos, prey.feetPosition, e.id, prey.id);
    let way = null;
    if (!sight) {
      way = stepToward1(pos.x, pos.z, goal.x, goal.z, 30);
    }
    if (!way && !prey && !sight) {
      m.roam = null;
    }

    const tgt = way && way.cells > 0 ? way.next : goal;
    const dx = tgt.x - pos.x;
    const dz = tgt.z - pos.z;
    const d = Math.hypot(dx, dz) || 1;
    let ux = dx / d;
    let uz = dz / d;

    const rev = m.ph !== "skin";
    let sp = (m.ph === "lunge" ? T.lungeSpeed : m.ph === "reveal" ? 0 : m.ph === "combo" ? 0.6 : rev ? L.stealerLunge * 0.55 : L.stealerWalk) * mu.speed;
    if (goal === m.last) sp = Math.max(sp, 2.8 * mu.speed); // the skin knows where you stand: it hurries

    // Stuck detection: sidestep & repath if trapped
    m.sk ??= { x: pos.x, z: pos.z, at: now };
    if (now - m.sk.at > 800) {
      const moved = Math.hypot(pos.x - m.sk.x, pos.z - m.sk.z);
      if (sp > 0.8 && moved < 0.2) {
        m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 500 };
        m.roam = null;
      }
      if (wedged(m, moved, sp > 0.5) && d > 0.01) { e.feetPosition = { x: pos.x - (dx / d) * 0.7, y: pos.y + 0.05, z: pos.z - (dz / d) * 0.7 }; e.velocity = { x: 0, y: 0, z: 0 }; m.roam = null } // stuck against a wall for seconds: backed off it
      m.sk = { x: pos.x, z: pos.z, at: now };
    }

    if (m.side && now < m.side.until) {
      const s = m.side.s;
      const curX = ux;
      const curZ = uz;
      ux = curX * 0.4 - curZ * s * 0.9;
      uz = curZ * 0.4 + curX * s * 0.9;
    }

    // Separation: push away from nearby stealers (throttled + squared distance check)
    if (now >= (m.sepAt ?? 0)) {
      m.sepAt = now + 250;
      let sx = 0;
      let sz = 0;
      for (const o of allStealers) {
        if (o.id === e.id) continue;
        const ox = pos.x - o.feetPosition.x;
        const oz = pos.z - o.feetPosition.z;
        const d2 = ox * ox + oz * oz;
        if (d2 < 1.69 && d2 > 0.0001) { // 1.3^2
          const od = Math.sqrt(d2);
          const push = (1.3 - od) / od;
          sx += ox * push;
          sz += oz * push;
        }
      }
      m.sep = { x: sx, z: sz };
    }

    if (m.sep) {
      ux += m.sep.x * 1.1;
      uz += m.sep.z * 1.1;
    }

    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul;
    uz /= ul;
    if (sp > 0) [ux, uz] = wallSteer(ctx, m, now, pos, ux, uz, e.id);

    if (safeZone(zoneAt(pos.x + ux * sp * dt * 4, pos.z + uz * sp * dt * 4))) {
      sp = 0;
    }

    const near = way && way.cells > 0 ? 0.35 : 1.1;
    const moving = d > near && sp > 0;
    e.velocity = { x: moving ? ux * sp : 0, y: (e.velocity?.y ?? 0) - 20 * dt, z: moving ? uz * sp : 0 };

    if (moving || prey) {
      e.rotation = { yaw: Math.atan2(-ux, -uz) * 57.2958 };
    }

    play(e, m, "base", rev ? (moving ? "Run" : "Hunt") : moving ? "Walk" : "Idle", { loop: true });

    if (!rev && m.gait !== moving) {
      m.gait = moving;
      const sk = ctx.getObject(e.id + "/skin");
      if (sk) {
        sk.anim.base = { clip: moving ? GAIT_LIB.walk : GAIT_LIB.idle, loop: true, timeScale: moving ? 0.75 : 0.4 };
      }
    }
  }
}


