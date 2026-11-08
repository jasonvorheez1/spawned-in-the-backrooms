const ORIGIN=require("lib/sound-origin.js");
// Player-side Cinema playback mailbox for camera, sets, actions, audio, subtitles and atmosphere. Restore prior state and clean transient playback objects when a sequence ends.

export const updateSchedule = { every: 3 };

export function update(objectApi, dt) {
  const s = objectApi.getState();
  // THE CUT REACHES THE SOUND (strike runs on the god seat; the cue timers live HERE): app-shell bumps sbStageCut and this seat stops its own conductor — emitters destroyed, pending arms disowned. Checked before the mailbox so a strike lands even when no clip is waiting.
  const cut = Number(s.sbStageCut || 0);
  if (cut && cut !== Number(s.sbStageCutDone || 0)) {
    objectApi.patchState({ sbStageCutDone: cut });
    try {
      require("lib/soundplay.js").stop(objectApi);
    } catch (e) {
      objectApi.log("[courier] cue stop failed: " + String((e && e.message) || e));
    }
    // THE CUT REACHES THE LIGHT: a strike puts the room's own atmosphere back, now.
    restoreMood(objectApi, s, "strike");
    // THE CUT REACHES THE WORDS: subtitle row gone, every voice emitter gone, pending after-rows dropped.
    clearLines(objectApi, s);
  }
  const stage = s.sbStage;
  if (!stage || typeof stage !== "object") {
    // The stage was cleared (shootBack, or a strike that cleared it before this tick saw the cut):
    // a mood still painted from the last take goes home with it.
    if (s.sbAtmo && s.sbAtmo.painted) restoreMood(objectApi, s, "stage cleared");
    if (s.sbLine || s.sbAfter) clearLines(objectApi, s);
    if(s.sbSoundPlaying) { require("lib/soundplay.js").stop(objectApi); objectApi.patchState({sbSoundPlaying:false}); }
    return;
  }
  const token = Number(stage.token || 0);
  if (!token) return;
  if (token === Number(s.sbStageDone || 0)) {
    // The clip is rolling (or done) — mid-take set swaps, action beats and moods ride the director's own clock.
    runSwaps(objectApi, s, stage, token);
    runActions(objectApi, s, stage, token);
    runMoods(objectApi, s, stage, token);
    // THE CLIP'S END: the director flips cinemaPlayback.playing off when the sequence is spent; the
    // room's own light comes back on the same tick, exactly as it was before the picture started.
    const play = s.cinemaPlayback;
    const audible=!!(play&&play.playing);
    if(audible!==!!s.sbSoundPlaying) {
      const conductor=require("lib/soundplay.js");
      if(audible) conductor.play(objectApi,stage.cues||[],{effects:stage.cueEffects||[],total:Number(stage.seconds||0),offset:Number(play.time||0)});
      else conductor.stop(objectApi);
      objectApi.patchState({sbSoundPlaying:audible});
    }
    if (s.sbAtmo && s.sbAtmo.painted && Number(s.sbAtmo.token || 0) === token && !(play && play.playing)) restoreMood(objectApi, s, "clip end");
    // THE CLIP'S END reaches the words too: the subtitle leaves and every voice emitter goes.
    if ((s.sbLine || s.sbAfter) && !(play && play.playing)) clearLines(objectApi, s);
    return;
  }
  // THE NEXT PRESS: a new token is waiting. If the last take's mood is still painted (its clip was mid-play, or ended while a new stage was already on the mailbox), put the light back BEFORE this take snapshots it | a snapshot taken over a painted mood would restore the mood, not the room.
  if (s.sbAtmo && s.sbAtmo.painted && Number(s.sbAtmo.token || 0) !== token) restoreMood(objectApi, s, "next press");

  const nodes = Array.isArray(stage.nodes) ? stage.nodes : [];
  const seq = Array.isArray(stage.sequence) ? stage.sequence : [];
  // The director's own play handler refuses under 2 shots — mirror it, consume the token either
  // way so a bad clip never wedges the mailbox.
  if (!nodes.length || seq.length < 2) {
    objectApi.patchState({ sbStageDone: token });
    objectApi.log("[courier] clip refused: " + nodes.length + " nodes, " + seq.length + " sequence entries");
    return;
  }

  // HOLD FOR THE AUDIENCE (jace, 2026-08-27 ~2:02 AM: "have the buttons wait/notify until the user is out of godmode"): the god fly-cam outranks the play camera, so a clip started in god mode plays to nobody. The chip's button is the cancel path — it clears sbStage outright (app-shell's shootBack), so a clip put down never surprise-plays on a later god-mode exit. or they will get mad, take over a small country") — a screen toast survives the panel being folded, closed, or never looked at.
  if (objectApi.isGodMode()) {
    if (Number(s.sbStageNoticed || 0) !== token) {
      objectApi.patchState({ sbStageNoticed: token });
      objectApi.toast("Your cut is ready — exit god mode (Tab+G) to watch it", { icon: "🎬", duration: 8 });
    }
    return;
  }

  // THE ROOM'S OWN LIGHT, remembered before the first mood can touch it (only when this take has one).
  snapshotMood(objectApi, stage, token);
  objectApi.patchState({
    sbStageDone: token,
    cinemaNodes: nodes,
    cinemaSequence: seq,
    cinemaEffects: Array.isArray(stage.effects) ? stage.effects : [],
    cinemaPlayback: { playing: true, time: 0, looping: false },
  });
  // Same flip the mod's play handler makes; its stopPlayback restores look/pointerLock when the
  // clip ends, so there is nothing to undo here.
  objectApi.setCamera({ kind: "custom", pointerLock: false, orientation: { source: "script" } }, { mode: "merge" });

  // THE SOUND STARTS WITH THE PICTURE (jace, ~2:20 AM: "it played before the shot did") — the
  // same token that starts the camera arms the cues, on THIS seat, so the god-mode hold above
  // holds both halves of the movie.
  const fx = Array.isArray(stage.cueEffects) ? stage.cueEffects : [];
  {
    try {
      const SOUNDPLAY = require("lib/soundplay.js");
      SOUNDPLAY.play(objectApi, Array.isArray(stage.cues) ? stage.cues : [], {
        effects: fx,
        total: Number(stage.seconds || 0),
      });
      objectApi.patchState({sbSoundPlaying:true});
    } catch (e) {
      objectApi.log("[courier] cues failed to arm: " + String((e && e.message) || e));
    }
  }
}

