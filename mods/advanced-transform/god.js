// A full transform gizmo on whatever is selected in god mode.
// Red/green/blue arrows slide along world X/Y/Z; rings turn about X/Y/Z (ctrl = 15° steps);
// cubes on the object's own axes stretch it; the white centre cube scales it evenly.
import { rotationFromEuler } from "builtin/vec3";
import { raycast, getInputRay } from "builtin/physics";
const AX = { x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
const COL = { x: "#ff4d5e", y: "#5bdc6a", z: "#4d8bff" };
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }), mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }), dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const quat = (r) => (r && r.w !== undefined ? r : rotationFromEuler(r ?? 0));
const qmul = (a, b) => ({ w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z, x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w });
const qaxis = (u, deg) => { const h = (deg * Math.PI) / 360, s = Math.sin(h); return { w: Math.cos(h), x: u.x * s, y: u.y * s, z: u.z * s }; };
const qrot = (q, v) => { const p = qmul(qmul(q, { w: 0, ...v }), { w: q.w, x: -q.x, y: -q.y, z: -q.z }); return { x: p.x, y: p.y, z: p.z }; };
// where the cursor ray passes closest to the line c + u·t: that t
function axisT(ray, c, u) { const w0 = sub(ray.origin, c), b = dot(ray.direction, u), d = dot(ray.direction, w0), e = dot(u, w0), den = 1 - b * b; return den < 1e-6 ? e : (e - b * d) / den; }
// the cursor's angle round axis u on the plane through c
function ringAngle(ray, c, u) {
  const den = dot(ray.direction, u); if (Math.abs(den) < 1e-5) return null;
  const t = dot(sub(c, ray.origin), u) / den, p = sub(add(ray.origin, mul(ray.direction, t)), c);
  const { e1, e2 } = ringFrame(u);
  return (Math.atan2(dot(p, e2), dot(p, e1)) * 180) / Math.PI;
}
const len = (a) => Math.hypot(a.x, a.y, a.z), norm = (a) => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };
// a ring's own plane: e1, e2 span it, u is its axle (right-handed: e1 × e2 = u)
function ringFrame(u) { const e1 = norm(Math.abs(u.y) < 0.9 ? cross(u, AX.y) : cross(u, AX.x)); return { e1, e2: cross(u, e1) }; }
// the turn that lays a torus (drawn in its XY plane, hole along +Z) onto the frame a, b, c
function quatFromBasis(a, b, c) {
  const m00 = a.x, m10 = a.y, m20 = a.z, m01 = b.x, m11 = b.y, m21 = b.z, m02 = c.x, m12 = c.y, m22 = c.z, tr = m00 + m11 + m22;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; return { w: 0.25 * s, x: (m21 - m12) / s, y: (m02 - m20) / s, z: (m10 - m01) / s }; }
  if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; return { w: (m21 - m12) / s, x: 0.25 * s, y: (m01 + m10) / s, z: (m02 + m20) / s }; }
  if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; return { w: (m02 - m20) / s, x: (m01 + m10) / s, y: 0.25 * s, z: (m12 + m21) / s }; }
  const s = Math.sqrt(1 + m22 - m00 - m11) * 2; return { w: (m10 - m01) / s, x: (m02 + m20) / s, y: (m12 + m21) / s, z: 0.25 * s };
}
// where the cursor ray crosses the ring's plane: its angle and how far out from the centre
function onPlane(ray, c, u) { const den = dot(ray.direction, u); if (Math.abs(den) < 0.08) return null; const t = dot(sub(c, ray.origin), u) / den; if (t < 0) return null; const p = sub(add(ray.origin, mul(ray.direction, t)), c), f = ringFrame(u); return { a: Math.atan2(dot(p, f.e2), dot(p, f.e1)), r: len(p) }; }
function planeHit(ray, y) { const dy = ray.direction.y; if (Math.abs(dy) < 1e-4) return null; const t = (y - ray.origin.y) / dy; return t > 0 ? add(ray.origin, mul(ray.direction, t)) : null; }
const scl = (s) => (typeof s === "number" ? { x: s, y: s, z: s } : { x: s?.x ?? 1, y: s?.y ?? 1, z: s?.z ?? 1 });
// ctrl+click grouping: the pieces picked with ctrl held ride every gizmo drag with the selected one
let group = new Set(), lastId = null, keepNext = null, lastEdAt = 0;
function members(ctx, obj) { const out = [obj]; for (const id of group) if (id !== obj.id) { const o = ctx.getObject(id); if (o) out.push(o); else group.delete(id); } return out; }
// the outline is a lease: 0.5 s, renewed while the editor runs, so deselecting (which stops the editor) lets it fade
function mark(ctx, id, on) { try { ctx.emit(on ? "highlightSet" : "highlightClear", on ? { target: id, color: "#ffd84d", style: "outline", duration: 0.5 } : { target: id }); } catch (e) {} }
let leaseAt = 0;
// frozen at press: every member's start pose
const snap = (list) => list.map((o, i) => { const h = o.state?.home; return { id: o.id, self: o, sel: i === 0, p: { ...o.worldFeetPosition }, q: quat(o.rotation), s: scl(o.scale), home: h && typeof h === "object" ? { ...h } : null, interp: o.interpolation }; });
// a drag in progress: the followers stop smoothing (smoothing toward a moving target is the rubber band) and hold still
function grab(ctx, st) { for (const m of st.m) { if (m.sel) continue; const o = live(ctx, m); try { o.interpolation = null; if (o.velocity) o.velocity = { x: 0, y: 0, z: 0 }; } catch (e) {} } return st; }
// god mode saves only the selected piece on release; the rest are saved here in one commit, else the room snaps them back (the pop)
function saveFollowers(ctx, st) {
  const rest = (st?.m ?? []).filter((m) => !m.sel); if (!rest.length) return;
  // the pose each follower was dropped at, recorded by the drag itself: a later read may already see the room's old copy
  const plan = rest.filter((m) => m.to).map((m) => ({ id: m.id, to: m.to, from: { p: m.p, q: m.q, s: m.s, home: m.home }, interp: m.interp && typeof m.interp === "object" ? m.interp : undefined, home: m.home && m.to.p ? { ...m.home, x: (m.home.x ?? 0) + m.to.p.x - m.p.x, y: (m.home.y ?? 0) + m.to.p.y - m.p.y, z: (m.home.z ?? 0) + m.to.p.z - m.p.z } : null }));
  if (!plan.length) return;
  const go = (cx) => { for (const m of plan) { const o = cx.getObject(m.id); if (!o) continue;
    if (m.to.p) { if (o.parent) o.worldFeetPosition = m.to.p; else o.feetPosition = m.to.p; }
    if (m.to.q) o.rotation = m.to.q; if (m.to.s) o.scale = m.to.s; if (m.home) o.state.home = m.home; try { o.interpolation = m.interp ?? { teleportThreshold: 5 }; } catch (e) {} } };
  // a commit from the editor hook is refused (that runs on the piece, which this client does not simulate), so the save
  // is queued for the god rig's own onInput, which does have a lane: the release click reaches it a moment later
  const back = (cx) => { for (const m of plan) { const o = cx.getObject(m.id); if (!o) continue;
    if (m.to.p) { if (o.parent) o.worldFeetPosition = m.from.p; else o.feetPosition = m.from.p; }
    if (m.to.q) o.rotation = m.from.q; if (m.to.s) o.scale = m.from.s; if (m.from.home) o.state.home = m.from.home; } };
  owed = { plan: plan.map((m) => ({ id: m.id, p: m.to.p, q: m.to.q, s: m.to.s, home: m.home, interp: m.interp })) };
}
let owed = null, hold = null;
// after a drop the follower's owner still sends its old pose until the server's save lands: hold ours on screen till then
function holdPoses(ctx) { if (!hold) return; if (ctx.now() > hold.until) { hold = null; return; }
  for (const m of hold.plan) { const o = ctx.getObject(m.id); if (!o || !m.p) continue; try { if (o.parent) o.worldFeetPosition = m.p; else o.feetPosition = m.p; if (m.q) o.rotation = m.q; if (m.s) o.scale = m.s; } catch (e) {} } }
