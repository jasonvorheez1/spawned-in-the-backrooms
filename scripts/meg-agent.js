import { weaponsOf as sharedWeapons } from "./lib/npc-temper.js";
import { clearSight } from './lib/sight.js';
import { knocked } from "./lib/knock.js";
import { vo, hasVoice, actedVoice } from "./lib/voices.js";
import { social } from "./lib/npc-social.js";
import { barkOf } from "./lib/dialogue.js";
import { explainHostility, hostileReason, incidentOf, faction } from "./lib/forgive.js";
import { heard } from "./lib/hear.js";
import { seatFor } from "./lib/seat.js";
import { rollNpcWeapon, rollNpcPocketLoot, npcGearLevel, adaptNpcWear } from "./lib/npc-gear.js";
import { stripTo, SLOTS } from "./lib/clothes.js";
import { lifeOf, FEAR_TAGS, FEAR_LINES, WANT_LINES } from "./lib/npc-life.js";
import { toMesh, lookFromModel, rewear, seatHead, HEAD_ID, staleBody, isNewCat, CAT_JIGGLE, speciesFor, buildFor, critterSpec, faceMorph, baseBones, HUMAN, humanFace, mouthAt, setStyle, bodyModel, seatCat, refitBody } from "./lib/critter-model.js";
// An M.E.G. agent: holds its post, greets players, and fights. It paths (builtin/nav) to the nearest creature
// (hound, stealer) or a player who attacked the camp, shoots from range with line of sight, and goes home after.
// Player hostility comes from a local incident, faction standing, or an authored hostile NPC.
import { navPath } from "./lib/nav.js";
import { raycast } from "builtin/physics";
import { animate } from "builtin/tween";
import { swing3, fire3, aimPose, aimMode, longHands, famOf, tick3, heldRot, stagger3, carry3 } from "./lib/body3.js";
import G from "./lib/data/meg.yml";
import WP from "./lib/data/weapons.yml";
import { weaponBody } from "./lib/weapon-look.js";
// once per agent: keep what its spawner handed it unless that was the stock pistol, else roll from leveled role/faction tables compared to player level
// nerve (Shelly's confidence system): brave hold their ground, steady fight until hurt, cowards run, frenzied (rare) go for anyone. Savi's odds: 24/50/23/3
const hashN = (id, salt) => { let h = 2166136261 ^ salt; for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000; };
export const nerveOf = (id) => { const r = hashN(id, 77); return r < 0.24 ? "brave" : r < 0.74 ? "steady" : r < 0.97 ? "coward" : "frenzied"; };
const weaponsOf = (ctx, me) => sharedWeapons(ctx, me, HEAD_ID), heldOf = (ctx, me) => weaponsOf(ctx, me)[0]; // scripts/lib/npc-temper.js: every level
const FLEE = { coward: ["nope. nope nope nope.", "not my fight!", "somebody else do it!", "i'm out, i'm out!"], steady: ["fall back! fall back!", "i'm hit, i'm getting out!", "can't hold it!"], brave: ["just a scratch... ugh, back!", "regroup! i'll be back!"] };
function arm(ctx, me, m) {
  const s = me.state; s.nerve ??= nerveOf(me.id); if (s.mjguest) { m.armed = true; return; }
  const held = heldOf(ctx, me), given = held?.state?.kind;
  const lv = s.gearLevel ??= npcGearLevel(ctx, me);
  if (!s.arm) s.arm = given && given !== "pistol" ? given : rollNpcWeapon(ctx, me, { gearLevel: lv });
  const armor = adaptNpcWear(me, lv);
  if (armor) {
    rewear(ctx, me, armor);
    if (!me.primitive) s.wear = armor;
    if (s.look) s.look = armor;
  }
  const all = weaponsOf(ctx, me), keep = s.arm === "fists" ? null : all.find((w) => w.state.kind === s.arm);
  for (const w of all) if (w !== keep) ctx.destroy(w.id); // one weapon a body: spares that piled up over reloads go
  if (s.arm === "fists") { m.armed = true; m.drawn = undefined; return; }
  if (keep) { m.armed = true; m.heldId = keep.id; return; }
  m.heldId = ctx.spawn("held", { parent: me.id, attachment: { bone: "RightHand" }, visible: false, state: { kind: s.arm }, ...weaponBody(s.arm), ...heldRot(s.arm) });
  m.drawn = undefined; m.armed = true;
}
const SHOTS = { shotgun: "/cdn/moodboard-realistic-gritty/sfx-shotgun-blast-heavy-boom.mp3", smg: "/cdn/moodboard-realistic-gritty/sfx-smg-tommy-gun-loud-rattle-shot.mp3" };
const WHOOSH = "/cdn/moodboard-realistic-gritty/sfx-heavy-object-throw-whoosh.mp3", THUD = "/cdn/moodboard-realistic-gritty/sfx-heavy-wooden-object-smash-impact-thud.mp3";
// a melee swing: the arm hauls back and through, a whoosh, and on a connect a thud, blood and the hit
function swing(ctx, me, t, A) {
  const o = me.feetPosition, q = chest(t.feetPosition), dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1;
  { const now = ctx.now(); m3(me).n = now - (m3(me).at ?? 0) > 1600 ? 0 : (m3(me).n ?? 0) + 1; m3(me).at = now; swing3(ctx, me.state.arm, 0, m3(me).n, me); } // the same combo takes a player swings (scripts/lib/data/combat-anims.yml)
  heard(ctx, { clip: WHOOSH, position: q, volume: 0.6, pitch: 1.3 - Math.min(0.5, (A.length ?? 0.7) * 0.4), maxDistance: 16 });
  if (ctx.random() > Math.min(0.92, G.hitChance + 0.1)) return;
  if (!clearSight(ctx, { x: o.x, y: o.y + 1.2, z: o.z }, q, [me.id, t.id])) return; // Shelly: no hits through walls
  const isPlayer = !!ctx.place.players.find((p) => p.id === t.id), base = isPlayer ? G.playerShot : G.shot;
  const dmg = dmgAfterArmor(isPlayer ? t.state.look : lookOfNpc(t), Math.round(base * Math.min(2.2, Math.max(0.5, (A.damage ?? 20) / 26)) * npcMul(me.state).dmg));
  t.state.hp -= dmg; t.state.hitBy = { id: me.id, at: ctx.now() }; // who struck it: it and its friends answer (below)
  heard(ctx, { clip: THUD, position: q, volume: 0.7, maxDistance: 18 });
  ctx.emit("damageNumber", { position: { x: q.x, y: q.y + 0.4, z: q.z }, value: dmg, color: isPlayer ? "#ff5040" : "#c6f060" });
  ctx.emit("fx", { position: q, script: HIT, params: {} });
  ctx.emit("squash", { target: t.id, axis: "y", intensity: 0.12, duration: 0.18 });
  if (isPlayer) { ctx.emit("cameraPunch", { direction: { x: dx / l, y: 0, z: dz / l }, intensity: 0.5 }, { audience: { player: t.id } }); ctx.emit("screenShake", { intensity: 0.3, duration: 0.15 }, { audience: { player: t.id } }); }
}
import { npcState, npcMul, lookOfNpc, dmgAfterArmor, attrsOf, packAttrs } from "./lib/stats.js";
import { temperOf, TEMPER_STATS, TEMPER_NERVE } from "./lib/personality.js";
import CHAT from "./lib/data/chatter.yml";
import TK from "./lib/data/talk.yml";
const SHOT = "/cdn/moodboard-realistic-gritty/sfx-pistol-gunshot-concrete-echo.mp3";
const FLASH = `fx
pop flash burst=1 life=.06 size=.35 col=hdr(5,3.4,1.4) a=1>0 sz=$size r=sprite(soft-disc,add)
pop sparks burst=6 life=.1..0.2 v=sdir()*(2..4) size=.02 col=hdr(4,2.4,.8) a=1>0 r=sprite(ember,add,velocity,.03)
pop light burst=1 life=.07 r=light(<1,.7,.35>,14,5)`;
const HIT = `fx
pop blood burst=10 life=.4..0.7 v=sdir()*(1..2.4)+up(.6) size=.04..0.08 acc=grav() col=<.35,.05,.04> a=1>0 floor=stick r=sprite(soft-disc,alpha)`;
const FOES = ["hound", "stealer"];
// what a fighter takes on: every creature of the halls (the hotel's own staff, l5staff, are not for shooting). A civilian only fights what is on top of them.
const HOSTILE = ["hound", "stealer", "smiler", "lurker", "moths", "l8spider", "hostile", "l8-hostile", "wretched", "l7beast"]; // creatures and the insane: every sane npc fights these
const CROUCH = "cdn/clip-crouch-idle-loop.glb";
const DEAD = (o) => !o || o.state?.dead || (o.state?.hp ?? 1) <= 0;
const corpseOf = (o) => !!o && DEAD(o) && !o.tags?.includes?.("l5staff") && HOSTILE.some((g) => o.tags?.includes?.(g));
const VERMIN = (o) => o?.tags?.includes?.("l5rat") || o?.state?.kind === "rat"; // a dead rat is not worth a crowd: nobody walks over to study one

