// Deathmoths: one manager steps every swarm in the place. They hang about home, go for the brightest
// light near (a lit flashlight), wheel round its holder's head, then DIVE: a hit bursts a cloud of wing
// dust across the bitten player's eyes and eats their nerve. They follow the halls cell by cell so they
// never fly through brick, and stay out of Base Gamma. Each swarm is three Blender moths (templates/deathmoths.js).

import { heard } from "./lib/hear.js";
import C from "./lib/data/creatures3.yml";
import { cellAt, cellCenter, zoneAt } from "./lib/level3.js";
import { stepToward, cellNear } from "./lib/maze3path.js";
import { npcState, dmgAfterArmor } from "./lib/stats.js";
import { MOTH_GLB } from "../templates/deathmoths.js";
import { pickVariant, vmul } from "./lib/foe-variant.js";

const M = C.moths;
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;

const BITE = `fx
pop moths burst=6..10 life=.5..1 v=sdir()*(1..2.2)+up(.5) size=.03..0.05 acc=curl(2)*2+drag(1.5) col=oklch(.5 .03 75) sz=$size*flick(18,.7) a=1>.7:1>0 r=sprite(petal,alpha)`;

const STRAY = `fx
pop moths burst=4..7 life=1.4..2.2 v=up(.6..1.2)+sdir()*(.8..1.6) size=.03..0.05 acc=curl(1.4)*2+drag(.6) col=oklch(.5 .03 75) sz=$size*flick(16,.7) a=1>.8:1>0 r=sprite(petal,alpha)`;

