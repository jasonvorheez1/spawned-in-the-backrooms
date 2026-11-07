// TuneDB Tune — every tuned number a game keeps in scripts/lib/data/**/*.yml
// becomes a knob. Reads plain YAML line by line (no rewrite of the file), so
// comments, order and layout survive an edit: a change replaces one value on
// one line. Arrays, block text and inline {…}/[…] are shown read-only.
//
// A comment on the line tunes the knob (any hand can write it — Savi, you):
//   walkSpeed: 6        # 1..20 step 0.5  How fast the player walks (m/s)
//   jumpSpeed: 10       # 4..30 ジャンプの強さ
// A full-line comment right above a key is its hint too. A "## Title" comment
// line starts a section. The file's first comment lines describe the file.
export const TUNE_DIR = "scripts/lib/data/";
export const SKIP = ["scripts/lib/data/db/"];

export function isTuneFile(p) {
  return p.startsWith(TUNE_DIR) && /\.ya?ml$/.test(p) && !SKIP.some((s) => p.startsWith(s));
}

const NUM = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
const KEY = /^(\s*)((?:"[^"]*")|(?:'[^']*')|[^\s:#][^:#]*?)\s*:(?:\s+(.*?))?\s*$/;

// value text and its trailing comment, respecting quotes
function splitComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
  }
  return [s.trim(), ""];
}

