// Entity 720, "Tiny" (Shelly Nov 12 "massively overhaul Tiny", wiki page as brief).
// A 2.44 m tar-coated amphibian in a fish-hide cloak, a tooth spear, a bone mask with eyes that glow brighter the deeper he is.
// He owns the upper water: anyone who swims is heard and hunted. He cannot walk on land, so the shore is safe;
// loud noise drives him off for a while; nothing hurts him. He talks into your head (telepathy) and only ever to be cruel.
//   patrol  slow loops round his lair (the stone circle west of the entrance)
//   stalk   a swimmer is heard: he comes fast and deep, then rises to circle
//   circle  a few seconds of looking at you, a line in your head
//   lunge   the spear: damage, tar in your eyes, then he peels off and circles again
//   shore   you climbed out: he holds at the waterline, says so, and goes home
//   flee    a loud noise: he dives away to the lair
// Numbers are Savi's picks, tuned to a first swim: the fort's pier to the seawatch rock (~140 m) is about three lunges from him.
import { heard } from "./lib/hear.js";
import { vo } from "./lib/voices.js";
import T from "./lib/data/tiny.yml";

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const LINES = T.lines;
const TAR = `fx
pop tar burst=26..40 life=.6..1.2 v=sdir()*(2..4.5)+up(1..2) size=.06..0.16 acc=grav()*.9+drag(1.2) col=<.02,.02,.025> a=1>.7:1>0 sz=$size r=sprite(soft-disc,alpha)
pop ink burst=6..9 life=1.2..2 v=sdir()*(.4..1) size=.5..0.9 acc=drag(1.5) col=<.03,.03,.04> a=0>.15:.7>.6:.5>0 sz=$size*(.6>2.2) rot=spin(.2) r=sprite(smoke-puff,alpha)`;
const WAKE = `fx
pop bub rate=?mobile:10|22 on=sphere(.35) life=.8..1.6 v=up(.6..1.4)+sdir()*.3 size=.03..0.07 acc=buoy(1.2)+drag(1) col=<.7,.9,.95> a=0>.6:.5>0 sz=$size r=sprite(soft-disc,add)
pop drip rate=?mobile:4|8 on=sphere(.4) life=.8..1.4 v=sdir()*.2 size=.04..0.08 acc=drag(2) col=<.02,.02,.03> a=.9>0 sz=$size r=sprite(soft-disc,alpha)`;

function say(ctx, me, key, to) {
  const pool = LINES[key]; if (!pool?.length) return;
  const m = me.session, now = ctx.now();
  if (now < (m.quietUntil ?? 0)) return;
  const text = pool[Math.floor(ctx.random() * pool.length)];
  const d = 1600 + text.length * 70; m.quietUntil = now + d + 2500;
  me.state.line = { t: text, at: now, d }; me.state.talkTo = to?.id ?? null;
  const clip = vo("l7-tiny", text);
  // telepathy: it sounds inside the head, not from the water, so it is not spatial and only the hunted hears it
  if (clip && to) heard(ctx, { clip, volume: 0.95, bus: "Voice" }, { audience: { player: to.id } });
}

export function onSpawn(ctx) {
  const s = ctx.self.state;
  s.home ??= { x: T.lair.x, z: T.lair.z };
  ctx.self.fx = { script: WAKE };
}

export const ears = {
  noise(ctx, n) { // the wiki's one weakness: loud noise underwater. A shot, a horn, a sonar ping near him sends him home
    const me = ctx.self; if (!n?.position) return;
    if (Math.hypot(n.position.x - me.feetPosition.x, n.position.z - me.feetPosition.z) > (n.radius ?? 20) + T.noiseReach) return;
    const m = me.session; if (m.mode === "flee") return;
    const prey = m.prey && ctx.place.players.find((p) => p.id === m.prey);
    say(ctx, me, "noise", prey); m.mode = "flee"; m.until = ctx.now() + T.fleeSeconds * 1000; m.prey = null;
  },
};