function shapeTemper(me) {
  if (me.state.temperV) return; { // temperament shapes the body once: attributes nudged, hp re-derived, nerve leaned
    const tp = temperOf(me), a = attrsOf(me.state), nd = TEMPER_STATS[tp] ?? {};
    for (const k in nd) a[k] = Math.max(1, Math.min(10, (a[k] ?? 5) + nd[k]));
    me.state.attr = packAttrs(a); me.state.temper = tp; me.state.temperV = 1;
    const hp = Math.max(1, Math.round(G.hp * npcMul(me.state).hp * (0.85 + a.e * 0.03))); const f = (me.state.hp ?? hp) / (me.state.maxHp ?? hp);
    me.state.maxHp = hp; me.state.hp = Math.max(1, Math.round(hp * Math.min(1, f)));
    if (TEMPER_NERVE[tp] && me.state.nerve !== "frenzied" && hashN(me.id, 91) < 0.6) me.state.nerve = TEMPER_NERVE[tp];
  }
}
export function onSpawn(ctx) {
  const me = ctx.self;
  if (!me.state.attr) { const r = npcState(ctx, "agent", G.hp); me.state.attr = r.attr; me.state.title = r.title; me.state.maxHp = r.hp; me.state.hp ??= r.hp; }
  shapeTemper(me);
  me.state.hp ??= G.hp;
  me.state.home ??= { x: me.feetPosition.x, y: me.feetPosition.y, z: me.feetPosition.z };
  // Shelly Nov 14 "fix level 70's lag": 17 folk waking at once each re-dressed in the same tick (a 140 ms hitch); now each dresses on its own beat over ~1.2 s
  ctx.after(0.05 + ctx.random() * 1.2, "dressLater", {});
  me.state.turnTo ??= "movement"; // humanoid-locomotion picks Idle/Walk/Run off the speed the body really moved, each clip at its measured pace, and faces the walk
}
// every agent wears the cute Blender critter: an old scripted body swaps in place, and the look it wears is kept in state.wear (garments to loot, redress)
function dress(ctx, me) {
  if (me.model && me.primitive) me.primitive = null; // a body caught half-swapped
  setStyle(ctx.world.state.bodyStyle); // read the BODIES pick first: on a fresh machine HUMAN defaults to human, and seatHead would drop a furry's head (Shelly, Nov 9: "npcs have no head sometimes")
  if (me.model && me.state.wear) seatHead(ctx, me, me.state.wear);
  const was = toMesh(ctx, me);
  if (was) me.state.wear = was;
  else if (!me.state.wear && me.model) { const l = lookFromModel(me.model, ctx.getObject(me.id + "/" + HEAD_ID)?.model?.id ?? ctx.getObject(me.id + "/" + HEAD_ID)?.model); if (l?.species) me.state.wear = l; }
  if (!HUMAN && me.model && me.state.wear?.species === "human" && me.session.catSwap !== 1) { // Shelly Nov 12: an NPC still on the old human body moves onto the new cat model, clothes and colours kept
    me.session.catSwap = 1; const l = { ...me.state.wear, species: "cat" }; if (me.state.look?.species === "human") me.state.look = { ...me.state.look, species: "cat" };
    try { refitBody(ctx, me, l); } catch (e) { ctx.log("cat swap", me.id, String(e)); }
  }
  if (staleBody(me.model)) { // an older Blender pass: re-dress on the current body and head, keeping its clothes and colours
    const local = String(me.id).split("/").pop(), old = { ...(lookFromModel(me.model, null) ?? {}), ...(me.state.wear ?? {}) }
    const l = { ...old, species: HUMAN ? (old.species ?? speciesFor(local)) : "cat", sex: old.sex ?? "m" }
    const spec = critterSpec(l); me.model = spec.model; me.material = spec.material; me.jiggle = spec.jiggle; me.state.wear = l; seatHead(ctx, me, l);
  }
  const sc = me.scale, plain = !sc || (typeof sc === "number" ? sc === 1 : sc.x === 1 && sc.y === 1);
  if (me.state.build && (me.state.build.v !== 3 || !!me.state.build.human !== !!HUMAN)) { if (HUMAN && me.scale && typeof me.scale === 'object') { const y = me.scale.y ?? 1; me.scale = { x: y, y, z: y }; } } if (me.state.build && (me.state.build.v !== 3 || !!me.state.build.human !== !!HUMAN)) { const sx = me.scale; me.state.build = null; if (sx && typeof sx === 'object' && Math.abs(sx.x - sx.y) < 1e-6) {} } // the reset: rebuilt with the new ranges
  const sc2 = me.scale, plain2 = !sc2 || (typeof sc2 === "number" ? sc2 === 1 : sc2.x === 1 && sc2.y === 1);
  if (!me.state.build && !plain2) { const b = buildFor(String(me.id).split("/").pop(), me.state.wear?.sex); me.state.build = { ...b, h: typeof sc2 === "number" ? sc2 : sc2.y, w: typeof sc2 === "number" ? sc2 : sc2.x }; if (HUMAN && typeof sc2 === "object") { const y = sc2.y ?? 1, r = b.w / b.h; me.scale = { x: y * r, y, z: y * r }; me.state.build.w = y * r; } } // a hand-cast height stays; bust, head and tail still roll
  if (!me.state.build && plain2) { const b = buildFor(String(me.id).split("/").pop(), me.state.wear?.sex); me.state.build = b; me.scale = { x: b.w, y: b.h, z: b.w }; } // its own height and build
  if (me.model && (me.state.wear?.sex ?? me.state.look?.sex) === 'f' && (me.morph?.Bust == null || me.session.bustV !== 2)) { me.session.bustV = 2; me.bones = baseBones(me.state.build, me.state.look ?? me.state.wear); const b = me.state.build?.bust != null ? me.state.build : buildFor(String(me.id).split("/").pop(), 'f'); me.morph = { ...(me.morph ?? {}), Bust: b.bust }; } // her own bust
  if (me.model && me.session.catRigV !== 3 && isNewCat(me.state.look ?? me.state.wear)) { me.session.catRigV = 3; me.jiggle = CAT_JIGGLE; me.bones = baseBones(me.state.build, me.state.look ?? me.state.wear); } // the cat rig fixes: tail spring, arms forward (critter-model CAT_JIGGLE, CAT_ARMS)
}

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const chest = (p) => ({ x: p.x, y: p.y + 1.1, z: p.z });

// sight on a creature, read twice a second per creature: seen now, or seen in the last 5 s (it ducked round a corner); one that stays unreachable is dropped for 20 s
function inView(ctx, me, m, f, d) {
  const now = ctx.now(); m.vis ??= {}; m.ign ??= {};
  if ((m.ign[f.id] ?? 0) > now) { // given up on it as unreachable: but look again twice a second, and a clear line (the door it was behind just opened) ends the ignore at once (Shelly Nov 14: den wanderers took a while to attack after the lock was picked)
    m.ignLook ??= {}; if (now - (m.ignLook[f.id] ?? 0) < 500) return false;
    m.ignLook[f.id] = now; if (!seesIt(ctx, me, f)) return false;
    delete m.ign[f.id];
  }
  const v = m.vis[f.id] ??= { at: -Infinity, saw: null, near: d, since: now };
  if (now - v.at > 500) { v.at = now; v.clear=seesIt(ctx, me, f); if (v.clear) { v.saw = now; v.since = now; v.near = d; } }
  if (d < v.near - 1) { v.near = d; v.since = now; } // getting closer: the chase is working
  if (!v.clear && now - v.since > 6000 && d > 1.6) { m.ign[f.id] = now + 20000; delete m.vis[f.id]; return false; } // six seconds without gaining: it can't be reached
  return v.saw != null && now - v.saw < 5000;
}
function pickTarget(ctx, me, m) {
  const p = me.feetPosition, now = ctx.now();
  if (m.curTarget) {
    const cur = ctx.getObject(m.curTarget);
    if (cur && !DEAD(cur) && (!ctx.place.players.some(p => p.id === cur.id) || hostileReason(ctx, me, cur)) && inView(ctx, me, m, cur, flat(cur.feetPosition, p))) {
      if (now < (m.retargetAt ?? 0)) return cur;
    } else {
      m.curTarget = null;
    }
  }
  if (now < (m.targetScanAt ?? 0)) {
    return m.curTarget ? ctx.getObject(m.curTarget) : null;
  }
  m.targetScanAt = now + 280 + (Number(String(me.id).charCodeAt(0)) % 50);
  let best = null, bd = G.sight;
  const fighter = (!me.state.faction5 || me.state.faction5 === "hk" || me.state.follow) && !me.state.mjguest; // hotel guests are no fighters: a hound is something to run from, but anything on top of them gets the weapon
  if (!me.state.mjguest) {
    for (const f of ctx.query({ anyTags: HOSTILE, radius: fighter ? G.sight : 5 })) {
      if (DEAD(f) || f.tags?.includes?.("player") || f.tags?.includes?.("l5staff") || f.id === me.id || (faction(me) && faction(f) === faction(me))) continue; // a wretch never counts its own den
      const d = flat(f.feetPosition, p);
      if (d >= bd || !inView(ctx, me, m, f, d)) continue; // a creature behind (or stuck in) a wall is not a target
      bd = d; best = f;
    }
  }
  // struck by an npc, or a crewmate or a player near me was: go for the striker (Shelly Nov 12: Dez never swung at the faceling)
  if (!me.state.mjguest && (me.state.hp ?? 1) > 0) {
    const nowH = ctx.now(), pids = new Set(ctx.place.players.map((q) => q.id));
    const near = [me, ...ctx.query({ tags: ["npc"], radius: 14 }), ...ctx.place.players.filter((q) => me.state.follow === q.id && flat(q.feetPosition, p) < 14)];
    for (const n of near) {
      const h = n.state?.hitBy; if (!h || nowH - h.at > 15000 || h.id === me.id || pids.has(h.id)) continue;
      if (!(n === me || pids.has(n.id) || (faction(me) && faction(n) === faction(me)))) continue;
      const f = ctx.getObject(h.id); if (!f || DEAD(f) || (f.state?.hp ?? 1) <= 0) continue;
      if (n !== me && faction(me) && faction(f) === faction(me)) continue; // a crew squabble is not mine to join
      const d = flat(f.feetPosition, p); if (d < bd && inView(ctx, me, m, f, d)) { bd = d; best = f; }
    }
  }
  for (const pl of ctx.place.players) {
    if (DEAD(pl)) continue;
    const reason = hostileReason(ctx, me, pl);
    if (!reason) continue;
    const d = flat(pl.feetPosition, p);
    if (d >= bd || !inView(ctx, me, m, pl, d)) continue;
    bd = d; best = pl;
  }
  m.curTarget = best ? best.id : null;
  m.retargetAt = now + 650;
  return best;
}

