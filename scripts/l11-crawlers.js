import { animate } from "builtin/tween";
// Level 11 depths: one manager steps every foe in the crawl (data: scripts/lib/data/l11-depths.yml).
// The Clump (Wikidot Entity: a rolling mass of fused human arms): slow, then it gathers itself and hurls forward.
// Hounds: fast, maul at close range. Both are l8-hostile so every gun, swing and kick hits them; player.js pays XP.
import D from "./lib/data/l11-depths.yml";
import { clearSight } from "./lib/sight.js";
import { dmgAfterArmor, sneakMul } from "./lib/stats.js";
import { crouchMul, yawOf } from "./lib/sneak.js";
import { navPath } from "./lib/nav.js";
import { raycast } from "builtin/physics";
import BOT from "./lib/data/l11-sentry.yml";
import { knocked, deathRag } from "./lib/knock.js";
import { rollLoot, rollCash } from "./lib/loot.js";
import { rollVariant } from "./lib/weapons.js";
const SENTRY = "/cdn/value.5a18bb1b3ab741080cf1b881ad99be1a9ace445a5e3fa9a4c7c2c6cb9dafb71d.glb";
const SAY = (t) => `/cdn/${BOT.throat}-saying-${encodeURIComponent(t)}.mp3`;
const BOLT = `fx
pop arc burst=14..20 life=.1..0.25 v=sdir()*(2..4) size=.03..0.05 acc=drag(3) col=hdr(5,2.6,.6)>hdr(2,.8,.1) a=1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop glow burst=1 life=.15 col=<1,.6,.2> a=1>0 r=light(<1,.6,.2>,6,5)`;
const CLUMP = "/cdn/value.aeb91c70e11f57592fd7fe510b2e8bfd86065edacbb87155c02fa34a5761c396.glb";

// the clump's own limbs, keyed by hand: eight limbs reach and drag out of step, the knot heaves; at rest they twitch
const LIMBS = ["0_Left", "0_Right", "1_Left", "1_Right", "2_Left", "2_Right", "3_Left", "3_Right"];
const shift = (a, k) => a.map((_, i) => a[(i + k) % (a.length - 1)]).slice(0, a.length - 1).concat([a[k % (a.length - 1)]]);
function limbClip(dur, amp, jitter) {
  const tracks = { "tripo::Spine_0": { pitch: [0, amp * 0.25, 0, -amp * 0.2, 0] }, "tripo::Spine_1": { roll: [0, -amp * 0.2, 0, amp * 0.2, 0] }, "tripo::Head_0": { yaw: [0, amp * 0.5, -amp * 0.3, amp * 0.6, 0] } };
  LIMBS.forEach((l, i) => { const k = (i * 3) % 4, side = l.endsWith("Left") ? 1 : -1;
    tracks[`tripo::${l}_Limb_0`] = { pitch: shift([0, -amp, -amp * 0.4, amp * 0.6, 0], k), yaw: shift([0, side * amp * 0.5, 0, -side * amp * 0.3 * jitter, 0], k) };
    tracks[`tripo::${l}_Limb_1`] = { pitch: shift([0, amp * 0.9, amp * 0.2, -amp * 0.5, 0], k) }; });
  return { duration: dur, tracks };
}
const CRAWL = limbClip(0.8, 32, 1), FIDGET = limbClip(2.2, 9, 2.5);
const HOUND = "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb";
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const BOTS = new Set(["sentry", "smgbot"]);
const SMGBOT = "/cdn/value.43aa4b081f1cd7b36230499f345e1768336249a85f6e12e9e3707a38c4b5e3b7.glb"; // the Suppressor: gunmetal and red repaint of the rigged custodian
function spec(kind, x, z, i, opts = {}) {
  const K = D.kinds[kind], base = { tags: ["l8-hostile", "l11foe", kind === "hound" ? "l11hound" : BOTS.has(kind) ? "l11sentry" : "l11clump"], feetPosition: { x, y: D.floor + 0.05, z }, physics: { body: "character" },
    state: { kind, name: K.name, hp: K.hp, maxHp: K.hp, home: { x, z }, slot: i, ...(opts?.sleep ? { sleep: 1 } : {}), ...(opts?.hall ? { hall: 1 } : {}) } };
  if (BOTS.has(kind)) return { ...base, tags: [...base.tags, "zdrone"], model: { id: kind === "smgbot" ? SMGBOT : SENTRY, forward: "+x" }, layout: { box: { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 1.9, z: 0.5 } } }, audio: { clip: "/cdn/moodboard-scifi-neon/sfx-old-vacuum-tube-electrical-hum-and-relay-ticking-loop.mp3", loop: true, gain: 0.25, spatial: true, maxDistance: 12 } };
  return kind === "hound"
    ? { ...base, model: { id: HOUND }, scale: 1, audio: { clip: SND("low-wet-animal-growl-breathing-loop"), loop: true, gain: 0.25, spatial: true, maxDistance: 14 } }
    : { ...base, model: { id: CLUMP, forward: "+x" }, layout: { box: { min: { x: -0.8, y: 0, z: -0.8 }, max: { x: 0.8, y: 1.2, z: 0.8 } } }, scale: 1, audio: { clip: SND("many-fingers-knuckles-cracking-and-skin-dragging-on-concrete-loop"), loop: true, gain: 0.35, spatial: true, maxDistance: 16 } };
}
function speak(ctx, f, m, ev, now, gap = 6000) {
  if (now < (m.talkUntil ?? 0)) return;
  const pool = BOT.lines[ev]; m.talkUntil = now + gap;
  ctx.emit("playSound", { clip: SAY(pool[Math.floor(ctx.random() * pool.length)]), position: f.feetPosition, bus: "Voice", volume: 1, refDistance: 4, maxDistance: 30, follow: f.id, mode: "restart" });
}