export function update(ctx, dt) {
  const me = ctx.self, m = me.session, s = me.state, now = ctx.now(), p = me.feetPosition;
  m.mode ??= "patrol"; m.ang ??= 0; m.v ??= { x: 0, y: 0, z: 0 };
  const swimmers = ctx.place.players.filter((q) => q.state?.swimming && !q.state?.dead && (q.state?.hp ?? 1) > 0);
  let prey = m.prey ? ctx.place.players.find((q) => q.id === m.prey) : null;
  if (prey && (prey.state?.dead || (prey.state?.hp ?? 1) <= 0)) { say(ctx, me, "kill", prey); m.prey = null; prey = null; m.mode = "patrol"; }
  if (!prey && m.mode !== "flee") {
    let best = T.hear;
    for (const q of swimmers) { const d = flat(q.feetPosition, p); if (d < best) { best = d; prey = q; } }
    if (prey) { m.prey = prey.id; m.mode = "stalk"; say(ctx, me, "notice", prey); }
  }
  if (!prey && !swimmers.length && m.mode === "patrol" && !ctx.place.players.some((q) => flat(q.feetPosition, p) < 90)) {
    // nobody near: a cheap loop, slept between steps
    m.ang += dt * 0.12; const h = s.home;
    me.feetPosition = { x: h.x + Math.cos(m.ang) * T.patrolR, y: T.patrolY, z: h.z + Math.sin(m.ang) * T.patrolR };
    me.rotation = { yaw: -m.ang * 57.3, pitch: -80 };
    return;
  }

  let goal, speed = T.cruise, depth = T.patrolY;
  if (m.mode === "flee") {
    goal = s.home; speed = T.dash; depth = -14;
    if (now > m.until) m.mode = "patrol";
  } else if (prey && !prey.state?.swimming && m.mode !== "shore") {
    m.mode = "shore"; m.until = now + 5000; say(ctx, me, "shore", prey);
  }
  if (m.mode === "shore") {
    // he cannot walk on land: he comes to the shallows below where you climbed out, head just out of the water, and watches
    const q = prey?.feetPosition ?? s.home, dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1;
    goal = { x: q.x - (dx / d) * 6, z: q.z - (dz / d) * 6 }; depth = -1.6; speed = T.cruise;
    if (now > m.until || (prey && prey.state?.swimming)) { m.mode = prey?.state?.swimming ? "stalk" : "patrol"; if (m.mode === "patrol") m.prey = null; }
  } else if (m.mode === "patrol") {
    m.ang += dt * 0.18; const h = s.home;
    goal = { x: h.x + Math.cos(m.ang) * T.patrolR, z: h.z + Math.sin(m.ang) * T.patrolR };
  } else if (prey && m.mode === "stalk") {
    goal = prey.feetPosition; speed = T.dash; depth = -6;
    if (flat(prey.feetPosition, p) < T.circleR + 2) { m.mode = "circle"; m.until = now + T.circleSeconds * 1000; m.ang = Math.atan2(p.z - prey.feetPosition.z, p.x - prey.feetPosition.x); say(ctx, me, "circle", prey); }
  } else if (prey && m.mode === "circle") {
    m.ang += dt * (T.cruise / T.circleR); const q = prey.feetPosition;
    goal = { x: q.x + Math.cos(m.ang) * T.circleR, z: q.z + Math.sin(m.ang) * T.circleR }; depth = -2.2;
    if (now > m.until) { m.mode = "lunge"; m.until = now + 2500; }
  } else if (prey && m.mode === "lunge") {
    const q = prey.feetPosition; goal = q; depth = q.y - 0.6; speed = T.lunge;
    const d = Math.hypot(q.x - p.x, q.z - p.z, (q.y + 0.5) - (p.y + 1.2));
    if (d < T.reach) {
      prey.state.hp -= T.damage; // judged here, where he swims; the HUD clamps
      const at = { x: q.x, y: q.y + 1, z: q.z };
      ctx.emit("fx", { position: at, script: TAR });
      ctx.emit("playSound", { clip: T.sounds.stab, position: at, volume: 0.9, refDistance: 4, maxDistance: 40 });
      ctx.emit("damageNumber", { position: at, value: T.damage, color: "#9ad6c8" });
      ctx.emit("screenFlash", { color: "#050506", duration: 0.9, intensity: 0.85 }, { audience: { player: prey.id } }); // tar in the eyes
      ctx.emit("cameraPunch", { direction: { x: (q.x - p.x) / d, y: 0, z: (q.z - p.z) / d }, intensity: 0.6 }, { audience: { player: prey.id } });
      ctx.emit("impulse", { target: prey.id, impulse: { x: ((q.x - p.x) / d) * 260, y: -120, z: ((q.z - p.z) / d) * 260 } });
      if (ctx.random() < 0.5) say(ctx, me, "hit", prey);
      m.mode = "circle"; m.until = now + T.recoverSeconds * 1000; m.ang = Math.atan2(p.z - q.z, p.x - q.x);
    } else if (now > m.until) { m.mode = "circle"; m.until = now + 1500; }
  }
  if (!goal) { m.mode = "patrol"; return; }

  // swim: ease toward the goal, never above the surface (y 0) and never into the sea floor near the lair
  const gy = Math.min(-0.9, depth), dx = goal.x - p.x, dz = goal.z - p.z, dy = gy - p.y, d = Math.hypot(dx, dy, dz) || 1;
  const want = { x: (dx / d) * speed, y: (dy / d) * speed * 0.7, z: (dz / d) * speed }, k = Math.min(1, dt * 3);
  m.v = { x: m.v.x + (want.x - m.v.x) * k, y: m.v.y + (want.y - m.v.y) * k, z: m.v.z + (want.z - m.v.z) * k };
  const np = { x: p.x + m.v.x * dt, y: Math.min(-0.9, p.y + m.v.y * dt), z: p.z + m.v.z * dt };
  const floor = ctx.place.terrain?.heightAt?.(np.x, np.z); if (floor != null && np.y < floor + 0.4) np.y = floor + 0.4;
  me.feetPosition = np;
  const v = Math.hypot(m.v.x, m.v.z);
  if (v > 0.3) {
    const yaw = Math.atan2(-m.v.x, -m.v.z) * 57.3, t = now * 0.004 * (1 + v * 0.15);
    // a body built upright lies along its swim: pitched forward, rolling with each kick; at the shore it stands treading water
    const pitch = m.mode === "shore" ? -10 : -80 + Math.sin(t * 2) * 6;
    me.rotation = { yaw, pitch, roll: Math.sin(t) * (m.mode === "lunge" ? 4 : 12) };
  }
  // his eyes glow brighter the darker the water (wiki): the eye light follows depth
  const eye = ctx.getObject(me.id + "/eyes");
  if (eye && Math.abs((m.lastY ?? 0) - np.y) > 0.5) { m.lastY = np.y; eye.light = { ...eye.light, intensity: 0.6 + Math.min(4, -np.y * 0.35) }; }
}
