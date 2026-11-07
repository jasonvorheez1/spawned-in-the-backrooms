// The Beverly Room's pressables (state.kind): the Mahjong table. The first touch warns you off (the game was left mid-turn); the
// second sits you down and sends for three guests (scripts/mahjong.js plays the game). This file also runs the guests' bodies:
// state.mjGuests = { host, at, beat, list: [{ id, v, stool, x, y, z, yaw }], leaving } is written by the game; here they walk in
// from the ballroom doors, sit on their stools, and walk out again when the host stands up or goes quiet.
import { heard } from "./lib/hear.js";
import { vo } from "./lib/voices.js";
const SOLO_MS = 300000; // Savi's pick: they play on about five minutes after you go, then drift out
const CLACK = "/cdn/moodboard-realistic-gritty/sfx-mahjong-tile-clack-on-felt-table.mp3", SHUFFLE = "/cdn/moodboard-realistic-gritty/sfx-mahjong-tiles-shuffling-washing-on-table.mp3";
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
function line(ctx, o, v, kind) {
  const V = MJ.visitors[v], t = pick(ctx, V?.lines?.[kind] ?? MJ.common[kind] ?? ["..."]), now = ctx.now(), f = o.feetPosition;
  o.state.line = { t, at: now, d: 1400 + t.length * 60 }; o.state.talkAt = now;
  heard(ctx, { clip: vo(v, t), position: { x: f.x, y: f.y + 1.4, z: f.z }, volume: 0.85, refDistance: 3, maxDistance: 18 }, { audience: { nearby: f, radius: 20 } });
}
// with no host the three play their own hands: a discard every few seconds, table talk, a win now and then, a fresh wash of tiles
function playOn(ctx, g, now) {
  const W = (ctx.self.session.mjSolo ??= { next: now + 3000, hand: now }), seated = g.list.map((e) => [e, ctx.getObject(e.id)]).filter(([, o]) => o?.state?.mjSat);
  if (!g.talked && seated.length) { const [e, o] = pick(ctx, seated); line(ctx, o, e.v, "left"); ctx.self.state.mjGuests = { ...g, talked: true }; return; }
  if (now < W.next || seated.length < 2) return;
  W.next = now + 2200 + ctx.random() * 3000;
  const at = { x: MJ.table[0], y: 0.9, z: MJ.table[1] }, aud = { audience: { nearby: at, radius: 14 } };
  const [e, o] = pick(ctx, seated);
  if (now - W.hand > 55000 + ctx.random() * 40000) {
    W.hand = now; W.next = now + 7000; line(ctx, o, e.v, ctx.random() < 0.5 ? "tsumo" : "win");
    const other = seated.find(([x]) => x !== e); if (other && ctx.random() < 0.7) setTimeoutLess(ctx, other);
    heard(ctx, { clip: SHUFFLE, position: at, volume: 0.55, maxDistance: 12 }, aud); return;
  }
  heard(ctx, { clip: CLACK, position: at, volume: 0.5, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 10 }, aud);
  
  if (ctx.random() < 0.22) line(ctx, o, e.v, ctx.random() < 0.6 ? "disc" : "solo");
}
function setTimeoutLess(ctx, [e, o]) { ctx.self.session.mjSolo.lose = { v: e.v, id: o.id, at: ctx.now() + 2600 }; }
function loseLine(ctx, now) { const L = ctx.self.session.mjSolo?.lose; if (!L || now < L.at) return; ctx.self.session.mjSolo.lose = null; const o = ctx.getObject(L.id); if (o) line(ctx, o, L.v, "lose"); }
import { critterSpec } from "./lib/critter-model.js";
import { npcLook } from "./lib/clothes.js";
import { npcState } from "./lib/stats.js";
import MEG from "./lib/data/meg.yml";
import MJ from "./lib/data/mahjong.yml";
import LOOKS from "./lib/data/mahjong-looks.yml";
const SND = "/cdn/moodboard-realistic-gritty/sfx-low-whisper-breath-swell-unsettling.mp3";
const SIT = { m: "cdn/clip-sit-loop.glb", f: "cdn/clip-sit-female-loop.glb" };
export const updateSchedule = { every: { seconds: 0.5 } };
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by); if (!who) return;
    if (ctx.self.state.kind !== "mahjong") return;
    if (who.state.mjWarned) { if (!who.state.mj) who.state.mj = { open: true, lobby: true }; return; } // the second time, you sit down anyway (scripts/mahjong.js)
    who.state.mjWarned = true;
    who.state.notice = { text: "You feel a strong urge to step away from it. (Touch it again to sit and play.)", at: ctx.now() };
    const me = ctx.self.worldFeetPosition, p = who.worldFeetPosition;
    let dx = p.x - me.x, dz = p.z - me.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    who.state.l5Shove = { x: p.x + dx * 1.5, z: p.z + dz * 1.5, at: ctx.now() };
    ctx.emit("impulse", { target: by, impulse: { x: dx * 420, y: 60, z: dz * 420 } });
    heard(ctx, { maxDistance: 22, refDistance: 3, clip: SND, position: { x: me.x, y: 1, z: me.z }, volume: 0.6 });
  },
};