// segments is the swap schedule shoot() resolved at press time — spawn-ready specs, zero reads here. time — one timing, never two) reaches its second, a beat early so the cut lands on the new set. js's SET_TAG, inlined so this leaf never drags the whole shoot lane onto the player path.
export function runSwaps(objectApi, s, stage, token) {
  const segs = Array.isArray(stage.segments) ? stage.segments : [];
  if (segs.length < 2) return;
  const play = s.cinemaPlayback;
  if (!play || !play.playing) return;
  const t = Number(play.time || 0);
  const mark = s.sbSwapDone && Number(s.sbSwapDone.token || 0) === token ? Number(s.sbSwapDone.next || 1) : 1;
  let next = mark;
  while (next < segs.length && t >= Number(segs[next].time || 0) - 0.12) {
    const seg = segs[next];
    next++;
    let hits = [];
    try {
      hits = objectApi.query({ tags: ["sb-set"] }) || [];
    } catch (e) {
      hits = [];
    }
    for (let i = 0; i < hits.length; i++) {
      try {
        objectApi.destroy(hits[i].id);
      } catch (e) {
        /* already gone */
      }
    }
    const specs = Array.isArray(seg.specs) ? seg.specs : [];
    for (let i2 = 0; i2 < specs.length; i2++) {
      try {
        objectApi.spawn(specs[i2]);
      } catch (e) {
        objectApi.log("[courier] swap piece failed: " + String((e && e.message) || e));
      }
    }
  }
  if (next !== mark) objectApi.patchState({ sbSwapDone: { token: token, next: next } });
}

// actions is the schedule shoot() resolved at press time — set-piece ids, clips the pieces really have, seconds on the director's clock, sorted. js runs where the piece is simulated and does the playing, so this seat never touches another object's mixer. sbActDone is the token-scoped done-marker, sbSwapDone's twin, so a replay of the same clip fires the beats again and a stale clip never does. actDone equals the key, a line anchor when this seat's own schedule finished it — or until the safety valve: static time + AFTER_VALVE seconds on the director's clock, logged, so a stuck clip never stalls the scene.
const AFTER_VALVE = 8;

