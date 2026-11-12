import { vo, hasVoice, recordedDuration } from "./voices.js";
// Camp chatter director: called from a place's sim tick. When a player stands near the camp, two or three
// NPCs run one exchange from chatter.yml, a line at a time: the speaker's state.line carries the words
// (ui.js floats them over its head), state.talkAt/talkTo start the talk gesture and turn them to the listener.
import { heard } from "./hear.js";
import C from "./data/chatter.yml";
const alive = (o) => o && !o.state?.dead && (o.state?.hp ?? 1) > 0;
export function tickChatter(ctx, list, voices) {
  const s = ctx.place.state, now = ctx.now();
  const c = s.chat;
  if (now < (c?.until ?? s.chatNext ?? 0)) return;
  const engaged = new Set(ctx.place.players.map((p) => p.state?.talkWith).filter(Boolean));
  const free = ([who]) => {
    const o = ctx.place.objects[who];
    return alive(o) && !engaged.has(o.id);
  };
  if (c) {
    const ex = list[c.ex];
    if (!ex || c.i >= ex.length - 1 || !ex.every(free)) { s.chat = null; s.chatNext = now + (C.gapMin + ctx.random() * (C.gapMax - C.gapMin)) * 1000; return; }
    const i = c.i + 1, [who] = ex[i], o = ctx.place.objects[who];
    s.chat = { ex: c.ex, i, until: now + say(ctx, o, ex, i, voices) };
    return;
  }
  // a player within earshot of anyone in the camp
  const ids = Object.keys(voices), objs = ids.map((id) => ctx.place.objects[id]).filter(alive);
  const listening = ctx.place.players.filter((p) => !p.state?.talkWith);
  const near = listening.some((p) => objs.some((o) => Math.hypot(p.feetPosition.x - o.feetPosition.x, p.feetPosition.z - o.feetPosition.z) < C.hear));
  if (!near) { s.chatNext = now + 3000; return; }
  const heardBy = (w) => { const o = ctx.place.objects[w]; return o && listening.some((p) => Math.hypot(p.feetPosition.x - o.feetPosition.x, p.feetPosition.z - o.feetPosition.z) < C.hear) }
  const nearEachOther = (ex) => { const o0 = ctx.place.objects[ex[0][0]]; return o0 && ex.every(([w]) => { const o = ctx.place.objects[w]; return o && Math.hypot(o0.feetPosition.x - o.feetPosition.x, o0.feetPosition.z - o.feetPosition.z) < (C.maxSpread ?? 32) }) }
  const ok = list.map((ex, k) => k).filter((k) => list[k].every(free) && heardBy(list[k][0][0]) && nearEachOther(list[k]) && k !== s.chatLast); // only a talk someone can hear starts
  if (!ok.length) { s.chatNext = now + 10000; return; }
  const k = ok[Math.floor(ctx.random() * ok.length)], [who] = list[k][0];
  s.chat = { ex: k, i: 0, until: now + say(ctx, ctx.place.objects[who], list[k], 0, voices) }; s.chatLast = k;
}
function say(ctx, o, ex, i, voices) {
  const [who, line] = ex[i], now = ctx.now();
  const to = ex[i + 1]?.[0] !== who && ex[i + 1] ? ex[i + 1][0] : ex[i - 1]?.[0] ?? null; // look at whoever answers (or whoever spoke last)
  const clip = vo(hasVoice(who) ? who : voices[who], line);
  const duration = recordedDuration(clip) || 1100 + line.length * 55;
  o.state.line = { t: line, at: now, d: duration + 300 };
  o.state.talkAt = now; o.state.talkTo = to;
  const p = o.feetPosition;
  heard(ctx, { clip, position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 0.8, refDistance: 3, maxDistance: 18 }, { audience: { nearby: p, radius: 20 } }, { ambient: true, duration });
  return duration + 300;
}
export const CHATTER = C;