function flushOwed(ctx) { if (!owed) return; const o = owed; owed = null;
  const me = ctx.world.players?.find((p) => p.isLocal); if (!me) return;
  // the server's referee commits it (scripts/lib/adv-move.js): a follower another machine runs can't be saved from here
  me.state.advMove = { at: ctx.now(), moves: o.plan };
  hold = { until: ctx.now() + 1200, plan: o.plan };
  ctx.log("gizmo group posted", { n: o.plan.length }); }
function letGo(ctx, st) { saveFollowers(ctx, st); }
// a floating piece springs to state.home: home travels with it, so it never pulls back
function rehome(o, m, pos) { if (!m.home) return; try { o.state.home = { ...m.home, x: (m.home.x ?? 0) + pos.x - m.p.x, y: (m.home.y ?? 0) + pos.y - m.p.y, z: (m.home.z ?? 0) + pos.z - m.p.z }; } catch (e) {} }
// a member's live handle, read fresh each frame (the selected one is the editor's own obj)
function live(ctx, m) { return m.sel ? m.self : (ctx.getObject(m.id) ?? m.self); }
// mid-drag, the followers' poses also go to the server (throttled): a piece another machine holds takes the server's word
let liveAt = 0; const liveTo = {};
function streamLive(ctx, m) { liveTo[m.id] = { id: m.id, p: m.to?.p, q: m.to?.q, s: m.to?.s }; const now = ctx.now(); if (now - liveAt < 33) return; liveAt = now;
  const me = ctx.world.players?.find((p) => p.isLocal); if (me) me.state.advDrag = { at: now, moves: Object.values(liveTo) }; }
