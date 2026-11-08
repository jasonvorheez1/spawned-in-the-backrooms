// General NPC life, for every scripts/meg-agent.js body in every level: when nothing is happening, people are not statues.
//   milling   a person with no rounds drifts a few steps from their post now and then, looks round, comes back
//   small talk two idle neighbours walk up to each other and have a short real exchange (their own temper, want, fear and quirk from lib/npc-life.js, or an ordinary
//             Backrooms one), spoken aloud in their own voices, facing one another, with the talk gestures; only when someone is near to hear it, and never while either is busy
// Called from meg-agent.js's update, on its idle path: returns true when it has the body this tick.
import { lifeOf } from "./npc-life.js";
import { temperOf } from "./personality.js";
import { heard } from "./hear.js";
import { vo } from "./voices.js";

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const alive = (o) => !!o && !o.state?.dead && (o.state?.hp ?? 1) > 0;
const WANTS_OF = (w) => String(w).replace(/^to /, "");
// ordinary exchanges: [0 = the one who started it, 1 = the other]
const TALK = [
  [[0, "you eat yet today?"], [1, "half a ration. you?"], [0, "water. mostly water."]],
  [[0, "hear that? the hum changed."], [1, "it does that. don't count it."], [0, "i count everything. that's the problem."]],
  [[0, "if you could go back up, what's the first thing you'd do?"], [1, "sit in a chair that doesn't hum."], [0, "yeah. same."]],
  [[0, "new faces came through earlier. nervous ones."], [1, "they all are, the first week."], [0, "we were too."]],
  [[0, "my feet are killing me."], [1, "try standing in boots two sizes small."], [0, "why are they two sizes small?"], [1, "it's what the crate had."]],
  [[0, "what day do you think it is?"], [1, "tuesday. i've decided it's always tuesday."]],
  [[0, "i keep thinking i hear someone behind the wall."], [1, "don't answer it."], [0, "i wasn't going to."]],
  [[0, "you sleep at all?"], [1, "in pieces."], [0, "that's what i do. in pieces."]],
  [[0, "i found a bar of something in my pocket. don't know whose."], [1, "eat it."], [0, "yeah. yeah, okay."]],
  [[0, "somebody should write all this down."], [1, "somebody is. i've seen the notebooks."], [0, "good. somebody should read them too."]],
];
const exchangeFor = (a, b) => {
  const A = lifeOf(a.id), B = lifeOf(b.id), r = Math.random();
  if (r < 0.2) return [[0, `do you ever think about ${WANTS_OF(A.want)}?`], [1, "every day. don't make me say it out loud."], [0, "no. i won't."]];
  if (r < 0.34) return [[0, `you ever see ${A.fear} up close?`], [1, "no. and i'd like to keep it that way."], [0, "me neither. that's the whole plan."]];
  if (r < 0.46) return [[0, `you're the one who ${B.quirk}, aren't you?`], [1, "...you noticed."], [0, "everybody noticed."]];
  if (r < 0.54 && temperOf(a) === "nervous") return [[0, "okay but what if the lights don't come back on?"], [1, "they always come back on."], [0, "always. right. always."]];
  if (r < 0.6 && temperOf(a) === "cocky") return [[0, "i could've taken that hound alone, you know."], [1, "you hid behind a pillar."], [0, "tactically."]];
  return TALK[Math.floor(Math.random() * TALK.length)];
};

const voiceOf = (o) => o.state.voice ?? `${String(o.id).split("/").pop()}#${(o.state?.wear?.sex ?? o.state?.look?.sex) === "f" ? "f" : "m"}`;
export function say(ctx, o, text, to) {
  const now = ctx.now(), st = o.state, p = o.feetPosition, d = 1500 + text.length * 62;
  st.line = { t: text, at: now, d }; st.talkAt = now; st.talkTo = to ?? null;
  heard(ctx, { clip: vo(voiceOf(o), text), position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 0.8, refDistance: 3, maxDistance: 16 }, { audience: { nearby: p, radius: 18 } });
  return d;
}
const idleish = (o) => alive(o) && !o.state.follow && !o.state.mjguest && !(o.state.angry && Object.keys(o.state.angry).length) && !o.tags?.includes?.("l5staff") && !o.tags?.includes?.("faceling");

