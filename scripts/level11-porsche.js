import { animate } from "builtin/tween";
// Level 11: the 1995 Porsche 911 Carrera RS. A real car: one dynamic hull on four sprung wheels (a ray per wheel),
// rear-wheel drive, grip that runs out if you throw it, brakes, a handbrake, and the driver sitting inside it.
// E at the door climbs in (door, then the flat-six turns over), W/S gas and brake/reverse, A/D steer, SPACE handbrake,
// left-click horn, E again steps out beside the driver's door. Numbers are Savi's picks (Nov 8), tuned at gravity -24.
import { add, sub, scale, dot, cross, length, rotate } from "builtin/vec3";
import { heard } from "./lib/hear.js";

const C = {
  mass: 300, com: 0.45,                 // kg, centre of mass height (m above the feet)
  spring: 5000, damper: 700, rayTop: 0.75, rayLen: 1.11, radius: 0.43, // per corner; rests the tyres on the road
  wheels: [ // x (left -), z (nose is -z); front pair steers, rear pair drives
    { id: "fl", x: -0.95, z: -1.7, front: true }, { id: "fr", x: 0.95, z: -1.7, front: true },
    { id: "rl", x: -0.95, z: 1.36, front: false }, { id: "rr", x: 0.95, z: 1.36, front: false },
  ],
  engine: 2600, brake: 4200, reverseMax: 8, topSpeed: 40, // N total drive, N total brake, m/s
  grip: 1.0, rearGrip: 1.08, handbrakeGrip: 0.45, slipPeak: 2.0,
  steerMax: 32, steerFade: 14, steerRate: 6,  // degrees, m/s at which lock halves, smoothing /s
  drag: 1.55, roll: 22,
  gears: [0, 11, 19, 28, 40],          // m/s where each gear tops out
  seat: { x: -0.48, y: 0.32, z: 0.25 }, exit: { x: -1.8, y: 0.15, z: 0.25 },
};
const SFX = {
  door: "/cdn/moodboard-realistic-gritty/sfx-car-door-open-and-shut-solid-thunk.mp3",
  doorOut: "/cdn/moodboard-realistic-gritty/sfx-car-door-close-heavy-thunk.mp3",
  start: "/cdn/moodboard-realistic-gritty/sfx-sports-car-flat-six-engine-crank-and-start.mp3",
  engine: "/cdn/moodboard-realistic-gritty/sfx-sports-car-flat-six-engine-idle-loop.mp3",
  horn: "/cdn/moodboard-realistic-gritty/sfx-90s-car-horn-short-honk.mp3",
  crash: "/cdn/moodboard-realistic-gritty/sfx-car-crash-metal-crunch-impact.mp3",
  skid: "/cdn/moodboard-realistic-gritty/sfx-tire-screech-skid-short.mp3",
};
const EXHAUST = `fx
pop exhaust rate=%r|0*22 on=disc(.06) life=.4..0.9 v=<0,.2,1.6>+sdir()*.25 size=.08..0.16 acc=drag(1.5)+buoy(.25) col=<.42,.42,.44> a=.35>0 sz=$size*(1>2.6) r=sprite(smoke-puff,alpha)`;
const HELP = "W gas · S brake/reverse · A/D steer · SPACE handbrake · CLICK horn · E step out";

const m = (ctx) => (ctx.self.session.p ??= { gas: 0, steerIn: 0, hand: false, steer: 0, pitch: 0, audAt: 0, skidAt: 0, hornAt: 0, fxR: -1, kmhAt: 0 });
const quat = (r) => (r && r.w !== undefined ? r : { yaw: typeof r === "number" ? r : r?.yaw ?? 0 });
const toWorld = (ctx, v) => add(ctx.self.feetPosition, rotate(quat(ctx.self.rotation), v));

function seat(ctx, id) {
  const p = ctx.getObject(id); if (!p) return;
  p.parent = ctx.self.id; p.feetPosition = { ...C.seat }; p.rotation = { yaw: 0 }; // parent first, then seat-local feet
}
function stepOut(ctx, id) {
  const p = ctx.getObject(id); if (!p) return;
  const out = toWorld(ctx, C.exit);
  p.parent = null; p.feetPosition = out;
  p.velocity = { x: 0, y: 0, z: 0 };
  heard(ctx, { clip: SFX.doorOut, position: out, volume: 0.8, maxDistance: 20 });
}