function put(ctx, m, pos) { const o = live(ctx, m); m.to = { ...(m.to ?? {}), p: pos }; try { if (o.parent) o.worldFeetPosition = pos; else o.feetPosition = pos; if (o.velocity) o.velocity = { x: 0, y: 0, z: 0 }; rehome(o, m, pos); streamLive(ctx, m); } catch (e) { ctx.log("gizmo move failed", { id: m.id, e: String(e) }); } }
// the whole group goes in one commit: one history row, one undo
function killGroup(ctx) {
  const ids = [...group]; group.clear(); lastId = null;
  const go = () => { for (const id of ids) { mark(ctx, id, false); if (ctx.getObject(id)) ctx.destroy(id); } };
  try { ctx.commit(`deleted ${ids.length} grouped pieces`, go); } catch (e) { go(); }
}
// Del on one piece: the built-in X is hidden while the gizmo is on, so Del does its job
function killOne(ctx) { const id = lastId; lastId = null; if (!id || !ctx.getObject(id)) return;
  try { ctx.commit("deleted 1 piece", () => ctx.destroy(id)); } catch (e) { ctx.log("gizmo delete failed", { e: String(e) }); } }
// Del with a group picked: every member goes, not just the selected one
// ctrl+c / ctrl+v: the clipboard holds specs, so a paste still works after the originals are gone
const KEYS = ["template", "primitive", "material", "model", "sprite", "light", "audio", "fx", "scatter", "spline", "physics", "behavior", "tags", "state", "scale", "rotation", "visible", "castShadow", "receiveShadow"];
let clip = null, pastes = 0;
function specOf(o) { const sp = {}; for (const k of KEYS) { const v = o[k]; if (v !== undefined && v !== null) sp[k] = JSON.parse(JSON.stringify(v)); } sp.feetPosition = { ...o.worldFeetPosition }; return sp; }
function copy(ctx) {
  const ids = group.size > 1 ? [...group] : lastId ? [lastId] : [];
  clip = ids.map((id) => ctx.getObject(id)).filter(Boolean).map(specOf); pastes = 0;
  if (clip.length) ctx.log("gizmo copied", { n: clip.length });
}
function paste(ctx) {
  if (!clip?.length) return;
  pastes++; const off = 1.5 * pastes, made = [];
  const go = () => { for (const sp of clip) { const c = JSON.parse(JSON.stringify(sp)); c.feetPosition = { x: c.feetPosition.x + off, y: c.feetPosition.y, z: c.feetPosition.z + off }; if (c.state?.home) c.state.home = { ...c.state.home, x: (c.state.home.x ?? 0) + off, z: (c.state.home.z ?? 0) + off }; made.push(ctx.spawn(c)); } };
  try { ctx.commit(`pasted ${clip.length} piece${clip.length > 1 ? "s" : ""}`, go); } catch (e) { go(); }
  // the paste becomes the group, ready to drag off
  for (const id of group) mark(ctx, id, false); group = new Set(made.length > 1 ? made : []); lastId = null;
  const me = ctx.world.players?.find((p) => p.isLocal); if (me && made.length) { keepNext = made[made.length - 1]; try { me.selection = keepNext; } catch (e) {} }
}
const hit = (input, a) => input.pressed?.[a] || input.pressed?.["advanced-transform:" + a];
const ctrlHeld = (input) => input.held?.ctrl || input.held?.["advanced-transform:ctrl"];
// the Transform tab's settings: gizmo on/off, snap steps, always-snap; mirrored to player.state for the tab
let prefs = { tool: "move", on: true, move: 0.25, rot: 15, always: false, local: false, ring: 1, surface: false, align: true };
// End (or the chip): every picked piece drops till its underside meets whatever is below it, one commit, one undo
let floorAsk = false;
function groundUnder(ctx, bb, skip) {
  let from = { x: bb.center.x, y: bb.center.y, z: bb.center.z };
  for (let i = 0; i < 8; i++) {
    let h = null; try { h = raycast(ctx, from, { x: 0, y: -1, z: 0 }, { distance: 1000 }); } catch (e) { break; }
    if (!h) break;
    const id = String(h.id ?? ""); if (![...skip].some((s) => id === s || id.startsWith(s + "/"))) return h.position.y;
    from = { x: from.x, y: h.position.y - 0.02, z: from.z };
  }
  try { return ctx.place.terrain.heightAt(bb.center.x, bb.center.z); } catch (e) { return null; }
}
function dropToFloor(ctx, ids) {
  const skip = new Set(ids.map(String)), plan = [];
  for (const id of ids) { const o = ctx.getObject(id), bb = o?.bounds; if (!bb) continue; const gy = groundUnder(ctx, bb, skip); if (gy === null || gy === undefined) continue;
    const p = o.worldFeetPosition ?? o.feetPosition, dy = gy - bb.min.y; if (Math.abs(dy) < 1e-3) continue; plan.push({ id, p: { x: p.x, y: p.y + dy, z: p.z }, dy }); }
  if (!plan.length) return 0;
  const go = (cx) => { for (const m of plan) { const o = cx.getObject(m.id); if (!o) continue; if (o.parent) o.worldFeetPosition = m.p; else o.feetPosition = m.p; const h = o.state?.home; if (h && typeof h === "object") o.state.home = { ...h, y: (h.y ?? 0) + m.dy }; if (o.velocity) o.velocity = { x: 0, y: 0, z: 0 }; } };
  try { ctx.commit(`snapped ${plan.length} piece${plan.length > 1 ? "s" : ""} to the floor`, () => go(ctx)); } catch (e) { go(ctx); }
  hold = { until: ctx.now() + 1200, plan: plan.map((m) => ({ id: m.id, p: m.p })) };
  return plan.length;
}
// Home (or the chip): every picked piece turns back to its default orientation where it stands, one commit, one undo
function realign(ctx, ids) {
  const list = ids.map((id) => ctx.getObject(id)).filter(Boolean); if (!list.length) return 0;
  const go = (cx) => { for (const o0 of list) { const o = cx.getObject(o0.id); if (o) o.rotation = { w: 1, x: 0, y: 0, z: 0 }; } };
  try { ctx.commit(`realigned ${list.length} piece${list.length > 1 ? "s" : ""}`, () => go(ctx)); } catch (e) { go(ctx); }
  return list.length;
}
function publish(ctx) { const me = ctx.world.players?.find((p) => p.isLocal); if (!me) return;
  const rows = [...group].slice(0, 40).map((id) => { const o = ctx.getObject(id); if (!o) return null; const p = o.worldFeetPosition ?? o.feetPosition ?? {}; const k = o.template ? String(o.template).split("#").pop() : o.model ? "model" : o.primitive?.kind ?? (o.light ? "light" : o.fx ? "fx" : "object"); return { ref: String(id), id: String(id).split("#").pop(), kind: k, x: +(p.x ?? 0).toFixed(1), y: +(p.y ?? 0).toFixed(1), z: +(p.z ?? 0).toFixed(1) }; }).filter(Boolean);
  me.state.advTransform = { ...prefs, group: group.size, members: rows }; }
