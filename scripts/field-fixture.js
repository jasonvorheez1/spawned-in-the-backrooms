// Shared rest and warming fixtures for authored shelters.
import { hands } from "./desk-item.js";
import { maxHp, maxSan } from "./player.js";
import { canCarry } from "./lib/stats.js";
import { itemSpec } from "./lib/vend-item.js";
import { animate } from "builtin/tween";
import F from "./lib/data/field-fixtures.yml";

const REACH = 3;
const STEP = 0.7;
const STEAM = `fx
pop steam burst=8..11 on=disc(.09) life=1.5..2 v=up(.08..0.18) size=.04..0.07 col=<.91,.9,.88> a=0>.24:.2>0 sz=$size*(.5>2.3) r=sprite(smoke-puff,alpha)`;
export { handsOff } from "./desk-item.js";

const where = (o) => o?.worldFeetPosition ?? o?.feetPosition;
const gap = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) : Infinity;
const tell = (ctx, p, text) => { p.state.notice = { text, at: ctx.now() }; };
export function startRestPose(ctx, p, seconds) {
  if (!p.anim || p.state.sit || p.state.crawl || p.state.swimming) return;
  p.state.fixturePoseUntil = ctx.now() + seconds * 1000;
  p.anim.fixtureRest = { clip: "cdn/clip-crouch-idle-loop.glb", loop: "loop", weight: 2, blendIn: 0.4, blendOut: 0.35 };
}
function reachable(ctx, by) {
  const p = ctx.place.players.find((q) => q.id === by);
  const s = ctx.self.state;
  return p?.state && !p.state.dead && (p.state.hp ?? 1) > 0 && !s.broke
    && gap(where(p), s.c ?? where(ctx.self)) <= REACH ? p : null;
}
function canRest(ctx, p) {
  const { room, plate } = ctx.self.state;
  if (plate) return ctx.getObject(plate)?.state?.owner === (p.userId ?? p.id);
  if (!room) return true;
  const ps = p.state;
  const lease = ctx.place.state.l5rent?.[room];
  return ps.l5room === room && ps.l5until > ctx.now()
    && (!lease || lease.uid === (p.userId ?? p.id) && lease.until > ctx.now());
}
function sound(ctx, clip, volume = 0.4) {
  ctx.emit("playSound", { clip, position: where(ctx.self), volume, maxDistance: 7 });
}
function startRest(ctx, p) {
  const ps = p.state, now = ctx.now(), conf = F.rest;
  if (!canRest(ctx, p)) {
    tell(ctx, p, ctx.self.state.plate ? "This cot belongs to the office's owner." : "Ask the concierge for a room of your own.");
    return;
  }
  if (now - (ps.fieldRestAt ?? -1e12) < conf.cooldown * 1000) { tell(ctx, p, "You've rested recently."); return; }
  if ((ps.fieldRestPending ?? 0) > now) return;
  const at = now + conf.seconds * 1000;
  ps.fieldRestPending = at;
  startRestPose(ctx, p, conf.seconds);
  tell(ctx, p, "Stay here a moment to rest.");
  sound(ctx, "cdn/sfx-futon-rustle-soft-exhale.mp3");
  ctx.after(conf.seconds, "finishRest", { by: p.id, at, from: { ...where(p) }, hp: ps.hp });
}
export function finishRest(ctx, { by, at, from, hp }) {
  const raw = ctx.place.players.find((q) => q.id === by);
  if (raw?.state?.fieldRestPending !== at) return;
  raw.state.fieldRestPending = 0;
  const p = reachable(ctx, by);
  if (!p || !canRest(ctx, p) || gap(where(p), from) > STEP || p.state.hp < hp) {
    tell(ctx, raw, "Your rest was interrupted.");
    return;
  }
  const ps = p.state, conf = ctx.self.state.room || ctx.self.state.plate ? F.guest : F.rest;
  const level = ps.level ?? 1, health = maxHp(level, ps), sanity = maxSan(level, ps);
  ps.hp = Math.min(health, (ps.hp ?? health) + conf.hp);
  ps.sanity = Math.min(sanity, (ps.sanity ?? sanity) + conf.sanity);
  ps.fieldRestAt = ctx.now();
  ctx.emit("screenFlash", { color: "#1c1612", duration: 0.8, intensity: 0.65 }, { audience: { player: p.id } });
  tell(ctx, p, ctx.self.state.restLine ?? "You catch your breath.");
}

function startHeat(ctx, p) {
  const s = ctx.self.state, hot = F.stove, bag = p.state.snacks ?? {};
  if (s.heatAt) { tell(ctx, p, "Give the tin a moment."); return; }
  if (!(bag[hot.cold] > 0)) { tell(ctx, p, "You need a tin of beans. Check the refrigerator."); return; }
  s.heatAt = ctx.now() + hot.seconds * 1000;
  s.verb = "Check burner";
  hands(ctx, p);
  const tin = ctx.spawn("warm-tin", {
    parent: ctx.self.id, feetPosition: { x: -0.14, y: 0.94, z: 0.1 },
    castShadow: false, lifetime: hot.seconds + 1,
    ...itemSpec(hot.cold),
    light: { kind: "point", color: "#ff8334", distance: 1.8, intensity: 0.75, shadow: { enabled: false } },
  });
  animate(ctx, tin, { "feetPosition.y": [1.04, 0.94], "rotation.roll": [12, 0] }, { duration: 0.42, easing: "easeOutQuad" });
  const at = where(ctx.self);
  ctx.emit("fx", { position: { ...at, y: at.y + 1.06 }, script: STEAM }, { audience: { nearby: at, radius: 12 } });
  sound(ctx, "cdn/moodboard-realistic-gritty/sfx-lock-picking-click.mp3");
  ctx.after(hot.seconds, "finishHeat", { by: p.id, at: s.heatAt });
}
export function finishHeat(ctx, { by, at }) {
  const s = ctx.self.state, { cold, hot } = F.stove;
  if (s.heatAt !== at) return;
  const tin = ctx.self.id + "/warm-tin";
  if (ctx.getObject(tin)) ctx.destroy(tin);
  s.heatAt = 0;
  s.verb = "Heat a tin";
  const p = reachable(ctx, by);
  if (!p) return;
  const ps = p.state, bag = ps.snacks ?? {};
  if (!(bag[cold] > 0)) { tell(ctx, p, "The burner clicks off. The tin's gone."); return; }
  const reduced = { ...bag, [cold]: bag[cold] - 1 };
  const carry = canCarry({ ...ps, snacks: reduced }, hot);
  if (!carry.ok) { tell(ctx, p, carry.msg ?? "Your bag is full."); return; }
  ps.snacks = { ...reduced, [hot]: (reduced[hot] ?? 0) + 1 };
  ps.pickedAt = ctx.now();
  hands(ctx, p);
  tell(ctx, p, "Hot beans · Eat from Aid to warm up.");
}
export function onSpawn(ctx) {
  const s = ctx.self.state;
  if (s.kind === "field-stove") { s.heatAt = 0; s.verb = "Heat a tin"; }
}
export const ears = {
  press(ctx, { by } = {}) {
    const p = reachable(ctx, by);
    if (!p) return;
    if (ctx.self.state.kind === "field-rest") startRest(ctx, p);
    if (ctx.self.state.kind === "field-stove") startHeat(ctx, p);
  },
};