// returns true while this call owns the body's movement (approaching, talking, milling)
export function social(ctx, me, m, now, dt, io) {
  const s = me.state, p = me.feetPosition; if (s.follow || s.dead || s.mjguest) { m.convo = m.mill = null; return false; }
  // an exchange in progress: walk up if not close enough, then speak the lines in turn
  const c = m.convo;
  if (c) {
    const peer = ctx.getObject(c.peer);
    if (!alive(peer) || now > c.giveUp || ctx.place.players.some((q) => q.state?.talkWith === me.id || q.state?.talkWith === c.peer)) { m.convo = null; m.socialAt = now + 30000; return false; }
    const d = flat(p, peer.feetPosition);
    if (!c.started) {
      peer.state.talkAt = now; peer.state.talkTo = me.id; // the one being walked up to turns to look
      if (d > 2.3) { io.gait(me, m, "walk"); io.moveAlong(ctx, me, m, { x: peer.feetPosition.x, y: peer.feetPosition.y, z: peer.feetPosition.z }, 1.7, dt); return true; }
      c.started = now; c.next = now;
      peer.state.talkTo = me.id; peer.state.talkAt = now;
    }
    io.stop(me, dt); io.gait(me, m, "idle"); io.face(me, peer.feetPosition.x - p.x, peer.feetPosition.z - p.z, dt);
    if (now >= c.next) {
      if (c.i >= c.lines.length) { m.convo = null; m.socialAt = now + 45000 + ctx.random() * 70000; return false; }
      const [who, text] = c.lines[c.i++], speaker = who === 0 ? me : peer, listener = who === 0 ? peer : me;
      c.next = now + say(ctx, speaker, text, listener.id) + 350 + ctx.random() * 700;
      peer.state.talkAt = now; me.state.talkAt = now; if (who === 1) me.state.talkTo = peer.id;
    }
    return true;
  }
  // milling: a few steps away from the post, a look round, then back (the normal walk-home does the coming back)
  const k = m.mill;
  if (k) {
    if (now > k.until) { m.mill = null; return false; }
    const d = flat(p, k);
    if (d > 0.7 && !k.there) { io.gait(me, m, "walk"); io.moveAlong(ctx, me, m, { x: k.x, y: p.y, z: k.z }, 1.4, dt); return true; }
    k.there ||= now; io.stop(me, dt); io.gait(me, m, "idle");
    if (now - k.there > k.pause) { m.mill = null; }
    return true;
  }
  if (now < (m.socialAt ??= now + 6000 + ctx.random() * 22000)) return false;
  m.socialAt = now + 8000 + ctx.random() * 14000;
  // nobody to hear it, nobody does it: only while a player is within earshot
  if (!ctx.place.players.some((q) => flat(q.feetPosition, p) < 24)) return false;
  if (now - (s.talkAt ?? 0) < 8000 || !idleish(me)) return false;
  const peers = ctx.query({ tags: ["npc"], center: p, radius: 11 }).filter((o) => o.id !== me.id && idleish(o) && !o.state.rounds?.some?.((r) => r.act === "guard") && now - (o.state.talkAt ?? 0) > 8000 && !o.session?.m?.convo && !ctx.place.players.some((q) => q.state?.talkWith === o.id))
    .sort((a, b) => flat(a.feetPosition, p) - flat(b.feetPosition, p));
  if (peers.length && ctx.random() < 0.6) {
    const peer = peers[0];
    m.convo = { peer: peer.id, lines: exchangeFor(me, peer), i: 0, giveUp: now + 20000, started: 0 }; peer.state.talkAt = now; peer.state.talkTo = me.id;
    return false;
  }
  if (!s.rounds?.length && ctx.random() < 0.55) { // a person with no chores to walk: drift a little
    const a = ctx.random() * Math.PI * 2, r = 1.6 + ctx.random() * 2.6, home = s.home ?? p;
    m.mill = { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r, until: now + 14000, pause: 3500 + ctx.random() * 6500 };
  }
  return false;
}
