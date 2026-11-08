// cardimage — the naming rules for a card's picture: card or author phrase -> prompt -> /cdn/ filename. PURE: no SQL, no objectApi, no requires. A name, once served, keeps its first look forever — a regenerate must mint a NEW filename (nextVersion + urlFor), never reuse one.

const PROMPT_CAP = 140;
const SLUG_CAP = 80;

// Changing the tail changes every picture minted after it; already-minted filenames keep their look.
const STYLE_TAIL = "painterly book illustration, muted ink and watercolour, soft edges";

const CDN_DIR = "/cdn/moodboard-codexbuilder-cards/";

const FALLBACK_SLUG = "story-card";
const FALLBACK_BODY = "an untitled story card, a blank page waiting";

// A status is a MOOD, never a word to draw: a picture does not say "Drafting", it looks unfinished.
const STATUS_MOOD = {
  idea: "a loose first sketch",
  outline: "bare linework, barely inked",
  drafting: "the ink still wet",
  revising: "reworked, warm lamplight",
  "needs research": "half-finished, edges unresolved",
  "on hold": "still and quiet, dust settling",
  final: "a finished plate, deep colour",
  archived: "faded and dust-dimmed",
};

const DETAIL_CAP = 84;
const NAME_CAP = 60;

export function text(v) {
  return v == null ? "" : String(v);
}

export function clean(v) {
  let s = text(v);
  s = s.replace(/#\[[^\]]*\]/g, " ");
  s = s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
  s = s.replace(/[`*_~>#|{}<>\\/]+/g, " ");
  s = s.replace(/["“”]+/g, "");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

// A break only counts past a dozen characters — "Ch. 4." is an opener, not a sentence end.
export function firstSentence(v) {
  const s = clean(v);
  if (!s) return "";
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (ch === "." || ch === "!" || ch === "?") {
      if (i < 12) continue;
      const next = s.charAt(i + 1);
      if (next === "" || next === " ") return s.slice(0, i).trim();
    }
  }
  return s;
}

export function clampWords(v, cap) {
  const t = text(v).trim();
  if (t.length <= cap) return t;
  let cut = t.slice(0, cap);
  const sp = cut.lastIndexOf(" ");
  if (sp > cap / 2) cut = cut.slice(0, sp);
  return cut.replace(/[\s,;:.\-–—]+$/, "").trim();
}

export function slug(v) {
  let s = text(v).toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/-{2,}/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  if (s.length > SLUG_CAP) {
    s = s.slice(0, SLUG_CAP);
    const cut = s.lastIndexOf("-");
    if (cut > SLUG_CAP / 3) s = s.slice(0, cut);
    s = s.replace(/-+$/, "");
  }
  return s;
}

// Keeps withStyle idempotent — a stored prompt handed back in never wears a second tail.
export function stripStyle(v) {
  const t = text(v).trim();
  const low = t.toLowerCase();
  const tail = STYLE_TAIL.toLowerCase();
  if (low.length >= tail.length && low.slice(low.length - tail.length) === tail) {
    return t
      .slice(0, t.length - tail.length)
      .replace(/[\s,;:\-–—]+$/, "")
      .trim();
  }
  return t;
}

export function withStyle(v) {
  const body = clampWords(stripStyle(clean(v)), PROMPT_CAP);
  return body ? body + ", " + STYLE_TAIL : STYLE_TAIL;
}

export function firstSectionText(c) {
  if (!c) return "";
  const list = c.sections;
  if (list && typeof list.length === "number") {
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (!s) continue;
      const body = typeof s === "string" ? s : text(s.content);
      if (clean(body)) return body;
    }
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s && typeof s === "object" && clean(s.name)) return s.name;
    }
    return "";
  }
  const one = c.section || c.firstSection || c.sectionContent;
  if (!one) return "";
  return typeof one === "string" ? one : text(one.content);
}

export function promptFromCard(card) {
  const c = card || {};
  const name = clampWords(clean(c.name != null ? c.name : c.title), NAME_CAP);
  let detail = clampWords(firstSentence(c.summary), DETAIL_CAP);
  if (!detail) detail = clampWords(firstSentence(firstSectionText(c)), DETAIL_CAP);
  const mood = STATUS_MOOD[clean(c.status).toLowerCase()] || "";

  const parts = [];
  if (name) parts.push(name);
  if (detail && detail.toLowerCase() !== name.toLowerCase()) parts.push(detail);
  let body = clampWords(parts.join(", "), PROMPT_CAP);
  if (!body) body = FALLBACK_BODY;
  if (mood && body.length + 2 + mood.length <= PROMPT_CAP) body = body + ", " + mood;
  return withStyle(body);
}

export function promptFor(card, description) {
  const typed = clean(description);
  return typed ? withStyle(typed) : promptFromCard(card);
}

// Version 0 is "no picture": first mint is 1, every regenerate +1.
export function nextVersion(row) {
  const raw = row && typeof row === "object" ? row.version : row;
  const n = Number(raw);
  if (!(n === n) || n === Infinity || n === -Infinity || n < 1) return 1;
  return n - (n % 1) + 1;
}

export function versionNumber(v) {
  const n = Number(v);
  if (!(n === n) || n === Infinity || n === -Infinity) return 1;
  const i = n < 0 ? 0 : n - (n % 1);
  return i < 1 ? 1 : i;
}

export function urlFor(cardId, prompt, version) {
  const body = slug(prompt) || FALLBACK_SLUG;
  const id = slug(cardId) || "card";
  return CDN_DIR + "card-" + body + "-" + id + "v" + versionNumber(version) + ".png";
}

module.exports = {
  PROMPT_CAP: PROMPT_CAP,
  SLUG_CAP: SLUG_CAP,
  STYLE_TAIL: STYLE_TAIL,
  CDN_DIR: CDN_DIR,
  STATUS_MOOD: STATUS_MOOD,
  slug: slug,
  withStyle: withStyle,
  promptFromCard: promptFromCard,
  promptFor: promptFor,
  urlFor: urlFor,
  nextVersion: nextVersion,
};
