// Level 5's Death Rats (Wikidot): black, long-bodied, brown horns glowing red at the tips. One manager steps every pack.
// They nest in the Boiler Room; every few minutes a pack comes up a vent into the halls, roams, and goes back down.
// Skittish: a lit flashlight or a raised weapon sends them scattering. Alone or hurt, they swarm with small fast bites.
// Rarely the pack screams and bolts after something nobody sees, and the lamps round them stutter, then come back.
// Kill one: Death Rat remains with meat:rat, and player.state.l5rats += 1 (Housekeeping's job).

import { heard } from "./lib/hear.js";
import { ZONES } from "./lib/level5.js";
import { E, SND, isSafe, zoneId, flat, yawTo, maxHpOf, prey, aloneOf, hit, claimRemains, killerOf, becomeCorpse } from "./lib/l5-hostile.js";
import { npcState } from "./lib/stats.js";
import { stepToward as stepTowardBoiler } from "./lib/boilerpath.js";

const R = E.rat;
const Z = Object.fromEntries(ZONES.map((z) => [z.id, z]));
const rnd = (ctx, [a, b]) => a + ctx.random() * (b - a);

const VENT_FX = `fx
pop dust burst=14 life=.6..1.1 on=disc(.35) v=up(.6..1.4)+sdir()*.5 size=.15..0.3 acc=buoy(.2)+drag(1.6) col=<.32,.28,.24> a=0>.35:.4>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)
pop grit burst=8 life=.4..0.7 on=disc(.3) v=up(1..2)+sdir()*.8 size=.02..0.04 acc=grav() col=<.2,.18,.16> a=1>0 floor=die r=sprite(grain,alpha)`;

const BLOOD = `fx
pop drip burst=5..8 life=.4..0.7 v=sdir()*(.5..1.2)+up(.3) size=.03..0.05 acc=grav()*.8 col=<.35,.02,.03> a=1>0 sz=$size floor=die r=sprite(soft-disc,alpha)`;

const EYES = `fx
pop tips n=2 at=box(.035,.01,.01).c(.24) size=.05 col=hdr(3,.25,.1)*flick(1.3,.35) a=.9 sz=$size r=sprite(soft-disc,add)`;

function inside(z, x, zz, m = 0.45) {
  return {
    x: Math.min(z.x1 - m, Math.max(z.x0 + m, x)),
    z: Math.min(z.z1 - m, Math.max(z.z0 + m, zz)),
  };
}

function ratSpawn(ctx, pk, n, at) {
  const a = ctx.random() * 6.283;
  const r = 0.4 + ctx.random() * 0.9;
  return ctx.spawn(`l5-rat-${pk.id}-${n}-${Math.floor(ctx.now() / 1000) % 100000}`, {
    tags: ["moths", "l5rat", "l5-hostile"],
    feetPosition: { x: at.x + Math.cos(a) * r, y: 0.05, z: at.z + Math.sin(a) * r },
    rotation: ctx.random() * 360,
    model: { id: R.model, forward: "+x" },
    layout: { box: { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 0.21, z: 0.5 } } },
    physics: { body: "character", collider: "capsule" },
    fx: { script: EYES },
    state: { ...npcState(ctx, "rat", R.hp, { xp: 12 }), kind: "rat", name: "Death Rat", pack: pk.id },
  });
}

// Scurry gait on the rig's own legs
const LEG = (ph, amp) => ({ pitch: ph ? [amp, -amp, amp] : [-amp, amp, -amp] });
const gait = (dur, amp) => ({
  clip: {
    duration: dur,
    tracks: {
      "tripo::0_Left_Limb_1": LEG(0, amp),
      "tripo::0_Right_Limb_1": LEG(1, amp),
      "tripo::1_Left_Limb_2": LEG(1, amp),
      "tripo::1_Right_Limb_2": LEG(0, amp),
      "tripo::Tail_1": { yaw: [-amp * 0.6, amp * 0.6, -amp * 0.6] },
      "tripo::Spine_2": { roll: [-amp * 0.15, amp * 0.15, -amp * 0.15] },
    },
  },
  loop: true,
});

const GAIT_WALK = gait(0.34, 28);
const GAIT_RUN = gait(0.18, 38);

function setGait(r, m, g) {
  if (m.g === g && m.gv === 2) return;
  m.g = g;
  m.gv = 2;
  r.anim.move = g === "still" ? null : g === "walk" ? GAIT_WALK : GAIT_RUN;
}

