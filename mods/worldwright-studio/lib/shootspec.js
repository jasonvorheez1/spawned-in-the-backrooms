// Pure scene grammar: #[cardId] places a set piece; #[cam: …] defines a shot; #[act: …] schedules an action; #[set: name] switches sets. One parse feeds Cinema and Film Kit adapters. Durations are seconds; zero transition is a cut. Y is up, forward is -Z, and yaw 90 faces -X. No SQL, DOM, clock or runtime writes; invalid lines return warnings.

var VERSION = 1;

// A section whose name is any of these is read as a set. Case-insensitive, trimmed. A colon NAMES it — "Set: Throne Room" — and #[set: throne room] in the prose switches the live set mid-scene (jace, 2026-08-26: multiple scenes/sets on one card; set sections are exempt from the tiny-sections law — they take the space their set needs).
var SET_SECTION_NAMES = ["set", "stage", "blocking", "shoot", "scene set"];

// "Set" → the unnamed set (""); "Set: Throne Room" → "throne room". Not a set section → null.
export function setNameOf(sectionName) {
  var nm = low(sectionName);
  for (var k = 0; k < SET_SECTION_NAMES.length; k++) {
    if (nm === SET_SECTION_NAMES[k]) return { name: "" };
    if (nm.indexOf(SET_SECTION_NAMES[k] + ":") === 0) return { name: nm.slice(SET_SECTION_NAMES[k].length + 1).trim() };
  }
  return null;
}

// Shot sizes: how far the camera stands off the subject, how high its eye is, and what height on
// the subject it is aimed at. Metres. These are the numbers that make a shot READ as that shot.
var SIZES = {
  extreme_close: { dist: 0.8, eye: 1.6, aim: 1.62, words: ["extreme close", "ecu", "macro"] },
  close: { dist: 1.7, eye: 1.6, aim: 1.55, words: ["close", "closeup", "close up", "cu"] },
  medium_close: { dist: 2.6, eye: 1.6, aim: 1.4, words: ["medium close", "mcu", "bust"] },
  medium: { dist: 4.0, eye: 1.6, aim: 1.2, words: ["medium", "mid", "ms", "waist"] },
  full: { dist: 6.5, eye: 1.7, aim: 1.0, words: ["full", "full body", "figure"] },
  wide: { dist: 11.0, eye: 2.2, aim: 1.2, words: ["wide", "long", "ws"] },
  establishing: { dist: 26.0, eye: 7.0, aim: 1.5, words: ["establishing", "extreme wide", "vista", "master"] },
};

// Where the camera stands, as degrees added to the subject's own facing. 0 = dead in front of the
// subject's face; 180 = behind its back; 90 = off its left; 270 = off its right.
var ANGLES = {
  front: { deg: 0, words: ["front", "in front", "head on", "face on", "facing"] },
  three_quarter: { deg: 35, words: ["three quarter", "3/4", "quarter"] },
  left: { deg: 90, words: ["from left", "left side", "camera left", "left of"] },
  right: { deg: 270, words: ["from right", "right side", "camera right", "right of"] },
  behind: { deg: 180, words: ["behind", "from behind", "back of", "rear"] },
  over: { deg: 155, words: ["over the shoulder", "over shoulder", "ots", "over"] },
};

// Vertical treatment: shifts the camera's eye height and therefore its pitch.
var HEIGHTS = {
  low: { lift: -1.25, words: ["low", "low angle", "worm", "from below", "up at"] },
  high: { lift: 3.2, words: ["high", "high angle", "from above", "down at", "down on"] },
  bird: { lift: 9.0, words: ["bird", "birds eye", "overhead", "top down"] },
  dutch: { lift: 0, words: ["dutch", "canted", "tilted"] },
};

var EASINGS = ["linear", "ease", "easeIn", "easeOut", "easeInOut"];

// Inline tags that are not camera moves at all — they land on the effects track. The director's own FX_TYPES table (cinema-director.js ~line 44) is the authority on params; these are the words an author is allowed to type and the type each one becomes.
var FX_WORDS = {
  "fade in": { type: "fade", params: { fadeIn: true, fadeOut: false } },
  "fade out": { type: "fade", params: { fadeIn: false, fadeOut: true } },
  fade: { type: "fade", params: { fadeIn: true, fadeOut: false } },
  shake: { type: "screenShake", params: {} },
  flash: { type: "screenFlash", params: {} },
  letterbox: { type: "letterbox", params: {} },
  vignette: { type: "vignette", params: {} },
  turbulence: { type: "turbulence", params: {} },
};

// #[cam: ...] — the camera/effect directive. Its inner forbids brackets, exactly like the
// refs.js lexer, so a directive can never swallow a neighbouring token.
var CAM_RE = /#\[\s*cam\s*:\s*([^\[\]]*?)\s*\]/gi;
// cam and set tokens read together, in writing order — a #[set: name] between cam tags is the seam where the live set swaps. js owns the cue grammar, and one token never gets a second parser.
var TOKEN_RE = /#\[\s*(cam|set|line|score|act|nav|atmo)\s*:\s*([^\[\]]*?)\s*\]/gi;
// A section whose name is any of these is a PATH card's route (jace 2026-09-02: "NAV tokens ...
// move models based on a path set up in a card"). Same law as SET_SECTION_NAMES: case-insensitive.
var PATH_SECTION_NAMES = ["path", "route", "waypoints", "nav"];
// A walk with no seconds and no speed travels at this, m/s. lib/shoot.js derives from route length.
var WALK_SPEED = 1.4;
// How close a walk to a card's piece stops, metres, when the author wrote no `near N`.
var NEAR_DEFAULT = 1.0;
// A beat whose end is not statically known (a one-shot act, a nav whose route is read at press)
// is estimated to run this long for the panel and the sort; the courier fires on the REAL end.
var END_ESTIMATE = 2.0;
// Speech: 0.6s of breath plus 2.6 words a second, never under 1.6s, in chunks of at most 180
// characters cut at sentence ends. ONE rule for the compile estimate and the press's voice rows.
var SPEECH_BREATH = 0.6;
var SPEECH_WPS = 2.6;
var SPEECH_MIN = 1.6;
var SPEECH_CHUNK = 180;
// #[cardId] — a plain card reference, the very token lib/refs.js walks. No colon: kinded tokens (cam, shot, asset, atmo) are never placements. The optional tail is the natural-prose args form (jace 2026-08-29, lib/refs.js splitArgs): #[cardId at 3, 0.9, -2 facing 90] — it begins at "at <number>" or it is not a tail at all.
var REF_RE = /#\[\s*([a-z0-9]+)(\s+at\s*\(?\s*-?[\d.][^\[\]]*?)?\s*\]/i;

var DEFAULT_HOLD = 3;
var DEFAULT_TRANSITION = 0; // a cut, unless the author asks for a blend
var MAX_SHOTS = 200;
var MAX_PLACEMENTS = 200;

export function s(v) {
  return v === 0 || v ? String(v) : "";
}
export function low(v) {
  return s(v).toLowerCase().trim();
}
export function round2(n) {
  return Math.round(n * 100) / 100;
}
export function num(v, fallback) {
  var n = parseFloat(v);
  return isFinite(n) ? n : fallback;
}
export function slugId(prefix, text, i) {
  var base = low(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28);
  return prefix + (base || "shot") + "-" + (i + 1);
}
// Every plain-ref token on a line, each with its own args tail (or ""). A fresh regex per call —
// the shared REF_RE stays stateless.
export function refsIn(text) {
  var re = new RegExp(REF_RE.source, "gi");
  var out = [];
  var m;
  while ((m = re.exec(s(text))) !== null) out.push({ id: m[1].trim(), args: s(m[2] || "").trim() });
  return out;
}
// A card id, worn as its display name when the caller lent us a lens. Labels and warnings read
// like prose while the source stays ids — the refs.js law, honoured here without requiring it.
export function prettyId(id, nameOf) {
  var nm = "";
  if (typeof nameOf === "function") {
    try {
      nm = s(nameOf(s(id)));
    } catch (e) {
      nm = "";
    }
  }
  return nm || s(id);
}
// Match a vocabulary table against a phrase. Longest word first so "medium close" beats "close"
// and "over the shoulder" beats "over".
export function matchTable(table, phrase) {
  var best = null;
  var bestLen = 0;
  for (var key in table) {
    if (!Object.prototype.hasOwnProperty.call(table, key)) continue;
    var words = table[key].words || [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (phrase.indexOf(w) >= 0 && w.length > bestLen) {
        best = key;
        bestLen = w.length;
      }
    }
  }
  return best;
}