export function fireRow(objectApi, a, token, seq) {
  const kind = a.kind || "act";
  try {
    if (kind === "nav") {
      objectApi.patchObjectState(String(a.id), { nav: { token: token, seq: seq, points: a.points || [], facings: a.facings || [], pauses: a.pauses || [], seconds: Number(a.seconds || 0), clip: String(a.clip || ""), exit: !!a.exit, enter: !!a.enter, key: String(a.key || "") } });
    } else if (kind === "line") {
      startLine(objectApi, a, token);
    } else if (kind === "act" && a.id) {
      objectApi.patchObjectState(String(a.id), { act: { clip: String(a.clip || ""), token: token, seq: seq, hold: Number(a.hold || 0), key: String(a.key || "") } });
    }
  } catch (e) {
    objectApi.log("[courier] " + kind + " failed on " + String(a.id || a.key) + ": " + String((e && e.message) || e));
  }
}

export function anchorDone(objectApi, s, a, token) {
  const key = String(a.afterKey || "");
  if (!key) return true;
  const anc = a.anchor || {};
  if (anc.onLine) return !!(s.sbLineDone && Number(s.sbLineDone.token || 0) === token && s.sbLineDone.keys && s.sbLineDone.keys[key]);
  if (!a.anchorId) return false;
  let st = null;
  try {
    st = objectApi.getObjectState(String(a.anchorId));
  } catch (e) {
    st = null;
  }
  if (!st) return false;
  if (anc.onNav) return String(st.navDone || "") === key;
  if (anc.onAct) return String(st.actDone || "") === key;
  return false;
}

export function runActions(objectApi, s, stage, token) {
  const acts = Array.isArray(stage.actions) ? stage.actions : [];
  if (!acts.length) return;
  const play = s.cinemaPlayback;
  if (!play || !play.playing) return;
  const t = Number(play.time || 0);
  const mark = s.sbActDone && Number(s.sbActDone.token || 0) === token ? Number(s.sbActDone.next || 0) : 0;
  let next = mark;
  while (next < acts.length && t >= Number(acts[next].time || 0) - 0.12) {
    const a = acts[next];
    next++;
    // A mood row (kind "atmo") shares this clock but is runMoods' to fire | never a set-piece write.
    if (!a || a.kind === "atmo") continue;
    if (a.afterKey) continue; // waits on its anchor below
    if (a.kind !== "line" && !a.id) continue;
    fireRow(objectApi, a, token, next);
  }
  if (next !== mark) objectApi.patchState({ sbActDone: { token: token, next: next } });

  // The event-anchored rows: fired the tick their anchor is done, or at the valve.
  const after = s.sbAfter && Number(s.sbAfter.token || 0) === token && s.sbAfter.fired ? s.sbAfter.fired : {};
  let fired = null;
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i];
    if (!a || !a.afterKey || a.kind === "atmo" || after[i]) continue;
    const seq = i + 1;
    let go = anchorDone(objectApi, s, a, token);
    if (!go && t >= Number(a.time || 0) + AFTER_VALVE) {
      go = true;
      objectApi.log("[courier] " + String(a.kind || "act") + " " + String(a.key || "") + " waited on " + String(a.afterKey) + " past the valve (" + AFTER_VALVE + "s) — fired at its static time instead");
    }
    if (!go) continue;
    if (!fired) fired = Object.assign({}, after);
    fired[i] = true;
    fireRow(objectApi, a, token, seq);
  }
  if (fired) objectApi.patchState({ sbAfter: { token: token, fired: fired } });
  runLines(objectApi, objectApi.getState(), token);
}

// ── LINES ON THE CAMERA (jace 2026-09-02: "no narrator voiceover or lines on the camera") ───────── A line row = { key, who, text, chunks: [{ text, seconds, clip }] }.
const SUBTITLE_ROW = "sb-subtitle";
const VOICE_TAG = "sb-voice";
const VOICE_PREFIX = "sb-voice-";

