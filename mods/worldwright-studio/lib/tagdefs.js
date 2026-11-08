// tagdefs — custom in-line macro tags: #[HOUSE] renders as whatever the author said HOUSE means. A project's whole tag presentation rides in ONE reserved row named '#STYLE' (a compact JSON map) rather than four columns a player seat could never ALTER in.

const IDS = require("lib/ids.js");
const REFS = require("lib/refs.js");
const STORE = require("lib/store.js");
const SCHEMA = require("lib/schema.js");
const PROJECTS = require("lib/projects.js");

const BUILTIN = ["COUNT", "TOTAL", "DATETIME"];
const NAME_MAX = 48;
const VALUE_MAX = 500;
const NOTE_MAX = 240;

const STYLE_ROW = "#STYLE";
const STYLE_MAX = 16000;
const DISPLAYS = ["chip", "inline"];
const SHOWS = ["insert", "quiet"];
const PALETTE = Object.keys(REFS.TAG_COLORS);

const ID_SHAPE_REASON =
  "that is the shape of a card id — a tag by that name would shadow every reference to it";

export function str(s) {
  return String(s === null || s === undefined ? "" : s);
}

export function canonical(name) {
  return str(name).trim().toUpperCase();
}

// One idempotent schema pass per seat, latched — the same shape lib/cards.js keeps.
let PROJECT_READY = false;

export async function ensure(api) {
  if (PROJECT_READY) return;
  await SCHEMA.ensureProject(api);
  PROJECT_READY = true;
}

// Same clock refs.js uses: the database's, because the sandbox has none.
export async function nowMs(api) {
  const res = await STORE.tagdefs.now(api);
  const row = res && res.rows ? res.rows[0] : null;
  return Number((row && row.ms) || 0);
}

// The settings screen runs these same tests inline as the writer types; this is the copy that binds.
export function shapeReason(name) {
  const n = canonical(name);
  if (!n) return "a tag needs a name";
  if (n.charAt(0) === "#")
    return "a tag name cannot start with # — that is the token's own mark, and this file keeps that prefix for its own rows";
  if (n.length > NAME_MAX) return "a tag name is at most " + NAME_MAX + " characters";
  if (n.indexOf("[") !== -1 || n.indexOf("]") !== -1)
    return "a tag name cannot contain [ or ] — the token grammar owns those";
  if (n.indexOf(":") !== -1 || n.indexOf(";") !== -1)
    return "a tag name cannot contain : or ; — those separate the parts of a token";
  if (/[\r\n\t]/.test(n)) return "a tag name has to fit on one line";
  if (BUILTIN.indexOf(n) !== -1) return n + " is a built-in tag — pick another name";
  if (IDS.isValidId(n) || IDS.isValidId(n.toLowerCase())) return ID_SHAPE_REASON;
  return "";
}

// Only the id-shaped refusal costs a query, and only to name the card in the sentence.
export async function refuse(api, projectId, name) {
  const n = canonical(name);
  const shape = shapeReason(n);
  if (shape !== ID_SHAPE_REASON) return shape;
  const pid = str(projectId);
  const low = n.toLowerCase();
  const res = await STORE.tagdefs.cardNamed(api, pid, n, low);
  const row = res && res.rows ? res.rows[0] : null;
  if (row) {
    return 'that is the id of the card "' + str(row.name) + '" — a tag by that name would shadow every reference to it';
  }
  return shape;
}

export function checkValue(value) {
  const v = str(value);
  if (v.length > VALUE_MAX) return "a value is at most " + VALUE_MAX + " characters";
  return "";
}

export function checkNote(note) {
  if (str(note).length > NOTE_MAX) return "a note is at most " + NOTE_MAX + " characters";
  return "";
}

export function rowOf(r) {
  return {
    name: str(r.name),
    value: str(r.value),
    note: str(r.note),
    createdAt: Number(r.createdAt) || 0,
    updatedAt: Number(r.updatedAt) || 0,
    // the governing three, filled in from the style row by loadAll()
    color: "",
    display: "chip",
    shows: "insert",
  };
}

// A default is stored as absence, so the map holds only what an author changed.
export function parseStyles(value) {
  const raw = str(value).trim();
  if (!raw) return {};
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  const out = {};
  for (const key of Object.keys(parsed)) {
    const v = parsed[key] || {};
    if (typeof v !== "object") continue;
    out[canonical(key)] = {
      c: str(v.c),
      d: DISPLAYS.indexOf(str(v.d)) === -1 ? "" : str(v.d),
      s: SHOWS.indexOf(str(v.s)) === -1 ? "" : str(v.s),
    };
  }
  return out;
}