// onNav is good enough").
var EVENT_WORDS = { onnav: "onNav", onact: "onAct", online: "onLine" };
var PART_RE = /\s*(?:·|\||;|--)\s*/;

// A part, read as a clause: { kind: "onNav"|"onAct"|"onLine" } | { kind: "on", event } | { kind: "at",
// seconds } | null when the part is not a clause at all (a clip word, spoken words, a hold).
export function eventClause(part) {
  var p = low(part);
  if (!p) return null;
  if (EVENT_WORDS[p]) return { kind: EVENT_WORDS[p] };
  var atM = p.match(/^at\s+(-?[\d.]+)\s*s?(?:ec|econds?)?$/);
  if (atM) return { kind: "at", seconds: Math.max(0, num(atM[1], 0)) };
  var onM = p.match(/^on\s+([a-z0-9][a-z0-9 _-]*)$/);
  if (onM) return { kind: "on", event: onM[1].trim() };
  return null;
}
// Stamp a clause onto a beat record (act, nav or line). Returns false when the part was no clause.
export function takeClause(rec, part) {
  var c = eventClause(part);
  if (!c) return false;
  if (c.kind === "at") rec.offset = c.seconds;
  else rec.event = c.kind === "on" ? { kind: "on", event: c.event } : { kind: c.kind };
  return true;
}

// lib/soundspec.js identities() + matchEvent(), verbatim in law: ordinal first, then a whole identity (node id, full or capped slug, the target id), then a node id worn bare, then the tail of a shot's own words. Ported rather than required — this leaf has zero requires.
export function eventIndex(token, shots) {
  var want = low(token);
  var list = Array.isArray(shots) ? shots : [];
  if (!want || !list.length) return -1;
  if (/^\d+$/.test(want)) {
    var n = parseInt(want, 10);
    return n >= 1 && n <= list.length ? n - 1 : -1;
  }
  var w = low(want).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!w) return -1;
  var bare = w.replace(/^cn-/, "").replace(/-\d+$/, "");
  var ids = [];
  for (var i = 0; i < list.length; i++) {
    var full = low(list[i] && list[i].label).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    var capped = full.slice(0, 28);
    ids.push({ node: "cn-" + (capped || "shot") + "-" + (i + 1), slugFull: full, slugCapped: capped, target: low(list[i] && list[i].target) });
  }
  var tiers = [
    function (id) { return w === id.node || w === id.slugFull || w === id.slugCapped || (id.target && w === id.target); },
    function (id) { return bare && (bare === id.slugFull || bare === id.slugCapped); },
    function (id) { return id.slugFull && (id.slugFull === w || id.slugFull.slice(-(w.length + 1)) === "-" + w); },
  ];
  for (var t = 0; t < tiers.length; t++) for (var k = 0; k < ids.length; k++) if (tiers[t](ids[k])) return k;
  return -1;
}

// Speech, cut into the chunks a voice plays back to back: sentences (. ! ?) packed to at most SPEECH_CHUNK characters; a longer sentence splits at its last comma or space before the cap. Returns [{ text, seconds }]; the sum is how long the line speaks.
export function chunkSpeech(words) {
  var src = s(words).replace(/\s+/g, " ").trim();
  var out = [];
  if (!src) return out;
  var sentences = src.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [src];
  var pieces = [];
  for (var i = 0; i < sentences.length; i++) {
    var sen = sentences[i].trim();
    while (sen.length > SPEECH_CHUNK) {
      var head = sen.slice(0, SPEECH_CHUNK);
      var cut = head.lastIndexOf(",");
      if (cut < SPEECH_CHUNK / 2) cut = head.lastIndexOf(" ");
      if (cut <= 0) cut = SPEECH_CHUNK;
      pieces.push(sen.slice(0, cut + (head.charAt(cut) === "," ? 1 : 0)).trim());
      sen = sen.slice(cut + 1).trim();
    }
    if (sen) pieces.push(sen);
  }
  var cur = "";
  for (var p = 0; p < pieces.length; p++) {
    if (cur && (cur + " " + pieces[p]).length > SPEECH_CHUNK) {
      out.push(cur);
      cur = pieces[p];
    } else cur = cur ? cur + " " + pieces[p] : pieces[p];
  }
  if (cur) out.push(cur);
  for (var c = 0; c < out.length; c++) {
    var wc = out[c].split(/\s+/).filter(Boolean).length;
    out[c] = { text: out[c], seconds: round2(Math.max(SPEECH_MIN, SPEECH_BREATH + wc / SPEECH_WPS)) };
  }
  return out;
}
export function speechSeconds(words) {
  var ch = chunkSpeech(words);
  var t = 0;
  for (var i = 0; i < ch.length; i++) t += ch[i].seconds;
  return round2(t);
}

