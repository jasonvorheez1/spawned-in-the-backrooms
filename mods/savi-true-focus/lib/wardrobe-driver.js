import { SETTINGS as S } from "./settings.js";
import { copy, behaviors, restoreDriver, loadWardrobe } from "./wardrobe-runtime.js";

function current(ctx) {
  const actor = ctx.getObject(ctx.self.state.target);
  return actor?.tags?.includes("helper") && !ctx.world.players.some(p => p.id === actor.id) && actor.state.saviTrueFocus?.driver === ctx.self.id ? actor : null;
}
function phase(ctx, name) {
  ctx.self.state.phase = name;
  const actor = current(ctx);
  if (actor) actor.state.saviTrueFocus.phase = name;
}
export function onSpawn(ctx) {
  const actor = ctx.getObject(ctx.self.state.target), data = ctx.self.state.data;
  if (!actor?.tags?.includes("helper") || ctx.world.players.some(p => p.id === actor.id)) { ctx.destroy(ctx.self.id); return; }
  actor.state.saviTrueFocus = { ...copy(actor.state.saviTrueFocus || {}), registry: ctx.self.state.registry, driver: ctx.self.id, original: copy(ctx.self.state.original), avatarModel: data.avatarModel, followTarget: ctx.self.state.followTarget || null, phase: "loading" };
  // Focus temporarily owns Savi's pose, not her identity or the human player's controls.
  actor.behavior = [...behaviors(actor).filter(name => name !== S.presenceBehavior && name !== S.motionBehavior), S.motionBehavior];
  for (const channel of Object.keys(actor.anim || {})) actor.anim[channel] = null;
  actor.bones = null;
  actor.velocity = { x: 0, y: 0, z: 0 };
  const original = ctx.self.state.original.model;
  const model = typeof original === "string" ? { id: original } : copy(original);
  model.id = data.avatarModel;
  if (data.avatarForward === "-z") delete model.forward;
  else model.forward = data.avatarForward;
  actor.model = model;
  // Queue the pose with the model swap: never expose the unanimated bind pose while accessories load.
  actor.anim[S.channel] = { clip: data.clips.read, loop: "loop", speed: 1, weight: 1 };
  ctx.self.state.loadTimer = ctx.after(S.loadTimeout, "loadExpired");
  ctx.onModelReady(actor.id, () => dress(ctx));
}
function dress(ctx) {
  const actor = current(ctx);
  if (!actor || ctx.self.state.dressed) return;
  const data = ctx.self.state.data;
  const names = ctx.getObjectBoneNames(actor.id);
  if (!names.serverRealm && !names.includes(data.handBone)) {
    phase(ctx, "waiting-for-hand-rig");
    if (!ctx.self.state.rigTimer) ctx.self.state.rigTimer = ctx.after(S.rigRetrySeconds, "retryDress");
    return;
  }
  ctx.self.state.boneEvidence = names.serverRealm ? "exported-contract-only" : "present-in-live-rig";
  const suit = ctx.spawn({
    id: "true-focus-suit", parent: actor.id, attachment: { skin: true },
    model: data.suitModel, tags: [S.accessoryTag], physics: "none",
    state: { driver: ctx.self.id }
  });
  const book = ctx.spawn({
    id: "true-focus-book", parent: actor.id, attachment: { bone: data.handBone },
    feetPosition: data.bookAttachment.position, rotation: data.bookAttachment.rotation,
    scale: data.bookAttachment.scale, model: data.bookModel,
    tags: [S.accessoryTag], physics: "none", state: { driver: ctx.self.id }
  });
  ctx.self.state.accessories = [suit, book];
  ctx.self.state.book = book;
  ctx.self.state.dressed = true;
  const b = ctx.getObject(book);
  if (b) b.anim[S.channel] = { clip: data.clips.bookTurn, loop: "once", speed: 0, weight: 1 };
  ctx.onModelReady(suit, () => {
    const a = current(ctx);
    if (!a) return;
    // The replacement garment is attached before the original clothes disappear.
    for (const name of data.hideParts) {
      const prior = a.model.parts?.[name] || {};
      a.model.parts[name] = { ...copy(prior), visible: false };
    }
    ctx.self.state.suitReady = true;
    ready(ctx);
  });
  ctx.onModelReady(book, () => { if (current(ctx)) { ctx.self.state.bookReady = true; ready(ctx); } });
  actor.anim[S.channel] = { clip: data.clips.read, loop: "loop", speed: 1, weight: 1 };
}
function ready(ctx) {
  if (!current(ctx) || !ctx.self.state.suitReady || !ctx.self.state.bookReady || ctx.self.state.ready) return;
  ctx.self.state.ready = true;
  current(ctx).state.saviTrueFocus.ownerPreparing = false;
  if (ctx.self.state.loadTimer) ctx.cancel(ctx.self.state.loadTimer);
  phase(ctx, "read");
  const registry = ctx.getObject(ctx.self.state.registry);
  if (registry) {
    registry.state.lastOutcome = { ok: true, enabled: true, phase: "ready" };
    if (registry.state.enabled?.[ctx.self.state.target]) registry.state.enabled[ctx.self.state.target].presentation = "ready";
  }
  ctx.after(S.readBeforeTurn, "advance");
}
export function advance(ctx) {
  const actor = current(ctx), data = ctx.self.state.data;
  if (!actor) { ctx.destroy(ctx.self.id); return; }
  const book = ctx.getObject(ctx.self.state.book);
  if (book && ctx.self.state.bookFitRevision !== S.bookFitRevision) {
    const wardrobe = loadWardrobe(ctx);
    if (wardrobe.ok) {
      const fit = wardrobe.data.bookAttachment;
      book.feetPosition = fit.position;
      book.rotation = fit.rotation;
      book.scale = fit.scale;
      ctx.self.state.bookFitApplied = fit;
      ctx.self.state.bookFitRevision = S.bookFitRevision;
      const registry = ctx.getObject(ctx.self.state.registry);
      if (registry) registry.state.lastOutcome = { ok: true, enabled: true, phase: ctx.self.state.phase, bookRefitted: true, fit };
    }
  }
  if (actor.state.saviTrueFocus.moving) { ctx.after(S.motion.idlePoll, "advance"); return; }
  if (ctx.self.state.phase === "read") {
    const next = ctx.self.state.nextGesture || "turn";
    phase(ctx, next);
    actor.anim[S.channel] = { clip: data.clips[next], loop: "once", speed: 1, weight: 1 };
    if (book && next === "turn") book.anim[S.channel] = { clip: data.clips.bookTurn, loop: "once", speed: 1, weight: 1 };
    ctx.self.state.nextGesture = next === "turn" ? "think" : "turn";
    ctx.after(data.durations[next], "advance");
  } else {
    if (book) book.anim[S.channel] = null;
    phase(ctx, "read");
    actor.anim[S.channel] = { clip: data.clips.read, loop: "loop", speed: 1, weight: 1 };
    ctx.after(ctx.self.state.nextGesture === "turn" ? S.readBeforeTurn : S.readBeforeThink, "advance");
  }
}
export function loadExpired(ctx) {
  if (ctx.self.state.ready) return;
  phase(ctx, "asset-load-incomplete");
  const registry = ctx.getObject(ctx.self.state.registry);
  if (registry) registry.state.lastOutcome = { ok: false, reason: "wardrobe-assets-did-not-finish-loading" };
  restoreDriver(ctx, ctx.self);
  ctx.destroy(ctx.self.id);
}
export function onDestroy(ctx) {
  restoreDriver(ctx, ctx.self);
  for (const id of ctx.self.state.accessories || []) if (ctx.getObject(id)) ctx.destroy(id);
  const registry = ctx.getObject(ctx.self.state.registry);
  if (registry?.state.wearers?.[ctx.self.state.target] === ctx.self.id) delete registry.state.wearers[ctx.self.state.target];
}

export function retryDress(ctx) { delete ctx.self.state.rigTimer; dress(ctx); }
export const ears = { "savi-true-focus:retry-rig": (ctx) => retryDress(ctx) };
