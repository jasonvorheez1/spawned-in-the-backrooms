// refs — TagResolver (pipeline step 1) + ReferenceResolver (pipeline step 2), one file: one walk.
// GUARD: resolved USER content is escaped here, at the moment it becomes html — never by the caller.

const IDS = require("lib/ids.js");
const STATUS = require("lib/status.js");
const STORE = require("lib/store.js");
const GRAPH = require("lib/graph.js");

// GUARD: pinned books via lib/pinned.js, NOT lib/research.js — research.js → cards.js → this file
//   is a require cycle, and a call-time require would not escape it either.
const PINS = require("lib/pinned.js");
const SCHEMA = require("lib/schema.js");
const SHELF = require("lib/assetshelf.js");
const VAULT = require("lib/cinemavault.js");
const KITCHEN = require("lib/atmokitchen.js");
const SOUNDS = require("lib/soundspec.js");

const ASSET_NAME = "ASSET";
const ASSET_MISS_LABEL = "not on the shelf";
const ASSET_NOMOD_LABEL = "Asset Library mod not installed";
const ASSET_GLYPH = { model: "◆", image: "▣", sound: "♪", animation: "▶", set: "▤" };

export function isAssetToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === ASSET_NAME;
}

export function assetThumb(row) {
  const src = String((row && row.thumb) || "");
  if (src) return '<img class="sb-asset-t" src="' + escapeText(src) + '" alt="" aria-hidden="true" />';
  const kind = String((row && row.kind) || "").toLowerCase();
  return '<span class="sb-asset-t sb-asset-g" aria-hidden="true">' + (ASSET_GLYPH[kind] || ASSET_GLYPH.model) + "</span>";
}

export function assetChip(row) {
  return (
    '<span class="sb-asset" data-asset="' +
    escapeText(row.id) +
    '" title="' +
    escapeText(row.path || row.name) +
    '">' +
    assetThumb(row) +
    '<span class="sb-asset-n">' +
    escapeText(row.name) +
    "</span><span class=\"sb-asset-k\">" +
    escapeText(row.kind) +
    "</span></span>"
  );
}

export function assetOff(token, label, title) {
  return (
    '<span class="sb-asset sb-asset-off"' +
    (title ? ' title="' + escapeText(title) + '"' : "") +
    ">" +
    (token ? '<span class="sb-asset-n">' + escapeText(token) + "</span>" : "") +
    '<span class="sb-asset-k">' +
    label +
    "</span></span>"
  );
}

export function assetSegment(api, t, start, end) {
  // The shelf answers to the NAME; the placement tail stays in the render as written, because the
  // author put it there to read it (his 2026-08-29 ruling, at splitArgs).
  const split = splitArgs(String(t.value || t.raw || "").trim());
  const token = split.head;
  const argsPlain = split.args ? " " + split.args : "";
  const argsHtml = split.args ? " " + escapeText(split.args) : "";
  let mod = "";
  let row = null;
  try {
    mod = SHELF.installed(api);
    if (mod) row = SHELF.resolve(api, token);
  } catch (e) {
    mod = "";
    row = null;
  }
  if (!mod) {
    return {
      kind: "asset",
      name: ASSET_NAME,
      state: "nomod",
      token: token,
      args: split.args,
      start: start,
      end: end,
      plain: ASSET_NOMOD_LABEL + argsPlain,
      html: assetOff(token, ASSET_NOMOD_LABEL, "install the Asset Library mod and this points at a shelf row") + argsHtml,
    };
  }
  if (!row) {
    return {
      kind: "asset",
      name: ASSET_NAME,
      state: "missing",
      token: token,
      args: split.args,
      start: start,
      end: end,
      plain: token + " — " + ASSET_MISS_LABEL + argsPlain,
      html: assetOff(token, ASSET_MISS_LABEL, "nothing on the Asset Library shelf answers to this") + argsHtml,
    };
  }
  return {
    kind: "asset",
    name: ASSET_NAME,
    state: "live",
    token: token,
    args: split.args,
    assetId: row.id,
    assetKind: row.kind,
    assetPath: row.path,
    start: start,
    end: end,
    plain: row.name + argsPlain,
    html: assetChip(row) + argsHtml,
  };
}

const SHOT_NAME = "SHOT";
const SHOT_MISS_LABEL = "not in the clip vault";
const SHOT_NOMOD_LABEL = "Absolute Cinema mod not installed";
const SHOT_GLYPH = "▶";

export function isShotToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === SHOT_NAME;
}

export function shotChip(row) {
  return (
    '<span class="sb-asset" data-shot="' +
    escapeText(row.id) +
    '" title="' +
    escapeText(row.name) +
    '">' +
    '<span class="sb-asset-t sb-asset-g" aria-hidden="true">' +
    SHOT_GLYPH +
    "</span>" +
    '<span class="sb-asset-n">' +
    escapeText(row.name) +
    '</span><span class="sb-asset-k">clip</span></span>'
  );
}

export async function shotSegment(api, t, start, end, cache) {
  const token = String(t.value || t.raw || "").trim();
  let mod = "";
  let row = null;
  try {
    mod = VAULT.installed(api);
    if (mod) row = await VAULT.resolve(api, token, cache);
  } catch (e) {
    mod = "";
    row = null;
  }
  if (!mod) {
    return {
      kind: "shot",
      name: SHOT_NAME,
      state: "nomod",
      token: token,
      start: start,
      end: end,
      plain: SHOT_NOMOD_LABEL,
      html: assetOff(token, SHOT_NOMOD_LABEL, "install the Absolute Cinema mod and this points at a saved clip"),
    };
  }
  if (!row) {
    return {
      kind: "shot",
      name: SHOT_NAME,
      state: "missing",
      token: token,
      start: start,
      end: end,
      plain: token + " — " + SHOT_MISS_LABEL,
      html: assetOff(token, SHOT_MISS_LABEL, "nothing in the Absolute Cinema clip vault answers to this"),
    };
  }
  return {
    kind: "shot",
    name: SHOT_NAME,
    state: "live",
    token: token,
    clipId: row.id,
    savedAt: row.savedAt || 0,
    start: start,
    end: end,
    plain: row.name,
    html: shotChip(row),
  };
}

const ATMO_NAME = "ATMO";
const ATMO_GLYPH = "◐";

export function isAtmoToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === ATMO_NAME;
}

export function atmoChip(label, sub, free) {
  return (
    '<span class="sb-atmo' +
    (free ? " sb-atmo-free" : "") +
    '" title="' +
    escapeText(sub || label) +
    '">' +
    '<span class="sb-atmo-g" aria-hidden="true">' +
    ATMO_GLYPH +
    "</span>" +
    '<span class="sb-atmo-n">' +
    escapeText(label) +
    "</span></span>"
  );
}

export function atmoSegment(t, start, end) {
  const token = String(t.value || t.raw || "").trim();
  let row = null;
  try {
    row = KITCHEN.resolve(token);
  } catch (e) {
    row = null;
  }
  const label = row ? row.name : token;
  return {
    kind: "atmo",
    name: ATMO_NAME,
    state: row ? "preset" : "free",
    token: token,
    atmo: row ? row.id : token,
    start: start,
    end: end,
    plain: label,
    html: atmoChip(label, row ? row.mood : "", !row),
  };
}

export function atmoTokens(src) {
  const s = String(src === null || src === undefined ? "" : src);
  const out = [];
  const re = scanner();
  let m;
  while ((m = re.exec(s))) {
    const t = parseToken(m[1]);
    if (!t.name || t.name.toUpperCase() !== ATMO_NAME) continue;
    const value = String(t.value || "").trim();
    if (!value) continue;
    const row = KITCHEN.resolve(value);
    out.push({ atmo: row ? row.id : value, at: m.index });
  }
  return out;
}

const CAM_NAME = "CAM";
const CAM_GLYPH = "▣";

export function isCamToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === CAM_NAME;
}

export function camTarget(directive) {
  const s = String(directive || "");
  const i = s.toLowerCase().indexOf(" on ");
  if (i < 0) return "";
  const rest = s.slice(i + 4).trim();
  const word = rest.split(/[\s·|,]/)[0] || "";
  return IDS.isValidId(word) ? word : "";
}

