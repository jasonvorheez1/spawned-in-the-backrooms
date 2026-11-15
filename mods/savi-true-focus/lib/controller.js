import { SETTINGS as S } from "./settings.js";
import { eligible, loadWardrobe, snapshot, restoreActor, restoreDriver, behaviors, modelId } from "./wardrobe-runtime.js";

function enableMotion(ctx, actor, request) {
  if (!actor?.state.saviTrueFocus?.original) return;
  actor.state.saviTrueFocus.registry = ctx.self.id;
  const players = ctx.place?.players || ctx.world.players;
  const follow = players.find(p => p.id === request?.follow) || (players.length === 1 ? players[0] : null);
  if (follow) actor.state.saviTrueFocus.followTarget = follow.id;
  const list = behaviors(actor);
  if (!list.includes(S.motionBehavior)) actor.behavior = [...list, S.motionBehavior];
  ctx.emit("savi-true-focus:repair", {}, { to: actor.id });
  if (ctx.self.state.enabled?.[actor.id]) ctx.self.state.enabled[actor.id].followTarget = actor.state.saviTrueFocus.followTarget || null;
  arm(ctx);
}
function arm(ctx) { if (!ctx.self.state.reconnectTimer && Object.keys(ctx.self.state.enabled || {}).length) ctx.self.state.reconnectTimer = ctx.after(S.reconnectCheckSeconds, "maintain"); }
function outcome(ctx, result) { ctx.self.state.lastOutcome = result; return result; }
export function start(ctx, request) {
  const target = request?.target;
  if (typeof target !== "string") return outcome(ctx, { ok: false, reason: "explicit-savi-target-required" });
  const actor = ctx.getObject(target);
  if (!actor?.tags?.includes("helper") || ctx.world.players.some(p => p.id === actor.id)) return outcome(ctx, { ok: false, reason: "target-is-not-an-idle-savi-helper" });
  const existingId = ctx.self.state.wearers?.[target] || actor?.state.saviTrueFocus?.driver;
  const existing = existingId && ctx.getObject(existingId);
  if (existing?.tags?.includes(S.driverTag)) { enableMotion(ctx, actor, request); return outcome(ctx, { ok: true, enabled: true, alreadyActive: true, phase: existing.state.phase }); }
  if (actor?.tags?.includes("helper") && !ctx.world.players.some(p => p.id === actor.id) && actor.state.saviTrueFocus?.original && modelId(actor.model) === actor.state.saviTrueFocus.avatarModel) {
    enableMotion(ctx, actor, request);
    if (ctx.self.state.enabled?.[target]) ctx.self.state.enabled[target].presentation = "pending-sync";
    return outcome(ctx, { ok: true, enabled: true, alreadyActive: true, phase: actor.state.saviTrueFocus.phase, presentation: "pending-sync" });
  }
  // A vanished driver can still be safely restored from its own marker before a new start.
  if (actor?.tags?.includes("helper") && actor.state.saviTrueFocus?.original) restoreActor(ctx, actor, actor.state.saviTrueFocus);
  if (!eligible(ctx, actor)) return outcome(ctx, { ok: false, reason: "target-is-not-an-idle-savi-helper" });
  if (!ctx.self.state.enabled) ctx.self.state.enabled = {};
  ctx.self.state.enabled[target] = { on: true, presentation: "pending" };
  const wardrobe = loadWardrobe(ctx);
  if (!wardrobe.ok) return outcome(ctx, { ok: true, enabled: true, presentation: "pending", reason: wardrobe.reason });
  const collision = ctx.getObject(`${target}/${S.childId}`);
  if (collision) return outcome(ctx, { ok: false, reason: "wardrobe-child-id-in-use" });
  const id = `${target}/${S.childId}`;
  actor.state.saviTrueFocus = { driver: id, registry: ctx.self.id, original: snapshot(actor),
    avatarModel: modelId(actor.model), phase: "queued" };
  ctx.self.state.wearers[target] = id;
  enableMotion(ctx, actor, request);
  return outcome(ctx, { ok: true, enabled: true, phase: "queued" });
}
export function refitBook(ctx, request) {
  const actor = typeof request?.target === "string" && ctx.getObject(request.target);
  const driver = actor?.state.saviTrueFocus?.driver && ctx.getObject(actor.state.saviTrueFocus.driver);
  if (!actor?.tags?.includes("helper") || ctx.world.players.some(p => p.id === actor.id) ||
      !driver?.tags?.includes(S.driverTag) || driver.state.target !== actor.id) {
    return outcome(ctx, { ok: false, reason: "no-active-savi-wardrobe-to-refit" });
  }
  const wardrobe = loadWardrobe(ctx), book = ctx.getObject(driver.state.book);
  if (!wardrobe.ok || !book?.tags?.includes(S.accessoryTag) || book.state.driver !== driver.id) {
    return outcome(ctx, { ok: false, reason: "book-or-fit-not-ready" });
  }
  const fit = wardrobe.data.bookAttachment;
  book.feetPosition = fit.position;
  book.rotation = fit.rotation;
  book.scale = fit.scale;
  driver.state.bookFitApplied = fit;
  driver.state.bookFitRevision = S.bookFitRevision;
  return outcome(ctx, { ok: true, enabled: true, phase: driver.state.phase, bookRefitted: true, fit });
}
export function stop(ctx, request) {
  const target = request?.target;
  if (typeof target !== "string") return outcome(ctx, { ok: false, reason: "explicit-savi-target-required" });
  const actor = ctx.getObject(target);
  const id = ctx.self.state.wearers?.[target] || actor?.state.saviTrueFocus?.driver;
  const driver = id && ctx.getObject(id);
  let restored = false;
  if (driver?.tags?.includes(S.driverTag)) {
    restored = restoreDriver(ctx, driver);
    for (const accessory of driver.state.accessories || []) if (ctx.getObject(accessory)) ctx.destroy(accessory);
    ctx.destroy(driver.id);
  } else if (actor?.state.saviTrueFocus?.original) {
    restored = restoreActor(ctx, actor, actor.state.saviTrueFocus);
  }
  if (ctx.self.state.wearers) delete ctx.self.state.wearers[target];
  if (ctx.self.state.enabled) delete ctx.self.state.enabled[target];
  return outcome(ctx, { ok: true, enabled: false, active: false, restored });
}
export function maintain(ctx) {
  delete ctx.self.state.reconnectTimer;
  for (const target of Object.keys(ctx.self.state.enabled || {})) {
    const actor = ctx.getObject(target), entry = ctx.self.state.enabled[target];
    if (!actor || ctx.world.players.some(p => p.id === target) || !actor.tags?.includes("helper")) { stop(ctx, { target }); continue; }
    const marker = actor.state.saviTrueFocus;
    const follow = marker?.followTarget || entry.followTarget;
    const driver = marker?.driver && ctx.getObject(marker.driver);
    const actual = modelId(actor.model);
    const nativeReset = marker && actual !== marker.avatarModel && actual === modelId(marker.original?.model) && behaviors(actor).includes(S.presenceBehavior);
    if (nativeReset && driver) {
      stop(ctx, { target });
      ctx.self.state.enabled[target] = { on: true, presentation: "recovering", followTarget: follow || null };
    } else if (nativeReset || (!marker && eligible(ctx, actor))) {
      if (loadWardrobe(ctx).ok) start(ctx, { target, follow });
    } else if (marker && actual === marker.avatarModel && (!driver || !behaviors(actor).includes(S.motionBehavior))) {
      enableMotion(ctx, actor, { follow });
    } else if (marker && actual !== marker.avatarModel) {
      // A genuinely different avatar is an outside decision, not a reconnect. Preserve it.
      stop(ctx, { target });
    }
  }
  arm(ctx);
}
export function onSpawn(ctx) {
  if (!ctx.self.state.wearers) ctx.self.state.wearers = {};
  if (!ctx.self.state.enabled) ctx.self.state.enabled = {};
  arm(ctx);
}
export function onDestroy(ctx) {
  if (ctx.self.state.reconnectTimer) ctx.cancel(ctx.self.state.reconnectTimer);
  for (const target of Object.keys(ctx.self.state.wearers || {})) stop(ctx, { target });
}
export const ears = {
  "savi-true-focus:start": (ctx, data) => start(ctx, data),
  "savi-true-focus:stop": (ctx, data) => stop(ctx, data),
  "savi-true-focus:resume": (ctx) => maintain(ctx),
  "savi-true-focus:refit-book": (ctx, data) => refitBook(ctx, data)
};
