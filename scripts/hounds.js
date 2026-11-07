// Level 1's hounds: one manager steps the pack. They roam the halls, hunt when they see or hear you,
// hunt harder in a Flickering, and never cross into the corridors (safe ground).
import L from "./lib/data/level1.yml";
import { zoneAt, safeZone, cellCenter, N } from "./lib/level1.js";
import { zoneAt as zoneAt2 } from "./lib/level2.js";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";
import { zoneAt as zoneAt3, cellAt as cellAt3, cellCenter as cellCenter3, openings as openings3 } from "./lib/level3.js";
import { stepToward, cellNear } from "./lib/maze3path.js";
import C from "./lib/data/creatures3.yml";
const H3 = C.hounds3;
const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
// The body: a rigged Blender mesh (art/hound/build.py) with its own clips; every row the sims spawn wears it.
const MODEL = "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb";
// The hunt, every level: howl once on sight (calls hounds within callRadius), pounce from pounceRange, maul, bleed.
const T = { callRadius: 30, callHold: 12, howlMs: 1300, pounceRange: 5, pounceMin: 1.8, pounceMs: 550, pounceSpeed: 10, pounceLift: 4.5, pounceCd: 4000,
  pounceDmg: 1.2, knock: 9, playerStunMs: 500, maulMs: 1100, bleedMs: 4000, bleedDmg: 2, staggerMs: 0, deathMs: 2600 };