function scalar(v) {
  if (v === "") return { type: "section" };
  if (/^[\[{|>&*!]/.test(v)) return { type: "raw", value: v };
  if (NUM.test(v)) return { type: "number", value: parseFloat(v), int: /^[-+]?\d+$/.test(v) };
  if (/^(true|false|yes|no|on|off)$/i.test(v)) return { type: "bool", value: /^(true|yes|on)$/i.test(v) };
  if (/^(null|~)$/.test(v)) return { type: "raw", value: v };
  if (/^".*"$/.test(v)) { let s; try { s = JSON.parse(v); } catch (e) { s = v.slice(1, -1); } return { type: "text", value: s, quote: '"' }; }
  if (/^'.*'$/.test(v)) return { type: "text", value: v.slice(1, -1).replace(/''/g, "'"), quote: "'" };
  return { type: "text", value: v, quote: "" };
}

function meta(comment) {
  const o = {}; let c = comment || "";
  const r = c.match(/(-?\d*\.?\d+)\s*\.\.\s*(-?\d*\.?\d+)/);
  if (r) { o.min = parseFloat(r[1]); o.max = parseFloat(r[2]); c = c.replace(r[0], ""); }
  const st = c.match(/\bstep\s+(\d*\.?\d+)/i);
  if (st) { o.step = parseFloat(st[1]); c = c.replace(st[0], ""); }
  c = c.replace(/^[\s—–:-]+|[\s—–:-]+$/g, "").trim();
  if (c) o.hint = c;
  return o;
}

// A file whose first line says "# tune: off" stays out of the tab.
export function tuneOff(text) { return /^#\s*tune:\s*off/i.test(String(text || "").trimStart()); }

export function parseTune(text, path) {
  const lines = String(text || "").split("\n");
  const knobs = []; const desc = []; let head = true;
  const stack = []; // { indent, key }
  let pendingHint = ""; let section = ""; let blockIndent = -1; let listUnder = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ind = line.match(/^\s*/)[0].length;
    const t = line.trim();
    if (blockIndent >= 0) { if (t === "" || ind > blockIndent) continue; blockIndent = -1; }
    if (t === "" ) { pendingHint = ""; head = false; continue; }
    if (t.startsWith("#")) {
      const c = t.replace(/^#+\s?/, "");
      if (/^##\s/.test(t)) { section = c.replace(/^#+\s*/, ""); pendingHint = ""; continue; }
      if (head) desc.push(c); else pendingHint = c;
      continue;
    }
    head = false;
    if (t.startsWith("- ") || t === "-") { continue; } // list items: read-only via parent
    const m = line.match(KEY);
    if (!m) { pendingHint = ""; continue; }
    while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();
    const key = m[2].replace(/^["']|["']$/g, "");
    const [vtext, comment] = splitComment(m[3] || "");
    const sc = scalar(vtext);
    const p = stack.map((s) => s.key).concat(key);
    if (sc.type === "section") {
      // a map, or a block list under it
      const next = lines.slice(i + 1).find((l) => l.trim() && !l.trim().startsWith("#"));
      if (next && next.trim().startsWith("-")) knobs.push({ path: p, key, depth: stack.length, type: "raw", value: "[list]", line: i, section, hint: meta(comment).hint || pendingHint || undefined });
      else knobs.push({ path: p, key, depth: stack.length, type: "group", line: i, section, hint: meta(comment).hint || pendingHint || undefined });
      stack.push({ indent: ind, key });
    } else {
      if (/^[|>]/.test(vtext)) blockIndent = ind;
      const k = Object.assign({ path: p, key, depth: stack.length, line: i, section }, sc, meta(comment));
      if (!k.hint && pendingHint) k.hint = pendingHint;
      knobs.push(k);
    }
    pendingHint = "";
  }
  for (const k of knobs) if (k.type === "number") guessRange(k);
  return { file: path, desc: desc.join(" ").trim(), knobs };
}

function guessRange(k) {
  const v = k.value;
  if (k.step !== undefined && k.step % 1) k.int = false;
  if (k.min === undefined || k.max === undefined) {
    k.guessed = true;
    const a = Math.abs(v);
    if (a === 0) { k.min = k.min ?? 0; k.max = k.max ?? (k.int ? 10 : 1); }
    else if (v > 0 && v <= 1 && !k.int) { k.min = k.min ?? 0; k.max = k.max ?? 1; }
    else { const top = niceUp(a * 3); k.min = k.min ?? (v < 0 ? -top : 0); k.max = k.max ?? (v < 0 ? 0 : top); }
  }
  if (k.step === undefined) {
    const span = Math.abs(k.max - k.min) || 1;
    k.step = k.int ? Math.max(1, Math.round(span / 200)) : niceStep(span / 200);
  }
}
function niceUp(x) { const e = Math.pow(10, Math.floor(Math.log10(x))); for (const m of [1, 2, 2.5, 5, 10]) if (m * e >= x) return m * e; return 10 * e; }
function niceStep(x) { const e = Math.pow(10, Math.floor(Math.log10(x))); for (const m of [1, 2, 5, 10]) if (m * e >= x) return m * e; return 10 * e; }

function fmt(k, v) {
  if (k.type === "number") { const n = typeof v === "number" ? v : parseFloat(v); if (!isFinite(n)) return null; const r = k.int ? Math.round(n) : Math.round(n * 1e6) / 1e6; return String(r); }
  if (k.type === "bool") { const on = v === true || v === "true"; const orig = String(k.raw || ""); if (/^(yes|no)$/i.test(orig)) return on ? "yes" : "no"; if (/^(on|off)$/i.test(orig)) return on ? "on" : "off"; return on ? "true" : "false"; }
  if (k.type === "text") {
    const s = String(v == null ? "" : v).replace(/\n/g, " ");
    if (k.quote === "'") return "'" + s.replace(/'/g, "''") + "'";
    if (k.quote === '"' || s === "" || /[:#\[\]{},&*!|>'"%@`]|^\s|\s$|^(true|false|yes|no|on|off|null|~)$/i.test(s) || NUM.test(s)) return JSON.stringify(s);
    return s;
  }
  return null;
}

// Set the knob at `path` (array of keys) to value. Returns { text } or { error }.
export function setTune(text, file, path, value) {
  const doc = parseTune(text, file);
  const k = doc.knobs.find((x) => x.path.join(".") === path.join("."));
  if (!k) return { error: "no-knob" };
  if (!["number", "bool", "text"].includes(k.type)) return { error: "read-only" };
  const lines = String(text).split("\n");
  const line = lines[k.line];
  const m = line.match(KEY);
  const [vtext, comment] = splitComment(m[3] || "");
  k.raw = vtext;
  const out = fmt(k, value);
  if (out === null) return { error: "bad-value" };
  const at = line.indexOf(":", m[1].length + m[2].length) + 1;
  const pre = line.slice(0, at);
  let tail = "";
  if (comment) { const idx = line.indexOf(vtext, at) + vtext.length; tail = line.slice(idx); }
  lines[k.line] = pre + " " + out + tail;
  return { text: lines.join("\n"), knob: k, value: out };
}

// Write every guessed slider range into the file as a real comment, so the
// range is visible and editable: "speed: 6" → "speed: 6  # 0..20 step 0.1".
// An existing hint stays after the range. Returns { text, count }.
export function addRanges(text, file) {
  const doc = parseTune(text, file);
  const lines = String(text).split("\n");
  let count = 0;
  for (const k of doc.knobs) {
    if (k.type !== "number" || !k.guessed) continue;
    const line = lines[k.line]; const m = line.match(KEY); if (!m) continue;
    const [vtext, comment] = splitComment(m[3] || "");
    const hasStep = /\bstep\s+\d/i.test(comment);
    const range = k.min + ".." + k.max + (hasStep ? "" : " step " + k.step);
    const at = line.indexOf(":", m[1].length + m[2].length) + 1;
    const vEnd = line.indexOf(vtext, at) + vtext.length;
    lines[k.line] = line.slice(0, vEnd) + "  # " + range + (comment ? " " + comment : "");
    count++;
  }
  return { text: lines.join("\n"), count };
}
export function guessedCount(doc) { return (doc && doc.knobs || []).filter((k) => k.type === "number" && k.guessed).length; }
