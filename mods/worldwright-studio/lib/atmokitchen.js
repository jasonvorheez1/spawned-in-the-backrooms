// json. The mod ships nothing at runtime, so its absence silences only the OFFERING — tagged moods still paint, search and export. free text is first class — resolve() answers null for anything that is not a preset, and null is a legitimate mood, never a failure.

const DATA = require("lib/data/atmo-presets.yml");

const MOD_ID = "atmosphere-kitchen";

export function text(v) {
  return v === undefined || v === null ? "" : String(v);
}

export function installed(objectApi) {
  try {
    const mods = objectApi && objectApi.getSpec ? objectApi.getSpec("mods") : null;
    if (!mods || typeof mods !== "object") return "";
    return text(mods[MOD_ID]);
  } catch (e) {
    return "";
  }
}

export function shape(list) {
  const rows = Array.isArray(list) ? list : [];
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || typeof r !== "object") continue;
    const id = text(r.id);
    if (!id) continue;
    out.push({ id: id, name: text(r.name) || id, mood: text(r.mood) });
  }
  return out;
}

export function presets() {
  return shape(DATA && DATA.presets);
}

export function transitions() {
  return shape(DATA && DATA.transitions);
}

export function slug(v) {
  return text(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolve(token) {
  const want = text(token).trim();
  if (!want) return null;
  const wl = want.toLowerCase();
  const ws = slug(want);
  const all = presets().concat(transitions());
  let bySlug = null;
  for (let i = 0; i < all.length; i++) {
    const r = all[i];
    if (r.id === want) return r;
    if (r.name.toLowerCase() === wl) return r;
    if (!bySlug && (slug(r.id) === ws || slug(r.name) === ws)) bySlug = r;
  }
  return bySlug;
}

// The words a preset answers to: its id and its name, split on anything that is not a letter or a
// digit, lowercased. "moonlit-night" / "Moonlit Night" -> moonlit, night.
export function wordsOf(v) {
  return text(v).toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; });
}

// THE NEAREST PRESET for free text (jace: "moonlit" is a mood, and the page's #[atmo: moonlit] IS the setting). Transitions never answer here: they are cycles, not a still light to paint.
export function nearest(freeText) {
  const words = wordsOf(freeText);
  if (!words.length) return null;
  const rows = presets();
  let hit = null;
  let hits = 0;
  for (let i = 0; i < rows.length; i++) {
    const own = wordsOf(rows[i].id).concat(wordsOf(rows[i].name));
    let match = false;
    for (let w = 0; w < words.length && !match; w++) {
      for (let k = 0; k < own.length && !match; k++) {
        if (own[k] === words[w] || (words[w].length >= 4 && own[k].indexOf(words[w]) === 0)) match = true;
      }
    }
    if (match) {
      hits++;
      hit = rows[i];
    }
  }
  if (hits !== 1) return null;
  return { id: hit.id, name: hit.name, mood: hit.mood, source: "nearest" };
}

// resolve() then nearest(): the one answer the shoot lane wants for a token's inner. source is "preset" (an id or name, exact), "nearest" (one preset shares a word), or "free" (id null, the author's own words are the mood). Never null: free text is first class.
export function place(token) {
  const want = text(token).trim();
  const exact = resolve(want);
  if (exact) return { id: exact.id, name: exact.name, source: "preset" };
  const near = nearest(want);
  if (near) return { id: near.id, name: near.name, source: "nearest" };
  return { id: null, name: want, source: "free" };
}

export function rawPreset(id) {
  const rows = Array.isArray(DATA && DATA.presets) ? DATA.presets : [];
  const want = text(id);
  for (let i = 0; i < rows.length; i++) if (rows[i] && text(rows[i].id) === want) return rows[i];
  return null;
}

// The preset's AtmosphereDef patch, a fresh copy each call (a caller may edit it). null for a
// transition, an unknown id, or a preset the data file left without values.
export function values(id) {
  const row = rawPreset(id);
  if (!row || !row.atmosphere || typeof row.atmosphere !== "object") return null;
  return JSON.parse(JSON.stringify(row.atmosphere));
}

// How long the shoot lane tweens a preset's numeric leaves in. 2 unless the row says otherwise.
export function blendSeconds(id) {
  const row = rawPreset(id);
  const n = row ? Number(row.blendSeconds) : NaN;
  return isFinite(n) && n >= 0 ? n : 2;
}

export function label(atmo) {
  const want = text(atmo).trim();
  if (!want) return "";
  const row = resolve(want);
  return row ? row.name : want;
}

export function moodOf(atmo) {
  const row = resolve(atmo);
  return row ? row.mood : "";
}

module.exports = {
  MOD_ID: MOD_ID,
  installed: installed,
  presets: presets,
  transitions: transitions,
  resolve: resolve,
  nearest: nearest,
  place: place,
  values: values,
  blendSeconds: blendSeconds,
  label: label,
  moodOf: moodOf,
  slug: slug,
};
