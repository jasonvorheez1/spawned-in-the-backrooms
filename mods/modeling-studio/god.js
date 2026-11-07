// Spawn 3D Modeling Studio: the Studio tab's hands. a builder's ask becomes a pending row in world.state.m3d
// and a note that wakes Savi; Show / Turn / Remove edit the gallery the studio displays.
import { logJob } from "./lib/joblog.js";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const cdn = (u) => typeof u === "string" && u.startsWith("/cdn/");
function store(ctx) {
  const w = ctx.world.state;
  if (!w.m3d) w.m3d = { items: [], pending: [], showing: {} };
  return w.m3d;
}
export function onInput(ctx, input) {
  const P = input.pressed || {}, A = input.actionData || {};
  if (!P.ask && !P.show && !P.turn && !P.remove && !P.cancel && !P.pick) return;
  const s = store(ctx), items = s.items ?? [], who = clip(ctx.self.displayName ?? A.ask?.by ?? "creator", 40);
  if (P.ask) {
    const d = A.ask || {}, text = clip(d.text, 600), mode = d.mode === "image" ? "image" : "model";
    if (!text && !(d.refs ?? []).length && !(d.sel ?? []).length) return;
    const sel = (Array.isArray(d.sel) ? d.sel : []).filter((id) => items.some((i) => i.id === id)).slice(0, 4);
    const picked = sel.map((id) => items.find((i) => i.id === id));
    const refs = [...(Array.isArray(d.refs) ? d.refs.filter(cdn) : []), ...picked.map((i) => i.url ?? i.thumb).filter(cdn)].slice(0, 6);
    const id = "q" + Math.round(ctx.now()), pose = d.pose === "a" || d.pose === "t" ? d.pose : null;
    const of = d.edit && items.find((i) => i.id === d.edit.of && i.kind === "model");
    const n = (v) => Math.max(0, Math.min(1, Number(v) || 0)), b = d.edit?.box;
    const edit = of ? { of: of.id, box: b ? { x0: n(b.x0), y0: n(b.y0), x1: n(b.x1), y1: n(b.y1) } : null, poly: Array.isArray(d.edit.poly) && d.edit.poly.length >= 3 ? d.edit.poly.slice(0, 40).map((q) => ({ x: +n(q.x).toFixed(3), y: +n(q.y).toFixed(3) })) : null, view: { yaw: Number(d.edit.view?.yaw) || 0, pitch: Number(d.edit.view?.pitch) || 0, depth: Number(d.edit.view?.depth) || 2.6 } } : null;
    if (edit && !text) return;
    if (edit) { // a preview-window tweak is Savi's own hands, never a studio order
      s.edits = [...(s.edits ?? []).filter((e) => e.of !== edit.of), { id, text, ...edit, by: who, at: ctx.now() }].slice(-6);
      ctx.notifyDm(`PREVIEW WINDOW EDIT for Savi herself (not a studio order) from ${who} · "${text}" · on ${of.id} "${of.name}" (${of.spec?.model?.id ?? ""})` +
        ` · region ${edit.box ? `x ${edit.box.x0.toFixed(2)}–${edit.box.x1.toFixed(2)}, y ${edit.box.y0.toFixed(2)}–${edit.box.y1.toFixed(2)} of the preview, top-left 0,0` : "whole model"}` +
        (edit.poly ? ` · lasso ${edit.poly.map((q) => q.x.toFixed(2) + "," + q.y.toFixed(2)).join(" ")}` : "") +
        ` · seen from yaw ${Math.round(edit.view.yaw)}°, pitch ${Math.round(edit.view.pitch)}° · edit ${id}: fix the model and swap it in place on the same item, make THREE takes and write them to world.state.m3d.edits row ${id} as variants: [{ model: { id, forward }, note }]; the creator picks one in the Preview Window and the pick swaps it in`, { wake: true });
      return;
    }
    s.pending = [...(s.pending ?? []), { id, mode, text, refs, sel, ...(pose ? { pose } : {}), ...(edit ? { edit } : {}), by: who, at: ctx.now() }].slice(-8);
    ctx.notifyDm(`Spawn 3D Modeling Studio ask from ${who} · ${mode === "image" ? "PAINT" : "BUILD 3D"} · "${text}"` + (pose ? ` · POSE ${pose === "a" ? "A-pose" : "T-pose"}` : "") +
      (edit ? ` · EDIT of ${edit.of} "${of.name}" (${of.spec?.model?.id ?? ""}) · region ${edit.box ? `x ${edit.box.x0.toFixed(2)}–${edit.box.x1.toFixed(2)}, y ${edit.box.y0.toFixed(2)}–${edit.box.y1.toFixed(2)} of the preview, top-left 0,0` : "whole model"}${edit.poly ? ` · lasso shape ${edit.poly.map((q) => q.x.toFixed(2) + "," + q.y.toFixed(2)).join(" ")}` : ""} · seen from yaw ${Math.round(edit.view.yaw)}°, pitch ${Math.round(edit.view.pitch)}°` : "") +
      (picked.length ? ` · selected ${picked.map((i) => `${i.id} "${i.name}"`).join(", ")}` : "") +
      (refs.length ? ` · refs ${refs.join(" ")}` : "") +
      ` · pending ${id} · load the modeling-studio#modeling-studio skill and run its pipeline`, { wake: true });
  }
  if (P.show) {
    const it = items.find((i) => i.id === A.show?.id);
    if (it) {
      const slot = it.kind === "image" ? "image" : "model";
      s.showing = { ...(s.showing ?? {}), [slot]: it.id };
      // this lab's canvas and pedestal stand beside the desk and follow world.state.savi.showing (the studio's own dais is not placed here)
      const ws = ctx.world.state, sv = (ws.savi ??= { items: [], showing: {} });
      if (!(sv.items ?? []).some((i) => i.id === it.id)) sv.items = [...(sv.items ?? []), it];
      sv.showing = { ...(sv.showing ?? {}), [slot]: it.id };
    }
  }
  if (P.turn) s.items = items.map((i) => (i.id === A.turn?.id ? { ...i, turn: ((i.turn ?? 0) + 180) % 360 } : i));
  if (P.remove) {
    const id = A.remove?.id;
    s.items = items.filter((i) => i.id !== id);
    const sw = { ...(s.showing ?? {}) }; for (const k in sw) if (sw[k] === id) delete sw[k]; s.showing = sw;
  }
  if (P.pick) { // the creator chose one of Savi's three takes (or kept the original): only now the gallery card changes
    const e = (s.edits ?? []).find((x) => x.id === A.pick?.edit), it = e && items.find((i) => i.id === e.of);
    const v = e && !A.pick.keep ? (e.variants ?? [])[Number(A.pick.n)] : null;
    if (e && it && v?.model?.id) {
      const next = { ...it, spec: { ...it.spec, model: { ...it.spec.model, ...v.model } }, history: [...(it.history ?? []), { model: it.spec?.model?.id, at: ctx.now() }].slice(-8), edited: ctx.now(), editNote: v.note ?? e.text };
      s.items = items.map((i) => (i.id === it.id ? next : i));
      const sv = ctx.world.state.savi; if (sv?.items?.some((i) => i.id === it.id)) sv.items = sv.items.map((i) => (i.id === it.id ? { ...i, spec: next.spec } : i));
    }
    if (e && (v || A.pick.keep)) s.edits = (s.edits ?? []).filter((x) => x.id !== e.id);
  }
  if (P.cancel) { const c = (s.pending ?? []).find((p) => p.id === A.cancel?.id); s.pending = (s.pending ?? []).filter((p) => p.id !== A.cancel?.id);
    if (c) logJob(s, { order: c.id, kind: c.mode, prompt: c.text, by: c.by, status: "cancelled", steps: [{ step: "cancelled by " + who, ok: false }], queuedAt: c.at, doneAt: ctx.now(), waitS: Math.round((ctx.now() - c.at) / 1000), date: ctx.world.date }); }
}
