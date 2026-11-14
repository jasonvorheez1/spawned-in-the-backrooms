// Door containment, for any level: things shut in a room stay in it until someone opens the door, and what gets out stays out.
// The rule is physical: a closed pen door (scripts/pen-door.js) is a solid leaf only a player's press moves, so no AI opens it.
// This lib keeps the books while nobody is near:
//   place.state.pens[id]  = [kind, ...]   who is alive inside a room that is not loaded (rolled once by penRoll)
//   place.state.loose     = [{ k, x, z, from }]  who escaped and is not loaded: they wait where they were last seen
//   place.state.pdoors[id] = 1            a pen door left open
// A live foe carries tags ["pen-foe"] and state.pen = room id (null once it is out), state.penKind = kind.
// spawnFoe(ctx, kind, pos, state) is the level's own: it returns the id it spawned, or null.
export const inside = (b, p, pad = 0) => p.x > b.x0 - pad && p.x < b.x1 + pad && p.z > b.z0 - pad && p.z < b.z1 + pad;
const alive = (f) => !f.state?.dead && (f.state?.hp ?? 1) > 0;
const foes = (ctx) => ctx.query({ tags: ["pen-foe"] }).filter(alive);
// one room's row of a book, written as the whole book (a nested write from a sim does not save)
function book(ctx, key, id, v) { const s = ctx.place.state, b = { ...(s[key] ?? {}) }; if (v === undefined) delete b[id]; else b[id] = v; s[key] = b; }
export function penRoll(ctx, id, roll) { const s = ctx.place.state; if (!s.pens?.[id]) book(ctx, "pens", id, roll()); return s.pens[id]; }
export const penCount = (ctx, id) => ctx.place.state.pens?.[id]?.length ?? 0;
export const doorOpen = (ctx, id) => !!ctx.place.state.pdoors?.[id];
export function setDoor(ctx, id, open) { const s = ctx.place.state; if (open) book(ctx, "pdoors", id, 1); else if (s.pdoors?.[id]) book(ctx, "pdoors", id, undefined); }
// the room loads: everyone on its books walks in for real
export function penLoad(ctx, id, box, spawnFoe) {
  const s = ctx.place.state, list = [...(s.pens?.[id] ?? [])], left = [];
  for (const f of foes(ctx)) if (f.state.pen === id) { const i = list.indexOf(f.state.penKind); if (i >= 0) list.splice(i, 1); } // already standing in there (a machine handover re-laid the room): never twice
  list.forEach((k) => {
    const pos = { x: box.x0 + 3 + ctx.random() * (box.x1 - box.x0 - 6), y: 0.1, z: box.z0 + 3 + ctx.random() * (box.z1 - box.z0 - 6) };
    const open = doorOpen(ctx, id); // a door already standing open: what walks in is out, not shut in (the books and the door agree)
    const made = spawnFoe(ctx, k, pos, open ? { pen: null, penFrom: id, penKind: k, penBox: box } : { pen: id, penKind: k, penBox: box });
    if (!made) left.push(k); // the level has no body for this kind yet: it stays on the books
  });
  book(ctx, "pens", id, left);
}
// the room unloads: whoever is still inside goes back on its books, whoever got out goes on the loose list
export function penUnload(ctx, id, box) {
  const s = ctx.place.state, back = [...(s.pens?.[id] ?? [])];
  for (const f of foes(ctx)) {
    if (f.state.pen !== id && f.state.penFrom !== id) continue;
    if (inside(box, f.feetPosition, 0.5) && !doorOpen(ctx, id)) { back.push(f.state.penKind); ctx.destroy(f.id); }
    else if (f.state.pen === id) { f.state.pen = null; f.state.penFrom = id; }
    else if (doorOpen(ctx, id) && f.state.penFrom === id) { s.loose = [...(s.loose ?? []), { k: f.state.penKind, x: Math.round(f.feetPosition.x * 10) / 10, y: 0, z: Math.round(f.feetPosition.z * 10) / 10, from: id }]; ctx.destroy(f.id); } // out behind an open door: kept on the loose list, never back in the pen // out in the hall: it is loose now, kept live while someone is near
  }
  book(ctx, "pens", id, back);
}
// every tick or so: loose foes far from everyone are written down and removed; written-down ones near someone come back
export function looseTick(ctx, spawnFoe, near = 70, far = 120) {
  const s = ctx.place.state, ps = ctx.place.players.map((p) => p.feetPosition).filter(Boolean), d = (a) => Math.min(...ps.map((p) => Math.hypot(p.x - a.x, p.z - a.z)), Infinity);
  let loose = s.loose ?? [], changed = false;
  for (const id of Object.keys(s.pdoors ?? {})) if (s.pens?.[id]?.length && !foes(ctx).some((f) => f.state.pen === id)) { loose = [...loose, ...s.pens[id].map((k) => ({ k, x: (s.pdoorAt?.[id] ?? {}).x ?? NaN, y: 0, z: (s.pdoorAt?.[id] ?? {}).z ?? NaN, from: id }))].filter((l) => Number.isFinite(l.x)); book(ctx, "pens", id, []); changed = true; } // an open door with an unloaded room: its books go out with it
  for (const f of foes(ctx)) { if (f.state.pen) continue; if (d(f.feetPosition) > far) { loose = [...loose, { k: f.state.penKind, x: Math.round(f.feetPosition.x * 10) / 10, y: Math.round(f.feetPosition.y * 10) / 10, z: Math.round(f.feetPosition.z * 10) / 10, from: f.state.penFrom ?? null }]; ctx.destroy(f.id); changed = true; } }
  const keep = [];
  for (const l of loose) { if (ps.length && d(l) < near && spawnFoe(ctx, l.k, { x: l.x, y: (l.y ?? 0) + 0.1, z: l.z }, { pen: null, penKind: l.k, penFrom: l.from })) changed = true; else keep.push(l); }
  if (changed) s.loose = keep;
}
// a pen door moved: the ones inside hear it and come to look (their own AI reads state.lure for a few seconds)
export function doorMoved(ctx, id, open, pos) {
  setDoor(ctx, id, open);
  if (open && penCount(ctx, id)) { const s = ctx.place.state, b = s.pens[id], c = { x: pos.x, z: pos.z }; s.loose = [...(s.loose ?? []), ...b.map((k) => ({ k, x: c.x, y: 0, z: c.z, from: id }))]; book(ctx, "pens", id, []); } // opened while the room is not loaded: its books move to loose
  if (open) for (const f of foes(ctx)) if (f.state.pen === id) f.state.lure = { x: pos.x, z: pos.z, at: ctx.now() };
}
// how many are out of their rooms right now, loaded or not (quests read this)
export const looseCount = (ctx, from = null) => (ctx.place.state.loose ?? []).filter((l) => !from || l.from === from).length + foes(ctx).filter((f) => !f.state.pen && (!from || f.state.penFrom === from)).length;
