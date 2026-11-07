// Z: pick up a breakable thing in front of you (never a wall) and carry it; Z again throws it along your look.
// Strength (the sheet's H) decides how heavy a thing you can lift and how hard it flies; a heavy load slows your walk
// (player.js reads state.carryMul). A thrown thing hurts what it hits: NPCs take damage and turn on you, props crack.
import { raycast } from "builtin/physics";
import { attrsOf } from "./lib/stats.js";
import { damageEntity } from "./lib/breakables.js";
import { heard } from "./lib/hear.js";
const NOT = ["wall", "gridwall", "level0", "npc", "player", "critter", "door", "remains"];
const CAP = (h) => 12 + h * 9;        // kg you can lift: strength 1 = 21 kg, 5 = 57, 10 = 102 (Savi's picks)
const note = (ctx, text) => { ctx.self.state.notice = { text, at: ctx.now() }; };
function look(ctx, input) {
  const sin = input?.axes?.aimYawSin ?? 0, cos = input?.axes?.aimYawCos ?? 1;
  let pc = ctx.self.camera?.rotation?.pitch ?? 0; if (Math.abs(pc) > 1.6) pc = pc * Math.PI / 180;
  const c = Math.cos(pc);
  return { x: -sin * c, y: Math.sin(pc), z: -cos * c };
}
const massOf = (o) => o.state?.carryKg ?? o.measure?.mass ?? Math.max(2, (o.measure?.volume ?? 0.05) * 350);
export function onInput(ctx, input) {
  const ses = ctx.self.session;
  if (input.axes) ses.dir = look(ctx, input);
  if (!input.pressed?.grab) return;
  const s = ctx.self.state, h = attrsOf(s).h ?? 5, held = ses.held && ctx.getObject(ses.held);
  if (held) return toss(ctx, held, h);
  ses.held = null;
  const f = ctx.self.feetPosition, eye = { x: f.x, y: f.y + 1.5, z: f.z }, d = ses.dir ?? look(ctx, input);
  const hit = raycast(ctx, eye, d, { distance: 2.6, ignoreEntities: [ctx.self.id] });
  const o = hit?.id && ctx.getObject(hit.id);
  if (!o || !o.tags?.includes("breakable") || NOT.some((t) => o.tags.includes(t)) || o.parent) { note(ctx, "Nothing to pick up."); return; }
  const kg = massOf(o), cap = CAP(h);
  if (kg > cap) { note(ctx, `Too heavy: ${Math.round(kg)} kg. You can lift ${Math.round(cap)}.`); heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-strained-grunt-lifting-heavy.mp3", position: eye, volume: 0.5, maxDistance: 10 }); return; }
  ses.held = o.id; ses.kg = kg; ses.phys = o.physics; o.physics = "none";
  s.carry = o.state?.name ?? "something"; s.carryMul = Math.max(0.45, 1 - (kg / cap) * 0.6);
  heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-furniture-lift-wood-creak-scrape.mp3", position: eye, volume: 0.45, maxDistance: 12 });
}
function toss(ctx, o, h) {
  const ses = ctx.self.session, s = ctx.self.state, d = ses.dir ?? { x: 0, y: 0, z: -1 };
  const speed = Math.max(3, Math.min(20, 3 + (CAP(h) / ses.kg) * 2.2)); // light things fly, heavy things drop at your feet
  o.physics = { body: "dynamic", collider: "box", mass: ses.kg, friction: 0.7 };
  o.velocity = { x: d.x * speed, y: d.y * speed + 2, z: d.z * speed };
  ses.flying = { id: o.id, at: ctx.now(), speed, kg: ses.kg, hit: {} };
  ses.held = null; s.carry = null; s.carryMul = 1;
  const f = ctx.self.feetPosition;
  heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-object-throw-whoosh.mp3", position: { x: f.x, y: f.y + 1.4, z: f.z }, volume: 0.5, maxDistance: 14 });
}
export function update(ctx) {
  const ses = ctx.self.session;
  if (ses.held) { // carried: in front of the chest, along the look
    const o = ctx.getObject(ses.held);
    if (!o || ctx.self.state.dead) { ses.held = null; ctx.self.state.carry = null; ctx.self.state.carryMul = 1; if (o) o.physics = ses.phys ?? "static"; }
    else { const f = ctx.self.feetPosition, d = ses.dir ?? { x: 0, y: 0, z: -1 }; o.feetPosition = { x: f.x + d.x * 1.1, y: f.y + 0.7 + d.y * 0.6, z: f.z + d.z * 1.1 }; o.rotation = { yaw: Math.atan2(-d.x, -d.z) * 57.2958 }; }
  }
  const fl = ses.flying; if (!fl) return;
  const o = ctx.getObject(fl.id), age = ctx.now() - fl.at;
  if (!o || age > 2500) { ses.flying = null; return; }
  const v = o.velocity ?? { x: 0, y: 0, z: 0 }, sp = Math.hypot(v.x, v.y, v.z);
  if (age > 300 && sp < 1.2) { ses.flying = null; return; }
  const p = o.feetPosition;
  for (const t of ctx.query({ anyTags: ["npc", "critter", "breakable", "enemy"], center: p, radius: 1.3 })) {
    if (t.id === o.id || fl.hit[t.id] || t.id === ctx.self.id) continue;
    fl.hit[t.id] = true;
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
