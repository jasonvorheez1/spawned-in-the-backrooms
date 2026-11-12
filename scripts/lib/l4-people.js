import { voiceKey } from './voices.js'
import { mayReturn } from "./npc-respawn.js";
import { vo } from "./voices.js";
// Level 4's people, run from places/level4/sim.js once a second. Every resident is an M.E.G.-style agent (scripts/meg-agent.js
// walks state.rounds, waves, talks, fights); this director gives them lives on top:
//   homes      each resident claims an office (its door plate shows their name, a cot and desk inside), so the floor has neighbours
//   clock      day/night on the floor (people.yml day/night seconds): residents work rounds by day and sleep on their cot at night
//   meetups    every minute or so two awake residents walk to one spot and talk an exchange (meet in people.yml)
//   phones     a ringing desk phone nobody's near: the nearest awake resident walks over and answers it
//   greetings  walk up to someone and they say a line in their faction's voice
//   amor       the Amor Incrementum office is a mold garden: step in and they warn you, step in again and they shove you out
import { heard } from "./hear.js";
import { ROOMS, FOUNTAINS, HALF, facing } from "./level4.js";
import P from "./data/level4-people.yml";
const VO = (who, line) => vo(who, line)
const SIT = "cdn/clip-sit-loop.glb", SLEEP = "cdn/clip-sleep-loop.glb", TALK = "cdn/clip-talk-loop.glb", CROUCH = "cdn/clip-crouch-idle-loop.glb", IDLE = null;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const alive = (o) => o && !o.state?.dead && (o.state?.hp ?? 1) > 0;
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
const byNo = (n) => ROOMS.find((r) => r.no === n);
// a point in an office: along its wall from a0, depth in from the door wall (negative = out on the open floor)
function inside(r, along, depth) { const d = r.door.at - r.inward * depth; return r.door.ax === "z" ? { x: along, y: 0, z: d } : { x: d, y: 0, z: along }; }
function spots(r) {
  const a0 = r.door.ax === "z" ? r.x0 : r.z0, a1 = a0 + 8, left = r.door.c < r.mid;
  const desk = inside(r, left ? a0 + 1.6 : a1 - 1.6, 4.1);
  const deskSide = inside(r, left ? a0 + 1.6 : a1 - 1.6, 5.25);
  return { cot: inside(r, left ? a1 - 2.4 : a0 + 2.4, 4.6), desk, deskSide, mid: inside(r, r.mid, 3), door: inside(r, r.door.c, -1.3), sill: inside(r, r.mid, 5.3), yaw: facing(r.door.ax === "x" ? r.inward : 0, r.door.ax === "z" ? r.inward : 0) + 180 };
}
const stop = (p, dwell, act, look) => ({ x: p.x, y: 0, z: p.z, dwell, act, ...(look ? { look: { x: look.x, z: look.z } } : {}) });
const FOUNT = FOUNTAINS.map(([x, z, yaw]) => { const dx = yaw === -90 ? 0.55 : yaw === 90 ? -0.55 : 0, dz = yaw === 0 ? -0.55 : yaw === 180 ? 0.55 : 0; return { at: { x: x + dx * 2.6, z: z + dz * 2.6 }, look: { x, z } }; });
const VEND = [0, 1, 2].map((i) => ({ at: { x: HALF - 7 + i * 1.3, z: HALF - 2 }, look: { x: HALF - 7 + i * 1.3, z: HALF } }));
const SEATS = []; for (const [x, z] of [[0, 13], [0, -13], [13, 0], [-13, 0]]) for (const [cx, face] of [[0.82, 1], [-0.82, -1]]) SEATS.push({ at: { x: x + cx, z: z + face * 1.25 }, look: { x: x + cx, z } });
const OMEGA_DOOR = { x: -25, z: -22.5 }, LIFT = { x: HALF - 4, z: -HALF + 4 }, STAIRS = { x: -25, z: HALF - 10 };
function homeOf(ctx, id) { const h = ctx.place.state.l4homes?.[id] ?? ctx.place.state.l4homes?.[P.people[id]?.shares]; return h ? ROOMS.find((r) => r.id === h) : null; }
// the day's rounds and the night's, per resident, from where they live
export function roundsFor(ctx, id, phase) {
  const g = P.people[id], r = homeOf(ctx, id), h = r ? spots(r) : null, f = FOUNT[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % FOUNT.length];
  if (g.faction === "omega") {
    if (phase === "night" && g.night !== "guard") return [stop({ x: -28.5 + (id.length % 3), z: -29 }, 999, SLEEP)];
    if (g.role === "quarter") return [stop({ x: -27, z: -27.5 }, 60, IDLE, { x: -25, z: -24 }), stop(OMEGA_DOOR, 12, IDLE, { x: -20, z: -18 })];
    if (g.role === "medic") return [stop({ x: -29, z: -28 }, 40, CROUCH), stop(OMEGA_DOOR, 10, IDLE, { x: -18, z: -18 }), stop(f.at, 6, "cdn/clip-pickup.glb", f.look)];
    if (id === "omega-okafor") return [stop({ x: -25.5, z: -22.6 }, 40, IDLE, { x: -20, z: -12 }), stop({ x: -20, z: -14 }, 8, IDLE, { x: 0, z: 0 })];
    return [stop(OMEGA_DOOR, 10, IDLE, { x: 0, z: 0 }), stop(FOUNT[0].at, 6, IDLE, FOUNT[0].look), stop({ x: 0, z: -18 }, 6, IDLE, { x: 0, z: 0 }), stop(LIFT, 10, IDLE, { x: 20, z: -20 }), stop(FOUNT[3].at, 6, IDLE, FOUNT[3].look), stop({ x: 0, z: 0 }, 8, IDLE, { x: 10, z: 10 }), stop(STAIRS, 8, IDLE, { x: -25, z: 30 })];
  }
  if (!h) return [stop({ x: 0, z: 0 }, 20, IDLE)];
  if (phase === "night") return [stop(h.cot, 999, SLEEP)];
  if (g.faction === "amor") return [stop(inside(r, r.mid + (id === "amor-hask" ? 1.25 : -1.25), 3), 40, CROUCH, h.sill), stop(inside(r, r.mid + (id === "amor-hask" ? 1.25 : -1.25), 3.55), 20, "cdn/clip-magic-spell-casting-loop.glb"), stop(h.door, 15, IDLE, { x: 0, z: 0 }), ...(id === "amor-hask" ? [stop(SEATS[(id.length) % SEATS.length].at, 25, TALK, { x: 0, z: 0 })] : [])];
  if (g.faction === "tbd") {
    if (g.role === "trader") return [stop(h.deskSide, 50, IDLE, h.desk), stop(h.door, 20, IDLE, { x: 0, z: 0 })];
    const others = ROOMS.filter((q) => q.kind === "office" && q.id !== r.id); const o1 = spots(others[(id.length * 5) % others.length]), o2 = spots(others[(id.length * 11) % others.length]);
    return [stop(o1.mid, 12, "cdn/clip-pickup.glb"), stop(o2.mid, 12, "cdn/clip-pickup.glb"), stop(VEND[1].at, 8, "cdn/clip-pickup.glb", VEND[1].look), stop(h.deskSide, 25, CROUCH, h.desk)];
  }
  const seat = SEATS[([...id].reduce((a, c) => a + c.charCodeAt(0), 0) * 3) % SEATS.length], v = VEND[id.length % 3];
  return [stop(h.deskSide, 30, IDLE, h.desk), stop(f.at, 7, "cdn/clip-pickup.glb", f.look), stop(seat.at, 30, SIT, seat.look), stop(v.at, 8, "cdn/clip-pickup.glb", v.look), stop(h.door, 12, IDLE, { x: 0, z: 0 })];
}
export function speak(ctx, o, t) {
  const now = ctx.now(), d = 1400 + t.length * 60; o.state.line = { t, at: now, d }; o.state.talkAt = now;
  const p = o.feetPosition; heard(ctx, { clip: VO(voiceKey(o), t), position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 0.85, refDistance: 3, maxDistance: 18 }, { audience: { nearby: p, radius: 20 } });
}
// homes: a vacant office per resident (a player's home is never taken), its plate named, a cot and desk inside
export function settle(ctx, spawnAgent) {
  const s = ctx.place.state, homes = { ...(s.l4homes ?? {}) };
  for (const [id, g] of Object.entries(P.people)) {
    if (g.faction === "omega" || g.shares || homes[id]) continue;
    for (const n of [...(g.home ?? []), ...ROOMS.map((r) => r.no)]) {
      const r = byNo(n); if (!r || r.kind !== "office" || Object.values(homes).includes(r.id)) continue;
      const plate = ctx.place.objects[`${r.id}-plate`]; if (plate?.state.owner) continue;
      homes[id] = r.id;
      const short = g.faction === "tbd" ? "T.B.D." : g.faction === "amor" ? "Amor Incrementum" : g.name.split(" · ")[0];
      if (plate) { plate.state.owner = id; plate.state.ownerName = short; plate.state.label2 = short; plate.state.verb = "Knock"; plate.state.info = `${short}'s office`; }
      const k = spots(r), tag = ["l4-npc-home", `home-${r.id}`];
      ctx.spawn({ tags: tag, feetPosition: { ...k.cot, z: k.cot.z }, rotation: { yaw: k.yaw }, physics: "static", primitive: { kind: "box", width: 0.8, height: 0.42, depth: 1.9 }, material: { color: g.faction === "amor" ? "oklch(0.35 0.05 120)" : "oklch(0.45 0.05 140)", roughness: 0.95 },
        children: [{ feetPosition: { x: 0, y: 0.42, z: -0.7 }, primitive: { kind: "box", width: 0.6, height: 0.12, depth: 0.35 }, material: { color: "oklch(0.88 0.01 90)" } },
          { feetPosition: { x: 0, y: 0.42, z: 0.25 }, primitive: { kind: "box", width: 0.78, height: 0.05, depth: 1.2 }, material: { color: ["oklch(0.55 0.1 30)", "oklch(0.5 0.08 250)", "oklch(0.6 0.1 80)"][id.length % 3], roughness: 1 } }] });
      ctx.spawn({ tags: tag, feetPosition: { x: k.desk.x, y: 0, z: k.desk.z }, rotation: { yaw: k.yaw }, physics: "static", primitive: { kind: "box", width: 1.4, height: 0.74, depth: 0.7 }, material: { color: "oklch(0.55 0.05 60)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.6 },
        children: [{ feetPosition: { x: 0.45, y: 0.74, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.09, height: 0.38 }, material: { color: "oklch(0.3 0.02 60)", metalness: 0.4 } },
          { feetPosition: { x: 0.45, y: 1.05, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.09 75)", intensity: 0.8, distance: 4, shadow: { enabled: false } } },
          { feetPosition: { x: -0.3, y: 0.74, z: 0.05 }, primitive: { kind: "box", width: 0.3, height: 0.03, depth: 0.22 }, material: { color: "oklch(0.92 0.01 90)" } }] });
      if (g.faction === "amor") for (let i = 0; i < 7; i++) { const a = r.mid - 3 + i, q = inside(r, a, 4.4 + (i % 3) * 0.5); // the mold beds: low trays of green-grey growth under a warm lamp
        ctx.spawn({ tags: tag, feetPosition: q, physics: "static", primitive: { kind: "box", width: 0.8, height: 0.18, depth: 0.5 }, material: { color: "oklch(0.35 0.03 60)", roughness: 1 },
          children: [{ feetPosition: { x: 0, y: 0.18, z: 0 }, primitive: { kind: "sphere", radius: 0.3, widthSegments: 10, heightSegments: 6 }, scale: { x: 1.2, y: 0.25, z: 0.75 }, material: { color: ["oklch(0.55 0.08 135)", "oklch(0.48 0.05 110)", "oklch(0.6 0.06 95)"][i % 3], roughness: 1 } }] }); }
      if (g.faction === "tbd") for (let i = 0; i < 6; i++) { const q = inside(r, r.mid - 2.5 + i, 1.2 + (i % 2) * 0.6); // the hoard: boxes of things that do nothing
        ctx.spawn({ tags: tag, feetPosition: q, rotation: { yaw: i * 23 }, physics: "static", primitive: { kind: "scripted", script: "scripts/l4-prop-geo.js", params: { kind: "box", seed: i + 7 } } }); }
      break;
    }
  }
  s.l4homes = homes;
  for (const [id, g] of Object.entries(P.people)) if (!ctx.place.objects[id] && g.look && (!s.l4seen?.[id] || mayReturn(ctx, id))) spawnAgent(id, g, roundsFor(ctx, id, s.l4clock?.phase ?? "day"));
  { const seen = { ...(s.l4seen ?? {}) }; let n = 0; for (const id of Object.keys(P.people)) if (ctx.place.objects[id] && !seen[id]) { seen[id] = 1; n++; } if (n) s.l4seen = seen; }
  for (const id of Object.keys(P.people)) {
    const o = ctx.place.objects[id]; if (!o) continue;
    const room = homeOf(ctx, id), phase = s.l4clock?.phase ?? "day";
    const rounds = roundsFor(ctx, id, phase);
    if (room && alive(o) && !o.state.follow) {
      const h = spots(room), f = o.feetPosition;
      if (flat(f, h.desk) < 0.72) o.feetPosition = h.deskSide;
      else if (P.people[id].faction === "amor" && phase === "day" && flat(f, h.sill) < 0.65) {
        const { x, y, z } = rounds[0]; o.feetPosition = { x, y, z };
      }
    }
    o.state.rounds = rounds; o.state.ri = 0; o.state.faction4 = P.people[id].faction;
  }
}
function errand(ctx, o, stops, ms) { o.state.rounds = stops; o.state.ri = 0; (ctx.place.state.l4err ??= {})[o.id] = ctx.now() + ms; }
export function tickPeople(ctx) {
  const s = ctx.place.state, now = ctx.now(), players = ctx.place.players;
  const ids = Object.keys(P.people).filter((id) => alive(ctx.place.objects[id])), objs = ids.map((id) => ctx.place.objects[id]);
  // the floor's clock
  const DAY = +(P?.day ?? P?.daySeconds) || 480, NIGHT = +(P?.night ?? P?.nightSeconds) || 240; // her pick: an 8-minute day, a 4-minute night when the table says nothing
  if (!s.l4clock || !Number.isFinite(s.l4clock.until)) s.l4clock = { phase: s.l4clock?.phase ?? "day", until: now + DAY * 1000 };
  const c = s.l4clock;
  if (now > c.until) {
    const phase = c.phase === "day" ? "night" : "day"; s.l4clock = { phase, until: now + (phase === "day" ? DAY : NIGHT) * 1000 };
    s.meet = null; s.l4err = {};
    for (const o of objs) { o.state.rounds = roundsFor(ctx, o.id, phase); o.state.ri = 0; o.state.asleep = phase === "night" && !(P.people[o.id].faction === "omega" && P.people[o.id].night === "guard"); }
    const near = objs.filter((o) => players.some((p) => flat(p.feetPosition, o.feetPosition) < 18));
    if (near.length) speak(ctx, pick(ctx, near), pick(ctx, phase === "night" ? P.night : P.morning));
  }
  const night = s.l4clock.phase === "night", awake = objs.filter((o) => !o.state.asleep);
  // errands run out: back to the routine
  for (const [id, until] of Object.entries(s.l4err ?? {})) if (now > until) { const o = ctx.place.objects[id]; if (o) { o.state.rounds = roundsFor(ctx, id, s.l4clock.phase); o.state.ri = 0; } delete s.l4err[id]; }
  // phones: a ring nobody's near draws the nearest awake resident
  for (const ph of ctx.query({ tags: ["l4-phone"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    if (!ph.state.ringing || players.some((p) => flat(p.feetPosition, ph.feetPosition) < 8)) continue;
    const goer = ph.state.goer ? ctx.place.objects[ph.state.goer] : null;
    if (goer) { if (flat(goer.feetPosition, ph.feetPosition) < 1.6) { const live = ctx.getObject(ph.id); live.state.ringing = false; live.state.verb = "Pick up"; live.state.info = "Desk phone"; live.state.tint = "#d9d3b8"; live.audio = null; live.state.goer = null; speak(ctx, goer, pick(ctx, P.phone)); } continue; }
    let best = null, bd = P.phoneReach; for (const o of awake) { if (s.l4err?.[o.id] || o.state.follow || s.meet?.a === o.id || s.meet?.b === o.id) continue; const d = flat(o.feetPosition, ph.feetPosition); if (d < bd) { bd = d; best = o; } }
    if (best) { ctx.getObject(ph.id).state.goer = best.id; errand(ctx, best, [stop({ x: ph.feetPosition.x + 0.5, z: ph.feetPosition.z }, 8, TALK, ph.feetPosition)], 30000); }
  }
  // meetups: two awake residents walk to one spot and talk
  const m = s.meet;
  if (m) {
    const a = ctx.place.objects[m.a], b = ctx.place.objects[m.b];
    if (!alive(a) || !alive(b) || now > m.giveUp) s.meet = null;
    else if (!m.started) { if (flat(a.feetPosition, b.feetPosition) < 3.2) { m.started = true; m.i = -1; m.next = now; } }
    else if (now >= m.next) {
      const ex = P.meet[m.ex]; m.i++;
      if (m.i >= ex.length) { s.meet = null; delete s.l4err?.[a.id]; delete s.l4err?.[b.id]; a.state.rounds = roundsFor(ctx, a.id, s.l4clock.phase); b.state.rounds = roundsFor(ctx, b.id, s.l4clock.phase); a.state.ri = 0; b.state.ri = 0; s.meetNext = now + (P.meetEvery[0] + ctx.random() * (P.meetEvery[1] - P.meetEvery[0])) * 1000; }
      else { const [who, t] = ex[m.i], o = who === "A" ? a : b; speak(ctx, o, t); o.state.talkTo = (who === "A" ? b : a).id; m.next = now + 1400 + t.length * 60; s.meet = { ...m }; }
    }
  } else if (!night && now > (s.meetNext ?? 0)) {
    const free = awake.filter((o) => !s.l4err?.[o.id] && !o.state.follow && P.people[o.id].role !== "quarter" && P.people[o.id].role !== "trader" && players.some((p) => flat(p.feetPosition, o.feetPosition) < 45));
    if (free.length >= 2) {
      const a = pick(ctx, free), b = pick(ctx, free.filter((o) => o !== a)), spot = ctx.random() < 0.5 ? pick(ctx, SEATS).at : { x: (a.feetPosition.x + b.feetPosition.x) / 2, z: (a.feetPosition.z + b.feetPosition.z) / 2 };
      const ex = Math.floor(ctx.random() * P.meet.length);
      errand(ctx, a, [stop({ x: spot.x + 0.8, z: spot.z }, P.meetDwell, TALK, spot)], 60000); errand(ctx, b, [stop({ x: spot.x - 0.8, z: spot.z }, P.meetDwell, TALK, spot)], 60000);
      s.meet = { a: a.id, b: b.id, ex, giveUp: now + 40000 };
    } else s.meetNext = now + 10000;
  }
  // greetings and the mold room
  const greeted = (s.l4greet ??= {});
  for (const p of players) {
    for (const o of awake) {
      if (flat(p.feetPosition, o.feetPosition) > 3.2 || now - (o.state.line?.at ?? -1e9) < 4000 || o.state.angry?.[p.id]) continue;
      const k = `${o.id}|${p.id}`; if (now - (greeted[k] ?? -1e9) < P.greetAgain * 1000) continue;
      greeted[k] = now; speak(ctx, o, pick(ctx, P.greet[P.people[o.id].faction])); o.state.talkTo = p.id;
    }
    const garden = homeOf(ctx, "amor-vell"); if (!garden) continue;
    const x = p.feetPosition.x, z = p.feetPosition.z;
    if (!(x > garden.x0 && x < garden.x1 && z > garden.z0 && z < garden.z1)) continue;
    const keeper = objs.filter((o) => P.people[o.id].faction === "amor").sort((a, b) => flat(a.feetPosition, p.feetPosition) - flat(b.feetPosition, p.feetPosition))[0];
    if (!keeper || flat(keeper.feetPosition, p.feetPosition) > 12) continue;
    const w = (s.amorWarn ??= {}), last = w[p.id] ?? { n: 0, at: -1e9 };
    if (now - last.at < 6000) continue;
    w[p.id] = { n: last.n + 1, at: now };
    const out = garden.door.ax === "z" ? { x: 0, y: 0, z: -garden.inward } : { x: -garden.inward, y: 0, z: 0 }, hard = last.n >= 1;
    speak(ctx, keeper, pick(ctx, hard ? P.amorShove : P.amorWarn));
    keeper.anim.wave = { clip: hard ? "cdn/clip-angry.glb" : "cdn/clip-shake-no.glb", loop: "once", weight: 1, blendIn: 0.2, blendOut: 0.4, mask: { from: "Spine" } };
    if (hard) {
      ctx.emit("impulse", { target: p.id, impulse: { x: out.x * 520, y: 160, z: out.z * 520 } });
      ctx.emit("cameraPunch", { direction: out, intensity: 0.5 }, { audience: { player: p.id } });
      ctx.emit("screenShake", { intensity: 0.3, duration: 0.2 }, { audience: { player: p.id } });
      p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - 6);
    }
  }
}
export const PEOPLE4 = P.people;
