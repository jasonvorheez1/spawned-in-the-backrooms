// Clumps (Entity 5), one manager for every row tagged "clump-ai" in its place. The wiki's rules, played:
// - starved: it lets a quiet wanderer pass. Crouch-walk by and it only watches. Come within 8 ft standing, sprint near it, or hurt it: it hunts.
// - it scrabbles in bursts, swiping at the floor, then stops dead and twitches.
// - inside ~3 m its longest limb (8-10 ft) uncoils, snags you, and reels you to its centre; there the mouth opens and it chews.
// - no instakills (Shelly, Nov 13): the hold always lets go with you on your feet, and one hit never takes more than a third of a full bar.
// - near death it folds up and weeps, then breaks and runs.
import { CRAWL, PROWL, FIDGET, REACH, MAW, COWER } from "./lib/clump.js";
import { knocked } from "./lib/knock.js";
import { dmgAfterArmor } from "./lib/stats.js";

const T = { // every number Savi's pick
  speed: 3.4, burst: 7.5, burstMs: 650, burstCd: 2600, notice: 2.45, hear: 9, runSpeed: 5, sight: 16, giveUp: 9000,
  grabMin: 1.8, grabMax: 3.1, grabCd: 6500, reachMs: 380, reelMs: 550, holdMs: 2200, chewEvery: 600, chewDmg: 7, release: 35,
  bite: 1.6, biteDmg: 16, biteCd: 1300, capFrac: 0.33, cower: 0.2, xp: 60,
};
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const GOO = `fx
pop gob burst=12..18 life=.5..0.9 v=sdir()*(1.2..2.6)+up(1) size=.04..0.08 acc=grav()*.9+drag(1) col=<.35,.05,.04> a=1>0 sz=$size floor=stick r=sprite(soft-disc,alpha)
pop dust burst=4 life=.6..1 v=up(.4)+sdir()*.4 size=.2..0.35 acc=buoy(.3)+drag(1.4) col=<.45,.4,.35> a=0>.3:.3>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
const play = (f, m, name, clip, loop = true) => { if (m.clip === name) return; m.clip = name; f.anim.main = { clip, loop, weight: 1, blend: 0.15 }; };
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function hurt(ctx, f, p, dmg) { // never more than a third of a full bar in one go, never past 1 hp from a bite
  const max = p.state.maxHp ?? 100, hp = p.state.hp ?? max;
  const d = Math.max(1, Math.min(Math.round(dmgAfterArmor(p.state.look, dmg)), Math.round(max * T.capFrac), hp - 1));
  p.state.hp = hp - d;
  const at = { x: p.feetPosition.x, y: p.feetPosition.y + 1.1, z: p.feetPosition.z };
  ctx.emit("damageNumber", { position: at, value: d, color: "#ff4040" });
  ctx.emit("fx", { position: at, script: GOO });
  ctx.emit("cameraPunch", { direction: { x: p.feetPosition.x - f.feetPosition.x, y: 0, z: p.feetPosition.z - f.feetPosition.z }, intensity: 0.4 }, { audience: { player: p.id } });
  ctx.emit("squash", { target: f.id, axis: "y", intensity: 0.2, duration: 0.25 });
}

export function update(ctx, dt) {
  const players = ctx.place.players.filter((p) => (p.state?.hp ?? 1) > 0);
  const foes = ctx.query({ tags: ["clump-ai"], radius: 1e4 });
  if (!foes.length || !players.length) { ctx.sleep(1); return; }
  const now = ctx.now(), mem = (ctx.self.session.m ??= {}), g = ctx.place.gravity?.y ?? -9.8;
  for (const row of foes) {
    const f = ctx.getObject(row.id); if (!f) continue;
    const s = f.state, m = (mem[f.id] ??= {}), pos = f.feetPosition, max = s.maxHp ?? 160;
    if (s.dead || (s.hp ?? 1) <= 0) {
      if (m.held) { const p = players.find((q) => q.id === m.held); if (p) p.state.stungUntil = 0; m.held = null; }
      if (!s.dead) { s.dead = now; f.velocity = { x: 0, y: -1, z: 0 }; play(f, m, "dead", COWER, false);
        ctx.emit("playSound", { clip: SND("brittle-bones-snapping-and-a-wet-sigh"), position: pos, volume: 1 }); ctx.emit("fx", { position: { ...pos, y: pos.y + 0.5 }, script: GOO }); }
      else if (now - s.dead > 3000) ctx.destroy(f.id);
      continue;
    }
    if (knocked(ctx, f, now, dt)) { m.clip = null; continue; }
    // a hit wakes it, whoever threw it
    const hit = m.hp0 != null && s.hp < m.hp0; m.hp0 = s.hp;
    if (hit) { m.angryAt = now; ctx.emit("playSound", { clip: SND("brittle-bone-crack-under-dry-skin"), position: pos, volume: 0.8, mode: "overlap" }); }
    // who has it noticed
    let prey = m.prey ? players.find((p) => p.id === m.prey) : null, best = prey ? flat(prey.feetPosition, pos) : 1e9;
    if (!prey || best > T.sight || now - (m.seenAt ?? 0) > T.giveUp) {
      prey = null; best = 1e9;
      for (const p of players) { const d = flat(p.feetPosition, pos), v = p.velocity ?? {}, fast = Math.hypot(v.x ?? 0, v.z ?? 0) > T.runSpeed;
        const noticed = (d < T.notice && !p.state?.crouch) || (fast && d < T.hear) || (hit && d < 40);
        if (noticed && d < best) { prey = p; best = d; } }
      if (prey && m.prey !== prey.id) ctx.emit("playSound", { clip: SND("chorus-of-moaning-voices-and-snapping-fingers"), position: pos, volume: 1 });
      m.prey = prey?.id ?? null;
    }
    if (prey) m.seenAt = now;
    let vx = 0, vz = 0;
    const low = s.hp < max * T.cower;
    if (m.held) { // the hold: reeled in, the maw open, chewing
      const p = players.find((q) => q.id === m.held);
      const done = !p || now - m.holdAt > T.holdMs || (p.state.hp ?? 0) <= T.release || low || hit && s.hp < m.hpAtGrab - 25;
      if (done) { if (p) { p.state.stungUntil = now + 250; const d = flat(p.feetPosition, pos) || 1;
          ctx.emit("impulse", { target: p.id, impulse: { x: (p.feetPosition.x - pos.x) / d * 320, y: 140, z: (p.feetPosition.z - pos.z) / d * 320 } }); }
        m.held = null; m.nextGrab = now + T.grabCd; m.nextBite = now + 900; }
      else { p.state.stungUntil = now + 300; play(f, m, "maw", MAW);
        const dx = p.feetPosition.x - pos.x, dz = p.feetPosition.z - pos.z, d = Math.hypot(dx, dz) || 1;
        f.rotation = { yaw: Math.atan2(-dx, -dz) * 57.3 };
        if (d > 1.1) ctx.emit("impulse", { target: p.id, impulse: { x: -dx / d * 60, y: 0, z: -dz / d * 60 } });
        if (now >= m.chewAt) { m.chewAt = now + T.chewEvery; hurt(ctx, f, p, T.chewDmg);
          ctx.emit("playSound", { clip: SND("wet-flesh-chewing-crunch"), position: p.feetPosition, volume: 0.9, mode: "overlap" });
          ctx.emit("screenFlash", { color: "#4a0006", duration: 0.15, intensity: 0.3 }, { audience: { player: p.id } }); } }
      f.velocity = { x: 0, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: 0 };
      continue;
    }
    if (m.reach) { // the long arm in the air: it lands, or misses and coils back
      const t = now - m.reach.at, p = players.find((q) => q.id === m.reach.id);
      play(f, m, "reach", REACH, false);
      if (t > T.reachMs && !m.reach.done) { m.reach.done = 1;
        const d = p ? flat(p.feetPosition, pos) : 99;
        if (p && d < T.grabMax + 0.6) { const dx = p.feetPosition.x - pos.x, dz = p.feetPosition.z - pos.z;
          ctx.emit("impulse", { target: p.id, impulse: { x: -dx / d * 300, y: 70, z: -dz / d * 300 } });
          ctx.emit("screenShake", { intensity: 0.35, duration: 0.25 }, { audience: { player: p.id } });
          ctx.emit("playSound", { clip: SND("dozens-of-hands-grabbing-and-slapping"), position: pos, volume: 1 });
          m.held = p.id; m.holdAt = now + T.reelMs; m.chewAt = now + T.reelMs; m.hpAtGrab = s.hp; p.state.stungUntil = now + T.reelMs + 300; }
        else ctx.emit("playSound", { clip: SND("wet-whip-crack-of-a-long-limb-missing"), position: pos, volume: 0.9 }); }
      if (t > T.reachMs + 350) { m.reach = null; m.nextGrab = now + T.grabCd * 0.6; }
      f.velocity = { x: 0, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: 0 };
      continue;
    }
    if (low && prey) { // folded, weeping, then it bolts away from you
      if (!m.wept) { m.wept = 1; m.fleeAt = now + 1600; ctx.emit("playSound", { clip: SND("muffled-sobbing-from-inside-a-mass-of-limbs"), position: pos, volume: 1 }); }
      if (now < m.fleeAt) { play(f, m, "cower", COWER); }
      else { const d = best || 1; vx = (pos.x - prey.feetPosition.x) / d * T.speed; vz = (pos.z - prey.feetPosition.z) / d * T.speed; play(f, m, "crawl", CRAWL); }
    } else if (prey) {
      const dx = prey.feetPosition.x - pos.x, dz = prey.feetPosition.z - pos.z, d = best || 1;
      if (best > T.grabMin && best < T.grabMax && now > (m.nextGrab ?? 0)) { m.reach = { at: now, id: prey.id }; m.clip = null;
        ctx.emit("playSound", { clip: SND("creaking-sinew-stretching-fast"), position: pos, volume: 1 }); f.rotation = { yaw: Math.atan2(-dx, -dz) * 57.3 }; continue; }
      if (best < T.bite) { if (now > (m.nextBite ?? 0)) { m.nextBite = now + T.biteCd; m.clip = null; play(f, m, "maw", MAW, false); hurt(ctx, f, prey, T.biteDmg);
          ctx.emit("playSound", { clip: SND("dozens-of-hands-grabbing-and-slapping"), position: prey.feetPosition, volume: 1, mode: "overlap" }); } }
      else { // scrabble in bursts, then freeze a beat and twitch
        if (!m.burstUntil && now > (m.burstAt ?? 0)) { m.burstUntil = now + T.burstMs; m.burstAt = now + T.burstCd * (0.7 + ctx.random() * 0.6);
          ctx.emit("playSound", { clip: SND("frantic-scrabbling-of-many-limbs-on-concrete"), position: pos, volume: 0.9, mode: "overlap" }); }
        const bursting = m.burstUntil && now < m.burstUntil; if (m.burstUntil && now >= m.burstUntil) m.burstUntil = 0;
        const pause = !bursting && now > (m.burstAt ?? 0) - 500;
        const sp = bursting ? T.burst : pause ? 0 : T.speed;
        vx = dx / d * sp; vz = dz / d * sp; play(f, m, sp > 5 ? "crawl" : sp ? "prowl" : "fidget", sp > 5 ? CRAWL : sp ? PROWL : FIDGET);
      }
    } else { // dormant: drifts near home, mostly still
      m.wept = 0;
      const h = s.home ?? pos;
      if (!m.roam || now > m.roamUntil) { const a = ctx.random() * 6.283; m.roam = ctx.random() < 0.5 ? null : { x: h.x + Math.cos(a) * 3, z: h.z + Math.sin(a) * 3 }; m.roamUntil = now + 3000 + ctx.random() * 4000; }
      if (m.roam && flat(m.roam, pos) > 0.6) { const d = flat(m.roam, pos); vx = (m.roam.x - pos.x) / d * 0.9; vz = (m.roam.z - pos.z) / d * 0.9; play(f, m, "prowl", PROWL); }
      else play(f, m, "fidget", FIDGET);
    }
    for (const o of foes) { if (o.id === f.id) continue; const ox = pos.x - o.feetPosition.x, oz = pos.z - o.feetPosition.z, od = Math.hypot(ox, oz); // two knots never merge into one
      if (od < 1.4) { const k = (1.4 - od) * 3, ux = od > 0.01 ? ox / od : Math.cos(f.id.length + o.id.length), uz = od > 0.01 ? oz / od : Math.sin(f.id.length * 7); vx += ux * k; vz += uz * k; } }
    if (now > (m.tw ?? 0)) { // a knot of limbs never sits square: it lurches as it goes
      const mv = !!(vx || vz); m.tw = now + (mv ? 140 : 300 + ctx.random() * 500);
      const yaw = mv ? Math.atan2(-vx, -vz) * 57.3 : (typeof f.rotation === "number" ? f.rotation : f.rotation?.yaw ?? 0);
      f.rotation = { yaw: yaw + (ctx.random() - 0.5) * (mv ? 16 : 6), pitch: (mv ? -5 : 0) + (ctx.random() - 0.5) * (mv ? 12 : 4), roll: (ctx.random() - 0.5) * (mv ? 14 : 5) };
    }
    f.velocity = { x: vx, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: vz };
  }
}