export function camChip(shown) {
  return (
    '<span class="sb-cam" title="camera directive">' +
    '<span class="sb-cam-g" aria-hidden="true">' +
    CAM_GLYPH +
    "</span>" +
    '<span class="sb-cam-n">' +
    escapeText(shown) +
    "</span></span>"
  );
}

// THE ACTION BEAT — #[act: <cardId>, <cardId> Clip | 2s | loop] (lib/shootspec.js actTag is the parser; this is only the chip). Subjects are bare card ids, exactly as a cam `on` target, so they resolve through the same name lens: ids in the source, names at render. Wears the cam chip's dress.
const ACT_NAME = "ACT";
const ACT_GLYPH = "▶";

export function isActToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === ACT_NAME;
}

// The head is everything before the first part break; its LAST word is the clip, the words before
// it are the subjects (card ids, "and"/"on" allowed as filler).
export function actParse(directive) {
  const s = String(directive || "").trim();
  const parts = s.split(/\s*(?:·|\||;|--)\s*/);
  const head = (parts[0] || "").trim();
  const words = head.split(/\s+/).filter(Boolean);
  const clip = words.length > 1 ? words[words.length - 1] : "";
  const ids = [];
  for (let i = 0; i < words.length - 1; i++) {
    const w = words[i].replace(/,+$/, "");
    if (!w || w === "and" || w === "on") continue;
    if (IDS.isValidId(w)) ids.push(w);
  }
  return { clip: clip, ids: ids, parts: parts.slice(1) };
}

export function actChip(shown) {
  return (
    '<span class="sb-cam sb-act" title="action beat">' +
    '<span class="sb-cam-g" aria-hidden="true">' +
    ACT_GLYPH +
    "</span>" +
    '<span class="sb-cam-n">' +
    escapeText(shown) +
    "</span></span>"
  );
}

// THE WALK — #[nav: <cardId>[, <cardId>] along <pathCardId> | 7s | Limp | exit] (lib/shootspec.js navTag is the parser; this is only the chip). Subjects and the path card are bare card ids, resolved through the same name lens as an act's subjects. NOT a reference edge, exactly like act.
const NAV_NAME = "NAV";
const NAV_GLYPH = "\u21e2";

export function isNavToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === NAV_NAME;
}

// The head is everything before the first part break: card ids up to the route word (along / via /
// down / to), then the route — a path card id, a card id to walk to, or bare coordinates.
export function navParse(directive) {
  const s = String(directive || "").trim();
  const parts = s.split(/\s*(?:·|\||;|--)\s*/);
  const head = (parts[0] || "").trim();
  const words = head.split(/\s+/).filter(Boolean);
  const ids = [];
  let route = "";
  let pathId = "";
  let i = 0;
  for (; i < words.length; i++) {
    const w = words[i].replace(/,+$/, "");
    if (w === "along" || w === "via" || w === "down" || w === "to") {
      route = w;
      break;
    }
    if (!w || w === "and") continue;
    if (IDS.isValidId(w)) ids.push(w);
  }
  const tail = words.slice(i + 1).join(" ").replace(/^#\[\s*|\s*\]$/g, "").trim();
  if (IDS.isValidId(tail)) pathId = tail;
  return { ids: ids, route: route, pathId: pathId, parts: parts.slice(1) };
}

export function navChip(shown) {
  return (
    '<span class="sb-cam sb-nav" title="walk">' +
    '<span class="sb-cam-g" aria-hidden="true">' +
    NAV_GLYPH +
    "</span>" +
    '<span class="sb-cam-n">' +
    escapeText(shown) +
    "</span></span>"
  );
}

const SOUND_NAME = "SOUND";
const SOUND_GLYPH = "♪";

export function isSoundToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === SOUND_NAME;
}

export function soundSource(api, cue) {
  const src = String((cue && cue.source) || "");
  if (!src) return "";
  if (cue.sourceKind === "path") {
    const tail = src.split("/").pop() || src;
    return tail.replace(/\.[a-z0-9]+$/i, "");
  }
  try {
    if (SHELF.installed(api)) {
      const row = SHELF.resolve(api, src);
      if (row && row.name) return String(row.name);
    }
  } catch (e) {
  }
  return src;
}

export function soundTiming(cue) {
  const bits=[];
  if(cue.tempo!=null)bits.push("tempo "+cue.tempo+" BPM");
  if(cue.fade)bits.push("fade "+cue.fade+"s each edge");
  if(cue.trigger||cue.onShot)bits.push("on "+(cue.trigger||cue.onShot));
  if(cue.at) bits.push("at "+cue.at+"s"+(cue.onShot?" after shot":""));
  if(cue.until!=null) bits.push("until "+cue.until+"s");
  if(cue.from||cue.to!=null) bits.push("slice "+(cue.from||0)+"–"+(cue.to==null?"end":cue.to)+"s");
  bits.push(cue.position?"position "+[cue.position.x,cue.position.y,cue.position.z].join(", "):"speaker "+(cue.speaker==="self"?"this card":cue.speaker||"this card"));
  if(cue.position||cue.speaker!=="screen") bits.push("range "+cue.range+"m");
  if(cue.invalid) bits.push("invalid cue");
  return bits;
}
export function soundChip(shown) {
  return (
    '<span class="sb-cam sb-cam-sound" title="sound cue">' +
    '<span class="sb-cam-g" aria-hidden="true">' +
    SOUND_GLYPH +
    "</span>" +
    '<span class="sb-cam-n">' +
    escapeText(shown) +
    "</span></span>"
  );
}

export function soundSegment(api, t, start, end) {
  const token = String(t.value || t.raw || "").trim();
  let cue = null;
  try {
    cue = SOUNDS.parseCue(token);
  } catch (e) {
    cue = null;
  }
  const bits = [];
  if (cue && cue.source) {
    bits.push(soundSource(api, cue));
    if (cue.onShot) bits.push("on " + cue.onShot);
    if (cue.loop) bits.push("loop");
    if (cue.stopShot) bits.push("stop " + cue.stopShot);
    bits.push(...soundTiming(cue));
  }
  const shown = bits.length ? bits.join(" · ") : token;
  return {
    kind: "sound",
    name: SOUND_NAME,
    state: cue && cue.sourceKind === "path" ? "file" : "word",
    token: token,
    source: (cue && cue.source) || "",
    onShot: (cue && cue.onShot) || "",
    loop: !!(cue && cue.loop),
    start: start,
    end: end,
    plain: shown,
    html: soundChip(shown),
  };
}

// doc — 'cinematic' | 'level') is prose that compiles, and these are the three things its prose could not say yet: who is standing HOW, who SAYS what, and what PLAYS under it.

const POSE_NAME = "POSE";
const POSE_GLYPH = "⚘";

export function isPoseToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === POSE_NAME;
}

// "Guard Stance on <cardId>" — the pose or cooked clip first, the body it lands on after " on ", exactly the shape #[cam: … on …] already taught the author. No " on " is a pose with no body yet: legible, compilable later, never an error in the middle of a sentence.
export function poseParse(directive) {
  const s = String(directive || "");
  const i = s.toLowerCase().indexOf(" on ");
  if (i < 0) return { pose: s.trim(), target: "", targetId: "", word: "" };
  const pose = s.slice(0, i).trim();
  const rest = s.slice(i + 4).trim();
  const word = rest.split(/[\s·|,]/)[0] || "";
  return { pose: pose, target: rest, targetId: IDS.isValidId(word) ? word : "", word: word };
}

export function poseChip(shown) {
  return (
    '<span class="sb-cam sb-cam-pose" title="pose directive">' +
    '<span class="sb-cam-g" aria-hidden="true">' +
    POSE_GLYPH +
    "</span>" +
    '<span class="sb-cam-n">' +
    escapeText(shown) +
    "</span></span>"
  );
}

const LINE_NAME = "LINE";
const LINE_GLYPH = "❝";

