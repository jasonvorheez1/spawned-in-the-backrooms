// Level 5's residents (Homely Hotel staff, Housekeeping, the Originals), run by scripts/l5-people.js once a second.
// Each is an M.E.G.-style agent (scripts/meg-agent.js walks state.rounds); this director gives them day/night rounds,
// walks two of them together to talk (data: scripts/lib/data/level5-people.yml talks), and sets each one's card buttons.
import P from "./data/level5-people.yml";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
import { weaponBody } from "./weapon-look.js";
import { VO } from "./npc-talk.js";
import MEG from "./data/meg.yml";
export const PEOPLE5 = P;
const ACT = { idle: null, talk: "cdn/clip-talk-loop.glb", sit: "cdn/clip-sit-loop.glb", crouch: "cdn/clip-crouch-idle-loop.glb", sleep: "cdn/clip-sleep-loop.glb", pickup: "cdn/clip-pickup.glb", wave: "cdn/clip-waving-single-hand-loop.glb" };
const FNAME = { hotel: "Homely Hotel (the staff of this endless hotel: polite, proprietary, they dislike the Originals in the salon and lean on Housekeeping)", hk: "Housekeeping, a M.E.G. outpost on Level 5 (grey uniforms, practical, they back the Homely Hotel staff and keep the Boiler Room rats down)", orig: "The Originals (eccentrics who wandered in between 1300 and 1940; they gossip, play cards, keep Samantha the cat fed, and refuse membership to anyone modern)" };
const OFFERS = {
  concierge: [["o:rent", `Rent a suite (${P.rent.price} almond water)`], ["o:checkout", "Return the key"]],
  guide: [["o:escort", "Escort me to the Boiler Room"]],
  clerk: [["o:job", "The rat job"]],
  maid: [["o:gossip", "Heard anything?"]], bellhop: [["o:gossip", "Heard anything?"]], agent: [["o:gossip", "Anything moving?"]],
};
const ORIG = [["o:member", "Ask to join the salon"], ["o:lore", "Ask about the hotel"]];
export const roundsOf = (rows) => (rows ?? []).map(([x, z, dwell, act, lx, lz]) => ({ x, y: 0, z, dwell, act: ACT[act] ?? null, look: { x: lx, z: lz } }));
export function speak(ctx, o, t) {
  const now = ctx.now(), d = 1400 + t.length * 60; o.state.line = { t, at: now, d }; o.state.talkAt = now;
  const p = o.feetPosition; ctx.emit("playSound", { clip: VO(o.state.voice ?? "ale", t), position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 0.85, refDistance: 3, maxDistance: 18 }, { audience: { nearby: p, radius: 20 } });
}
export function spawnResident(ctx, id) {
  const g = P.people[id], r0 = g.rounds[0];
  ctx.spawn(id, { tags: ["npc", "l5res", `l5-${g.faction}`], feetPosition: { x: r0[0], y: 0, z: r0[1] }, rotation: { yaw: 0 }, physics: "character",
    ...critterSpec(npcLook(id, g.look, "l5", 12)), scale: { x: g.build?.w ?? 1, y: g.build?.h ?? 1, z: g.build?.w ?? 1 },
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js", "scripts/l5-resident.js"],
    state: { name: g.name, role: g.role, voice: g.voice, faction5: g.faction, factionName: FNAME[g.faction], species: g.look.species, outfit: `${g.look.topw}/${g.look.botw}/${g.look.top}`,
      offers: g.faction === "orig" ? ORIG : OFFERS[g.role] ?? [], rounds: roundsOf(g.rounds), ri: 0, mode: "day", home: { x: r0[0], z: r0[1] }, ...npcState(ctx, "agent", MEG.hp) } });
  if (g.gun) ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, ...weaponBody(g.gun) });
}
const pickIn = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
const busy = (o, now) => !o || (o.state.escortUntil ?? 0) > now || (o.state.talkAt && now - o.state.talkAt < 8000 && !o.state.meeting) || o.state.dead;
export function tickPeople(ctx) {
  const now = ctx.now(), ses = ctx.self.session, cyc = (P.day + P.night) * 1000;
  const phase = (now % cyc) < P.day * 1000 ? "day" : "night";
  let made = 0;
  for (const id of Object.keys(P.people)) {
    let o = ctx.getObject(id);
    if (!o) { if (made++ < 4) spawnResident(ctx, id); continue; }
    const s = o.state;
    if ((s.escortUntil ?? 0) && now > s.escortUntil) { s.escortUntil = 0; s.mode = ""; }
    if (s.meeting || (s.escortUntil ?? 0) > now) continue;
    if (s.mode !== phase) { s.mode = phase; s.rounds = roundsOf(phase === "night" && P.people[id].night ? P.people[id].night : P.people[id].rounds); s.ri = 0; }
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
