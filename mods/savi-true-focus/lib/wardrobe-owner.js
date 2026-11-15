import { SETTINGS as S } from "./settings.js";
import { copy, loadWardrobe, modelId } from "./wardrobe-runtime.js";
export function prepare(ctx) {
  const actor = ctx.self, marker = actor.state.saviTrueFocus;
  if (!actor.tags?.includes("helper") || ctx.world.players.some(p => p.id === actor.id) ||
      !marker?.original?.behavior?.includes(S.presenceBehavior) || modelId(actor.model) !== marker.avatarModel) return { ok: false, reason: "not-owned-focus" };
  const existing = ctx.getObject(marker.driver);
  if (existing) return existing.tags?.includes(S.driverTag) && existing.state.target === actor.id
    ? { ok: true, existing: true } : { ok: false, reason: "wardrobe-child-id-in-use" };
  if (marker.ownerPreparing) return { ok: true, pending: true };
  const wardrobe = loadWardrobe(ctx);
  if (!wardrobe.ok) return wardrobe;
  marker.ownerPreparing = true;
  const id = ctx.spawn({ id: S.childId, parent: actor.id, feetPosition: { x: 0, y: 0, z: 0 },
    visible: false, physics: "none", tags: [S.driverTag], behavior: S.driverBehavior,
    state: { target: actor.id, registry: marker.registry, followTarget: marker.followTarget || null,
      original: copy(marker.original), data: wardrobe.data, phase: "loading", nextGesture: "turn" } });
  marker.driver = id;
  marker.ownerDriver = id;
  const registry = marker.registry && ctx.getObject(marker.registry);
  if (registry) registry.state.wearers[actor.id] = id;
  return { ok: true, driver: id };
}