function seesIt(ctx, me, t) {
  const o = chest(me.feetPosition), q = chest(t.feetPosition), dx = q.x - o.x, dy = q.y - o.y, dz = q.z - o.z, l = Math.hypot(dx, dy, dz) || 1;
  return !raycast(ctx, o, { x: dx / l, y: dy / l, z: dz / l }, { distance: l, physicsOnly: true, bodies: "all", excludeTags: ["npc", "player", "hound", "rat", "smiler", "lurker", "stealer", "deathmoth", "weapon", "almond"], ignoreEntities: [me.id, t.id] }); // a shut door (kinematic) blocks the view too
}

function shoot(ctx, me, t, A = WP.pistol) {
  const o = chest(me.feetPosition), q = chest(t.feetPosition), dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1;
  const muzzle = { x: o.x + dx / l * 0.5, y: o.y + 0.15, z: o.z + dz / l * 0.5 };
  ctx.emit("fx", { position: muzzle, script: FLASH });
  heard(ctx, { clip: SHOTS[me.state.arm] ?? SHOT, position: muzzle, volume: 0.9, maxDistance: 45 });
  fire3(ctx, me, me.state.arm); // the player's own fire take and kick (scripts/lib/body3.js)
  if (ctx.random() > G.hitChance) return;
  const isPlayer = !!ctx.place.players.find((p) => p.id === t.id), dmg = dmgAfterArmor(isPlayer ? t.state.look : lookOfNpc(t), Math.round((isPlayer ? G.playerShot : G.shot) * Math.min(1.9, Math.max(0.35, (A.damage ?? 34) / 34)) * npcMul(me.state).dmg)); // the target's clothes soak it
  t.state.hp -= dmg; t.state.hitBy = { id: me.id, at: ctx.now() }; // who struck it: it and its friends answer (below)
  ctx.emit("damageNumber", { position: { x: q.x, y: q.y + 0.4, z: q.z }, value: dmg, color: isPlayer ? "#ff5040" : "#c6f060" });
  ctx.emit("fx", { position: q, script: HIT, params: {} });
  ctx.emit("flash", { target: t.id, color: "#ffffff", duration: 0.08 });
  if (isPlayer) { ctx.emit("cameraPunch", { direction: { x: dx / l, y: 0, z: dz / l }, intensity: 0.35 }, { audience: { player: t.id } }); ctx.emit("screenShake", { intensity: 0.25, duration: 0.15 }, { audience: { player: t.id } }); }
}

// nextbot-style walking: a path from builtin/nav, smoothed by line of sight (skip to the farthest corner it can see),
// a shove away from other people so crowds slide past each other, and a stuck check that sidesteps and repaths.
const clearLine = (ctx, me, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 0.3) return true;
  const h = raycast(ctx, { x: a.x, y: a.y + 0.5, z: a.z }, { x: dx / d, y: 0, z: dz / d }, { distance: d, radius: 0.32, ignoreEntities: [me.id], excludeTags: ["npc", "player"], bodies: "all", physicsOnly: true }); return !h; };
// at most two path searches a tick across every agent on this machine: a crowd that loses its target together no longer pays them all in one tick (the 37 ms spikes); the rest ask next tick
let PB_AT = -1, PB_N = 0;
const pathBudget = (now) => { if (now !== PB_AT) { PB_AT = now; PB_N = 0; } return PB_N++ < 2; };
function moveAlong(ctx, me, m, goal, speed, dt) {
  const p = me.feetPosition, now = ctx.now();
  const fin = (q, y0) => ({ x: Number.isFinite(q?.x) ? q.x : p.x, y: Number.isFinite(q?.y) ? q.y : y0, z: Number.isFinite(q?.z) ? q.z : p.z });
  goal = fin(goal, Number.isFinite(p.y) ? p.y : 0);
  const r = (now >= (m.repath ?? 0) || flat(goal, m.pathGoal ?? goal) > 2) ? navPath(ctx, fin(p, goal.y), goal, {fresh:(m.blocked??0)>=2}) : null;
  if (r && !r.wait) {
    m.pathGoal={...goal}; // shared search budget (scripts/lib/nav.js): a spent tick keeps the old path and asks next tick
    if (r?.points?.length) { m.path = r.points; m.i = 0; m.pathGoal = { ...goal }; m.seeAt = 0; }
    else if (!r?.partial && clearLine(ctx, me, p, goal)) { m.path = [goal]; m.i = 0; m.pathGoal = { ...goal }; }
    else m.path = null;
    if (r?.points?.length || r?.partial) m.fails = 0; else m.fails = Math.min(4, (m.fails ?? 0) + 1); // no way through: ask less and less often
    m.repath = now + (r?.partial ? 250 : (1500 + ctx.random() * 700) * (1 + (m.fails ?? 0))); // jitter keeps a crowd from all asking on the same tick
  }
  if (!m.path) {
    if (now > (m.clearLineAt ?? 0)) {
      m.clearLineAt = now + 250;
      m.clearLineOk = clearLine(ctx, me, p, goal);
    }
    if (!m.clearLineOk) {
      stop(me, dt);
      m.repath = Math.min(m.repath, now + 350);
      return;
    }
  }
  let to = goal;
  if (m.path) {
    while (m.i < m.path.length - 1 && flat(m.path[m.i], p) < 0.6) m.i++;
    if (now > (m.seeAt ?? 0)) { m.seeAt = now + 300; // a few looks a second: skip ahead to the farthest corner in plain sight
      for (let k = Math.min(m.path.length - 1, m.i + 4); k > m.i; k--) if (clearLine(ctx, me, p, m.path[k])) { m.i = k; break; } }
    to = m.path[m.i] ?? goal;
    // the way ahead has closed since the path was made (a door shut, something set down): ask again now, not in a second
    if (now > (m.blockAt ?? 0)) { m.blockAt = now + 400; if (flat(to, p) < 4 && flat(to, p) > 0.9 && !clearLine(ctx, me, p, to)) { m.blocked = (m.blocked ?? 0) + 1; if (m.blocked >= 2) { m.path=null; m.repath=0; stop(me,dt); return; } } else m.blocked = 0; }
  }
  // stuck: trying to move but barely moved in a second: sidestep for a beat, then a fresh path
  m.sk ??= { x: p.x, z: p.z, at: now };
  if (now - m.sk.at > 1000) { const moved = Math.hypot(p.x - m.sk.x, p.z - m.sk.z); if (moved < 0.25 * speed && flat(to, p) > 0.8) { m.stuckN = (m.stuckN ?? 0) + 1; m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 600 + Math.min(m.stuckN, 4) * 250 }; m.repath = 0; if (m.stuckN >= 4) { m.path = null; m.stuckN = 0; m.repath = now + 2500; } } else if (moved >= 0.25 * speed) m.stuckN = 0; m.sk = { x: p.x, z: p.z, at: now }; }
  let dx = to.x - p.x, dz = to.z - p.z, d = Math.hypot(dx, dz) || 1;
  let ux = dx / d, uz = dz / d;
  if (m.side && now < m.side.until) { const s = m.side.s; ux = ux * 0.4 + -uz * s * 0.9; uz = uz * 0.4 + (dx / d) * s * 0.9; }
  // personal space: other people inside 0.9 m push this one aside (checked a few times a second, kept between)
  if (now > (m.sepAt ?? 0)) { m.sepAt = now + 250; let sx = 0, sz = 0;
    for (const o of ctx.query({ tags: ["npc"], center: p, radius: 0.9 })) { if (o.id === me.id) continue; const ox = p.x - o.feetPosition.x, oz = p.z - o.feetPosition.z, od = Math.hypot(ox, oz) || 0.01; sx += ox / od * (0.9 - od); sz += oz / od * (0.9 - od); }
    m.sep = { x: sx, z: sz }; }
  if (m.sep) { ux += m.sep.x * 1.2; uz += m.sep.z * 1.2; }
  const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
  // a body eases into its pace and out of it (ACCEL m/s²), so the legs ramp walk → run instead of popping, and corners round off
  const v = me.velocity ?? { x: 0, z: 0 }, slow = d < 1.2 && to === goal ? Math.max(0.35, d / 1.2) : 1;
  me.velocity = { x: ease(v.x ?? 0, ux * speed * slow, dt), y: (v.y ?? 0) - 20 * dt, z: ease(v.z ?? 0, uz * speed * slow, dt) };
  if (me.state.turnTo === "none" && (Math.hypot(v.x ?? 0, v.z ?? 0) > 0.1 || d > 0.3)) face(me, ux, uz, dt); // a walking body's heading is humanoid-locomotion's (turnTo "movement"); two turners fought on every sidestep
}
const ACCEL = 9, DECEL = 14; // m/s² (Savi's picks): a jog starts in about half a second, a stop lands in a step
function ease(cur, want, dt) { const k = (Math.abs(want) > Math.abs(cur) ? ACCEL : DECEL) * dt, d = want - cur; return Math.abs(d) <= k ? want : cur + Math.sign(d) * k; }
function stop(me, dt) { const v = me.velocity ?? { x: 0, z: 0 }; me.velocity = { x: ease(v.x ?? 0, 0, dt), y: (v.y ?? 0) - 20 * dt, z: ease(v.z ?? 0, 0, dt) }; }
function face(me, dx, dz, dt) {
  const want = Math.atan2(-dx, -dz) * 57.2958, cur = me.rotation?.yaw ?? 0, d = ((want - cur + 540) % 360) - 180;
  if (Math.abs(d) > 3) me.rotation = { yaw: cur + d * Math.min(1, dt * 8) };
}
// the gait is the legs' business (scripts/humanoid-locomotion.js reads the speed the body moved and plays each clip at its pace): this only notes the intent
function gait(me, m, kind) { m.gait = kind; }