const anim = (h, m, clip, loop = true, speed = 1) => { if (m.clip === clip) return; m.clip = clip; h.anim.main = { clip, loop, speed, clampWhenFinished: !loop, weight: 1 }; };
function hitPrey(ctx, h, prey, dmg, now, color = "#ff5040") {
  prey.state.hp -= dmgAfterArmor(prey.state.look, dmg); // worn clothes soak the hit (lib/clothes.yml DR)
  const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z };
  ctx.emit("damageNumber", { position: at, value: dmg, color });
  return at;
}
const POOF = `fx
pop dust burst=16 life=.6..1 on=box(.5,.5,.8).c(.5) v=sdir()*(.4..1)+up(.4) size=.2..0.4 acc=drag(1.4) col=<.4,.38,.36> a=0>.4:.5>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;
const BLOOD = `fx
pop drip burst=6..9 life=.4..0.7 v=sdir()*(.6..1.4)+up(.3) size=.03..0.06 acc=grav()*.8 col=<.35,.02,.03> a=1>0 sz=$size floor=die r=sprite(soft-disc,alpha)`;
export function update(ctx, dt) {
  const L3 = ctx.self.place === "level3";
  const safeAt = L3 ? (x, z) => zoneAt3(x, z) === "gamma" : ctx.self.place === "level2" ? (x, z) => zoneAt2(x, z) === "camp" : (x, z) => safeZone(zoneAt(x, z));
  const now = ctx.now(), dark = ctx.place.state.flicker === "dark", mem = (ctx.self.session.m ??= {});
  const players = ctx.place.players.filter((p) => !safeAt(p.feetPosition.x, p.feetPosition.z) && !(p.state?.downAt && now - p.state.downAt < 2000));
  const byId = (id) => players.find((p) => p.id === id) ?? ctx.place.players.find((p) => p.id === id) ?? ctx.query({ tags: ["npc"], radius: 80, center: { x: 0, y: 0, z: 0 } }).find((n) => n.id === id) ?? null;
  for (const h of ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const m = (mem[h.id] ??= {}), pos = h.feetPosition, st = h.state ?? {}, mu = npcMul(st);
    if (now >= (m.meshChk ?? 0)) { m.meshChk = now + 2000; const o = ctx.getObject(h.id); if (o && !String(o.model?.id ?? o.model ?? "").includes(MODEL.slice(5))) { o.primitive = null; o.model = { id: MODEL }; } } // the old coded body gives way to the mesh
    if (m.bleed && now >= m.bleed.next) { // the maul's wound: 2 a second for 4 s, dealt from here
      const v = now < m.bleed.until ? byId(m.bleed.id) : null;
      if (v && !v.state?.dead && (v.state?.hp ?? 0) > 0) { hitPrey(ctx, h, v, T.bleedDmg, now, "#a0101a"); ctx.emit("fx", { position: { x: v.feetPosition.x, y: v.feetPosition.y + 0.9, z: v.feetPosition.z }, script: BLOOD }); m.bleed.next = now + 1000; }
      else m.bleed = null;
    }
    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!m.deadAt) { m.deadAt = now; anim(h, m, "death", false); h.velocity = { x: 0, y: -2, z: 0 }; ctx.emit("playSound", { clip: SND("hound-death-yelp"), position: pos, volume: 0.8 }); }
      else if (!m.gone && now - m.deadAt > T.deathMs) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.4, z: pos.z }, script: POOF }); ctx.destroy(h.id); }
      continue;
    }
    if (now < (st.stunUntil ?? 0)) { // the baton: it reels, no step and no bite until it clears
      anim(h, m, "stagger", true); h.velocity = { x: 0, y: (h.velocity?.y ?? 0) - 20 * dt, z: 0 }; m.pounceAt = 0; m.maulUntil = 0; continue;
    }
    if (m.pounceAt && now - m.pounceAt < T.pounceMs) { // mid-leap: the body flies; contact lands the blow once
      const v = byId(m.pounceOn);
      if (v && !m.pounceHit && Math.hypot(v.feetPosition.x - pos.x, v.feetPosition.z - pos.z) < 1.5) {
        m.pounceHit = true; const dmg = Math.round(L.houndBite * mu.dmg * T.pounceDmg), at = hitPrey(ctx, h, v, dmg, now);
        const kx = v.feetPosition.x - pos.x, kz = v.feetPosition.z - pos.z, kd = Math.hypot(kx, kz) || 1;
        ctx.emit("impulse", { target: v.id, impulse: { x: kx / kd * T.knock * 70, y: 220, z: kz / kd * T.knock * 70 } });
        v.state.stunUntil = now + T.playerStunMs;
        ctx.emit("playSound", { clip: SND("hound-bite-snap"), position: at, volume: 1 });
        ctx.emit("screenShake", { intensity: 0.6, duration: 0.35 }, { audience: { player: v.id } });
        ctx.emit("cameraPunch", { direction: { x: kx / kd, y: 0.3, z: kz / kd }, intensity: 0.8 }, { audience: { player: v.id } });
        ctx.emit("hitstop", { duration: 0.04 }, { audience: { player: v.id } });
        m.maulUntil = now + T.maulMs; m.maulOn = v.id; m.next = now + 400;
      }
      continue;
    }
    if (m.pounceAt) { m.pounceAt = 0; if (!m.pounceHit) m.clip = null; }
    if (now < (m.howlUntil ?? 0)) { h.velocity = { x: 0, y: (h.velocity?.y ?? 0) - 20 * dt, z: 0 }; continue; } // rearing back, jaw open
    const sight = L.houndSight * mu.sight * (dark ? L.houndSightFlicker : 1);
    let prey = null, best = Infinity;
    for (const p of [...players, ...ctx.query({ tags: ["npc"], radius: sight, center: pos }).filter((n) => !n.state?.dead)]) { // agents are meat too
      const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
      const loud = (p.state?.sprinting ? L.houndHear : 0) || (dark && p.state?.light ? L.houndHearLight : 0);
      if (d < Math.max(sight, loud) * sn(p) && d < best) { best = d; prey = p; }
    }
    if (st.horde) { const hp = players.find((p) => p.id === st.horde); if (hp) { prey = hp; best = Math.hypot(hp.feetPosition.x - pos.x, hp.feetPosition.z - pos.z); } } // a blackout horde hunts its player
    if (L3) { // brigades: share the spotter's prey, and lie in wait in dead ends
    }
    if (prey && !m.hunting && !m.howled) { // it HOWLS once on sight: head back, jaw wide, and every hound in 30 m comes
      m.howled = true; m.howlUntil = now + T.howlMs; anim(h, m, "howl", false);
      h.rotation = { yaw: Math.atan2(-(prey.feetPosition.x - pos.x), -(prey.feetPosition.z - pos.z)) * 57.2958 };
      ctx.emit("playSound", { clip: SND("hound-bark-howl-call"), position: pos, volume: 1, maxDistance: 60 });
      for (const o of ctx.query({ tags: ["hound"], radius: T.callRadius, center: pos })) if (o.id !== h.id) { const om = (mem[o.id] ??= {}); om.pack = prey.id; om.packUntil = now + T.callHold * 1000; om.howled = true; }
    }
    if (!prey && m.pack && now < m.packUntil) { prey = players.find((p) => p.id === m.pack) ?? ctx.query({ tags: ["npc"], radius: 60, center: pos }).find((n) => n.id === m.pack && !n.state?.dead) ?? null; if (prey) best = Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z); }
    if (L3) {
      if (!prey) { // ambush: crouched in a dead end until someone walks past or turns their back
        m.home ??= { x: pos.x, z: pos.z };
        if (!m.lurkAt) { const hc = cellAt3(m.home.x, m.home.z), c = cellNear(() => ctx.random(), hc.cx, hc.cz, H3.lurkSearch, (x, z) => openings3(x, z).length === 1); m.lurkAt = c ? cellCenter3(c[0], c[1]) : m.home; }
        if (Math.hypot(m.lurkAt.x - pos.x, m.lurkAt.z - pos.z) < 0.8) {
          if (!st.lurk) { h.state.lurk = true; h.scale = { x: 1, y: H3.lurkScale, z: 1 }; }
          for (const p of players) {
            const dx = pos.x - p.feetPosition.x, dz = pos.z - p.feetPosition.z, d = Math.hypot(dx, dz), yaw = (p.camera?.rotation?.yaw ?? 0) / 57.2958;
            const back = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) < 0; // the hound is behind where they look
            if (d < H3.pounceNear * sn(p) || (back && d < H3.pounceBack * sn(p))) { prey = p; best = d; m.pounceUntil = now + H3.pounceTime * 1000; break; }
          }
        }
      }
      if (prey && st.lurk) { h.state.lurk = false; h.scale = 1; m.lurkAt = null; }
      if (!prey && m.hunting) m.lurkAt = null; // a lost hunt picks a fresh hiding spot
    }
    let goal;
    if (prey) goal = prey.feetPosition;
    else if (L3 && m.lurkAt) goal = m.lurkAt;
    else { if (!m.roam || now > m.until) { const a = ctx.random() * 6.283; m.roam = { x: pos.x + Math.cos(a) * 14, z: pos.z + Math.sin(a) * 14 }; m.until = now + 4000; } goal = m.roam; }
    const way = L3 ? stepToward(pos.x, pos.z, goal.x, goal.z, 30) : null; // level 3: follow the halls cell by cell
    if (L3 && !way && !prey) m.roam = null;
    const tgt = way && way.cells > 0 ? way.next : goal;
    const dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz) || 1;
    let sp = prey ? mu.speed * L.houndSpeed * (dark ? 1.15 : 1) : 2;
    if (L3 && prey && now < (m.pounceUntil ?? 0)) sp *= H3.pounceBoost;
    if (L3 && st.lurk) sp = 0;
    if (now < (st.stunUntil ?? 0)) sp *= H3.stunSpeed; // stunned, every level
    const nx = pos.x + dx / d * sp * dt, nz = pos.z + dz / d * sp * dt;
    if (safeAt(nx, nz)) sp = 0; // the corridors turn them back
    const near = way && way.cells > 0 ? 0.3 : 1.2;
    h.velocity = { x: d > near ? dx / d * sp : 0, y: (h.velocity?.y ?? 0) - 20 * dt, z: d > near ? dz / d * sp : 0 };
    if (sp > 0) h.rotation = { yaw: Math.atan2(-dx, -dz) * 57.2958 };
    if (prey && sp > 0 && best < T.pounceRange && best > T.pounceMin && now >= (m.nextPounce ?? 0)) { // the leap
      const px = prey.feetPosition.x - pos.x, pz = prey.feetPosition.z - pos.z, pd = Math.hypot(px, pz) || 1;
      m.pounceAt = now; m.pounceOn = prey.id; m.pounceHit = false; m.nextPounce = now + T.pounceCd; anim(h, m, "pounce", false);
      h.velocity = { x: px / pd * T.pounceSpeed, y: T.pounceLift, z: pz / pd * T.pounceSpeed }; h.rotation = { yaw: Math.atan2(-px, -pz) * 57.2958 };
      ctx.emit("playSound", { clip: SND("hound-snarl-growl"), position: pos, volume: 1, pitch: 1.3 });
      continue;
    }
    const mauling = now < (m.maulUntil ?? 0);
    anim(h, m, mauling ? "maul" : sp <= 0.1 ? "idle" : sp > 3.5 ? "sprint" : "prowl", true);
    if (mauling) h.velocity = { x: 0, y: h.velocity.y, z: 0 };
    if (prey && !m.hunting) { m.hunting = true; ctx.emit("playSound", { clip: SND("hound-snarl-growl"), position: pos, volume: 0.9, maxDistance: 35 }); }
    if (!prey && m.hunting) { m.hunting = false; m.howled = false; }
    if (prey && best < 1.6 && now >= (m.next ?? 0)) {
      m.next = now + L.houndCooldown * 1000; const at = hitPrey(ctx, h, prey, Math.round(L.houndBite * mu.dmg), now);
      m.maulUntil = now + T.maulMs; m.clip = null; m.bleed = { id: prey.id, until: now + T.bleedMs, next: now + 1000 }; // the thrash opens a wound
      ctx.emit("fx", { position: at, script: BLOOD });
      ctx.emit("playSound", { clip: SND("hound-bite-snap"), position: at, volume: 0.9 });
      ctx.emit("screenShake", { intensity: 0.3, duration: 0.2 }, { audience: { player: prey.id } });
    }
  }
}
