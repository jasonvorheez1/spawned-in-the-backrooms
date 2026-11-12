import { voiceKey } from './voices.js'
import { mayReturn } from "./npc-respawn.js";
// Level 5's residents (Homely Hotel staff, Housekeeping, the Originals), run by scripts/l5-people.js once a second.
// Each is an M.E.G.-style agent (scripts/meg-agent.js walks state.rounds); this director gives them day/night rounds,
// walks two of them together to talk (data: scripts/lib/data/level5-people.yml talks), and sets each one's card buttons.
import { heard } from "./hear.js";
import P from "./data/level5-people.yml";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
import { weaponBody } from "./weapon-look.js";
import { VO } from "./npc-talk.js";
import MEG from "./data/meg.yml";
import { ZONES } from "./level5.js";
const HOME = {}; for (const [rid, who] of Object.entries(P.homes ?? {})) { const z = ZONES.find((q) => q.id === rid); if (z) HOME[who] = z; }
const inZ = (z, f) => f && f.x > z.x0 && f.x < z.x1 && f.z > z.z0 && f.z < z.z1;
export const PEOPLE5 = P;
const ACT = { idle: null, talk: "cdn/clip-talk-loop.glb", sit: "cdn/clip-sit-loop.glb", crouch: "cdn/clip-crouch-idle-loop.glb", sleep: "cdn/clip-sleep-loop.glb", pickup: "cdn/clip-pickup.glb", wave: "cdn/clip-waving-single-hand-loop.glb" };
const FNAME = { hotel: "Homely Hotel (the staff of this endless hotel: polite, proprietary, they dislike the Originals in the salon and lean on Housekeeping)", hk: "Housekeeping, a M.E.G. outpost on Level 5 (grey uniforms, practical, they back the Homely Hotel staff and keep the Boiler Room rats down)", orig: "The Originals (eccentrics who wandered in between 1300 and 1940; they gossip, play cards, keep Samantha the cat fed, and refuse membership to anyone modern)" };
const OFFERS = {
  concierge: [["o:room", `Book a guest room ($${P.room.price})`], ["o:rent", `Rent a suite ($${P.rent.price})`]],
  guide: [["o:escort", "Escort me to the Boiler Room"]],
  clerk: [["o:job", "The rat job"]],
  quarter: [["o:boilerkey", "[Speech 25] \"I need the boiler room key.\""]],
  maid: [["o:gossip", "Heard anything?"]], bellhop: [["o:gossip", "Heard anything?"]], agent: [["o:gossip", "Anything moving?"]],
};
const ORIG = [["o:member", "Ask to join the salon"], ["o:lore", "Ask about the hotel"]];
export const roundsOf = (rows) => (rows ?? []).map(([x, z, dwell, act, lx, lz]) => ({ x, y: 0, z, dwell, act: ACT[act] ?? null, look: { x: lx, z: lz } }));
export function speak(ctx, o, t) {
  const now = ctx.now(), d = 1400 + t.length * 60; o.state.line = { t, at: now, d }; o.state.talkAt = now;
  const p = o.feetPosition; heard(ctx, { clip: VO(voiceKey(o), t), position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 0.85, refDistance: 2.5, maxDistance: 14 }, { audience: { nearby: p, radius: 14 } });
}
export function spawnResident(ctx, id) {
  const g = P.people[id], r0 = g.rounds[0];
  ctx.spawn(id, { tags: ["npc", "l5res", `l5-${g.faction}`], feetPosition: { x: r0[0], y: 0, z: r0[1] }, rotation: { yaw: 0 }, physics: "character",
    ...critterSpec(npcLook(id, g.look, "l5", 12)), scale: { x: g.build?.w ?? 1, y: g.build?.h ?? 1, z: g.build?.w ?? 1 },
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js", "scripts/l5-resident.js"],
    state: { name: g.name, role: g.role, voice: g.voice, faction5: g.faction, factionName: FNAME[g.faction], species: g.look.species, outfit: `${g.look.topw}/${g.look.botw}/${g.look.top}`,
      offers: g.faction === "orig" ? ORIG : OFFERS[g.role] ?? [], rounds: roundsOf(g.rounds), ri: 0, mode: "day", home: { x: r0[0], z: r0[1] }, ...npcState(ctx, "agent", MEG.hp) } });
  if (g.gun) ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
}
const pickIn = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
const busy = (o, now) => !o || (o.state.escortUntil ?? 0) > now || (o.state.talkAt && now - o.state.talkAt < 8000 && !o.state.meeting) || o.state.dead;
export function tickPeople(ctx) {
  const now = ctx.now(), ses = ctx.self.session, cyc = (P.day + P.night) * 1000;
  const phase = ((now + (ctx.world.state.clockSkip ?? 0)) % cyc) < P.day * 1000 ? "day" : "night";
  let made = 0;
  for (const id of Object.keys(P.people)) {
    let o = ctx.getObject(id);
    if (!o) { if (ctx.place.state.l5seen?.[id] && !mayReturn(ctx, id)) continue; if (made++ < 4) spawnResident(ctx, id); continue; }
    if (!ctx.place.state.l5seen?.[id]) ctx.place.state.l5seen = { ...(ctx.place.state.l5seen ?? {}), [id]: 1 };
    const s = o.state;
    if ((s.escortUntil ?? 0) && now > s.escortUntil) { s.escortUntil = 0; s.mode = ""; }
    if (s.meeting || (s.escortUntil ?? 0) > now) continue;
    if (s.mode !== phase) {
      s.mode = phase; const z = HOME[id];
      s.rounds = phase === "night" && z ? bedtime(z) : roundsOf(phase === "night" && P.people[id].night ? P.people[id].night : P.people[id].rounds); s.ri = 0;
    }
    if (HOME[id] && !s.dead) trespass(ctx, o, HOME[id], now);
  }
  // a conversation: two free residents walk to a spot between their rooms and trade lines
  const m = ses.meet;
  if (!m) {
    if (now < (ses.nextMeet ?? now + 8000)) { ses.nextMeet ??= now + 8000; return; }
    ses.nextMeet = now + (P.meetEvery[0] + ctx.random() * (P.meetEvery[1] - P.meetEvery[0])) * 1000;
    const free = P.talks.filter((t) => !busy(ctx.getObject(t.a), now) && !busy(ctx.getObject(t.b), now));
    if (!free.length) return;
    const t = pickIn(ctx, free), fa = P.people[t.a].faction, fb = P.people[t.b].faction;
    const key = fa === fb ? fa : [fa, fb].sort((x, y) => ["hotel", "hk", "orig"].indexOf(x) - ["hotel", "hk", "orig"].indexOf(y)).join("-");
    const [sx, sz] = pickIn(ctx, P.meets[key] ?? P.meets[fa]);
    ses.meet = { a: t.a, b: t.b, lines: t.lines, i: 0, at: now, next: 0, sx, sz };
    for (const [id, dx] of [[t.a, -0.6], [t.b, 0.6]]) { const o = ctx.getObject(id); o.state.meeting = true; o.state.rounds = [{ x: sx + dx, y: 0, z: sz, dwell: 999, act: null, look: { x: sx - dx, z: sz } }]; o.state.ri = 0; }
    return;
  }
  const A = ctx.getObject(m.a), B = ctx.getObject(m.b);
  const end = () => { for (const o of [A, B]) if (o) { o.state.meeting = false; o.state.mode = ""; o.state.talkTo = null; } ses.meet = null; };
  if (!A || !B) return end();
  const near = (o) => Math.hypot(o.feetPosition.x - m.sx, o.feetPosition.z - m.sz) < 1.6;
  if (!m.next) { if ((near(A) && near(B)) || now - m.at > 25000) m.next = now; else return; }
  if (now < m.next) return;
  if (m.i >= m.lines.length) return end();
  const [who, t] = m.lines[m.i++], o = who === "a" ? A : B, other = who === "a" ? B : A;
  o.state.talkTo = other.id; other.state.talkTo = o.id; speak(ctx, o, t); other.state.talkAt = now;
  m.next = now + Math.max(P.lineGap * 1000, 1400 + t.length * 60);
}