export function isLineToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === LINE_NAME;
}

// "who — words". The em dash is the written form he uses; an en dash, a spaced hyphen and a colon all read the same way on a phone keyboard, so all four split. Nothing after the dash is a speaker clearing their throat: the who holds, the words stay empty, and the compile says so.
const LINE_SPLIT = /\s+[—–]\s+|\s+-\s+|:\s+/;

export function lineParse(value) {
  const s = String(value || "").trim();
  if (!s) return { who: "", words: "", whoId: "" };
  const m = LINE_SPLIT.exec(s);
  if (!m) return { who: "", words: s, whoId: "" };
  const who = s.slice(0, m.index).trim();
  const words = s.slice(m.index + m[0].length).trim();
  return { who: who, words: words, whoId: IDS.isValidId(who) ? who : "" };
}

export function lineChip(who, words) {
  return (
    '<span class="sb-cam sb-cam-line" title="spoken line">' +
    '<span class="sb-cam-g" aria-hidden="true">' +
    LINE_GLYPH +
    "</span>" +
    (who ? '<span class="sb-cam-w">' + escapeText(who) + "</span>" : "") +
    '<span class="sb-cam-n">' +
    escapeText(words) +
    "</span></span>"
  );
}

const SCORE_NAME = "SCORE";
const SCORE_GLYPH = "♬";

export function isScoreToken(t) {
  const name = t && typeof t === "object" ? t.name : parseToken(t).name;
  return String(name || "").toUpperCase() === SCORE_NAME;
}

// A score is a cue, so it is READ BY THE CUE GRAMMAR — lib/soundspec.js, the same parser #[sound:…] uses (source, `on <shot>`, `loop`, `stop on <shot>`). One grammar, two names: sfx and music differ in which lane plays them, never in how the author writes them.
export function scoreSegment(api, t, start, end) {
  const token = String(t.value || t.raw || "").trim();
  let cue = null;
  try {
    cue = SOUNDS.parseCue(token);
  } catch (e) {
    cue = null;
  }
  const bits = [];
  if (cue && cue.source) {
    bits.push(soundSource(api, cue));
    if (cue.onShot) bits.push("on " + cue.onShot);
    if (cue.loop) bits.push("loop");
    if (cue.stopShot) bits.push("stop " + cue.stopShot);
    bits.push(...soundTiming(cue));
  }
  const shown = bits.length ? bits.join(" · ") : token;
  return {
    kind: "score",
    name: SCORE_NAME,
    state: cue && cue.sourceKind === "path" ? "file" : "word",
    token: token,
    source: (cue && cue.source) || "",
    onShot: (cue && cue.onShot) || "",
    loop: !!(cue && cue.loop),
    stopShot: (cue && cue.stopShot) || "",
    start: start,
    end: end,
    plain: shown,
    html:
      '<span class="sb-cam sb-cam-score" title="music cue">' +
      '<span class="sb-cam-g" aria-hidden="true">' +
      SCORE_GLYPH +
      "</span>" +
      '<span class="sb-cam-n">' +
      escapeText(shown) +
      "</span></span>",
  };
}

export function research() {
  return PINS;
}

export function pinnedBookIds() {
  const R = research();
  try {
    if (typeof R.ids === "function") return (R.ids() || []).filter(Boolean);
    if (typeof R.all === "function") {
      return (R.all() || [])
        .map(function (b) {
          return String((b && b.id) || "");
        })
        .filter(Boolean);
    }
  } catch (e) {
  }
  return [];
}

export function pinnedBook(bookId) {
  const bid = String(bookId || "");
  if (!bid) return null;
  const R = research();
  try {
    if (typeof R.isPinned === "function" && !R.isPinned(bid)) return null;
    const b = typeof R.bookOf === "function" ? R.bookOf(bid) : null;
    if (b) return { id: String(b.id || bid), name: String(b.name || "") };
    const e = typeof R.entry === "function" ? R.entry(bid) : null;
    if (e) return { id: String(e.id || bid), name: String(e.name || "") };
  } catch (err) {
  }
  return null;
}

const TRASH_LABEL = "Reference In Trash";
const DEAD_LABEL = "Deleted Reference";
// His ruling 2026-08-14: "It should also resolve to invalid reference if the card does not exist."
const INVALID_LABEL = "Invalid Reference";
const SHARED_NAME_TITLE = "Two cards share this name";

// GUARD: a token holds no brackets — the anti-nesting rule at the lexer level; the cap bounds the scan.
const TOKEN_SOURCE = "#\\[([^\\[\\]]{0,2000})\\]";

// NATURAL-PROSE ARGS (jace, 2026-08-29: "All of them should be that way. The args tail BEGINS at "at <number>": `at` is what makes a placement a placement (the level lane's mention rule), and requiring the digit means a name like "The Inn at Worlds End" never splits — only coordinates do. js) splits with THIS helper, never its own copy.
const ARGS_RE = /\bat\s*\(?\s*-?\d/i;
export function splitArgs(inner) {
  const raw = String(inner === null || inner === undefined ? "" : inner);
  const m = raw.match(ARGS_RE);
  if (!m || m.index === undefined || m.index === 0) return { head: raw.trim(), args: "" };
  return { head: raw.slice(0, m.index).trim(), args: raw.slice(m.index).trim() };
}

const DEFAULT_DATETIME = "YYYY-MM-DD HH:mm";


const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

// Per character, so no escape can be double-escaped by a later rule.
export function escapeText(s) {
  return String(s === null || s === undefined ? "" : s).replace(/[&<>"'`]/g, function (c) {
    return ESCAPES[c];
  });
}


export function parseToken(inner) {
  const raw = String(inner === null || inner === undefined ? "" : inner);
  const parts = raw.split(";");
  const head = parts[0] || "";
  const colon = head.indexOf(":");
  const name = (colon === -1 ? head : head.slice(0, colon)).trim();
  const value = colon === -1 ? "" : head.slice(colon + 1).trim();
  const params = {};
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    const c = seg.indexOf(":");
    if (c === -1) continue;
    params[seg.slice(0, c).trim().toUpperCase()] = seg.slice(c + 1).trim();
  }
  return { raw: raw, name: name, value: value, params: params };
}

export function scanner() {
  return new RegExp(TOKEN_SOURCE, "g");
}

// TOTAL counts every occurrence in the rendered output (his words) — tallied before the first is emitted.
export function tallyCounters(text) {
  const totals = {};
  const re = scanner();
  let m;
  while ((m = re.exec(text))) {
    const t = parseToken(m[1]);
    if (t.name.toUpperCase() === "COUNT") {
      const key = t.value || "";
      totals[key] = (totals[key] || 0) + 1;
    }
  }
  return totals;
}


export function nameKey(s) {
  return String(s === null || s === undefined ? "" : s).trim().toLowerCase();
}

const AMBIGUOUS = { id: "", state: "ambiguous" };

export function matchName(map, text, bookId) {
  const key = nameKey(text);
  if (!key) return null;
  const found = ((map && map.byName) || {})[key];
  if (!found) return null;
  const here = String(bookId || "");
  const inBook = function (ids) {
    if (!here) return [];
    const out = [];
    for (let i = 0; i < ids.length; i++) {
      const hit = map.names[ids[i]];
      if (hit && String(hit.bookId || "") === here) out.push(ids[i]);
    }
    return out;
  };
  if (found.live.length === 1) return { id: found.live[0], state: "live" };
  if (found.live.length > 1) {
    const mine = inBook(found.live);
    if (mine.length === 1) return { id: mine[0], state: "live" };
    return AMBIGUOUS;
  }
  if (found.trashed.length === 1) return { id: found.trashed[0], state: "trash" };
  if (found.trashed.length > 1) {
    const mine = inBook(found.trashed);
    if (mine.length === 1) return { id: mine[0], state: "trash" };
    return AMBIGUOUS;
  }
  return null;
}

export function storeBook(bookId) {
  const id = String(bookId || "");
  const g = GRAPH && typeof GRAPH.book === "function" ? GRAPH.book(id) : null;
  if (g && typeof g.cardsAll === "function") return g;
  const entry = STORE && typeof STORE.book === "function" ? STORE.book(id) : null;
  return entry && typeof entry.cardsAll === "function" ? entry : null;
}