export function escapeHtml(v) {
  return String(v === null || v === undefined ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function subtitleHtml(who, words) {
  return (
    '<div id="sb-subtitle" style="position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);max-width:70vw;text-align:center;' +
    "font:600 clamp(16px,1.6vw,26px)/1.35 system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 18px rgba(0,0,0,.6);pointer-events:none;z-index:9500\">" +
    (who ? '<div style="font-style:italic;opacity:.75">' + escapeHtml(who) + "</div>" : "") +
    "<div>" + escapeHtml(words) + "</div></div>"
  );
}
export function withRow(rows, id, html) {
  const out = [];
  let placed = false;
  const list = Array.isArray(rows) ? rows : [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!r || typeof r !== "object") continue;
    if (String(r.id) === id) {
      if (html) {
        out.push({ id: id, html: html });
        placed = true;
      }
      continue;
    }
    out.push(r);
  }
  if (html && !placed) out.push({ id: id, html: html });
  return out;
}
export function destroyVoices(objectApi) {
  let hits = [];
  try {
    hits = objectApi.query({ tags: [VOICE_TAG] }) || [];
  } catch (e) {
    hits = [];
  }
  for (let i = 0; i < hits.length; i++) {
    if(hits[i].state&&hits[i].state.soundOwner&&hits[i].state.soundOwner!==objectApi.self.id) continue;
    try {
      objectApi.destroy(hits[i].id);
    } catch (e) {
      /* already gone */
    }
  }
}
// Strike, stage cleared, clip end: the words leave the screen and every voice emitter goes.
export function clearLines(objectApi, s) {
  destroyVoices(objectApi);
  const patch = { sbLine: null, sbAfter: null };
  if (Array.isArray(s.overlays)) patch.overlays = withRow(s.overlays, SUBTITLE_ROW, "");
  objectApi.patchState(patch);
}
export function speakChunk(objectApi, s, line, idx, t) {
  const ch = line.chunks[idx];
  const n = Number(s.sbVoiceN || 0) + 1;
  const id = VOICE_PREFIX + String(objectApi.self.id).replace(/[^a-zA-Z0-9_-]/g,"-") + "-" + n;
  if (ch.clip) {
    try {
      const origin=line.speaker?ORIGIN.resolve({speaker:line.speaker},t,line.speakerBindings):line.origin||{kind:"screen"};
      const at=ORIGIN.placement(objectApi,origin);
      if(at.error) objectApi.log("[voice] "+at.error+"; subtitles remain");
      else objectApi.spawn({id,tags:[VOICE_TAG],audience:"local",scope:"session",parent:at.parent,state:{soundOwner:objectApi.self.id},feetPosition:at.feetPosition,visible:false,audio:{kind:"clip",clip:String(ch.clip),gain:1,spatial:at.spatial,maxDistance:at.maxDistance||ORIGIN.DEFAULT_RANGE,bus:"Voice",listeners:[objectApi.self.id]}});
    } catch (e) {
      objectApi.log("[courier] voice did not sound: " + String((e && e.message) || e));
    }
    objectApi.runInSeconds(Number(ch.seconds || 1.6) + 0.5, function () {
      try {
        objectApi.destroy(id);
      } catch (e) {
        /* already gone */
      }
    });
  }
  return { speaker:line.speaker,speakerBindings:line.speakerBindings,origin:line.origin,key: String(line.key || ""), who: String(line.who || ""), chunks: line.chunks, at: idx, until: t + Number(ch.seconds || 1.6), emitter: id, n: n };
}
export function startLine(objectApi, a, token) {
  const s = objectApi.getState() || {};
  const chunks = Array.isArray(a.chunks) ? a.chunks : [];
  if (!chunks.length) return;
  // A newer line replaces the current one: its voice stops, its words go.
  if (s.sbLine && s.sbLine.emitter) {
    try {
      objectApi.destroy(String(s.sbLine.emitter));
    } catch (e) {
      /* already gone */
    }
  }
  const t = Number((s.cinemaPlayback || {}).time || 0);
  const cur = speakChunk(objectApi, s, a, 0, t);
  cur.token = token;
  objectApi.patchState({ sbLine: cur, sbVoiceN: cur.n, overlays: withRow(s.overlays, SUBTITLE_ROW, subtitleHtml(cur.who, chunks[0].text)) });
}
export function runLines(objectApi, s, token) {
  const line = s.sbLine;
  if (!line || Number(line.token || 0) !== token) return;
  const play = s.cinemaPlayback;
  if (!play || !play.playing) return;
  const t = Number(play.time || 0);
  if (t < Number(line.until || 0)) return;
  const nextIdx = Number(line.at || 0) + 1;
  if (nextIdx < line.chunks.length) {
    const cur = speakChunk(objectApi, s, line, nextIdx, t);
    cur.token = token;
    objectApi.patchState({ sbLine: cur, sbVoiceN: cur.n, overlays: withRow(s.overlays, SUBTITLE_ROW, subtitleHtml(cur.who, line.chunks[nextIdx].text)) });
    return;
  }
  // The last chunk is spoken: the words leave, the line is done for whatever waited on it.
  const done = s.sbLineDone && Number(s.sbLineDone.token || 0) === token && s.sbLineDone.keys ? Object.assign({}, s.sbLineDone.keys) : {};
  done[String(line.key || "")] = true;
  objectApi.patchState({ sbLine: null, sbLineDone: { token: token, keys: done }, overlays: withRow(s.overlays, SUBTITLE_ROW, "") });
}

// actions as kind "atmo" rows | { time, atmo, patch (the kitchen's AtmosphereDef values), blend (seconds), raw }. ts: no behaviorPersistSourceId), never the durable spec | the restore is for the live room and every screen in it.
const MOOD_LEAD = 0.12;
// Numeric leaves a blend tweens; everything else in a preset (sky, fog kind, colors, flags) cuts.
const TWEEN_PATHS = [
  ["fog", "near"], ["fog", "far"], ["fog", "density"],
  ["sun", "light", "intensity"], ["ambient", "light", "intensity"], ["hemisphere", "intensity"],
  ["sun", "rotation", "pitch"], ["sun", "rotation", "yaw"], ["timeOfDay"],
];
const TWEEN_STEPS_PER_SECOND = 4;
const TWEEN_MAX_STEPS = 8;

export function isPlain(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
export function getPath(obj, path) {
  let cur = obj;
  for (let i = 0; i < path.length; i++) {
    if (!isPlain(cur)) return undefined;
    cur = cur[path[i]];
  }
  return cur;
}
export function setPath(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isPlain(cur[path[i]])) cur[path[i]] = {};
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
}
export function deletePath(obj, path) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isPlain(cur[path[i]])) return;
    cur = cur[path[i]];
  }
  if (isPlain(cur)) delete cur[path[path.length - 1]];
}
export function clone(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}
export function placeOf(objectApi) {
  let place = "";
  try {
    place = String(objectApi.getEntityPlace(objectApi.id) || "");
  } catch (e) {
    place = "";
  }
  return place || "main";
}
export function liveAtmosphere(objectApi, place) {
  let live = null;
  try {
    live = objectApi.getSpec("places." + place + ".atmosphere");
  } catch (e) {
    live = null;
  }
  return isPlain(live) ? clone(live) : {};
}