const DEATH = `fx
pop moths burst=50..70 on=sphere(.5) life=1.2..2 v=sdir()*(.3..1.2) size=.03..0.06 spin=-8..8 acc=grav()*.7+drag(1.2) col=oklch(.38 .025 70)..oklch(.55 .03 80) a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(petal,alpha)
pop dust burst=10 on=sphere(.4) life=1..1.6 v=sdir()*(.2..0.5) size=.2..0.4 acc=drag(1.4)+buoy(.2) col=<.5,.46,.38> a=0>.3:.4>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;

const FLY_Y = 1.1;
const D = {
  circleR: 1.7,
  circleY: 2.0,
  circleFor: [1.6, 3.0],
  diveFrom: 4.5,
  diveSpeed: 7.5,
  diveFor: 1.4,
  hitAt: 0.8,
  recoverFor: 1.5,
  blurFor: 2.6,
  spin: 150,
  spinFast: 420,
};

// The hit: wing dust thrown off the bite, and a second cloud hung in front of player's eyes
const DUST = `fx
pop dust burst=18..24 on=sphere(.3) life=1.2..2.2 v=sdir()*(.6..1.6) size=.35..0.7 acc=drag(1.6)+buoy(.15)+curl(.4) col=<.55,.5,.42>><.4,.36,.3> a=0>.45:.5>0 sz=$size*(.6>2) rot=spin(.3) r=sprite(smoke-puff,alpha)
pop scales burst=30..40 on=sphere(.25) life=.8..1.6 v=sdir()*(1..2.4) size=.01..0.02 acc=grav()*.2+drag(1.2)+curl(1) col=<.75,.68,.55> a=1>.6:1>0 r=sprite(mote,alpha)`;

const BLIND = `fx follow=camera
pop veil burst=16 on=box(.5,.35,.5) life=1.8..2.6 v=sdir()*.08 size=.35..0.6 acc=drag(2) col=<.5,.45,.37> a=0>.6:.55>0 sz=$size*(.8>1.4) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop scales burst=24 on=box(.5,.35,.5) life=1.4..2.4 v=sdir()*.2 size=.008..0.016 acc=grav()*.15+drag(1.5) col=<.8,.72,.58> a=1>.7:1>0 r=sprite(mote,alpha)`;

const kids = (ctx, id) => [0, 1, 2].map((i) => ctx.place.objects[`${id}/m${i}`]).filter(Boolean);

function setSwarmClip(ctx, s, m, name, opt = {}) {
  if (m.clip === name) return;
  m.clip = name;
  for (const k of kids(ctx, s.id)) {
    k.anim.main = { clip: name, loop: name === "Flutter", ...opt };
  }
}

export function update(ctx, dt) {
  if (!ctx.place.players.length) { ctx.sleep(2); return; }
  const now = ctx.now();
  const mem = (ctx.self.session.m ??= {});
  const blur = (ctx.self.session.blur ??= {});

  for (const pid in blur) {
    if (now > blur[pid]) {
      const p = ctx.place.players.find((q) => q.id === pid);
      if (p) p.vignette = 0;
      delete blur[pid];
    }
  }

  const players = ctx.place.players.filter(
    (p) => zoneAt(p.feetPosition.x, p.feetPosition.z) !== "gamma" && (p.state?.hp ?? 1) > 0
  );

  if (!mem.mothsAt || now > mem.mothsAt || !mem.allSwarms) {
    mem.mothsAt = now + 1200;
    mem.allSwarms = ctx.query({ tags: ["moths"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  }
  const allSwarms = mem.allSwarms;

  for (const s of allSwarms) {
    const m = (mem[s.id] ??= {
      bob: ctx.random() * 6,
      spin: ctx.random() * 360,
      mode: "cruise",
    });
    const pos = s.feetPosition;
    const st = s.state ?? {};
    const vm = vmul("moths", st.variant);

    if (st.hp == null && !st.dead) {
      const variant = pickVariant(ctx, "moths"), vm0 = vmul("moths", variant); // leveled list: scripts/lib/data/foe-variants.yml
      Object.assign(s.state, npcState(ctx, "moths", Math.round(M.hp * vm0.hp), { xp: Math.round(M.xp * vm0.xp), variant, ...(vm0.name ? { title: vm0.name } : {}) }));
      continue;
    }

    if (!m.kids) {
      m.kids = true;
      if (!kids(ctx, s.id).length) {
        [0, 120, 240].forEach((a, i) =>
          ctx.spawn({
            id: `m${i}`,
            parent: s.id,
            model: { id: MOTH_GLB, forward: "+z" },
            castShadow: false,
            feetPosition: {
              x: Math.cos((a * Math.PI) / 180) * 0.75,
              y: [-0.1, 0.25, 0.05][i],
              z: Math.sin((a * Math.PI) / 180) * 0.75,
            },
            rotation: { yaw: -a, roll: [-14, 10, -6][i] },
            scale: [1, 0.85, 0.92][i],
          })
        );
      }
    }

    if (st.dead || st.hp <= 0) {
      // Death spiral to floor
      if (!m.deadAt) {
        m.deadAt = now;
        m.y0 = pos.y;
        if (!st.dead) s.state.dead = true;
        s.fx = null;
        s.audio = null;
        setSwarmClip(ctx, s, m, "Death", { clampWhenFinished: true });
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.4, z: pos.z }, script: DEATH });
        heard(ctx, { maxDistance: 14, refDistance: 2, clip: SND("dusty-paper-moths-crumble-burst"), position: pos, volume: 0.8 });
      } else if (now - m.deadAt < 1600) {
        const k = (now - m.deadAt) / 1600;
        m.spin += D.spinFast * (1 - k) * dt;
        s.feetPosition = { x: pos.x, y: Math.max(0.05, m.y0 * (1 - k * k)), z: pos.z };
        s.rotation = { yaw: m.spin };
      } else if (now - m.deadAt > 2600 && !m.gone && now > (st.inspectUntil ?? 0)) {
        m.gone = true;
        ctx.destroy(s.id);
      }
      continue;
    }

    const home = st.home ?? (s.state.home = { x: pos.x, z: pos.z });

    // Target selection: lit flashlight takes priority over unlit nearby players
    let prey = null;
    let best = Infinity;
    let lit = false;

    for (const p of players) {
      const dx = p.feetPosition.x - pos.x;
      const dz = p.feetPosition.z - pos.z;
      const d2 = dx * dx + dz * dz;
      const on = !!p.state?.light;
      const reach = on ? M.lightReach : M.nearReach;

      if (d2 > reach * reach) continue;

      const d = Math.sqrt(d2);
      if ((on && !lit) || (on === lit && d < best)) {
        best = d;
        prey = p;
        lit = on;
      }
    }

    const t = (now - (m.at ?? 0)) / 1000;

    // State machine transitions
    if (!prey && m.mode !== "cruise" && m.mode !== "recover") {
      m.mode = "cruise";
      m.at = now;
    }

    if (prey && m.mode === "cruise" && best < D.diveFrom) {
      m.mode = "circle";
      m.at = now;
      m.circleFor = D.circleFor[0] + ctx.random() * (D.circleFor[1] - D.circleFor[0]);
      m.who = prey.id;
    }

    if (m.mode === "circle" && prey && t > m.circleFor) {
      m.mode = "dive";
      m.at = now;
      m.who = prey.id;
      setSwarmClip(ctx, s, m, "Dive", { clampWhenFinished: true });
      heard(ctx, { clip: SND("moth-wings-flurry-bite"), position: pos, volume: 0.7, pitch: 0.75, maxDistance: 14 });
    }

    if (m.mode === "recover" && t > D.recoverFor) {
      m.mode = prey ? "circle" : "cruise";
      m.at = now;
      m.circleFor = 1.5 + ctx.random() * 2;
    }

    if (m.mode === "cruise" || m.mode === "circle") {
      setSwarmClip(ctx, s, m, "Flutter");
    }

    m.bob += dt * 2.3;
    m.spin += (m.mode === "dive" ? D.spinFast : D.spin) * dt;

    let nx = pos.x;
    let nz = pos.z;
    let ny = FLY_Y + Math.sin(m.bob) * 0.18;
    const head = prey ? { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.5, z: prey.feetPosition.z } : null;

    if (m.mode === "circle" || m.mode === "dive" || (m.mode === "recover" && head)) {
      // Close air combat around the player's head
      let gx;
      let gz;
      let gy;
      let sp;

      if (m.mode === "circle") {
        const a = (now / 1000) * 1.6 + (m.bob % 6);
        gx = head.x + Math.cos(a) * D.circleR;
        gz = head.z + Math.sin(a) * D.circleR;
        gy = D.circleY + Math.sin(m.bob) * 0.2;
        sp = (M.chase * vm.speed) * 1.4;
      } else if (m.mode === "dive") {
        gx = head.x;
        gz = head.z;
        gy = head.y;
        sp = D.diveSpeed;
      } else {
        const ax = pos.x - head.x;
        const az = pos.z - head.z;
        const al = Math.hypot(ax, az) || 1;
        gx = pos.x + (ax / al) * 2;
        gz = pos.z + (az / al) * 2;
        gy = 2.3;
        sp = 3;
      }

      const dx = gx - pos.x;
      const dz = gz - pos.z;
      const d = Math.hypot(dx, dz);

      if (d > 0.05) {
        const k = Math.min(d, sp * dt) / d;
        nx += dx * k;
        nz += dz * k;
      }

      ny = pos.y + (gy - pos.y) * Math.min(1, dt * (m.mode === "dive" ? 8 : 3));
      if (cellAt(nx, nz) == null) {
        nx = pos.x;
        nz = pos.z;
      }

      if (m.mode === "dive") {
        const p = ctx.place.players.find((q) => q.id === m.who);
        const hd = p
          ? Math.hypot(p.feetPosition.x - nx, p.feetPosition.z - nz) + Math.abs(p.feetPosition.y + 1.5 - ny) * 0.5
          : 99;

        if (p && hd < D.hitAt) {
          const dmg = dmgAfterArmor(p.state.look, M.bite * 2 * vm.dmg);
          p.state.hp -= dmg;
          p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - M.sanity * 4);
          const at = { x: p.feetPosition.x, y: p.feetPosition.y + 1.5, z: p.feetPosition.z };

          ctx.emit("damageNumber", { position: at, value: dmg, color: "#c8b48a" });
          ctx.emit("fx", { position: at, script: DUST });
          ctx.emit("fx", { position: at, script: BLIND }, { audience: { player: p.id } });
          ctx.emit("screenFlash", { color: "#8a7a5c", duration: 0.5, intensity: 0.35 }, { audience: { player: p.id } });
          heard(ctx, { clip: SND("moth-wings-flurry-bite"), position: at, volume: 1, maxDistance: 14 });

          p.vignette = 0.3;
          blur[p.id] = now + D.blurFor * 1000;
          setSwarmClip(ctx, s, m, "Bite");
          m.mode = "recover";
          m.at = now;
        } else if (t > D.diveFor) {
          setSwarmClip(ctx, s, m, "Flutter");
          m.mode = "recover";
          m.at = now;
        }
      }
    } else {
      let goal;
      let sp = (M.speed * vm.speed);

      if (prey) {
        goal = prey.feetPosition;
        sp = lit ? (M.chase * vm.speed) : (M.speed * vm.speed) * 1.2;
      } else {
        if (!m.wander || now > m.wanderUntil) {
          const hc = cellAt(home.x, home.z);
          const c = cellNear(() => ctx.random(), hc.cx, hc.cz, M.roam);
          const cc = c ? cellCenter(c[0], c[1]) : home;
          m.wander = {
            x: cc.x + (ctx.random() - 0.5) * 1.6,
            z: cc.z + (ctx.random() - 0.5) * 1.6,
          };
          m.wanderUntil = now + 5000 + ctx.random() * 5000;
        }
        goal = m.wander;
      }

      if (!m.plan || now > m.planAt || m.planFor !== (prey?.id ?? "wander")) {
        m.plan = stepToward(pos.x, pos.z, goal.x, goal.z, M.giveUp);
        m.planAt = now + 500;
        m.planFor = prey?.id ?? "wander";
        if (!m.plan) {
          prey = null;
          m.wander = null;
        }
      }

      const tgt = m.plan ? (m.plan.cells === 0 ? goal : m.plan.next) : null;
      if (tgt) {
        const dx = tgt.x - pos.x;
        const dz = tgt.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.15) {
          const k = Math.min(d, sp * dt) / (d || 1);
          nx += dx * k;
          nz += dz * k;
        }
        if (d < 0.4 && m.plan.cells > 0) {
          m.planAt = 0; // reached corner, advance immediately
        }
      }

      // Swarm separation: avoid clustering (squared distance optimization)
      for (const other of allSwarms) {
        if (other.id === s.id) continue;
        const ox = pos.x - other.feetPosition.x;
        const oz = pos.z - other.feetPosition.z;
        const d2 = ox * ox + oz * oz;

        if (d2 < 4.84 && d2 > 0.0001) { // 2.2^2
          const od = Math.sqrt(d2);
          const push = ((2.2 - od) / od) * dt * 1.5;
          nx += ox * push;
          nz += oz * push;
        }
      }

      ny = pos.y + (ny - pos.y) * Math.min(1, dt * 3);
    }

    // Base Gamma boundary check
    if (zoneAt(nx, nz) === "gamma") {
      nx = pos.x;
      nz = pos.z;
    }

    s.feetPosition = { x: nx, y: ny, z: nz };
    s.rotation = { yaw: m.spin };

    if (now > (m.strayAt ?? (m.strayAt = now + 4000 + ctx.random() * 6000))) {
      m.strayAt = now + (M.strayEvery[0] + ctx.random() * (M.strayEvery[1] - M.strayEvery[0])) * 1000;
      ctx.emit("fx", { position: { x: nx, y: ny + 0.4, z: nz }, script: STRAY }, { audience: { nearby: { x: nx, y: 1, z: nz }, radius: 30 } });
    }
  }

  for (const id in mem) {
    if (mem[id].gone && now - mem[id].deadAt > 5000) {
      delete mem[id];
    }
  }
}