export async function loadStatuses(api, bookIds) {
  const out = {};
  const list = [].concat(bookIds === null || bookIds === undefined ? [] : bookIds);
  const reads = [];
  for (let i = 0; i < list.length; i++) {
    const entry = storeBook(list[i]);
    if (!entry) continue;
    reads.push(
      Promise.resolve(entry.cardsAll(api)).then(
        function (res) {
          const rows = (res && res.rows) || [];
          for (let j = 0; j < rows.length; j++) {
            const cid = String(rows[j].id || "");
            if (cid) out[cid] = String(rows[j].status || "");
          }
        },
        function () {
        }
      )
    );
  }
  if (reads.length) await Promise.all(reads);
  return out;
}

const PINNED_PID = "";

// GUARD: a caller passing '' MEANS the pinned sentinel and gets it back unchanged — empty is a scope,
//   not "missing"; every other read answers lib/schema.js's PROJECT_ID.
export function pidOf(value) {
  return value === PINNED_PID ? PINNED_PID : SCHEMA.PROJECT_ID;
}

export function addNameRows(names, bookSeen, rows, pinned) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const cid = String(r.cardId || "");
    if (!cid) continue;
    const bid = String(r.bookId || "");
    let bookName = "";
    if (pinned) {
      if (names[cid]) continue;
      const book = pinnedBook(bid);
      if (!book) continue;
      bookName = book.name;
    }
    names[cid] = {
      name: String(r.name || ""),
      bookId: bid,
      status: "",
      pinned: !!pinned,
      bookName: bookName,
    };
    if (bid) bookSeen[bid] = true;
  }
}

// House rule 1 forbids assembled SQL — an IN-list of ids would be exactly that, so the whole
//   project's map is taken once rather than one round trip per token.
export async function loadMap(api, projectId, cache) {
  const pid = pidOf(projectId);
  const version = indexVersion(pid);
  if (cache && cache.__refmap && cache.__refmap.pid === pid && cache.__refmap.version === version) {
    return cache.__refmap;
  }

  const names = {};
  const bookSeen = {};
  const nres = await api.sql`SELECT cardId, bookId, name FROM card_names WHERE projectId = ${pid}`;
  addNameRows(names, bookSeen, (nres && nres.rows) || [], false);

  if (pid && pinnedBookIds().length) {
    const pres = await api.sql`SELECT cardId, bookId, name FROM card_names WHERE projectId = ${PINNED_PID}`;
    addNameRows(names, bookSeen, (pres && pres.rows) || [], true);
  }

  const statuses = await loadStatuses(api, Object.keys(bookSeen));
  const known = Object.keys(names);
  for (let i = 0; i < known.length; i++) names[known[i]].status = statuses[known[i]] || "";

  const trashed = {};
  const tres = await api.sql`SELECT entityId, projectId, originalBookId FROM trash
    WHERE projectId = ${pid} OR projectId = ${PINNED_PID}`;
  const trows = (tres && tres.rows) || [];
  for (let i = 0; i < trows.length; i++) {
    const eid = String(trows[i].entityId || "");
    if (!eid) continue;
    if (String(trows[i].projectId || "") !== pid && !pinnedBook(String(trows[i].originalBookId || ""))) continue;
    trashed[eid] = true;
  }

  const byName = {};
  const idList = Object.keys(names);
  for (let i = 0; i < idList.length; i++) {
    const id = idList[i];
    const key = nameKey(names[id].name);
    if (!key) continue;
    if (!byName[key]) byName[key] = { live: [], trashed: [] };
    if (trashed[id]) byName[key].trashed.push(id);
    else byName[key].live.push(id);
  }

  const map = { pid: pid, names: names, trashed: trashed, byName: byName, version: version };
  if (cache) cache.__refmap = map;
  return map;
}


export async function nowMs(api) {
  const res = await api.sql`SELECT CAST(unixepoch('subsec') * 1000 AS INTEGER) AS ms`;
  const row = res && res.rows ? res.rows[0] : null;
  return Number((row && row.ms) || 0);
}

export function pad2(n) {
  const v = Math.floor(Number(n) || 0);
  return (v < 10 ? "0" : "") + v;
}

// Epoch ms to civil date without Date — no clock globals in the sandbox. Hinnant's days-to-civil.
export function civilFromMs(ms) {
  const total = Math.floor(Number(ms) || 0);
  let days = Math.floor(total / 86400000);
  let rem = total - days * 86400000;
  if (rem < 0) {
    rem += 86400000;
    days -= 1;
  }
  const hh = Math.floor(rem / 3600000);
  const mi = Math.floor((rem % 3600000) / 60000);
  const ss = Math.floor((rem % 60000) / 1000);

  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  );
  const y0 = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = m <= 2 ? y0 + 1 : y0;
  return { y: y, m: m, d: d, hh: hh, mi: mi, ss: ss };
}

export function formatStamp(pattern, c) {
  const p = String(pattern || "").trim() || DEFAULT_DATETIME;
  return p.replace(/YYYY|MM|DD|HH|mm|ss/g, function (tok) {
    if (tok === "YYYY") return String(c.y);
    if (tok === "MM") return pad2(c.m);
    if (tok === "DD") return pad2(c.d);
    if (tok === "HH") return pad2(c.hh);
    if (tok === "mm") return pad2(c.mi);
    return pad2(c.ss);
  });
}

// An unknown key is inert: it never throws and never eats the token (his rule — content is never eaten).

export function intParam(params, key, fallback) {
  const p = params || {};
  if (!Object.prototype.hasOwnProperty.call(p, key)) return fallback;
  const raw = String(p[key] === null || p[key] === undefined ? "" : p[key]).trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!isFinite(n)) return fallback;
  return Math.trunc(n);
}

export function padTo(n, width) {
  const w = Math.max(0, Math.min(12, Math.floor(Number(width) || 0)));
  const v = Math.trunc(Number(n) || 0);
  let s = String(Math.abs(v));
  while (s.length < w) s = "0" + s;
  return (v < 0 ? "-" : "") + s;
}

