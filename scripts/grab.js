// Z: pick up a breakable thing in front of you (never a wall) and carry it; Z again throws it along your look.
// Strength (the sheet's H) decides how heavy a thing you can lift and how hard it flies; a heavy load slows your walk
// (player.js reads state.carryMul). A thrown thing hurts what it hits: NPCs take damage and turn on you, props crack.
import { raycast } from "builtin/physics";
import { attrsOf } from "./lib/stats.js";
import { foeStats } from "./lib/knock.js";
import { arm, track, stepFlights, impact as looseImpact } from "./lib/loose.js";
import { damageEntity } from "./lib/breakables.js";
import { heard } from "./lib/hear.js";
import { isTray, TRAY_KG, CLATTER } from "./lib/snacktray.js";
const TRAY_PHYS = { body: "dynamic", collider: "box", mass: TRAY_KG, friction: 0.8, restitution: 0.1 };
// a Level 6.1 food tray set down along the look: on the table/counter/floor the look ray meets, it stays as a dynamic thing anyone can see and take
export function setDown(ctx, o) {
  const ses = ctx.self.session, s = ctx.self.state, f = ctx.self.feetPosition, d = ses.dir ?? { x: 0, y: -0.5, z: -1 };
  const eye = { x: f.x, y: f.y + 1.5, z: f.z }, ign = [ctx.self.id, o.id];
  let hit = raycast(ctx, eye, d, { distance: 2.4, ignoreEntities: ign });
  if (!hit || (hit.normal?.y ?? 0) < 0.6) { const hl = Math.hypot(d.x, d.z) || 1, fx = f.x + (d.x / hl) * 0.8, fz = f.z + (d.z / hl) * 0.8; hit = raycast(ctx, { x: fx, y: f.y + 1.4, z: fz }, { x: 0, y: -1, z: 0 }, { distance: 3, ignoreEntities: ign }) ?? { position: { x: fx, y: f.y, z: fz } }; }
  o.feetPosition = { x: hit.position.x, y: hit.position.y + 0.01, z: hit.position.z };
  const tray = isTray(o);
  o.physics = tray ? TRAY_PHYS : { body: "dynamic", collider: "box", mass: Math.max(0.3, ses.kg ?? 2), friction: 0.8, restitution: 0.05 }; o.velocity = { x: 0, y: 0, z: 0 };
  if (tray && !o.tags.includes("usable")) o.tags = [...o.tags, "usable"];
  if (o.tags.includes("homeprop") && ctx.self.place === "home11" && ctx.self.state.home11) { // your house remembers where you set it, on your own save
    const hs = ctx.place.state; hs.moved = { ...(hs.moved ?? {}), [o.id]: { p: { ...o.feetPosition }, yaw: o.rotation?.yaw ?? 0 } };
    ctx.self.state.homeKeep = { packed: hs.packed ?? {}, moved: hs.moved };
  }
  ses.held = null; s.carry = null; s.carryId = null; s.carryMul = 1; s.l61Hold = null; s.l61Tray = 0;
  heard(ctx, { clip: CLATTER, position: o.feetPosition, volume: 0.35, maxDistance: 10 });
}
const HOLD_MS = 350; // Savi's pick: shorter is a tap
const NOT = ["wall", "gridwall", "level0", "npc", "player", "critter", "door", "remains"];
const CAP = (h) => 12 + h * 9;        // base kg by Hardiness: 1 = 21 kg, 5 = 57, 10 = 102 (Savi's picks)
// what you can lift right now: Hardiness is the base, Endurance and Agility add leverage, and it shrinks when you're
// hurt, winded or already loaded (pack weight vs its limit). All factors Savi's picks.
function power(ctx) {
  const s = ctx.self.state, A = attrsOf(s), base = CAP(A.h ?? 5);
  const endu = 1 + ((A.e ?? 5) - 5) * 0.04, agi = 1 + ((A.a ?? 5) - 5) * 0.02;
  const hp = Math.max(0.35, Math.min(1, (s.hp ?? 100) / Math.max(1, s.maxHp ?? s.hpMax ?? s.hp ?? 100)));
  const st = ctx.self.session?.walk?.stamina ?? s.stamina, wind = st == null ? 1 : Math.max(0.5, Math.min(1, 0.5 + st / 200));
  const load = s.wg != null && s.wgMax ? Math.max(0.55, 1 - 0.45 * Math.min(1, s.wg / s.wgMax)) : 1;
  return base * endu * agi * hp * wind * load;
}
const note = (ctx, text) => { ctx.self.state.notice = { text, at: ctx.now() }; };
function look(ctx, input) {
  const sin = input?.axes?.aimYawSin ?? 0, cos = input?.axes?.aimYawCos ?? 1;
  let pc = ctx.self.camera?.rotation?.pitch ?? 0; if (Math.abs(pc) > 1.6) pc = pc * Math.PI / 180;
  const c = Math.cos(pc);
  return { x: -sin * c, y: Math.sin(pc), z: -cos * c };
}
// weight from its drawn size: a box of furniture at ~120 kg/m³ (chair ~30 kg, armchair ~70, dining table ~190, Savi's pick)
const massOf = (o) => { if (o.state?.carryKg) return o.state.carryKg; const b = o.bounds?.size; const box = b ? b.x * b.y * b.z : (o.measure?.volume ?? 0.05); return Math.max(2, box * 120, o.measure?.mass ?? 0); };
export function onInput(ctx, input) {
  const ses = ctx.self.session;
  if (input.axes) ses.dir = look(ctx, input);
  if (input.pressed?.interact && ses.held && !ctx.self.state.focus && !ctx.self.state.sit && !ctx.self.state.lootOpen) { const t = ctx.getObject(ses.held); if (isTray(t)) return setDown(ctx, t); } // E with nothing in focus sets a tray down
  const s = ctx.self.state, h = attrsOf(s).h ?? 5, held = ses.held && ctx.getObject(ses.held);
  if (held) { // in hands: a tap of Z sets it down where you look, a hold (past HOLD_MS) throws it
    if (input.pressed?.grab) ses.zDown = ctx.now();
    if (ses.zDown && input.held?.grab && ctx.now() - ses.zDown >= HOLD_MS) { ses.zDown = null; return toss(ctx, held, h); }
    if (ses.zDown && input.released?.grab) { const quick = ctx.now() - ses.zDown < HOLD_MS; ses.zDown = null; return quick ? setDown(ctx, held) : toss(ctx, held, h); }
    return;
  }
  if (ses.drag) { if (input.pressed?.grab) letGo(ctx); return; } // a body dragged: Z lets it go
  const foe = ses.heldFoe && ctx.getObject(ses.heldFoe);
  if (foe) { // a body in your arms: tap Z drops it at your feet, hold Z hurls it
    if (input.pressed?.grab) ses.zDown = ctx.now();
    if (ses.zDown && ((input.held?.grab && ctx.now() - ses.zDown >= HOLD_MS) || input.released?.grab)) { const quick = ctx.now() - ses.zDown < HOLD_MS; ses.zDown = null; return hurl(ctx, foe, quick); }
    return;
  }
  ses.heldFoe = null;
  if (!input.pressed?.grab) return;
  ses.held = null;
  if (grabFoe(ctx, input)) return;
  if (grabCorpse(ctx, input)) return;
  const f = ctx.self.feetPosition, eye = { x: f.x, y: f.y + 1.5, z: f.z }, d = ses.dir ?? look(ctx, input);
  const hit = raycast(ctx, eye, d, { distance: 2.6, ignoreEntities: [ctx.self.id] });
  let o = hit?.id && ctx.getObject(hit.id);
  const tiny = (x) => { const b = x?.bounds?.size; return b && b.x * b.y * b.z < 0.5 && Math.max(b.x, b.y, b.z) < 1.4; };
  if (hit && !tiny(o)) { // a plush on a bed or a bottle on a dresser sits inside the furniture's box: take the small thing nearest where the look landed
    let near = null, best = 0.6, P = hit.position;
    for (const id of Object.keys(ctx.place.objects)) { const x = ctx.place.objects[id], c = x?.bounds?.center; if (!c || id === ctx.self.id || x.parent || !tiny(x) || NOT.some((t) => x.tags?.includes(t))) continue; const d = Math.hypot(c.x - P.x, c.y - P.y, c.z - P.z); if (d < best) { best = d; near = x; } }
    if (near) o = near;
  }
  const sz = o?.bounds?.size, small = sz && sz.x * sz.y * sz.z < 0.5 && Math.max(sz.x, sz.y, sz.z) < 1.4; // a radio, a lamp, a bottle: anything small enough is fair game
  if (!o || !(o.tags?.includes("breakable") || small) || NOT.some((t) => o.tags.includes(t)) || o.parent || o.tags.includes("l5-elev-panel") || o.tags.includes("l5-sealed")) { note(ctx, "Nothing to pick up."); return; }
  if (!arm(o) && !o.tags.includes("breakable")) { o.tags = [...o.tags, "breakable"]; o.state.mat ??= "fixture"; o.state.hp ??= 30; o.state.maxHp ??= o.state.hp; } // picked up once, it can be smashed too
  const kg = massOf(o), cap = power(ctx);
  const over = kg / cap; // past 1 it's a struggle; past 3 nobody moves it
  if (over > 3) { note(ctx, `It won't budge. ${Math.round(kg)} kg.`); heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-strained-grunt-lifting-heavy.mp3", position: eye, volume: 0.5, maxDistance: 10 }); return; }
  ctx.self.anim.grab = { clip: "cdn/clip-pickup.glb", loop: "once", weight: 1, blendIn: 0.15, blendOut: 0.3 }; ctx.self.session.grabAnimEnd = ctx.now() + 1200;
  if (over > 1) { // the heave: a long strained lift before it leaves the floor
    ses.heave = { id: o.id, kg, until: ctx.now() + 900 + over * 700 };
    ctx.self.velocity = { x: 0, y: ctx.self.velocity?.y ?? 0, z: 0 }; s.carryMul = 0.05;
    note(ctx, `Heaving ${Math.round(kg)} kg...`);
    heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-strained-grunt-lifting-heavy.mp3", position: eye, volume: 0.7, maxDistance: 14 });
    ctx.emit("screenShake", { intensity: 0.15, duration: 0.9 }, { audience: { player: ctx.self.id } });
    return;
  }
  lift(ctx, o, kg, cap);
}
function lift(ctx, o, kg, cap) {
  const ses = ctx.self.session, s = ctx.self.state, f = ctx.self.feetPosition;
  spill(ctx, o);
  ses.held = o.id; ses.kg = kg; ses.phys = o.physics; o.physics = "none";
  if (isTray(o)) { s.l61Hold = o.id; s.l61Tray = ctx.now(); ses.phys = TRAY_PHYS; o.tags = o.tags.filter((t) => t !== "usable"); } // the tray is yours again: the return rack takes it
  s.carryId = o.id; // a tote reads what is in your hands
  s.carry = o.state?.name ?? "something"; s.carryMul = kg > cap ? Math.max(0.15, 0.4 - (kg / cap - 1) * 0.12) : Math.max(0.45, 1 - (kg / cap) * 0.6);
  heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-furniture-lift-wood-creak-scrape.mp3", position: { x: f.x, y: f.y + 1, z: f.z }, volume: 0.45, maxDistance: 12 });
}
function toss(ctx, o, h) {
  const ses = ctx.self.session, s = ctx.self.state, d = ses.dir ?? { x: 0, y: 0, z: -1 };
  const over = ses.kg / power(ctx), speed = over > 1 ? Math.max(1.5, 4 - over) : Math.max(3, Math.min(20, 3 + (power(ctx) / ses.kg) * 2.2)); // light things fly; past your strength it tips a few feet away
  ctx.self.anim.grab = { clip: "cdn/clip-ual-overhandthrow-ada55cac.glb", loop: "once", weight: 1, blendIn: 0.1, blendOut: 0.3 }; ctx.self.session.grabAnimEnd = ctx.now() + 1000;
  // weight over its size is its density: under water's 1000 kg/m³ it bobs back up, over it sinks (the engine floats a dynamic body by density in a sea, lake or river)
  const bs = o.bounds?.size, vol = bs ? Math.max(0.001, bs.x * bs.y * bs.z * 0.6) : null; // 0.6: a chair or a crate is mostly air inside its box
  o.physics = vol ? { body: "dynamic", collider: "box", density: Math.max(60, Math.min(8000, ses.kg / vol)), friction: 0.7 } : { body: "dynamic", collider: "box", mass: ses.kg, friction: 0.7 };
  o.velocity = { x: d.x * speed, y: d.y * speed + 2, z: d.z * speed };
  ses.flying = { id: o.id, at: ctx.now(), speed, kg: ses.kg, hit: {}, tray: isTray(o) };
  if (!isTray(o)) track(ctx, o, ses.kg); // lands hard: it breaks its own way (lib/loose.js)
  if (isTray(o)) { o.physics = TRAY_PHYS; s.l61Hold = null; s.l61Tray = 0; }
  ses.held = null; s.carry = null; s.carryId = null; s.carryMul = 1;
  const f = ctx.self.feetPosition;
  heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-object-throw-whoosh.mp3", position: { x: f.x, y: f.y + 1.4, z: f.z }, volume: 0.5, maxDistance: 14 });
}
// bodies: Z grabs any NPC or enemy in reach if your strength lifts it (heft x 12 kg against power()), hold Z throws it.
// Savi's picks: throw speed 4 + 7 x (power / kg, at most 1.6) + 0.6 per Agility past 5, launched 25 degrees up.
const BODIES = ["partygoer", "smiler", "lurker", "hound", "stealer", "l8spider", "l8-hostile", "npc", "entity", "l6-smiler"];
const HEFT = { partygoer: 6, hound: 4, smiler: 10, lurker: 8, stealer: 7, l8spider: 5, npc: 6, "l26-balloon": 1 };
const bodyKg = (o) => o.state?.carryKg ?? 12 * (Object.entries(HEFT).find(([t]) => o.tags?.includes(t))?.[1] ?? 6);
function grabFoe(ctx, input) {
  const ses = ctx.self.session, f = ctx.self.feetPosition, d = ses.dir ?? look(ctx, input), hl = Math.hypot(d.x, d.z) || 1;
  let e = null, bd = 2.2;
  for (const c of ctx.query({ anyTags: BODIES, radius: 2.6 })) {
    if (c.id === ctx.self.id || c.state?.dead || (c.state?.hp ?? 1) <= 0 || c.state?.heldBy) continue;
    const dx = c.feetPosition.x - f.x, dz = c.feetPosition.z - f.z, dist = Math.hypot(dx, dz);
    if (dist > bd || (dist > 0.4 && (dx * d.x + dz * d.z) / (dist * hl) < 0.5)) continue;
    bd = dist; e = c;
  }
  if (!e) return false;
  const S = ctx.self.state;
  if (!S.sheathed && S.equipped && S.equipped !== "fists") { note(ctx, "Holster your weapon (H) to grab."); return true; } // Shelly: hands free first
  const fs = foeStats(ctx, e), kg = fs.kg, cap = power(ctx);
  if (kg > cap * 1.25) { note(ctx, `Too heavy to lift (${Math.round(kg)} kg). More Hardiness.`); heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-straining-grunt-failed-lift.mp3", position: f, volume: 0.5, maxDistance: 10 }); return true; }
  const st = e.state; st.heldBy = ctx.self.id; st.heldAt = ctx.now(); st.down = null; st.kb = null; st.stunUntil = ctx.now() + 9000;
  ses.heldFoe = e.id; ses.foeKg = kg; ses.squirmed = false;
  ses.gripUntil = ctx.now() + 1000 * Math.max(0.8, Math.min(6, 1.5 + 3 * (cap / kg - 0.6) - (fs.h + fs.a - 10) * 0.15)); // they squirm loose: a strong grip on a light body holds longest
  ctx.self.state.carryMul = Math.max(0.45, 1 - (kg / cap) * 0.5);
  ctx.self.anim.grab = { clip: "cdn/clip-pick-up.glb", loop: "once", weight: 1, blendIn: 0.1, blendOut: 0.3 }; ses.grabAnimEnd = ctx.now() + 900;
  ctx.emit("squash", { target: e.id, axis: "y", intensity: 0.25, duration: 0.2 });
  heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-grab-body-cloth-rustle-and-lift-grunt.mp3", position: e.feetPosition, volume: 0.7, maxDistance: 14 });
  note(ctx, "Hold Z to throw. Tap Z to drop.");
  return true;
}
function hurl(ctx, e, drop) {
  const ses = ctx.self.session, s = ctx.self.state, d = ses.dir ?? { x: 0, y: 0, z: -1 }, hl = Math.hypot(d.x, d.z) || 1, A = attrsOf(s);
  const kg = ses.foeKg ?? bodyKg(e), r = Math.min(1.6, power(ctx) / kg);
  const sp = drop ? 1 : 4 + 7 * r + Math.max(0, (A.a ?? 5) - 5) * 0.6, dx = (d.x / hl) * sp, dz = (d.z / hl) * sp;
  const st = e.state; st.heldBy = null;
  st.down = { x: dx, z: dz, at: ctx.now(), ms: 1000, fly: !drop, y0: e.feetPosition.y };
  e.velocity = { x: dx, y: drop ? 0 : sp * 0.47, z: dz };
  ses.heldFoe = null; ses.foeKg = null; s.carryMul = 1;
  if (drop) return;
  ctx.self.anim.grab = { clip: "cdn/clip-ual-overhandthrow-ada55cac.glb", loop: "once", weight: 1, blendIn: 0.1, blendOut: 0.3 }; ses.grabAnimEnd = ctx.now() + 1000;
  ctx.emit("cameraPunch", { direction: { x: d.x / hl, y: 0, z: d.z / hl }, intensity: 0.35 }, { audience: { player: ctx.self.id } });
  ctx.emit("damageNumber", { position: { x: e.feetPosition.x, y: e.feetPosition.y + 2, z: e.feetPosition.z }, text: r >= 1.2 ? "HURLED" : "THROWN", color: "#ffb347", size: 1 });
  heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-object-throw-whoosh.mp3", position: e.feetPosition, volume: 0.8, maxDistance: 18 });
}
export function update(ctx) {
  if (ctx.self.session.drag) dragTick(ctx);
  if (ctx.self.anim?.grab && ctx.now() > (ctx.self.session.grabAnimEnd ?? 0)) ctx.self.anim.grab = null; // a once-clip left at weight 1 freezes the body in its last frame
  const ses = ctx.self.session;
  if (ses.heldFoe) { const e = ctx.getObject(ses.heldFoe), f = ctx.self.feetPosition, d = ses.dir ?? { x: 0, y: 0, z: -1 }, hl = Math.hypot(d.x, d.z) || 1;
    if (!e || e.state?.dead || e.state?.heldBy !== ctx.self.id) { ses.heldFoe = null; ctx.self.state.carryMul = 1; }
    else if (ctx.now() > (ses.gripUntil ?? 0)) { // broke free: it shoves off you and lands a hit
      e.state.heldBy = null; e.state.stunUntil = 0; ses.heldFoe = null; ctx.self.state.carryMul = 1;
      e.feetPosition = { x: f.x + (d.x / hl) * 1.4, y: f.y, z: f.z + (d.z / hl) * 1.4 };
      ctx.self.state.hp = Math.max(1, (ctx.self.state.hp ?? 100) - 6);
      ctx.emit("cameraPunch", { direction: { x: -d.x / hl, y: 0, z: -d.z / hl }, intensity: 0.5 }, { audience: { player: ctx.self.id } });
      ctx.emit("damageNumber", { position: { x: e.feetPosition.x, y: e.feetPosition.y + 2, z: e.feetPosition.z }, text: "BROKE FREE", color: "#ff6a5a", size: 1 });
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-body-wrenches-free-and-shoves.mp3", position: f, volume: 0.8, maxDistance: 14 });
      note(ctx, "It broke free.");
    }
    else if (ctx.now() > (ses.gripUntil ?? 0) - 900 && !ses.squirmed) { ses.squirmed = true; ctx.emit("shake", { target: e.id, intensity: 0.15, duration: 0.8 }); note(ctx, "It's slipping! Throw it!"); }
    else { e.feetPosition = { x: f.x + (d.x / hl) * 1.0, y: f.y + 0.6, z: f.z + (d.z / hl) * 1.0 }; e.velocity = { x: 0, y: 0, z: 0 }; e.rotation = { yaw: Math.atan2(-d.x, -d.z) * 57.2958 + 180, pitch: -20 }; } }
  if (ses.heave && ctx.now() >= ses.heave.until) { const o = ctx.getObject(ses.heave.id), kg = ses.heave.kg; ses.heave = null; if (o) lift(ctx, o, kg, power(ctx)); else ctx.self.state.carryMul = 1; }
  { const s = ctx.self.state; // a food tray handed over by the Snackrooms counter or a waiter (player.state.l61Hold) comes into the hands here
    if (s.l61Hold && ses.held !== s.l61Hold && !ses.heave) { const t = ctx.getObject(s.l61Hold);
      if (!t) { s.l61Hold = null; s.l61Tray = 0; }
      else { const old = ses.held && ctx.getObject(ses.held); if (old) { old.physics = ses.phys ?? "static"; if (isTray(old) && !old.tags.includes("usable")) old.tags = [...old.tags, "usable"]; }
        ses.held = t.id; ses.kg = t.state?.carryKg ?? TRAY_KG; ses.phys = TRAY_PHYS; t.physics = "none"; s.carry = "Food tray"; s.carryMul = 1; s.l61Tray ||= ctx.now(); } } }
  if (ses.held) { // carried: in front of the chest, along the look
    const o = ctx.getObject(ses.held);
    if (!o || ctx.self.state.dead) { if (ctx.self.state.l61Hold === ses.held) { ctx.self.state.l61Hold = null; ctx.self.state.l61Tray = 0; } ses.held = null; ctx.self.state.carry = null; ctx.self.state.carryId = null; ctx.self.state.carryMul = 1; if (o) o.physics = ses.phys ?? "static"; }
    else if (isTray(o)) { const f = ctx.self.feetPosition, d = ses.dir ?? { x: 0, y: 0, z: -1 }, hl = Math.hypot(d.x, d.z) || 1; o.feetPosition = { x: f.x + (d.x / hl) * 0.5, y: f.y + 0.85, z: f.z + (d.z / hl) * 0.5 }; o.rotation = { yaw: Math.atan2(-d.x, -d.z) * 57.2958 }; } // held level in both hands at the belly
    else { const f = ctx.self.feetPosition, d = ses.dir ?? { x: 0, y: 0, z: -1 }; o.feetPosition = { x: f.x + d.x * 1.1, y: f.y + 0.7 + d.y * 0.6, z: f.z + d.z * 1.1 }; o.rotation = { yaw: Math.atan2(-d.x, -d.z) * 57.2958 }; }
  }
  stepFlights(ctx);
  const fl = ses.flying; if (!fl) return;
  const o = ctx.getObject(fl.id), age = ctx.now() - fl.at;
  const v = o?.velocity ?? { x: 0, y: 0, z: 0 }, sp = Math.hypot(v.x, v.y, v.z);
  if (!o || age > 2500 || (age > 300 && sp < 1.2)) { // landed: a tray clatters down and can be picked up again
    if (o && fl.tray) { if (!o.tags.includes("usable")) o.tags = [...o.tags, "usable"]; heard(ctx, { clip: CLATTER, position: o.feetPosition, volume: 0.55, maxDistance: 16 }); }
    ses.flying = null; return;
  }
  const p = o.feetPosition;
  for (const t of ctx.query({ anyTags: fl.tray ? ["npc", "critter", "breakable", "enemy", "l61fc", "player"] : ["npc", "critter", "breakable", "enemy", "l61fc"], center: p, radius: 1.3 })) {
    if (t.id === o.id || fl.hit[t.id] || t.id === ctx.self.id) continue;
    fl.hit[t.id] = true;
    if (fl.tray) { // plastic: a clatter and a small knock, no real harm
      const h = ctx.getObject(t.id); if (!h || h.tags.includes("snacktray")) continue;
      const n = sp > 0 ? { x: v.x / sp, y: 0, z: v.z / sp } : { x: 0, y: 0, z: -1 }, at = { x: p.x, y: p.y + 0.3, z: p.z };
      if (h.tags.includes("breakable") && !h.tags.includes("npc") && !h.tags.includes("player")) damageEntity(ctx, h, 2, at, { x: -n.x, y: 0, z: -n.z }, "thrown");
      else { ctx.emit("impulse", { target: h.id, impulse: { x: n.x * 70, y: 25, z: n.z * 70 } }); ctx.emit("squash", { target: h.id, axis: "y", intensity: 0.2, duration: 0.2 });
        if (!h.tags.includes("player")) { h.state.hp = (h.state.hp ?? 40) - 1; ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 1.2, z: p.z }, value: 1 }); }
        else ctx.emit("cameraPunch", { direction: n, intensity: 0.3 }, { audience: { player: h.id } }); }
      heard(ctx, { clip: CLATTER, position: at, volume: 0.9, maxDistance: 22 });
      o.velocity = { x: v.x * -0.25, y: Math.max(0.5, v.y * 0.3), z: v.z * -0.25 }; // bounces off whoever it hit
      continue;
    }
    const dmg = Math.round(4 + sp * Math.sqrt(fl.kg) * 0.9), at = { x: p.x, y: p.y + 0.3, z: p.z }, n = sp > 0 ? { x: -v.x / sp, y: 0, z: -v.z / sp } : { x: 0, y: 1, z: 0 };
    const h = ctx.getObject(t.id); if (!h) continue;
    if (!fl.tray && sp > 3) looseImpact(ctx, o, sp, fl.kg, at); // what you threw takes the hit too
    if (h.tags.includes("breakable") && !h.tags.includes("npc")) damageEntity(ctx, h, dmg, at, n, "thrown");
    else {
      h.state.hp = (h.state.hp ?? 40) - dmg;
      h.state.angry = { ...(h.state.angry ?? {}), [ctx.self.id]: true }; h.state.fresh = { ...(h.state.fresh ?? {}), [ctx.self.id]: true };
      ctx.emit("squash", { target: h.id, axis: "y", intensity: 0.25, duration: 0.2 });
    }
    damageEntity(ctx, o, Math.round(dmg * 0.6), at, n, "thrown");
    ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 1.2, z: p.z }, value: dmg });
    ctx.emit("cameraPunch", { direction: n, intensity: 0.25 }, { audience: { player: ctx.self.id } });
    heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-wooden-object-smash-impact-thud.mp3", position: at, volume: 0.8, maxDistance: 26 });
  }
}

