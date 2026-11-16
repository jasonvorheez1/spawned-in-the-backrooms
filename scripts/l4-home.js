// Level 4's things you press (state.kind): an office's door plate (claim it: it's your home; then its brass IN/OUT slider
// is your desk lamp's switch, and anyone else's press is a knock the owner hears), your office's water cooler
// (the bottling game: E starts the fill, E again stops it; stop in the band and you keep a bottle; anyone else gets a
// paper cone), the open floor's fountains, the break room's vending machines, the chained stairwell to Level 5.
import { notify } from "./lib/notify.js";
import { heard } from "./lib/hear.js";
import { carryAcross } from "./lib/carry.js";
import { setStep61 } from "./lib/level61-quests.js";
import { animate } from "builtin/tween";
import { hands } from "./desk-item.js";
import { canCarryAll } from "./lib/stats.js";
import { queuePayout } from "./lib/quests.js";
import { itemSpec } from "./lib/vend-item.js";
import { maxSan } from "./player.js";
export { handsOff } from "./desk-item.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const BAND = [82, 96], JUGS = 3, REFILL = 120000; // her pick: a jug back every 2 minutes, three on the shelf
const CONE = { thirst: 8, every: 90000 }, FOUNT = { thirst: 30, san: 6, every: 45000 }, KNOCK_EVERY = 6000;
const POUR = `fx
pop stream rate=?mobile:22|44 on=disc(.006) life=.14..0.20 v=<0,-.65,0> acc=grav() size=.008..0.013 col=<.78,.9,1> a=.68>0 sz=$size r=sprite(soft-disc,alpha,velocity,.018)`;
const GLUG = `fx
pop bub burst=10..16 on=disc(.09) life=.5..0.9 v=up(.5..0.9)+sdir()*.05 size=.012..0.03 acc=drag(1.2) col=<.85,.95,1> a=.8>0 sz=$size*(.6>1.2) r=sprite(soft-disc,add)`;
const ARC = `fx
pop jet rate=90 win=0;.9 life=.35..0.45 v=<0,.95,-.55>+sdir()*.04 acc=grav() size=.012..0.02 col=<.8,.92,1> a=.75>0 sz=$size r=sprite(soft-disc,alpha,velocity,.02)
pop mist burst=8 at=<0,.05,-.28> life=.3..0.6 v=sdir()*.2 size=.03..0.06 col=<.85,.95,1> a=.35>0 sz=$size r=sprite(soft-disc,alpha)`;
const FLOW_TICK = 0.08;
const say = (who, text, ctx) => notify(ctx, who, text); // scripts/lib/notify.js, shared
const snd = (ctx, clip, v = 0.6, y = 1) => heard(ctx, { clip: G(clip), position: { ...ctx.self.worldFeetPosition, y: (ctx.self.worldFeetPosition?.y ?? 0) + y }, volume: v, maxDistance: 12 });
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
const hash = (id) => [...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const yawOf = (o) => (typeof o.rotation === "number" ? o.rotation : o.rotation?.yaw ?? 0);
function near(ctx, p) {
  const a = p?.worldFeetPosition ?? p?.feetPosition, b = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
  return p?.state && !p.state.dead && a && b && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= 3;
}
function ready(ctx, key, every) { // one stamp per player per thing, on this thing's own session
  const m = (ctx.self.session.cd ??= {}), now = ctx.now();
  if (now < (m[key] ?? 0)) return false;
  m[key] = now + every; return true;
}
function jugs(ctx) { const s = ctx.self.state, now = ctx.now(); const add = Math.floor((now - (s.jugAt ?? 0)) / REFILL);
  if ((s.jugs ?? JUGS) < JUGS && add > 0) { s.jugs = Math.min(JUGS, (s.jugs ?? JUGS) + add); s.jugAt = (s.jugAt ?? 0) + add * REFILL; } return s.jugs ?? JUGS; }
function drawJug(ctx) {
  const count = jugs(ctx);
  if (count === JUGS) ctx.self.state.jugAt = ctx.now();
  ctx.self.state.jugs = Math.max(0, count - 1);
}
function glug(ctx, big = 1) { // the cooler's jug heaves and bubbles: its own glass, child-0
  const jug = ctx.self.id + "/child-0";
  if (ctx.getObject(jug)) animate(ctx, jug, { scale: [1, 1 + 0.05 * big, 0.97, 1.02, 1] }, { duration: 0.55, easing: "easeOutQuad" });
  const p = ctx.self.worldFeetPosition;
  ctx.emit("fx", { position: { x: p.x, y: p.y + 0.97, z: p.z }, script: GLUG });
}
function stopPour(ctx) {
  ctx.self.state.fillBy = null;
  ctx.self.state.fill = 0;
  for (const child of ["bottling-stream", "bottling-bottle"]) {
    const id = ctx.self.id + "/" + child;
    if (ctx.getObject(id)) ctx.destroy(id);
  }
}
function startPour(ctx) {
  const parent = ctx.self.id, bottle = itemSpec("almond");
  const id = ctx.spawn("bottling-bottle", {
    parent, ...bottle, feetPosition: { x: 0, y: 0.49, z: -0.265 }, castShadow: false,
    material: { ...bottle.material, opacity: 0.4 },
    children: [...bottle.children, {
      id: "water", feetPosition: { x: 0, y: 0.015, z: 0 },
      primitive: { kind: "cylinder", radiusTop: 0.023, radiusBottom: 0.025, height: 0.125 },
      material: { color: "#a6dbef", transparent: true, opacity: 0.72, roughness: 0.14 },
      scale: { x: 1, y: 0.025, z: 1 },
    }],
  });
  animate(ctx, id, { "feetPosition.y": [0.43, 0.49], "rotation.roll": [-9, 0] }, { duration: 0.28, easing: "easeOutQuad" });
  ctx.spawn("bottling-stream", { parent, feetPosition: { x: 0, y: 0.83, z: -0.265 }, fx: { script: POUR } });
}
function sip(ctx, who, n) { if (who?.state) who.state.thirst = Math.min(100, (who.state.thirst ?? 100) + n); }
const cotState = (id) => ({ kind: "field-rest", plate: id + "-plate", name: "Office cot", verb: "Rest", info: "For the person who claimed the office" });

export function wireOfficeCots(ctx) {
  for (const row of ctx.query({ tags: ["homekit"], center: { x: 0, y: 0, z: 0 }, radius: 120 })) {
    const o = ctx.getObject(row.id);
    if (!o || o.state.broke || o.state.kind === "field-rest") continue;
    const { width, depth } = o.primitive ?? {};
    const home = o.tags.find((tag) => tag.startsWith("home-"));
    if (!home || width !== 0.8 || depth !== 1.9) continue;
    Object.assign(o.state, cotState(home.slice(5)));
    o.tags = [...o.tags, "usable"];
    o.behavior = ["scripts/field-fixture.js"];
  }
}

const LAMP_ON = { kind: "point", color: "oklch(0.85 0.09 75)", intensity: 2.2, distance: 6 };
function homeKit(ctx, room, on) {
  for (const o of ctx.query({ tags: [`home-${room.id}`], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  if (!on) return;
  const k = room.kit, tag = ["homekit", `home-${room.id}`];
  ctx.spawn({ tags: [...tag, "usable"], behavior: "scripts/field-fixture.js", state: cotState(room.id), feetPosition: k.cot, rotation: { yaw: k.yaw }, physics: "static", primitive: { kind: "box", width: 0.8, height: 0.42, depth: 1.9 }, material: { color: "oklch(0.45 0.05 140)", roughness: 0.95 },
    children: [{ feetPosition: { x: 0, y: 0.42, z: -0.7 }, primitive: { kind: "box", width: 0.6, height: 0.12, depth: 0.35 }, material: { color: "oklch(0.9 0.01 90)" } },
      { feetPosition: { x: 0, y: 0.42, z: 0.25 }, primitive: { kind: "box", width: 0.78, height: 0.05, depth: 1.2 }, material: { color: "oklch(0.55 0.1 30)", roughness: 1 } }] });
  ctx.spawn(`${room.id}-desk`, { tags: tag, feetPosition: k.desk, rotation: { yaw: k.yaw }, physics: "static", primitive: { kind: "box", width: 1.4, height: 0.74, depth: 0.7 }, material: { color: "oklch(0.55 0.05 60)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.6 },
    children: [{ feetPosition: { x: 0.45, y: 0.74, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.09, height: 0.38 }, material: { color: "oklch(0.3 0.02 60)", metalness: 0.4 } },
      { id: "lamp", feetPosition: { x: 0.45, y: 1.08, z: 0 }, primitive: { kind: "cone", radius: 0.14, height: 0.14 }, material: { color: "oklch(0.85 0.08 85)", emissive: "oklch(0.85 0.1 80)", emissiveIntensity: 1.5 }, light: LAMP_ON }] });
}
function lamp(ctx, room, on) { // the IN/OUT slider is the desk lamp's switch
  const l = ctx.getObject(`${room.id}-desk/lamp`);
  if (!l) return;
  l.light = on ? LAMP_ON : null;
  l.material = { ...(l.material ?? {}), emissiveIntensity: on ? 1.5 : 0 };
}
function slide(ctx, inside) { // the brass tab rides its groove: left IN, right OUT
  const id = ctx.self.id + "/slide";
  if (ctx.getObject(id)) animate(ctx, id, { "feetPosition.x": inside ? -0.15 : 0.15 }, { duration: 0.16, easing: "easeOutQuad" });
}
function rattle(ctx, hard) {
  animate(ctx, ctx.self.id, { "rotation.roll": hard ? [0, 5, -4, 3, -1, 0] : [0, 2.5, -2, 0] }, { duration: hard ? 0.45 : 0.3, easing: "linear" });
}
function vendDrop(ctx, token) {
  const s = ctx.self.state;
  const id = ctx.spawn({ parent: ctx.self.id, feetPosition: { x: 0.12, y: 0.84, z: -0.22 }, castShadow: false, lifetime: 155, ...itemSpec(token) });
  s.tray = { id, token, readyAt: ctx.now() + 1250 };
  s.verb = "Check tray";
  animate(ctx, id, { "feetPosition.z": [-0.22, -0.44], "feetPosition.y": [0.84, 0.25], "rotation.roll": [0, 70] }, { duration: 1.25, easing: "easeInQuad" });
  ctx.after(1.25, "vendReady", { id });
}
export function vendReady(ctx, { id }) {
  const s = ctx.self.state;
  if (s.tray?.id !== id) return;
  s.verb = "Collect";
  snd(ctx, "vending-machine-clunk-item-drop", 0.7);
}
function collectTray(ctx, who) {
  const s = ctx.self.state, tray = s.tray;
  if (!tray) return false;
  if (!ctx.getObject(tray.id)) { s.tray = null; s.verb = "Push the button"; return false; }
  if (ctx.now() < tray.readyAt) return true; // still falling: you can watch it
  const check = canCarryAll(who.state, [...(who.state.payout?.items ?? []), tray.token]);
  if (!check.ok) { say(who, check.msg ?? "Your bag is full.", ctx); return true; }
  s.tray = null; s.verb = "Push the button";
  ctx.destroy(tray.id);
  snd(ctx, "vending-flap-door-swing-plastic", 0.5, 0.3);
  hands(ctx, who);
  queuePayout(who.state, { items: [tray.token], text: tray.token === "bar" ? "Granola bar · In your bag" : "Almond water · In your bag" });
  return true;
}
const FOUNT_LINE = [ // one voice per fountain, by its id
  "Water pressure of a dying man's handshake. Still tastes like almonds.",
  "Somebody stuck gum on the spout guard in 1994. It's still minty.",
  "The arc clears the drain by an inch. Every time. Somebody calibrated this.",
  "Cold enough to hurt your teeth. That's the good fountain.",
];
const VEND_DUD = [
  "The coil turns a full circle and gives you nothing. A hand on the far side of the glass gives you a thumbs-up.",
  "B4 is a Fresca can, unopened since the Carter administration. It won't let go of the coil.",
  "The machine takes your press, thinks it over, and keeps it.",
];

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), now = ctx.now(), uid = who?.userId ?? by;
    if (!near(ctx, who)) return;
    if (s.kind === "claim") {
      if (s.owner === uid) { // your own plate: the brass slider, IN and OUT, throws the desk lamp
        const inside = s.out === true; s.out = !inside;
        s.label2 = inside ? s.ownerName : `${s.ownerName} · OUT`; s.verb = inside ? "Slide to OUT" : "Slide to IN";
        slide(ctx, inside); lamp(ctx, s.room, inside); rattle(ctx, false);
        snd(ctx, inside ? "brass-slider-click-light-switch-on" : "brass-slider-click-light-switch-off", 0.55, 0);
        return;
      }
      if (s.owner) { // somebody else's: you knock, they hear it wherever they are on Level 4
        if (!ready(ctx, "knock", KNOCK_EVERY)) return;
        rattle(ctx, true); snd(ctx, "three-knocks-hollow-office-door", 0.75, 0);
        const host = ctx.place.players.find((p) => (p.userId ?? p.id) === s.owner);
        if (host && host.id !== by) say(host, `Knock at ${s.label}. ${who?.displayName ?? "Somebody"} is standing at your door.`, ctx);
        if (s.out) say(who, `The slider says OUT. ${s.ownerName} left the lamp off, too.`, ctx);
        return;
      }
      for (const p of ctx.query({ tags: ["l4-plate"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (p.state.owner === uid) { // one home each: the old one goes vacant
        p.state.owner = null; p.state.ownerName = null; p.state.out = false; p.state.label2 = "vacant"; p.state.verb = "Claim"; p.state.info = "Vacant office · make it your home"; homeKit(ctx, p.state.room, false);
        const old = ctx.getObject(p.id + "/slide"); if (old) old.feetPosition = { ...old.feetPosition, x: -0.15 }; }
      s.owner = uid; s.ownerName = who?.displayName ?? "someone"; s.out = false; s.label2 = s.ownerName; s.verb = "Slide to OUT"; s.info = `${s.ownerName}'s office · the slider works the lamp`;
      if (who) who.state.home = s.room.id;
      homeKit(ctx, s.room, true); slide(ctx, true);
      animate(ctx, ctx.self.id, { "rotation.pitch": [0, 360] }, { duration: 0.6, easing: "easeOutBack" }); // the plate turns over, your name on the back
      snd(ctx, "keys-jingle-door-unlock-click", 0.7, 0);
      say(who, `Office ${s.label} is yours. Cot, desk, a cooler with three jugs, and a lamp somebody already paid the bill on.`, ctx); return;
    }
    if (s.kind === "cooler") {
      const plate = ctx.getObject(s.plate), owner = plate?.state.owner;
      if (owner !== uid) { // not your cooler: one paper cone, one jug lighter
        if (s.fillBy && near(ctx, ctx.getObject(s.fillBy))) return;
        if (jugs(ctx) <= 0) { glug(ctx, 0.3); snd(ctx, "empty-water-jug-hollow-thunk", 0.5); return; }
        if (!ready(ctx, "cone:" + uid, CONE.every)) { glug(ctx, 0.3); snd(ctx, "paper-cup-crumple-small", 0.4); return; }
        drawJug(ctx); sip(who, CONE.thirst); glug(ctx); snd(ctx, "water-cooler-glug-bubbles", 0.6);
        if (owner) { const host = ctx.place.players.find((p) => (p.userId ?? p.id) === owner);
          if (host) say(host, `${who?.displayName ?? "Somebody"} drank from your cooler. One jug down.`, ctx);
          say(who, `A paper cone of ${plate.state.ownerName}'s water. Their name's on the jug in Sharpie. Thirst +${CONE.thirst}.`, ctx); }
        else say(who, `Paper cone, almond water, nobody's office. Thirst +${CONE.thirst}. Claim the plate by the door and the whole jug is yours.`, ctx);
        return;
      }
      if (s.fillBy && s.fillBy !== by && near(ctx, ctx.getObject(s.fillBy))) return;
      if (s.fillBy === by) { // the stop: judge where the line sits
        const f = s.fill ?? 0; stopPour(ctx); glug(ctx, 0.5);
        if (f >= BAND[0] && f <= BAND[1]) { const bonus = ((s.streak ?? 0) + 1) % 3 === 0 ? 1 : 0;
          const carry = canCarryAll(who.state, bonus ? ["almond:grey", "almond:grey"] : ["almond:grey"]);
          if (!carry.ok) { say(who, carry.msg ?? "Your bag is full.", ctx); return; }
          drawJug(ctx); s.streak = (s.streak ?? 0) + 1; who.state.almonds = (who.state.almonds ?? 0) + 1 + bonus;
          snd(ctx, "glass-bottle-cap-screw-tight", 0.7); say(who, bonus ? `Three clean fills running. The jug coughs up a spare. +2 almond water.` : `${Math.round(f)}%. Neck-high, no drips. +1 almond water.`, ctx); }
        else { s.streak = 0; snd(ctx, "water-pour-splash-short", 0.6); say(who, f < BAND[0] ? `${Math.round(f)}%. Nobody wants a bottle that sloshes. Back in the jug. Stop it between ${BAND[0]} and ${BAND[1]}.` : `${Math.round(f)}%. Brim-full and dribbling. Back in the jug.`, ctx); }
        return;
      }
      if (jugs(ctx) <= 0) { glug(ctx, 0.3); snd(ctx, "empty-water-jug-hollow-thunk", 0.5); say(who, "The jug's dry. The next one burps up in two minutes.", ctx); return; }
      stopPour(ctx);
      s.fillBy = by; s.rate = 38 + ctx.random() * 26; s.fillAt = now;
      s.flowRun = (s.flowRun ?? 0) + 1;
      hands(ctx, who); startPour(ctx); glug(ctx); snd(ctx, "water-cooler-glug-bubbles", 0.7);
      ctx.after(FLOW_TICK, "fillTick", { run: s.flowRun, then: now });
      return;
    }
    if (s.kind === "fountain") {
      const p = ctx.self.worldFeetPosition, yaw = yawOf(ctx.self), r = (yaw * Math.PI) / 180;
      const out = { x: p.x - Math.sin(r) * 0.12, y: p.y + 0.92, z: p.z - Math.cos(r) * 0.12 };
      ctx.emit("shake", { target: ctx.self.id, intensity: 0.03, duration: 0.25 });
      if (!ready(ctx, "drink:" + uid, FOUNT.every)) { // it still answers: a dribble that doesn't reach your mouth
        ctx.emit("fx", { position: out, script: GLUG }); snd(ctx, "drinking-fountain-sputter-air", 0.5); return; }
      ctx.emit("fx", { position: out, script: ARC, params: {} }); snd(ctx, "drinking-fountain-water-run", 0.6);
      if (who) { sip(who, FOUNT.thirst); who.state.sanity = Math.min(maxSan(who.state.level ?? 1, who.state), (who.state.sanity ?? 0) + FOUNT.san); }
      say(who, `${FOUNT_LINE[hash(ctx.self.id) % FOUNT_LINE.length]} Thirst +${FOUNT.thirst}.`, ctx); return;
    }
    if (s.kind === "vend") {
      ctx.emit("shake", { target: ctx.self.id, intensity: 0.05, duration: 0.3 });
      const glow = ctx.self.id + "/child-0";
      if (ctx.getObject(glow)) animate(ctx, glow, { "light.intensity": [1.2, 0.2, 1.6, 1.2] }, { duration: 0.4, easing: "linear" });
      if (collectTray(ctx, who)) return;
      if (who?.state?.l61GuildQ === 2 && !who.state.l61VendSurvey) {
        who.state.l61VendSurvey = 1;
        queuePayout(who.state, { xp: 25 });
        setStep61(ctx, who, "guild", 3, "Four Hundred and Thirteen · Logged Level 4's B4 vending drop · Return to Level 6.1 (Guild or M.E.G.)");
      }
      if (now < (s.next ?? 0)) { snd(ctx, "vending-machine-button-dead-click", 0.5); return; }
      s.next = now + 150000; snd(ctx, "vending-machine-spiral-coil-motor-turning-whir", 0.55); const r = ctx.random();
      if (r < 0.2) { say(who, "B4. The glass goes soft as bathwater and takes you in by the wrist. Somewhere, a fryer.", ctx); carryAcross(ctx, who, "level61#l61-from-l4"); ctx.cross(who, "level61#l61-from-l4"); return; } // Level 6.1's way in (wiki: any button on a Level 4 vending machine)
      if (r < 0.85) vendDrop(ctx, r < 0.45 ? "almond" : "bar");
      else say(who, pick(ctx, VEND_DUD), ctx);
      return;
    }
    if (s.kind === "stairs") {
      for (const c of ctx.query({ center: ctx.self.worldFeetPosition, radius: 0.7 })) { // the cut chain swings on its staple
        const o = ctx.getObject(c.id);
        if (o?.primitive?.width === 1.05) animate(ctx, c.id, { "rotation.roll": [o.rotation?.roll ?? 0, (o.rotation?.roll ?? 0) * -0.4, o.rotation?.roll ?? 0] }, { duration: 0.7, easing: "easeOutQuad" });
      }
      snd(ctx, "heavy-chain-rattle-on-metal-door", 0.7, 0);
      if (ready(ctx, "stairs:" + uid, 600000)) say(who, "Bolt-cut, clean through. Whoever went down to Level 5 didn't come back to say how it was.", ctx);
    }
  },
};
export function onSpawn(ctx) {
  if (ctx.self.state.kind === "cooler" && ctx.self.state.fillBy) stopPour(ctx);
}
export function fillTick(ctx, { run, then }) {
  const s = ctx.self.state;
  if (!s.fillBy || s.flowRun !== run) return;
  const filling = ctx.getObject(s.fillBy);
  if (!near(ctx, filling) || ctx.getObject(s.plate)?.state?.owner !== (filling.userId ?? filling.id)) {
    stopPour(ctx); return;
  }
  const now = ctx.now(), dt = Math.min(0.25, (now - then) / 1000);
  s.fill = Math.min(100, (s.fill ?? 0) + s.rate * dt * (0.75 + 0.5 * Math.sin((now - s.fillAt) / 180)));
  const water = ctx.getObject(ctx.self.id + "/bottling-bottle/water");
  if (water) water.scale = { x: 1, y: Math.max(0.025, s.fill / 100), z: 1 };
  if (s.fill >= 100) { const who = filling; stopPour(ctx); s.streak = 0; drawJug(ctx);
    heard(ctx, { clip: G("water-splash-spill-on-carpet"), position: { ...ctx.self.worldFeetPosition, y: 0.5 }, volume: 0.7, maxDistance: 12 });
    say(who, "Over the top and onto the carpet. The carpet was already wet. The jug's gone.", ctx); return; }
  ctx.after(FLOW_TICK, "fillTick", { run, then: now });
}
export const updateSchedule = { every: 3 };
export function update(ctx) {
  if (ctx.self.state.kind !== "cooler") return ctx.sleep();
  jugs(ctx);
  return ctx.sleep(10);
}
