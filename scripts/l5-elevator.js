// Level 5's elevator banks (lib/level5.js ELEVATORS). One script, two roles (state.role):
// "cab" = the cabin root: doors (kinematic leaf children), the ride, the fall, the indicator;
// "panel" = the button plate inside: E opens its buttons, a button writes a request onto the cabin.
// Floor n rides to ELEVATORS[n % 5] (never the one you're in). 13, 66, 382 ask first, then kill. B goes to the Boiler Room.
import { heard } from "./lib/hear.js";
import { ELEVATORS } from "./lib/level5.js";
import { animate } from "builtin/tween";
import E from "./lib/data/l5-elevator.json";
const DEADLY = new Set(E.deadly);
const fwd = (yaw) => { const r = yaw * Math.PI / 180; return { x: -Math.sin(r), z: -Math.cos(r) }; };
function local(c, p) { // a world point in the cabin's frame: x right, z back
  const r = (c.state.yaw ?? 0) * Math.PI / 180, dx = p.x - c.state.cx, dz = p.z - c.state.cz;
  return { x: dx * Math.cos(r) - dz * Math.sin(r), z: dx * Math.sin(r) + dz * Math.cos(r) };
}
const inside = (c, p) => { const l = local(c, p); return Math.abs(l.x) < 0.92 && l.z > -0.98 && l.z < 0.95 && Math.abs((p.y ?? 0)) < 1.5; };
const sfx = (ctx, k, pos, vol = 0.6, pitch = 1) => heard(ctx, { clip: E.sfx[k], position: pos, volume: vol, pitch, refDistance: 3, maxDistance: 30 });
function cabOf(ctx, idx) { return ctx.getObject(ELEVATORS[idx].id); }
export function destIndex(floor, from) {
  if (floor === "B") return from === 4 ? 0 : 4;
  let i = Number(floor) % ELEVATORS.length; if (i === from) i = (i + 1) % ELEVATORS.length; return i;
}
function setDoors(ctx, c, open) {
  if (!!c.state.open === open) return;
  c.state.open = open;
  const st = c.state.style, o = c.state.kids ?? {};
  for (const [k, s] of [["leafL", -1], ["leafR", 1]]) {
    const h = o[k] && ctx.getObject(o[k]); if (!h) continue;
    const props = { "feetPosition.x": open ? s * 0.8 : s * 0.29 };
    if (st !== "modern") props["scale.x"] = open ? 0.4 : 1; // a scissor gate folds as it slides
    animate(ctx, h, props, { duration: st === "freight" ? 1.1 : 0.8, easing: "easeInOutQuad" });
  }
  const at = { x: c.state.cx, y: 1.2, z: c.state.cz };
  sfx(ctx, st === "modern" ? "doors" : "gate", at, 0.55, st === "freight" ? 0.8 : 1);
  if (open) sfx(ctx, "chime", at, 0.5, st === "freight" ? 0.7 : 1);
}
function setFloor(ctx, c, f) { c.state.floor = f; const i = c.state.kids?.ind && ctx.getObject(c.state.kids.ind); if (i) i.state.floor = f; }
function setLamp(ctx, c, on) { const l = c.state.kids?.lamp && ctx.getObject(c.state.kids.lamp); if (l && l.light) l.light = { ...l.light, intensity: on ? (c.state.lampI ?? 3) : 0 }; }
function panelOf(ctx, c) { return c.state.kids?.panel && ctx.getObject(c.state.kids.panel); }
function closePanel(ctx, c) { const p = panelOf(ctx, c); if (p) { p.state.closed = true; p.state.ready = false; p.state.shut = true; p.state.noconfirm = true; p.state.pending = null; } }
function cabUpdate(ctx) {
  const c = ctx.self, s = c.state, now = ctx.now(), players = ctx.place.players;
  if (s.cx == null) return;
  const f = fwd(s.yaw), door = { x: s.cx + f.x * 1.0, z: s.cz + f.z * 1.0 };
  // a request from the panel
  if (s.req && s.phase !== "ride" && s.phase !== "fall") {
    const r = s.req; s.req = null;
    const riders = players.filter((p) => inside(c, p.feetPosition)).map((p) => p.id);
    for (const o of ctx.query({ tags: ["l5-rider"], center: { x: s.cx, y: 0, z: s.cz }, radius: 1.5 })) if (inside(c, o.feetPosition)) riders.push(o.id);
    if (!riders.length && r.by) riders.push(r.by);
    s.riders = riders; s.goTo = r.floor; s.t0 = now; s.step = 0;
    s.phase = DEADLY.has(r.floor) ? "fall" : "ride";
    closePanel(ctx, c); setDoors(ctx, c, false);
  }
  if (s.phase === "ride") {
    const t = now - s.t0, freight = s.style === "freight";
    if (s.step === 0 && t > E.closeMs) {
      s.step = 1; sfx(ctx, freight ? "grind" : "hum", { x: s.cx, y: 1.5, z: s.cz }, 0.7);
      for (const id of s.riders) ctx.emit("screenShake", { intensity: freight ? 0.9 : 0.18, duration: E.rideMs / 1000 }, { audience: { player: id } });
      setFloor(ctx, c, "·");
    }
    if (s.step === 1 && t > E.closeMs + E.rideMs) {
      s.step = 2;
      const di = destIndex(s.goTo, s.idx), d = cabOf(ctx, di);
      for (const id of s.riders) {
        const p = players.find((q) => q.id === id) ?? ctx.getObject(id); if (!p) continue;
        ctx.emit("screenFlash", { color: "#fff6dc", duration: 0.5, intensity: 0.9 }, { audience: { player: id } });
        if (freight && ctx.random() < E.freightDropChance) { // the old cable lets go
          p.feetPosition = { x: E.dropTo.x + (ctx.random() - 0.5), y: 0.1, z: E.dropTo.z + (ctx.random() - 0.5) }; p.velocity = { x: 0, y: -4, z: 0 };
          p.state.hp = Math.max(0, (p.state.hp ?? 100) - E.freightDropDamage);
          p.state.notice = { text: `The freight lift dropped. You landed in the lobby (-${E.freightDropDamage} HP)`, at: now };
          ctx.emit("screenShake", { intensity: 1.2, duration: 0.6 }, { audience: { player: id } });
          continue;
        }
        if (!d) continue;
        const df = fwd(d.state.yaw), j = (s.riders.indexOf(id) % 3 - 1) * 0.45;
        const rr = (d.state.yaw ?? 0) * Math.PI / 180;
        p.feetPosition = { x: d.state.cx + Math.cos(rr) * j + Math.sin(rr) * 0.25, y: 0.08, z: d.state.cz - Math.sin(rr) * j + Math.cos(rr) * 0.25 };
        p.velocity = { x: 0, y: 0, z: 0 };
        p.state.notice = { text: `Floor ${s.goTo} · ${ELEVATORS[di].name}`, at: now };
        void df;
      }
      if (d) { setFloor(ctx, d, s.goTo); d.state.holdOpen = now + 4000; setDoors(ctx, d, true); }
      s.lastRide = { floor: s.goTo, to: di, riders: s.riders, at: now };
      setFloor(ctx, c, s.home ?? "5"); s.phase = "idle"; s.riders = null;
    }
  } else if (s.phase === "fall") {
    const t = now - s.t0;
    if (s.step === 0 && t > E.closeMs) {
      s.step = 1; setLamp(ctx, c, false); setFloor(ctx, c, s.goTo); sfx(ctx, "fall", { x: s.cx, y: 1.5, z: s.cz }, 0.9);
      for (const id of s.riders) { ctx.emit("screenFlash", { color: "#000000", duration: E.fallMs / 1000, intensity: 0.95 }, { audience: { player: id } }); ctx.emit("screenShake", { intensity: 0.6, duration: E.fallMs / 1000 }, { audience: { player: id } }); }
    }
    if (s.step === 1 && t > E.closeMs + E.fallMs) {
      s.step = 2;
      for (const id of s.riders) { const p = players.find((q) => q.id === id) ?? ctx.getObject(id); if (!p) continue; p.state.hp = 0; p.state.notice = { text: "You took the elevator past floor 12.", at: now }; }
      s.lastFall = { floor: s.goTo, riders: s.riders, at: now };
      setLamp(ctx, c, true); setFloor(ctx, c, s.home ?? "5"); s.phase = "idle"; s.riders = null;
    }
  } else {
    // idle: doors open while anyone stands at them, inside or out
    let near = false;
    for (const p of players) { const dx = p.feetPosition.x - door.x, dz = p.feetPosition.z - door.z; if (dx * dx + dz * dz < E.openRadius * E.openRadius || inside(c, p.feetPosition)) { near = true; break; } }
    if (now < (s.holdOpen ?? 0)) near = true;
    if (near !== !!s.open) { if (near) setDoors(ctx, c, true); else if (now - (s.lastNear ?? 0) > 1500) setDoors(ctx, c, false); }
    if (near) s.lastNear = now;
    const p = panelOf(ctx, c); if (p && !p.state.closed && now - (p.state.openAt ?? 0) > E.panelOpenMs) closePanel(ctx, c);
  }
}
// ---- the panel
function cab(ctx) { return ctx.getObject(ctx.self.state.cab); }
function pick(ctx, floor, by) {
  const p = ctx.self, c = cab(ctx); if (!c || p.state.closed) return;
  heard(ctx, { maxDistance: 8, refDistance: 1.5, clip: E.sfx.button, position: p.worldFeetPosition, volume: 0.5 });
  p.state.lastBy = by; p.state.lastPress = floor;
  if (DEADLY.has(floor)) { p.state.pending = floor; p.state.noconfirm = false; p.state.shut = true; return; }
  c.state.req = { floor, by };
}
export const ears = {
  press: (ctx, { by }) => {
    if (ctx.self.state.role !== "panel") return;
    const p = ctx.self.state; p.closed = false; p.ready = true; p.shut = false; p.noconfirm = true; p.pending = null; p.openAt = ctx.now();
    heard(ctx, { maxDistance: 8, refDistance: 1.5, clip: E.sfx.button, position: ctx.self.worldFeetPosition, volume: 0.4, pitch: 0.8 });
  },
  "ui:yes": (ctx, { by }) => { const p = ctx.self.state, c = cab(ctx); if (!p.pending || !c) return; c.state.req = { floor: p.pending, by }; p.pending = null; p.noconfirm = true; },
  "ui:no": (ctx) => { const p = ctx.self.state; p.pending = null; p.noconfirm = true; p.shut = false; },
};
for (const f of E.floors) ears["ui:f" + f] = (ctx, { by }) => pick(ctx, f, by);
export function update(ctx) {
  if (ctx.self.state.role === "cab") cabUpdate(ctx);
  else ctx.sleep();
}
