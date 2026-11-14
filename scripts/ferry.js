// Ferry, the refrigerator (Level 169). It never speaks and has no portrait: it answers by sliding its magnets and bringing one sticky note to the middle of its door.
// Pieces: scripts/lib/l169-ferry.js. Lines and magnet poses: scripts/lib/data/ferry-notes.yml. Numbers: scripts/lib/data/level169.yml.
// One file for the root (stock, refill, who is near) and for its pressable pieces (state.role: door | water | food | chill), which all answer through use().
import { animate } from "builtin/tween";
import L from "./lib/data/level169.yml";
import N from "./lib/data/ferry-notes.yml";
import { doorZ } from "./lib/l169-ferry.js";
import { hourOf, isDay } from "./sun169.js";
export const updateSchedule = { every: { seconds: 0.5 } };
const HOUR_S = L.day.periodMs / 48000; // one desert hour in real seconds
const STEP_MS = L.ferry.refillHours * HOUR_S * 1000, CAP = L.ferry.capacity;
const WATER = ["almonds", "almondsG", "almondsR", "almondsB"];
const SND = (n) => `cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const EASE = "easeInOutCubic";
const R = L.house.rooms, IN = ["living", "kitchen", "hall", "bed1", "bed2", "bed3", "den"].map((k) => R[k]);
const HOUSE = [Math.min(...IN.map((r) => r[0])), Math.max(...IN.map((r) => r[1])), Math.min(...IN.map((r) => r[2])), Math.max(...IN.map((r) => r[3]))];
const inHouse = (p) => p.x > HOUSE[0] && p.x < HOUSE[1] && p.z > HOUSE[2] && p.z < HOUSE[3];
const spot = (fx, fy, lift = 0) => ({ x: -fx, y: fy, z: -(doorZ(fx, fy) + lift) }); // a place on the door's face, in the door's own frame
const sound = (ctx, f, name, volume = 0.5) => { const p = f.worldFeetPosition ?? f.feetPosition; ctx.emit("playSound", { clip: SND(name), position: { x: p.x, y: p.y + 1, z: p.z }, volume, refDistance: 2, maxDistance: 14 }); };

// ---- the stock: counted from timestamps, so a reload neither loses nor doubles it
export function refill(ctx, f) {
  const s = f.state, now = ctx.now();
  if (typeof s.at !== "number" || s.at > now) { s.at = now; return 0; }
  const n = Math.floor((now - s.at) / STEP_MS);
  if (n <= 0) return 0;
  const w = Math.min(CAP, (s.water ?? 0) + 2 * n), fd = Math.min(CAP, (s.food ?? 0) + n);
  s.at += n * STEP_MS;
  if (w !== s.water || fd !== s.food) { s.water = w; s.food = fd; sync(ctx, f); }
  return n;
}
// one prop per stocked item; a piece nobody may press right now is state.taken (scripts/interact.js skips it)
function sync(ctx, f) {
  const s = f.state, open = !!s.open;
  for (const [key, pre] of [["water", "w"], ["food", "f"]]) for (let i = 0; i < CAP; i++) {
    const o = ctx.getObject(`${f.id}/${pre}${i}`); if (!o) continue;
    const have = i < (s[key] ?? 0);
    if (o.visible !== have) o.visible = have;
    if (!!o.state.taken !== !(have && open)) o.state.taken = !(have && open);
  }
  const dial = ctx.getObject(`${f.id}/dial`); if (dial && !!dial.state.taken !== !open) dial.state.taken = !open;
  const door = ctx.getObject(`${f.id}/door`);
  if (door) { const verb = open ? "Close" : "Open"; if (door.state.verb !== verb) { door.state.verb = verb; door.state.prompt = `${verb} Ferry`; } }
}

// ---- how it talks
function pickLine(ctx, on, p, last) {
  const h = hourOf(ctx), day = isDay(h), ps = p?.state ?? {};
  const when = [day ? "day" : "night"]; if (h >= 10 && h <= 14) when.push("noon"); if (h >= 16 && h < L.day.sunset) when.push("dusk");
  const stage = ps.l169st ?? L.sun.stages.filter((v) => (ps.l169sun ?? 0) >= v).length, hungry = (ps.hunger ?? 100) < N.hungryUnder;
  let best = [], top = -1;
  for (const l of N.lines) {
    if (l.on !== on) continue;
    if (l.time && !when.includes(l.time)) continue;
    if (l.stage && (stage < l.stage[0] || stage > l.stage[1])) continue;
    if (l.hungry && !hungry) continue;
    const score = (l.stage ? 4 : 0) + (l.hungry ? 3 : 0) + (l.time === "noon" || l.time === "dusk" ? 2 : l.time ? 1 : 0);
    if (score > top) { top = score; best = [l]; } else if (score === top) best.push(l);
  }
  const fresh = best.filter((l) => l.text !== last), pool = fresh.length ? fresh : best;
  return pool.length ? pool[Math.floor(ctx.random() * pool.length) % pool.length] : null;
}
function pose(ctx, f, name, slide = true) {
  const P = N.poses[name] ?? N.poses.home;
  for (let i = 0; i < P.length; i++) {
    const id = `${f.id}/door/m${i}`, m = ctx.getObject(id); if (!m) continue;
    const [fx, fy, roll] = P[i], to = spot(fx, fy);
    if (!slide) { m.feetPosition = to; m.rotation = { yaw: 0, pitch: 0, roll }; continue; }
    animate(ctx, id, { "feetPosition.x": to.x, "feetPosition.y": to.y, "feetPosition.z": to.z, "rotation.roll": roll }, { duration: 0.6 + ((i * 3) % 6) * 0.1, easing: EASE });
  }
}
function restNote(ctx, f, i, slide = true) {
  const id = `${f.id}/door/n${i}`, n = ctx.getObject(id); if (!n) return;
  const [fx, fy] = N.note.slots[i], to = spot(fx, fy, 0.002);
  if (!slide) { n.feetPosition = to; n.scale = { x: 1, y: 1, z: 1 }; return; }
  animate(ctx, id, { "feetPosition.x": to.x, "feetPosition.y": to.y, "feetPosition.z": to.z, "scale.x": 1, "scale.y": 1 }, { duration: 0.8, easing: EASE });
}
export function say(ctx, f, on, p) {
  const s = f.state, line = pickLine(ctx, on, p, s.line);
  if (!line) return null;
  const prev = s.note ?? -1, i = (prev + 1) % N.note.slots.length;
  if (prev >= 0) restNote(ctx, f, prev);
  const id = `${f.id}/door/n${i}`, n = ctx.getObject(id);
  if (n) {
    n.state.line = line.text;
    const [fx, fy] = N.note.center, to = spot(fx, fy, 0.016);
    animate(ctx, id, { "feetPosition.x": to.x, "feetPosition.y": to.y, "feetPosition.z": to.z, "scale.x": N.note.grow, "scale.y": N.note.grow }, { duration: 0.9, easing: EASE });
  }
  s.note = i; s.line = line.text; s.pose = line.pose ?? "home"; s.saidAt = ctx.now();
  pose(ctx, f, s.pose);
  sound(ctx, f, "small-plastic-fridge-magnets-sliding-on-enamel-door-soft", 0.3);
  return line.text;
}

// ---- the door
function swing(ctx, f, open, p) {
  const s = f.state; if (!!s.open === open) return;
  s.open = open;
  if (open) s.openAt = ctx.now();
  animate(ctx, `${f.id}/door`, { "rotation.yaw": open ? -N.openYaw : 0 }, { duration: open ? 0.9 : 0.7, easing: "easeInOutQuad" });
  const cold = ctx.getObject(`${f.id}/cold`);
  if (cold) {
    cold.light = open ? { kind: "point", color: "oklch(0.93 0.05 225)", intensity: 1.6, distance: 4.5, shadow: { enabled: false } } : null;
    cold.audio = open ? { clip: SND("old-refrigerator-compressor-low-hum-loop"), gain: 0.22, loop: true, spatial: true, maxDistance: 9 } : null;
  }
  sound(ctx, f, open ? "old-fridge-door-latch-pull-open" : "old-fridge-door-soft-shut-thud", 0.5);
  if (open) sound(ctx, f, "soft-glass-bottles-clink-in-fridge-door", 0.4);
  sync(ctx, f);
  if (p !== null) say(ctx, f, open ? "open" : "close", p);
}

// ---- every press on Ferry or on something inside it lands here (E: scripts/interact.js emits "press" to the piece)
export function use(ctx, f, role, by) {
  const s = f.state, p = by ? ctx.getObject(by) : null, ps = p?.state, now = ctx.now();
  refill(ctx, f);
  if (role === "door") return swing(ctx, f, !s.open, p);
  if (!s.open || !ps) return;
  if (role === "water" || role === "food") {
    if (!((s[role] ?? 0) > 0)) { say(ctx, f, "empty", p); return; }
    s[role] -= 1;
    if (role === "water") {
      ps.almonds = (ps.almonds ?? 0) + 1;
      ps.l169cold = (ps.l169cold ?? 0) + 1;
      ps.l169coldLeft = L.water.coldHoursDay * HOUR_S;
      ps.notice = { text: `Cold almond water. It stays water for about ${L.water.coldHoursDay} hours in the sun, longer at night.`, at: now };
      sound(ctx, f, "glass-bottle-lifted-off-fridge-shelf-clink", 0.5);
    } else {
      ps.hunger = Math.min(100, (ps.hunger ?? 100) + N.tinHunger);
      ps.notice = { text: `Tinned peaches. Hunger +${N.tinHunger}`, at: now };
      sound(ctx, f, "tin-can-lifted-off-metal-shelf", 0.45);
    }
    s.took = { ...(s.took ?? {}), [p.id]: 1 };
    sync(ctx, f);
    say(ctx, f, s.water <= 0 && s.food <= 0 ? "empty" : role, p);
    return;
  }
  if (role === "chill") { // the cold only keeps what is still water. Sand stays sand.
    let total = 0; for (const k of WATER) total += ps[k] ?? 0;
    if (total > 0) { ps.l169cold = total; ps.l169coldLeft = L.water.coldHoursDay * HOUR_S; }
    const sand = (ps.sand169 ?? 0) > 0;
    ps.notice = { text: total > 0 ? `Your ${total === 1 ? "bottle is" : `${total} bottles are`} cold again.${sand ? " The sand is still sand." : ""}` : sand ? "The sand in your bottles stays sand." : "You have nothing to cool.", at: now };
    say(ctx, f, sand ? "sand" : total > 0 ? "chill" : "nochill", p);
  }
}
export const ears = {
  press: (ctx, { by } = {}) => {
    const me = ctx.self, role = me.state.role;
    const f = role ? ctx.getObject(me.state.root) : me;
    if (f) use(ctx, f, role ?? "door", by);
  },
};
export function update(ctx) {
  const f = ctx.self, s = f.state;
  if (s.role) return ctx.sleep(); // a piece only listens
  if (!s.posed) { s.posed = 1; pose(ctx, f, "home", false); for (let i = 0; i < N.note.slots.length; i++) restNote(ctx, f, i, false); sync(ctx, f); }
  refill(ctx, f);
  const here = f.worldFeetPosition ?? f.feetPosition, k = (f.session.seen ??= {});
  let close = false, any = false;
  for (const p of ctx.place.players) {
    const q = p.feetPosition, d = Math.hypot(q.x - here.x, q.z - here.z), m = (k[p.id] ??= { near: false, inside: inHouse(q) });
    if (d < 80) any = true;
    if (d < N.closeAt) close = true;
    const inside = inHouse(q), near = d < N.near;
    if (m.inside && !inside) { // out of the house: a goodbye if they carry something of Ferry's
      if (s.took?.[p.id]) { const t = { ...s.took }; delete t[p.id]; s.took = t; say(ctx, f, "bye", p); } else say(ctx, f, "leave", p);
    } else if (near && !m.near && !s.open) say(ctx, f, "greet", p);
    m.inside = inside; m.near = near;
  }
  if (s.open && !close && ctx.now() - (s.openAt ?? 0) > N.closeAfter * 1000) swing(ctx, f, false, null);
  if (!any) ctx.sleep(3);
}
