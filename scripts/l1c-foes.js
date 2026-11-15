// Level 1.1's entities, one manager for all of them (rows tagged "l1c-foe"; places/level1c/sim.js lays and re-lays them).
// The hall is a straight line, so nothing here needs a map: a foe that sees someone closes along the floor's own profile
// (scripts/lib/level1c.js floorY), bites on a cooldown, gives up past its leash and walks home. None of them fall: they
// belong to the corridor, and run across the floor that is only drawn as readily as the floor that is there.
// Nothing crosses west of DATA.safeLine: Sector 1 stays safe.
import { targetsOf } from "./lib/decoys.js";
import { dmgAfterArmor } from "./lib/stats.js";
import { heard } from "./lib/hear.js";
import { floorY, centre, halfW, DATA as L } from "./lib/level1c.js";
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`, GOTH = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const SMOKE = `fx
pop smoke burst=24 on=sphere(.4) life=1.2..2.2 v=up(1)+sdir()*.5 size=.25..0.5 acc=buoy(.6)+drag(1) sz=$size*(.6>2) col=<.03,.03,.03> a=0>.6:.5>.6:.3>0 r=sprite(smoke-puff,alpha)`;
const CLIPS = {
  smiler: { idle: "cdn/clip-crouch-idle-loop.glb", move: "cdn/clip-crouch-walk-loop.glb", die: "cdn/clip-die.glb" },
  hound: { idle: "idle", move: "sprint", die: "death" }, warped: { idle: "idle", move: "sprint", die: "death" },
};
const WAKE = { smiler: GOTH("smiler-wet-giggle-hiss-stalking"), hound: SND("large-dog-low-growl-snarl-close"), warped: SND("large-dog-low-growl-snarl-close") };
function play(f, m, kind, k) { const c = CLIPS[kind]?.[k]; if (!c || m.clip === k) return; m.clip = k; f.anim.main = { clip: c, loop: k !== "die", clampWhenFinished: k === "die", weight: 1 }; }
export function update(ctx, dt) {
  const players = targetsOf(ctx, ctx.place.players).filter((p) => !(p.state?.hp <= 0) && !p.state?.dead);
  if (!ctx.place.players.length) return ctx.sleep(2);
  const foes = ctx.query({ tags: ["l1c-foe"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  const now = ctx.now(), mem = (ctx.self.session.m ??= {});
  for (const f of foes) {
    const s = f.state, B = s.brain; if (!B) continue;
    const m = (mem[f.id] ??= {}), pos = f.feetPosition, kind = s.kind;
    if ((s.hp ?? 1) <= 0 || s.dead) {
      if (!m.diedAt) { m.diedAt = now; s.dead = s.dead || true; f.fx = null; play(f, m, kind, "die"); heard(ctx, { clip: GOTH("shadow-creature-dissolve-hiss"), position: pos, volume: 0.8, maxDistance: 26 }); const n = s.n; if (n != null) ctx.place.state.l1cDead = { ...(ctx.place.state.l1cDead ?? {}), [n]: now }; }
      if (now - m.diedAt > 2200) { ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.6, z: pos.z }, script: SMOKE }); delete mem[f.id]; ctx.destroy(f.id); }
      continue;
    }
    if ((s.stunUntil ?? 0) > now) continue;
    const home = s.home ?? pos;
    let prey = null, best = 1e9;
    for (const p of players) { const q = p.feetPosition; if (q.x < L.safeLine || Math.abs(q.y - pos.y) > 5) continue; const d = flat(q, pos); if (d < best && d < (m.hunt ? B.sight * 1.4 : B.sight) && flat(q, home) < L.leash + B.sight) { best = d; prey = p; } }
    if (prey && !m.hunt) { m.hunt = true; if (WAKE[kind]) heard(ctx, { clip: WAKE[kind], position: pos, volume: 0.8, maxDistance: 30 }); if (kind === "stealer") heard(ctx, { clip: SND("distant-human-voice-calling-hello-down-long-hallway-echo"), position: pos, volume: 0.9, maxDistance: 30 }); }
    if (!prey) m.hunt = false;
    const goal = prey ? prey.feetPosition : home, d = prey ? best : flat(home, pos);
    const speed = prey ? (B.lunge && best < B.lungeAt ? B.lunge : B.speed) : B.speed * 0.5;
    const moving = prey ? d > B.reach * 0.8 : d > 0.6;
    let x = pos.x, z = pos.z;
    if (moving) { const k = Math.min(1, (speed * dt) / d); x += (goal.x - pos.x) * k; z += (goal.z - pos.z) * k; }
    if (x < L.safeLine + 1) x = L.safeLine + 1; // the tubes of Sector 1 hold them off
    const c = centre(x), w = halfW(x) - (B.radius ?? 0.4); z = Math.max(c - w, Math.min(c + w, z));
    const ground = floorY(x, z), y = B.fly ? ground + 1.3 + Math.sin(now / 420 + (s.n ?? 0)) * 0.35 : ground;
    f.feetPosition = { x, y: pos.y + (y - pos.y) * Math.min(1, dt * 8), z };
    if (moving || prey) f.rotation = { yaw: (Math.atan2(-(goal.x - pos.x), -(goal.z - pos.z)) * 180) / Math.PI };
    play(f, m, kind, moving ? "move" : "idle");
    if (prey && best <= B.reach && now >= (m.nextBite ?? 0)) {
      m.nextBite = now + B.cd * 1000;
      const dmg = dmgAfterArmor(prey.state.look, B.dmg), at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
      prey.state.hp = Math.max(0, (prey.state.hp ?? 100) - dmg);
      if (B.san) prey.state.sanity = Math.max(0, (prey.state.sanity ?? 100) - B.san);
      ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4040" });
      ctx.emit("playSound", { clip: SND("animal-bite-flesh-tear"), position: at, volume: 0.9 });
      ctx.emit("squash", { target: f.id, axis: "z", intensity: 0.15, duration: 0.2 });
      ctx.emit("cameraPunch", { direction: { x: prey.feetPosition.x - pos.x, y: 0, z: prey.feetPosition.z - pos.z }, intensity: 0.35 }, { audience: { player: prey.id } });
    }
  }
}