// Alt + left-drag: a marquee over the ground; on release every piece whose middle sits inside it becomes the group
let mq = null;
const altHeld = (input) => input.held?.alt || input.held?.["advanced-transform:alt"];
const lmb = (input, k) => input[k]?.marquee || input[k]?.["advanced-transform:marquee"];
function mqPoint(ray, y) { const dy = ray.direction.y; if (Math.abs(dy) < 1e-4) return null; const t = (y - ray.origin.y) / dy; return t > 0 ? add(ray.origin, mul(ray.direction, t)) : null; }
function mqDraw(ctx) { if (!mq?.b) return; const a = mq.a, b = mq.b, w = Math.max(0.5, Math.abs(b.x - a.x)), d = Math.max(0.5, Math.abs(b.z - a.z)), c = { x: (a.x + b.x) / 2, y: mq.y + 0.3, z: (a.z + b.z) / 2 };
  const o = mq.box && ctx.getObject(mq.box);
  if (!o) { try { mq.box = ctx.spawn({ audience: "local", scope: "session", lifetime: 60, physics: "none", castShadow: false, receiveShadow: false, feetPosition: c, primitive: { kind: "box", width: w, height: 0.6, depth: d }, material: { color: "#ffd84d", emissive: "#ffd84d", opacity: 0.22, transparent: true, unlit: true, depthWrite: false } }); } catch (e) { ctx.log("marquee box failed", { e: String(e) }); } }
  else { o.feetPosition = c; o.primitive = { kind: "box", width: w, height: 0.6, depth: d }; }
  ctx.authoring?.dragReadout?.(`${w.toFixed(0)} × ${d.toFixed(0)} m`); }
function mqEnd(ctx) { const m = mq; mq = null; if (m?.box) { try { ctx.destroy(m.box); } catch (e) {} } if (!m?.b) return;
  const x0 = Math.min(m.a.x, m.b.x), x1 = Math.max(m.a.x, m.b.x), z0 = Math.min(m.a.z, m.b.z), z1 = Math.max(m.a.z, m.b.z);
  if (x1 - x0 < 1 && z1 - z0 < 1) return;
  const c = { x: (x0 + x1) / 2, y: m.y, z: (z0 + z1) / 2 }, r = Math.hypot(x1 - x0, z1 - z0) / 2 + 2;
  let rows = []; try { rows = ctx.query({ center: c, radius: r + 400, excludeTags: ["helper"] }); } catch (e) { ctx.log("marquee query failed", { e: String(e) }); }
  const picked = [];
  for (const row of rows) { const o = ctx.getObject(row.id); if (!o || o.parent || String(row.id) === String(m.box)) continue; if (o.userId || o.isLocal !== undefined && o.displayName) continue;
    const bb = o.bounds, p = bb ? bb.center : row.feetPosition; if (!p) continue;
    if (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1) picked.push(row.id); if (picked.length >= 400) break; }
  if (m.add) for (const id of group) if (!picked.some((q) => String(q) === String(id))) picked.unshift(id);
  for (const id of group) mark(ctx, id, false);
  group = new Set(picked.length > 1 ? picked : []); for (const id of group) mark(ctx, id, true);
  const me = ctx.world.players?.find((p) => p.isLocal); const last = picked.length ? picked[picked.length - 1] : null;
  keepNext = last; lastId = null; leaseAt = 0;
  if (me) { try { me.selection = last; } catch (e) { ctx.log("marquee select failed", { e: String(e) }); } }
  ctx.log("marquee picked", { n: picked.length }); publish(ctx); }
