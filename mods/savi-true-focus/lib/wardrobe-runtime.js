import { SETTINGS as S } from "./settings.js";

export function copy(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}
export function behaviors(actor) {
  const b = actor.behavior;
  return b ? (Array.isArray(b) ? [...b] : [b]) : [];
}
export function modelId(model) {
  return typeof model === "string" ? model : model?.id;
}
export function eligible(ctx, actor) {
  return !!actor && actor.tags?.includes("helper") &&
    !ctx.world.players.some(p => p.id === actor.id) &&
    behaviors(actor).includes(S.presenceBehavior);
}
export function loadWardrobe(ctx) {
  const text = ctx.files.read(S.wardrobeData);
  if (!text) return { ok: false, reason: "wardrobe-assets-not-ready" };
  let data;
  try { data = JSON.parse(text); } catch (_) { return { ok: false, reason: "invalid-wardrobe-data" }; }
  const models = [data.avatarModel, data.suitModel, data.bookModel];
  const poses = [data.clips?.read, data.clips?.turn, data.clips?.think, data.clips?.bookTurn];
  const p = data.bookAttachment?.position, r = data.bookAttachment?.rotation;
  const numbers = p ? [p.x,p.y,p.z,data.bookAttachment.scale] : [];
  const quaternion = r && r.w !== undefined;
  const rotation = r ? (quaternion ? [r.x,r.y,r.z,r.w] : [r.yaw,r.pitch,r.roll]) : [];
  const rotationValid = rotation.length > 0 && rotation.every(Number.isFinite) &&
    (!quaternion || Math.abs(Math.hypot(...rotation) - 1) < 0.001);
  const valid = models.every(v => typeof v === "string" && v.startsWith("/cdn/") && v.endsWith(".glb")) &&
    poses.every(v => typeof v === "string" && v.length > 0) &&
    typeof data.handBone === "string" && data.handBone.length > 0 &&
    Array.isArray(data.hideParts) && data.hideParts.every(v => typeof v === "string") &&
    ["-z", "+z", "+x", "-x"].includes(data.avatarForward) &&
    numbers.length === 4 && numbers.every(Number.isFinite) && rotationValid && data.bookAttachment.scale > 0 &&
    [data.durations?.read,data.durations?.turn,data.durations?.think,data.durations?.bookTurn].every(v => Number.isFinite(v) && v > 0);
  return valid ? { ok: true, data } : { ok: false, reason: "incomplete-wardrobe-data" };
}
export function snapshot(actor) {
  return { model: copy(actor.model), bones: copy(actor.bones), anim: copy(actor.anim), behavior: behaviors(actor) };
}
export function restoreActor(ctx, actor, marker) {
  if (!actor || !marker || !actor.tags?.includes("helper") || ctx.world.players.some(p => p.id === actor.id) || actor.state.saviTrueFocus?.driver !== marker.driver) return false;
  const original = marker.original;
  if (!original) return false;
  const ours = modelId(actor.model) === marker.avatarModel;
  actor.anim[S.channel] = null;
  if (ours) {
    actor.model = copy(original.model);
    actor.bones = copy(original.bones);
    for (const key of Object.keys(original.anim || {})) actor.anim[key] = copy(original.anim[key]);
  }
  // Restore only the presence behavior this wardrobe paused, preserving any concurrent additions.
  const list = behaviors(actor).filter(name => name !== S.motionBehavior);
  for (const name of original.behavior || []) if (name === S.presenceBehavior && !list.includes(name)) list.push(name);
  actor.behavior = list;
  actor.velocity = { x: 0, y: 0, z: 0 };
  delete actor.state.saviTrueFocus;
  return true;
}
export function restoreDriver(ctx, driver) {
  if (!driver) return false;
  const actor = ctx.getObject(driver.state.target);
  const marker = actor?.state.saviTrueFocus;
  return restoreActor(ctx, actor, marker?.driver === driver.id ? marker : { driver: driver.id, original: driver.state.original, avatarModel: driver.state.data?.avatarModel });
}
