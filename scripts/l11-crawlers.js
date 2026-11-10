// Level 11 depths: one manager steps every foe in the crawl (data: scripts/lib/data/l11-depths.yml).
// The Clump (Wikidot Entity: a rolling mass of fused human arms): slow, then it gathers itself and hurls forward.
// Hounds: fast, maul at close range. Both are l8-hostile so every gun, swing and kick hits them; player.js pays XP.
import D from "./lib/data/l11-depths.yml";
import { clearSight } from "./lib/sight.js";
import { dmgAfterArmor, sneakMul } from "./lib/stats.js";
import { crouchMul } from "./lib/sneak.js";
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
function spec(kind, x, z, i) {
  const K = D.kinds[kind], base = { tags: ["l8-hostile", "l11foe", kind === "hound" ? "l11hound" : BOTS.has(kind) ? "l11sentry" : "l11clump"], feetPosition: { x, y: D.floor + 0.05, z }, physics: { body: "character" },
    state: { kind, name: K.name, hp: K.hp, maxHp: K.hp, home: { x, z }, slot: i } };
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
export function update(ctx, dt) {
  const st = ctx.self.state, now = ctx.now(), mem = (ctx.self.session.m ??= {}), g = ctx.place.gravity?.y ?? -9.8;
  st.foes ??= {}; st.deadAt ??= {};
  D.foes.forEach(([kind, x, z], i) => { // lay the roster; the dead come back after an hour
    const id = st.foes[i];
    if (id && id in ctx.place.objects) return;
    if (id && now - (st.deadAt[i] ?? 0) < D.respawnMin * 60000) return;
    st.foes = { ...st.foes, [i]: ctx.spawn(spec(kind, x, z, i)) };
  });
  const players = ctx.place.players.filter((p) => p.feetPosition.y < D.floor + 2 && p.feetPosition.z > 85 && !(p.state?.hp <= 0));
  if (!players.length) return ctx.sleep(1);
  for (const [i, id] of Object.entries(st.foes)) {
    const f = ctx.place.objects[id]; if (!f) continue;
    const K = D.kinds[f.state.kind], m = (mem[id] ??= {}), pos = f.feetPosition;
    if (f.state.dead || f.state.hp <= 0) { // player.js marks the kill; we lay it down and clear it
      if (!m.died && f.state.diedAt) m.died = f.state.diedAt; // a fresh machine remembers the corpse, no second death cry
      if (!m.died) { m.died = now; f.state.diedAt = now; bodyLoot(ctx, f); st.deadAt = { ...st.deadAt, [i]: now }; f.velocity = { x: 0, y: 0, z: 0 }; f.audio = null;
        if (f.state.kind === "hound") f.anim.main = { clip: "death", loop: false, clampWhenFinished: true, weight: 1 };
        else if (BOTS.has(f.state.kind)) { m.talkUntil = 0; speak(ctx, f, m, "die", now); ctx.emit("fx", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, script: BOLT }); f.anim.main = null; f.anim.aim = null; f.anim.fire = null; f.state.kg = 160; deathRag(f); }
        else { ctx.emit("playSound", { clip: SND("wet-bone-crunch-and-limp-limbs-collapsing"), position: pos, volume: 0.9 }); f.anim.main = null; f.state.kg = 70; deathRag(f); } }
      if (now - m.died > (f.visible === false ? 300 : 3600000)) delete ctx.place.objects[id];
      continue;
    }
    if (knocked(ctx, f, now, dt)) { m.limbs = m.sclip = m.clip = null; continue; }
    let prey = null, best = 1e9;
    for (const p of players) { // sight and hearing, both shrunk by sneaking
      const d = flat(p.feetPosition, pos), sn = (p.state?.attr ? sneakMul(p.state) : 1) * crouchMul(ctx, p);
      if (d > D.sight * sn && !(m.hunt === p.id && d < D.sight * 1.5)) continue;
      const seen = d < D.hear * sn || clearSight(ctx, { x: pos.x, y: pos.y + 0.8, z: pos.z }, { x: p.feetPosition.x, y: p.feetPosition.y + 1, z: p.feetPosition.z }, [id, p.id]);
      if (seen && d < best) { best = d; prey = p; }
    }
    if (prey && m.hunt !== prey.id) { m.hunt = prey.id; ctx.emit("playSound", { clip: SND(f.state.kind === "hound" ? "hound-snarl-and-bark-echoing" : "chorus-of-moaning-voices-and-snapping-fingers"), position: pos, volume: 1 }); }
    if (BOTS.has(f.state.kind)) { if (prey && !m.spoke) { m.spoke = 1; m.talkUntil = 0; speak(ctx, f, m, "spot", now); } if (!prey && m.spoke) { m.spoke = 0; m.talkUntil = 0; speak(ctx, f, m, "lost", now); }
      if ((m.lastHp ?? f.state.hp) - f.state.hp >= 25) speak(ctx, f, m, "hurt", now, 4000); m.lastHp = f.state.hp; }
    if (!prey) m.hunt = null;
    let vx = 0, vz = 0, clip = "idle";
    if (f.state.stunUntil > now || f.state.downUntil > now) { /* staggered */ }
    else if (prey && K.range) { // the Custodian: hold at its distance, square up, fire on a clear line
      const dx = prey.feetPosition.x - pos.x, dz = prey.feetPosition.z - pos.z, n = Math.hypot(dx, dz) || 1;
      f.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI };
      const eye = { x: pos.x, y: pos.y + 1.55, z: pos.z }, aim = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
      const los = clearSight(ctx, eye, aim, [id, prey.id]);
      if (!los || best > K.range) { vx = dx / n * K.speed; vz = dz / n * K.speed; }
      else if (best < K.keep - 2) { vx = -dx / n * K.speed * 0.7; vz = -dz / n * K.speed * 0.7; }
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
      f.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI };
      if (m.lungeTo > now) { vx = m.lv.x; vz = m.lv.z; clip = "pounce"; }
      else if (m.windUntil > now) { clip = "pounce"; } // the tell: it gathers before it throws itself
      else if (m.windUntil && now >= m.windUntil && now - m.windUntil < 100) { m.lv = { x: dx / n * K.lunge * 1.6, z: dz / n * K.lunge * 1.6 }; m.lungeTo = now + 450; m.windUntil = 0; }
      else if (K.grab && best < K.grab && best > K.reach && now > (m.nextGrab ?? 0) && clearSight(ctx, { x: pos.x, y: pos.y + 0.6, z: pos.z }, { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z }, [id, prey.id])) {
        m.nextGrab = now + K.grabCd * 1000; m.nextHit = now + 350; // the longest arm snaps out and reels you in to the mouth
        ctx.emit("impulse", { target: prey.id, impulse: { x: -dx / n * 260, y: 60, z: -dz / n * 260 } });
        ctx.emit("squash", { target: id, axis: "y", intensity: -0.3, duration: 0.3 }); ctx.emit("shake", { target: id, intensity: 0.12, duration: 0.3 });
        ctx.emit("playSound", { clip: SND("dozens-of-hands-grabbing-and-slapping"), position: pos, volume: 1 });
        ctx.emit("screenShake", { intensity: 0.25, duration: 0.2 }, { audience: { player: prey.id } });
      }
      else if (K.lungeRange && best < K.lungeRange && best > K.reach && now > (m.nextLunge ?? 0)) { m.windUntil = now + 600; m.nextLunge = now + 4500; ctx.emit("squash", { target: id, axis: "y", intensity: 0.3, duration: 0.6 }); }
      else if (best > K.reach * 0.8) { vx = dx / n * K.speed; vz = dz / n * K.speed; clip = K.speed > 3.5 ? "sprint" : "prowl"; }
      if (best < K.reach && now > (m.nextHit ?? 0) && clearSight(ctx, { x: pos.x, y: pos.y + 0.8, z: pos.z }, { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z }, [id, prey.id])) {
        m.nextHit = now + K.cd * 1000; clip = "maul";
        const dmg = Math.round(K.dmg * (m.lungeTo > now ? 1.4 : 1));
        prey.state.hp -= dmgAfterArmor(prey.state.look, dmg);
        const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
        ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4040" });
        ctx.emit("playSound", { clip: SND(f.state.kind === "hound" ? "hound-bite-tearing-cloth" : "dozens-of-hands-grabbing-and-slapping"), position: at, volume: 1 });
        ctx.emit("cameraPunch", { direction: { x: dx / n, y: 0, z: dz / n }, intensity: 0.45 }, { audience: { player: prey.id } });
        ctx.emit("screenShake", { intensity: 0.35, duration: 0.2 }, { audience: { player: prey.id } });
      }
    } else if (flat(pos, f.state.home) > 1.5) { const dx = f.state.home.x - pos.x, dz = f.state.home.z - pos.z, n = Math.hypot(dx, dz); vx = dx / n * 1.2; vz = dz / n * 1.2; clip = "prowl"; f.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI }; }
    if (BOTS.has(f.state.kind) && (vx || vz) && now > (m.step ?? 0)) { m.step = now + 520; ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-heavy-metal-robot-footstep-clank-on-concrete.mp3", position: pos, volume: 0.6, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 26 }); }
    if (BOTS.has(f.state.kind)) { const mv = (vx || vz) ? "cdn/clip-walk-loop.glb" : "cdn/clip-idle-loop.glb", up = !!(prey && K.range);
      if (m.clip !== mv) { m.clip = mv; f.anim.main = { clip: mv, loop: true, weight: 1, blend: 0.25 }; }
      if (m.up !== up) { m.up = up; f.anim.aim = up ? { clip: "cdn/clip-rifle-up-50cc7349-loop.glb", loop: true, weight: 1, mask: "Spine", blend: 0.3 } : null; } }
    f.velocity = { x: vx, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: vz };
    if (f.state.kind === "clump") { const mode = (vx || vz) ? "crawl" : "fidget";
      if (m.limbs !== mode) { m.limbs = mode; f.anim.main = { clip: mode === "crawl" ? CRAWL : FIDGET, loop: true, weight: 1, blend: 0.2 }; } }
    if (f.state.kind === "clump" && now > (m.tw ?? 0)) { // a knot of limbs never sits still: it lurches crawling, shudders at rest
      const mv = !!(vx || vz), yaw = (vx || vz) ? Math.atan2(-vx, -vz) * 180 / Math.PI : (f.rotation?.yaw ?? 0);
      m.tw = now + (mv ? 140 : 260 + ctx.random() * 500);
      f.rotation = { yaw: yaw + (ctx.random() - 0.5) * (mv ? 18 : 8), pitch: (mv ? -6 : 0) + (ctx.random() - 0.5) * (mv ? 14 : 5), roll: (ctx.random() - 0.5) * (mv ? 16 : 6) };
      if (!mv && ctx.random() < 0.08) ctx.emit("shake", { target: id, intensity: 0.06, duration: 0.35 });
    }
    if (f.state.kind === "hound" && m.clip !== clip) { m.clip = clip; f.anim.main = { clip, loop: clip !== "pounce" && clip !== "maul", weight: 1, blend: 0.2 }; }
  }
}