// ONE read per project: definitions and the reserved style row are one SELECT.
export async function loadAll(api, projectId) {
  const pid = str(projectId);
  if (!pid) return { defs: [], styles: {} };
  await ensure(api);
  const res = await STORE.tagdefs.all(api, pid);
  const rows = (res && res.rows) || [];
  let styles = {};
  const defs = [];
  for (const r of rows) {
    const name = canonical(r.name);
    if (name.charAt(0) === "#") {
      if (name === STYLE_ROW) styles = parseStyles(r.value);
      continue; // ours, never an author's — never listed, never resolved
    }
    defs.push(rowOf(r));
  }
  for (const d of defs) {
    const s = styles[d.name] || {};
    if (s.c) d.color = s.c;
    if (s.d) d.display = s.d;
    if (s.s) d.shows = s.s;
  }
  return { defs: defs, styles: styles };
}

export async function list(api, projectId) {
  const bundle = await loadAll(api, projectId);
  return bundle.defs;
}

export async function get(api, projectId, name) {
  const n = canonical(name);
  if (!n) return null;
  const bundle = await loadAll(api, projectId);
  for (const d of bundle.defs) if (d.name === n) return d;
  return null;
}

// Goes straight into refs.resolve()'s opts.customTags.
export async function map(api, projectId) {
  const defs = await list(api, projectId);
  const out = {};
  for (const d of defs) {
    out[d.name] = { value: d.value, note: d.note, color: d.color, display: d.display, shows: d.shows };
  }
  return out;
}

// The Insert ▸ Tag popup's rows, in lib/ui-page.js's TAG_ITEMS shape; shows:"quiet" is left out.
export async function insertItems(api, projectId) {
  const defs = await list(api, projectId);
  return defs
    .filter(function (d) {
      return d.shows !== "quiet";
    })
    .map(function (d) {
      return {
        label: d.name,
        hint: d.note || "your definition — renders as its value",
        insert: "#[" + d.name + "]",
        example: "#[" + d.name + "] → " + (d.value || "…"),
        color: d.color,
        display: d.display,
      };
    });
}


export function colorReason(color) {
  const c = str(color).trim().toLowerCase();
  if (!c) return "";
  if (PALETTE.indexOf(c) !== -1) return "";
  const n = Number(c);
  if (isFinite(n) && n >= 0 && n <= 360) return "";
  return "pick a colour from the palette (" + PALETTE.join(", ") + ") or a hue from 0 to 360";
}

export async function writeStyles(api, projectId, styles) {
  const pid = str(projectId);
  const json = JSON.stringify(styles);
  if (json.length > STYLE_MAX)
    throw new Error("that is more tag styling than one project can hold — clear a few first");
  await ensure(api);
  const ms = await nowMs(api);
  await STORE.tagdefs.styleSet(api, pid, STYLE_ROW, json, ms);
  return true;
}

export async function setStyle(api, projectId, name, patch) {
  const pid = str(projectId);
  const n = canonical(name);
  if (!pid || !n) throw new Error("tagdefs.setStyle: a project and a name are required");
  const p = patch || {};
  const bundle = await loadAll(api, pid);
  let known = false;
  for (const d of bundle.defs) if (d.name === n) known = true;
  if (!known) throw new Error(n + " is not defined here");

  const styles = Object.assign({}, bundle.styles);
  const cur = Object.assign({}, styles[n] || {});
  if (Object.prototype.hasOwnProperty.call(p, "color")) {
    const bad = colorReason(p.color);
    if (bad) throw new Error(bad);
    cur.c = str(p.color).trim().toLowerCase();
  }
  if (Object.prototype.hasOwnProperty.call(p, "display")) {
    const d = str(p.display).trim().toLowerCase();
    if (DISPLAYS.indexOf(d) === -1) throw new Error("a tag shows as a chip or inline, nothing else");
    cur.d = d;
  }
  if (Object.prototype.hasOwnProperty.call(p, "shows")) {
    const s = str(p.shows).trim().toLowerCase();
    if (SHOWS.indexOf(s) === -1)
      throw new Error("a tag is offered in the insert lists or kept quiet, nothing else");
    cur.s = s;
  }
  if (!cur.c) delete cur.c;
  if (cur.d === "chip") delete cur.d;
  if (cur.s === "insert") delete cur.s;
  if (Object.keys(cur).length) styles[n] = cur;
  else delete styles[n];
  await writeStyles(api, pid, styles);
  return { name: n, color: cur.c || "", display: cur.d || "chip", shows: cur.s || "insert" };
}

export async function define(api, projectId, name, value, note) {
  const pid = str(projectId);
  if (!pid) throw new Error("a project has to be open before a tag can be defined");
  const n = canonical(name);
  const bad = (await refuse(api, pid, n)) || checkValue(value) || checkNote(note);
  if (bad) throw new Error(bad);
  await ensure(api);
  const ms = await nowMs(api);
  await STORE.tagdefs.upsert(api, pid, n, str(value), str(note), ms);
  return { name: n, value: str(value), note: str(note), createdAt: ms, updatedAt: ms };
}

// Two fixed statements, never a runtime column name — that would be assembled SQL.
export async function update(api, projectId, name, field, value) {
  const pid = str(projectId);
  const n = canonical(name);
  if (!pid || !n) throw new Error("tagdefs.update: a project and a name are required");
  const f = str(field);
  const bad = f === "note" ? checkNote(value) : checkValue(value);
  if (bad) throw new Error(bad);
  await ensure(api);
  const ms = await nowMs(api);
  if (f === "note") {
    await STORE.tagdefs.setNote(api, pid, n, str(value), ms);
  } else {
    await STORE.tagdefs.setValue(api, pid, n, str(value), ms);
  }
  return true;
}

