// Level 3's rare guests from the Terror Hotel (data: lib/data/l3-visits.yml). One manager, place "level3".
// Samantha (scripts/samantha.js, her own behavior) is set down by the brass lift for a few minutes, then blinks back to her hotel.
// A Death Rat pack (Level 5's rats, same model and numbers) surfaces in the maze, roams round its hole, bites the lone or hurt,
// scatters from light and raised weapons, and goes back down. A kill leaves its body with rat meat.
// state.force = "samantha" | "rats" starts one now.
import { heard } from "./lib/hear.js";
import V from "./lib/data/l3-visits.yml";
import { LIFT, cellAt, cellCenter, inGamma, zoneAt, N } from "./lib/level3.js";
import { stepToward, cellNear } from "./lib/maze3path.js";
import { E, SND, flat, yawTo, maxHpOf, downed, aloneOf, hit, becomeCorpse, killerOf } from "./lib/l5-hostile.js";
import { npcState } from "./lib/stats.js";
import { MODEL as SAM_GLB } from "./samantha.js";
const R = E.rat, rr = (ctx, [a, b]) => a + ctx.random() * (b - a);
const Z5 = LIFT.z + 4; // the cell in front of the guest lift (l3-lift5)
const SAM_HOME = { x: LIFT.x - 2.4, z: Z5 + 1.2 };
const SAM_SPOTS = [SAM_HOME, { x: LIFT.x - 2.2, z: Z5 - 1.1 }, { x: LIFT.x - 1.7, z: LIFT.z + 0.9 }, { x: LIFT.x - 3.2, z: Z5 + 0.2 }];
const MIST = `fx
pop mist burst=26 life=.8..1.4 on=sphere(.3).c(.25) v=sdir()*(.3..0.9)+up(.4) size=.18..0.34 acc=buoy(.4)+curl(.6)+drag(1.4) col=<.35,.8,.45> a=0>.3:.3>0 sz=$size*(.5>1.7) r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.8 g=1>0 r=light(<.5,1,.6>,$g*5,4)`;
const GRIT = `fx
pop dust burst=14 life=.6..1.1 on=disc(.35) v=up(.6..1.4)+sdir()*.5 size=.15..0.3 acc=buoy(.2)+drag(1.6) col=<.3,.27,.24> a=0>.35:.4>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
const EYES = `fx
pop tips n=2 at=box(.035,.01,.01).c(.24) size=.05 col=hdr(3,.25,.1)*flick(1.3,.35) a=.9 sz=$size r=sprite(soft-disc,add)`;
const BLOOD = `fx
pop drip burst=6 life=.4..0.7 v=sdir()*(.5..1.2)+up(.3) size=.03..0.05 acc=grav()*.8 col=<.35,.02,.03> a=1>0 floor=die r=sprite(soft-disc,alpha)`;
const LEG = (ph, a) => ({ pitch: ph ? [a, -a, a] : [-a, a, -a] });
const gait = (dur, a) => ({ clip: { duration: dur, tracks: { "tripo::0_Left_Limb_1": LEG(0, a), "tripo::0_Right_Limb_1": LEG(1, a), "tripo::1_Left_Limb_2": LEG(1, a), "tripo::1_Right_Limb_2": LEG(0, a), "tripo::Tail_1": { yaw: [-a * 0.6, a * 0.6, -a * 0.6] } } }, loop: true });
function setGait(r, m, g) { if (m.g === g) return; m.g = g; r.anim.move = g === "still" ? null : g === "walk" ? gait(0.34, 28) : gait(0.18, 38); }
const prey = (ctx, now) => ctx.place.players.filter((p) => !downed(p, now) && zoneAt(p.feetPosition.x, p.feetPosition.z) !== "gamma");

function samanthaIn(ctx, now) {
  ctx.spawn("l3-samantha", {
    tags: ["npc", "samantha", "usable", "entity26"], feetPosition: { x: SAM_HOME.x, y: 0, z: SAM_HOME.z }, rotation: { yaw: -90 },
    model: SAM_GLB, layout: { box: { min: { x: -0.2, y: 0, z: -0.45 }, max: { x: 0.2, y: 0.45, z: 0.45 } } }, physics: { body: "kinematic", collider: "box" },
    behavior: ["scripts/samantha.js"],
    state: { name: "Samantha", role: "psychic", faction: "The Beverly Room", hp: 1000, maxHp: 1000, tint: "#7dff9a", verb: "Talk",
      info: "A very small cat, far from her hotel. She is looking at you.", offers: [["o:feed", "Offer meat"], ["o:refuse", "Refuse"]], home: SAM_HOME, spots: SAM_SPOTS },
  });
  ctx.emit("fx", { position: { x: SAM_HOME.x, y: 0.2, z: SAM_HOME.z }, script: MIST });
  heard(ctx, { clip: SND("old-brass-elevator-bell-ding-doors-open"), position: { x: LIFT.x - 0.6, y: 1.2, z: Z5 }, volume: 0.8, maxDistance: 24 });
}
function samanthaOut(ctx) {
  const o = ctx.getObject("l3-samantha"); if (!o) return;
  const a = o.feetPosition; ctx.emit("fx", { position: { x: a.x, y: Math.max(a.y, 0) + 0.2, z: a.z }, script: MIST });
  heard(ctx, { clip: SND("soft-magical-whoosh-shimmer"), position: a, volume: 0.5, maxDistance: 14 });
  for (const p of ctx.place.players) if (p.state?.talkWith === "l3-samantha") p.state.talkWith = null;
  ctx.destroy("l3-samantha");
}
function ratsIn(ctx, now, S) {
  const ps = prey(ctx, now); if (!ps.length) return false;
  const p = ps[Math.floor(ctx.random() * ps.length)], c = cellAt(p.feetPosition.x, p.feetPosition.z), [a, b] = V.rats.from;
  const pick = cellNear(() => ctx.random(), c.cx, c.cz, b, (x, z) => Math.max(Math.abs(x - c.cx), Math.abs(z - c.cz)) >= a && zoneAt(cellCenter(x, z).x, cellCenter(x, z).z) === "hall");
  if (!pick) return false;
  const hole = cellCenter(pick[0], pick[1]), n = Math.round(rr(ctx, V.rats.size)), tag = Math.floor(now / 1000) % 100000;
  for (let i = 0; i < n; i++) {
    const ang = ctx.random() * 6.283, r = 0.3 + ctx.random() * 0.8;
    ctx.spawn(`l3-rat-${tag}-${i}`, {
      tags: ["l5rat", "l3rat", "moth", "hostile"], feetPosition: { x: hole.x + Math.cos(ang) * r, y: 0.05, z: hole.z + Math.sin(ang) * r }, rotation: ctx.random() * 360,
      model: { id: R.model, forward: "+x" }, layout: { box: { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 0.21, z: 0.5 } } },
      physics: { body: "character", collider: "capsule" }, fx: { script: EYES },
      state: { ...npcState(ctx, "rat", R.hp, { xp: 12 }), kind: "rat", name: "Death Rat", n: i },
    });
  }
  S.rats = { hole, until: now + rr(ctx, V.rats.stay) };
  ctx.emit("fx", { position: { x: hole.x, y: 0.05, z: hole.z }, script: GRIT });
  heard(ctx, { clip: SND("rats-scrabbling-up-metal-air-vent-grate"), position: { x: hole.x, y: 0.3, z: hole.z }, volume: 0.9, maxDistance: 26 });
  return true;
}
function ratsStep(ctx, dt, now, S) {
  const mem = (ctx.self.session.m ??= {}), all = ctx.query({ tags: ["l3rat"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  const P = S.rats, leaving = !P || now > P.until, hunt = prey(ctx, now);
  let alive = 0;
  for (const r of all) {
    const m = (mem[r.id] ??= {}), pos = r.feetPosition, st = r.state ?? {}, vy = (r.velocity?.y ?? 0) - 18 * dt;
    if (st.corpseAt || st.dead || (st.hp ?? 1) <= 0) {
      if (!m.deadAt) { m.deadAt = now; setGait(r, m, "still"); if (!st.corpseAt) { const k = killerOf(ctx, pos); becomeCorpse(ctx, r, "Death Rat", ["meat:rat"], k?.feetPosition); r.fx = null; heard(ctx, { maxDistance: 32, refDistance: 5, clip: SND("rat-death-squeal"), position: pos, volume: 0.8 }); if (k) { k.state.l5rats ??= 0; k.state.l5rats += 1; } } }
      if (now - m.deadAt > 3600000 || (now - m.deadAt > 3000 && !(r.state.items ?? "").length)) { ctx.destroy(r.id); delete mem[r.id]; }
      continue;
    }
    alive++;
    const home = P?.hole ?? pos;
    if (leaving && flat(pos, home) < 1.2) { ctx.emit("fx", { position: { x: pos.x, y: 0.05, z: pos.z }, script: GRIT }); ctx.destroy(r.id); delete mem[r.id]; continue; }
    let goal, sp = 0;
    if (leaving) { goal = home; sp = R.run; }
    else {
      if (now >= (m.look ?? 0)) {
        m.look = now + 250; m.mode = "roam"; m.prey = null;
        let best = R.sense, p = null; for (const h of hunt) { const d = flat(h.feetPosition, pos); if (d < best) { best = d; p = h; } }
        if (p) { const s = p.state ?? {}, hurt = (s.hp ?? 100) < maxHpOf(s) * R.wounded, armed = s.equipped && s.equipped !== "fists";
          if ((s.light && best < R.scareLight) || (armed && !hurt && best < R.scareWeapon)) { m.mode = "flee"; m.prey = p.id; }
          else if (hurt || aloneOf(ctx, p, R.alone)) { m.mode = "swarm"; m.prey = p.id; } }
      }
      const t = m.prey ? hunt.find((h) => h.id === m.prey) : null;
      if (t && m.mode === "flee") { goal = home; sp = R.flee; }
      else if (t && m.mode === "swarm") {
        const a = (st.n ?? 0) * 1.6; goal = { x: t.feetPosition.x + Math.cos(a) * 0.45, z: t.feetPosition.z + Math.sin(a) * 0.45 }; sp = R.run;
        if (flat(t.feetPosition, pos) < R.reach && now >= (m.bite ?? 0)) {
          m.bite = now + rr(ctx, R.biteEvery);
          const at = hit(ctx, t, Math.round(rr(ctx, [R.bite[0], R.bite[1] + 0.99]) - 0.49));
          heard(ctx, { maxDistance: 14, refDistance: 2, clip: SND("small-rat-bite-squeak"), position: at, volume: 0.7, pitch: 0.9 + ctx.random() * 0.3 });
          ctx.emit("fx", { position: { ...at, y: 0.4 }, script: BLOOD });
        }
      } else {
        if (!m.roam || now > m.until) { const c = cellAt(home.x, home.z), q = cellNear(() => ctx.random(), c.cx, c.cz, V.rats.roam, (x, z) => zoneAt(cellCenter(x, z).x, cellCenter(x, z).z) !== "gamma"); const cc = q ? cellCenter(q[0], q[1]) : home; m.roam = { x: cc.x + (ctx.random() - 0.5) * 2, z: cc.z + (ctx.random() - 0.5) * 2 }; m.until = now + 1500 + ctx.random() * 3500; m.rest = ctx.random() < 0.35; }
        goal = m.roam; sp = m.rest ? 0 : R.walk;
      }
    }
    // through the maze's real openings, cell centre to cell centre
    if (sp && now >= (m.path ?? 0)) { m.path = now + 400; const s = stepToward(pos.x, pos.z, goal.x, goal.z, 24); m.next = s ? s.next : null; }
    const g = m.next ?? goal; let dx = g.x - pos.x, dz = g.z - pos.z; const d = Math.hypot(dx, dz);
    if (d < 0.2) sp = 0; else { dx /= d; dz /= d; }
    r.velocity = { x: dx * sp, y: vy, z: dz * sp };
    if (sp) r.rotation = yawTo(dx, dz);
    setGait(r, m, sp === 0 ? "still" : sp <= R.walk ? "walk" : "run");
    if (sp > 0 && now >= (m.squeak ?? 0)) { m.squeak = now + 4000 + ctx.random() * 9000; heard(ctx, { clip: SND("rat-squeaks-and-claws-on-wood-floor"), position: pos, volume: 0.45, pitch: 0.85 + ctx.random() * 0.4, maxDistance: 18 }); }
  }
  if (S.rats && leaving && !alive) S.rats = null;
  return all.length;
}

export function update(ctx, dt) {
  const S = ctx.self.state, now = ctx.now();
  S.next ??= now + rr(ctx, V.checkEvery);
  const here = ctx.place.players.length > 0;
  // Samantha's stay
  if (S.sam && now > S.sam) { samanthaOut(ctx); S.sam = 0; }
  if (S.sam && !ctx.getObject("l3-samantha")) S.sam = 0;
  // a roll, or a forced visit
  const force = S.force; if (force) S.force = null;
  if (force || (here && now >= S.next)) {
    if (!force) S.next = now + rr(ctx, V.checkEvery);
    if ((force === "samantha" || (!force && ctx.random() < V.samantha.chance)) && !S.sam) { samanthaIn(ctx, now); S.sam = now + rr(ctx, V.samantha.stay); }
    if ((force === "rats" || (!force && ctx.random() < V.rats.chance)) && !S.rats) ratsIn(ctx, now, S);
  }
  const n = ratsStep(ctx, dt, now, S);
  if (!n && !S.sam && !S.rats) ctx.sleep(5);
}
