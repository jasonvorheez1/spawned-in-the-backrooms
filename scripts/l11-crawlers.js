// Level 11 depths: one manager steps every foe in the crawl (data: scripts/lib/data/l11-depths.yml).
// The Clump (Wikidot Entity: a rolling mass of fused human arms): slow, then it gathers itself and hurls forward.
// Hounds: fast, maul at close range. Both are l8-hostile so every gun, swing and kick hits them; player.js pays XP.
import D from "./lib/data/l11-depths.yml";
import { clearSight } from "./lib/sight.js";
import { dmgAfterArmor, sneakMul } from "./lib/stats.js";
import { crouchMul } from "./lib/sneak.js";
const CLUMP = "/cdn/value.70d3d539720ee6e47b163258a06c502182ef9c7ee20f0721edda9dbc892314d8.glb";
const HOUND = "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb";
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function spec(kind, x, z, i) {
  const K = D.kinds[kind], base = { tags: ["l8-hostile", "l11foe", kind === "hound" ? "l11hound" : "l11clump"], feetPosition: { x, y: D.floor + 0.05, z }, physics: { body: "character" },
    state: { kind, name: K.name, hp: K.hp, maxHp: K.hp, home: { x, z }, slot: i } };
  return kind === "hound"
    ? { ...base, model: { id: HOUND }, scale: 1, audio: { clip: SND("low-wet-animal-growl-breathing-loop"), loop: true, gain: 0.25, spatial: true, maxDistance: 14 } }
    : { ...base, model: { id: CLUMP, forward: "-z" }, scale: 1.35, audio: { clip: SND("many-fingers-knuckles-cracking-and-skin-dragging-on-concrete-loop"), loop: true, gain: 0.35, spatial: true, maxDistance: 16 } };
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
      if (!m.died) { m.died = now; st.deadAt = { ...st.deadAt, [i]: now }; f.velocity = { x: 0, y: 0, z: 0 }; f.audio = null;
        if (f.state.kind === "hound") f.anim.main = { clip: "death", loop: false, clampWhenFinished: true, weight: 1 };
        else ctx.emit("playSound", { clip: SND("wet-bone-crunch-and-limp-limbs-collapsing"), position: pos, volume: 0.9 }); }
      if (now - m.died > (f.visible === false ? 300 : 4000)) delete ctx.place.objects[id];
      continue;
    }
    let prey = null, best = 1e9;
    for (const p of players) { // sight and hearing, both shrunk by sneaking
      const d = flat(p.feetPosition, pos), sn = (p.state?.attr ? sneakMul(p.state) : 1) * crouchMul(ctx, p);
      if (d > D.sight * sn && !(m.hunt === p.id && d < D.sight * 1.5)) continue;
      const seen = d < D.hear * sn || clearSight(ctx, { x: pos.x, y: pos.y + 0.8, z: pos.z }, { x: p.feetPosition.x, y: p.feetPosition.y + 1, z: p.feetPosition.z }, [id, p.id]);
      if (seen && d < best) { best = d; prey = p; }
    }
    if (prey && m.hunt !== prey.id) { m.hunt = prey.id; ctx.emit("playSound", { clip: SND(f.state.kind === "hound" ? "hound-snarl-and-bark-echoing" : "chorus-of-moaning-voices-and-snapping-fingers"), position: pos, volume: 1 }); }
    if (!prey) m.hunt = null;
    let vx = 0, vz = 0, clip = "idle";
    if (f.state.stunUntil > now || f.state.downUntil > now) { /* staggered */ }
    else if (prey) {
      const dx = prey.feetPosition.x - pos.x, dz = prey.feetPosition.z - pos.z, n = Math.hypot(dx, dz) || 1;
      f.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI };
      if (m.lungeTo > now) { vx = m.lv.x; vz = m.lv.z; clip = "pounce"; }
      else if (m.windUntil > now) { clip = "pounce"; } // the tell: it gathers before it throws itself
      else if (m.windUntil && now >= m.windUntil && now - m.windUntil < 100) { m.lv = { x: dx / n * K.lunge * 1.6, z: dz / n * K.lunge * 1.6 }; m.lungeTo = now + 450; m.windUntil = 0; }
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
    f.velocity = { x: vx, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: vz };
    if (f.state.kind === "hound" && m.clip !== clip) { m.clip = clip; f.anim.main = { clip, loop: clip !== "pounce" && clip !== "maul", weight: 1, blend: 0.2 }; }
  }
}