// js). js walks it into edges and backlinks with zero shoot-specific code.
export function parseSet(text, nameOf) {
  var out = { placements: [], warnings: [] };
  var lines = s(text).split(/\r?\n/);
  var capped = false;
  for (var i = 0; i < lines.length && !capped; i++) {
    var raw = lines[i].trim();
    if (!raw) continue;
    // A markdown heading is prose; a placement line starts with the token "#[", never "# ".
    if (raw.charAt(0) === "#" && raw.charAt(1) !== "[") continue;
    var toks = refsIn(raw);
    if (!toks.length) continue;
    var lineRest = raw.replace(new RegExp(REF_RE.source, "gi"), " ").toLowerCase();

    for (var t = 0; t < toks.length; t++) {
      var id = toks[t].id;
      if (out.placements.length >= MAX_PLACEMENTS) {
        out.warnings.push("The set stops at " + MAX_PLACEMENTS + " placements; the rest of the section was left standing.");
        capped = true;
        break;
      }
      // A token that carries its own args reads ONLY its brackets; a bare token reads the line.
      var rest = toks[t].args ? " " + toks[t].args.toLowerCase() + " " : lineRest;

      var pos = { x: 0, y: 0, z: 0 };
      var at = rest.match(/\bat\s+(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
      if (at) {
        pos = { x: num(at[1], 0), y: num(at[2], 0), z: num(at[3], 0) };
      } else {
        var at2 = rest.match(/\bat\s+(-?[\d.]+)\s*,\s*(-?[\d.]+)\b/);
        if (at2) pos = { x: num(at2[1], 0), y: 0, z: num(at2[2], 0) };
        else if (rest.indexOf(" at ") >= 0)
          out.warnings.push('"' + prettyId(id, nameOf) + '" says "at" but no coordinates follow it — it is standing at the origin.');
      }

      var yaw = 0;
      var fm = rest.match(/\bfacing\s+(-?[\d.]+)/);
      if (fm) yaw = num(fm[1], 0);

      var scale = 1;
      var sm = rest.match(/\bscale\s+([\d.]+)/);
      if (sm) scale = num(sm[1], 1);

      var tags = [];
      if (/\bhidden\b/.test(rest)) tags.push("hidden");

      var pl = {
        ref: id,
        key: low(id),
        name: prettyId(id, nameOf),
        position: { x: round2(pos.x), y: round2(pos.y), z: round2(pos.z) },
        yaw: round2(((yaw % 360) + 360) % 360),
        scale: scale,
        tags: tags,
        line: raw,
      };
      // `offstage` (jace 2026-09-02: the townswoman "is there the whole time rather than entering the
      // scene later"): the piece STANDS on the set unseen until a #[nav: ... enter] reveals it.
      if (/\boffstage\b/.test(rest)) pl.offstage = true;
      out.placements.push(pl);
    }
  }
  return out;
}

// ── THE BEAT ────────────────────────────────────────────────────────────────────────────────── #[act: mt9qf5lsklmdl, mt9qf5ls5dfm6 Embrace · 2s · at 1s · loop] — the same family as #[cam: …]: parts split on · | ; or " -- ", subjects are BARE card ids (the way a cam target rides after "on"; a token's inner cannot nest another token), the clip is the last word of the head. Ids are proven on the set at compile, never here — this leaf has no map.
export function actTag(inner, out, nameOf) {
  var parts = inner.split(/\s*(?:·|\||;|--)\s*/);
  var head = (parts[0] || "").trim();
  var words = head.split(/\s+/);
  if (words.length < 2) {
    out.warnings.push("#[act: " + inner + "] needs a card id and a clip — #[act: <cardId> Kneel].");
    return;
  }
  var clip = words.pop();
  var subjects = [];
  var seen = {};
  for (var i = 0; i < words.length; i++) {
    var w = low(words[i]).replace(/^[,&]+|[,&]+$/g, "");
    if (!w || w === "and" || w === "on") continue;
    if (!/^[a-z0-9]{8,}$/.test(w)) {
      out.warnings.push("#[act: " + inner + '] — "' + words[i] + '" is not a card id; write the card\'s #[…] id there, the way a #[cam: … on <id>] target is.');
      continue;
    }
    if (seen[w]) continue;
    seen[w] = true;
    subjects.push({ ref: w, key: w, name: prettyId(w, nameOf) });
  }
  if (!subjects.length) {
    out.warnings.push("#[act: " + inner + "] names no card before its clip — nothing plays it.");
    return;
  }
  var beat = { after: out.shots.length, order: nextOrder(out), subjects: subjects, clip: clip, raw: inner, hold: 0, offset: 0, loop: false, event: null };
  for (var p = 1; p < parts.length; p++) {
    var part = low(parts[p]);
    if (!part) continue;
    var secM = part.match(/^(-?[\d.]+)\s*s(?:ec|econds?)?$/);
    if (secM) {
      beat.hold = Math.max(0.2, num(secM[1], 1));
      continue;
    }
    if (takeClause(beat, part)) continue; // at Ns | onNav | onAct | onLine | on <shot>
    if (part === "loop" || part === "hold") {
      beat.loop = true;
      continue;
    }
    out.warnings.push("#[act: " + inner + '] — could not read "' + parts[p].trim() + '"; it was ignored.');
  }
  if (!out.beats) out.beats = [];
  out.beats.push(beat);
}

// Prose order across act, nav and line tokens — the "nearest preceding" the event words resolve by.
export function nextOrder(out) {
  out.order = (out.order || 0) + 1;
  return out.order;
}
// A bare card id, as #[act:] reads one: 8+ base36 characters with a digit in them.
export function isIdWord(w) {
  return /^[a-z0-9]{8,}$/.test(w) && /\d/.test(w);
}

// move models based on a path set up in a card").
export function navTag(inner, out, nameOf) {
  var parts = inner.split(PART_RE);
  var head = (parts[0] || "").trim();
  var words = head.split(/\s+/);
  var nav = { after: out.shots.length, order: nextOrder(out), subjects: [], route: null, clip: "Walk", seconds: 0, speed: 0, near: NEAR_DEFAULT, exit: false, enter: false, offset: 0, event: null, raw: inner };
  var seen = {};
  var i = 0;
  for (; i < words.length; i++) {
    var w = low(words[i]).replace(/^[,&]+|[,&]+$/g, "");
    if (!w || w === "and") continue;
    if (w === "along" || w === "via" || w === "down" || w === "to") break;
    if (!isIdWord(w)) {
      out.warnings.push("#[nav: " + inner + '] | "' + words[i] + '" is not a card id; write the card\'s #[…] id there, the way an #[act:] subject is.');
      continue;
    }
    if (seen[w]) continue;
    seen[w] = true;
    nav.subjects.push({ ref: w, key: w, name: prettyId(w, nameOf) });
  }
  if (!nav.subjects.length) {
    out.warnings.push("#[nav: " + inner + "] names no card before its route | nothing walks it.");
    return;
  }
  var verb = low(words[i] || "");
  var tail = words.slice(i + 1).join(" ").trim();
  if (verb === "to") {
    var p3 = tail.match(/^(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);
    var p2 = tail.match(/^(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);
    var idW = low(tail.replace(/^#\[\s*|\s*\]$/g, ""));
    if (p3) nav.route = { point: { x: num(p3[1], 0), y: num(p3[2], 0), z: num(p3[3], 0) } };
    else if (p2) nav.route = { point: { x: num(p2[1], 0), y: 0, z: num(p2[2], 0) } };
    else if (isIdWord(idW)) nav.route = { ref: idW, name: prettyId(idW, nameOf) };
  } else if (verb === "along" || verb === "via" || verb === "down") {
    var pathW = low(tail.replace(/^#\[\s*|\s*\]$/g, ""));
    if (isIdWord(pathW)) nav.route = { path: pathW, name: prettyId(pathW, nameOf) };
  }
  if (!nav.route) {
    out.warnings.push("#[nav: " + inner + "] has no route | write `along <pathCardId>`, `to X, Y, Z` or `to <cardId>` after the subjects.");
    return;
  }
  for (var p = 1; p < parts.length; p++) {
    var part = low(parts[p]);
    if (!part) continue;
    var secM = part.match(/^(-?[\d.]+)\s*s(?:ec|econds?)?$/);
    if (secM) {
      nav.seconds = Math.max(0.2, num(secM[1], 1));
      continue;
    }
    var spM = part.match(/^speed\s+([\d.]+)$/);
    if (spM) {
      nav.speed = Math.max(0.05, num(spM[1], WALK_SPEED));
      continue;
    }
    var nrM = part.match(/^near\s+([\d.]+)$/);
    if (nrM) {
      nav.near = Math.max(0, num(nrM[1], NEAR_DEFAULT));
      continue;
    }
    if (part === "exit" || part === "enter") {
      nav[part] = true;
      continue;
    }
    if (takeClause(nav, part)) continue;
    if (/^[a-z][a-z0-9_-]*$/.test(part)) {
      nav.clip = parts[p].trim();
      continue;
    }
    out.warnings.push("#[nav: " + inner + '] | could not read "' + parts[p].trim() + '"; it was ignored.');
  }
  if (!out.navs) out.navs = [];
  out.navs.push(nav);
}

// ── THE PATH CARD ───────────────────────────────────────────────────────────────────────────── A section named Path (Route, Waypoints, Nav): one waypoint per line, prose allowed around it — the tail begins at the word `at` (the natural-prose ruling): We start by the well.
export function parsePath(text) {
  var out = { points: [], facings: [], pauses: [], warnings: [] };
  var lines = s(text).split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    if (!raw) continue;
    if (raw.charAt(0) === "#" && raw.charAt(1) !== "[") continue;
    var rest = " " + raw.toLowerCase() + " ";
    var point = null;
    var a3 = rest.match(/\bat\s+(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
    var a2 = a3 ? null : rest.match(/\bat\s+(-?[\d.]+)\s*,\s*(-?[\d.]+)\b/);
    var aRef = a3 || a2 ? null : rest.match(/\bat\s+(?:#\[\s*)?([a-z0-9]{8,})(?:\s*\])?/);
    if (a3) point = { x: round2(num(a3[1], 0)), y: round2(num(a3[2], 0)), z: round2(num(a3[3], 0)) };
    else if (a2) point = { x: round2(num(a2[1], 0)), y: 0, z: round2(num(a2[2], 0)) };
    else if (aRef && isIdWord(aRef[1])) {
      var nr = rest.match(/\bnear\s+([\d.]+)/);
      point = { ref: aRef[1], near: nr ? Math.max(0, num(nr[1], NEAR_DEFAULT)) : NEAR_DEFAULT };
    }
    if (!point) {
      if (/\bat\s+-?[\d.]/.test(rest)) out.warnings.push('Path line "' + raw + '" says "at" but no coordinates follow it | it was skipped.');
      continue;
    }
    var fm = rest.match(/\bfacing\s+(-?[\d.]+)/);
    var pm = rest.match(/\bpause\s+([\d.]+)\s*s?(?:ec|econds?)?\b/);
    out.points.push(point);
    out.facings.push(fm ? round2((((num(fm[1], 0) % 360) + 360) % 360)) : null);
    out.pauses.push(pm ? Math.max(0, num(pm[1], 0)) : 0);
  }
  if (!out.points.length) out.warnings.push("The path names no waypoints | write one `at X, Y, Z` per line.");
  return out;
}

// ] in the prose, in the order it is written.
export function parseShots(text, nameOf) {
  var out = { shots: [], effects: [], switches: [], lines: [], scores: [], warnings: [] };
  var body = s(text);
  var m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(body)) !== null) {
    var inner = m[2].trim();
    var kind = m[1].toLowerCase();
    if (kind === "act") {
      // #[act: <id>, <id> Clip · 2s] — an action beat on the shot it is written under (`after`,
      // the reading every other token shares). Kept off `out` until one is written: .beats exists
      // only on cards that have beats.
      if (inner) actTag(inner, out, nameOf);
      else out.warnings.push("An #[act: ] token names no card and no clip — it was left out.");
      continue;
    }
    if (kind === "set") {
      // #[set: name] — not a shot, a seam: every shot after it plays on the named set.
      if (inner) out.switches.push({ after: out.shots.length, set: low(inner) });
      else out.warnings.push("A #[set: ] token names no set — it was ignored.");
      continue;
    }
    // A spoken line and a music cue are not camera moves: they are stamped with the shot they were written under (`after`, the effects track's own reading) and handed on RAW. Their words are read by the parsers that own them — never twice, never here.
    if (kind === "nav") {
      if (inner) navTag(inner, out, nameOf);
      else out.warnings.push("A #[nav: ] token names no card and no route | it was left out.");
      continue;
    }
    if (kind === "line") {
      // The words are the first part and ride RAW to lib/refs.js's line parser; only TRAILING parts
      // that read as event clauses are taken. A line with no clause is byte-identical to before.
      if (inner) {
        var ln = { after: out.shots.length, order: nextOrder(out), raw: inner, offset: 0, event: null };
        var sepRe = new RegExp(PART_RE.source, "g");
        var starts = [0];
        var sm;
        while ((sm = sepRe.exec(inner)) !== null) if (sm[0]) starts.push(sm.index);
        var lparts = inner.split(PART_RE);
        var keep = lparts.length;
        while (keep > 1 && eventClause(lparts[keep - 1])) keep--;
        if (keep < lparts.length) {
          for (var lp = keep; lp < lparts.length; lp++) takeClause(ln, lparts[lp]);
          ln.raw = inner.slice(0, starts[keep]).trim();
        }
        out.lines.push(ln);
      } else out.warnings.push("A #[line: ] token carries no words — it was left out.");
      continue;
    }
    if (kind === "score") {
      if (inner) out.scores.push({ after: out.shots.length, raw: inner });
      else out.warnings.push("A #[score: ] token names no music — it was left out.");
      continue;
    }
    if (kind === "atmo") {
      // #[atmo: moonlit] | the light at the shot it is written under (`after`, the reading every other token shares). Kept off `out` until one is written: .moods exists only on cards that wrote a mood, so a mood-less card parses byte-identically to before.
      if (inner) {
        if (!out.moods) out.moods = [];
        out.moods.push({ after: out.shots.length, raw: inner });
      } else out.warnings.push("An #[atmo: ] token names no mood | it was left out.");
      continue;
    }
    if (!inner) continue;
    if (out.shots.length >= MAX_SHOTS) {
      out.warnings.push("The scene stops at " + MAX_SHOTS + " shots; later tags were left unread.");
      break;
    }

    // Effects and titles first — they are not camera moves.
    var lowered = low(inner);
    var titleM = inner.match(/^(?:title|announce|card)\s*:\s*([\s\S]+)$/i);
    if (titleM) {
      out.effects.push({ type: "announce", after: out.shots.length, params: { text: titleM[1].trim(), duration: 2, style: "cinematic" } });
      continue;
    }
    var toastM = inner.match(/^(?:toast|caption)\s*:\s*([\s\S]+)$/i);
    if (toastM) {
      out.effects.push({ type: "toast", after: out.shots.length, params: { message: toastM[1].trim(), duration: 2 } });
      continue;
    }
    var soundM = inner.match(/^(?:sound|sfx)\s*:\s*([\s\S]+)$/i);
    if (soundM) {
      out.effects.push({ type: "playSound", after: out.shots.length, params: { clip: soundM[1].trim(), volume: 0.6 } });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(FX_WORDS, lowered)) {
      var fx = FX_WORDS[lowered];
      out.effects.push({ type: fx.type, after: out.shots.length, params: fx.params });
      continue;
    }

    var parts = inner.split(/\s*(?:·|\||;|--)\s*/);
    var head = (parts[0] || "").trim();
    // The aim is `on <cardId>`. Strip the id from the head BEFORE the vocabulary match — a base36
    // id can contain a framing word ("low", "cu") by pure accident, and an id must never frame.
    var tgtM = head.match(/\bon\s+([a-z0-9]{8,})\b/i);
    var target = tgtM ? tgtM[1].toLowerCase() : "";
    var headLow = low(target ? head.replace(tgtM[0], " ") : head);

    var shot = {
      raw: inner,
      label: (target ? head.replace(tgtM[1], prettyId(target, nameOf)) : head) || "Shot",
      target: target,
      size: matchTable(SIZES, headLow) || "medium",
      angle: matchTable(ANGLES, headLow) || "front",
      height: matchTable(HEIGHTS, headLow) || null,
      hold: DEFAULT_HOLD,
      transition: DEFAULT_TRANSITION,
      easing: "easeInOut",
      ending: false,
      hasTiming: false,
      position: null, // an absolute camera position, if the author gave one
      look: null,
    };

    // An author may bypass framing entirely and place the camera by hand: #[cam: at 4,2,-6 …].
    // The head may open straight on "at" (the token already said cam) or spell "cam at".
    var atM = headLow.match(/(?:^|\bcam(?:era)?\s+)at\s+(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
    if (atM) shot.position = { x: num(atM[1], 0), y: num(atM[2], 0), z: num(atM[3], 0) };
    var lookM = headLow.match(/\blook(?:ing)?\s+at\s+(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
    if (lookM) shot.look = { x: num(lookM[1], 0), y: num(lookM[2], 0), z: num(lookM[3], 0) };

    for (var p = 1; p < parts.length; p++) {
      var part = low(parts[p]);
      if (!part) continue;

      var secM = part.match(/^(-?[\d.]+)\s*s(?:ec|econds?)?$/);
      if (secM) {
        shot.hold = Math.max(0.2, num(secM[1], DEFAULT_HOLD));
        shot.hasTiming = true;
        continue;
      }
      if (part === "cut" || part === "hard cut") {
        shot.transition = 0;
        continue;
      }
      var blendM = part.match(/^(?:blend|dissolve|ease|glide)\s*(-?[\d.]+)?\s*s?$/);
      if (blendM) {
        shot.transition = blendM[1] ? Math.max(0.1, num(blendM[1], 1)) : 1;
        continue;
      }
      if (part === "end" || part === "ending" || part === "hold here") {
        shot.ending = true;
        continue;
      }
      var easeHit = null;
      for (var e = 0; e < EASINGS.length; e++) if (low(EASINGS[e]) === part) easeHit = EASINGS[e];
      if (easeHit) {
        shot.easing = easeHit;
        continue;
      }
      out.warnings.push('Shot "' + shot.label + '" — could not read "' + parts[p].trim() + '"; it was ignored.');
    }

    out.shots.push(shot);
  }
  return out;
}

// ── THE SCENE ───────────────────────────────────────────────────────────────────────────────── A canonical card (cardspec shape: { sections:[{name,content}], pages:[{title,header,body,footer}] }) read whole. The set comes from a named section; the shots come from every page body in order, so a card's pages stay the beats they already were.
export function parseScene(card, nameOf) {
  var result = { sets: [], placements: [], shots: [], effects: [], switches: [], activeSet: [], lines: [], scores: [], warnings: [], error: "" };
  if (!card || typeof card !== "object") {
    result.error = "No card to read.";
    return result;
  }

  var sections = Array.isArray(card.sections) ? card.sections : [];
  var byName = {};
  for (var i = 0; i < sections.length; i++) {
    var meta = setNameOf(sections[i] && sections[i].name);
    if (!meta) continue;
    var parsedSet = parseSet(sections[i].content, nameOf);
    var bucket = byName[meta.name];
    if (!bucket) {
      bucket = { name: meta.name, placements: [] };
      byName[meta.name] = bucket;
      result.sets.push(bucket);
    }
    // Two sections wearing the same set name merge, exactly as plain "Set" sections always have.
    bucket.placements = bucket.placements.concat(parsedSet.placements);
    result.warnings = result.warnings.concat(parsedSet.warnings);
  }
  if (!result.sets.length) {
    result.warnings.push('No "Set" section on this card — nothing will be placed, only the camera will move.');
  }
  // The opening set is the first set section on the card; callers reading only `placements` get it.
  result.placements = result.sets.length ? result.sets[0].placements : [];

  var pages = Array.isArray(card.pages) ? card.pages : [];
  var texts = [];
  for (var q = 0; q < pages.length; q++) {
    var pg = pages[q] || {};
    texts.push([s(pg.header), s(pg.body), s(pg.footer)].join("\n"));
  }
  // Sections that are not the set can hold tags too — an author writing the shot list as prose.
  for (var r = 0; r < sections.length; r++) {
    if (!setNameOf(sections[r] && sections[r].name)) texts.push(s(sections[r].content));
  }

  var parsedShots = parseShots(texts.join("\n\n"), nameOf);
  result.shots = parsedShots.shots;
  result.effects = parsedShots.effects;
  // The spoken lines and the music, still raw, still carrying the shot they were written under.
  result.lines = parsedShots.lines;
  result.scores = parsedShots.scores;
  if (parsedShots.beats) result.beats = parsedShots.beats;
  // The walks (#[nav:]), only when a card wrote one — a nav-less card parses byte-identically.
  if (parsedShots.navs) result.navs = parsedShots.navs;
  // The moods, still raw, still carrying the shot they were written under.
  if (parsedShots.moods) result.moods = parsedShots.moods;
  result.warnings = result.warnings.concat(parsedShots.warnings);

  // A switch must name a set that exists on the card; the rest are dropped loudly.
  for (var w = 0; w < parsedShots.switches.length; w++) {
    var swi = parsedShots.switches[w];
    if (byName[swi.set]) result.switches.push(swi);
    else result.warnings.push('#[set: ' + swi.set + '] names no set section on this card — the switch was ignored.');
  }

  // Which set is live at each shot: the first set opens; each switch covers every shot after it.
  var keys = {};
  for (var sb = 0; sb < result.sets.length; sb++) {
    var pool = {};
    for (var pk = 0; pk < result.sets[sb].placements.length; pk++) pool[result.sets[sb].placements[pk].key] = true;
    keys[result.sets[sb].name] = pool;
  }
  var cur = result.sets.length ? result.sets[0].name : "";
  var si = 0;
  // Every shot that names a subject must find it on the LIVE set, or the camera has nothing to aim at.
  for (var t = 0; t < result.shots.length; t++) {
    while (si < result.switches.length && result.switches[si].after <= t) { cur = result.switches[si].set; si++; }
    result.activeSet.push(cur);
    var tgt = result.shots[t].target;
    if (tgt && !(keys[cur] && keys[cur][low(tgt)])) {
      var setLabel = cur ? 'the live set "' + cur + '"' : "the set";
      result.warnings.push('Shot "' + result.shots[t].label + '" aims at "' + prettyId(tgt, nameOf) + '", which is not on ' + setLabel + ' — that shot keeps the previous camera.');
    }
  }

  if (!result.shots.length) result.warnings.push("No #[cam: …] tags in this card — there is nothing to shoot yet.");
  return result;
}

// ── FRAMING ─────────────────────────────────────────────────────────────────────────────────── The one piece of real geometry: given a shot and the thing it is aimed at, where does the camera stand and which way does it face. Yaw 0 faces -Z, so a yaw's forward is ( -sin, 0, -cos ).
export function dirOf(yawDeg) {
  var r = (yawDeg * Math.PI) / 180;
  return { x: -Math.sin(r), z: -Math.cos(r) };
}

export function frameShot(shot, placement, index) {
  var size = SIZES[shot.size] || SIZES.medium;
  var angle = ANGLES[shot.angle] || ANGLES.front;
  var lift = shot.height && HEIGHTS[shot.height] ? HEIGHTS[shot.height].lift : 0;

  var node = {
    id: slugId("cn-", shot.label, index),
    name: shot.label.slice(0, 48) || "Shot " + (index + 1),
    position: { x: 0, y: 1.6, z: 0 },
    yaw: 0,
    pitch: 0,
  };

  // Hand-placed camera wins over every framing word.
  if (shot.position) {
    node.position = { x: round2(shot.position.x), y: round2(shot.position.y), z: round2(shot.position.z) };
    if (shot.look) {
      var dx = shot.look.x - node.position.x;
      var dy = shot.look.y - node.position.y;
      var dz = shot.look.z - node.position.z;
      var flat = Math.sqrt(dx * dx + dz * dz);
      node.yaw = round2(((Math.atan2(-dx, -dz) * 180) / Math.PI + 360) % 360);
      node.pitch = round2((Math.atan2(dy, flat || 0.001) * 180) / Math.PI);
    }
    return node;
  }

  if (!placement) return null;

  var camYawFromSubject = (placement.yaw + angle.deg) % 360;
  var d = dirOf(camYawFromSubject);
  var dist = size.dist * (placement.scale || 1);
  var eye = size.eye * (placement.scale || 1) + lift;
  var aim = placement.position.y + size.aim * (placement.scale || 1);

  node.position = {
    x: round2(placement.position.x + d.x * dist),
    y: round2(placement.position.y + Math.max(0.2, eye)),
    z: round2(placement.position.z + d.z * dist),
  };
  // Face back at the subject.
  node.yaw = round2((camYawFromSubject + 180) % 360);
  node.pitch = round2(Math.max(-89, Math.min(89, (Math.atan2(aim - node.position.y, dist) * 180) / Math.PI)));
  return node;
}

// ── THE PLACEMENT POOLS ─────────────────────────────────────────────────────────────────────── Which placement a shot's target resolves to depends on which set is live at that shot. ONE pooling, read by BOTH emitters — compile() (Absolute Cinema's clip) and emitFilm() (film-kit's shot list) walk the same parse and must never disagree about where a thing stands.
export function poolsOf(scene) {
  var sets = Array.isArray(scene.sets) ? scene.sets : [];
  var byKeyOf = {};
  var placementsOf = {};
  for (var st = 0; st < sets.length; st++) {
    var pool = {};
    for (var pp = 0; pp < sets[st].placements.length; pp++) pool[sets[st].placements[pp].key] = sets[st].placements[pp];
    byKeyOf[sets[st].name] = pool;
    placementsOf[sets[st].name] = sets[st].placements;
  }
  var byKey = {};
  for (var i = 0; i < (scene.placements || []).length; i++) byKey[scene.placements[i].key] = scene.placements[i];
  if (!sets.length) { byKeyOf[""] = byKey; placementsOf[""] = scene.placements || []; }
  return {
    sets: sets,
    byKeyOf: byKeyOf,
    placementsOf: placementsOf,
    byKey: byKey,
    openName: sets.length ? sets[0].name : "",
  };
}

// ── COMPILE ─────────────────────────────────────────────────────────────────────────────────── A parsed scene becomes the clip json cinema:libImport swallows. Effects carry an `after` index from the parse; here it becomes a real time on the timeline, because the director's effects track is time-based and the parser only knew shot order.
export function compile(scene, opts) {
  var o = opts || {};
  var out = { clip: { name: s(o.name) || "Untitled Scene", nodes: [], sequence: [], effects: [] }, segments: [], warnings: [], error: "" };
  if (!scene || scene.error) {
    out.error = (scene && scene.error) || "Nothing to compile.";
    return out;
  }

  // One placement pool per set — the shared pooling below, so both emitters agree to the metre
  // about where a thing stands.
  var pools = poolsOf(scene);
  var sets = pools.sets;
  var byKeyOf = pools.byKeyOf;
  var placementsOf = pools.placementsOf;
  var byKey = pools.byKey;

  var lastNodeId = "";
  var timeAtShot = [];
  var clock = 0;
  var openName = sets.length ? sets[0].name : "";

  for (var sIdx = 0; sIdx < scene.shots.length; sIdx++) {
    var shot = scene.shots[sIdx];
    timeAtShot.push(clock);

    // The segment track: one row per stretch of shots sharing a live set — the swap schedule.
    var live = scene.activeSet && sIdx < scene.activeSet.length ? scene.activeSet[sIdx] : openName;
    if (!out.segments.length || out.segments[out.segments.length - 1].set !== live) {
      out.segments.push({ set: live, time: round2(clock), atShot: sIdx, placements: placementsOf[live] || [] });
    }

    var placement = shot.target ? (byKeyOf[live] || byKey)[low(shot.target)] : null;
    var node = frameShot(shot, placement, sIdx);

    var nodeId;
    if (node) {
      // Ids must be unique even when two shots share a label.
      var tryId = node.id;
      var bump = 2;
      for (var n = 0; n < out.clip.nodes.length; n++) {
        if (out.clip.nodes[n].id === tryId) {
          tryId = node.id + "-" + bump;
          bump++;
          n = -1;
        }
      }
      node.id = tryId;
      out.clip.nodes.push(node);
      nodeId = node.id;
      lastNodeId = node.id;
    } else if (lastNodeId) {
      nodeId = lastNodeId; // a beat that holds the camera already running
    } else {
      out.warnings.push('Shot "' + shot.label + '" has nothing to aim at and no camera before it — skipped.');
      continue;
    }

    out.clip.sequence.push({
      nodeId: nodeId,
      hold: shot.hold,
      transition: shot.transition,
      easing: shot.easing,
      ending: !!shot.ending,
    });
    clock += shot.hold + shot.transition;
  }

  // The plan's own clock, handed out rather than re-derived: timeline[i] is the second shot i starts on, index-aligned with scene.shots, and seconds is the length of the whole sequence. lib/soundspec.js schedules its cues on exactly these numbers — one timing, never two.
  out.timeline = [];
  for (var tt = 0; tt < timeAtShot.length; tt++) out.timeline.push(round2(timeAtShot[tt]));
  out.seconds = round2(clock);

  for (var f = 0; f < scene.effects.length; f++) {
    var fx = scene.effects[f];
    // `after` is how many shots had been parsed when the tag was read. A tag written AFTER a shot tag means "during that shot", so it lands at that shot's start; a tag written before any shot lands at 0; a tag past the last shot lands at the end of the timeline.
    var at = fx.after;
    var when = at >= timeAtShot.length ? clock : timeAtShot[Math.max(0, at - 1)];
    // EVERY effect carries an id: the director tracks fired/active effects BY id (cinema-director.js tickEffects ~300/332), so two id-less rows collide on the key `undefined` and the second one never fires — which is why an id-less fade-out never came back up.
    out.clip.effects.push({ id: "fx-" + (out.clip.effects.length + 1), type: fx.type, time: round2(when), params: fx.params || {} });
  }

  // THE BEATS, on the plan's own clock: a beat starts where its shot starts (plus its `at`), holds for its own seconds, or to the end of the shot when it says loop. Its subjects must stand on the set live at that shot — a beat is played BY a set piece, so a name off the live set has nothing to play it.
  var beats = Array.isArray(scene.beats) ? scene.beats : [];
  var navs = Array.isArray(scene.navs) ? scene.navs : [];
  var lines = Array.isArray(scene.lines) ? scene.lines : [];
  var recs = [];
  for (var bi = 0; bi < beats.length; bi++) recs.push({ kind: "act", key: "act-" + (bi + 1), src: beats[bi] });
  for (var ni = 0; ni < navs.length; ni++) recs.push({ kind: "nav", key: "nav-" + (ni + 1), src: navs[ni] });
  for (var li = 0; li < lines.length; li++) recs.push({ kind: "line", key: "line-" + (li + 1), src: lines[li] });
  recs.sort(function (a, b) { return num(a.src.order, 0) - num(b.src.order, 0); });
  if (beats.length) out.beats = [];
  if (navs.length) out.navs = [];
  if (lines.length) out.lines = [];
  var done = []; // rows already placed, in prose order — what "nearest preceding" searches
  var EVENT_KIND = { onNav: "nav", onAct: "act", onLine: "line" };
  function shareSubject(a, b) {
    if (!a || !b) return false;
    for (var i = 0; i < a.length; i++) for (var j = 0; j < b.length; j++) if (a[i].key === b[j].key) return true;
    return false;
  }
  for (var ri = 0; ri < recs.length; ri++) {
    var rec = recs[ri];
    var src = rec.src;
    var tag = "#[" + rec.kind + ": " + s(src.raw) + "]";
    if (!timeAtShot.length) {
      out.warnings.push(tag + " has no shot to play in — write a #[cam: …] before it.");
      continue;
    }
    var bidx = Math.min(Math.max(0, num(src.after, 0) - 1), timeAtShot.length - 1);
    var bshot = scene.shots[bidx];
    var blen = bshot.hold + bshot.transition;
    var offset = Math.max(0, num(src.offset, 0));
    var anchor = { shot: bidx };
    var start = timeAtShot[bidx] + Math.min(offset, blen);
    var ev = src.event;
    if (ev && ev.kind === "on") {
      var onIdx = eventIndex(ev.event, scene.shots);
      if (onIdx >= 0) {
        anchor = { shot: onIdx };
        start = timeAtShot[onIdx] + Math.min(offset, scene.shots[onIdx].hold + scene.shots[onIdx].transition);
      } else out.warnings.push(tag + ' says "on ' + s(ev.event) + '" and no shot answers to that name | it plays on the shot it is written under.');
    } else if (ev && EVENT_KIND[ev.kind]) {
      var wantKind = EVENT_KIND[ev.kind];
      var hit = null;
      var any = null;
      for (var d = done.length - 1; d >= 0; d--) {
        if (done[d].kind !== wantKind) continue;
        if (!any) any = done[d];
        if (rec.kind !== "line" && shareSubject(src.subjects, done[d].subjects)) { hit = done[d]; break; }
      }
      hit = hit || any;
      if (hit) {
        anchor = {};
        anchor[ev.kind] = { key: hit.key, subject: hit.subjects && hit.subjects.length ? hit.subjects[0].key : "" };
        start = hit.end + offset;
      } else out.warnings.push(tag + " says " + ev.kind + " and no #[" + wantKind + ": …] is written before it | it plays on the shot it is written under.");
    }
    var row = { kind: rec.kind, key: rec.key, shot: bidx, time: round2(start), anchor: anchor, offset: round2(offset), raw: s(src.raw) };
    if (!anchor.hasOwnProperty("shot")) row.afterKey = anchor[ev.kind].key;
    var end = start + END_ESTIMATE;
    if (rec.kind === "act") {
      var bhold = num(src.hold, 0) > 0 ? src.hold : src.loop ? Math.max(0.2, timeAtShot[bidx] + blen - start) : 0;
      var blive = scene.activeSet && bidx < scene.activeSet.length ? scene.activeSet[bidx] : openName;
      var bpool = byKeyOf[blive] || byKey;
      var bsubs = [];
      for (var bs = 0; bs < (src.subjects || []).length; bs++) {
        var sub = src.subjects[bs];
        if (bpool[sub.key]) bsubs.push({ ref: sub.ref, key: sub.key, name: sub.name });
        else out.warnings.push(tag + ' names "' + s(sub.name || sub.ref) + '", which is not on ' + (blive ? 'the live set "' + blive + '"' : "the set") + " at that shot — nothing there plays it.");
      }
      row.clip = s(src.clip);
      row.subjects = bsubs;
      if (bhold > 0) {
        row.hold = round2(bhold);
        end = start + bhold;
      }
      row.end = round2(end);
      done.push({ kind: "act", key: rec.key, subjects: src.subjects, end: end });
      if (bsubs.length) out.beats.push(row);
    } else if (rec.kind === "nav") {
      var nlive = scene.activeSet && bidx < scene.activeSet.length ? scene.activeSet[bidx] : openName;
      var npool = byKeyOf[nlive] || byKey;
      var nsubs = [];
      for (var ns = 0; ns < (src.subjects || []).length; ns++) {
        var nsub = src.subjects[ns];
        if (npool[nsub.key]) nsubs.push({ ref: nsub.ref, key: nsub.key, name: nsub.name, offstage: !!npool[nsub.key].offstage });
        else out.warnings.push(tag + ' names "' + s(nsub.name || nsub.ref) + '", which is not on ' + (nlive ? 'the live set "' + nlive + '"' : "the set") + " at that shot — nothing there walks it.");
      }
      var nsec = num(src.seconds, 0);
      // A one-hop route to a point is measurable here; a path card is read at press (lib/shoot.js).
      if (!nsec && src.route && src.route.point && nsubs.length && npool[nsubs[0].key]) {
        var from = npool[nsubs[0].key].position;
        var len = Math.hypot(src.route.point.x-from.x,src.route.point.y-from.y,src.route.point.z-from.z);
        nsec = round2(len / (num(src.speed, 0) > 0 ? src.speed : WALK_SPEED));
      }
      row.subjects = nsubs;
      row.route = src.route;
      row.clip = s(src.clip) || "Walk";
      row.seconds = nsec;
      row.speed = num(src.speed, 0);
      row.near = num(src.near, NEAR_DEFAULT);
      row.exit = !!src.exit;
      row.enter = !!src.enter;
      for (var oi = 0; oi < nsubs.length; oi++) if (nsubs[oi].offstage) row.enter = true;
      if (nsec > 0) end = start + nsec;
      row.end = round2(end);
      done.push({ kind: "nav", key: rec.key, subjects: src.subjects, end: end });
      if (nsubs.length) out.navs.push(row);
    } else {
      // A line's words ride RAW (lib/refs.js owns the speaker split); the estimate reads them whole.
      end = start + speechSeconds(src.raw);
      row.end = round2(end);
      done.push({ kind: "line", key: rec.key, subjects: [], end: end });
      out.lines.push(row);
    }
  }

  // THE MOODS, on the plan's own clock (jace: the #[atmo: …] token in the page IS the setting): a mood lands where the shot it was written under starts; one written before the first shot lands at 0 (dressed as the picture starts). moods appears only when a card wrote one.
  var moods = Array.isArray(scene.moods) ? scene.moods : [];
  if (moods.length) {
    out.moods = [];
    for (var mi2 = 0; mi2 < moods.length; mi2++) {
      var md = moods[mi2];
      if (!timeAtShot.length) {
        out.warnings.push("#[atmo: " + s(md.raw) + "] has no shot to light | write a #[cam: …] so the scene has a picture to paint.");
        continue;
      }
      var midx = Math.min(Math.max(0, num(md.after, 0) - 1), timeAtShot.length - 1);
      var atmo = null;
      if (typeof o.atmoOf === "function") {
        try {
          atmo = o.atmoOf(s(md.raw));
        } catch (e) {
          atmo = null;
        }
      }
      if (!atmo || typeof atmo !== "object") atmo = { id: null, name: s(md.raw).trim(), source: "free" };
      out.moods.push({ shot: midx, time: round2(timeAtShot[midx]), raw: s(md.raw), atmo: { id: atmo.id || null, name: s(atmo.name) || s(md.raw).trim(), source: s(atmo.source) || "free" } });
    }
  }

  out.warnings = out.warnings.concat(scene.warnings || []);
  if (!out.clip.sequence.length) out.error = "This scene compiled to no shots.";
  return out;
}

// }, card: { kind, text, at, seconds } } ] } WHAT CROSSES AND WHAT DOES NOT (payload discipline, the same law the cinema crossing keeps): crosses — the PICTURE: shots, their two marks, their holds, their lens, the set each one plays on, and a title card written as #[cam: title: …]. A 1s shot lands as written; this file never quietly rewrites a beat.
var FILM_LENS = {
  extreme_close: 85,
  close: 65,
  medium_close: 50,
  medium: 40,
  full: 35,
  wide: 28,
  establishing: 21,
};

// film-kit's own doc names exactly ONE ease token, plus linear in prose. So exactly two ever cross;
// an ease name the mod's doc does not carry would be a guess written into a contract.
var FILM_EASE = "easeInOutSine";
var FILM_EASE_LINEAR = "linear";
// The only card kind film-kit's contract shows.
var FILM_CARD_KIND = "chapter";
// How far down its own axis a camera with no subject is looking, in metres — a look POINT, because
// film-kit aims with two points and never with a yaw/pitch pair.
var FILM_LOOK_THROW = 10;
var FILM_CUT_SECONDS = 2;
var FILM_HERO_SECONDS = 12;
var FILM_SHOTS_FILM = 6;
var FILM_SHOTS_LONG = 18;
// Every id this emitter mints starts here, then the card's own id: that prefix is the merge key —
// a re-shoot replaces exactly its own rows and nothing else in the file (lib/shoot.js mergeFilm).
var FILM_KEY_PREFIX = "cb-";
var FILM_PLACE = "main";

export function filmSlug(v, cap) {
  return low(v).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, cap || 28);
}
export function filmKey(cardId, name) {
  var raw = low(cardId).replace(/[^a-z0-9]+/g, "");
  return FILM_KEY_PREFIX + (raw.slice(0, 28) || filmSlug(name) || "card");
}
export function filmSetId(key, setName) {
  var nm = filmSlug(setName, 24);
  return key + "-set" + (nm ? "-" + nm : "");
}
export function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}
export function triple(x, y, z) {
  return [round2(x), round2(y), round2(z)];
}

// A framed node, as film-kit's two points. The aim is the author's own `looking at` when they placed the camera by hand, the subject's aim height when the shot was framed by words, and a throw down the camera's own axis when there is neither.
export function markOf(node, shot, placement) {
  var look;
  if (shot && shot.look) {
    look = triple(shot.look.x, shot.look.y, shot.look.z);
  } else if (placement) {
    var size = SIZES[shot.size] || SIZES.medium;
    look = triple(placement.position.x, placement.position.y + size.aim * (placement.scale || 1), placement.position.z);
  } else {
    var d = dirOf(node.yaw);
    var pr = (node.pitch * Math.PI) / 180;
    var flat = Math.cos(pr) * FILM_LOOK_THROW;
    look = triple(node.position.x + d.x * flat, node.position.y + Math.sin(pr) * FILM_LOOK_THROW, node.position.z + d.z * flat);
  }
  return { pos: triple(node.position.x, node.position.y, node.position.z), look: look };
}

// THE TWO HOMES film-kit's contract keeps for words (its skill, "The contract" — the /line and /score lanes): a shot carries `lines: [{ who, text, at, clip }]` and one `music: { clip, gain, fadeIn }`. opts: { name (the card's name — the film's title only when the file is being created), cardId (the merge key's source), place (which place the sets stand in; default "main"), lines, music }
export function emitFilm(scene, opts) {
  var o = opts || {};
  var out = {
    key: "",
    title: s(o.name) || "Untitled Scene",
    place: s(o.place) || FILM_PLACE,
    shots: [],
    sets: {},
    seconds: 0,
    warnings: [],
    error: "",
  };
  if (!scene || scene.error) {
    out.error = (scene && scene.error) || "Nothing to compile.";
    return out;
  }
  out.key = filmKey(o.cardId, out.title);

  var pools = poolsOf(scene);

  // A #[cam: title: …] becomes that shot's own card. `after` is how many shots had been parsed when the tag was read, so a tag written after shot k belongs to shot k-1 — the same reading compile() gives it on the effects track. film-kit carries ONE card per shot; a second is named and left.
  var cardAt = {};
  var fxs = scene.effects || [];
  for (var f = 0; f < fxs.length; f++) {
    var fx = fxs[f];
    if (!fx || fx.type !== "announce") continue;
    var txt = s(fx.params && fx.params.text).trim();
    if (!txt) continue;
    var idx = Math.max(0, (fx.after || 0) - 1);
    if (cardAt[idx]) {
      out.warnings.push('Two title cards fall on the same shot — "' + txt + '" was left out; film-kit carries one card per shot.');
      continue;
    }
    cardAt[idx] = { kind: FILM_CARD_KIND, text: txt, at: 0, seconds: round2(Math.max(0.5, num(fx.params && fx.params.duration, 2))) };
  }

  // The words, bucketed by the shot they were written under — one pass, no lookup per row.
  var linesAt = {};
  var musicAt = {};
  var oLines = Array.isArray(o.lines) ? o.lines : [];
  for (var li = 0; li < oLines.length; li++) {
    var lk = Math.max(0, num(oLines[li] && oLines[li].at, 0));
    if (!linesAt[lk]) linesAt[lk] = [];
    linesAt[lk].push(oLines[li]);
  }
  var oMusic = Array.isArray(o.music) ? o.music : [];
  for (var mi = 0; mi < oMusic.length; mi++) {
    var mk = Math.max(0, num(oMusic[mi] && oMusic[mi].at, 0));
    // film-kit carries ONE music cue per shot ("absent music = the previous cue keeps running"), so a
    // second cue on the same shot is named and left rather than quietly overwriting the first.
    if (musicAt[mk]) {
      out.warnings.push('Two music cues fall on the same shot — "' + s(oMusic[mi].clip || oMusic[mi].label) + '" was left out; film-kit carries one cue per shot.');
      continue;
    }
    musicAt[mk] = oMusic[mi];
  }

  var prev = null;
  var clock = 0;
  for (var i = 0; i < scene.shots.length; i++) {
    var shot = scene.shots[i];
    var live = scene.activeSet && i < scene.activeSet.length ? scene.activeSet[i] : pools.openName;
    var placement = shot.target ? (pools.byKeyOf[live] || pools.byKey)[low(shot.target)] : null;
    var node = frameShot(shot, placement, i);
    var mark = node ? markOf(node, shot, placement) : prev; // a beat holds the camera already running
    if (!mark) {
      out.warnings.push('Shot "' + shot.label + '" has nothing to aim at and no camera before it — it is not in the shot list.');
      continue;
    }
    var seconds = round2(Math.max(0.2, shot.hold + shot.transition));
    var moving = !!(node && prev && shot.transition > 0);
    var setId = filmSetId(out.key, live);
    var row = {
      id: out.key + "-" + pad2(out.shots.length + 1),
      set: setId,
      seconds: seconds,
      lens: FILM_LENS[shot.size] || FILM_LENS.medium,
      camera: {
        from: { pos: moving ? prev.pos : mark.pos, look: moving ? prev.look : mark.look },
        to: { pos: mark.pos, look: mark.look },
        ease: shot.easing === "linear" ? FILM_EASE_LINEAR : FILM_EASE,
      },
    };
    // Frame FOR the subject: film-kit names the thing a shot is of, in words, beside the marks.
    var who = placement ? s(placement.name) || s(placement.ref) : "";
    if (who) row.subject = who;
    if (cardAt[i]) row.card = cardAt[i];

    // THE WORDS, into film-kit's own two homes. Spoken lines space themselves across the hold; the
    // music cue rides the shot it was written under and nothing else is invented for it.
    var spoken = linesAt[i] || [];
    if (spoken.length) {
      row.lines = [];
      for (var sp = 0; sp < spoken.length; sp++) {
        var lrow = { who: s(spoken[sp].who), text: s(spoken[sp].text), at: round2((seconds * (sp + 1)) / (spoken.length + 1)) };
        if (s(spoken[sp].clip)) lrow.clip = s(spoken[sp].clip);
        row.lines.push(lrow);
      }
    }
    var cue = musicAt[i];
    if (cue && s(cue.clip)) {
      row.music = { clip: s(cue.clip), gain: round2(num(cue.gain, 0.3)) };
      if (num(cue.fadeIn, 0) > 0) row.music.fadeIn = round2(num(cue.fadeIn, 0));
    }

    if (seconds < FILM_CUT_SECONDS) out.warnings.push('Shot "' + shot.label + '" holds ' + seconds + "s — under two seconds is a cut, not a shot.");
    else if (seconds > FILM_HERO_SECONDS) out.warnings.push('Shot "' + shot.label + '" holds ' + seconds + "s — a hero landscape holds twelve; past that a shot drifts.");

    out.shots.push(row);
    if (!out.sets[setId]) {
      var pieces = (pools.placementsOf[live] || []).length;
      out.sets[setId] = {
        place: out.place,
        notes: (live ? 'Set "' + live + '"' : "The set") + ' from the Worldwright Studio scene card "' + out.title + '" — ' + pieces + (pieces === 1 ? " piece." : " pieces."),
      };
    }
    prev = mark;
    clock += seconds;
  }
  out.seconds = round2(clock);
  if (!out.shots.length) {
    out.error = "This scene compiled to no shots.";
    return out;
  }
  if (out.shots.length < FILM_SHOTS_FILM)
    out.warnings.push("This card emits " + out.shots.length + (out.shots.length === 1 ? " shot" : " shots") + " — six to eighteen shots is a film, three is a scene.");
  else if (out.shots.length > FILM_SHOTS_LONG)
    out.warnings.push("This card emits " + out.shots.length + " shots — past eighteen, film-kit's grammar says trim before you add.");
  out.warnings = out.warnings.concat(scene.warnings || []);
  return out;
}

// The grammar, written out for a model or an author. Kept here so the drawer, the docs window and
// the Shoot panel all teach the SAME words — one definition, one parser, one prompt.
export function contract() {
  return [
    "SHOOT GRAMMAR — a scene card is a shot list. ONE token system: everything is a #[…] token,",
    "ids in the source, names at render. Insert card tokens with the reference picker.",
    "",
    "THE SET — a section named Set (or Stage, Blocking). One line per thing on stage:",
    "  #[cardId] at X, Y, Z facing YAW scale N",
    "  Coordinates are metres, Y is up. facing and scale are optional. A line with no card token is prose.",
    "  Several sets on one card: name them — a section \"Set: Throne Room\" — and switch mid-scene",
    "  with #[set: throne room] in the prose. Shots after the switch play on that set; the first",
    "  set section opens the scene. Set sections take the space their set needs.",
    "",
    "THE CAMERA — inline #[cam: …] tokens in the prose, in the order they are written:",
    "  #[cam: SIZE ANGLE on CARDID · SECONDSs · cut|blend N · EASING]",
    "  The target is the bare card id after `on` — never a nested #[…] token.",
    "  size:   " + Object.keys(SIZES).join(", "),
    "  angle:  " + Object.keys(ANGLES).join(", "),
    "  height: " + Object.keys(HEIGHTS).join(", "),
    "  easing: " + EASINGS.join(", "),
    "  Default is a 3s hard cut with easeInOut. Add `end` to hold on the last shot instead of returning.",
    "  Place the camera by hand instead: #[cam: at 4,2,-6 looking at 0,1.5,0 · 5s]",
    "",
    "EFFECTS — #[cam: …] tokens that are not camera moves:",
    "  #[cam: fade in]  #[cam: fade out]  #[cam: shake]  #[cam: flash]  #[cam: letterbox]  #[cam: vignette]  #[cam: turbulence]",
    "  #[cam: title: FOR THE EMPEROR]  #[cam: toast: ...]  #[cam: sound: cdn/sfx-....mp3]",
    "",
    "ACTION BEATS — a placed card plays one of its clips, on the shot the tag is written under:",
    "  #[act: CARDID CLIP]   #[act: CARDID, CARDID Embrace · 2s]   #[act: CARDID Dance · at 1s · loop]",
    "  Cards are bare ids (as after `on`); the clip is the last word and must be in that card's Body",
    "  `animations` list. A seconds part holds the clip that long; `at Ns` starts it into the shot;",
    "  `loop` holds it to the end of the shot. Without either, the clip plays once and the pose returns.",
    "",
    "THE WALK - a placed card walks a route, on the shot the tag is written under:",
    "  #[nav: CARDID along PATHCARDID | 7s | Limp | exit]   #[nav: CARDID to 3, 0, -1 | enter]   #[nav: CARDID to CARDID | near 1.5]",
    "  A Path card has a section named Path (Route, Waypoints, Nav), one waypoint per line:",
    "  at 12, 0, 6     at 4, 0, 2 | pause 1s     at 3, 0, -1 facing 90     at CARDID near 1.2",
    "  `Ns` = travel seconds for the route (else " + WALK_SPEED + " m/s, or `speed N`); a bare word is the clip (Walk);",
    "  `exit` vanishes on arrival; `enter` stays unseen until the walk (implied by `offstage` on the Set line).",
    "",
    "EVENTS - one vocabulary for #[act:], #[nav:] and #[line:], written as a part:",
    "  onNav = when the nearest preceding walk arrives   onAct = when the nearest preceding beat ends",
    "  onLine = when the nearest preceding line is spoken   on 3 / on the-door = that shot's start",
    "  at Ns offsets any of them. No event word = the shot the token is written under.",
    "  #[act: CARDID Embrace | onNav]   #[line: Narrator - She is here. | onNav | at 1s]",
    "",
    "THE LIGHT - #[atmo: ...] written in the prose, at the beat where the light changes, ON THE CLOCK:",
    "  #[atmo: moonlit]   #[atmo: golden hour]   #[atmo: the bruised violet of a dying storm]",
    "  It rides the shot it is written under, like a line; before the first shot = as the picture starts.",
    "  A preset id or name paints that preset; one shared word (moonlit -> Moonlit Night) paints the",
    "  nearest preset; any other words are noted as the mood and the light stays. The room's own light",
    "  comes back at strike, at the next Shoot, or when the clip ends. No page or card setting exists.",
    "",
    "BODY FROM THE SHELF - a placed card's Body may name an Asset Library card instead of a file:",
    "  #[asset: Old Beggar] animations Limp pose Idle     #[asset: Town Square]",
    "  The row's own clips ride along and `animations` adds to them. A name the shelf lacks is searched",
    "  among this game's own assets; a /cdn/ path is itself. Parts split on | (the old dot still reads).",
  ].join("\n");
}

module.exports = {
  VERSION: VERSION,
  SET_SECTION_NAMES: SET_SECTION_NAMES,
  SIZES: SIZES,
  ANGLES: ANGLES,
  HEIGHTS: HEIGHTS,
  EASINGS: EASINGS,
  FX_WORDS: FX_WORDS,
  CAM_RE: CAM_RE,
  DEFAULT_HOLD: DEFAULT_HOLD,
  // the second emit shape — film-kit's contract rows, from the same parse
  FILM_LENS: FILM_LENS,
  emitFilm: emitFilm,
  parseSet: parseSet,
  parseShots: parseShots,
  parseScene: parseScene,
  // the walk lane + the shared event vocabulary (jace 2026-09-02)
  PATH_SECTION_NAMES: PATH_SECTION_NAMES,
  WALK_SPEED: WALK_SPEED,
  NEAR_DEFAULT: NEAR_DEFAULT,
  parsePath: parsePath,
  eventClause: eventClause,
  eventIndex: eventIndex,
  chunkSpeech: chunkSpeech,
  speechSeconds: speechSeconds,
  frameShot: frameShot,
  compile: compile,
  contract: contract,
};
