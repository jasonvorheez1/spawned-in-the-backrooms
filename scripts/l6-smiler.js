import { targetsOf } from "./lib/decoys.js";
// Level 6 "Lights Out" Smiler: a terrifying predator lurking in total darkness.
// Follows Wikidot Backrooms lore:
// - Pitch dark: only its glowing luminescent white eyes and predatory smile are visible.
// - Eye contact: stare directly at it and it freezes rigid, locked in place.
// - Break eye contact or turn your back, and it charges at blinding speed to lunge.
// - Flashlights don't work in Level 6, so wanderers cannot blind or pin it with a torch beam.
import { knocked } from "./lib/knock.js";
import { heard } from "./lib/hear.js";
import { raycast } from "builtin/physics";
import { shotAt, wallSteer, wedged } from "./lib/hunt.js";
import { stepToward6, cellAt, cellCenter, isWalkable } from "./lib/level6path.js";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";

export const MODEL = { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" };
export const SCALE = 1.6;

const CLIP = {
  idle: "cdn/clip-crouch-idle-loop.glb",
  skitter: "cdn/clip-crouch-walk-loop.glb",
  freeze: "cdn/clip-block-loop.glb",
  "lunge-bite": "cdn/clip-attack.glb",
  recoil: "cdn/clip-hit-react.glb",
  death: "cdn/clip-die.glb",
};

const EYE = 1.1;
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop shade burst=22..30 life=.8..1.4 on=box(.8,.5,1.2).c(.3) v=sdir()*(.4..1.2)+up(.6) size=.3..0.6 acc=buoy(.6)+curl(.6)+drag(1.2) col=<.04,.03,.06> a=0>.5:.6>0 sz=$size*(.6>1.6) rot=spin(.4) r=sprite(smoke-puff,alpha)
pop spark burst=10 life=.4..0.8 on=point() v=sdir()*(1..2.5) size=.03..0.05 acc=drag(2) col=hdr(3,2.8,2.2) a=1>0 r=sprite(ember,add)`;

// The revamp (Shelly, Nov 13: "more interesting, scarier than the regular smiler, more attacks"). Every number is Savi's pick.
const T = {
  stareSanEvery: 2000, stareSan: 3,            // staring holds it, but its grin eats your nerve
  blinkEvery: 4800, blinkStep: 2.6,            // and every few seconds you blink: the screen drops black and it is closer
  pounceMin: 4, pounceMax: 10, pounceCd: 5200, pounceTell: 450, pounceDash: 450, pounceSpeed: 13, pounceDmg: 28,
  biteCd: 1400, biteDmg: 22, biteSan: 10,
  grabEvery: 3, grabMs: 1800, chewEvery: 550, chewDmg: 8, // every third bite it holds on and chews
  shriekCd: 24000, shriekR: 12, shriekSan: 15, shriekRoot: 700, darkR: 16, darkMs: 2600,
  vanishMs: 2200, behind: 2.6,                 // at half health it blinks out and comes back behind you
};
export const EYES = `fx
local
pop eyeL n=1 pos=<-.09,1.02,-.16> size=.05 col=hdr(4,4,3.6)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop eyeR n=1 pos=<.09,1.02,-.16> size=.05 col=hdr(4,4,3.6)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop grin n=1 pos=<0,.9,-.18> size=.16 asp=3.2 col=hdr(3.2,3.2,2.8)*flick(2,.2) a=.9 sz=$size r=sprite(soft-disc,add)`;
const SHRIEK = `fx
pop ring burst=1 life=.6 on=point() size=.4 col=hdr(2,2,2.4) a=.6>0 sz=$size*(1>14) r=sprite(soft-disc,add)
pop shade burst=40 life=.8..1.6 on=sphere(.5).c(1) v=sdir()*(3..6) size=.3..0.7 acc=drag(2) col=<.02,.02,.03> a=.7>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)`;
const hurt = (ctx, w, prey, dmg, san, color = "#ff2233") => {
  prey.state.hp = Math.max(0, (prey.state.hp ?? 100) - dmgAfterArmor(prey.state.look, dmg));
  if (san) prey.state.sanity = Math.max(0, (prey.state.sanity ?? 100) - san);
  ctx.emit("damageNumber", { position: { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.2, z: prey.feetPosition.z }, value: dmg, color });
  ctx.emit("cameraPunch", { direction: { x: prey.feetPosition.x - w.feetPosition.x, y: 0, z: prey.feetPosition.z - w.feetPosition.z }, intensity: 0.45 }, { audience: { player: prey.id } });
  ctx.emit("squash", { target: w.id, axis: "z", intensity: 0.18, duration: 0.2 });
};
function lightsOut(ctx, m, pos, now) { // its shriek kills every lamp near it for a breath, then they stutter back
  m.dark = [];
  for (const o of ctx.query({ radius: T.darkR, center: pos })) {
    const h = ctx.getObject(o.id); if (!h?.light || !(h.light.intensity > 0)) continue;
    m.dark.push({ id: o.id, i: h.light.intensity }); h.light = { ...h.light, intensity: 0 };
  }
  m.darkUntil = now + T.darkMs;
}
function lightsBack(ctx, m) { for (const d of m.dark ?? []) { const h = ctx.getObject(d.id); if (h?.light) h.light = { ...h.light, intensity: d.i }; } m.dark = null; }

function anim(w, m, clip, loop = true, speed = 1) {
  if (m.clip === clip) return;
  m.clip = clip;
  w.anim.main = { clip: CLIP[clip] ?? clip, loop, speed, weight: 1 };
}

function act(w, clip, extra = {}) {
  w.anim.act = { clip: CLIP[clip] ?? clip, loop: "once", blend: "override", weight: 4, time: 0, ...extra };
}

function hasClearSight(ctx, a, b, ignoreId, targetId) {
  const dx = b.x - a.x, dy = (b.y ?? 0) - (a.y ?? 0), dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d > 18) return false;
  const l = Math.hypot(dx, dy, dz) || 1;
  const hit = raycast(ctx, { x: a.x, y: (a.y ?? 0) + EYE, z: a.z }, { x: dx / l, y: dy / l, z: dz / l }, { distance: l, physicsOnly: true, bodies: "static", ignoreEntities: [ignoreId, targetId] });
  return !hit;
}

export function update(ctx, dt) {
  if (!ctx.place.players.length) { ctx.sleep(2); return; } // nobody in this level: rest
  const now = ctx.now();
  const mem = (ctx.self.session.m ??= {});
  const players = targetsOf(ctx, ctx.place.players).filter((p) => !(p.state?.downAt && now - p.state.downAt < 4500));
  const smilers = ctx.query({ tags: ["l6-smiler"] });

  for (const w of smilers) {
    const m = (mem[w.id] ??= {}), st = w.state ?? {}, pos = w.feetPosition, mu = npcMul(st);
    if (!w.fx && !st.dead) w.fx = { script: EYES }; // its eyes and grin glow in the dark, wherever it walks
    if (m.dark && now > m.darkUntil) lightsBack(ctx, m);
    if (knocked(ctx, w, now, dt)) continue;

    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!m.dieAt) {
        m.dieAt = now; lightsBack(ctx, m); w.fx = null; w.visible = true;
        w.velocity = { x: 0, y: -1, z: 0 };
        act(w, "death");
        heard(ctx, { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 30 });
      } else if (!m.gone && now - m.dieAt > 1800) {
        m.gone = true;
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF });
        ctx.destroy(w.id);
      }
      continue;
    }

    // Target tracking
    if (now >= (m.look ?? 0)) {
      m.look = now + 350 + ctx.random() * 200;
      let best = null, bd = Infinity;
      for (const p of players) {
        const pp = p.feetPosition, dx = pp.x - pos.x, dz = pp.z - pos.z, d = Math.hypot(dx, dz);
        // Wikidot lore: Smilers detect motion and breathing in pitch dark up to 16m
        const sight = d < 16 && hasClearSight(ctx, pos, pp, w.id, p.id);
        if (sight && d < bd) { best = p; bd = d; }
      }
      if (best && !m.prey) {
        heard(ctx, { clip: SND("smiler-wet-giggle-hiss-stalking"), position: pos, volume: 0.9, maxDistance: 28 });
      }
      m.prey = best?.id ?? null;
      // shot from beyond its 16 m dark sight: it still turns on the shooter (player.js writes state.shot on every hit)
      if (!best && !m.prey) {
        const sh = shotAt(st, now);
        if (sh && (!m.last || m.last.at < sh.at)) m.last = { ...sh };
      }
    }

    const prey = m.prey ? players.find((p) => p.id === m.prey) : null;
    let goal = null, speed = 1.4, frozen = false;

    if (prey) {
      goal = prey.feetPosition;
      const pp = prey.feetPosition, pd = Math.hypot(pp.x - pos.x, pp.z - pos.z), maxHp = st.maxHp ?? 120;
      const yaw = prey.camera?.rotation?.yaw, r = ((yaw ?? 0) * Math.PI) / 180, fx = -Math.sin(r), fz = -Math.cos(r);
      const tl = pd || 1, staring = yaw != null && (fx * (pos.x - pp.x) + fz * (pos.z - pp.z)) / tl > 0.82 && pd < 14;

      // VANISH: at half health, once: a shriek, it is gone, and it comes back behind you mid-pounce
      if (!st.halfDone && (st.hp ?? maxHp) < maxHp * 0.5) { st.halfDone = 1; m.shriekAt = 0; m.vanish = now; }
      if (m.vanish) {
        if (now - m.vanish < 60) {
          heard(ctx, { clip: SND("smiler-shriek-then-sudden-silence"), position: pos, volume: 1, maxDistance: 40 });
          ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.6, z: pos.z }, script: POOF });
          lightsOut(ctx, m, pos, now); w.visible = false; w.fx = null;
        }
        w.velocity = { x: 0, y: (w.velocity?.y ?? 0) - 20 * dt, z: 0 };
        if (now - m.vanish < T.vanishMs) continue;
        const bx = pp.x - fx * T.behind, bz = pp.z - fz * T.behind; // behind their eyes
        w.feetPosition = { x: bx, y: pp.y + 0.05, z: bz }; w.visible = true; w.fx = { script: EYES }; m.vanish = 0;
        heard(ctx, { clip: SND("creepy-wet-giggle-right-behind-you"), position: { x: bx, y: pp.y + 1, z: bz }, volume: 1, maxDistance: 12 });
        m.pounce = { at: now - T.pounceTell, dir: { x: (pp.x - bx) / T.behind, z: (pp.z - bz) / T.behind }, hit: false }; continue;
      }

      // GRAB: it holds on and chews; you can't move until it lets go (or something knocks it off)
      if (m.grab) {
        prey.state.stungUntil = Math.max(prey.state.stungUntil ?? 0, now + 300);
        w.velocity = { x: 0, y: (w.velocity?.y ?? 0) - 20 * dt, z: 0 };
        w.feetPosition = { x: pp.x - (pp.x - pos.x) / tl * 0.9, y: pos.y, z: pp.z - (pp.z - pos.z) / tl * 0.9 };
        if (now >= m.grab.next) { m.grab.next = now + T.chewEvery; act(w, "lunge-bite"); hurt(ctx, w, prey, Math.round(T.chewDmg * mu.dmg), 4);
          heard(ctx, { clip: SND("wet-flesh-chewing-crunch"), position: pp, volume: 0.9, maxDistance: 14 });
          ctx.emit("screenFlash", { color: "#5a0008", duration: 0.18, intensity: 0.4 }, { audience: { player: prey.id } }); }
        if (now - m.grab.at > T.grabMs) { m.grab = null; prey.state.stungUntil = now + 400; ctx.emit("impulse", { target: prey.id, impulse: { x: (pp.x - pos.x) / tl * 380, y: 160, z: (pp.z - pos.z) / tl * 380 } }); }
        continue;
      }

      // POUNCE: a crouch and a hiss, then it covers the room in half a second
      if (m.pounce) {
        const t = now - m.pounce.at;
        if (t < T.pounceTell) { anim(w, m, "freeze", true, 0.3); w.velocity = { x: 0, y: (w.velocity?.y ?? 0) - 20 * dt, z: 0 }; continue; }
        if (t < T.pounceTell + T.pounceDash) {
          anim(w, m, "skitter", true, 2.4);
          w.velocity = { x: m.pounce.dir.x * T.pounceSpeed, y: (w.velocity?.y ?? 0) - 20 * dt, z: m.pounce.dir.z * T.pounceSpeed };
          w.rotation = { yaw: Math.atan2(-m.pounce.dir.x, -m.pounce.dir.z) * 57.2958 };
          if (!m.pounce.hit && pd < 1.6) { m.pounce.hit = true; act(w, "lunge-bite"); hurt(ctx, w, prey, Math.round(T.pounceDmg * mu.dmg), 8);
            prey.state.stungUntil = Math.max(prey.state.stungUntil ?? 0, now + 500);
            ctx.emit("impulse", { target: prey.id, impulse: { x: m.pounce.dir.x * 420, y: 120, z: m.pounce.dir.z * 420 } });
            ctx.emit("screenShake", { intensity: 0.7, duration: 0.35 }, { audience: { player: prey.id } });
            heard(ctx, { clip: SND("smiler-lunge-snap-shriek"), position: pos, volume: 1, maxDistance: 25 }); }
          continue;
        }
        m.pounce = null; m.pounceCd = now + T.pounceCd;
      }

      if (staring) {
        // STARE: it locks rigid, grin widening; every blink it is closer
        frozen = true; speed = 0;
        if (!m.stared) { m.stared = now; m.blinkAt = now + T.blinkEvery; heard(ctx, { clip: SND("creepy-wet-giggle-close"), position: pos, volume: 0.7, maxDistance: 20 }); }
        if (now - (m.sanAt ?? 0) > T.stareSanEvery) { m.sanAt = now; prey.state.sanity = Math.max(0, (prey.state.sanity ?? 100) - T.stareSan); }
        if (now >= m.blinkAt && pd > 2) {
          m.blinkAt = now + T.blinkEvery * (0.7 + ctx.random() * 0.5);
          ctx.emit("screenFlash", { color: "#000000", duration: 0.28, intensity: 1 }, { audience: { player: prey.id } });
          const step = Math.min(T.blinkStep, pd - 1.6);
          w.feetPosition = { x: pos.x + (pp.x - pos.x) / tl * step, y: pos.y + 0.05, z: pos.z + (pp.z - pos.z) / tl * step };
          heard(ctx, { clip: SND("single-wet-click-in-the-dark"), position: pos, volume: 0.6, maxDistance: 14 });
        }
      } else {
        m.stared = 0;
        speed = pd < 10 ? 6.2 : 3.8;
        // POUNCE start
        if (pd > T.pounceMin && pd < T.pounceMax && now >= (m.pounceCd ?? 0) && hasClearSight(ctx, pos, pp, w.id, prey.id)) {
          m.pounce = { at: now, dir: { x: (pp.x - pos.x) / tl, z: (pp.z - pos.z) / tl }, hit: false };
          ctx.emit("squash", { target: w.id, axis: "y", intensity: 0.3, duration: T.pounceTell / 1000 });
          heard(ctx, { clip: SND("low-rattling-hiss-before-pounce"), position: pos, volume: 0.9, maxDistance: 18 });
          continue;
        }
      }

      // SHRIEK: the lights die, your legs lock, your nerve goes
      if (now >= (m.shriekAt ?? now + T.shriekCd / 2) && pd < T.shriekR) {
        m.shriekAt = now + T.shriekCd * (0.8 + ctx.random() * 0.4);
        heard(ctx, { clip: SND("smiler-piercing-shriek"), position: pos, volume: 1, maxDistance: 40 });
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 1, z: pos.z }, script: SHRIEK });
        lightsOut(ctx, m, pos, now);
        for (const p of players) { if (Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z) > T.shriekR) continue;
          p.state.stungUntil = Math.max(p.state.stungUntil ?? 0, now + T.shriekRoot); p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - T.shriekSan);
          ctx.emit("screenShake", { intensity: 0.6, duration: 0.6 }, { audience: { player: p.id } }); }
      } else if (m.shriekAt == null) m.shriekAt = now + T.shriekCd / 2;

      // BITE, and every third bite it grabs
      if (pd < 1.7 && now > (m.attackCd ?? 0)) {
        m.attackCd = now + T.biteCd; m.bites = (m.bites ?? 0) + 1;
        act(w, "lunge-bite");
        heard(ctx, { clip: SND("smiler-lunge-snap-shriek"), position: pos, volume: 1, maxDistance: 25 });
        hurt(ctx, w, prey, Math.round(T.biteDmg * mu.dmg), T.biteSan);
        ctx.emit("screenShake", { intensity: 0.5, duration: 0.3 }, { audience: { player: prey.id } });
        if (m.bites % T.grabEvery === 0) { m.grab = { at: now, next: now + T.chewEvery }; heard(ctx, { clip: SND("bone-crunch-wet-grab"), position: pp, volume: 1, maxDistance: 18 }); }
      }
    } else if (m.last && now - m.last.at < 8000) {
      // the shot's ground: it lopes for where the shooter stood, and forgets it standing there
      goal = m.last;
      speed = 3.8;
      if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < 0.8) m.last = null;
    } else {
      // Roaming through the labyrinth
      if (st.arena && (!m.roam || now > (m.roamUntil ?? 0))) { const a = ctx.random() * 6.283, h = st.home ?? pos; m.roam = { x: h.x + Math.cos(a) * 3, z: h.z + Math.sin(a) * 3 }; m.roamUntil = now + 4000; }
      else if (!m.roam || now > (m.roamUntil ?? 0) || Math.hypot(pos.x - m.roam.x, pos.z - m.roam.z) < 0.6) {
        const c = cellAt(pos.x, pos.z);
        const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([di, dj]) => isWalkable(c.i + di, c.j + dj));
        if (dirs.length) {
          const pick = dirs[Math.floor(ctx.random() * dirs.length)];
          m.roam = cellCenter(c.i + pick[0], c.j + pick[1]);
        } else {
          m.roam = cellCenter(c.i, c.j);
        }
        m.roamUntil = now + 6000;
      }
      goal = m.roam;
      speed = 1.3;
    }

    if (frozen) {
      anim(w, m, "freeze", true, 0.5);
      w.velocity = { x: 0, y: (w.velocity?.y ?? 0) - 20 * dt, z: 0 };
      continue;
    }

    // Pathfinding
    const sight = prey && hasClearSight(ctx, pos, prey.feetPosition, w.id, prey.id);
    let way = null;
    if (goal && !sight && !st.arena) {
      way = stepToward6(pos.x, pos.z, goal.x, goal.z, 28);
    }
    const tgt = way && way.cells > 0 ? way.next : goal;
    const dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz) || 1;
    let ux = dx / d, uz = dz / d;

    // Stuck avoidance
    m.sk ??= { x: pos.x, z: pos.z, at: now };
    if (now - m.sk.at > 650) {
      const moved = Math.hypot(pos.x - m.sk.x, pos.z - m.sk.z);
      if (speed > 1 && moved < 0.2) {
        m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 500 };
        m.roam = null;
      }
      // wedged: not budged for ~2 s while trying to walk: backed off the wall (the same cure the hounds and stealers take)
      if (wedged(m, moved, speed > 0.5) && d > 0.01) { w.feetPosition = { x: pos.x - (dx / d) * 0.7, y: pos.y + 0.05, z: pos.z - (dz / d) * 0.7 }; w.velocity = { x: 0, y: 0, z: 0 }; m.roam = null }
      m.sk = { x: pos.x, z: pos.z, at: now };
    }
    if (m.side && now < m.side.until) {
      const s = m.side.s;
      ux = ux * 0.4 + -uz * s * 0.9;
      uz = uz * 0.4 + (dx / d) * s * 0.9;
      const l = Math.hypot(ux, uz) || 1;
      ux /= l; uz /= l;
    }

    if (speed > 0) [ux, uz] = wallSteer(ctx, m, now, pos, ux, uz, w.id); // walls on any level: a short ray along the heading
    anim(w, m, speed > 3 ? "skitter" : "skitter", true, speed > 3 ? 1.6 : 1);
    w.velocity = { x: ux * speed, y: (w.velocity?.y ?? 0) - 20 * dt, z: uz * speed };
    w.rotation = { yaw: Math.atan2(-ux, -uz) * 57.2958 };
  }
}