// The exact inverse: keys the live view carries that the snapshot lacks -> null (the override layer's tombstone drops them from the merged view); keys the snapshot carries -> recurse while both sides are plain objects of the same kind, else the snapshot's own value (a kind switch replaces the subtree, exactly as the forward patch did).
export function inverseOf(live, snap) {
  const out = {};
  const keys = {};
  for (const k in live) keys[k] = 1;
  for (const k in snap) keys[k] = 1;
  for (const k in keys) {
    if (!Object.prototype.hasOwnProperty.call(snap, k)) {
      out[k] = null;
      continue;
    }
    const a = live[k];
    const b = snap[k];
    if (isPlain(a) && isPlain(b) && a.kind === b.kind) {
      const sub = inverseOf(a, b);
      if (Object.keys(sub).length) out[k] = sub;
    } else {
      out[k] = b;
    }
  }
  return out;
}

export function restoreMood(objectApi, s, why) {
  const a = s.sbAtmo;
  if (!a) return;
  // Any tween steps still queued see a new generation and stand down.
  objectApi.patchState({ sbAtmo: null, sbAtmoGen: Number(s.sbAtmoGen || 0) + 1 });
  if (!a.painted) return;
  const place = String(a.place || placeOf(objectApi));
  const snap = isPlain(a.snap) ? a.snap : {};
  try {
    const inverse = inverseOf(liveAtmosphere(objectApi, place), snap);
    if (Object.keys(inverse).length) objectApi.patchAtmosphere(inverse, place);
    objectApi.log("[courier] light restored (" + String(why) + ") in " + place);
  } catch (e) {
    objectApi.log("[courier] light restore failed: " + String((e && e.message) || e));
  }
}