// what rests on a lifted thing falls: its loose children come free and anything small standing on its top tumbles (real physics)
function spill(ctx, o) {
  const b = o.bounds; if (!b) return;
  const fall = (it) => { if (!it || it.id === o.id) return; const tg = it.tags ?? []; if (tg.includes("npc") || tg.includes("wall") || tg.includes("door") || it.id.startsWith("player")) return;
    const s = it.bounds?.size; if (!s || s.x * s.y * s.z > 0.6) return;
    if (it.parent) it.parent = null;
    it.physics = { body: "dynamic", collider: "box", density: 400, friction: 0.6, restitution: 0.15 }; // light as wood: it floats
    ctx.emit("impulse", { target: it.id, impulse: { x: (ctx.random() - 0.5) * 0.6, y: 0.4, z: (ctx.random() - 0.5) * 0.6 } }); };
  for (const c of o.children ?? []) fall(ctx.getObject(c.id ?? c));
  const r = Math.max(b.size.x, b.size.z) * 0.75 + 0.3;
  for (const q of ctx.query({ center: b.center, radius: r })) { const it = ctx.getObject(q.id), f = q.feetPosition;
    if (f.y >= b.max.y - 0.15 && f.y <= b.max.y + 0.4 && f.x >= b.min.x - 0.1 && f.x <= b.max.x + 0.1 && f.z >= b.min.z - 0.1 && f.z <= b.max.z + 0.1) fall(it); }
}
// an extinguisher's jet runs dry: the cloud stops and it's an empty can (lib/loose.js spray)
export function looseSpent(ctx, { id }) { const o = ctx.getObject(id); if (o) { o.fx = null; o.state.broke = true; o.state.loose = "plastic"; } }

