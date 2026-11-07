// Camp chatter director: called from a place's sim tick. When a player stands near the camp, two or three
// NPCs run one exchange from chatter.yml, a line at a time: the speaker's state.line carries the words
// (ui.js floats them over its head), state.talkAt/talkTo start the talk gesture and turn them to the listener.
import { heard } from "./hear.js";
import C from "./data/chatter.yml";
const VO = (who, line) => `/cdn/voice-meg-${who}-saying-${line.replace(/[^a-z ]/gi, "").trim().toLowerCase().replace(/ +/g, "-")}.mp3`;
const alive = (o) => o && !o.state?.dead && (o.state?.hp ?? 1) > 0;
export function tickChatter(ctx, list, voices) {
  const s = ctx.place.state, now = ctx.now();
  const c = s.chat;
  if (c) {
    const ex = list[c.ex];
    if (now < c.until) return;
    if (!ex || c.i >= ex.length - 1) { s.chat = null; s.chatNext = now + (C.gapMin + ctx.random() * (C.gapMax - C.gapMin)) * 1000; return; }
    const i = c.i + 1, [who, line] = ex[i], o = ctx.place.objects[who];
    if (!alive(o)) { s.chat = null; s.chatNext = now + C.gapMin * 1000; return; } // someone fell mid-talk: it just stops
    say(ctx, o, ex, i, voices); s.chat = { ex: c.ex, i, until: now + dur(line) };
    return;
  }
  if (now < (s.chatNext ?? 0)) return;
  // a player within earshot of anyone in the camp
  const ids = Object.keys(voices), objs = ids.map((id) => ctx.place.objects[id]).filter(alive);
  const near = ctx.place.players.some((p) => objs.some((o) => Math.hypot(p.feetPosition.x - o.feetPosition.x, p.feetPosition.z - o.feetPosition.z) < C.hear));
  if (!near) { s.chatNext = now + 3000; return; }
  const ok = list.map((ex, k) => k).filter((k) => list[k].every(([w]) => alive(ctx.place.objects[w])) && k !== s.chatLast);
  if (!ok.length) { s.chatNext = now + 10000; return; }
  const k = ok[Math.floor(ctx.random() * ok.length)], [who, line] = list[k][0];
  say(ctx, ctx.place.objects[who], list[k], 0, voices);
  s.chat = { ex: k, i: 0, until: now + dur(line) }; s.chatLast = k;
}
const dur = (line) => 1400 + line.length * 60;
function say(ctx, o, ex, i, voices) {
  const [who, line] = ex[i], now = ctx.now();
  const to = ex[i + 1]?.[0] !== who && ex[i + 1] ? ex[i + 1][0] : ex[i - 1]?.[0] ?? null; // look at whoever answers (or whoever spoke last)
  o.state.line = { t: line, at: now, d: dur(line) };
  o.state.talkAt = now; o.state.talkTo = to;
  const p = o.feetPosition;
  heard(ctx, { clip: VO(voices[who], line), position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 0.8, refDistance: 3, maxDistance: 18 }, { audience: { nearby: p, radius: 20 } });
}
export const CHATTER = C;