export function onSpawn(ctx) {
  ctx.self.state.packs ??= {};
}

export function update(ctx, dt) {
  const now = ctx.now();
  const S = ctx.self.state;
  const mem = (ctx.self.session.m ??= {});
  const packs = (S.packs ??= {});
  const hunt = prey(ctx, now);

  // Screaming event lamp flicker
  if (S.flick) {
    const f = S.flick;
    if (now > f.until) {
      for (const [id, v] of Object.entries(f.orig)) {
        const o = ctx.getObject(id);
        if (o?.light) o.light.intensity = v;
      }
      S.flick = null;
    } else if (now >= (mem.flickNext ?? 0)) {
      mem.flickNext = now + 300 + ctx.random() * 250;
      for (const [id, v] of Object.entries(f.orig)) {
        const o = ctx.getObject(id);
        if (o?.light) o.light.intensity = ctx.random() < 0.55 ? v * 0.04 : v;
      }
    }
  }

  const all = ctx.query({ tags: ["l5rat"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });

  // Group rats by pack in a single pass
  const packRats = new Map();
  for (const r of all) {
    const pkId = r.state?.pack;
    if (pkId) {
      let arr = packRats.get(pkId);
      if (!arr) {
        arr = [];
        packRats.set(pkId, arr);
      }
      arr.push(r);
    }
  }

  for (const pk of R.packs) {
    const P = (packs[pk.id] ??= { phase: "nest", next: now + rnd(ctx, R.outEvery) * 0.4 });
    const mine = packRats.get(pk.id) ?? [];
    const live = mine.filter((r) => !r.state?.dead && (r.state?.hp ?? 1) > 0);

    // Nest refills while they're home
    if (P.phase === "nest" && live.length < pk.size && now >= (P.refill ?? 0)) {
      P.refill = now + 240000;
      for (let i = live.length; i < pk.size; i++) {
        ratSpawn(ctx, pk, i, pk.nest);
      }
    }

    // Up a vent / back down
    if (P.phase === "nest" && now >= P.next && live.length) {
      const VS = R.vents.filter((q) => !isSafe(q.x, q.z)); const v = VS.length ? VS[Math.floor(ctx.random() * VS.length)] : null; if (!v) { P.next = now + 60000; continue; }
      packs[pk.id] = {
        phase: "out",
        vent: v,
        until: now + rnd(ctx, R.outFor),
        scream: ctx.random() < R.screamChance ? now + 8000 + ctx.random() * 30000 : 0,
      };

      for (const r of live) {
        const o = ctx.getObject(r.id);
        if (o) {
          o.feetPosition = {
            x: v.x + (ctx.random() - 0.5) * 0.8,
            y: 0.05,
            z: v.z + (ctx.random() - 0.5) * 0.8,
          };
          mem[r.id] = {};
        }
      }
      ctx.emit("fx", { position: { x: v.x, y: 0.05, z: v.z }, script: VENT_FX });
      heard(ctx, { clip: SND("rats-scrabbling-up-metal-air-vent-grate"), position: { x: v.x, y: 0.3, z: v.z }, volume: 0.9, maxDistance: 26 });
      continue;
    }

    if (P.phase === "out" && (now > P.until || !live.length)) {
      const v = P.vent;
      if (live.every((r) => flat(r.feetPosition, v) < 1.6) || now > P.until + 25000 || !live.length) {
        for (const r of live) {
          const o = ctx.getObject(r.id);
          if (o) {
            o.feetPosition = { x: pk.nest.x + (ctx.random() - 0.5), y: 0.05, z: pk.nest.z + (ctx.random() - 0.5) };
            mem[r.id] = {};
          }
        }
        if (live.length) {
          heard(ctx, { clip: SND("rats-scrabbling-up-metal-air-vent-grate"), position: { x: v.x, y: 0.3, z: v.z }, volume: 0.6, maxDistance: 20 });
        }
        packs[pk.id] = { phase: "nest", next: now + rnd(ctx, R.outEvery) };
        continue;
      }
    }

    // The screaming event
    if (P.phase === "out" && P.scream && now >= P.scream && !P.screamUntil) {
      const c = live.reduce((a, r) => ({ x: a.x + r.feetPosition.x / live.length, z: a.z + r.feetPosition.z / live.length }), { x: 0, z: 0 });
      const z = Z[P.vent.zone];
      const long = z.x1 - z.x0 > z.z1 - z.z0;
      const dir = ctx.random() < 0.5 ? -1 : 1;

      P.screamUntil = now + R.screamMs;
      P.dash = long ? { x: dir, z: 0 } : { x: 0, z: dir };
      packs[pk.id] = { ...P };

      heard(ctx, { clip: SND("pack-of-rats-shrieking-scream-hotel-hallway"), position: { x: c.x, y: 0.4, z: c.z }, volume: 1, maxDistance: 45 });

      if (!S.flick) {
        const orig = {};
        for (const l of ctx.query({ tags: ["l5-light"], radius: R.flickerReach, center: { x: c.x, y: 2, z: c.z } })) {
          const o = ctx.getObject(l.id);
          if (o?.light) orig[l.id] = o.light.intensity;
        }
        S.flick = { until: now + R.flickerMs, orig, at: { x: c.x, z: c.z } };
      }
    }

    const screaming = P.phase === "out" && P.screamUntil && now < P.screamUntil;
    const home = P.phase === "out" ? Z[P.vent.zone] : null;
    const returning = P.phase === "out" && now > P.until;

    for (const r of mine) {
      const m = (mem[r.id] ??= {});
      const pos = r.feetPosition;
      const st = r.state ?? {};
      const vy = (r.velocity?.y ?? 0) - 18 * dt;
      // safe zones: no rats, no rat bodies (creator's rule)
      if (isSafe(pos.x, pos.z)) {
        if (st.dead || (st.hp ?? 1) <= 0) { ctx.destroy(r.id); delete mem[r.id]; continue; }
        const o = ctx.getObject(r.id);
        if (o) { o.feetPosition = { x: pk.nest.x + (ctx.random() - 0.5), y: 0.05, z: pk.nest.z + (ctx.random() - 0.5) }; o.velocity = { x: 0, y: 0, z: 0 }; }
        mem[r.id] = {}; continue;
      }

      if (st.dead || (st.hp ?? 1) <= 0) {
        if (!m.deadAt) {
          m.deadAt = now;
          setGait(r, m, "still");
          becomeCorpse(ctx, r, "Death Rat", ["meat:rat"], killerOf(ctx, pos)?.feetPosition);
          heard(ctx, { maxDistance: 32, refDistance: 5, clip: SND("rat-death-squeal"), position: pos, volume: 0.8 });
          ctx.emit("fx", { position: { ...pos, y: 0.15 }, script: BLOOD });
          const k = killerOf(ctx, pos);
          if (k) {
            k.state.l5rats ??= 0;
            k.state.l5rats += 1;
          }
        }
        if (now - m.deadAt > 300000 || (now - m.deadAt > 3000 && !(r.state.items ?? "").length)) {
          ctx.destroy(r.id);
          delete mem[r.id];
        }
        continue;
      }

      let goal = null;
      let sp = 0;
      let target = null;

      if (P.phase === "nest") {
        if (!m.roam || now > m.until) {
          const a = ctx.random() * 6.283;
          m.roam = { x: pk.nest.x + Math.cos(a) * 1.3, z: pk.nest.z + Math.sin(a) * 1.3 };
          m.until = now + 1500 + ctx.random() * 3500;
          m.rest = ctx.random() < 0.5;
        }
        goal = m.roam;
        sp = m.rest ? 0 : R.walk * 0.6;
      } else if (screaming) {
        goal = { x: pos.x + P.dash.x * 4, z: pos.z + P.dash.z * 4 };
        sp = R.scream;
      } else if (returning) {
        goal = P.vent;
        sp = R.run;
      } else {
        // Read nearest prey once a quarter second
        if (now >= (m.look ?? 0)) {
          m.look = now + 250;
          m.mode = "roam";
          m.prey = null;
          let best = R.sense;
          let p = null;

          for (const h of hunt) {
            const d = flat(h.feetPosition, pos);
            if (d < best) {
              best = d;
              p = h;
            }
          }

          if (p) {
            const s = p.state ?? {};
            const hurt = (s.hp ?? 100) < maxHpOf(s) * R.wounded;
            const armed = s.equipped && s.equipped !== "fists";
            const scared = (s.light && best < R.scareLight) || (armed && !hurt && best < R.scareWeapon);
            if (scared) {
              m.mode = "flee";
              m.prey = p.id;
            } else if (hurt || aloneOf(ctx, p, R.alone)) {
              m.mode = "swarm";
              m.prey = p.id;
            }
          }
        }

        target = m.prey ? hunt.find((h) => h.id === m.prey) : null;

        if (target && m.mode === "flee") {
          const dx = pos.x - target.feetPosition.x;
          const dz = pos.z - target.feetPosition.z;
          const d = Math.hypot(dx, dz) || 1;
          goal = { x: pos.x + (dx / d) * 3, z: pos.z + (dz / d) * 3 };
          sp = R.flee;
        } else if (target && m.mode === "swarm") {
          const a = (Number(r.id.split("-")[3]) || 0) * 1.3;
          goal = { x: target.feetPosition.x + Math.cos(a) * 0.45, z: target.feetPosition.z + Math.sin(a) * 0.45 };
          sp = R.run;

          if (flat(target.feetPosition, pos) < R.reach && now >= (m.bite ?? 0)) {
            m.bite = now + rnd(ctx, R.biteEvery);
            const at = hit(ctx, target, Math.round(rnd(ctx, [R.bite[0], R.bite[1] + 0.99]) - 0.49));
            heard(ctx, { maxDistance: 14, refDistance: 2, clip: SND("small-rat-bite-squeak"), position: at, volume: 0.7, pitch: 0.9 + ctx.random() * 0.3 });
            ctx.emit("fx", { position: { ...at, y: 0.4 }, script: BLOOD });
            ctx.emit("screenShake", { intensity: 0.12, duration: 0.12 }, { audience: { player: target.id } });
          }
        } else {
          if (!m.roam || now > m.until) {
            const z = home;
            const g = inside(z, pos.x + (ctx.random() - 0.5) * 8, pos.z + (ctx.random() - 0.5) * 8);
            m.roam = g;
            m.until = now + 1200 + ctx.random() * 3000;
            m.rest = ctx.random() < 0.35;
          }
          goal = m.roam;
          sp = m.rest ? 0 : R.walk;
        }
      }

      let tgt = goal;
      if (P.phase === "nest" && goal) {
        const way = stepTowardBoiler(pos.x, pos.z, goal.x, goal.z, 20);
        if (way && way.cells > 0) tgt = way.next;
      }

      let dx = tgt.x - pos.x;
      let dz = tgt.z - pos.z;
      const d = Math.hypot(dx, dz);

      if (d < 0.2) {
        sp = 0;
      } else {
        dx /= d;
        dz /= d;
      }

      // Stuck detection: sidestep & repath
      m.sk ??= { x: pos.x, z: pos.z, at: now };
      if (now - m.sk.at > 800) {
        const moved = Math.hypot(pos.x - m.sk.x, pos.z - m.sk.z);
        if (sp > 0.5 && moved < 0.2) {
          m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 500 };
          m.roam = null;
        }
        m.sk = { x: pos.x, z: pos.z, at: now };
      }

      if (m.side && now < m.side.until) {
        const s = m.side.s;
        const curDx = dx;
        const curDz = dz;
        dx = curDx * 0.4 - curDz * s * 0.9;
        dz = curDz * 0.4 + curDx * s * 0.9;
      }

      // Rat separation: avoid clumping (squared distance check)
      for (const o of live) {
        if (o.id === r.id) continue;
        const ox = pos.x - o.feetPosition.x;
        const oz = pos.z - o.feetPosition.z;
        const d2 = ox * ox + oz * oz;

        if (d2 < 0.2025 && d2 > 0.0001) { // 0.45^2
          const od = Math.sqrt(d2);
          const push = ((0.45 - od) / od) * 1.5;
          dx += ox * push;
          dz += oz * push;
        }
      }

      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl;
      dz /= dl;

      // Safe ground constraints
      const nx = pos.x + dx * sp * 0.3;
      const nz = pos.z + dz * sp * 0.3;
      if (sp && (isSafe(nx, nz) || (P.phase === "out" && !screaming && !returning && m.mode !== "swarm" && zoneId(nx, nz) !== home.id))) {
        sp = 0;
        m.roam = null;
      }

      r.velocity = { x: dx * sp, y: vy, z: dz * sp };
      if (sp) r.rotation = yawTo(dx, dz);
      setGait(r, m, sp === 0 ? "still" : sp <= R.walk ? "walk" : "run");

      if (sp > 0 && now >= (m.squeak ?? 0)) {
        m.squeak = now + 4000 + ctx.random() * 9000;
        heard(ctx, { clip: SND("rat-squeaks-and-claws-on-wood-floor"), position: pos, volume: 0.45, pitch: 0.85 + ctx.random() * 0.4, maxDistance: 18 });
      }
    }
  }
}