// dead bodies (Shelly, Nov 10: "z can grab anything as normal just dead bodies included"): Z takes a corpse by the arm and
// drags it behind you on its own ragdoll: tugs pull it toward your heels, its limbs trail and catch on the floor.
// Savi's picks: reach 2.2 m; drag works up to 2.5 x your lift (dragging beats lifting); walk speed 1 - 0.6 x kg / lift, at least 0.4;
// past 3.2 m from you the grip slips; tugs at 10 Hz toward 1 m behind you, at most 2.4 m/s.
const CORPSE = [...BODIES, "l11foe", "remains", "enemy", "corpse"];
function grabCorpse(ctx, input) {
  const ses = ctx.self.session, f = ctx.self.feetPosition, d = ses.dir ?? look(ctx, input), hl = Math.hypot(d.x, d.z) || 1;
  let e = null, bd = 2.2;
  for (const c of ctx.query({ anyTags: CORPSE, radius: 3.2 })) {
    if (c.id === ctx.self.id || !(c.state?.dead || (c.state?.hp ?? 1) <= 0) || c.state?.heldBy) continue;
    const o = ctx.getObject(c.id), b = o?.bounds; if (!b) continue;
    const dx = b.center.x - f.x, dz = b.center.z - f.z, dist = Math.max(0, Math.hypot(dx, dz) - Math.max(b.size.x, b.size.z) * 0.4);
    if (dist > bd || (Math.hypot(dx, dz) > 0.4 && (dx * d.x + dz * d.z) / (Math.hypot(dx, dz) * hl) < 0.4)) continue;
    bd = dist; e = o;
  }
  if (!e) return false;
  const S = ctx.self.state;
  if (!S.sheathed && S.equipped && S.equipped !== "fists") { note(ctx, "Holster your weapon (H) to grab."); return true; }
  const kg = e.state?.kg ?? foeStats(ctx, e).kg ?? bodyKg(e), cap = power(ctx);
  if (kg > cap * 2.5) { note(ctx, `Too heavy to drag (${Math.round(kg)} kg).`); heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-straining-grunt-failed-lift.mp3", position: f, volume: 0.5, maxDistance: 10 }); return true; }
  if (!e.ragdoll) e.ragdoll = { settleFreeze: false, settleSeconds: 2 }; // a body that settled stiff goes loose again in your hands
  e.state.heldBy = ctx.self.id;
  ses.drag = { id: e.id, kg, at: 0, c: null };
  S.carryMul = Math.max(0.4, 1 - 0.6 * kg / cap);
  ctx.self.anim.grab = { clip: "cdn/clip-pick-up.glb", loop: "once", weight: 1, blendIn: 0.1, blendOut: 0.3 }; ses.grabAnimEnd = ctx.now() + 700;
  heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-grab-body-cloth-rustle-and-lift-grunt.mp3", position: e.bounds.center, volume: 0.7, maxDistance: 14 });
  note(ctx, "Dragging. Z to let go.");
  return true;
}
function letGo(ctx) {
  const ses = ctx.self.session, e = ses.drag && ctx.getObject(ses.drag.id);
  if (e && e.state?.heldBy === ctx.self.id) e.state.heldBy = null;
  ses.drag = null; ctx.self.state.carryMul = 1;
}
function dragTick(ctx) {
  const ses = ctx.self.session, g = ses.drag, e = ctx.getObject(g.id), now = ctx.now();
  if (!e || ctx.self.state.dead || e.state?.heldBy !== ctx.self.id) return letGo(ctx);
  if (now - g.at < 100) return;
  const c = e.bounds?.center; if (!c) return letGo(ctx);
  const f = ctx.self.feetPosition, d = ses.dir ?? { x: 0, y: 0, z: -1 }, hl = Math.hypot(d.x, d.z) || 1;
  const tx = f.x - (d.x / hl) * 1.0, tz = f.z - (d.z / hl) * 1.0;
  if (Math.hypot(c.x - f.x, c.z - f.z) > 3.2) { note(ctx, "It slipped out of your grip."); return letGo(ctx); }
  const dt = g.c ? (now - g.at) / 1000 : 0.1, vx = g.c ? (c.x - g.c.x) / dt : 0, vz = g.c ? (c.z - g.c.z) / dt : 0;
  let wx = (tx - c.x) * 3, wz = (tz - c.z) * 3; const wl = Math.hypot(wx, wz); if (wl > 2.4) { wx *= 2.4 / wl; wz *= 2.4 / wl; }
  const near = { x: c.x + (f.x - c.x) * 0.3, y: c.y + 0.15, z: c.z + (f.z - c.z) * 0.3 }; // the end nearest you takes the pull, the rest trails
  ctx.emit("impulse", { target: e.id, impulse: { x: g.kg * (wx - vx) * 0.45, y: g.kg * 0.12, z: g.kg * (wz - vz) * 0.45 }, position: near });
  g.at = now; g.c = { x: c.x, z: c.z };
}
