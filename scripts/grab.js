// Z: pick up a breakable thing in front of you (never a wall) and carry it; Z again throws it along your look.
// Strength (the sheet's H) decides how heavy a thing you can lift and how hard it flies; a heavy load slows your walk
// (player.js reads state.carryMul). A thrown thing hurts what it hits: NPCs take damage and turn on you, props crack.
import { raycast } from "builtin/physics";
import { attrsOf } from "./lib/stats.js";
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
  if (!input.pressed?.grab) return;
  ses.held = null;
  const f = ctx.self.feetPosition, eye = { x: f.x, y: f.y + 1.5, z: f.z }, d = ses.dir ?? look(ctx, input);
  const hit = raycast(ctx, eye, d, { distance: 2.6, ignoreEntities: [ctx.self.id] });
  let o = hit?.id && ctx.getObject(hit.id);
  const tiny = (x) => { const b = x?.bounds?.size; return b && b.x * b.y * b.z < 0.5 && Math.max(b.x, b.y, b.z) < 1.4; };
  if (hit && !tiny(o)) { // a plush on a bed or a bottle on a dresser sits inside the furniture's box: take the small thing nearest where the look landed
    const near = ctx.query({ center: hit.position, radius: 0.6 }).map((r) => ctx.getObject(r.id)).find((x) => x && x.id !== ctx.self.id && tiny(x) && !x.parent && !NOT.some((t) => x.tags.includes(t)));
    if (near) o = near;
  }
  const sz = o?.bounds?.size, small = sz && sz.x * sz.y * sz.z < 0.5 && Math.max(sz.x, sz.y, sz.z) < 1.4; // a radio, a lamp, a bottle: anything small enough is fair game
  if (!o || !(o.tags?.includes("breakable") || small) || NOT.some((t) => o.tags.includes(t)) || o.parent || o.tags.includes("l5-elev-panel") || o.tags.includes("l5-sealed")) { note(ctx, "Nothing to pick up."); return; }
  if (!o.tags.includes("breakable")) { o.tags = [...o.tags, "breakable"]; o.state.mat ??= "fixture"; o.state.hp ??= 30; o.state.maxHp ??= o.state.hp; } // picked up once, it can be smashed too
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
  ctx.self.anim.grab = { clip: "cdn/clip-throw.glb", loop: "once", weight: 1, blendIn: 0.1, blendOut: 0.3 }; ctx.self.session.grabAnimEnd = ctx.now() + 1000;
  // weight over its size is its density: under water's 1000 kg/m³ it bobs back up, over it sinks (the engine floats a dynamic body by density in a sea, lake or river)
  const bs = o.bounds?.size, vol = bs ? Math.max(0.001, bs.x * bs.y * bs.z * 0.6) : null; // 0.6: a chair or a crate is mostly air inside its box
  o.physics = vol ? { body: "dynamic", collider: "box", density: Math.max(60, Math.min(8000, ses.kg / vol)), friction: 0.7 } : { body: "dynamic", collider: "box", mass: ses.kg, friction: 0.7 };
  o.velocity = { x: d.x * speed, y: d.y * speed + 2, z: d.z * speed };
  ses.flying = { id: o.id, at: ctx.now(), speed, kg: ses.kg, hit: {}, tray: isTray(o) };
  if (isTray(o)) { o.physics = TRAY_PHYS; s.l61Hold = null; s.l61Tray = 0; }
  ses.held = null; s.carry = null; s.carryId = null; s.carryMul = 1;
  const f = ctx.self.feetPosition;
  heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-object-throw-whoosh.mp3", position: { x: f.x, y: f.y + 1.4, z: f.z }, volume: 0.5, maxDistance: 14 });
}
export function update(ctx) {
  if (ctx.self.anim?.grab && ctx.now() > (ctx.self.session.grabAnimEnd ?? 0)) ctx.self.anim.grab = null; // a once-clip left at weight 1 freezes the body in its last frame
  const ses = ctx.self.session;
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
