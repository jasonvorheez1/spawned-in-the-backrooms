// Level 69: your car. One dynamic hull on four sprung wheels (a ray per wheel), front-wheel drive, no fuel tank at all.
// E at the door climbs in, W/S gas and brake/reverse, A/D steer, SPACE handbrake, F headlights, click horn, E steps out.
// Shelter: while you sit in it, the Beings From Above and the Whispers lose you (places/level69/sim.js reads state.driver).
// Condition: state.hp 0..100 and state.faults (rolled once when the car is made: a dead headlight, a pulling wheel,
// a dash that flickers). A hard crash costs hp; under 25 it pulls and coughs, at 0 it dies where it stands.
// Numbers are Savi's picks, tuned at gravity -24 beside the Level 11 911 (scripts/level11-porsche.js).
import { add, sub, scale, dot, cross, length, rotate } from "builtin/vec3";
import { raycast } from "builtin/physics";
import { heard } from "./lib/hear.js";

const C = {
  mass: 300, com: 0.45,
  spring: 5000, damper: 700, rayTop: 0.75, rayLen: 1.1, radius: 0.4,
  wheels: [
    { id: "fl", x: -0.9, z: -1.55, front: true }, { id: "fr", x: 0.9, z: -1.55, front: true },
    { id: "rl", x: -0.9, z: 1.45, front: false }, { id: "rr", x: 0.9, z: 1.45, front: false },
  ],
  engine: 2100, brake: 4000, reverseMax: 7, topSpeed: 33,
  grip: 1.0, rearGrip: 1.05, handbrakeGrip: 0.45, slipPeak: 2.0,
  steerMax: 30, steerFade: 14, steerRate: 6, drag: 1.6, roll: 24,
  gears: [0, 9, 16, 24, 33],
};
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const SFX = {
  door: G("car-door-open-and-shut-solid-thunk"), doorOut: G("car-door-close-heavy-thunk"),
  start: G("old-sedan-engine-crank-cough-and-start"), engine: G("old-sedan-engine-idle-loop-low-rumble"),
  horn: G("90s-car-horn-short-honk"), crash: G("car-crash-metal-crunch-impact"), skid: G("tire-screech-skid-short"),
  click: G("car-headlight-switch-click"), cough: G("old-car-engine-sputter-misfire-cough"), dead: G("car-engine-dies-and-ticks-cooling"),
};
const EXHAUST = `fx
pop exhaust rate=%r|0*20 on=disc(.06) life=.5..1 v=<0,.2,1.4>+sdir()*.25 size=.08..0.16 acc=drag(1.5)+buoy(.25) col=<.36,.36,.38> a=.3>0 sz=$size*(1>2.6) r=sprite(smoke-puff,alpha)`;
const SMOKE = `fx
pop smoke rate=%r|0*14 on=box(.8,.1,.4) life=1..2 v=up(1.2)+sdir()*.3 size=.3..0.5 acc=buoy(.4)+curl(.4)+drag(.8) col=<.2,.2,.22> a=0>.35:.4>.7:.2>0 sz=$size*(.6>2.4) r=sprite(smoke-puff,alpha)`;
const HELP = "W gas · S brake · A/D steer · SPACE handbrake · F headlights · CLICK horn · E get out";
const FAULTS = { headL: "Left headlight dead", pull: "Steering pulls right", dash: "Dash lights flicker", window: "Rear window cracked" };

const m = (ctx) => (ctx.self.session.c ??= { gas: 0, steerIn: 0, hand: false, steer: 0, pitch: 0, audAt: 0, skidAt: 0, hornAt: 0, fxR: -1, kmhAt: 0, coughAt: 0 });
const quat = (r) => (r && r.w !== undefined ? r : { yaw: typeof r === "number" ? r : r?.yaw ?? 0 });
const toWorld = (ctx, v) => add(ctx.self.feetPosition, rotate(quat(ctx.self.rotation), v));

export function lights(ctx) { // headlights and dash follow state: on, faults, dead
  const st = ctx.self.state, on = !!st.lights && (st.hp ?? 100) > 0;
  for (const [id, f] of [["hl-l", "headL"], ["hl-r", null]]) {
    const o = ctx.getObject(ctx.self.id + "/" + id); if (!o) continue;
    const ok = on && !(f && (st.faults ?? []).includes(f));
    o.light = { kind: "spot", color: "oklch(0.95 0.05 85)", intensity: ok ? 60 : 0, distance: 42, angle: 30, penumbra: 0.55, aim: "forward", shadow: { enabled: id === "hl-r" } };
  }
  const d = ctx.getObject(ctx.self.id + "/dash");
  if (d) d.light = { kind: "point", color: "oklch(0.75 0.12 200)", intensity: st.driver && (st.hp ?? 100) > 0 ? 0.6 : 0, distance: 1.6 };
}