// Called the tick the picture starts, before any mood fires: remember the room exactly as it is.
export function snapshotMood(objectApi, stage, token) {
  const acts = Array.isArray(stage.actions) ? stage.actions : [];
  let any = false;
  for (let i = 0; i < acts.length && !any; i++) if (acts[i] && acts[i].kind === "atmo") any = true;
  if (!any) return;
  const place = placeOf(objectApi);
  objectApi.patchState({ sbAtmo: { token: token, place: place, snap: liveAtmosphere(objectApi, place), next: 0, painted: false } });
}

export function runMoods(objectApi, s, stage, token) {
  const acts = Array.isArray(stage.actions) ? stage.actions : [];
  const a = s.sbAtmo;
  if (!a || Number(a.token || 0) !== token) return;
  const play = s.cinemaPlayback;
  if (!play || !play.playing) return;
  const t = Number(play.time || 0);
  const place = String(a.place || placeOf(objectApi));
  let next = Number(a.next || 0);
  let painted = !!a.painted;
  const start = next;
  while (next < acts.length) {
    const row = acts[next];
    if (!row || row.kind !== "atmo") {
      next++;
      continue;
    }
    if (t < Number(row.time || 0) - MOOD_LEAD) break;
    next++;
    if (!isPlain(row.patch)) continue;
    try {
      paintMood(objectApi, s, row, place);
      painted = true;
      objectApi.log("[courier] light: " + String((row.atmo && row.atmo.name) || row.raw) + " at " + Number(row.time || 0) + "s in " + place);
    } catch (e) {
      objectApi.log("[courier] light failed on " + String(row.raw) + ": " + String((e && e.message) || e));
    }
  }
  if (next !== start || painted !== !!a.painted) objectApi.patchState({ sbAtmo: { token: token, place: place, snap: a.snap, next: next, painted: painted } });
}

// The cut lands everything the preset says except the numeric leaves that exist on BOTH sides (same fog kind); those tween from the live value to the preset's over `blend` seconds through runInTicks, a handful of small patches. A leaf missing on either side simply cuts with the rest.
export function paintMood(objectApi, s, row, place) {
  const target = clone(row.patch);
  const blend = Math.max(0, Number(row.blend || 0));
  const live = liveAtmosphere(objectApi, place);
  const tweens = [];
  if (blend > 0) {
    for (let i = 0; i < TWEEN_PATHS.length; i++) {
      const path = TWEEN_PATHS[i];
      const from = getPath(live, path);
      const to = getPath(target, path);
      if (typeof from !== "number" || typeof to !== "number" || !isFinite(from) || !isFinite(to)) continue;
      if (path[0] === "fog" && target.fog && target.fog.kind !== undefined && live.fog && live.fog.kind !== target.fog.kind) continue;
      if (from === to) continue;
      tweens.push({ path: path, from: from, to: to });
      deletePath(target, path);
    }
  }
  if (Object.keys(target).length) objectApi.patchAtmosphere(target, place);
  if (!tweens.length) return;
  const gen = Number(s.sbAtmoGen || 0);
  const steps = Math.max(1, Math.min(TWEEN_MAX_STEPS, Math.round(blend * TWEEN_STEPS_PER_SECOND)));
  const totalTicks = Math.max(steps, Math.round(objectApi.seconds(blend)));
  for (let k = 1; k <= steps; k++) {
    const frac = k / steps;
    objectApi.runInTicks(Math.max(1, Math.round(totalTicks * frac)), function () {
      const now = objectApi.getState();
      // A strike, the next press or the clip's end already put the light back: stand down.
      if (!now.sbAtmo || Number(now.sbAtmoGen || 0) !== gen) return;
      const patch = {};
      for (let i = 0; i < tweens.length; i++) {
        const tw = tweens[i];
        const v = frac >= 1 ? tw.to : tw.from + (tw.to - tw.from) * frac;
        setPath(patch, tw.path, Math.round(v * 1000) / 1000);
      }
      try {
        objectApi.patchAtmosphere(patch, place);
      } catch (e) {
        objectApi.log("[courier] light tween failed: " + String((e && e.message) || e));
      }
    });
  }
}