// what a body carries, searched like any remains (Shelly: improve their loot). Savi's picks: robots are the payday, cells and parts.
function bodyLoot(ctx, f) {
  const k = f.state.kind, r = () => ctx.random(), it = [];
  if (BOTS.has(k)) {
    it.push("cells", "scrap_metal", "wire");
    if (r() < 0.6) it.push("cells");
    if (r() < 0.55) it.push("circuit");
    if (r() < 0.4) it.push(r() < 0.5 ? "copper_coil" : "fuse");
    if (r() < 0.25) it.push("motor");
    if (r() < 0.5) it.push(rollCash(ctx));
    if (r() < (k === "smgbot" ? 0.18 : 0.12)) it.push("weapon:" + rollVariant(ctx, k === "smgbot" ? "laser_rifle" : "laser_pistol"));
  } else if (k === "clump") {
    it.push(...rollLoot(ctx, 1.6)); // what it swallowed: a dead man's pockets
    if (r() < 0.35) it.push(rollCash(ctx));
  } else return;
  if (!it.length) return;
  f.tags = [...new Set([...(f.tags ?? []), "container", "remains"])];
  f.state.items = it.join(",");
  f.state.name = (BOTS.has(k) ? "Wrecked " : "Dead ") + (f.state.name ?? k);
}
// ---- perception and navigation (Nov 10: foes see in a cone, hear what you do, remember where you went, and walk round walls)
const SPINE = D.spine.map(([x, z]) => ({ x, z }));
function spineProj(p) { // the nearest point on the crawl's centre line
  let best = null;
  for (let i = 0; i < SPINE.length - 1; i++) {
    const a = SPINE[i], b = SPINE[i + 1], ex = b.x - a.x, ez = b.z - a.z, L = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.z - a.z) * ez) / L)), x = a.x + ex * t, z = a.z + ez * t, d = Math.hypot(p.x - x, p.z - z);
    if (!best || d < best.d) best = { i, x, z, d };
  }
  return best;
}
function spineRoute(from, to) { // along the centre line, node by node: the fallback when the planner has no answer
  const a = spineProj(from), b = spineProj(to), pts = [{ x: a.x, z: a.z }];
  if (a.i < b.i) for (let k = a.i + 1; k <= b.i; k++) pts.push(SPINE[k]);
  else for (let k = a.i; k > b.i; k--) pts.push(SPINE[k]);
  pts.push({ x: b.x, z: b.z }, { x: to.x, z: to.z });
  return pts;
}
// a body-wide lane at knee and chest height with no wall in it
function clearLane(ctx, from, to, r, skip) {
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz); if (d < 0.05) return true;
  const ux = dx / d, uz = dz / d, dir = { x: ux, y: 0, z: uz };
  for (const [o, y] of [[0, 0.45], [r, 0.45], [-r, 0.45], [0, 1.1]]) {
    const s = { x: from.x - uz * o, y: from.y + y, z: from.z + ux * o };
    if (raycast(ctx, s, dir, { distance: d, physicsOnly: true, bodies: "static", ignoreEntities: skip })) return false;
  }
  return true;
}
// where to step this tick toward goal: straight when the lane is clear, else along a planned path; unsticks itself
function steer(ctx, f, m, goal, speed, now, r) {
  const pos = f.feetPosition, d = flat(pos, goal);
  m.want = true;
  if (now > (m.progAt ?? 0)) { // progress check once a second: barely moved while meaning to? sidestep and plan afresh
    if (m.progPos && flat(pos, m.progPos) < 0.25) { m.stuckN = (m.stuckN ?? 0) + 1; m.side = ctx.random() < 0.5 ? 1 : -1; m.sideUntil = now + 600; m.repathAt = 0; }
    else if (m.progPos && flat(pos, m.progPos) > 0.8) m.stuckN = 0;
    m.progAt = now + 1000; m.progPos = { x: pos.x, z: pos.z };
  }
  if (d < 0.35) { m.path = null; m.want = false; return { x: 0, z: 0 }; } // arrived: standing still is not stuck
  let tgt = goal;
  if ((m.stuckN ?? 0) === 0 && d < 30 && clearLane(ctx, pos, goal, r, [f.id])) m.path = null;
  else {
    if (!m.path || now > (m.repathAt ?? 0) || flat(m.pathGoal, goal) > 1.5) {
      let pts = null;
      if ((m.stuckN ?? 0) < 3) {
        const res = navPath(ctx, pos, goal, { radius: r, fresh: (m.stuckN ?? 0) > 0 });
        if (res.wait) pts = m.path ? null : spineRoute(pos, goal);
        else if (res.points?.length && (res.ok || res.partial)) pts = res.points.map((p) => ({ x: p.x, z: p.z }));
        else pts = spineRoute(pos, goal);
      } else { pts = spineRoute(pos, goal); m.stuckN = 0; }
      if (pts) { m.path = pts; m.pi = 0; m.pathGoal = { x: goal.x, z: goal.z }; m.repathAt = now + 800; }
    }
    while (m.path && m.pi < m.path.length - 1 && flat(pos, m.path[m.pi]) < 0.6) m.pi++;
    tgt = m.path?.[m.pi] ?? goal;
  }
  let dx = tgt.x - pos.x, dz = tgt.z - pos.z, n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
  if ((m.sideUntil ?? 0) > now) { const sx = -dz * m.side, sz = dx * m.side; dx = dx * 0.35 + sx; dz = dz * 0.35 + sz; n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n; }
  return { x: dx * speed, z: dz * speed };
}
// who this foe notices: seen (a clear line, inside its cone, in range) beats heard (footsteps, swings, shots)
function perceive(ctx, f, m, players, now, id) {
  const pos = f.feetPosition, eye = { x: pos.x, y: pos.y + (f.state.kind === "clump" ? 0.8 : 1.4), z: pos.z };
  const alert = m.mode === "hunt" || m.mode === "search", asleep = f.state.sleep && !m.woke;
  const yaw = (yawOf(f.rotation) ?? 0) * Math.PI / 180, fx = -Math.sin(yaw), fz = -Math.cos(yaw), cone = Math.cos((D.fov / 2) * Math.PI / 180);
  let out = null;
  for (const p of players) {
    const fp = p.feetPosition, d = flat(fp, pos); if (d > D.hearGun + 2) continue;
    const sn = (p.state?.attr ? sneakMul(p.state) : 1) * crouchMul(p);
    const range = asleep ? 5 : D.sight * sn * (alert ? 1.4 : 1);
    const ux = (fp.x - pos.x) / (d || 1), uz = (fp.z - pos.z) / (d || 1), inCone = alert || d < 2 || ux * fx + uz * fz > cone;
    let seen = false;
    if (d < range && inCone) seen = clearSight(ctx, eye, { x: fp.x, y: fp.y + 1.2, z: fp.z }, [id, p.id]) || clearSight(ctx, eye, { x: fp.x, y: fp.y + 0.5, z: fp.z }, [id, p.id]);
    let heard = false;
    if (!seen) {
      const v = p.velocity ?? {}, sp = Math.hypot(v.x ?? 0, v.z ?? 0), loud = p.state?.loud;
      const fight = loud && now - loud.at < 1500 ? (loud.gun ? D.hearGun : D.hearFight) : 0;
      const steps = p.state?.crouch ? 0 : sp > 5.5 ? D.hearSprint : sp > 1 ? D.hear * sn : 0;
      let r = Math.max(fight, steps) * (asleep ? 0.5 : 1);
      if (r > d && !clearSight(ctx, eye, { x: fp.x, y: fp.y + 1.2, z: fp.z }, [id, p.id])) r *= 0.6; // through rock the sound dies sooner
      heard = d < r;
    }
    if ((seen || heard) && (!out || (seen && !out.seen) || (seen === out.seen && d < out.d))) out = { p, d, seen };
  }
  return out;
}
function rouse(mem, ids, from, now, hall) { // a hunter's cry: idle ones near it come to look
  for (const oid of ids) { const o = mem[oid]; if (!o || o.mode === "hunt") continue; if (!hall && flat(o.at ?? from, from) > D.callRange) continue;
    o.mode = "search"; o.woke = true; o.searchPt = { x: from.x, z: from.z }; o.searchUntil = now + D.searchSec * 1000; }
}
const RED = "oklch(0.62 0.22 28)", WARM = "oklch(0.9 0.08 85)";
function hallLights(ctx, on) { // the Relay Hall's lamps go red while its watch is up
  for (let i = 0; i < 6; i++) { const l = ctx.place.objects[`l11d-h-lamp-${i}`]; if (l?.light) l.light = { ...l.light, color: on ? RED : WARM }; }
}
export function update(ctx, dt) {
  const st = ctx.self.state, now = ctx.now(), ses = ctx.self.session, mem = (ses.m ??= {}), g = ctx.place.gravity?.y ?? -9.8;
  st.foes ??= {}; st.deadAt ??= {};
  if (st.roster !== D.roster) { for (const fid of Object.values(st.foes)) if (fid in ctx.place.objects) ctx.destroy(fid); st.foes = {}; st.deadAt = {}; st.roster = D.roster; ses.swept = false; } // a new roster replaces the old crew
  if (!ses.swept) { ses.swept = true; const mine = new Set(Object.values(st.foes)); for (const o of ctx.query({ tags: ["l11foe"] })) if (!mine.has(o.id)) ctx.destroy(o.id); } // strays a rebuilt manager lost track of
  D.foes.forEach(([kind, x, z, opts], i) => { // lay the roster; the dead come back after an hour
    const id = st.foes[i];
    if (id && id in ctx.place.objects) return;
    if (id && now - (st.deadAt[i] ?? 0) < D.respawnMin * 60000) return;
    st.foes = { ...st.foes, [i]: ctx.spawn(spec(kind, x, z, i, opts)) };
  });
  const players = ctx.place.players.filter((p) => p.feetPosition.y < D.floor + 2 && p.feetPosition.z > 85 && !(p.state?.hp <= 0));
  const alarm = now - (ses.hallAt ?? -1e9) < 30000;
  if (ses.hallLit !== alarm) { ses.hallLit = alarm; hallLights(ctx, alarm); }
  if (!players.length) return ctx.sleep(1);
  const live = Object.values(st.foes).filter((id) => ctx.place.objects[id] && !ctx.place.objects[id].state?.dead);
  for (const id of live) (mem[id] ??= {}).at = ctx.place.objects[id].feetPosition;
  for (const [i, id] of Object.entries(st.foes)) {
    const f = ctx.place.objects[id]; if (!f) continue;
    const K = D.kinds[f.state.kind], m = (mem[id] ??= {}), pos = f.feetPosition, R = K.radius ?? 0.4;
    if (f.state.dead || f.state.hp <= 0) { // player.js marks the kill; we lay it down and clear it
      if (!m.died && f.state.diedAt) m.died = f.state.diedAt; // a fresh machine remembers the corpse, no second death cry
      if (!m.died) { m.died = now; f.state.diedAt = now; bodyLoot(ctx, f); st.deadAt = { ...st.deadAt, [i]: now }; f.velocity = { x: 0, y: 0, z: 0 }; f.audio = null;
        if (f.state.kind === "hound") f.anim.main = { clip: "death", loop: false, clampWhenFinished: true, weight: 1 };
        else if (BOTS.has(f.state.kind)) { m.talkUntil = 0; speak(ctx, f, m, "die", now); ctx.emit("fx", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, script: BOLT }); f.anim.main = null; f.anim.aim = null; f.anim.fire = null; f.state.kg = 160; deathRag(f); }
        else { ctx.emit("playSound", { clip: SND("wet-bone-crunch-and-limp-limbs-collapsing"), position: pos, volume: 0.9 }); f.anim.main = null; f.state.kg = 70; deathRag(f); } }
      if (!BOTS.has(f.state.kind)) { // a flesh corpse (Shelly Nov 12: "clump corpses are very annoying"): walk-through once it has fallen, then it sinks into the floor. Savi's numbers: 3 s, 90 s, 10 s
        const age = now - m.died;
        if (age > 3000 && !m.ghost) { m.ghost = true; f.physics = "none"; }
        if (age > 90000 && !m.sink) { m.sink = true; animate(ctx, f, { "feetPosition.y": "-=1.6" }, { duration: 10, easing: "easeInQuad" }); }
        if (age > 100000) { delete ctx.place.objects[id]; continue; }
      }
      if (now - m.died > (f.visible === false ? 300 : 3600000)) delete ctx.place.objects[id];
      continue;
    }
    if (knocked(ctx, f, now, dt)) { m.limbs = m.sclip = m.clip = null; continue; }
    m.mode ??= "idle";
    // hurt by someone it never saw: it turns on the nearest of them
    const hurt = m.hp0 != null && f.state.hp < m.hp0; m.hp0 = f.state.hp;
    let sense = perceive(ctx, f, m, players, now, id);
    if (!sense && hurt) { const p = players.slice().sort((a, b) => flat(a.feetPosition, pos) - flat(b.feetPosition, pos))[0]; if (p && flat(p.feetPosition, pos) < 45) sense = { p, d: flat(p.feetPosition, pos), seen: false }; }
    if (sense && now < (m.ignoreUntil ?? 0) && !hurt) sense = null; // pulled back to its leash a moment ago
    const prevMode = m.mode;
    if (sense) {
      const p = sense.p, v = p.velocity ?? {};
      m.last = { x: p.feetPosition.x, z: p.feetPosition.z, vx: v.x ?? 0, vz: v.z ?? 0 }; m.lastAt = now; m.mode = "hunt"; m.woke = true;
      if (m.hunt !== p.id || prevMode !== "hunt") { m.hunt = p.id;
        ctx.emit("playSound", { clip: SND(f.state.kind === "hound" ? "hound-snarl-and-bark-echoing" : "chorus-of-moaning-voices-and-snapping-fingers"), position: pos, volume: 1 });
        rouse(mem, live, pos, now, false);
        if (f.state.hall) { rouse(mem, live.filter((o) => ctx.place.objects[o]?.state?.hall), pos, now, true);
          if (now - (ses.hallAt ?? -1e9) > 20000) ctx.emit("playSound", { clip: "/cdn/sfx-old-industrial-alarm-klaxon-echoing-in-concrete-tunnel.mp3", position: { x: 42, y: D.floor + 3, z: 168 }, volume: 0.8, maxDistance: 45 });
          ses.hallAt = now; } }
    } else if (m.mode === "hunt" && now - (m.lastAt ?? 0) > D.loseSec * 1000) { // lost: it goes where you were heading and looks
      m.mode = "search"; m.searchUntil = now + D.searchSec * 1000;
      m.searchPt = m.last ? { x: m.last.x + (m.last.vx ?? 0) * 1.5, z: m.last.z + (m.last.vz ?? 0) * 1.5 } : { x: pos.x, z: pos.z };
      const sp = spineProj(m.searchPt); if (sp.d > 2.5) m.searchPt = { x: sp.x, z: sp.z };
    }
    if (m.mode === "search" && now > (m.searchUntil ?? 0)) { m.mode = "home"; m.hunt = null; }
    if (m.mode !== "idle" && flat(pos, f.state.home) > D.leash) { m.mode = "home"; m.hunt = null; m.ignoreUntil = now + 5000; }
    const prey = m.mode === "hunt" ? sense?.p ?? null : null, best = sense?.d ?? 1e9;
    if (f.state.ai !== m.mode) f.state.ai = m.mode; // idle | hunt | search | home: readable from outside (agent exec, a future HUD)
    if (BOTS.has(f.state.kind)) { if (prey && !m.spoke) { m.spoke = 1; m.talkUntil = 0; speak(ctx, f, m, "spot", now); } if (m.mode !== "hunt" && m.spoke) { m.spoke = 0; m.talkUntil = 0; speak(ctx, f, m, "lost", now); }
      if ((m.lastHp ?? f.state.hp) - f.state.hp >= 25) speak(ctx, f, m, "hurt", now, 4000); m.lastHp = f.state.hp; }
    let vx = 0, vz = 0, clip = "idle", face = null;
    const go = (goal, speed) => { const v = steer(ctx, f, m, goal, speed, now, R); vx = v.x; vz = v.z; };
    m.want = false;
    if (f.state.stunUntil > now || f.state.downUntil > now) { /* staggered */ }
    else if (prey && K.range) { // the Custodian: hold at its distance, square up, fire on a clear line, round the wall when it has none
      const dx = prey.feetPosition.x - pos.x, dz = prey.feetPosition.z - pos.z, n = Math.hypot(dx, dz) || 1;
      face = { x: dx, z: dz };
      const eye = { x: pos.x, y: pos.y + 1.55, z: pos.z }, aim = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
      const los = clearSight(ctx, eye, aim, [id, prey.id]);
      if (!los || best > K.range) go(prey.feetPosition, K.speed);
      else if (best < K.keep - 2) { vx = -dx / n * K.speed * 0.7; vz = -dz / n * K.speed * 0.7; }
      else { if (now > (m.strafeAt ?? 0)) { m.strafeAt = now + 1800 + ctx.random() * 1600; m.strafe = ctx.random() < 0.3 ? 0 : ctx.random() < 0.5 ? 1 : -1; } // sidestep between shots
        const sx = -dz / n * (m.strafe ?? 0), sz = dx / n * (m.strafe ?? 0), probe = { x: pos.x + sx * 1.2, y: pos.y, z: pos.z + sz * 1.2 };
        if (m.strafe && clearLane(ctx, pos, probe, R, [id])) { vx = sx * K.speed * 0.6; vz = sz * K.speed * 0.6; } }
      if (los && best < K.range && now > (m.nextHit ?? 0)) {
        if (K.burst) { m.shots = ((m.shots ?? 0) + 1) % K.burst; m.nextHit = m.shots ? now + K.burstGap * 1000 : now + K.cd * 1000 * (0.85 + ctx.random() * 0.3); }
        else m.nextHit = now + K.cd * 1000 * (0.85 + ctx.random() * 0.3);
        const muzzle = { x: pos.x + dx / n * 0.6, y: pos.y + 1.25, z: pos.z + dz / n * 0.6 };
        const hits = ctx.random() > K.spread * (best / 4) * (prey.velocity && Math.hypot(prey.velocity.x, prey.velocity.z) > 3 ? 1.6 : 1);
        const end = hits ? aim : { x: aim.x + (ctx.random() - 0.5) * 1.6, y: aim.y + (ctx.random() - 0.3), z: aim.z + (ctx.random() - 0.5) * 1.6 };
        const L = Math.hypot(end.x - muzzle.x, end.y - muzzle.y, end.z - muzzle.z);
        ctx.spawn({ feetPosition: { x: (muzzle.x + end.x) / 2, y: (muzzle.y + end.y) / 2 - 0.025, z: (muzzle.z + end.z) / 2 }, pivot: "center", rotation: { lookAt: end, include: ["yaw", "pitch"] }, primitive: { kind: "box", width: 0.05, height: 0.05, depth: L }, material: { color: `oklch(0.85 0.17 ${K.bolt ?? 65})`, emissive: `oklch(0.8 0.18 ${K.bolt ?? 60})`, emissiveIntensity: 6 }, castShadow: false, lifetime: 0.12, audience: "near" });
        ctx.emit("fx", { position: muzzle, script: BOLT });
        f.anim.fire = { clip: "cdn/clip-rifle-fire-01972c51.glb", loop: false, weight: 1, mask: "RightShoulder", blend: 0.05 };
        ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-retro-1950s-ray-gun-zap-with-warbling-oscillator.mp3", position: muzzle, volume: K.burst ? 0.6 : 0.9, pitch: K.burst ? 1.5 + ctx.random() * 0.15 : 1, mode: "overlap" });
        if (!m.shots && ctx.random() < 0.35) speak(ctx, f, m, "shoot", now, 7000);
        if (!hits) ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-laser-bolt-whizzing-past-ear-close-flyby.mp3", position: { x: prey.feetPosition.x + (end.x - aim.x) * 0.5, y: aim.y + 0.5, z: prey.feetPosition.z + (end.z - aim.z) * 0.5 }, volume: 0.9, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 10 }, { player: prey.id }); // near-miss, the shot player alone (borrowed from fps-grudge)
        if (hits) {
          prey.state.hp -= dmgAfterArmor(prey.state.look, K.dmg);
          ctx.emit("damageNumber", { position: aim, value: K.dmg, color: "#ffb040" });
          ctx.emit("fx", { position: aim, script: BOLT });
          ctx.emit("cameraPunch", { direction: { x: dx / n, y: 0, z: dz / n }, intensity: 0.3 }, { audience: { player: prey.id } });
        } else ctx.emit("fx", { position: end, script: BOLT });
      }
    }
    else if (prey) {
      const dx = prey.feetPosition.x - pos.x, dz = prey.feetPosition.z - pos.z, n = Math.hypot(dx, dz) || 1;
      face = { x: dx, z: dz };
      const reachable = () => clearSight(ctx, { x: pos.x, y: pos.y + 0.6, z: pos.z }, { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z }, [id, prey.id]);
      if (m.lungeTo > now) { vx = m.lv.x; vz = m.lv.z; clip = "pounce"; }
      else if (m.windUntil > now) { clip = "pounce"; } // the tell: it gathers before it throws itself
      else if (m.windUntil && now >= m.windUntil && now - m.windUntil < 100) { m.lv = { x: dx / n * K.lunge * 1.6, z: dz / n * K.lunge * 1.6 }; m.lungeTo = now + 450; m.windUntil = 0; }
      else if (K.grab && best < K.grab && best > K.reach && now > (m.nextGrab ?? 0) && reachable()) {
        m.nextGrab = now + K.grabCd * 1000; m.nextHit = now + 350; // the longest arm snaps out and reels you in to the mouth
        ctx.emit("impulse", { target: prey.id, impulse: { x: -dx / n * 260, y: 60, z: -dz / n * 260 } });
        ctx.emit("squash", { target: id, axis: "y", intensity: -0.3, duration: 0.3 }); ctx.emit("shake", { target: id, intensity: 0.12, duration: 0.3 });
        ctx.emit("playSound", { clip: SND("dozens-of-hands-grabbing-and-slapping"), position: pos, volume: 1 });
        ctx.emit("screenShake", { intensity: 0.25, duration: 0.2 }, { audience: { player: prey.id } });
      }
      else if (K.lungeRange && best < K.lungeRange && best > K.reach && now > (m.nextLunge ?? 0) && clearLane(ctx, pos, prey.feetPosition, R, [id, prey.id])) { m.windUntil = now + 600; m.nextLunge = now + 4500; ctx.emit("squash", { target: id, axis: "y", intensity: 0.3, duration: 0.6 }); }
      else if (best > K.reach * 0.8) { go(prey.feetPosition, K.speed); clip = K.speed > 3.5 ? "sprint" : "prowl"; }
      if (best < K.reach && now > (m.nextHit ?? 0) && reachable()) {
        m.nextHit = now + K.cd * 1000; clip = "maul";
        const dmg = Math.round(K.dmg * (m.lungeTo > now ? 1.4 : 1));
        prey.state.hp -= dmgAfterArmor(prey.state.look, dmg);
        const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
        ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4040" });
        ctx.emit("playSound", { clip: SND(f.state.kind === "hound" ? "hound-bite-tearing-cloth" : "dozens-of-hands-grabbing-and-slapping"), position: at, volume: 1 });
        ctx.emit("cameraPunch", { direction: { x: dx / n, y: 0, z: dz / n }, intensity: 0.45 }, { audience: { player: prey.id } });
        ctx.emit("screenShake", { intensity: 0.35, duration: 0.2 }, { audience: { player: prey.id } });
      }
    }
    else if (m.mode === "hunt" && m.last) { go(m.last, K.speed); clip = K.speed > 3.5 ? "sprint" : "prowl"; } // gone from view a moment: run to the last spot
    else if (m.mode === "search" && m.searchPt) { // cast about round the last spot: short legs along the tunnel, pausing to look
      if (flat(pos, m.searchPt) < 0.8) { if (!m.lookUntil) m.lookUntil = now + 900 + ctx.random() * 900;
        if (now > m.lookUntil) { m.lookUntil = 0; const sp = spineProj({ x: m.searchPt.x + (ctx.random() - 0.5) * 9, z: m.searchPt.z + (ctx.random() - 0.5) * 9 }); m.searchPt = { x: sp.x + (ctx.random() - 0.5) * 1.6, z: sp.z + (ctx.random() - 0.5) * 1.6 }; }
        else if (now > (m.glanceAt ?? 0) && f.state.kind !== "clump") { m.glanceAt = now + 450; f.rotation = { yaw: (yawOf(f.rotation) ?? 0) + (ctx.random() - 0.5) * 120 }; } }
      else { go(m.searchPt, K.speed * 0.55); clip = "prowl"; }
    }
    else if (m.mode === "home") { if (flat(pos, f.state.home) > 1) { go(f.state.home, Math.min(K.speed, 1.6)); clip = "prowl"; } else { m.mode = "idle"; m.path = null; } }
    // keep a little room between bodies so a pack doesn't stack into one knot
    if (vx || vz) for (const oid of live) { if (oid === id) continue; const o = mem[oid]?.at; if (!o) continue; const ox = pos.x - o.x, oz = pos.z - o.z, od = Math.hypot(ox, oz);
      if (od > 0.01 && od < 1.2) { vx += ox / od * (1.2 - od) * 2; vz += oz / od * (1.2 - od) * 2; } }
    if (!m.want) { m.progPos = null; m.stuckN = 0; }
    if (face && f.state.kind !== "clump") f.rotation = { yaw: Math.atan2(-face.x, -face.z) * 180 / Math.PI };
    else if ((vx || vz) && f.state.kind !== "clump") f.rotation = { yaw: Math.atan2(-vx, -vz) * 180 / Math.PI };
    if (BOTS.has(f.state.kind) && (vx || vz) && now > (m.step ?? 0)) { m.step = now + 520; ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-heavy-metal-robot-footstep-clank-on-concrete.mp3", position: pos, volume: 0.6, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 26 }); }
    if (BOTS.has(f.state.kind)) { const mv = (vx || vz) ? "cdn/clip-walk-loop.glb" : "cdn/clip-idle-loop.glb", up = !!(prey && K.range);
      if (m.clip !== mv) { m.clip = mv; f.anim.main = { clip: mv, loop: true, weight: 1, blend: 0.25 }; }
      if (m.up !== up) { m.up = up; f.anim.aim = up ? { clip: "cdn/clip-rifle-up-50cc7349-loop.glb", loop: true, weight: 1, mask: "Spine", blend: 0.3 } : null; } }
    f.velocity = { x: vx, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: vz };
    if (f.state.kind === "clump") { const mode = (vx || vz) ? "crawl" : "fidget";
      if (m.limbs !== mode) { m.limbs = mode; f.anim.main = { clip: mode === "crawl" ? CRAWL : FIDGET, loop: true, weight: 1, blend: 0.2 }; } }
    if (f.state.kind === "clump" && now > (m.tw ?? 0)) { // a knot of limbs never sits still: it lurches crawling, shudders at rest
      const mv = !!(vx || vz), yaw = face ? Math.atan2(-face.x, -face.z) * 180 / Math.PI : mv ? Math.atan2(-vx, -vz) * 180 / Math.PI : (yawOf(f.rotation) ?? 0);
      m.tw = now + (mv ? 140 : 260 + ctx.random() * 500);
      f.rotation = { yaw: yaw + (ctx.random() - 0.5) * (mv ? 18 : 8), pitch: (mv ? -6 : 0) + (ctx.random() - 0.5) * (mv ? 14 : 5), roll: (ctx.random() - 0.5) * (mv ? 16 : 6) };
      if (!mv && ctx.random() < 0.08) ctx.emit("shake", { target: id, intensity: 0.06, duration: 0.35 });
    }
    if (f.state.kind === "hound" && m.clip !== clip) { m.clip = clip; f.anim.main = { clip, loop: clip !== "pounce" && clip !== "maul", weight: 1, blend: 0.2 }; }
  }
}