// night: home to their own room, a turn by the bed, then sleep there till day
function bedtime(z) {
  const cx = (z.x0 + z.x1) / 2, n = z.z0 < 0, door = n ? z.z1 - 1 : z.z0 + 1, bed = n ? z.z0 + 2.2 : z.z1 - 2.2;
  return roundsOf([[cx, door, 4, "idle", cx, bed], [cx + 0.9, bed, 999, "sleep", cx + 0.9, n ? z.z0 : z.z1]]);
}
// someone in their room while they are in it: seen standing anywhere in sight; crouched only close and in front of them.
// first time: told off and shoved toward the door; walked in again inside the grace: they turn on you (like pickpocketing).
function trespass(ctx, o, z, now) {
  const me = o.feetPosition; if (!inZ(z, me)) return;
  const T = P.trespass, s = o.state, book = ctx.place.state.l5rent ?? {};
  for (const p of ctx.place.players) {
    const f = p.feetPosition; if (!inZ(z, f) || s.angry?.[p.id]) continue;
    if (book[z.id]?.uid === (p.userId ?? p.id) && book[z.id].until > now) continue;
    const dx = f.x - me.x, dz = f.z - me.z, d = Math.hypot(dx, dz), sneak = !!p.state?.crouch;
    const yaw = typeof o.rotation === "number" ? o.rotation : o.rotation?.yaw ?? 0, r = yaw * Math.PI / 180;
    const ahead = d < 0.01 ? 1 : (-Math.sin(r) * dx - Math.cos(r) * dz) / d, inCone = ahead > Math.cos((T.cone / 2) * Math.PI / 180);
    const asleep = s.rounds?.[s.ri]?.act === ACT.sleep && Math.hypot(me.x - s.rounds[s.ri].x, me.z - s.rounds[s.ri].z) < 0.8;
    const seen = sneak ? d < T.sneakSee && inCone && !asleep : d < T.see && (inCone || d < 2.5) && (!asleep || d < 1.5);
    if (!seen) continue;
    const w = s.trespass?.[p.id] ?? 0, who = s.name?.split(" ·")[0] ?? "They";
    if (w && now - w < T.grace * 1000) {
      if (now - w < 2500) continue; // the shove gets them out first
      s.angry = { ...(s.angry ?? {}), [p.id]: true }; s.fresh = { ...(s.fresh ?? {}), [p.id]: true };
      say1(ctx, o, p, pickIn(ctx, ["I warned you. Get OUT!", "That's it. You don't come in here twice.", "Right. You asked for this."]));
      continue;
    }
    s.trespass = { ...(s.trespass ?? {}), [p.id]: now }; s.talkTo = p.id;
    say1(ctx, o, p, pickIn(ctx, asleep ? ["Wh- who's there? Out! Out of my room!", "Hey! I was sleeping! Get out!"] : ["What the hell do you think you're doing in my room?", "Excuse me. This is MY room. Out.", "You lost? The door's behind you. Use it."]));
    const out = { x: (z.x0 + z.x1) / 2, z: z.z0 < 0 ? z.z1 + 1 : z.z0 - 1 }, ox = out.x - f.x, oz = out.z - f.z, ol = Math.hypot(ox, oz) || 1;
    ctx.emit("impulse", { target: p.id, impulse: { x: (ox / ol) * 260, y: 60, z: (oz / ol) * 260 } });
    heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-body-shove-grunt.mp3", position: f, volume: 0.6, maxDistance: 14 }, { audience: { nearby: f, radius: 16 } });
  }
}
function say1(ctx, o, p, t) { speak(ctx, o, t); p.state.sub = { who: o.state.name, t, at: ctx.now(), d: 1400 + t.length * 60 }; }
