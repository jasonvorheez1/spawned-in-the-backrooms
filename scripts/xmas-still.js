// Still Lifes that move. role "sitter": the Lamp Sitter turns its lamp up and keeps it on whoever comes near.
// role "stray": the Red Stray staggers after you, groaning; knocks before it forces a shut door; backs off from light. Numbers: data/xmas.yml
import X from "./lib/data/xmas.yml";
const SND = "/cdn/moodboard-gothic-horror/";
const GROANS = ["sfx-low-muffled-stuffed-throat-groan.mp3", "sfx-slow-creaking-fabric-stretch-groan.mp3"];
const near = (ctx, f, r) => { let best = null, bd = r; for (const p of ctx.place.players) { const d = Math.hypot(p.feetPosition.x - f.x, p.feetPosition.z - f.z); if (d < bd && !p.state?.dead) { bd = d; best = p; } } return best ? { p: best, d: bd } : null; };
const yawTo = (a, b) => Math.atan2(-(b.x - a.x), -(b.z - a.z)) * 180 / Math.PI; // −Z forward
const lampLit = (p) => !!(p.state?.flashOn ?? p.state?.flashlight ?? p.state?.flash);
export function update(ctx, dt) {
  const me = ctx.self, s = me.state, now = ctx.now(), f = me.feetPosition;
  if (!me.session.posed) { // a rig with no clip stands in T: every Still Life gets its pose the moment it wakes
    me.session.posed = true;
    if (s.role === "sitter") { const b = ctx.getObject(me.id + "/body"); if (b) b.anim.base = { clip: "cdn/clip-sit-loop.glb", loop: true, speed: 0.2, weight: 1 }; }
    else if (s.role === "sunk") me.anim.base = { clip: "cdn/clip-swim-idle-loop.glb", loop: true, speed: 0.12, weight: 1 }; // arms out, reaching for the tree
    else if (s.role === "stray") { me.session.walking = false; me.anim.base = { clip: "cdn/clip-idle-loop.glb", loop: true, speed: 0.15, weight: 1 }; }
  }
  if (s.role === "sunk") return ctx.sleep();
  if (s.role === "sitter") return sitter(ctx, dt, me, s, f);
  if (s.role === "stray") return stray(ctx, dt, me, s, f, now);
}
function sitter(ctx, dt, me, s, f) {
  const S = X.sitter, t = near(ctx, f, s.lamp > 0.05 ? S.sleep : S.wake), sess = me.session;
  const goal = t ? S.lampMax : 0; sess.lamp ??= s.lamp ?? 0;
  sess.lamp += Math.sign(goal - sess.lamp) * Math.min(Math.abs(goal - sess.lamp), S.ramp * dt);
  if (t) { const want = yawTo(f, t.p.feetPosition), cur = sess.yaw ?? me.rotation?.yaw ?? -125, d = ((want - cur + 540) % 360) - 180; sess.yaw = cur + Math.sign(d) * Math.min(Math.abs(d), S.turn * dt); me.rotation = { yaw: sess.yaw }; }
  if (Math.abs(sess.lamp - (sess.drawn ?? -1)) > 0.08 || (goal === 0 && sess.drawn > 0 && sess.lamp === 0)) {
    sess.drawn = sess.lamp; const L = ctx.getObject(me.id + "/lamp"); if (L) L.light = { kind: "spot", color: "#ffd9a0", intensity: sess.lamp, distance: 12, angle: 28, penumbra: 0.6, aim: [0, -0.35, -1] };
    const on = sess.lamp > S.lampMax * 0.4; if (on !== !!s.beam) { s.beam = on; if (on) ctx.emit("playSound", { clip: SND + "sfx-old-lamp-switch-click-and-filament-hum.mp3", position: f, volume: 0.5 }); }
  }
  if (!t && sess.lamp === 0) ctx.sleep(0.5);
}
function stray(ctx, dt, me, s, f, now) {
  const S = X.stray, g = ctx.place.gravity?.y ?? -9.8, v = me.velocity ?? { x: 0, y: 0, z: 0 };
  if (s.dead) return ctx.sleep(30);
  if ((s.hp ?? 1) <= 0) { // falls still for good, its stuffing left to search
    s.dead = true; me.velocity = { x: 0, y: 0, z: 0 }; me.anim.base = null; me.rotation = { yaw: me.rotation?.yaw ?? 0, roll: 88 };
    me.tags = [...me.tags.filter((t) => t !== "l8-hostile"), "container"]; s.items = "stuffing,stuffing,stuffing"; s.verb = "Search"; s.name = "Red Stray, gone still";
    ctx.emit("playSound", { clip: SND + GROANS[0], position: f, volume: 0.6, pitch: 0.7 }); return;
  }
  const sess = me.session, t = near(ctx, f, S.aggro);
  let vx = 0, vz = 0;
  if (t && now > (s.stunUntil ?? 0)) {
    const tp = t.p.feetPosition, dx = tp.x - f.x, dz = tp.z - f.z, d = Math.hypot(dx, dz) || 1;
    // light: the Lamp Sitter's beam, or the target's own flashlight pointed its way
    let fear = null;
    const sit = ctx.place.objects["xmas-lamp-sitter"];
    if (sit?.state?.beam) { const sf = sit.feetPosition, sd = Math.hypot(f.x - sf.x, f.z - sf.z); if (sd < S.fearRange) fear = sf; }
    if (!fear && lampLit(t.p) && d < S.fearRange) { const yw = ((t.p.camera?.rotation?.yaw ?? 0) * Math.PI) / 180, fx = -Math.sin(yw), fz = -Math.cos(yw); if ((-dx * fx - dz * fz) / d > S.fearCone) fear = tp; }
    if (fear) { const ax = f.x - fear.x, az = f.z - fear.z, ad = Math.hypot(ax, az) || 1; vx = (ax / ad) * S.backoff; vz = (az / ad) * S.backoff; }
    else if (d > S.reach) {
      const door = ctx.place.objects["xmas-exit-door"];
      if (door && !door.state.open && Math.hypot(door.feetPosition.x - f.x, door.feetPosition.z - f.z) < 1.6) { // knock, knock … then through
        if (now > (sess.knockAt ?? 0)) { sess.knocks = (sess.knocks ?? 0) + 1; sess.knockAt = now + S.knockGap * 1000; ctx.emit("playSound", { clip: SND + "sfx-three-slow-heavy-knocks-on-wooden-door.mp3", position: door.feetPosition, volume: 0.8 });
          if (sess.knocks > S.knocks) { door.state.open = true; door.rotation = { yaw: -95 }; door.tags = door.tags.filter((x) => x !== "xmas-shut"); ctx.emit("playSound", { clip: SND + "sfx-wooden-door-forced-open-creak-bang.mp3", position: door.feetPosition, volume: 0.9 }); } }
      } else { const sway = 0.65 + 0.35 * Math.sin(now / 260); vx = (dx / d) * S.speed * sway; vz = (dz / d) * S.speed * sway; }
    } else if (now > (sess.hitAt ?? 0)) {
      sess.hitAt = now + S.every * 1000; t.p.state.hp -= S.damage;
      ctx.emit("damageNumber", { position: { ...tp, y: tp.y + 1.5 }, value: S.damage, color: "#ff6040" });
      ctx.emit("playSound", { clip: SND + "sfx-heavy-soft-thump-cloth-strike.mp3", position: tp, volume: 0.7 });
      ctx.emit("screenShake", { intensity: 0.35, duration: 0.25 }, { audience: { player: t.p.id } });
    }
    const yw = Math.atan2(-vx || -dx, -vz || -dz) * 180 / Math.PI; me.rotation = { yaw: fear ? yawTo(f, tp) : yw };
    if (now > (sess.groanAt ?? 0)) { sess.groanAt = now + (S.groan[0] + ctx.random() * (S.groan[1] - S.groan[0])) * 1000; ctx.emit("playSound", { clip: SND + GROANS[(ctx.random() * 2) | 0], position: f, volume: 0.65, pitch: 0.8 + ctx.random() * 0.15, maxDistance: 22 }); }
  }
  const moving = Math.hypot(vx, vz) > 0.1;
  if (moving !== !!sess.walking) { sess.walking = moving; me.anim.base = moving ? { clip: "cdn/clip-walk-loop.glb", loop: true, speed: 0.55, weight: 1 } : { clip: "cdn/clip-idle-loop.glb", loop: true, speed: 0.15, weight: 1 }; }
  me.velocity = { x: vx, y: me.grounded ? -0.5 : v.y + g * dt, z: vz };
  if (!t && !moving) ctx.sleep(0.4);
}
