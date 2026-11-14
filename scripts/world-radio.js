// A radio standing in the world picks up Radio Backrooms (Shelly Nov 14: "disperge the existing radios to play radio backrooms (should sound broken sounding)").
// Same broadcast clock as the HALOGEN (scripts/lib/radio.js), so it plays the same song at the same second, but through bad reception:
// a hiss bed under it, the signal fading in and out, and short dropouts where static takes over. All of it is this machine's own sound
// (local children), worked out from the room clock, so nothing networks per tick.
// state.on === false = switched off (l5-door.js toggles it). state.hiss = its own static loop; state.reach = metres it carries.
import { onAir, stationOf } from "./lib/radio.js";
const HISS = "cdn/moodboard-realistic-gritty/sfx-shortwave-radio-static-hiss-with-faint-warbling-tones-loop.mp3";
const STEP = 0.35;            // seconds between reception changes (Savi's pick)
const DROP = 0.14;            // chance a step drops out to static (Savi's pick)
const BAD = 0.25;             // chance a 4 s stretch is bad reception, dropping half its steps
const h = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function clear(ctx, ses) { for (const k of ["song", "st"]) { if (ses[k] && ctx.getObject(ses[k])) ctx.destroy(ses[k]); ses[k] = null; } ses.seg = -1; }
export function update(ctx) {
  const me = ctx.self, s = me.state ?? {}, ses = me.session;
  if (s.on === false) { clear(ctx, ses); return ctx.sleep(); }
  // state.station picks the station (index in STATIONS, 0 = Radio Backrooms); state.clean = a good receiver, no dropouts
  const STA = stationOf(s.station ?? 0), now = ctx.now(), air = onAir(now, STA), reach = s.reach ?? 14, base = (s.gain ?? 0.5) * ((STA.gain ?? 0.55) / 0.55);
  if (ses.sta !== STA.key) { ses.sta = STA.key; ses.seg = -1; }
  const slot = Math.floor(now / (STEP * 1000)), bad = !s.clean && h(Math.floor(now / 4000) + 0.5) < BAD;
  const drop = !s.clean && (h(slot) < DROP || (bad && h(slot + 3.3) < 0.5));
  const songGain = drop ? 0.015 : base * (0.55 + 0.45 * h(slot + 9.1));
  const hissGain = drop ? base * 0.9 : s.clean ? base * 0.04 : base * (bad ? 0.35 : 0.16);
  if (!ses.st || !ctx.getObject(ses.st)) ses.st = ctx.spawn({ parent: me.id, audience: "local", scope: "session", feetPosition: { x: 0, y: 0.2, z: 0 },
    audio: { clip: s.hiss ?? HISS, loop: true, gain: hissGain, spatial: true, refDistance: 1.5, maxDistance: reach } });
  if (!ses.song || !ctx.getObject(ses.song)) { ses.song = ctx.spawn({ parent: me.id, audience: "local", scope: "session", feetPosition: { x: 0, y: 0.2, z: 0 } }); ses.seg = -1; }
  const song = ctx.getObject(ses.song), st = ctx.getObject(ses.st);
  if (ses.seg !== air.i) {
    ses.seg = air.i;
    song.audio = { clip: air.seg.clip, time: air.offset, timeAt: now, gain: songGain, spatial: true, refDistance: 1.5, maxDistance: reach, bus: "Music" };
  } else if (song.audio) song.audio.gain = songGain;
  if (st?.audio) st.audio.gain = hissGain;
  return ctx.sleep(Math.min(STEP, air.left + 0.05));
}