export const ears = {
  press: (ctx, { by }) => {
    if (ctx.self.controller) return; // one driver
    if (!sell(ctx, by)) return; // a car on the lot is bought before it's driven
    ctx.self.controller = by;
    ctx.self.state.driver = by;
    dip(ctx, 0.07); // the springs take a body's weight
    const pos = ctx.self.feetPosition;
    heard(ctx, { clip: SFX.door, position: pos, volume: 0.85, maxDistance: 20 });
    ctx.after(0.55, "ignite", {});
    const p = ctx.getObject(by); if (p?.state) p.state.notice = { text: HELP, at: ctx.now() };
  },
};
// Nov 12 (Shelly: buy the sedan at a dealer, then drive it). A car with state.price is for sale;
// what a player bought lives in their own save (player.state.cars), so it stays theirs in every room.
const CHACHING = "/cdn/moodboard-realistic-gritty/sfx-cash-register-cha-ching-bell-and-drawer.mp3";
const dollars = (c) => "$" + Math.round(c / 100).toLocaleString("en-US");
// the hull sinks on its springs when someone climbs in, and rocks when a buyer kicks the tyres
function dip(ctx, d) {
  const h = ctx.getObject(ctx.self.id + "/hull"); if (!h) return;
  const y = (ctx.self.session.hullY ??= h.feetPosition?.y ?? 0);
  animate(ctx, h, { "feetPosition.y": [y, y - d, y + d * 0.25, y] }, { duration: 0.5, easing: "easeOutQuad" });
}
function sell(ctx, by) {
  const st = ctx.self.state, price = st.price; if (!price) return true;
  const p = ctx.getObject(by); if (!p?.state) return false;
  const mine = (p.state.cars ?? []).includes(ctx.self.id);
  if (!mine && st.ownerId && st.ownerId !== p.userId) { p.state.notice = { text: `Sold. This one belongs to ${st.ownerName ?? "someone else"}.`, at: ctx.now() }; return false; }
  if (!mine) {
    if ((p.state.cents ?? 0) < price) { dip(ctx, 0.04); p.state.notice = { text: `${dollars(price)} Backdollars, as-is. You're ${dollars(price - (p.state.cents ?? 0))} short.`, at: ctx.now() }; return false; }
    p.state.cents -= price;
    p.state.cars = [...(p.state.cars ?? []), ctx.self.id];
    heard(ctx, { clip: CHACHING, position: ctx.self.feetPosition, volume: 0.9, maxDistance: 18 });
    ctx.emit("damageNumber", { position: { ...ctx.self.feetPosition, y: ctx.self.feetPosition.y + 2 }, text: `-${dollars(price)}`, color: "#9fcf8a" });
    p.state.notice = { text: `Bought. Keys were already in it. ${HELP}`, at: ctx.now() };
  }
  st.ownerId = p.userId; st.ownerName = p.displayName;
  st.verb = "Get in"; st.info = `Yours · ${st.blurb ?? ""}`.replace(/ · $/, "");
  if (!mine) return false; // the purchase is its own press: the next E climbs in
  return true;
}

export function ignite(ctx) {
  if (!ctx.self.controller) return;
  heard(ctx, { clip: SFX.start, position: ctx.self.feetPosition, volume: 0.9, maxDistance: 35 });
  ctx.self.audio = { clip: SFX.engine, loop: true, gain: 0.55, pitch: 0.75, spatial: true, maxDistance: 45 };
}

export function onControlBegin(ctx, player) { return true; }
export function onControlEnd(ctx, player) {
  const s = m(ctx); s.gas = 0; s.steerIn = 0; s.hand = false;
  heard(ctx, { clip: SFX.doorOut, position: ctx.self.feetPosition, volume: 0.8, maxDistance: 20 }); // the rider steps itself out (scripts/interact.js)
  ctx.self.state.driver = null; ctx.self.state.kmh = 0;
  ctx.self.audio = null;
}

export function onInput(ctx, input) {
  const s = m(ctx);
  s.gas = input.axes?.moveZ ?? 0; // W is moveZ +1
  s.steerIn = -(input.axes?.moveX ?? 0); // yaw is +left
  s.hand = !!input.held?.jump;
  if (input.pressed?.attack && ctx.now() - s.hornAt > 400) {
    s.hornAt = ctx.now();
    heard(ctx, { clip: SFX.horn, position: ctx.self.feetPosition, volume: 1, maxDistance: 70 });
  }
  if (input.pressed?.interact) {
    ctx.self.controller = null; // onControlEnd; the rider's own script steps it out
  }
}

export function onCollide(ctx, other, contact) {
  const j = contact?.impulse ?? 0;
  if (j < 900) return;
  heard(ctx, { clip: SFX.crash, position: contact.position ?? ctx.self.feetPosition, volume: Math.min(1, j / 3000), maxDistance: 40 });
  if (ctx.self.controller) ctx.emit("screenShake", { intensity: Math.min(0.6, j / 5000), duration: 0.3 }, { audience: { player: ctx.self.controller } });
}