// two-handed aim: both hands reach for the target's chest, followed every frame; written only when the target changes
// the pistol: on the right hip while calm, in the right hand while fighting
function holster(ctx, me, m, drawn) {
  if (m.drawn === drawn && m.holsterV === 2) return;
  const gun = heldOf(ctx, me); // the weapon, never the head, hair or ears
  if (!gun) return; m.drawn = drawn; m.holsterV = 2; if (!!me.state.armed !== !!drawn) me.state.armed = !!drawn; // critter.js: a drawn weapon walks and runs the warrior's way
  const ranged = !!(WP[me.state.arm ?? gun.state?.kind ?? "pistol"] ?? WP.pistol).ranged;
  // calm: a gun rides slung across the back; a melee weapon is put away out of sight. a fight brings either to the right hand
  gun.visible = drawn || ranged;
  gun.attachment = drawn ? { bone: "RightHand" } : { bone: "Spine2" };
  gun.feetPosition = drawn ? { x: 0, y: 0, z: 0 } : { x: 0, y: 0.02, z: 0.2 }; // +z of Spine2 is the back on these rigs; -z sat it on the chest
  gun.rotation = drawn ? { yaw: 0, pitch: 0, roll: 0 } : { yaw: 0, pitch: -90, roll: 35 };
  if ((ranged || drawn) && ctx.now() - (m.holsterSnd ?? 0) > 1500 && (m.holsterSnd = ctx.now())) heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-gun-holster-leather.mp3", position: me.feetPosition, volume: 0.5, maxDistance: 15 });
}
// a straight walk to a spot within 6 m that the threat has no line of sight to: cover. null when there is none.
function findCover(ctx, me, t) {
  const p = me.feetPosition, tc = chest(t.feetPosition); let best = null, bs = 1e9;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    for (const r of [3, 5.5]) {
      const c = { x: p.x + Math.cos(a) * r, y: p.y, z: p.z + Math.sin(a) * r };
      if (!clearLine(ctx, me, p, c)) continue; // an unblocked walk there
      const cc = chest(c), dx = cc.x - tc.x, dy = cc.y - tc.y, dz = cc.z - tc.z, l = Math.hypot(dx, dy, dz) || 1;
      if (!raycast(ctx, tc, { x: dx / l, y: dy / l, z: dz / l }, { distance: l - 0.2, physicsOnly: true, bodies: "static", ignoreEntities: [me.id, t.id] })) continue; // the threat can see it: not cover
      const cost = r + (flat(c, t.feetPosition) < flat(p, t.feetPosition) - 1 ? 4 : 0); // behind something, and not toward the threat
      if (cost < bs) { bs = cost; best = c; }
    }
  }
  return best;
}
// going to look at a dead creature (the one they killed, or one they came upon): weapon up on the way, a crouch over it, a word, then it is let go
function inspect(ctx, me, m, now, dt) {
  const I = m.inspect, o = ctx.getObject(I.id);
  if (now - I.at > 30000) { m.inspect = null; work(me, m, null); return false; }
  const px = o ? o.feetPosition.x : I.x, pz = o ? o.feetPosition.z : I.z, d = flat({ x: px, z: pz }, me.feetPosition);
  if (I.phase === "walk") {
    holster(ctx, me, m, !!I.hostile); work(me, m, null); aim(me, m, null);
    if (d > 1.5) { gait(me, m, d > 8 ? "run" : "walk"); moveAlong(ctx, me, m, { x: px, y: me.feetPosition.y, z: pz }, d > 8 ? G.run : G.walk * 1.15, dt); return true; }
    I.phase = "look"; I.until = now + 2200 + ctx.random() * 1200; bark(ctx, me, "inspect", true);
  }
  stop(me, dt); gait(me, m, "idle"); aim(me, m, null); work(me, m, CROUCH); face(me, px - me.feetPosition.x, pz - me.feetPosition.z, dt);
  if (now > I.until) { m.inspect = null; work(me, m, null); holster(ctx, me, m, false); bark(ctx, me, "inspected", true); if (o?.state) o.state.inspectUntil = now; return false; } // the body can go now
  return true;
}
const m3 = (me) => (me.session.c3 ??= {});
// a gun on a target: the player's aim takes (level, walk, crouch, pitched up or down) and, for a long gun, both hands on it; null lowers it
function aim(me, m, t) {
  const id = t?.id ?? null, now = m.nowT ?? 0, A = WP[me.state.arm];
  if (m.aimAt === id && (!id || now < (m.aimNext ?? 0))) return;
  const fresh = m.aimAt !== id; m.aimAt = id; m.aimNext = now + 300;
  if (!id || !A?.ranged) { aimPose(me, null, null); if (fresh) me.bones = baseBones(me.state.build, me.state.look ?? me.state.wear); return; }
  const o = chest(me.feetPosition), q = chest(t.feetPosition), dx = q.x - o.x, dz = q.z - o.z, hh = Math.hypot(dx, dz) || 1;
  const fam = famOf(me.state.arm), pitch = Math.atan2(q.y - o.y, hh), yaw = Math.atan2(-dx, -dz);
  aimPose(me, fam, aimMode(me, true, false), pitch);
  // long guns too: clips alone, no hand IK (see body3.js stance)
  if (fresh) me.bones = baseBones(me.state.build, me.state.look ?? me.state.wear);
}


