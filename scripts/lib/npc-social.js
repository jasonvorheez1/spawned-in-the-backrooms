import { voiceKey } from './voices.js'
// General NPC life, for every scripts/meg-agent.js body in every level: when nothing is happening, people are not statues.
//   milling   a person with no rounds drifts a few steps from their post now and then, looks round, comes back
//   small talk two idle neighbours walk up to each other and have a short real exchange (their own temper, want, fear and quirk from lib/npc-life.js, or an ordinary
//             Backrooms one), spoken aloud in their own voices, facing one another, with the talk gestures; only when someone is near to hear it, and never while either is busy
// Called from meg-agent.js's update, on its idle path: returns true when it has the body this tick.
import { lifeOf } from "./npc-life.js";
import { temperOf } from "./personality.js";
import { heard } from "./hear.js";
import { vo } from "./voices.js";
import C from "./data/chatter.yml";
// a camp's own cast talks only in its own written exchanges (chatter.yml, run by chatter.js): never the stranger pool
const CAST = new Set(Object.values(C).flatMap((v) => Array.isArray(v) ? v.flatMap((ex) => ex.map(([w]) => w)) : []));
const own = (o) => CAST.has(String(o?.id ?? "").split("/").pop());

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const alive = (o) => !!o && !o.state?.dead && (o.state?.hp ?? 1) > 0;
const WANTS_OF = (w) => String(w).replace(/^to /, "");
// ordinary exchanges: [0 = the one who started it, 1 = the other]
const TALK = [
  [[0, "you eat yet?"], [1, "half a ration."], [0, "that's not eating."], [1, "it's what there was."]],
  [[0, "hear that? the hum went up."], [1, "it does that."], [0, "it didn't do it yesterday."], [1, "you weren't listening yesterday."]],
  [[0, "what day is it?"], [1, "tuesday."], [0, "it was tuesday last time."], [1, "then it's tuesday."]],
  [[0, "my boots are wet through."], [1, "again?"], [0, "still. i never dried them."]],
  [[0, "new ones came in this morning."], [1, "how many?"], [0, "two. one's already crying."], [1, "give it a day."]],
  [[0, "you sleep?"], [1, "some."], [0, "me too. some."]],
  [[0, "i found half a bar in my coat. don't know whose."], [1, "eat it."], [0, "it's got a bite out of it."], [1, "eat the other half."]],
  [[0, "that pipe's knocking again."], [1, "it's the pressure."], [0, "that's what you said last time."], [1, "and it was."]],
  [[0, "who's got watch?"], [1, "not me. i did last night."], [0, "so me."], [1, "so you."]],
  [[0, "there's a stain on the wall that wasn't there."], [1, "which wall?"], [0, "never mind. it's gone."]],
  [[0, "you got a spare lighter?"], [1, "no. you owe me one."], [0, "i do not."], [1, "you do."]],
];
const exchangeFor = (ctx, a, b) => {
  const own = C[`${a.place}_strangers`]; if (own?.length) return own[Math.floor(ctx.random() * own.length)]; // a level with its own small talk (chatter.yml <place>_strangers)
  const A = lifeOf(a.id), r = ctx.random();
  if (r < 0.17) return [[0, `i want ${A.want} so bad today.`], [1, "today? you said that last week too."], [0, "i say it most weeks."]];
  if (r < 0.3) return [[0, `i thought i saw ${A.fear} earlier.`], [1, "did you?"], [0, "no. probably not."], [1, "okay."]];
  if (r < 0.37 && temperOf(a) === "nervous") return [[0, "what if the lights don't come back?"], [1, "they always come back."], [0, "they did last time. that's all i know."]];
  if (r < 0.43 && temperOf(a) === "cocky") return [[0, "i could've taken that hound alone."], [1, "you were behind a pillar."], [0, "it was a good pillar."]];
  if (r < 0.48 && temperOf(a) === "gruff") return [[0, "you're in my spot."], [1, "your spot?"], [0, "i've stood there a month."], [1, "stand somewhere else."]];
  return TALK[Math.floor(ctx.random() * TALK.length)];
};

const voiceOf = (o) => voiceKey(o);
export function say(ctx, o, text, to) {
  const now = ctx.now(), st = o.state, p = o.feetPosition, d = 1500 + text.length * 62;
  st.line = { t: text, at: now, d }; st.talkAt = now; st.talkTo = to ?? null;
  heard(ctx, { clip: vo(voiceOf(o), text) ?? vo(String(o.id).split('/').pop(), text), position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 0.8, refDistance: 3, maxDistance: 16 }, { audience: { nearby: p, radius: 18 } });
  return d;
}
const idleish = (o) => alive(o) && !own(o) && !o.state.follow && !o.state.mjguest && !(o.state.angry && Object.keys(o.state.angry).length) && !o.tags?.includes?.("l5staff") && !o.tags?.includes?.("faceling");

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
    m.convo = { peer: peer.id, lines: exchangeFor(ctx, me, peer), i: 0, giveUp: now + 20000, started: 0 }; peer.state.talkAt = now; peer.state.talkTo = me.id;
    return false;
  }
  if (!s.rounds?.length && ctx.random() < 0.55) { // a person with no chores to walk: drift a little
    const a = ctx.random() * Math.PI * 2, r = 1.6 + ctx.random() * 2.6, home = s.home ?? p;
    m.mill = { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r, until: now + 14000, pause: 3500 + ctx.random() * 6500 };
  }
  return false;
}