function spawnGuest(ctx, e) {
  const V = MJ.visitors[e.v], look = LOOKS[e.v], [dx, dz] = MJ.door;
  ctx.spawn(e.id, { tags: ["npc", "mjguest"], feetPosition: { x: dx, y: 0, z: dz }, rotation: { yaw: -90 }, physics: "character",
    ...critterSpec(npcLook(e.id, look, "l5", 12)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: `${V.name} · ${V.role}`, role: "socialite", voice: e.v, species: V.species, outfit: `${look.topw}/${look.botw}/${look.top}`, mjguest: true, mjMode: "", rounds: [], ri: 0, mode: "day", home: { x: dx, z: dz }, ...npcState(ctx, "agent", MEG.hp) } });
}
const goTo = (o, mode, e) => {
  o.state.mjMode = mode; o.state.ri = 0; o.state.mjSat = mode === "in" ? o.state.mjSat : false;
  o.state.rounds = mode === "in" ? [{ x: e.x, y: e.y, z: e.z, dwell: 999, act: SIT[LOOKS[e.v].sex === "f" ? "f" : "m"], look: { x: MJ.table[0], z: MJ.table[1] } }] : [{ x: MJ.door[0], y: 0, z: MJ.door[1], dwell: 999, act: null, look: { x: MJ.door[0] - 3, z: MJ.door[1] } }];
};
export function update(ctx) {
  const s = ctx.self.state, g = s.mjGuests, now = ctx.now();
  const have = ctx.query({ tags: ["mjguest"] });
  if (!g) { for (const o of have) ctx.destroy(o.id); return; }
  if (!g.solo && !g.leaving && now - (g.beat ?? 0) > 20000) { s.mjGuests = { ...g, host: null, solo: true, soloAt: now, talked: false }; return; } // the host went quiet (gone, dropped): the game goes on
  if (g.solo && !g.leaving && now - (g.soloAt ?? now) > SOLO_MS) { s.mjGuests = { ...g, leaving: true, leaveAt: now }; return; }
  const leaving = g.leaving, ids = new Set(g.list.map((e) => e.id));
  if (g.solo && !leaving) { playOn(ctx, g, now); loseLine(ctx, now); }
  if (leaving && !g.leaveAt) { s.mjGuests = { ...g, leaving: true, leaveAt: now }; return; }
  g.list.forEach((e, i) => {
    let o = ctx.getObject(e.id);
    if (!o) { if (leaving || now < g.at + i * MJ.arrive) return; spawnGuest(ctx, e); o = ctx.getObject(e.id); if (!o) return; }
    const want = leaving ? "out" : "in", f = o.feetPosition, sex = LOOKS[e.v].sex === "f" ? "f" : "m";
    if (o.state.mjMode !== want) {
      if (o.state.mjSat) { const r = (e.yaw * Math.PI) / 180; o.anim.sit = null; o.feetPosition = { x: e.x + Math.sin(r) * 0.55, y: 0, z: e.z + Math.cos(r) * 0.55 }; } // up off the stool, a step back from the table
      goTo(o, want, e);
    }
    // a guest who stalls (a snag, a crowd) for 4 s takes a stride straight at the stool; past 30 s they are simply seated
    if (want === "in" && !o.state.mjSat) {
      const d = Math.hypot(f.x - e.x, f.z - e.z), W = (ctx.self.session.mjWalk ??= {}), ss = (W[e.id] ??= { d, at: now, since: now });
      if (d < ss.d - 0.5) { ss.d = d; ss.at = now; }
      else if (now - ss.at > 4000) { const k = Math.min(1.5, d - 0.5) / d; o.feetPosition = { x: f.x + (e.x - f.x) * k, y: f.y, z: f.z + (e.z - f.z) * k }; ss.d = d - 1.5; ss.at = now; }
      if (now - ss.since > 30000) o.feetPosition = { x: e.x, y: e.y, z: e.z };
    }
    // the stool: the agent stops a stride short, so the last step is made here (the sit clip carries the stool's height)
    if (want === "in" && !o.state.mjSat && Math.hypot(f.x - e.x, f.z - e.z) < 1.3) {
      o.feetPosition = { x: e.x, y: e.y - 0.1, z: e.z }; o.rotation = { yaw: e.yaw }; o.velocity = { x: 0, y: 0, z: 0 };
      o.anim.sit = { clip: SIT[sex], loop: "loop", weight: 1, blendIn: 0.5 }; o.state.mjSat = true;
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-soft-cushion-sit-down-fabric-rustle.mp3", position: { x: e.x, y: 0.5, z: e.z }, volume: 0.4, maxDistance: 8 }, { audience: { nearby: { x: e.x, y: 0, z: e.z }, radius: 10 } });
    }
    if (leaving) { const f = o.feetPosition; if (Math.hypot(f.x - MJ.door[0], f.z - MJ.door[1]) < 1.4 || now - (g.leaveAt ?? now) > 40000) ctx.destroy(e.id); }
  });
  for (const o of have) if (!ids.has(o.id)) ctx.destroy(o.id);
  if (leaving && !g.list.some((e) => ctx.getObject(e.id))) s.mjGuests = null;
}