export function applyCase(s, mode) {
  const text = String(s === null || s === undefined ? "" : s);
  const m = String(mode || "").trim().toLowerCase();
  if (!m) return text;
  if (m === "upper") return text.toUpperCase();
  if (m === "lower") return text.toLowerCase();
  if (m === "title") {
    return text.replace(/(^|[\s([{"'\u2018\u201c\u2014-])(\S)/g, function (all, lead, ch) {
      return lead + ch.toUpperCase();
    });
  }
  return text;
}

const TAG_COLORS = {
  slate: 250,
  rose: 20,
  amber: 65,
  gold: 95,
  moss: 140,
  teal: 190,
  sky: 235,
  violet: 300,
  plum: 330,
};

export function tagHue(color) {
  const key = String(color === null || color === undefined ? "" : color).trim().toLowerCase();
  if (!key) return -1;
  if (Object.prototype.hasOwnProperty.call(TAG_COLORS, key)) return TAG_COLORS[key];
  const n = Number(key);
  if (isFinite(n)) return ((Math.round(n) % 360) + 360) % 360;
  return -1;
}

export function normalizeDef(d) {
  if (d === null || d === undefined) return null;
  if (typeof d !== "object") {
    return { value: String(d), note: "", color: "", display: "chip", shows: "insert" };
  }
  return {
    value: String(d.value === null || d.value === undefined ? "" : d.value),
    note: String(d.note === null || d.note === undefined ? "" : d.note),
    color: String(d.color === null || d.color === undefined ? "" : d.color),
    display: String(d.display || "").toLowerCase() === "inline" ? "inline" : "chip",
    shows: String(d.shows || "").toLowerCase() === "quiet" ? "quiet" : "insert",
  };
}

export function lookupDef(custom, name) {
  const n = String(name === null || name === undefined ? "" : name);
  if (!custom || !n) return null;
  if (Object.prototype.hasOwnProperty.call(custom, n)) return normalizeDef(custom[n]);
  const up = n.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(custom, up)) return normalizeDef(custom[up]);
  const low = n.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(custom, low)) return normalizeDef(custom[low]);
  return null;
}


export function tagSpan(cls, plain) {
  return '<span class="sb-tag ' + cls + '">' + escapeText(plain) + "</span>";
}

export function customTagHtml(def, plain) {
  if (def.display === "inline") return escapeText(plain);
  const hue = tagHue(def.color);
  const style =
    hue < 0
      ? ""
      : ' style="color:oklch(0.45 0.14 ' + hue + ');background:oklch(0.45 0.14 ' + hue + ' / 0.10)"';
  const title = def.note ? ' title="' + escapeText(def.note) + '"' : "";
  return '<span class="sb-tag sb-tag-custom"' + style + title + ">" + escapeText(plain) + "</span>";
}

export function liveRef(id, hit) {
  const status = String((hit && hit.status) || "");
  const bookName = String((hit && hit.bookName) || "");
  let paint = "";
  if (status) {
    const base = STATUS.statusColor(status);
    paint =
      ' data-status="' +
      escapeText(status) +
      '" style="color:color-mix(in oklch, ' +
      base +
      ' 72%, var(--paper-ink, currentColor));border-bottom-color:color-mix(in oklch, ' +
      base +
      ' 34%, transparent)"';
  }
  return (
    '<span class="sb-ref" role="link" tabindex="0" data-interactive data-ref="' +
    escapeText(id) +
    '" data-book="' +
    escapeText(hit.bookId) +
    '"' +
    (bookName ? ' data-book-name="' + escapeText(bookName) + '"' : "") +
    ' title="' +
    escapeText(bookName ? hit.name + " · " + bookName : hit.name) +
    '"' +
    paint +
    ">" +
    escapeText(hit.name) +
    "</span>"
  );
}

export function stateRef(cls, id, label, title) {
  return (
    '<span class="sb-ref ' +
    cls +
    '" data-ref="' +
    escapeText(id) +
    '"' +
    (title ? ' title="' + escapeText(title) + '"' : "") +
    ">" +
    label +
    "</span>"
  );
}


// Segments over the SOURCE string: { kind: 'text' | 'tag' | 'ref', start, end, plain, html, ... }.
export async function resolveSegments(api, text, ctx) {
  const src = String(text === null || text === undefined ? "" : text);
  const opts = ctx || {};
  const cache = opts.cache || {};
  const custom = opts.customTags || {};
  const totals = tallyCounters(src);
  const counters = {};
  const segs = [];

  let map = null;
  let stamp = null;
  let last = 0;
  const re = scanner();
  let m;

  while ((m = re.exec(src))) {
    if (m.index > last) {
      const lit = src.slice(last, m.index);
      segs.push({ kind: "text", start: last, end: m.index, plain: lit, html: escapeText(lit) });
    }
    const start = m.index;
    const end = re.lastIndex;
    const t = parseToken(m[1]);
    const up = t.name.toUpperCase();

    let def = null;
    if (up === "COUNT") {
      const key = t.value || "";
      counters[key] = (counters[key] || 0) + 1;
      const n = intParam(t.params, "START", 1) + (counters[key] - 1) * intParam(t.params, "STEP", 1);
      const plain = applyCase(padTo(n, intParam(t.params, "PAD", 0)), t.params.CASE);
      segs.push({ kind: "tag", name: "COUNT", start: start, end: end, plain: plain, html: tagSpan("sb-tag-count", plain) });
    } else if (up === "TOTAL") {
      const key = t.value || "";
      const plain = applyCase(padTo(totals[key] || 0, intParam(t.params, "PAD", 0)), t.params.CASE);
      segs.push({ kind: "tag", name: "TOTAL", start: start, end: end, plain: plain, html: tagSpan("sb-tag-total", plain) });
    } else if (up === "DATETIME") {
      // His rule: a DATETIME not resolved at insert time resolves at render time, with an asterisk.
      if (!stamp) stamp = civilFromMs(await nowMs(api));
      const plain =
        applyCase(formatStamp(t.value, stamp), t.params.CASE) + (opts.atInsertTime ? "" : "*");
      segs.push({ kind: "tag", name: "DATETIME", start: start, end: end, plain: plain, html: tagSpan("sb-tag-datetime", plain) });
    } else if (up === ASSET_NAME) {
      segs.push(assetSegment(api, t, start, end));
    } else if (up === SHOT_NAME) {
      segs.push(await shotSegment(api, t, start, end, cache));
    } else if (up === ATMO_NAME) {
      segs.push(atmoSegment(t, start, end));
    } else if (up === SOUND_NAME) {
      segs.push(soundSegment(api, t, start, end));
    } else if (up === SCORE_NAME) {
      segs.push(scoreSegment(api, t, start, end));
    } else if (up === POSE_NAME) {
      // Same name lens the cam directive gets: a card id in the prose shows as the character's name.
      const directive = String(t.value || t.raw || "").trim();
      const p = poseParse(directive);
      let shownTarget = p.target;
      if (p.targetId) {
        if (!map) map = await loadMap(api, opts.projectId, cache);
        const hit = map.names[p.targetId];
        if (hit && hit.name) shownTarget = p.target.split(p.targetId).join(hit.name);
      }
      const shown = p.pose + (shownTarget ? " on " + shownTarget : "");
      segs.push({
        kind: "pose",
        name: POSE_NAME,
        state: p.targetId ? "aimed" : p.target ? "named" : "free",
        token: directive,
        pose: p.pose,
        target: p.target,
        targetId: p.targetId,
        start: start,
        end: end,
        plain: shown,
        html: poseChip(shown),
      });
    } else if (up === LINE_NAME) {
      const raw = String(t.value || t.raw || "").trim();
      const l = lineParse(raw);
      let who = l.who;
      if (l.whoId) {
        if (!map) map = await loadMap(api, opts.projectId, cache);
        const hit = map.names[l.whoId];
        if (hit && hit.name) who = hit.name;
      }
      segs.push({
        kind: "line",
        name: LINE_NAME,
        state: l.whoId ? "aimed" : l.who ? "named" : "unattributed",
        token: raw,
        who: who,
        whoId: l.whoId,
        words: l.words,
        start: start,
        end: end,
        plain: who ? who + " — " + l.words : l.words,
        html: lineChip(who, l.words),
      });
    } else if (up === ACT_NAME) {
      // Same name lens the cam directive gets: every card id in the beat shows as the card's name.
      const directive = String(t.value || t.raw || "").trim();
      const a = actParse(directive);
      let shown = directive;
      if (a.ids.length) {
        if (!map) map = await loadMap(api, opts.projectId, cache);
        for (let ai = 0; ai < a.ids.length; ai++) {
          const hit = map.names[a.ids[ai]];
          if (hit && hit.name) shown = shown.split(a.ids[ai]).join(hit.name);
        }
      }
      segs.push({
        kind: "act",
        name: ACT_NAME,
        state: a.ids.length ? "aimed" : "unaimed",
        token: directive,
        clip: a.clip,
        targetIds: a.ids,
        start: start,
        end: end,
        plain: shown,
        html: actChip(shown),
      });
    } else if (up === NAV_NAME) {
      // Same name lens the act chip gets: every card id in the walk (subjects and the path card) shows
      // as the card's name.
      const directive = String(t.value || t.raw || "").trim();
      const nv = navParse(directive);
      let shown = directive;
      const all = nv.ids.concat(nv.pathId ? [nv.pathId] : []);
      if (all.length) {
        if (!map) map = await loadMap(api, opts.projectId, cache);
        for (let ni = 0; ni < all.length; ni++) {
          const hit = map.names[all[ni]];
          if (hit && hit.name) shown = shown.split(all[ni]).join(hit.name);
        }
      }
      segs.push({
        kind: "nav",
        name: NAV_NAME,
        state: nv.ids.length ? "aimed" : "unaimed",
        token: directive,
        route: nv.route,
        pathId: nv.pathId,
        targetIds: nv.ids,
        start: start,
        end: end,
        plain: shown,
        html: navChip(shown),
      });
    } else if (up === CAM_NAME) {
      const directive = String(t.value || t.raw || "").trim();
      const on = camTarget(directive);
      let shown = directive;
      if (on) {
        if (!map) map = await loadMap(api, opts.projectId, cache);
        const hit = map.names[on];
        if (hit && hit.name) shown = directive.split(on).join(hit.name);
      }
      segs.push({
        kind: "cam",
        name: CAM_NAME,
        state: on ? "aimed" : "effect",
        token: directive,
        targetId: on,
        start: start,
        end: end,
        plain: shown,
        html: camChip(shown),
      });
    } else if (t.name && (def = lookupDef(custom, t.name))) {
      const filled = def.value.indexOf("$1") === -1 ? def.value : def.value.split("$1").join(t.value);
      const plain = applyCase(filled, t.params.CASE);
      segs.push({
        kind: "tag",
        name: t.name,
        display: def.display,
        color: def.color,
        start: start,
        end: end,
        plain: plain,
        html: customTagHtml(def, plain),
      });
    } else {
      // A plain reference may wear natural-prose args — #[mt9qf5lsklmdl at 3, 0.9, -2 facing 90] — the head is the reference (id or name, same as ever), and the tail stays visible in the render exactly as written: the author put it there to proofread it.
      const split = splitArgs(t.raw);
      const id = split.head;
      const argsPlain = split.args ? " " + split.args : "";
      const argsHtml = split.args ? " " + escapeText(split.args) : "";
      if (IDS.isValidId(id)) {
        if (!map) map = await loadMap(api, opts.projectId, cache);
        if (map.trashed[id]) {
          segs.push({ kind: "ref", state: "trash", targetId: id, args: split.args, start: start, end: end, plain: TRASH_LABEL + argsPlain, html: stateRef("sb-ref-trash", id, TRASH_LABEL) + argsHtml });
        } else if (map.names[id]) {
          const hit = map.names[id];
          segs.push({ kind: "ref", state: "live", targetId: id, bookId: hit.bookId, bookName: hit.bookName || "", pinned: !!hit.pinned, args: split.args, start: start, end: end, plain: hit.name + argsPlain, html: liveRef(id, hit) + argsHtml });
        } else {
          segs.push({ kind: "ref", state: "dead", targetId: id, args: split.args, start: start, end: end, plain: DEAD_LABEL + argsPlain, html: stateRef("sb-ref-dead", id, DEAD_LABEL) + argsHtml });
        }
      } else if (!id) {
        segs.push({ kind: "text", start: start, end: end, plain: m[0], html: escapeText(m[0]) });
      } else {
        if (!map) map = await loadMap(api, opts.projectId, cache);
        const named = matchName(map, id, opts.bookId);
        if (named && named.state === "live") {
          const hit = map.names[named.id];
          segs.push({ kind: "ref", state: "live", targetId: named.id, bookId: hit.bookId, matchedBy: "name", args: split.args, start: start, end: end, plain: hit.name + argsPlain, html: liveRef(named.id, hit) + argsHtml });
        } else if (named && named.state === "trash") {
          segs.push({ kind: "ref", state: "trash", targetId: named.id, matchedBy: "name", args: split.args, start: start, end: end, plain: TRASH_LABEL + argsPlain, html: stateRef("sb-ref-trash", named.id, TRASH_LABEL) + argsHtml });
        } else {
          const shared = !!(named && named.state === "ambiguous");
          segs.push({ kind: "ref", state: "invalid", targetId: "", rawText: id, args: split.args, start: start, end: end, plain: INVALID_LABEL + argsPlain, html: stateRef("sb-ref-invalid", "", INVALID_LABEL, shared ? SHARED_NAME_TITLE : "") + argsHtml });
        }
      }
    }
    last = end;
  }

  if (last < src.length) {
    const lit = src.slice(last);
    segs.push({ kind: "text", start: last, end: src.length, plain: lit, html: escapeText(lit) });
  }
  return segs;
}

export async function resolve(api, text, ctx) {
  const segs = await resolveSegments(api, text, ctx);
  let out = "";
  for (let i = 0; i < segs.length; i++) out += segs[i].html;
  return out;
}

// His ruling: "Export should replace #[...] with their results instead of being kept in the end result."
export async function resolvePlain(api, text, ctx) {
  const segs = await resolveSegments(api, text, ctx);
  let out = "";
  for (let i = 0; i < segs.length; i++) out += segs[i].plain;
  return out;
}


export function byNameAsc(a, b) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export function collectBacklinks(map, rows, bookId, selfId) {
  const out = { sameBook: [], crossBook: [] };
  for (let i = 0; i < rows.length; i++) {
    const fromId = String(rows[i].fromId || "");
    if (!fromId || fromId === selfId) continue;
    if (map.trashed[fromId]) continue;
    const hit = map.names[fromId];
    if (!hit) continue;
    const fromBookId = String(rows[i].fromBookId || hit.bookId || "");
    const entry = { cardId: fromId, bookId: fromBookId, name: hit.name };
    if (fromBookId === bookId) out.sameBook.push(entry);
    else out.crossBook.push(entry);
  }
  out.sameBook.sort(byNameAsc);
  out.crossBook.sort(byNameAsc);
  return out;
}

// opts.primaryId: a stack MEMBER passes the stack's target — refs point at the primary, never the top card.
export async function backlinks(api, opts) {
  const o = opts || {};
  const pid = pidOf(o.projectId);
  const bookId = String(o.bookId || "");
  const cardId = String(o.cardId || "");
  const out = { sameBook: [], crossBook: [] };
  if (!pid || !cardId) return out;

  const map = await loadMap(api, pid, o.cache);
  // CUT A: the edge carries two ids. The source's BOOK comes from its cards row, the source's PROJECT from the phonebook — the same scope loadMap itself is built on, so a source outside this project cannot ride in. (collectBacklinks still falls back to the map's bookId, and still drops any fromId the map does not know: the JS filter and the join agree.)
  const res = await api.sql`SELECT x.fromId AS fromId, c.bookId AS fromBookId
    FROM cross_book_references x
    JOIN cards c ON c.id = x.fromId
    JOIN card_names cn ON cn.cardId = x.fromId
    WHERE cn.projectId = ${pid} AND x.toId = ${cardId}`;
  const mine = collectBacklinks(map, (res && res.rows) || [], bookId, cardId);
  out.sameBook = mine.sameBook;
  out.crossBook = mine.crossBook;

  const primaryId = String(o.primaryId || "");
  if (primaryId && primaryId !== cardId) {
    const pres = await api.sql`SELECT x.fromId AS fromId, c.bookId AS fromBookId
      FROM cross_book_references x
      JOIN cards c ON c.id = x.fromId
      JOIN card_names cn ON cn.cardId = x.fromId
      WHERE cn.projectId = ${pid} AND x.toId = ${primaryId}`;
    const via = collectBacklinks(map, (pres && pres.rows) || [], bookId, primaryId);
    const hit = map.names[primaryId];
    out.viaStack = {
      cardId: primaryId,
      bookId: hit ? hit.bookId : bookId,
      name: hit ? hit.name : "",
      trashed: !!map.trashed[primaryId],
      sameBook: via.sameBook,
      crossBook: via.crossBook,
      count: via.sameBook.length + via.crossBook.length,
    };
  }
  return out;
}


export async function onCardRenamed(api, opts) {
  const o = opts || {};
  const cardId = String(o.cardId || "");
  const bookId = String(o.bookId || "");
  if (!cardId) throw new Error("refs.onCardRenamed: cardId is required");
  const pid = pidOf(o.projectId);
  const name = String(o.name === null || o.name === undefined ? "" : o.name);
  await api.sql`INSERT INTO card_names (cardId, bookId, projectId, name)
    VALUES (${cardId}, ${bookId}, ${pid}, ${name})
    ON CONFLICT(cardId) DO UPDATE SET bookId = excluded.bookId,
      projectId = excluded.projectId, name = excluded.name`;
  bumpIndex(pid);
  return true;
}

export async function onCardCreated(api, opts) {
  return onCardRenamed(api, opts);
}

export function onCardTrashed(api, opts) {
  const o = opts || {};
  bumpIndex(pidOf(o.projectId));
  return true;
}

// GUARD: INBOUND edges are deliberately left standing — they render Deleted Reference and are the
//   lazy-replacement queue.
export async function onCardDeleted(api, opts) {
  const o = opts || {};
  const cardId = String(o.cardId || "");
  if (!cardId) throw new Error("refs.onCardDeleted: cardId is required");
  const pid = pidOf(o.projectId);
  await api.sql`DELETE FROM cross_book_references WHERE fromId = ${cardId}`;
  await api.sql`DELETE FROM card_names WHERE cardId = ${cardId}`;
  bumpIndex(pid);
  return true;
}


// GUARD: the key is (fromId, toId) — the caller passes ALL of the card's text at once; half of it
//   would delete the other half's edges.
export function referencedIds(texts, map, bookId) {
  const list = [].concat(texts === null || texts === undefined ? [] : texts);
  const seen = {};
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const re = scanner();
    const src = String(list[i] === null || list[i] === undefined ? "" : list[i]);
    let m;
    while ((m = re.exec(src))) {
      const t = parseToken(m[1]);
      const up = t.name.toUpperCase();
      if (up === "COUNT" || up === "TOTAL" || up === "DATETIME") continue;
      if (up === ASSET_NAME) continue;
      if (up === SHOT_NAME) continue;
      if (up === ATMO_NAME) continue;
      if (up === CAM_NAME) continue;
      if (up === SOUND_NAME) {
        const cue=SOUNDS.parseCue(t.value||t.raw||"");
        const ids=[cue.sourceKind==="card"?cue.source.toLowerCase():"",cue.speaker];
        for(const id of ids) if(IDS.isValidId(id)&&!seen[id]) {seen[id]=true;out.push(id);}
        continue;
      }
      // The doc kinds carry their own targets (a pose's body, a line's speaker) and are read by
      // lib/compile.js, not by the reference index — same treatment #[cam:…] gets.
      if (up === POSE_NAME) continue;
      if (up === LINE_NAME) continue;
      if (up === SCORE_NAME) continue;
      if (up === ACT_NAME) continue;
      if (up === NAV_NAME) continue;
      // Same head/args split the render does: #[id at 3, 0.9, -2] still earns its edge.
      const raw = splitArgs(t.raw).head;
      let id = "";
      if (IDS.isValidId(raw)) id = raw;
      else if (map) {
        const named = matchName(map, raw, bookId);
        if (named) id = named.id;
      }
      if (!id || seen[id]) continue;
      seen[id] = true;
      out.push(id);
    }
  }
  return out;
}

export async function indexRefs(api, opts) {
  const o = opts || {};
  const pid = pidOf(o.projectId);
  const fromId = String(o.fromId || "");
  const fromBookId = String(o.bookId || o.fromBookId || "");
  if (!fromId) throw new Error("refs.indexRefs: fromId is required");
  const map = await loadMap(api, pid, o.cache);
  const ids = referencedIds(o.texts === undefined ? o.text : o.texts, map, fromBookId);

  await api.sql`DELETE FROM cross_book_references WHERE fromId = ${fromId}`;
  if (!ids.length) return 0;
  for (let i = 0; i < ids.length; i++) {
    const toId = ids[i];
    if (toId === fromId) continue;
    // CUT A: an edge is the pair and nothing else, so there is nothing left for a conflict to
    // update — the row either already says this or it does not exist yet.
    await api.sql`INSERT INTO cross_book_references (fromId, toId)
      VALUES (${fromId}, ${toId})
      ON CONFLICT(fromId, toId) DO NOTHING`;
  }
  return ids.length;
}


export async function staleRefs(api, opts) {
  const o = opts || {};
  const pid = pidOf(o.projectId);
  const map = await loadMap(api, pid, o.cache);
  // CUT A: project scope through the phonebook, source book off the source's cards row.
  const res = await api.sql`SELECT x.fromId AS fromId, c.bookId AS fromBookId, x.toId AS toId
    FROM cross_book_references x
    JOIN cards c ON c.id = x.fromId
    JOIN card_names cn ON cn.cardId = x.fromId
    WHERE cn.projectId = ${pid}`;
  const rows = (res && res.rows) || [];
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const toId = String(rows[i].toId || "");
    if (map.names[toId] || map.trashed[toId]) continue;
    out.push({
      fromId: String(rows[i].fromId || ""),
      fromBookId: String(rows[i].fromBookId || ""),
      toId: toId,
      replacement: DEAD_LABEL,
    });
  }
  return out;
}