export const ears = {
  press: (ctx, { by }) => {
    if (ctx.self.controller) return;
    ctx.self.controller = by; ctx.self.state.driver = by;
    heard(ctx, { clip: SFX.door, position: ctx.self.feetPosition, volume: 0.85, maxDistance: 20 });
    if ((ctx.self.state.hp ?? 100) > 0) ctx.after(0.6, "ignite", {});
    const p = ctx.getObject(by); if (p?.state) p.state.notice = { text: (ctx.self.state.hp ?? 100) > 0 ? HELP : "It won't turn over. Nothing left in it.", at: ctx.now() };
  },
};
export function ignite(ctx) {
  if (!ctx.self.controller || (ctx.self.state.hp ?? 100) <= 0) return;
  heard(ctx, { clip: SFX.start, position: ctx.self.feetPosition, volume: 0.9, maxDistance: 35 });
  ctx.self.audio = { clip: SFX.engine, loop: true, gain: 0.5, pitch: 0.8, spatial: true, maxDistance: 40 };
  lights(ctx);
}
export function onSpawn(ctx) {
  const st = ctx.self.state;
  if (!st.faults) { // the car you wake in is never new: one or two things wrong with it, never everything
    const keys = Object.keys(FAULTS), r = ctx.random();
    st.faults = [keys[Math.floor(r * keys.length)]]; if (ctx.random() < 0.4) { const k2 = keys[Math.floor(ctx.random() * keys.length)]; if (!st.faults.includes(k2)) st.faults.push(k2); }
  }
  st.hp ??= 100; st.lights ??= true;
  if (!st.parkedAt) { const f = ctx.self.feetPosition; st.parkedAt = { x: f.x, y: f.y, z: f.z }; }
  lights(ctx);
}
export function onControlBegin() { return true; }
export function onControlEnd(ctx) {
  const s = m(ctx); s.gas = 0; s.steerIn = 0; s.hand = false;
  heard(ctx, { clip: SFX.doorOut, position: ctx.self.feetPosition, volume: 0.8, maxDistance: 20 });
  ctx.self.state.driver = null; ctx.self.state.kmh = 0; ctx.self.state.outAt = ctx.now();
  ctx.self.audio = null; lights(ctx);
}
export function onInput(ctx, input) {
  const s = m(ctx), st = ctx.self.state;
  s.gas = input.axes?.moveZ ?? 0; s.steerIn = -(input.axes?.moveX ?? 0); s.hand = !!input.held?.jump;
  if (input.pressed?.attack && ctx.now() - s.hornAt > 400) { s.hornAt = ctx.now(); heard(ctx, { clip: SFX.horn, position: ctx.self.feetPosition, volume: 1, maxDistance: 70 }); }
  if (input.pressed?.flashlight) { st.lights = !st.lights; heard(ctx, { clip: SFX.click, position: ctx.self.feetPosition, volume: 0.5, maxDistance: 6 }); lights(ctx); }
  if (input.pressed?.interact) ctx.self.controller = null;
}
export function onCollide(ctx, other, contact) {
  const j = contact?.impulse ?? 0; if (j < 900) return;
  const st = ctx.self.state, before = st.hp ?? 100;
  st.hp = Math.max(0, before - Math.round(Math.min(45, (j - 900) / 120)));
  heard(ctx, { clip: SFX.crash, position: contact.position ?? ctx.self.feetPosition, volume: Math.min(1, j / 3000), maxDistance: 40 });
  if (ctx.self.controller) {
    ctx.emit("screenShake", { intensity: Math.min(0.6, j / 5000), duration: 0.3 }, { audience: { player: ctx.self.controller } });
    const p = ctx.getObject(ctx.self.controller); if (p?.state && j > 2500) p.state.hp -= Math.round((j - 2500) / 300); // a bad one hurts you too
  }
  if (j > 2600 && !(st.faults ?? []).includes("window")) st.faults = [...(st.faults ?? []), "window"];
  if (before > 0 && st.hp <= 0) { heard(ctx, { clip: SFX.dead, position: ctx.self.feetPosition, volume: 0.9, maxDistance: 30 }); ctx.self.audio = null; lights(ctx); }
}
export function update(ctx, dt) {
  const car = ctx.self, s = m(ctx), st = car.state, q = quat(car.rotation), driving = !!car.controller, alive = (st.hp ?? 100) > 0;
  const up = rotate(q, { x: 0, y: 1, z: 0 }), fwd = rotate(q, { x: 0, y: 0, z: -1 }), right = rotate(q, { x: 1, y: 0, z: 0 });
  const v = car.velocity ?? { x: 0, y: 0, z: 0 }, w = car.angularVelocity ?? { x: 0, y: 0, z: 0 };
  const com = toWorld(ctx, { x: 0, y: C.com, z: 0 }), vf = dot(v, fwd), spd = Math.abs(vf), now = ctx.now();
  const weak = alive && st.hp < 25, pull = (st.faults ?? []).includes("pull") ? -0.07 : 0;
  const lock = C.steerMax / (1 + spd / C.steerFade);
  s.steer += (((driving ? s.steerIn : 0) + (spd > 2 ? pull : 0)) * lock - s.steer) * Math.min(1, dt * C.steerRate);
  let drive = 0, brake = 0, top = weak ? C.topSpeed * 0.55 : C.topSpeed;
  if (driving) {
    if (s.gas > 0) { if (vf < -0.8) brake = C.brake; else drive = alive && vf < top ? C.engine * s.gas : 0; }
    else if (s.gas < 0) { if (vf > 0.8) brake = C.brake; else drive = alive && vf > -C.reverseMax ? C.engine * 0.6 * s.gas : 0; }
    if (weak && drive && now - s.coughAt > 2500 && ctx.random() < 0.02) { s.coughAt = now; heard(ctx, { clip: SFX.cough, position: car.feetPosition, volume: 0.8, maxDistance: 30 }); }
    if (weak && now - s.coughAt < 400) drive = 0;
  }
  const parked = !driving;
  let touching = 0, skidding = false;
  for (const wh of C.wheels) {
    const key = "w" + wh.id, origin = toWorld(ctx, { x: wh.x, y: C.rayTop, z: wh.z });
    const r = raycast(ctx, origin, scale(up, -1), { distance: C.rayLen, physicsOnly: true, ignoreEntities: [car.id] });
    if (!r) { car.forces[key] = null; continue; }
    touching++;
    const compress = C.rayLen - r.distance, pv = add(v, cross(w, sub(origin, com)));
    const load = Math.max(0, C.spring * compress - C.damper * dot(pv, up));
    let F = scale(r.normal ?? up, load);
    const a = (wh.front ? s.steer : 0) * Math.PI / 180;
    const wf = add(scale(fwd, Math.cos(a)), scale(right, -Math.sin(a))), wr = add(scale(right, Math.cos(a)), scale(fwd, Math.sin(a)));
    const grip = (wh.front ? C.grip : (s.hand ? C.handbrakeGrip : C.rearGrip)) * load;
    const lat = dot(pv, wr), lon = dot(pv, wf);
    const side = -Math.max(-1, Math.min(1, lat / C.slipPeak)) * grip;
    if (Math.abs(lat) > 4.5 && spd > 6) skidding = true;
    let along = 0;
    if (wh.front && drive) along += drive / 2;
    if (brake) along -= Math.sign(lon) * brake / 4;
    if (s.hand && !wh.front) along -= Math.sign(lon) * Math.min(Math.abs(lon) * 400, C.brake / 3);
    if (parked) along -= Math.max(-1, Math.min(1, lon)) * 0.3 * grip;
    along = Math.max(-grip, Math.min(grip, along));
    F = add(F, add(scale(wr, side), scale(wf, along)));
    const contact = sub(origin, scale(up, r.distance));
    car.forces[key] = { force: F, position: add(contact, scale(up, 0.7 * dot(sub(com, contact), up))) };
  }
  const vv = length(v);
  car.forces.drag = vv > 0.05 ? { force: scale(v, -(C.drag * vv + (touching ? C.roll : 0))) } : null;
  if (skidding && now - s.skidAt > 900) { s.skidAt = now; heard(ctx, { clip: SFX.skid, position: car.feetPosition, volume: 0.7, maxDistance: 40 }); }
  if (driving && alive) {
    let g = 1; while (g < C.gears.length - 1 && spd > C.gears[g]) g++;
    const lo = C.gears[g - 1], hi = C.gears[g], frac = Math.min(1, (spd - lo) / Math.max(1, hi - lo));
    const pitch = 0.7 + frac * 0.6 + (s.gas !== 0 ? 0.05 : 0);
    if (Math.abs(pitch - s.pitch) > 0.04 && now - s.audAt > 160 && car.audio) { s.pitch = pitch; s.audAt = now; car.audio = { ...car.audio, pitch, gain: 0.42 + Math.abs(s.gas) * 0.22 }; }
    if (now - s.kmhAt > 250) { s.kmhAt = now; const k = Math.round(spd * 3.6); if (k !== st.kmh) st.kmh = k; if (st.odo == null || Math.abs((st.odoZ ?? 0) - car.feetPosition.z) > 20) { st.odo = Math.round(Math.max(st.odo ?? 0, -car.feetPosition.z)); st.odoZ = car.feetPosition.z; } }
    if ((st.faults ?? []).includes("dash") && ctx.random() < 0.01) { const d = ctx.getObject(car.id + "/dash"); if (d) { d.light = { ...(d.light ?? {}), kind: "point", intensity: 0 }; ctx.after(0.15, "lights", {}); } }
  }
  const fxR = !alive ? 0.6 : driving ? (Math.abs(s.gas) > 0.1 ? 1 : 0.3) : 0, smoking = alive && st.hp < 25;
  const fk = fxR + (smoking ? 10 : 0) + (!alive ? 20 : 0);
  if (fk !== s.fxR) { s.fxR = fk; car.fx = !alive || smoking ? { script: SMOKE, params: { r: !alive ? 0.5 : 1 } } : fxR ? { script: EXHAUST, params: { r: fxR } } : null; }
  if (parked && vv < 0.05 && touching === 4) ctx.sleep(0.5);
}
export function onOutOfBounds(ctx) {
  const h = ctx.self.state.parkedAt; if (!h) return true;
  ctx.self.velocity = { x: 0, y: 0, z: 0 }; ctx.self.feetPosition = { x: h.x, y: h.y + 0.5, z: h.z }; return false;
}