function marquee(ctx, input) {
  if (!mq && lmb(input, "pressed") && altHeld(input)) { const ray = getInputRay(ctx, input); if (!ray) return true;
    let h = null; try { h = raycast(ctx, ray.origin, ray.direction, { distance: 5000 }); } catch (e) {}
    const y = h ? h.position.y : 0, a = h ? h.position : mqPoint(ray, y); if (!a) return true;
    mq = { a, b: null, y, add: !!ctrlHeld(input) }; return true; }
  if (!mq) return false;
  const ray = getInputRay(ctx, input), b = ray && mqPoint(ray, mq.y); if (b) { mq.b = b; mqDraw(ctx); }
  if (lmb(input, "released") || !lmb(input, "held")) mqEnd(ctx);
  return true;
}
export function onInput(ctx, input) {
  if (marquee(ctx, input)) return;
  flushOwed(ctx);
  holdPoses(ctx);
  // nothing selected (a right-click, a click on empty ground): the group and its table let go too
  const meSel = ctx.world.players?.find((p) => p.isLocal);
  if (meSel && group.size && !meSel.selection) { for (const id of group) mark(ctx, id, false); group.clear(); lastId = null; publish(ctx); }
  const ad = input.actionData ?? {};
  const en = ad.setEnabled ?? ad["advanced-transform:setEnabled"], sn = ad.setSnap ?? ad["advanced-transform:setSnap"];
  if (en) { prefs.on = !!en.on; publish(ctx); }
  const un = ad.ungroupOne ?? ad["advanced-transform:ungroupOne"];
  if (un?.ref) { const hitId = [...group].find((g) => String(g) === un.ref); if (hitId !== undefined) {
    const wasSel = String(hitId) === String(lastId);
    group.delete(hitId); mark(ctx, hitId, false);
    const rest = [...group];
    if (group.size < 2) { for (const g of group) mark(ctx, g, false); group.clear(); }
    // the removed piece was the selected one: the selection moves onto the group that's left, so the gizmo stays on the group
    if (wasSel) { const next = rest.length ? rest[rest.length - 1] : null; keepNext = next; lastId = null; const me = ctx.world.players?.find((p) => p.isLocal); if (me) { try { me.selection = next; } catch (e) { ctx.log("gizmo reselect failed", { e: String(e) }); } } }
    leaseAt = 0; publish(ctx); } }
  if (sn) { for (const k of ["move", "rot", "ring"]) if (sn[k] > 0) prefs[k] = Math.min(k === "ring" ? 6 : 1e4, +sn[k]); for (const k of ["always", "local", "surface", "align"]) if (k in sn) prefs[k] = !!sn[k]; publish(ctx); }
  // gizmo modes, unity style: E move, R rotate, T scale (ctrl held = the browser's own keys, left alone)
  if (!ctrlHeld(input)) for (const [a, t] of [["toolMove", "move"], ["toolRotate", "rotate"], ["toolScale", "scale"]]) if (hit(input, a) && prefs.tool !== t) { prefs.tool = t; publish(ctx); }
  if (hit(input, "floor") || ad.floor || ad["advanced-transform:floor"]) floorAsk = true;
  if (floorAsk) { floorAsk = false; const ids = group.size > 1 ? [...group] : lastId ? [lastId] : []; if (ids.length) ctx.log("gizmo floor", { n: dropToFloor(ctx, ids) }); }
  if (hit(input, "realign") || ad.realign || ad["advanced-transform:realign"]) { const ids = group.size > 1 ? [...group] : lastId ? [lastId] : []; if (ids.length) ctx.log("gizmo realign", { n: realign(ctx, ids) }); }
  if (hit(input, "groupDelete")) { if (group.size > 1) killGroup(ctx); else if (prefs.on && lastId) killOne(ctx); }
  if (ctrlHeld(input) && hit(input, "copy")) copy(ctx);
  if (ctrlHeld(input) && hit(input, "paste")) paste(ctx);
}
export function editor(ctx, obj) {
  const ctrl = !!ctx.authoring.modifiers?.ctrl;
  // the editor stops while nothing is selected: coming back after a gap is a fresh pick, so the old group doesn't return
  const gap = ctx.now() - lastEdAt > 400; lastEdAt = ctx.now();
  holdPoses(ctx);
  if (gap && !ctrl && keepNext !== obj.id) { for (const id of group) mark(ctx, id, false); group.clear(); lastId = null; }
  if (obj.id !== lastId) {
    if (ctrl) { if (lastId) group.add(lastId); group.add(obj.id); }
    // a plain click picks that piece alone, grouped or not; only a hand-off of our own (paste, × on the selected row) keeps the group
    else if (keepNext !== obj.id) { for (const id of group) mark(ctx, id, false); group.clear(); }
    keepNext = null;
    lastId = obj.id; leaseAt = 0;
  }
  if (group.size > 1 && ctx.now() - leaseAt > 300) { leaseAt = ctx.now(); for (const id of group) mark(ctx, id, true); }
  const A = ctx.authoring; if (!prefs.on || !obj.bounds) return;
  if ((ctx.now() - (publish.at ?? 0)) > 500) { publish.at = ctx.now(); publish(ctx); }
  // the box round every member: the gizmo stands at its middle, sized to hold them all
  let lo = null, hi = null;
  for (const m of members(ctx, obj)) { const bb = m.bounds; if (!bb) continue;
    lo = lo ? { x: Math.min(lo.x, bb.min.x), y: Math.min(lo.y, bb.min.y), z: Math.min(lo.z, bb.min.z) } : { ...bb.min };
    hi = hi ? { x: Math.max(hi.x, bb.max.x), y: Math.max(hi.y, bb.max.y), z: Math.max(hi.z, bb.max.z) } : { ...bb.max }; }
  const b = { center: mul(add(lo, hi), 0.5), size: sub(hi, lo) }, grouped = group.size > 1;
  const c = b.center, R = Math.max(1, Math.max(b.size.x, b.size.y, b.size.z) * 0.6 + 0.4), s = Math.min(1.1, R / 3.6); // handle size: slim, and capped so a big group's gizmo stays a tool, not a monument
  const snapOn = () => !!A.modifiers?.ctrl || !!prefs.always, // either one snaps: "always" plus ctrl no longer cancels out // ctrl held mid-drag snaps, read live (shift is god mode's fly-down)
    q = grouped ? { w: 1, x: 0, y: 0, z: 0 } : quat(obj.rotation),
    space = prefs.local ? quat(obj.rotation) : { w: 1, x: 0, y: 0, z: 0 }, // global: world axes; local: the selected piece's own (in a group, the last one picked)
    tube = Math.max(0.018 * s, R * 0.008) * (prefs.ring || 1); // a ring round a 100 m piece stays visible from the air
  // one turn gesture, shared by a ring and its grabber: about axis W through the centre frozen at press
  const turn = (k, W) => ({
    press: (ray) => { const Fw = ringFrame(W), v = qrot(q, Fw.e1), h0 = (Math.atan2(dot(v, Fw.e2), dot(v, Fw.e1)) * 180) / Math.PI;
      return grab(ctx, { c0: c, W, a0: ringAngle(ray, c, W) ?? 0, h0: Number.isFinite(h0) ? h0 : 0, m: snap(members(ctx, obj)) }); }, release: (st) => letGo(ctx, st),
    drag: (ray, st) => { const a = ringAngle(ray, st.c0, st.W); if (a === null) return; let d = a - st.a0; d = ((d + 540) % 360) - 180; if (snapOn()) { const h0 = st.h0 ?? 0; d = Math.round((h0 + d) / prefs.rot) * prefs.rot - h0; } const r = qaxis(st.W, d); for (const m of st.m) { if (m.id === obj.id) { obj.rotation = qmul(r, m.q); if (grouped) { const np = add(st.c0, qrot(r, sub(m.p, st.c0))); obj.worldFeetPosition = np; rehome(obj, m, np); } } else { live(ctx, m).rotation = qmul(r, m.q); m.to = { ...(m.to ?? {}), q: qmul(r, m.q) }; put(ctx, m, add(st.c0, qrot(r, sub(m.p, st.c0)))); } } A.dragReadout(`${prefs.local ? "local " : ""}${k.toUpperCase()} ${d.toFixed(0)}°`); } });
  // the grabber: a fat arc on the ring the cursor is nearest, sitting right where the cursor is
  const active = String(A.activeHandleStableId ?? ""), dragArc = ["x", "y", "z"].find((k) => active.includes("arc-" + k));
  let arcK = dragArc ?? null, arcA = 0, best = 0.3;
  if (A.cursor) for (const k of ["x", "y", "z"]) { const h = onPlane(A.cursor, c, qrot(space, AX[k])); if (!h) continue; const miss = Math.abs(h.r - R) / R;
    if (dragArc ? k === dragArc : miss < best) { best = miss; arcK = k; arcA = h.a; } }
  for (const k of ["x", "y", "z"]) {
    const u = AX[k], W = qrot(space, u), F = ringFrame(W);
    if (prefs.tool === "move") A.handle({ id: "move-" + k, at: c, priority: 0,
      render: (h) => { h.self.primitive = { kind: "gizmo", shape: "arrow", dir: prefs.local ? W : "+" + k, scale: s, role: "move" }; h.self.material = { color: COL[k], unlit: true, depthTest: false }; },
      press: (ray) => grab(ctx, { c0: c, W, t0: axisT(ray, c, W), m: snap(members(ctx, obj)) }), release: (st) => letGo(ctx, st),
      drag: (ray, st) => { let d = axisT(ray, st.c0, st.W) - st.t0; if (snapOn()) d = Math.round(d / prefs.move) * prefs.move; for (const m of st.m) m.id === obj.id ? (obj.worldFeetPosition = add(m.p, mul(st.W, d)), rehome(obj, m, add(m.p, mul(st.W, d)))) : put(ctx, m, add(m.p, mul(st.W, d))); A.dragReadout(`${prefs.local ? "local " : ""}${k.toUpperCase()} ${d >= 0 ? "+" : ""}${d.toFixed(2)} m`); } });
    if (prefs.tool === "rotate") A.handle({ id: "rot-" + k, at: c, priority: 50,
      render: (h) => { h.self.primitive = { kind: "torus", radius: R, tube, radialSegments: 8, tubularSegments: 64 }; spawnKeepFlatCentre(h.self); h.self.material = { color: COL[k], unlit: true, depthTest: false }; h.self.rotation = quatFromBasis(F.e1, F.e2, W); },
      ...turn(k, W) });
    // the grabber: three fat segments curving along the ring right under the cursor (a centred torus arc drew in the middle of the piece)
    if (prefs.tool === "rotate" && arcK === k) { const sp = 0.42, n = 3, seg = sp / n, L = 2 * R * Math.sin(seg / 2) * 1.04, rad = Math.max(tube * 2.6, 0.05 * s);
      for (let i = 0; i < n; i++) { const am = arcA - sp / 2 + seg * (i + 0.5), ca = Math.cos(am), sa = Math.sin(am);
        const radial = add(mul(F.e1, ca), mul(F.e2, sa)), tang = add(mul(F.e1, -sa), mul(F.e2, ca)), mid = add(c, mul(radial, R * Math.cos(seg / 2)));
        A.handle({ id: "arc-" + k + "-" + i, at: sub(mid, mul(tang, L / 2)), priority: 45,
          render: (h) => { h.self.primitive = { kind: "cylinder", radiusTop: rad, radiusBottom: rad, height: L, radialSegments: 10 }; h.self.material = { color: COL[k], emissive: COL[k], unlit: true, depthTest: false }; h.self.rotation = quatFromBasis(radial, tang, W); },
          ...turn(k, W) }); } }
    const lu = qrot(q, u), at = add(c, mul(lu, R * 1.15));
    if (prefs.tool === "scale") A.handle({ id: "scale-" + k, at, priority: 30,
      render: (h) => { h.self.primitive = { kind: "box", width: Math.max(0.15 * s, R * 0.07), height: Math.max(0.15 * s, R * 0.07), depth: Math.max(0.15 * s, R * 0.07) }; h.self.material = { color: COL[k], unlit: true, depthTest: false }; h.self.rotation = q; },
      press: (ray) => ({ c0: c, u0: lu, t0: axisT(ray, c, lu), s0: scl(obj.scale) }),
      drag: (ray, st) => { let f = Math.max(0.05, axisT(ray, st.c0, st.u0) / Math.max(0.1, st.t0)); if (snapOn()) f = Math.round(f * 10) / 10; obj.scale = { ...st.s0, [k]: st.s0[k] * f }; A.dragReadout(`${k.toUpperCase()} ×${f.toFixed(2)}`); } });
  }
  // uniform scale: a white cube at the centre, sized to the piece; drag it sideways on screen, right grows, left shrinks
  if (prefs.tool === "scale") A.handle({ id: "scale-all", at: c, priority: 35,
    render: (h) => { const w = Math.max(0.2 * s, R * 0.1); h.self.primitive = { kind: "box", width: w, height: w, depth: w }; h.self.material = { color: "#ffffff", unlit: true, depthTest: false }; h.self.rotation = q; },
    press: (ray) => { const side = norm(cross(ray.direction, AX.y)); return { c0: c, side, t0: axisT(ray, c, side), s0: scl(obj.scale) }; },
    drag: (ray, st) => { let f = Math.max(0.05, 1 + (axisT(ray, st.c0, st.side) - st.t0) / R); if (snapOn()) f = Math.round(f * 10) / 10; obj.scale = { x: st.s0.x * f, y: st.s0.y * f, z: st.s0.z * f }; A.dragReadout(`×${f.toFixed(2)}`); } });
  // free move: the white four-way pad under the piece. flat = slides across its own ground plane.
  // surface snap (tab toggle, or alt held mid-drag) = the piece lands ON whatever is under the cursor:
  // a ledge or floor top takes its underside, a wall takes its back (and with "face out" on, it turns to face away from the wall)
  const foot = { x: c.x, y: lo.y, z: c.z };
  const surfaceOn = () => !!prefs.surface !== !!A.modifiers?.alt;
  if (prefs.tool === "move") A.handle({ id: "free-move", at: foot, priority: 5,
    render: (h) => { h.self.primitive = { kind: "gizmo", shape: "pad", scale: s * 1.3, role: "move", terrainLocked: !!prefs.surface }; h.self.material = { color: prefs.surface ? "#ffe9a8" : "#ffffff", unlit: true, depthTest: false }; },
    press: (ray) => { const p0 = planeHit(ray, foot.y) ?? foot, list = members(ctx, obj), he = obj.bounds?.obb?.halfExtents;
      return grab(ctx, { y0: foot.y, f0: { ...foot }, p0, half: mul(b.size, 0.5), thin: !grouped && he ? Math.min(he.x, he.z) : null, q0: q, m: snap(list), ids: list.map((o) => String(o.id)) }); },
    release: (st) => letGo(ctx, st),
    drag: (ray, st) => {
      let d = null, turnBy = 0, onTo = ""; const sh = A.surfaceHit;
      const ids = Array.isArray(st.ids) ? st.ids : Object.values(st.ids ?? {}), mine = sh && ids.some((i) => String(sh.objectId) === i || String(sh.objectId).startsWith(i + "/"));
      if (surfaceOn() && sh && !mine) {
        const n = norm(sh.normal ?? { x: 0, y: 1, z: 0 }), P = sh.position; let t;
        if (n.y > 0.55) { t = { x: P.x, y: P.y, z: P.z }; onTo = "on top"; } // floor, ledge, table: underside on it
        else if (n.y < -0.55) { t = { x: P.x, y: P.y - st.half.y * 2, z: P.z }; onTo = "under"; } // ceiling: hangs below it
        else { // wall: back against the face, centred on the cursor's height
          const nh = norm({ x: n.x, y: 0, z: n.z });
          if (prefs.align && !grouped) { const f = qrot(st.q0, { x: 0, y: 0, z: -1 }), y0 = Math.atan2(-f.x, -f.z), y1 = Math.atan2(-nh.x, -nh.z); turnBy = ((((y1 - y0) * 180) / Math.PI + 540) % 360) - 180; }
          const back = turnBy || prefs.align ? (st.thin ?? Math.abs(nh.x) * st.half.x + Math.abs(nh.z) * st.half.z) : Math.abs(nh.x) * st.half.x + Math.abs(nh.z) * st.half.z;
          t = { x: P.x + nh.x * (back + 0.01), y: P.y - st.half.y, z: P.z + nh.z * (back + 0.01) }; onTo = "on wall"; }
        d = sub(t, st.f0);
      } else { const p = planeHit(ray, st.y0); if (!p) return; d = { x: p.x - st.p0.x, y: 0, z: p.z - st.p0.z }; }
      if (snapOn()) { d.x = Math.round(d.x / prefs.move) * prefs.move; d.z = Math.round(d.z / prefs.move) * prefs.move; }
      for (const m of st.m) { const np = add(m.p, d); if (m.id === obj.id) { obj.worldFeetPosition = np; rehome(obj, m, np); obj.rotation = turnBy ? qmul(qaxis(AX.y, turnBy), m.q) : m.q; } else put(ctx, m, np); }
      A.dragReadout(onTo ? `snap ${onTo}` : `${d.x >= 0 ? "+" : ""}${d.x.toFixed(2)}, ${d.z >= 0 ? "+" : ""}${d.z.toFixed(2)} m`); } });
  for (const [t, key, icon] of [["move", "E", "move"], ["rotate", "R", "rotate-cw"], ["scale", "T", "maximize-2"]])
    A.handle({ id: "tool-" + t, at: "action", label: `${t} (${key})`, icon, active: prefs.tool === t, click: () => { prefs.tool = t; publish(ctx); } });
  A.handle({ id: "surface", at: "action", label: prefs.surface ? "surface snap on (alt)" : "surface snap (alt)", icon: "magnet", active: !!prefs.surface, click: () => { prefs.surface = !prefs.surface; publish(ctx); } });
  A.handle({ id: "space", at: "action", label: prefs.local ? "local" : "global", icon: prefs.local ? "box" : "globe", active: prefs.local, click: () => { prefs.local = !prefs.local; publish(ctx); } });
  A.handle({ id: "floor", at: "action", label: "snap to floor (End)", icon: "arrow-down-to-line", click: () => { floorAsk = true; const ids = group.size > 1 ? [...group] : [obj.id]; floorAsk = false; dropToFloor(ctx, ids); } });
  A.handle({ id: "reset-rot", at: "action", label: "realign (Home)", icon: "rotate-ccw", click: () => { const ids = group.size > 1 ? [...group] : [obj.id]; obj.rotation = { w: 1, x: 0, y: 0, z: 0 }; realign(ctx, ids); } });
  A.handle({ id: "reset-scale", at: "action", label: "reset scale", icon: "maximize", click: () => { obj.scale = 1; } });
  if (group.size > 1) A.handle({ id: "group-delete", at: "action", label: `delete group (${group.size})`, icon: "trash-2", click: () => killGroup(ctx) });
  if (group.size > 1) A.handle({ id: "group-clear", at: "action", label: `ungroup (${group.size})`, icon: "x", click: () => { for (const id of group) mark(ctx, id, false); group.clear(); } });
  // one piece: the built-in cluster stays up beside the gizmo (Del, duplicate). a group: the gizmo alone owns the drag
  // the gizmo on: god mode's own white controls (turn arrow, height bar, the X) stand down, one piece or a group
  return { replaces: "default" };

}


/** A plane, circle, ring or torus stands by its centre here: "center" for those four kinds, nothing for any other. */
function spawnFlatCentre(primitive) {
  const kind = typeof primitive === "string" ? primitive : primitive != null ? primitive.kind : undefined;
  return kind === "plane" || kind === "circle" || kind === "ring" || kind === "torus" ? "center" : undefined;
}

/** A part whose shape is decided as the line runs gets pivot "center" when it is a plane, circle, ring or torus that names no pivot. */
function spawnKeepFlatCentre(part) {
  if (part != null && spawnFlatCentre(part.primitive) !== undefined) {
    if (part.pivot == null) part.pivot = "center";
  }
  return part;
}

/** Writes a part's primitive and keeps it standing the same way when the new shape is a plane, circle, ring or torus: the value written. */
function spawnSetPrimitive(part, primitive) {
  part.primitive = primitive;
  spawnKeepFlatCentre(part);
  return primitive;
}