export async function staleCount(api, opts) {
  const rows = await staleRefs(api, opts);
  return rows.length;
}

export async function clearStaleRefs(api, opts) {
  const rows = await staleRefs(api, opts);
  for (let i = 0; i < rows.length; i++) {
    await api.sql`DELETE FROM cross_book_references WHERE fromId = ${rows[i].fromId} AND toId = ${rows[i].toId}`;
  }
  return rows;
}

export function danglingRow(map, kind, id, fromId, fromBookId, toId) {
  if (!toId) return null;
  const src = map.names[fromId];
  if (!src) return null;
  const target = map.names[toId];
  const trashed = !!map.trashed[toId];
  if (target && !trashed) return null;
  const state = target && trashed ? "trash" : "dead";
  return {
    kind: kind,
    id: String(id || ""),
    fromId: fromId,
    fromName: src.name,
    fromBookId: String(fromBookId || src.bookId || ""),
    fromTrashed: !!map.trashed[fromId],
    toId: toId,
    toName: target ? target.name : "",
    state: state,
    label: state === "trash" ? TRASH_LABEL : DEAD_LABEL,
    fix: state === "trash" ? "restore" : "clearEdge",
    needsRewrite: kind === "text" && state === "dead",
  };
}

export async function danglingRefs(api, opts) {
  const o = opts || {};
  const pid = pidOf(o.projectId);
  const out = {
    projectId: pid,
    counts: { total: 0, trash: 0, dead: 0, text: 0, sources: 0, targets: 0 },
    rows: [],
    targets: [],
  };
  if (!pid) return out;
  const map = await loadMap(api, pid, o.cache);

  // CUT A: same derivation staleRefs uses — cards for the book, the phonebook for the project.
  const tres = await api.sql`SELECT x.fromId AS fromId, c.bookId AS fromBookId, x.toId AS toId
    FROM cross_book_references x
    JOIN cards c ON c.id = x.fromId
    JOIN card_names cn ON cn.cardId = x.fromId
    WHERE cn.projectId = ${pid}`;
  const trows = (tres && tres.rows) || [];
  for (let i = 0; i < trows.length; i++) {
    const row = danglingRow(
      map,
      "text",
      "",
      String(trows[i].fromId || ""),
      String(trows[i].fromBookId || ""),
      String(trows[i].toId || "")
    );
    if (row) out.rows.push(row);
  }

  const sources = {};
  const targets = {};
  for (let k = 0; k < out.rows.length; k++) {
    const r = out.rows[k];
    out.counts.total += 1;
    out.counts[r.state] += 1;
    out.counts[r.kind] += 1;
    sources[r.fromId] = true;
    if (!targets[r.toId]) {
      targets[r.toId] = { toId: r.toId, toName: r.toName, state: r.state, count: 0, from: [] };
    }
    const t = targets[r.toId];
    t.count += 1;
    t.from.push({ cardId: r.fromId, name: r.fromName, bookId: r.fromBookId, kind: r.kind, id: r.id });
  }
  out.counts.sources = Object.keys(sources).length;
  out.counts.targets = Object.keys(targets).length;
  out.targets = Object.keys(targets)
    .map(function (id) {
      return targets[id];
    })
    .sort(function (a, b) {
      if (a.state !== b.state) return a.state === "dead" ? -1 : 1;
      if (a.count !== b.count) return b.count - a.count;
      return byNameAsc({ name: a.toName || a.toId }, { name: b.toName || b.toId });
    });
  out.rows.sort(function (a, b) {
    if (a.state !== b.state) return a.state === "dead" ? -1 : 1;
    return byNameAsc(a, b) || byNameAsc({ name: a.toName || a.toId }, { name: b.toName || b.toId });
  });
  return out;
}

