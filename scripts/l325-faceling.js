// An adult Faceling up on Boom Town scaffolding (scripts/lib/level325-life.js places it). It watches the street and throws
// rebar bolts at a wanderer in range; a bolt flies on a readable arc, so stepping aside dodges it. When its own tower
// starts to shake it climbs down and leaves: it doesn't know the timing either, it just feels it like you do.
// Savi's picks: range 38 m, a throw every 3.2 s (first after 2 s of seeing you), bolt 17 m/s, 14 damage inside 1.4 m, 70 hp.
import { towerAt } from "./lib/level325.js";
import { animate } from "builtin/tween";
const BOLT = "/cdn/value.6685491fa57552cc00b59fd5148bed46dfa2f329a44d6e1f0e3a5872779b9336.glb";
const SFX = (n) => "/cdn/moodboard-realistic-gritty/sfx-" + n + ".mp3";
const RANGE = 38, EVERY = 3200, SPEED = 17, DMG = 14, HITR = 1.4;
export function update(ctx) {
  const me = ctx.self, s = me.state, f = me.feetPosition, now = ctx.now();
  if (s.dead) return ctx.sleep(5);
  if ((s.hp ?? 70) <= 0) return die(ctx);
  const t = towerAt(ctx, s.ix, s.iz);
  if (!s.fled && t && (t.stage === "warn" || t.stage === "rubble" || t.cycle !== s.cycle)) { // its own tower is going: down and gone
    s.fled = true; me.anim = { idle: null };
    ctx.emit("playSound", { clip: SFX("bamboo-scaffold-rattle-hurried-climb"), position: f, volume: 0.6, maxDistance: 40 });
    me.lifetime = 4; return ctx.sleep(5);
  }
  let best = null, bd = RANGE;
  for (const p of ctx.place.players) { const d = Math.hypot(p.feetPosition.x - f.x, p.feetPosition.z - f.z); if (d < bd && d > 4) { bd = d; best = p; } }
  if (!best) { s.seen = 0; return ctx.sleep(1); }
  me.rotation = { yaw: Math.atan2(-(best.feetPosition.x - f.x), -(best.feetPosition.z - f.z)) * 57.2958 };
  if (!s.seen) { s.seen = now; s.next = now + 2000; ctx.emit("playSound", { clip: SFX("faceling-low-clicking-trill"), position: f, volume: 0.55, maxDistance: 45 }); }
  if (now >= (s.next ?? 0)) { s.next = now + EVERY; throwAt(ctx, best); }
  ctx.sleep(0.4);
}
function throwAt(ctx, p) {
  const me = ctx.self, f = me.feetPosition, hand = { x: f.x, y: f.y + 1.5, z: f.z };
  const v = p.velocity ?? { x: 0, z: 0 }, d0 = Math.hypot(p.feetPosition.x - f.x, p.feetPosition.z - f.z), T = Math.max(0.6, Math.hypot(d0, f.y) / SPEED);
  const sa = ctx.random() * 6.283, sr = ctx.random() * 0.9; // no lead, a little scatter: a body that keeps moving is gone from where it landed (Shelly ok'd, Nov 17)
  const aim = { x: p.feetPosition.x + Math.cos(sa) * sr, y: p.feetPosition.y + 1, z: p.feetPosition.z + Math.sin(sa) * sr };
  const yaw = Math.atan2(-(aim.x - hand.x), -(aim.z - hand.z)) * 57.2958, pitch = -Math.atan2(hand.y - aim.y, d0) * 57.2958;
  const id = ctx.spawn({ feetPosition: hand, rotation: { yaw, pitch }, model: { id: BOLT, forward: "+x" }, scale: 1.4, lifetime: T + 0.4, physics: "none", castShadow: false,
    fx: { script: `fx\npop trail rate=40 life=.25 size=.04 col=<.6,.55,.5> a=.5>0 sz=$size r=sprite(soft-disc,alpha)` } });
  ctx.emit("playSound", { clip: SFX("rebar-thrown-whoosh"), position: hand, volume: 0.7, maxDistance: 45 });
  // a flat throw with a lob: the bolt rises a little then drops onto where it aimed
  animateFlight(ctx, id, hand, aim, T);
  ctx.after(T, "land", { x: aim.x, y: aim.y, z: aim.z });
}
function animateFlight(ctx, id, a, b, T) {
  const o = ctx.getObject(id); if (!o) return;
  const mid = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 1.2 + T * 1.5, z: (a.z + b.z) / 2 };
  animate(ctx, o, { "feetPosition.x": [a.x, mid.x, b.x], "feetPosition.y": [a.y, mid.y, b.y], "feetPosition.z": [a.z, mid.z, b.z] }, { duration: T, easing: "linear" });
}
export function land(ctx, at) {
  ctx.emit("fx", { position: at, script: `fx\npop chip burst=10 life=.5..1 v=sdir()*(1..3)+up(2..4) size=.05..0.12 acc=grav()+drag(.3) col=<.5,.45,.4> a=1>0 sz=$size floor=die r=sprite(chip,alpha,velocity,.02)` });
  ctx.emit("playSound", { clip: SFX("rebar-clang-on-asphalt"), position: at, volume: 0.6, maxDistance: 25 });
  for (const p of ctx.place.players) {
    const d = Math.hypot(p.feetPosition.x - at.x, p.feetPosition.z - at.z); if (d > HITR) continue;
    p.state.hp ??= 100; p.state.hp -= DMG;
    p.state.notice = { text: "A thrown rebar bolt hits you. Something up on the scaffold.", at: ctx.now() };
    ctx.emit("damageNumber", { position: { x: p.feetPosition.x, y: p.feetPosition.y + 1.8, z: p.feetPosition.z }, value: DMG, color: "#ff6a4a" });
    ctx.emit("cameraPunch", { direction: { x: p.feetPosition.x - at.x, y: 0, z: p.feetPosition.z - at.z }, intensity: 0.4 }, { audience: { player: p.id } });
  }
}
function die(ctx) {
  const me = ctx.self, s = me.state; s.dead = true;
  me.tags = (me.tags ?? []).filter((t) => t !== "l325foe");
  ctx.emit("playSound", { clip: SFX("body-falls-onto-bamboo-and-concrete"), position: me.feetPosition, volume: 0.8, maxDistance: 40 });
  const f = me.feetPosition;
  animate(ctx, me, { "feetPosition.y": [f.y, 0.15] }, { duration: Math.max(0.5, Math.sqrt(f.y / 4.9)), easing: "easeInQuad" });
  me.anim = { die: { clip: "death", loop: false } }; // knocked flat, never killed: NPCs can't die (Shelly's rule)
  s.down = true; ctx.emit("damageNumber", { position: { x: f.x, y: 1.6, z: f.z }, text: "DOWN", color: "#ffd9a0" });
  ctx.after(9, "slink", {});
  ctx.place.state.l325dead = { ...(ctx.place.state.l325dead ?? {}), [s.slot]: true };
}

// up again after the knockdown, it limps into the dust and is gone for this tower's cycle
export function slink(ctx) {
  const me = ctx.self, f = me.feetPosition, a = ctx.random() * 6.283;
  me.anim = { die: null };
  animate(ctx, me, { feetPosition: { x: f.x + Math.cos(a) * 14, y: f.y, z: f.z + Math.sin(a) * 14 }, "material.dissolve": [0, 1] }, { duration: 6, easing: "linear" });
  me.lifetime = 7;
}
