import { canStrike } from "./lib/hunt.js";
// Deathmoths: one manager steps every swarm in the place. They hang about home, go for the brightest
// light near (a lit flashlight), wheel round its holder's head, then DIVE: a hit bursts a cloud of wing
// dust across the bitten player's eyes and eats their nerve. They follow the halls cell by cell so they
// never fly through brick, and stay out of Base Gamma. Each swarm is three Blender moths (templates/deathmoths.js).

import { heard } from "./lib/hear.js";
import C from "./lib/data/creatures3.yml";
import { cellAt, cellCenter, zoneAt } from "./lib/level3.js";
import { layout as layout9, zoneAt as zoneAt9 } from "./lib/level9.js";
// Level 9: open suburbs, no maze cells: the swarms stay out of the houses and drift round their home streetlight
let LAY9 = null, T9 = null; const town9 = (seed) => (LAY9 && LAY9.seed === seed ? LAY9 : (LAY9 = layout9(seed)));
const blocked = (x, z) => T9 ? zoneAt9(T9, x, z) !== "l9_street" : cellAt(x, z) == null;
const gammaAt = (x, z) => !T9 && zoneAt(x, z) === "gamma";
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

// variants: a look (wing colour, size, the hum's pitch) and what the bite does on top of the dust
const VFX = (col, n, extra = "") => `fx
pop moths n=?mobile:${Math.round(n * .55)}|${n} local on=sphere(.7) life=1.4..2.8 v=sdir()*(.5..1.2) size=.03..0.06 acc=curl(1.4)*2.6+attract(7)+drag(1.1) sz=$size*flick(14,.5) asp=1.7*flick(18,.65) col=${col} a=(0>.1:1>.85:1>0) rot=spin(1.5) r=sprite(petal,alpha)${extra}`;
const VAR = {
  razorwing: { fx: VFX("oklch(.32 .06 25)..oklch(.45 .09 30)", 22), pitch: 1.2, scale: 1.1 },
  whisperwing: { fx: VFX("oklch(.82 .01 260)..oklch(.95 .01 260)", 26, "\npop glim n=6 local on=sphere(.6) size=.04 col=hdr(1.6,1.7,2) a=.6*flick(3,.5) r=sprite(soft-disc,add)"), pitch: 0.7, scale: 1.2,
    clip: "/cdn/moodboard-gothic-horror/sfx-dry-moth-wings-with-wet-clicking-mandibles-loop.mp3" }, // the spitwing: id kept so saved swarms stay valid
  eyespot: { fx: VFX("oklch(.3 .04 60)..oklch(.4 .05 70)", 30, "\npop eye n=10 local on=sphere(.75) size=.06..0.09 col=hdr(2.6,2.2,.6)*flick(.5,.6) a=.9 sz=$size*flick(.3,.7) r=sprite(soft-disc,add)"), pitch: 0.55, scale: 1.4 },
  choir: { fx: VFX("oklch(.18 .01 20)..oklch(.28 .02 20)", 40, "\npop eye n=14 local on=sphere(.9) size=.05..0.08 col=hdr(3,.4,.3)*flick(.4,.6) a=.9 r=sprite(soft-disc,add)"), pitch: 0.4, scale: 1.7,
    clip: "/cdn/moodboard-gothic-horror/sfx-low-wordless-choir-hum-under-thick-moth-wings-loop.mp3" },
};
const EYES_SEEN = `fx follow=camera
pop eye burst=26 on=box(.9,.5,.6) life=1.6..2.6 size=.03..0.07 col=hdr(2.4,2,.5) a=0>.9:.3>1:.8>0 sz=$size*(1>.2:1>.8:0) r=sprite(soft-disc,add)`;
// Overhaul (Shelly Nov 14; numbers my picks): spitwing keeps its distance and spits; eyespot freezes while watched;
// the choir calls nearby swarms; hurt swarms flee home; swarms on one player take turns diving.
const R = { range: 14, keep: 7, every: 2.4, globSpeed: 9, hitR: 1.2, flee: 0.3, fleeFor: 4, call: 35, callFor: 15000, stare: 0.82 };
const SPIT = `fx
pop glob burst=1 life=%life|1 v=<%vel|0,0,1> size=.16 col=hdr(1.1,1.2,.45) a=1 sz=$size*flick(9,.3) r=sprite(soft-disc,add)
pop drip on=@glob?.7 inh=p life=.3..0.6 v=sdir()*.25 size=.03..0.06 acc=grav()*.6 col=<.55,.6,.28> a=.9>0 r=sprite(soft-disc,alpha)`;
const SPLAT = `fx
pop goo burst=16..22 on=sphere(.15) life=.5..0.9 v=sdir()*(1..2.4)+up(.6) size=.03..0.07 acc=grav()*1.2+drag(1) col=<.6,.66,.3> a=1>.6:1>0 floor=stick r=sprite(soft-disc,alpha)
pop dust burst=6 on=sphere(.25) life=.8..1.3 v=sdir()*(.3..0.7) size=.25..0.45 acc=drag(1.4)+buoy(.2) col=<.5,.5,.32> a=0>.35:.4>0 sz=$size*(.6>1.7) r=sprite(smoke-puff,alpha)`;
const SPIT_SND = "/cdn/moodboard-gothic-horror/sfx-wet-insect-spit-glob-launched-through-air.mp3";
const SPLAT_SND = "/cdn/moodboard-gothic-horror/sfx-wet-dusty-glob-splattering-on-cloth.mp3";
const SNUFF_SND = "/cdn/moodboard-gothic-horror/sfx-moth-wings-smothering-a-flashlight-click-off.mp3";
const headOf = (p) => ({ x: p.feetPosition.x, y: p.feetPosition.y + 1.5, z: p.feetPosition.z });
function watching(p, pos) { // the player's camera points at it
  const yaw = p.camera?.rotation?.yaw; if (yaw == null) return false;
  const r = yaw * Math.PI / 180, fx = -Math.sin(r), fz = -Math.cos(r);
  const dx = pos.x - p.feetPosition.x, dz = pos.z - p.feetPosition.z, d = Math.hypot(dx, dz) || 1;
  return (fx * dx + fz * dz) / d > R.stare;
}
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
  if (ctx.self.place === "level9") { if (ctx.place.state.l9seed == null) { ctx.sleep(1); return; } T9 = town9(ctx.place.state.l9seed); } else T9 = null;
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

  const shots = (ctx.self.session.shots ??= []);
  for (let i = shots.length - 1; i >= 0; i--) {
    const sh = shots[i]; if (now < sh.hitAt) continue; shots.splice(i, 1);
    const p = ctx.place.players.find((q) => q.id === sh.pid);
    const h = p && headOf(p);
    if (h && Math.hypot(h.x - sh.at.x, h.z - sh.at.z) < R.hitR && Math.abs(h.y - sh.at.y) < 1.4 && (p.state.hp ?? 0) > 0) {
      const dmg = dmgAfterArmor(p.state.look, M.bite * 1.4 * sh.mul);
      p.state.hp -= dmg; p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - M.sanity * 3);
      if (p.state.light) { p.state.light = false; ctx.emit("playSound", { clip: SNUFF_SND, volume: 0.8 }, { audience: { player: p.id } }); } // the glob clogs the lamp
      ctx.emit("damageNumber", { position: h, value: dmg, color: "#b6c25a" });
      ctx.emit("fx", { position: h, script: SPLAT });
      ctx.emit("fx", { position: h, script: BLIND }, { audience: { player: p.id } });
      ctx.emit("screenFlash", { color: "#7d8a3c", duration: 0.4, intensity: 0.3 }, { audience: { player: p.id } });
      ctx.emit("cameraPunch", { direction: { x: h.x - sh.from.x, y: 0, z: h.z - sh.from.z }, intensity: 0.4 }, { audience: { player: p.id } });
      p.vignette = 0.3; blur[p.id] = now + 1800;
    } else {
      ctx.emit("fx", { position: { x: sh.at.x, y: Math.max(0.1, sh.at.y - 1.2), z: sh.at.z }, script: SPLAT });
    }
    heard(ctx, { clip: SPLAT_SND, position: sh.at, volume: 0.8, maxDistance: 14 });
  }

  const players = ctx.place.players.filter(
    (p) => !gammaAt(p.feetPosition.x, p.feetPosition.z) && (p.state?.hp ?? 1) > 0
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
      const variant = s.state.variant ?? pickVariant(ctx, "moths"), vm0 = vmul("moths", variant); // leveled list: scripts/lib/data/foe-variants.yml
      const V0 = VAR[variant]; if (V0) { s.fx = { script: V0.fx }; s.scale = V0.scale; if (V0.clip || V0.pitch) s.audio = { clip: V0.clip ?? "/cdn/moodboard-realistic-gritty/sfx-dry-moth-wings-fluttering-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 16, pitch: V0.pitch ?? 1 }; }
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
            model: { id: st.variant === "razorwing" ? "/cdn/value.e78e3e637dccd15d7bdb5c8153ccea4be8be12a45e6fd6257e6419567c848eb2.glb" : MOTH_GLB, forward: "+z" }, // razorwing: its own Tripo body
            ...(st.variant === "razorwing" ? { layout: { box: { min: { x: -0.35, y: 0, z: -0.35 }, max: { x: 0.35, y: 0.5, z: 0.35 } } } } : {}),
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
    if (st.variant === "whisperwing" && st.title !== "Spitwing Swarm") s.state.title = "Spitwing Swarm";
    m.hpMax = Math.max(m.hpMax ?? 0, st.hp);
    if (m.bleed && now >= m.bleed.next) { const bp = ctx.place.players.find((q) => q.id === m.bleed.pid);
      if (bp && (bp.state.hp ?? 0) > 0) { const b = Math.max(1, Math.round(M.bite * 0.6)); bp.state.hp -= b; ctx.emit("damageNumber", { position: { x: bp.feetPosition.x, y: bp.feetPosition.y + 1.2, z: bp.feetPosition.z }, value: b, color: "#a01818" }); ctx.emit("screenFlash", { color: "#5a0000", duration: 0.25, intensity: 0.25 }, { audience: { player: bp.id } }); }
      m.bleed.n--; m.bleed.next = now + 900; if (m.bleed.n <= 0 || !bp) m.bleed = null; }

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

    if (m.call && now < m.call.until) { // the choir sang it here
      const cp = players.find((q) => q.id === m.call.pid);
      const cd = cp ? Math.hypot(cp.feetPosition.x - pos.x, cp.feetPosition.z - pos.z) : 1e9;
      if (cp && cd < R.call + 10 && prey?.id !== cp.id) { prey = cp; best = cd; lit = true; }
    }
    if (st.hp < m.hpMax * R.flee && !m.fled && m.mode !== "dive") { // hurt: it breaks off and flees to its light
      m.fled = true; m.mode = "flee"; m.at = now;
      heard(ctx, { clip: SND("moth-wings-flurry-bite"), position: pos, volume: 0.6, pitch: 1.4, maxDistance: 14 });
    }
    let t = (now - (m.at ?? 0)) / 1000;
    if (m.mode === "flee") { if (t > R.fleeFor) { m.mode = "cruise"; m.at = now; t = 0; } else prey = null; }
    const ranged = st.variant === "whisperwing";

    // State machine transitions
    if (!prey && m.mode !== "cruise" && m.mode !== "recover" && m.mode !== "flee") {
      m.mode = "cruise";
      m.at = now;
    }

    if (ranged && prey && m.mode === "cruise" && best < R.range * vm.sight) {
      m.mode = "range"; m.at = now; m.who = prey.id; m.shotAt = now + 900; m.strafe = ctx.random() < 0.5 ? 1 : -1;
    }
    if (m.mode === "range" && prey && best > R.range * vm.sight * 1.3) { m.mode = "cruise"; m.at = now; }
    if (!ranged && prey && m.mode === "cruise" && best < D.diveFrom) {
      if (st.variant === "choir" && now > (m.calledAt ?? 0)) { // it sings, and every swarm near comes to the song
        m.calledAt = now + R.callFor;
        for (const o of allSwarms) {
          if (o.id === s.id || Math.hypot(o.feetPosition.x - pos.x, o.feetPosition.z - pos.z) > R.call) continue;
          const om = (mem[o.id] ??= { bob: ctx.random() * 6, spin: ctx.random() * 360, mode: "cruise" });
          om.call = { pid: prey.id, until: now + R.callFor };
        }
        heard(ctx, { clip: "/cdn/moodboard-gothic-horror/sfx-low-wordless-choir-hum-under-thick-moth-wings-loop.mp3", position: pos, volume: 1, pitch: 1.3, maxDistance: R.call });
      }
      m.off ??= ctx.random() * 6.283;
      m.mode = "circle";
      m.at = now;
      m.circleFor = D.circleFor[0] + ctx.random() * (D.circleFor[1] - D.circleFor[0]);
      m.who = prey.id;
    }

    const stared = st.variant === "eyespot" && prey && m.mode === "circle" && watching(prey, pos);
    if (stared) { // watched, it holds still and stares back; your nerve drains
      m.circleFor = Math.max(m.circleFor, t + 0.3);
      if (now > (m.drainAt ?? 0)) { m.drainAt = now + 1000; prey.state.sanity = Math.max(0, (prey.state.sanity ?? 100) - M.sanity * 1.5); }
    } else if (st.variant === "eyespot" && m.mode === "circle" && m.wasStared) m.circleFor = Math.min(m.circleFor, t + 0.25); // look away and it comes
    m.wasStared = stared;
    const tok = (mem.tok ??= {});
    if (m.mode === "circle" && prey && t > m.circleFor && tok[prey.id] && tok[prey.id].by !== s.id && now < tok[prey.id].until) {
      m.circleFor = t + 0.5 + ctx.random(); // another swarm is diving: wait your turn
    }
    if (m.mode === "circle" && prey && t > m.circleFor) {
      tok[prey.id] = { by: s.id, until: now + D.diveFor * 1000 + 300 };
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

    if (m.mode === "cruise" || m.mode === "circle" || m.mode === "range" || m.mode === "flee") {
      setSwarmClip(ctx, s, m, "Flutter");
    }

    m.bob += dt * 2.3;
    m.spin += (m.mode === "dive" ? D.spinFast : D.spin) * dt;

    let nx = pos.x;
    let nz = pos.z;
    let ny = FLY_Y + Math.sin(m.bob) * 0.18;
    const head = prey ? { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.5, z: prey.feetPosition.z } : null;

    if (m.mode === "range" && head) { // spitwing: hold a ring at range, strafe, spit when it sees you
      const ax = pos.x - head.x, az = pos.z - head.z, al = Math.hypot(ax, az) || 1;
      const ux = ax / al, uz = az / al;
      const gx = head.x + ux * R.keep - uz * m.strafe * 3, gz = head.z + uz * R.keep + ux * m.strafe * 3;
      const dx = gx - pos.x, dz = gz - pos.z, d = Math.hypot(dx, dz);
      const sp = M.chase * vm.speed * (al < 3.5 ? 1.8 : 1);
      if (d > 0.05) { const k = Math.min(d, sp * dt) / d; nx += dx * k; nz += dz * k; }
      ny = pos.y + (2.6 + Math.sin(m.bob) * 0.25 - pos.y) * Math.min(1, dt * 3);
      if (now > m.shotAt) {
        const from = { x: pos.x, y: pos.y, z: pos.z };
        if (canStrike(ctx, { x: from.x, y: from.y - 1, z: from.z }, prey, R.range * 1.4, [s.id, prey.id])) {
          const L = Math.hypot(head.x - from.x, head.y - from.y, head.z - from.z) || 1, dur = L / R.globSpeed;
          const vel = { x: (head.x - from.x) / dur, y: (head.y - from.y) / dur, z: (head.z - from.z) / dur };
          ctx.emit("fx", { position: from, script: SPIT, params: { vel, life: dur } }, { audience: { nearby: from, radius: 40 } });
          heard(ctx, { clip: SPIT_SND, position: from, volume: 0.9, maxDistance: 20 });
          shots.push({ pid: prey.id, at: { ...head }, from, hitAt: now + dur * 1000, mul: vm.dmg });
          m.shotAt = now + (R.every + ctx.random() * 0.8) * 1000;
          if (ctx.random() < 0.35) m.strafe = -m.strafe;
        } else m.shotAt = now + 400;
      }
    } else if (m.mode === "circle" || m.mode === "dive" || (m.mode === "recover" && head)) {
      // Close air combat around the player's head
      let gx;
      let gz;
      let gy;
      let sp;

      if (m.mode === "circle") {
        const a = stared ? (m.frozenA ??= Math.atan2(pos.z - head.z, pos.x - head.x)) : (m.frozenA = undefined, (now / 1000) * 1.6 + (m.off ?? 0));
        gx = head.x + Math.cos(a) * D.circleR;
        gz = head.z + Math.sin(a) * D.circleR;
        gy = D.circleY + Math.sin(m.bob) * 0.2;
        sp = stared ? 0.4 : (M.chase * vm.speed) * 1.4;
      } else if (m.mode === "dive") {
        gx = head.x;
        gz = head.z;
        gy = head.y;
        sp = D.diveSpeed * (st.variant === "eyespot" ? 1.4 : 1);
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

      if (m.mode === "dive") {
        const p = ctx.place.players.find((q) => q.id === m.who);
        const hd = p
          ? Math.hypot(p.feetPosition.x - nx, p.feetPosition.z - nz) + Math.abs(p.feetPosition.y + 1.5 - ny) * 0.5
          : 99;

        if (p && hd < D.hitAt && canStrike(ctx, { x: nx, y: ny - 1, z: nz }, p, D.hitAt + 0.5, [s.id, p.id])) {
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
          const v = st.variant;
          if (v === "razorwing" || v === "choir") m.bleed = { pid: p.id, n: v === "choir" ? 5 : 3, next: now + 900 }; // cuts that keep bleeding
          if (v === "eyespot" || v === "choir") { // its wings smother your light
            if (p.state.light) p.state.light = false;
            p.state.sanity = Math.max(0, p.state.sanity - M.sanity * 4);
            ctx.emit("playSound", { clip: SNUFF_SND, volume: 0.9 }, { audience: { player: p.id } });
          }
          if (v === "eyespot" || v === "choir") { // the eyes on its wings stay on yours
            ctx.emit("fx", { position: at, script: EYES_SEEN }, { audience: { player: p.id } });
            ctx.emit("screenShake", { intensity: 0.35, duration: 0.6 }, { audience: { player: p.id } });
            p.state.sanity = Math.max(0, p.state.sanity - M.sanity * 6); p.vignette = 0.6; blur[p.id] = now + 4500;
          }
          if (v === "choir" && !st.split && ctx.query({ tags: ["moths"], radius: 30, center: pos }).length < 6) { // bitten, it sings and splits in two
            s.state.split = true;
            ctx.spawn({ template: "templates/deathmoths.js#swarm", feetPosition: { x: pos.x + 1, y: pos.y, z: pos.z }, state: { home: { ...home }, variant: "eyespot", split: true } });
            heard(ctx, { clip: "/cdn/moodboard-gothic-horror/sfx-wordless-choir-swell-into-tearing-wings.mp3", position: pos, volume: 1, maxDistance: 22 });
          }
          setSwarmClip(ctx, s, m, "Bite");
          m.mode = "recover";
          m.at = now;
          if (v === "razorwing") { m.combo = !m.combo; if (m.combo) m.at = now - (D.recoverFor - 0.45) * 1000; } // a second cut right behind the first
          if (tok[p.id]?.by === s.id) delete tok[p.id];
        } else if (t > D.diveFor) {
          setSwarmClip(ctx, s, m, "Flutter");
          m.mode = "recover";
          m.at = now;
        }
      }
    } else {
      let goal;
      let sp = (M.speed * vm.speed);

      if (m.mode === "flee") {
        goal = home; sp = M.chase * vm.speed * 1.5;
      } else if (prey) {
        goal = prey.feetPosition;
        sp = lit ? (M.chase * vm.speed) : (M.speed * vm.speed) * 1.2;
      } else {
        if (!m.wander || now > m.wanderUntil) {
          const hc = T9 ? null : cellAt(home.x, home.z);
          const c = hc ? cellNear(() => ctx.random(), hc.cx, hc.cz, M.roam) : null;
          const cc = c ? cellCenter(c[0], c[1]) : T9 ? { x: home.x + (ctx.random() - 0.5) * 14, z: home.z + (ctx.random() - 0.5) * 14 } : home;
          m.wander = {
            x: cc.x + (ctx.random() - 0.5) * 1.6,
            z: cc.z + (ctx.random() - 0.5) * 1.6,
          };
          m.wanderUntil = now + 5000 + ctx.random() * 5000;
        }
        goal = m.wander;
      }

      if (T9) m.plan = { cells: 0 }; // Level 9 is open street: steer straight, the slide below keeps it out of the houses
      else if (!m.plan || now > m.planAt || m.planFor !== (prey?.id ?? "wander")) {
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

    if (blocked(nx, nz) && !blocked(pos.x, pos.z)) { // slide along a wall instead of sticking to it
      if (!blocked(nx, pos.z)) nz = pos.z;
      else if (!blocked(pos.x, nz)) nx = pos.x;
      else { nx = pos.x; nz = pos.z; }
    }

    // Base Gamma boundary check
    if (gammaAt(nx, nz)) {
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
