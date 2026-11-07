// Spawn 3D Modeling Studio: the display. reads world.state.m3d and keeps the studio showing it:
//   items:   [{ id, kind: "image" | "model", name, prompt, url (image), thumb, spec (model: { model: { id, forward }, layout?, behavior? }), turn (deg), how, by, made }]
//   showing: { image: <item id> on the canvas, model: <item id> on the pedestal }
// every model also gets a shelf slot (oldest first, 9 slots) with a brass plaque. writes nothing to m3d.
import { L } from "./lib/layout.js";
export const updateSchedule = { every: { seconds: 0.5 } };
const MADE = "m3d-made";
const esc = (t) => String(t ?? "").slice(0, 28).replace(/[<>&"]/g, "");
function fit(w, d, h) { return { layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } } }; }
export function update(ctx) {
  try { run(ctx); } catch (e) { if (!ctx.self.session.err) { ctx.self.session.err = 1; ctx.log("modeling-studio: " + e.message); } }
}
function run(ctx) {
  const s = ctx.world.state.m3d, me = ctx.self, ses = me.session;
  if (!ses.ready) { // a fresh simulation: clear what an older one left, then rebuild from state
    ses.ready = true; ses.img = ses.ped = ses.shelf = "~";
    for (const r of ctx.query({ tags: [MADE], radius: 8, center: me.feetPosition })) ctx.destroy(r.id);
  }
  if (!s) return;
  const items = s.items ?? [], sw = s.showing ?? {};
  // the canvas
  const img = items.find((i) => i.id === sw.image && i.url);
  const imgKey = img ? img.url : "";
  if (imgKey !== ses.img) {
    const c = ctx.getObject(me.id + "/canvas");
    if (c) { ses.img = imgKey; c.material = img ? { texture: img.url, roughness: 0.9, emissive: "oklch(1 0 0)", emissiveIntensity: 0.18 } : { color: "oklch(0.93 0.01 250)", roughness: 0.9, emissive: "oklch(1 0 0)", emissiveIntensity: 0.12 }; }
  }
  // the pedestal
  const m = items.find((i) => i.id === sw.model && i.spec);
  const pedKey = m ? m.id + ":" + JSON.stringify(m.spec) + ":" + (m.turn ?? 0) : "";
  if (pedKey !== ses.ped) {
    ses.ped = pedKey;
    if (ctx.getObject(me.id + "/on-pedestal")) ctx.destroy(me.id + "/on-pedestal");
    if (m) ctx.spawn("on-pedestal", { parent: me.id, ...fit(L.fitPedestal.w, L.fitPedestal.w, L.fitPedestal.h), ...m.spec,
      feetPosition: { ...L.top }, rotation: { yaw: m.turn ?? 0 }, state: { turn: m.turn ?? 0 },
      behavior: m.spec.behavior ?? "mods/modeling-studio/turntable.js", castShadow: true, tags: [MADE] });
  }
  // the shelf: every model in a slot, oldest first
  const models = items.filter((i) => i.kind === "model" && i.spec).slice(0, L.levels.length * L.slots.length);
  const shelfKey = models.map((i) => i.id + ":" + (i.turn ?? 0) + ":" + i.spec.model?.id + ":" + i.spec.model?.forward).join("|");
  if (shelfKey !== ses.shelf) {
    ses.shelf = shelfKey;
    for (const r of ctx.query({ tags: [MADE, "m3d-shelf"], radius: 8, center: me.feetPosition })) ctx.destroy(r.id);
    const n = L.slots.length, F = L.fitShelf;
    models.forEach((i, k) => {
      const y = L.shelf.y + L.levels[L.levels.length - 1 - Math.floor(k / n)], z = L.shelf.z + L.slots[k % n];
      const { behavior, ...spec } = i.spec; // shelf copies stand still
      ctx.spawn("shelf-" + k, { parent: me.id, ...spec, ...fit(F.d, F.w, F.h), feetPosition: { x: L.shelf.x + 0.03, y, z }, rotation: { yaw: 180 + (i.turn ?? 0) }, castShadow: true, tags: [MADE, "m3d-shelf"] });
      ctx.spawn("plaque-" + k, { parent: me.id, feetPosition: { x: L.shelf.x + 0.186, y: y - 0.028, z }, primitive: { kind: "box", width: 0.004, height: 0.022, depth: 0.2 }, material: { color: "oklch(0.75 0.11 80)", metalness: 0.9, roughness: 0.3 }, tags: [MADE, "m3d-shelf"],
        ui: `<div face="right" emissive style="width:200px;height:22px;display:grid;place-items:center;font:700 14px Georgia,serif;color:#2a1a08;letter-spacing:.04em">${esc(i.name ?? i.prompt)}</div>` });
    });
  }
}