export async function danglingCount(api, opts) {
  const rep = await danglingRefs(api, opts);
  return rep.counts;
}

export async function fixDangling(api, opts) {
  const o = opts || {};
  const op = String(o.op || "");
  const pid = pidOf(o.projectId);

  if (op === "clearEdge") {
    const fromId = String(o.fromId || "");
    const toId = String(o.toId || "");
    if (!fromId || !toId) throw new Error("refs.fixDangling: clearEdge needs fromId and toId");
    await api.sql`DELETE FROM cross_book_references WHERE fromId = ${fromId} AND toId = ${toId}`;
    bumpIndex(pid);
    return { op: op, cleared: 1, rows: [{ fromId: fromId, toId: toId }] };
  }

  if (op === "clearAllDead") {
    const rows = await clearStaleRefs(api, { projectId: pid, cache: o.cache });
    bumpIndex(pid);
    return { op: op, cleared: rows.length, rows: rows };
  }

  throw new Error("refs.fixDangling: unknown op " + JSON.stringify(op));
}


// Doc 13 gives autocomplete to CardRepository, not the resolver — if it grows its own, delete this.
const INDEX_VERSION = {};

export function bumpIndex(projectId) {
  const pid = String(projectId || "");
  INDEX_VERSION[pid] = (INDEX_VERSION[pid] || 0) + 1;
  return INDEX_VERSION[pid];
}