export async function remove(api, projectId, name) {
  const pid = str(projectId);
  const n = canonical(name);
  if (!pid || !n) return false;
  await ensure(api);
  await STORE.tagdefs.remove(api, pid, n);
  // No foreign keys: a style left behind would re-attach itself to a tag defined under that name later.
  const bundle = await loadAll(api, pid);
  if (bundle.styles[n]) {
    const styles = Object.assign({}, bundle.styles);
    delete styles[n];
    await writeStyles(api, pid, styles);
  }
  return true;
}

// The name IS half the primary key, so a rename is an insert (carrying the old createdAt) plus a delete. Content is never rewritten — only CARD renames are content-safe.
export async function rename(api, projectId, from, to) {
  const pid = str(projectId);
  const a = canonical(from);
  const b = canonical(to);
  if (!pid) throw new Error("a project has to be open");
  if (!a) throw new Error("nothing to rename");
  if (a === b) return true;
  const bad = await refuse(api, pid, b);
  if (bad) throw new Error(bad);
  const src = await get(api, pid, a);
  if (!src) throw new Error(a + " is not defined here");
  const clash = await get(api, pid, b);
  if (clash) throw new Error(b + " is already defined — remove it first");
  const ms = await nowMs(api);
  await STORE.tagdefs.insert(api, pid, b, src.value, src.note, src.createdAt, ms);
  await STORE.tagdefs.remove(api, pid, a);
  // The look follows the name. Same hand-written cascade as the row itself.
  const bundle = await loadAll(api, pid);
  if (bundle.styles[a]) {
    const styles = Object.assign({}, bundle.styles);
    styles[b] = styles[a];
    delete styles[a];
    await writeStyles(api, pid, styles);
  }
  return true;
}

// One project, always, and it is the game — his ruling 2026-08-25: "No project, no book".
export function currentProjectId(api) {
  return PROJECTS.PROJECT_ID;
}

export function publish(api, result) {
  if (!api || typeof api.patchState !== "function") return;
  const st = api.getState() || {};
  const ui = Object.assign({}, st.ui || {});
  ui.config = Object.assign({}, ui.config || {}, {
    tags: {
      projectId: result.projectId,
      defs: result.defs,
      error: result.error,
      draft: result.draft,
      loaded: true,
      // The vocabulary the screen draws its controls from, so no list is hardcoded twice.

      palette: PALETTE,
      displays: DISPLAYS,
      shows: SHOWS,
    },
  });
  api.patchState({ ui: ui });
}

export async function handleAction(api, action, payload) {
  const p = payload || {};
  const op = str(p.op) || "load";
  const pid = str(p.projectId) || currentProjectId(api);
  const out = { ok: true, op: op, projectId: pid, defs: [], error: "", draft: null };

  try {
    if (op === "add") {
      const n = canonical(p.name);
      const already = await get(api, pid, n);
      if (already) throw new Error(n + " is already defined — edit its row instead");
      await define(api, pid, n, p.value, p.note);
    } else if (op === "set") {
      await update(api, pid, p.name, p.field, p.value);
    } else if (op === "rename") {
      await rename(api, pid, p.name, p.to);
    } else if (op === "remove") {
      await remove(api, pid, p.name);
    } else if (op === "style") {
      const patch = {};
      if (Object.prototype.hasOwnProperty.call(p, "color")) patch.color = p.color;
      if (Object.prototype.hasOwnProperty.call(p, "display")) patch.display = p.display;
      if (Object.prototype.hasOwnProperty.call(p, "shows")) patch.shows = p.shows;
      await setStyle(api, pid, p.name, patch);
    } else if (op === "check") {
      out.draft = { name: canonical(p.name), value: str(p.value), reason: await refuse(api, pid, p.name) };
    }
    // "load" needs nothing but the read below.
  } catch (e) {
    out.ok = false;
    out.error = (e && e.message) || String(e);
    // Hand the typing back so a refusal never eats what they wrote.

    out.draft = { name: canonical(p.name), value: str(p.value), note: str(p.note), reason: out.error };
    if (api && typeof api.log === "function") api.log("[tagdefs] " + out.error);
  }

  out.defs = await list(api, pid);
  publish(api, out);
  return out;
}

module.exports = {
  // the store
  list,
  get,
  define,
  update,
  rename,
  remove,
  map,
  // what a definition governs
  setStyle,
  colorReason,
  insertItems,
  PALETTE,
  DISPLAYS,
  SHOWS,
  STYLE_ROW,
  // the screen
  handleAction,
  // shared vocabulary — ui-settings.js renders the same three built-ins refs.js resolves
  BUILTIN,
  canonical,
  shapeReason,
  refuse,
  NAME_MAX,
  VALUE_MAX,
  NOTE_MAX,
};