export function update(ctx, dt) {
  const car = ctx.self, s = m(ctx), q = quat(car.rotation), driving = !!car.controller;
  const up = rotate(q, { x: 0, y: 1, z: 0 }), fwd = rotate(q, { x: 0, y: 0, z: -1 }), right = rotate(q, { x: 1, y: 0, z: 0 });
  const v = car.velocity ?? { x: 0, y: 0, z: 0 }, w = car.angularVelocity ?? { x: 0, y: 0, z: 0 };
  const com = toWorld(ctx, { x: 0, y: C.com, z: 0 });
  const vf = dot(v, fwd), spd = Math.abs(vf);

  // steering: eased from the key, lock fades with speed
  const lock = C.steerMax / (1 + spd / C.steerFade);
  s.steer += ((driving ? s.steerIn : 0) * lock - s.steer) * Math.min(1, dt * C.steerRate);

  // what the pedals ask
  let drive = 0, brake = 0;
  if (driving) {
    if (s.gas > 0) { if (vf < -0.8) brake = C.brake; else drive = vf < C.topSpeed ? C.engine * s.gas : 0; }
    else if (s.gas < 0) { if (vf > 0.8) brake = C.brake; else drive = vf > -C.reverseMax ? C.engine * 0.6 * s.gas : 0; }
  }
  const parked = !driving;

  let touching = 0, skidding = false;
  const rearContacts = C.wheels.filter((wh) => !wh.front).length;
  for (const wh of C.wheels) {
    const key = "w" + wh.id;
    const origin = toWorld(ctx, { x: wh.x, y: C.rayTop, z: wh.z });
    const r = rayDown(ctx, origin, up);
    if (!r) { car.forces[key] = null; continue; }
    touching++;
    const compress = C.rayLen - r.distance;
    const pv = add(v, cross(w, sub(origin, com)));
    const rate = -dot(pv, up);
    const load = Math.max(0, C.spring * compress + C.damper * rate);
    let F = scale(r.normal ?? up, load);

    // the wheel's own forward and side on this ground
    const a = (wh.front ? s.steer : 0) * Math.PI / 180;
    const wf = add(scale(fwd, Math.cos(a)), scale(right, -Math.sin(a)));
    const wr = add(scale(right, Math.cos(a)), scale(fwd, Math.sin(a)));
    const grip = (wh.front ? C.grip : (s.hand ? C.handbrakeGrip : C.rearGrip)) * load;
    const lat = dot(pv, wr), lon = dot(pv, wf);

    let side = -Math.max(-1, Math.min(1, lat / C.slipPeak)) * grip;
    if (Math.abs(lat) > 4.5 && spd > 6) skidding = true;
    let along = 0;
    if (!wh.front && drive) along += drive / rearContacts;
    if (brake) along -= Math.sign(lon) * brake / 4;
    if (s.hand && !wh.front) along -= Math.sign(lon) * Math.min(Math.abs(lon) * 400, C.brake / 3);
    if (parked) along -= Math.max(-1, Math.min(1, lon / 1)) * 0.3 * grip; // parking brake: it holds on a grade
    along = Math.max(-grip, Math.min(grip, along));

    F = add(F, add(scale(wr, side), scale(wf, along)));
    const contact = sub(origin, scale(up, r.distance));
    const lift = scale(up, 0.7 * dot(sub(com, contact), up));
    car.forces[key] = { force: F, position: add(contact, lift) };
  }
  // air and rolling drag
  const vv = length(v);
  car.forces.drag = vv > 0.05 ? { force: scale(v, -(C.drag * vv + (touching ? C.roll : 0))) } : null;

  const now = ctx.now();
  if (skidding && now - s.skidAt > 900) { s.skidAt = now; heard(ctx, { clip: SFX.skid, position: car.feetPosition, volume: 0.7, maxDistance: 40 }); }

  if (driving) {
    // the engine note: a 4-speed box, revs climb inside each gear
    let g = 1; while (g < C.gears.length - 1 && spd > C.gears[g]) g++;
    const lo = C.gears[g - 1], hi = C.gears[g], frac = Math.min(1, (spd - lo) / Math.max(1, hi - lo));
    const pitch = 0.72 + frac * 0.75 + (s.gas !== 0 ? 0.06 : 0);
    if (Math.abs(pitch - s.pitch) > 0.04 && now - s.audAt > 160 && car.audio) { s.pitch = pitch; s.audAt = now; car.audio = { ...car.audio, pitch, gain: 0.45 + Math.abs(s.gas) * 0.25 }; }
    if (now - s.kmhAt > 250) { s.kmhAt = now; const k = Math.round(spd * 3.6); if (k !== car.state.kmh) car.state.kmh = k; }
  }
  const fxR = driving ? (Math.abs(s.gas) > 0.1 ? 1 : 0.3) : 0;
  if (fxR !== s.fxR) { s.fxR = fxR; car.fx = fxR ? { script: EXHAUST, params: { r: fxR } } : null; }

  if (parked && vv < 0.05 && touching === 4) ctx.sleep(0.5);
}

import { raycast } from "builtin/physics";
function rayDown(ctx, origin, up) {
  return raycast(ctx, origin, scale(up, -1), { distance: C.rayLen, physicsOnly: true, ignoreEntities: [ctx.self.id] });
}

// a car that slips through the lot (ground not streamed yet) comes back to where it was parked
export function onOutOfBounds(ctx) {
  const h = ctx.self.state.parkedAt;
  if (!h) return true;
  ctx.self.velocity = { x: 0, y: 0, z: 0 };
  ctx.self.feetPosition = { x: h.x, y: h.y + 0.3, z: h.z };
  return false;
}