export function indexVersion(projectId) {
  return INDEX_VERSION[String(projectId || "")] || 0;
}

export async function autocompleteIndex(api, opts) {
  const o = opts || {};
  const pid = pidOf(o.projectId);
  const bookId = String(o.bookId || "");
  const map = await loadMap(api, pid, o.cache);
  const entries = [];

  const ids = Object.keys(map.names);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (map.trashed[id]) continue;
    const hit = map.names[id];
    entries.push({
      kind: "card",
      id: id,
      name: hit.name,
      bookId: hit.bookId,
      bookName: hit.bookName || "",
      pinned: !!hit.pinned,
      insert: "#[" + id + "]",
      sameBook: hit.bookId === bookId,
    });
  }

  const tres = await api.sql`SELECT id, name, color FROM tags WHERE projectId = ${pid} ORDER BY name`;
  const trows = (tres && tres.rows) || [];
  for (let i = 0; i < trows.length; i++) {
    const r = trows[i];
    entries.push({
      kind: "tag",
      id: String(r.id || ""),
      name: String(r.name || ""),
      color: String(r.color || ""),
      insert: "#[" + String(r.name || "") + "]",
      sameBook: true,
    });
  }

  const defs = o.customTags || null;
  if (defs) {
    const names = Object.keys(defs).sort();
    for (let i = 0; i < names.length; i++) {
      const d = normalizeDef(defs[names[i]]);
      if (!d || d.shows === "quiet") continue;
      entries.push({
        kind: "tagdef",
        id: names[i],
        name: names[i],
        note: d.note,
        color: d.color,
        display: d.display,
        value: d.value,
        insert: "#[" + names[i] + "]",
        sameBook: true,
      });
    }
  }

  try {
    const vault = await VAULT.clips(api, o.cache);
    for (let i = 0; i < vault.length; i++) {
      entries.push({
        kind: "shot",
        id: vault[i].id,
        name: vault[i].name,
        insert: "#[shot:" + vault[i].id + "]",
        sameBook: true,
      });
    }
  } catch (e) {
  }

  return { projectId: pid, bookId: bookId, version: indexVersion(pid), entries: entries };
}

// entry.name is deliberately RAW (the popup escapes on render) so nothing double-escapes it.
export function matchCandidates(index, typed, limit) {
  const entries = (index && index.entries) || [];
  const q = String(typed === null || typed === undefined ? "" : typed)
    .trim()
    .toLowerCase();
  const cap = Math.max(1, Math.floor(Number(limit) || 12));
  const hits = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const name = String(e.name || "").toLowerCase();
    let rank = -1;
    if (!q) rank = 1;
    else if (name.indexOf(q) === 0) rank = 0;
    else if (name.indexOf(q) > 0) rank = 1;
    else if (String(e.id || "").toLowerCase().indexOf(q) === 0) rank = 2;
    if (rank < 0) continue;
    hits.push({ entry: e, rank: rank });
  }
  hits.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (!!b.entry.sameBook !== !!a.entry.sameBook) return b.entry.sameBook ? 1 : -1;
    const an = String(a.entry.name || "");
    const bn = String(b.entry.name || "");
    return an < bn ? -1 : an > bn ? 1 : 0;
  });
  return hits.slice(0, cap).map(function (h) {
    return h.entry;
  });
}


module.exports = {
  escapeText: escapeText,
  resolve: resolve,
  resolvePlain: resolvePlain,
  backlinks: backlinks,
  onCardRenamed: onCardRenamed,
  resolveSegments: resolveSegments,
  parseToken: parseToken,
  referencedIds: referencedIds,
  TOKEN_SOURCE: TOKEN_SOURCE,
  splitArgs: splitArgs,
  isAssetToken: isAssetToken,
  ASSET_NAME: ASSET_NAME,
  ASSET_MISS_LABEL: ASSET_MISS_LABEL,
  ASSET_NOMOD_LABEL: ASSET_NOMOD_LABEL,
  ASSET_GLYPH: ASSET_GLYPH,
  isShotToken: isShotToken,
  SHOT_NAME: SHOT_NAME,
  SHOT_MISS_LABEL: SHOT_MISS_LABEL,
  SHOT_NOMOD_LABEL: SHOT_NOMOD_LABEL,
  SHOT_GLYPH: SHOT_GLYPH,
  isAtmoToken: isAtmoToken,
  atmoTokens: atmoTokens,
  ATMO_NAME: ATMO_NAME,
  ATMO_GLYPH: ATMO_GLYPH,
  isSoundToken: isSoundToken,
  SOUND_NAME: SOUND_NAME,
  SOUND_GLYPH: SOUND_GLYPH,
  isCamToken: isCamToken,
  camTarget: camTarget,
  CAM_NAME: CAM_NAME,
  CAM_GLYPH: CAM_GLYPH,
  isPoseToken: isPoseToken,
  poseParse: poseParse,
  POSE_NAME: POSE_NAME,
  POSE_GLYPH: POSE_GLYPH,
  isLineToken: isLineToken,
  lineParse: lineParse,
  LINE_NAME: LINE_NAME,
  LINE_GLYPH: LINE_GLYPH,
  isScoreToken: isScoreToken,
  SCORE_NAME: SCORE_NAME,
  SCORE_GLYPH: SCORE_GLYPH,
  isActToken: isActToken,
  actParse: actParse,
  ACT_NAME: ACT_NAME,
  ACT_GLYPH: ACT_GLYPH,
  isNavToken: isNavToken,
  navParse: navParse,
  NAV_NAME: NAV_NAME,
  NAV_GLYPH: NAV_GLYPH,
  TRASH_LABEL: TRASH_LABEL,
  DEAD_LABEL: DEAD_LABEL,
  INVALID_LABEL: INVALID_LABEL,
  loadMap: loadMap,
  onCardCreated: onCardCreated,
  onCardTrashed: onCardTrashed,
  onCardDeleted: onCardDeleted,
  indexRefs: indexRefs,
  staleRefs: staleRefs,
  staleCount: staleCount,
  clearStaleRefs: clearStaleRefs,
  danglingRefs: danglingRefs,
  danglingCount: danglingCount,
  fixDangling: fixDangling,
  TAG_COLORS: TAG_COLORS,
  normalizeDef: normalizeDef,
  lookupDef: lookupDef,
  tagHue: tagHue,
  autocompleteIndex: autocompleteIndex,
  matchCandidates: matchCandidates,
  indexVersion: indexVersion,
  bumpIndex: bumpIndex,
};