// combat barks: a shout over the head (ui.js bubble + subtitle) and the speaker's voice; a short gap so they never talk over themselves
const VOICES = { "meg-ale": "ale", "meg-ortiz": "ortiz", "meg-callum": "callum", "surv-wren": "wren", "surv-hollis": "hollis", "surv-mags": "mags" };
const BVO = (who, line) => vo(who, line)
// a few bark kinds are written under a person's plainer word for them
const BARK_AS = { ambientIdle: 'idle', lowHealth: 'hurt', move: 'idle' };
export function bark(ctx, o, kind, force) {
  const own = barkOf(o, BARK_AS[kind] ?? kind, () => ctx.random(), o?.place); // their own written line first (scripts/lib/dialogue.js)
  const pool = own ? [own] : o?.state?.barks?.[kind] ?? CHAT.barks?.[kind], now = ctx.now(), st = o?.state;
  if (!pool?.length || !st) return;
  if (st.dead || st.down || (st.hp ?? 1) <= 0) return; // KO'd or dead: silent (Shelly, Nov 9)
  if (!force && now - (st.line?.at ?? -1e9) < 3500) return;
  const t = pool[Math.floor(ctx.random() * pool.length)], d = 1300 + t.length * 55, who = hasVoice(String(o.id).split('/').pop()) ? String(o.id).split('/').pop() : st.voice ?? VOICES[o.id] ?? `${String(o.id).split('/').pop()}#${(o.state?.wear?.sex ?? o.state?.look?.sex) === 'f' ? 'f' : 'm'}`;
  st.line = { t, at: now, d };
  const p = o.feetPosition;
  heard(ctx, { clip: BVO(who, t), position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 1, refDistance: 3, maxDistance: 18 }, { audience: { nearby: p, radius: 18 } });
}
// Savi's picks: [clip, how long it holds (ms), weight, upper body only]
const GEST = {
  idle: [["cdn/clip-shrug.glb", 1800, 0.9, true], ["cdn/clip-nod-yes.glb", 1500, 0.8, true], ["cdn/clip-point.glb", 1900, 0.85, true], ["cdn/clip-laugh-loop.glb", 2600, 0.8, true], ["cdn/clip-shake-no.glb", 1500, 0.7, true], ["cdn/clip-clap-loop.glb", 1600, 0.6, true]],
  talk: [["cdn/clip-nod-yes.glb", 1400, 0.7, true], ["cdn/clip-shake-no.glb", 1400, 0.6, true], ["cdn/clip-shrug.glb", 1700, 0.8, true], ["cdn/clip-point.glb", 1700, 0.7, true], ["cdn/clip-laugh-loop.glb", 1800, 0.6, true]],
  cross: [["cdn/clip-angry.glb", 2200, 1, true], ["cdn/clip-shake-no.glb", 1500, 0.9, true]],
};
// their own life, every 1.5 s: a feared thing close makes them show it and back away; a player near hears what they want, now and then
function life(ctx, me, m, now) {
  if (now < (m.lifeAt ?? 0)) return; m.lifeAt = now + 1500
  // fear: only what they can SEE, and an armed hotel hand fights the hall's foes (combat owns those) instead of bolting from them
  const armed = me.state.arm && me.state.arm !== "fists"
  const L = (m.L ??= lifeOf(me.id)), tags = me.state.faction5 && !armed ? [...new Set([...(FEAR_TAGS[L.fear] ?? []), ...FOES])] : FEAR_TAGS[L.fear], p = me.feetPosition
  if (tags && !me.state.follow && !me.state.mjguest) {
    const t = ctx.query({ anyTags: tags, radius: me.state.faction5 ? 12 : 9 }).find((q) => !q.state?.dead && seesIt(ctx, me, q))
    if (t) {
      m.fearAt = now; const dx = p.x - t.feetPosition.x, dz = p.z - t.feetPosition.z, d = Math.hypot(dx, dz) || 1
      m.flee = { x: p.x + dx / d * 7, y: p.y, z: p.z + dz / d * 7, until: now + 2500 } // one committed run away, not a twitch a tick
      if (now - (m.fearSaid ?? 0) > 12000) { m.fearSaid = now; me.state.line = { t: FEAR_LINES[Math.floor(ctx.random() * FEAR_LINES.length)], at: now, d: 2200 } }
      return
    }
  }
  if (now - (m.wantSaid ?? 0) > 90000 && now - (me.state.line?.at ?? 0) > 20000 && ctx.random() < 0.08 && ctx.place.players.some((q) => Math.hypot(q.feetPosition.x - p.x, q.feetPosition.z - p.z) < 6)) {
    m.wantSaid = now; if (barkOf(me, BARK_AS.idle ?? "idle", () => ctx.random(), me.place) || me.state.barks?.idle) { bark(ctx, me, "idle", true); } else { const W = WANT_LINES(L.want); me.state.line = { t: W[Math.floor(ctx.random() * W.length)], at: now, d: 3000 }; } // a written character mutters their own voiced line, never a rolled backstory (Cap'n said "revenge on whatever took their crew")
  }
}
export function update(ctx, dt) {
  if (!ctx.self.state.temperV && ctx.self.state.attr) shapeTemper(ctx.self);
  const me = ctx.self, s = me.state, m = (me.session.m ??= { waved: {}, next: 0, shots: 0 }), now = ctx.now();
  m.nowT = now; tick3(me, now); // release finished combat takes
  { const A = WP[me.state.arm]; carry3(me, me.state.arm, !!A && !A.ranged && !!me.state.armed && (me.state.hp ?? 1) > 0 && now - (m3(me).at ?? 0) > 1000); } // a drawn melee weapon is carried across the body between swings, as a player's is (scripts/lib/body3.js)
  if (m.dressed !== 5) { m.dressed = 5; if (!s.dead) dress(ctx, me); }
  // empty level or far-off NPC: sleep to save CPU (perf)
  if (!ctx.place.players.length) { ctx.sleep(2); return; }
  if (knocked(ctx, me, now, dt)) return; // kicked flat: down a beat, then back up
  let nearPlayerDist = 1e9; const f = me.feetPosition;
  for (const p of ctx.place.players) { const d = Math.hypot(p.feetPosition.x - f.x, p.feetPosition.z - f.z); if (d < nearPlayerDist) nearPlayerDist = d; }
  if (!s.follow && !s.target && !m.down && !m.talking) {
    if (nearPlayerDist > 70) { ctx.sleep(2); return; } // past sight: frozen. 45 m froze Level 31's crew in plain view across the hall (Shelly: "all of them were just standing")
    if (nearPlayerDist > 45 && !m.aimAt && !m.inspect && !m.flee) { ctx.sleep(0.4); dt += 0.4; }
    else if (nearPlayerDist > 28 && !m.aimAt && !m.inspect && !m.flee) { ctx.sleep(0.2); dt += 0.2; }
    else if (nearPlayerDist > 18 && !m.aimAt && !m.inspect && !m.flee) { ctx.sleep(0.1); dt += 0.1; }
  }
  if (!m.armed && !s.dead && now - (m.bornAt ??= now) > 1500) arm(ctx, me, m); // after the spawner has handed over its weapon
  if (m.armed && now - (m.sweptAt ?? 0) > 10000) { m.sweptAt = now; const all = weaponsOf(ctx, me); if (all.length > 1) { const k = all.find((w) => w.id === m.heldId) ?? all[0]; m.heldId = k.id; for (const w of all) if (w !== k) ctx.destroy(w.id); } } // spares that landed after arming go too
  // essential: whoever walks with a player drops to a knee instead of dying, then gets back up
  // a companion who fell anyway (killed by a path that set dead directly) comes back too
  if (s.dead && s.follow && ctx.place.players.some((p) => p.id === s.follow)) { s.dead = false; s.hp = 0; }
  // back on their feet: the corpse state (ragdoll, "'s body" name, loot list) comes off
  if (m.down && !s.dead && (s.hp ?? 1) > 0) {
    m.down = false; me.ragdoll = null; m.armed = false; m.dressed = 0;
    if (/'s body$/.test(s.name ?? "")) s.name = s.name.replace(/'s body$/, "");
    delete s.items; delete s.look;
  }
  if (!s.dead && (s.hp ?? 1) <= 0 && s.follow && ctx.place.players.some((p) => p.id === s.follow)) {
    s.hp = Math.max(1, Math.round((s.maxHp ?? 100) * 0.3)); s.stunUntil = now + 4000;
    animate(ctx, me.id, { "feetPosition.y": [me.feetPosition.y, me.feetPosition.y - 0.35, me.feetPosition.y - 0.35, me.feetPosition.y] }, { duration: 4 });
    ctx.emit("damageNumber", { position: { x: me.feetPosition.x, y: me.feetPosition.y + 1.8, z: me.feetPosition.z }, text: "DOWN", color: "#ffb347" });
  }
  if (s.dead || (s.hp ?? 1) <= 0) {
    if (!s.dead) s.dead = true; // a body is a body: looted, never talked to
    if (me.anim.idle || me.anim.walk || me.anim.run) { me.anim.idle = null; me.anim.walk = null; me.anim.run = null; }
    if (!m.down) {
      m.down = true; bark(ctx, me, "death", true);
      for (const id of Object.keys(VOICES)) { const o = ctx.place.objects[id]; if (o && id !== me.id && !o.state?.dead && (o.state?.hp ?? 1) > 0 && Math.hypot(o.feetPosition.x - me.feetPosition.x, o.feetPosition.z - me.feetPosition.z) < 30) { bark(ctx, o, "allyDown", true); break; } } // the nearest friend sees it
      stop(me, dt); aim(me, m, null); me.anim.talk = null; me.anim.hit = null; me.anim.wave = null; me.bones = baseBones(me.state.build, me.state.look ?? me.state.wear);
      // a ragdoll: the body drops where it was hit, in its own fur and jacket, knocked back off its feet
      const yaw = ((typeof me.rotation === "number" ? me.rotation : me.rotation?.yaw) ?? 0) * Math.PI / 180;
      me.ragdoll = { impulse: { x: Math.sin(yaw) * 60, y: 25, z: Math.cos(yaw) * 60 }, settleSeconds: 2 };
      if (s.items === undefined) s.items = rollNpcPocketLoot(ctx, me).join(","); // held weapon, matching ammo, place-leveled pockets, and worn garments
      if (!s.look) s.look = lookOfNpc(me); // the body's look as it fell; looting a garment strips it off
      if (!/'s body$/.test(s.name ?? "")) s.name = (s.name ?? "Agent") + "'s body"; // a hand-off re-runs this: name it once
      ctx.after(90, "vanish", {});
    }
    if (s.look && m.stripped !== s.items) { // a garment taken from the remains comes off the body
      m.stripped = s.items;
      const l = stripTo(s.look, String(s.items ?? "").split(",").filter(Boolean));
      const cur = me.primitive?.params ?? s.wear ?? s.look;
      if (cur && SLOTS.some((k) => (cur[k] ?? "none") !== l[k])) { const next = { ...cur, ...Object.fromEntries(SLOTS.map((k) => [k, l[k]])) }; rewear(ctx, me, next); if (!me.primitive) s.wear = next; }
    }
    return;
  }
  life(ctx, me, m, now);
  if (m.flee && now < m.flee.until && !s.follow) { gait(me, m, "run"); moveAlong(ctx, me, m, m.flee, 4.2, dt); return; } // holds the run till it's done
  else if (m.flee) m.flee = null;
  // a flinch every time something takes hp off them
  if (m.lastHp != null && (s.hp ?? 0) < m.lastHp - 0.5) {
    m.hitAt = now;
    if (ctx.random() < 0.6) bark(ctx, me, "hit");
    stagger3(ctx, me);
  }
  m.lastHp = s.hp;
  // life: natural blinks, cute ear twitches, and responsive facial expressions
  if (!m.nextBlink || now > m.nextBlink) { m.nextBlink = now + 2400 + ctx.random() * 3200; m.blinkUntil = now + 130; }
  const isBlinking = now < (m.blinkUntil ?? 0);
  if (!m.nextTwitch || now > m.nextTwitch) { m.nextTwitch = now + 5000 + ctx.random() * 8000; m.twitchUntil = now + 180; m.twitchEar = ctx.random() < 0.5 ? "EarL" : "EarR"; }
  const isTwitching = now < (m.twitchUntil ?? 0);
  if (isTwitching && !s.dead && !me.bones) {
    const dir = m.twitchEar === "EarL" ? -1 : 1;
    me.bones = { ...baseBones(s.build, s.look ?? s.wear), [m.twitchEar]: { rotate: [0, 0, dir * 24] } };
  } else if (!isTwitching && (!me.bones || me.bones.EarL || me.bones.EarR || !me.bones.Head) && !m.aimAt && !m.cow) {
    me.bones = baseBones(s.build, s.look ?? s.wear);
  }
  // talking: interact.js stamps state.talkAt and talkTo when a player presses E on them
  const reaction = s.socialReaction;
  if (reaction && now - reaction.at < 1000 && reaction.at !== m.socialReactionAt) {
    m.socialReactionAt = reaction.at;
    if (reaction.kind === "drawn") {
      m.brandishAt = reaction.at; m.brandishPl = reaction.by;
      me.anim.gest = { clip: "cdn/clip-shake-no.glb", loop: "once", weight: 0.9, blendIn: 0.2, blendOut: 0.35, mask: { from: "Spine" } };
      m.gestEnd = now + 1500;
    } else if (reaction.kind === "close") {
      m.bumpAt = reaction.at;
    }
  }
  const talkLen = s.line && typeof s.line === "object" && s.line.at >= (s.talkAt ?? 0) - 50 ? Math.max(2600, (s.line.d ?? 0) + 300) : 2600; // the gesture lasts the line, not a fixed beat
  const talking = s.talkAt && now - s.talkAt < talkLen;
  if (talking !== !!m.talking) { m.talking = talking; me.anim.talk = talking ? { clip: (s.wear?.sex ?? s.look?.sex) === "f" ? "cdn/clip-talk-female-loop.glb" : "cdn/clip-talk-loop.glb", loop: "loop", weight: 1, blendIn: 0.25, blendOut: 0.4, mask: { from: "Spine" } } : null; }
  // one-shot clips end: cleared after their length, so a body never holds a wave's or a flinch's last frame
  if (me.anim.hit && now - (m.hitAt ?? 0) > 900) me.anim.hit = null;
  if (me.anim.wave && now - (m.wavedAt ?? 0) > 2400) me.anim.wave = null;
  // gestures: idle fidgets when standing about, hand talk in conversation, a scowl when crossed; one channel, upper body over the gait
  if (m.gestEnd && now > m.gestEnd) { me.anim.gest = null; m.gestEnd = 0; }
  if (!s.dead && !m.aimAt && !m.gestEnd && now > (m.gestNext ?? 0)) {
    const spd = Math.hypot(me.velocity?.x ?? 0, me.velocity?.z ?? 0), cross = s.angry && Object.keys(s.angry).length;
    const pool = talking ? GEST.talk : spd > 0.35 ? null : cross ? GEST.cross : GEST.idle;
    m.gestNext = now + (talking ? 2200 + ctx.random() * 2600 : 6000 + ctx.random() * 9000);
    if (pool) { const [clip, ms, w, upper] = pool[Math.floor(ctx.random() * pool.length)]; me.anim.gest = { clip, loop: /loop/.test(clip) ? "loop" : "once", weight: w, blendIn: 0.25, blendOut: 0.35, ...(upper ? { mask: { from: "Spine" } } : {}) }; m.gestEnd = now + ms; }
  }
  // head morph sync: articulates speech, smiles when waving, winces when hit, blinks naturally
  if (!s.dead && (m.headChk ?? 0) < now) {
    const isFem = (s.wear?.sex ?? s.look?.sex) === "f";
    const baseExpr = s.wear?.expr || s.look?.expr || "neutral";
    let curExpr = baseExpr;
    if (now - (m.hitAt ?? 0) < 650 || now - (m.fearAt ?? 0) < 1600) curExpr = "scared";
    else if (now - (m.wavedAt ?? 0) < 2200) curExpr = "catmouth"; // :3 on hello
    else if (talking) curExpr = s.mood === "angry" ? "angry" : s.mood === "scared" ? "scared" : s.mood === "annoyed" ? "unimpressed" : s.mood === "happy" ? "joy" : "neutral";
    else if (m.aimAt) curExpr = "cocky";
    if (curExpr !== m.lastExpr || isBlinking !== m.lastBlink || talking) {
      m.lastExpr = curExpr;
      m.lastBlink = isBlinking;
      const headObj = HUMAN ? null : ctx.getObject(me.id + "/" + HEAD_ID); // read fresh: a head rebuilt or gone never takes a stale write
      if (HUMAN && me.model) { // human faces (Shelly Nov 9 #116046): the body carries X_ keys; the mouth follows the line's letters, still once it is said
        const lt = typeof s.line === "string" ? s.line : s.line?.t, la = typeof s.line === "string" ? (s.talkAt ?? 0) : (s.line?.at ?? 0), mouth = lt ? mouthAt(lt, now - la - 120) : null;
        const key = curExpr + (isBlinking ? 1 : 0) + (mouth ? mouth.map((v) => v.toFixed(1)).join() : "");
        if (key !== m.hFaceK) { m.hFaceK = key; const base = {}; for (const [k, v] of Object.entries(me.morph ?? {})) if (!k.startsWith("X_")) base[k] = v; me.morph = { ...base, ...humanFace(curExpr, isBlinking, mouth) }; }
      }
      else if (headObj) {
        const lookData = { ...(s.look ?? s.wear) };
        if (talking) {
          // the mouth follows the line's letters while it is said (as the human faces do), then rests closed
          const lt = typeof s.line === "string" ? s.line : s.line?.t, la = typeof s.line === "string" ? (s.talkAt ?? 0) : (s.line?.at ?? 0);
          const mouth = lt ? mouthAt(lt, now - la - 120) : null;
          if (mouth) lookData.mouth = mouth; else if (!lt) { lookData.talking = true; lookData.talkTime = now / 1000; }
        }
        if (now - (m.hitAt ?? 0) < 650) lookData.hurt = true;
        // perf (Nov 12): a talking face rewrote its morph every tick; now only when expression, blink or the mouth's shape (to a tenth) moved
        const fk = curExpr + (isBlinking ? 1 : 0) + (lookData.hurt ? "h" : "") + (lookData.mouth ? lookData.mouth.map((v) => v.toFixed(1)).join() : lookData.talking ? "t" + Math.floor(now / 66) : "");
        if (fk !== m.faceK) { m.faceK = fk; headObj.morph = faceMorph(curExpr, isBlinking, isFem, lookData); }
      }
      else m.headChk = now + 30000; // no head on this body: stop asking for 30 s
    }
  }
  // held in conversation: while a player's dialogue is open on this one (player.state.talkWith), it stops where it stands and faces them; a threat or a hit still breaks it
  const listener = !s.dead && !m.aimAt && now - (m.hitAt ?? 0) > 3000 ? ctx.place.players.find((p) => p.state?.talkWith === me.id && !hostileReason(ctx, me, p) && Math.hypot(p.feetPosition.x - me.feetPosition.x, p.feetPosition.z - me.feetPosition.z) < 7) : null;
  if (listener) { stop(me, dt); face(me, listener.feetPosition.x - me.feetPosition.x, listener.feetPosition.z - me.feetPosition.z, dt); s.talkAt = Math.max(s.talkAt ?? 0, now - 2000); return; }
  // a companion a player talked into tagging along (scripts/talk.js): their leader is home, so it walks after them and fights what comes at them
  let lead = s.follow ? ctx.place.players.find((p) => p.id === s.follow) : null;
  if (s.follow && lead && !(lead.state?.crew ?? []).includes(me.id)) { s.follow = null; lead = null; } // hired on another save: this save never took them on
  if (s.follow) { if (lead) m.lostAt = 0; else m.lostAt ||= now; if ((lead && incidentOf(ctx, me, lead)) || (!lead && now - m.lostAt > 20000)) { s.follow = null; lead = null; } }
  // a day's work (state.rounds: stops with a dwell, a chore clip, a thing to face): the post moves stop to stop
  const waiting = !!(s.follow && s.cmd === "wait" && s.waitAt); if (waiting) lead = null; // told to wait: stays on the spot, still fights what comes at it
  const stop0 = !lead && !s.follow && s.rounds?.length ? s.rounds[(s.ri ?? 0) % s.rounds.length] : null;
  const home = lead ? lead.feetPosition : (waiting ? s.waitAt : (stop0 ?? s.home ?? me.feetPosition));
  const t = s.follow && s.cstance === "hold" ? null : pickTarget(ctx, me, m); // hold fire: a companion that is told so starts nothing
  const tid = t && flat(t.feetPosition, home) < G.leash ? t.id : null;
  if (!t && !s.follow && cowed(ctx, me, m, now, dt)) return; // a gun pointed at them (Shelly Nov 12): hands up, draw back, or run, by nerve and SPECIAL
  if (tid !== (m.barkT ?? null)) {
    const prev = m.barkT ? ctx.getObject(m.barkT) : null, prevDead = prev && (prev.state?.dead || (prev.state?.hp ?? 1) <= 0);
    if (prevDead && corpseOf(prev) && !VERMIN(prev) && !m.inspect && !s.follow) { m.inspect = { id: prev.id, x: prev.feetPosition.x, z: prev.feetPosition.z, at: now, phase: "walk", hostile: true }; prev.state.inspectUntil = now + 16000; } // what they killed: go and see it's dead
    if (tid) {
      const pl = ctx.place.players.find(p => p.id === tid);
      bark(ctx, me, pl ? "hostile" : (prevDead ? "kill" : "spot"), !!prevDead);
      if (pl && now - (pl.state.hostilityNoticeAt ?? -Infinity) > 4500) {
        const text = explainHostility(me, hostileReason(ctx, me, pl));
        if (text) { pl.state.notice = { text, at: now }; pl.state.hostilityNoticeAt = now; }
      }
    }
    else if (m.barkT) { bark(ctx, me, prevDead || !prev ? "kill" : "clear", true); m.clearAt = now + 2600; }
    m.barkT = tid;
  }
  if (m.clearAt && now > m.clearAt) {
    m.clearAt = 0;
    if (!tid) {
      bark(ctx, me, "relief", true);
      me.anim.gest = { clip: "cdn/clip-nod-yes.glb", loop: "once", weight: 0.8, blendIn: 0.2, blendOut: 0.35, mask: { from: "Spine" } };
      m.gestEnd = now + 1500;
    }
  }
  const fighting = !!(t && flat(t.feetPosition, home) < G.leash);
  if (!fighting && !m.inspect && !lead && !s.mjguest && now > (m.corpseAt ?? 0)) { // no one to fight: notice a dead creature close by that nobody has checked, and go and see
    m.corpseAt = now + 2000; m.seen ??= {};
    const o = ctx.query({ anyTags: HOSTILE, radius: 14 }).find((c) => corpseOf(c) && !VERMIN(c) && !m.seen[c.id] && !c.state?.inspectUntil && seesIt(ctx, me, c));
    if (o) {
      m.seen[o.id] = true;
      o.state.inspectUntil = now + 16000;
      m.inspect = { id: o.id, x: o.feetPosition.x, z: o.feetPosition.z, at: now, phase: "walk", hostile: false };
      bark(ctx, me, "found", true);
    }
  }
  if (!fighting && m.inspect && inspect(ctx, me, m, now, dt)) return;
  holster(ctx, me, m, fighting);
  if (fighting) {
    const visible=seesIt(ctx,me,t);
    if(visible) m.lastEnemy={id:t.id,at:now,pos:{...t.feetPosition}};
    else {
      aim(me,m,null);
      const last=m.lastEnemy;
      if(last?.id===t.id && now-last.at<5000 && flat(last.pos,me.feetPosition)>0.8) { gait(me,m,"run"); moveAlong(ctx,me,m,last.pos,G.run,dt); }
      else { m.curTarget=null; gait(me,m,"idle"); stop(me,dt); }
      return;
    }
    work(me, m, m.cover && now < m.cover.until && flat(m.cover, me.feetPosition) < 0.9 ? CROUCH : null);
    // nerve: break and run when it fails them; cornered (arm's length) they lash out anyway. Armed people stand and fight: a lone coward still runs,
    // but one with a friend near holds until it is badly hurt; the unarmed (fists) run unless brave.
    const nv = s.nerve ?? "steady", hpF = (s.hp ?? 1) / (s.maxHp ?? 100), dT = flat(t.feetPosition, me.feetPosition);
    if (now > (m.allyAt ?? 0)) { m.allyAt = now + 1000; m.ally = ctx.query({ tags: ["npc"], radius: 14 }).some((n) => n.id !== me.id && !DEAD(n) && !n.tags?.includes?.("l5staff") && !n.state?.mjguest && n.state?.arm && n.state.arm !== "fists" && faction(n) && faction(n) === faction(me)); }
    const hpBreak = nv === "brave" ? 0.15 : nv === "steady" ? 0.3 : 0.6;
    const breaks = nv === "frenzied" ? false : s.arm === "fists" ? nv !== "brave" : hpF < hpBreak || (nv === "coward" && !m.ally);
    if (breaks && dT > 1.6) {
      holster(ctx, me, m, false); aim(me, m, null); gait(me, m, "run");
      const dx = me.feetPosition.x - t.feetPosition.x, dz = me.feetPosition.z - t.feetPosition.z, l = Math.hypot(dx, dz) || 1;
      moveAlong(ctx, me, m, { x: me.feetPosition.x + dx / l * 6, y: me.feetPosition.y, z: me.feetPosition.z + dz / l * 6 }, (G.sprint ?? 7) * (nv === "coward" ? 1.05 : 1), dt); // a broken nerve sprints
      if (now - (m.fleeSaid ?? 0) > 9000) { m.fleeSaid = now; s.line = { t: barkOf(me, 'flee', () => ctx.random(), me.place) ?? FLEE[nv][Math.floor(ctx.random() * FLEE[nv].length)], at: now, d: 2000 }; }
      m.fearAt = now; return;
    }
    const d = flat(t.feetPosition, me.feetPosition), see = seesIt(ctx, me, t), reloading = now < (m.reloadUntil ?? 0);
    const A = WP[s.arm] ?? WP.pistol, ranged = !!A.ranged, range = ranged ? (s.arm === "shotgun" ? 9 : G.range) : 1.4 + (A.reach ?? 2.4) * 0.2; // melee closes to arm's length
    // cover: a gun reloading, or one that was just hit or is hurt, ducks behind the nearest thing the target cannot see through, crouches, then comes back out
    const wantCover = ranged && dT > 2.2 && (reloading || now - (m.hitAt ?? 0) < 2500 || (hpF < 0.6 && nv !== "brave"));
    if (wantCover) {
      if ((!m.cover || now >= m.cover.until) && now > (m.coverTry ?? 0)) { m.coverTry = now + 1200; const c = findCover(ctx, me, t); if (c) { m.cover = { ...c, until: now + Math.max(2200, (m.reloadUntil ?? 0) - now + 700) }; if (now - (m.coverSaid ?? 0) > 8000) { m.coverSaid = now; bark(ctx, me, "cover", true); } } }
      if (m.cover && now < m.cover.until) {
        if (flat(m.cover, me.feetPosition) > 0.7) { gait(me, m, "run"); aim(me, m, null); moveAlong(ctx, me, m, m.cover, G.run, dt); }
        else { gait(me, m, "idle"); stop(me, dt); aim(me, m, null); face(me, t.feetPosition.x - me.feetPosition.x, t.feetPosition.z - me.feetPosition.z, dt); }
        return;
      }
    } else if (m.cover) m.cover = null;
    if (d > range || !see) { gait(me, m, "run"); aim(me, m, null); moveAlong(ctx, me, m, t.feetPosition, d > range + 8 ? (G.sprint ?? 7) : G.run * (ranged ? 1 : 1.12), dt); } // a long gap is sprinted
    else { gait(me, m, "idle"); stop(me, dt); aim(me, m, reloading || !ranged ? null : t); face(me, t.feetPosition.x - me.feetPosition.x, t.feetPosition.z - me.feetPosition.z, dt); }
    if (!ranged && see && d <= range && now >= m.next) { m.next = now + Math.max(700, (A.cooldown ?? 0.7) * 1700) * (0.85 + ctx.random() * 0.3); swing(ctx, me, t, A); }
    if (ranged && see && d <= range && !reloading && now >= m.next) {
      m.next = now + G.fireEvery * 1000 * (s.arm === "shotgun" ? 1.9 : s.arm === "smg" ? 0.28 : 1) * (0.85 + ctx.random() * 0.3); shoot(ctx, me, t, A);
      if (++m.shots >= (A.magSize ?? 8)) { m.shots = 0; m.reloadUntil = now + 1800; bark(ctx, me, "reload", true); heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-pistol-magazine-reload-click.mp3", position: me.feetPosition, volume: 0.6, maxDistance: 20 }); } // arms drop, a fresh mag
    }
    return;
  }
  aim(me, m, null);
  if (!lead && !m.inspect && social(ctx, me, m, now, dt, { gait, moveAlong, stop, face })) return; // idle life: small talk with a neighbour, drifting about (lib/npc-social.js)
  if (lead) { const d = flat(home, me.feetPosition); if (d > TK.join.near) { const run = d > TK.join.run; gait(me, m, run ? "run" : "walk"); moveAlong(ctx, me, m, home, d > TK.join.run * 2.5 ? (G.sprint ?? 7) : run ? G.run : G.walk, dt); return; } }
  else if (flat(home, me.feetPosition) > 1) {
    work(me, m, null); m.at = 0; m.leftAt ||= now;
    if (stop0 && now - m.leftAt > 25000) { s.ri = ((s.ri ?? 0) + 1) % s.rounds.length; m.leftAt = now; m.path = null; } // can't reach it: on to the next chore
    gait(me, m, "walk"); moveAlong(ctx, me, m, home, G.walk, dt); return;
  }
  stop(me, dt); gait(me, m, "idle"); m.path = null; m.leftAt = 0;
  // at the post: turn to whoever walks up, wave once (not at someone the camp is at war with)
  let close = null, best = 7;
  for (const pl of ctx.place.players) { const d = flat(pl.feetPosition, me.feetPosition); if (d < best) { best = d; close = pl; } }
  const chatTo = s.talkTo && now - (s.talkAt ?? 0) < 6000 ? ctx.place.objects[s.talkTo] : null; // mid-conversation with another npc
  if (stop0) {
    m.at ||= now;
    const busy = (close && best < 3) || chatTo || talking;
    let act = busy ? null : stop0.act ?? null;
    if (act && /sit/.test(act) && !s.sit) act = null; // the sit clip only plays seated (state.sit); on the floor it lies flat like a corpse
    work(me, m, act);
    if (!busy && !close && stop0.look) face(me, stop0.look.x - me.feetPosition.x, stop0.look.z - me.feetPosition.z, dt);
    if (!busy && now - m.at > (stop0.dwell ?? 10) * 1000) { s.ri = ((s.ri ?? 0) + 1) % s.rounds.length; m.at = 0; if (ctx.random() < 0.08) bark(ctx, me, "move"); }
    if (!close && now - m.at > 6000 && now - (m.ambBarkAt ?? 0) > 42000 && ctx.random() < 0.06) {
      m.ambBarkAt = now;
      bark(ctx, me, "ambientIdle");
    }
  }
  // campfire / heat source warming: if standing near fire/hearth/stove, warm hands periodically
  if (now > (m.fireChk ?? 0)) {
    m.fireChk = now + 4000;
    m.nearFire = ctx.query({ radius: 2.8 }).some((o) => /fire|stove|oven|hearth/.test(String(o.id)) || o.state?.kind === "fire" || o.state?.kind === "hearth-oven");
  }
  if (m.nearFire && !m.aimAt && !talking && !me.anim.gest && now > (m.gestNext ?? 0) && ctx.random() < 0.45) {
    me.anim.gest = { clip: "cdn/clip-clap-loop.glb", loop: "once", weight: 0.85, blendIn: 0.3, blendOut: 0.35, mask: { from: "Spine" } };
    m.gestEnd = now + 2400;
    m.gestNext = now + 10000 + ctx.random() * 8000;
  }
  if (chatTo && !(close && best < 3)) { face(me, chatTo.feetPosition.x - me.feetPosition.x, chatTo.feetPosition.z - me.feetPosition.z, dt); ctx.sleep(0.1); return; }
  if (!close) {
    if (now > (m.glance ?? 0)) { m.glance = now + 5000 + ctx.random() * 5000; animate(ctx, me.id, { "bones.Head.yaw": [0, (ctx.random() - 0.5) * 80, 0] }, { duration: 2.8, easing: "easeInOutSine" }); } // a glance down the halls
    ctx.sleep(0.5); return;
  }
  face(me, close.feetPosition.x - me.feetPosition.x, close.feetPosition.z - me.feetPosition.z, dt);

  // The player dialogue behavior handles weapon warnings and contact.
  const eq = close.state?.equipped;
  if (!hostileReason(ctx, me, close)) {
    if (m.brandishPl === close.id && (close.state?.sheathed || eq === "fists") && now - m.brandishAt < 7000) {
      m.brandishPl = null;
      bark(ctx, me, "holstered", true);
      me.anim.gest = { clip: "cdn/clip-nod-yes.glb", loop: "once", weight: 0.85, blendIn: 0.2, blendOut: 0.35, mask: { from: "Spine" } };
      m.gestEnd = now + 1400;
    }
    // 3. Empathy for low HP or low sanity
    if (best < 5.0 && now - (m.empathyAt ?? 0) > 32000 && !talking) {
      const plHp = close.state?.hp, plMax = close.state?.maxHp ?? 100, plSan = close.state?.sanity;
      if (plHp != null && plHp > 0 && plHp < plMax * 0.35) {
        m.empathyAt = now;
        bark(ctx, me, "lowHealth", true);
        me.anim.gest = { clip: "cdn/clip-point.glb", loop: "once", weight: 0.8, blendIn: 0.2, blendOut: 0.35, mask: { from: "Spine" } };
        m.gestEnd = now + 1700;
      } else if (plSan != null && plSan < 30) {
        m.empathyAt = now;
        bark(ctx, me, "lowSanity", true);
        me.anim.gest = { clip: "cdn/clip-nod-yes.glb", loop: "once", weight: 0.8, blendIn: 0.2, blendOut: 0.35, mask: { from: "Spine" } };
        m.gestEnd = now + 1600;
      }
    }
  }

  if (!m.waved[close.id] && best < 5 && !hostileReason(ctx, me, close) && !close.state?.ads && now - (m.bumpAt ?? 0) > 3000) {
    m.waved[close.id] = true;
    m.wavedAt = now;
    me.anim.wave = { clip: "cdn/clip-wave-loop.glb", loop: "once", weight: 1, blendIn: 0.25, blendOut: 0.4, mask: { from: "Spine" } };
  }
}
function work(me, m, clip) {
  if (m.work === clip) return; m.work = clip;
  me.anim.work = clip ? { clip, loop: /loop/.test(clip) ? "loop" : "once", weight: 1, blendIn: 0.4, blendOut: 0.4 } : null;
}
export function dressLater(ctx) { dress(ctx, ctx.self); }
export function vanish(ctx) { const s = ctx.self.state; if (!s.dead && (s.hp ?? 1) > 0) return; ctx.destroy(ctx.self.id); } // a body that got back up stays

// ---- a gun pointed at them (Shelly Nov 12: "depending on the bravery of the npc + stats/special stats they should either raise their hand up, pull their gun out or flee")
// a player holding a ranged weapon out, within 18 m, the crosshair's heading on this body (a cone that narrows with distance) for 0.4 s, makes them choose once:
// draw = brave or tough and armed with a gun: weapon up on you, held, never the first shot; flee = quick on their feet (AGI) or a coward with room to run;
// hands = everyone else: frozen, hands raised, facing you. It lasts while the gun stays on them and 2.5 s after it drops. Savi's numbers.
const HANDS_UP = { "mixamorig:LeftArm": { rotate: [0, 0, 150] }, "mixamorig:RightArm": { rotate: [0, 0, -150] }, "mixamorig:LeftForeArm": { rotate: [0, 0, 25] }, "mixamorig:RightForeArm": { rotate: [0, 0, -25] } };
const COW = { range: 18, hold: 400, linger: 2500 };
import COW_LINES from "./lib/data/cow-lines.yml";
function cowSay(ctx, me, kind) {
  const now = ctx.now(), st = me.state, id = String(me.id).split('/').pop();
  const who = hasVoice(id) ? id : st.voice ?? VOICES[me.id] ?? `${id}#${(st.wear?.sex ?? st.look?.sex) === 'f' ? 'f' : 'm'}`;
  const all = COW_LINES[kind], acted = all.filter((l) => actedVoice(who, l)), L = acted.length ? acted : all, t = L[Math.floor(ctx.random() * L.length)]; // their recorded takes first
  st.line = { t, at: now, d: 1300 + t.length * 55 };
  const p = me.feetPosition, clip = BVO(who, t);
  if (clip) heard(ctx, { clip, position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 1, refDistance: 3, maxDistance: 18 }, { audience: { nearby: p, radius: 18 } });
}
function aimedBy(ctx, me) {
  const f = me.feetPosition;
  for (const p of ctx.place.players) {
    const ps = p.state ?? {}, eq = String(ps.equipped ?? "fists").split("~")[0];
    if (ps.sheathed || !ps.ads || eq === "fists" || !WP[eq]?.ranged || (ps.hp ?? 1) <= 0) continue; // aimed down sights at them, not just a weapon out (Shelly Nov 13)
    const dx = f.x - p.feetPosition.x, dz = f.z - p.feetPosition.z, d = Math.hypot(dx, dz);
    if (d > COW.range || d < 0.5) continue;
    const yaw = (p.camera?.rotation?.yaw ?? (typeof p.rotation === "number" ? p.rotation : p.rotation?.yaw) ?? 0) * Math.PI / 180;
    const off = Math.abs(((Math.atan2(-dx, -dz) - yaw) * 57.2958 + 540) % 360 - 180);
    if (off < Math.max(4, Math.atan2(0.45, d) * 57.2958)) return p;
  }
  return null;
}
function cowed(ctx, me, m, now, dt) {
  const s = me.state, C = m.cow;
  if (now >= (m.cowScan ?? 0)) { m.cowScan = now + 150; const p = aimedBy(ctx, me); m.cowBy = p?.id ?? null; if (p) m.cowSeen = now; if (!p) m.cowFirst = 0; else m.cowFirst ||= now; }
  if (!C) {
    if (!m.cowBy || now - m.cowFirst < COW.hold) return false;
    const p = ctx.place.players.find((q) => q.id === m.cowBy); if (!p) return false;
    const a = attrsOf(s), nv = s.nerve ?? "steady", gun = !!WP[s.arm]?.ranged;
    const grit = ({ brave: 0.6, steady: 0.3, coward: 0, frenzied: 1 })[nv] + (a.h + a.e - 10) * 0.04 + (a.l - 5) * 0.02;
    const kind = gun && grit >= 0.5 ? "draw" : (a.a >= 7 || (nv === "coward" && a.a >= 5)) ? "flee" : "hands";
    m.cow = { by: p.id, kind, at: now };
    cowSay(ctx, me, kind);
    ctx.emit("damageNumber", { position: { x: me.feetPosition.x, y: me.feetPosition.y + 2.1, z: me.feetPosition.z }, text: kind === "hands" ? "SURRENDERS" : kind === "draw" ? "STANDS GROUND" : "PANICS", color: kind === "draw" ? "#ff8a5c" : "#ffd36a", size: 0.9 }, { audience: { player: p.id } });
    if (kind === "flee") { const dx = me.feetPosition.x - p.feetPosition.x, dz = me.feetPosition.z - p.feetPosition.z, l = Math.hypot(dx, dz) || 1; m.flee = { x: me.feetPosition.x + dx / l * 14, y: me.feetPosition.y, z: me.feetPosition.z + dz / l * 14, until: now + 5000 }; m.cow = null; m.cowFirst = now + 6000; m.fearAt = now; return true; }
    return cowed(ctx, me, m, now, dt);
  }
  const p = ctx.place.players.find((q) => q.id === C.by);
  if (!p || (m.cowBy !== C.by && now - (m.cowSeen ?? 0) > COW.linger)) { // the gun went away: arms down, back to the day
    if (C.kind === "hands") me.bones = baseBones(s.build, s.look ?? s.wear); else { aim(me, m, null); holster(ctx, me, m, false); }
    if (p && ctx.random() < 0.6) cowSay(ctx, me, "calm");
    m.cow = null; m.cowFirst = 0; return false;
  }
  stop(me, dt); gait(me, m, "idle"); face(me, p.feetPosition.x - me.feetPosition.x, p.feetPosition.z - me.feetPosition.z, dt);
  if (C.kind === "hands") { if (!C.posed) { C.posed = true; aim(me, m, null); holster(ctx, me, m, false); me.bones = { ...baseBones(s.build, s.look ?? s.wear), ...HANDS_UP }; } }
  else { holster(ctx, me, m, true); aim(me, m, p); }
  return true;
}
