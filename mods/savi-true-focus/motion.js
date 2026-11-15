import { prepare } from "./lib/wardrobe-owner.js";
import { findPath } from "builtin/nav";
import { SETTINGS as S } from "./lib/settings.js";
import { behaviors, copy, loadWardrobe, modelId, restoreActor } from "./lib/wardrobe-runtime.js";

function valid(ctx) { return ctx.self.tags?.includes("helper") && !ctx.world.players.some(p => p.id === ctx.self.id) && ctx.self.state.saviTrueFocus?.original; }
function init(ctx) {
  if (!valid(ctx)) return null;
  const loaded = loadWardrobe(ctx);
  if (!loaded.ok || !loaded.data.clips.walk || !loaded.data.clips.jog) return null;
  const actor = ctx.self, marker = actor.state.saviTrueFocus;
  if (modelId(actor.model) !== marker.avatarModel) return null;
  const data = loaded.data;
  if (marker.avatarModel !== data.avatarModel) {
    const model = typeof actor.model === "string" ? { id: actor.model } : copy(actor.model);
    model.id = data.avatarModel;
    actor.model = model;
    marker.avatarModel = data.avatarModel;
    const driver = ctx.getObject(marker.driver);
    if (driver) driver.state.data = data;
  }
  actor.anim[S.channel] = { clip: data.clips.read, loop: "loop", weight: 1, speed: 1 };
  marker.motionModelReady = false;
  ctx.onModelReady(actor.id, () => {
    const a = ctx.getObject(actor.id);
    if (a?.state.saviTrueFocus?.avatarModel === data.avatarModel) a.state.saviTrueFocus.motionModelReady = true;
  });
  return { data, nextPath: 0, path: [], index: 0, moving: false, clip: data.clips.read, speed: 1 };
}
function pose(ctx, s, moving, jog) {
  const marker = ctx.self.state.saviTrueFocus;
  if (marker.moving !== moving) { marker.moving = moving; marker.phase = moving ? "walk" : "read"; }
  const clip = moving ? (jog ? s.data.clips.jog : s.data.clips.walk) : s.data.clips.read;
  const speed = jog ? S.motion.jogPlayback : 1;
  if (s.clip !== clip || s.speed !== speed) {
    ctx.self.anim[S.channel] = { clip, loop: "loop", weight: 1, speed };
    s.clip = clip; s.speed = speed;
  }
}
export function onSpawn(ctx) { delete ctx.session["trueFocusMotion:" + ctx.self.id]; }
export function update(ctx, dt) {
  if (!valid(ctx)) { ctx.self.behavior = behaviors(ctx.self).filter(b => b !== S.motionBehavior); ctx.sleep(); return; }
  const actor = ctx.self, marker = actor.state.saviTrueFocus;
  if (marker.phase === "queued" && !marker.ownerPreparing) prepare(ctx);
  const key = "trueFocusMotion:" + actor.id;
  let s = ctx.session[key];
  if (!s) { s = init(ctx); if (!s) { ctx.sleep(S.motion.idlePoll); return; } ctx.session[key] = s; }
  const target = marker.followTarget && ctx.getObject(marker.followTarget);
  if (!target || !ctx.place.players.some(p => p.id === target.id)) {
    if (marker.followTarget) {
      const registry = ctx.query({ tags: [S.controllerTag] })[0];
      if (registry) ctx.emit("savi-true-focus:stop", { target: actor.id }, { to: registry.id });
      else restoreActor(ctx, actor, marker);
    }
    actor.velocity = { x: 0, y: actor.grounded ? 0 : actor.velocity.y, z: 0 };
    ctx.sleep(S.motion.idlePoll); return;
  }
  const p = actor.feetPosition, goal = target.feetPosition;
  const dx = goal.x - p.x, dz = goal.z - p.z, distance = Math.hypot(dx, dz);
  const moving = distance > (s.moving ? S.motion.stopDistance : S.motion.startDistance);
  s.jog = distance > (s.jog ? S.motion.catchupStopDistance : S.motion.catchupDistance);
  const jog = s.jog;
  const vy = actor.grounded ? S.motion.groundVelocity : Math.max(-S.motion.terminalSpeed, actor.velocity.y + ctx.place.gravity.y * dt);
  if (!moving) {
    s.moving = false; pose(ctx, s, false, false);
    actor.velocity = { x: 0, y: vy, z: 0 };
    if (actor.grounded) ctx.sleep(S.motion.idlePoll);
    return;
  }
  if (ctx.now() >= s.nextPath) {
    const end = { x: goal.x - dx / distance * S.motion.stopDistance, y: goal.y, z: goal.z - dz / distance * S.motion.stopDistance };
    const path = findPath(ctx, p, end, {});
    s.path = path.points || []; s.index = 0;
    const status = s.path.length ? "route-ready" : "route-blocked";
    if (marker.motionStatus !== status) marker.motionStatus = status; s.nextPath = ctx.now() + S.motion.repathMs;
  }
  while (s.index < s.path.length && Math.hypot(s.path[s.index].x - p.x, s.path[s.index].z - p.z) < S.motion.waypointRadius) s.index++;
  const waypoint = s.path[s.index];
  if (!waypoint) { s.moving = false; pose(ctx, s, false, false); actor.velocity = { x: 0, y: vy, z: 0 }; ctx.sleep(S.motion.idlePoll); return; }
  const x = waypoint.x - p.x, z = waypoint.z - p.z, len = Math.hypot(x, z);
  const speed = jog ? S.motion.catchupSpeed : S.motion.walkSpeed;
  s.moving = true; pose(ctx, s, true, jog);
  actor.rotation = { lookAt: { x: p.x + x, y: p.y, z: p.z + z } };
  actor.velocity = { x: x / len * speed, y: vy, z: z / len * speed };
}

export const ears = { "savi-true-focus:repair": (ctx) => prepare(ctx) };
