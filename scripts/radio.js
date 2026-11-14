// The HALOGEN radio (Shelly, Nov 14): a wrist tab that tunes into Radio Backrooms.
// player.state.radioOn is the dial (kept in the save); radioOpen is the tab. The sound is this machine's own child of the
// player, seeked to the station clock (scripts/lib/radio.js), so it's in step with every other listener.
import { onAir, STATION, STATIONS, stationOf } from "./lib/radio.js";
import { canOpen, openWrist, screen } from "./lib/screen.js";
const QUIET = new Set(["cutscene", "talk", "menu", "wardrobe"]); // Ralph holds while someone talks or a cutscene plays
const TICK = "cdn/moodboard-realistic-gritty/sfx-old-radio-knob-click.mp3";
export function onInput(ctx, input) {
  const s = ctx.self.state; if (!s) return;
  if (!input.pressed?.radio) return;
  const k = input.actionData?.radio?.k;
  if (k === "tune") { // pick a station: tuned in to it, or off when it's the one already on
    const n = Math.max(0, Math.min(STATIONS.length - 1, input.actionData.radio.st | 0));
    const same = s.radioOn && (s.radioSt | 0) === n;
    s.radioSt = n; s.radioOn = !same;
    ctx.emit("playSound", { clip: s.radioOn ? STATION.static : TICK, volume: 0.5 }, { audience: { player: ctx.self.id } });
    return;
  }
  if (k === "power") {
    s.radioOn = !s.radioOn;
    ctx.emit("playSound", { clip: s.radioOn ? STATION.static : TICK, volume: 0.5 }, { audience: { player: ctx.self.id } });
    return;
  }
  if (s.radioOpen) s.radioOpen = false; else if (canOpen(s, ctx.self.place, "radio")) openWrist(s, "radio");
}
export function update(ctx) {
  const me = ctx.self; if (!me.isLocal) return ctx.sleep(5);
  const s = me.state ?? {}, ses = ctx.self.session;
  const want = !!s.radioOn && !QUIET.has(screen(s, me.place));
  const has = ses.radioId && ctx.getObject(ses.radioId);
  const hush = ses.hushId && ctx.getObject(ses.hushId);
  if (!want) { if (has) ctx.destroy(ses.radioId); if (hush) ctx.destroy(ses.hushId); ses.radioId = ses.hushId = null; ses.seg = -1; return ctx.sleep(0.5); }
  // the other music hushes for this listener while Ralph is on (scripts/music-hush.audio.js)
  if (!hush) ses.hushId = ctx.spawn({ parent: me.id, audience: "local", scope: "session", tags: ["radio-hush"], feetPosition: { x: 0, y: 1, z: 0 },
    audio: { kind: "program", script: "scripts/music-hush.audio.js", input: "Music", listeners: [me.id] } });
  const now = ctx.now(), st = stationOf(s.radioSt), air = onAir(now, st);
  if (!has) { ses.radioId = ctx.spawn({ parent: me.id, audience: "local", scope: "session", tags: ["halogen-radio"], feetPosition: { x: 0, y: 1.2, z: 0 } }); ses.seg = -1; }
  if (ses.seg !== air.i || ses.st !== st.key || ctx.getObject(ses.radioId)?.audio?.bus !== "Radio") { // a stream from before the hush moves to its own group
    ses.seg = air.i; ses.st = st.key;
    const o = ctx.getObject(ses.radioId);
    if (o) o.audio = { clip: air.seg.clip, time: air.offset, timeAt: now, spatial: false, gain: st.gain, bus: "Radio", priority: 85 }; // its own group: the hush on Music leaves it alone
    if (s.radioSeg !== air.i) s.radioSeg = air.i; // the tab's "now playing" redraws once a segment
    // warm the next two segments: a host line seeks to the station clock, so a clip still downloading when its turn came lost its first seconds (Shelly: "skips his voice a lot")
    const S = st.segments, refs = [1, 2].map((k) => S[(air.i + k) % S.length].clip).filter(Boolean);
    if (refs.length) ctx.emit("preload", { refs }, { audience: { player: me.id } });
  }
  return ctx.sleep(Math.min(1, air.left + 0.05));
}
