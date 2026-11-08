// js — READ-ONLY window onto the Asset Library mod's shelf, so search can find a thing on it and a card can point at one. no merging, just support — never a write, never a require("mods/…"), never a table of ours mirroring the shelf. js): hidden strikes shipped rows by id OR path; local rows overlay seated rows by the same keys and are never hideable. getScript and parse the value out: require() would bind us to the mod loading at all, and a missing mod must be a quiet empty shelf, never a throw. A loader names its shards in literal require() calls; we read the same list (shardFiles) and parse each shard's array — the mod's own parseCatalogFiles / parseLocalFiles, mirrored.

const MOD_ID = "asset-library";
const LIB = "mods/asset-library/lib/";
const CATALOG = LIB + "catalog.js";
const LOCAL = LIB + "local.js";
const SHARD_RE = /require\("lib\/((?:catalog|local)-\d+\.js)"\)/g;

let cacheSources = [];
let cacheRows = null;

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

export function num(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

// A SET row's member, in the mod's own MEMBER shape (its lib/store.js normalizeMembers): what to spawn (props), and where it sat relative to the set's anchor (off). Behaviors and state are the mod's business — a set piece on a cinematic set is a photograph, so they are not carried.
export function normalizeMember(m) {
  if (!m || typeof m !== "object") return null;
  const props = m.props && typeof m.props === "object" ? m.props : {};
  if (!props.model && !props.primitive && !props.sprite && !props.text && !props.light) return null;
  const off = m.off && typeof m.off === "object" ? m.off : {};
  return {
    name: text(m.name) || "piece",
    path: text(m.path),
    props: props,
    tags: Array.isArray(m.tags) ? m.tags.map(text).filter(Boolean) : [],
    off: { x: num(off.x), y: num(off.y), z: num(off.z) },
  };
}

// One row, in OUR column order — both files' rows pass through here, so the two halves of the shelf are indistinguishable to every caller. A `set` row also carries its members and span (the by-kind read a Body's #[asset: …] needs to stand a set up).
export function normalizeRow(r) {
  if (!r || typeof r !== "object") return null;
  const id = text(r.id);
  const path = text(r.path);
  if (!id && !path) return null;
  const row = {
    id: id,
    name: text(r.name) || id,
    path: path,
    kind: text(r.kind) || "model",
    tags: Array.isArray(r.tags) ? r.tags.map(text).filter(Boolean) : [],
    clips: Array.isArray(r.clips) ? r.clips.map(text).filter(Boolean) : [],
    note: text(r.note),
    thumb: text(r.thumb),
  };
  if (row.kind === "set") {
    const members = [];
    const raw = Array.isArray(r.members) ? r.members : [];
    for (let i = 0; i < raw.length; i++) {
      const m = normalizeMember(raw[i]);
      if (m) members.push(m);
    }
    row.members = members;
    row.span = r.span && typeof r.span === "object" ? { w: num(r.span.w), h: num(r.span.h), d: num(r.span.d) } : null;
  }
  return row;
}

// The row array written in one source — a shard, or the whole-file layout's body.
export function rowsIn(src) {
  const s = text(src);
  const open = s.indexOf("[");
  const close = s.lastIndexOf("]");
  if (open < 0 || close <= open) return [];
  let parsed = null;
  try {
    parsed = JSON.parse(s.slice(open, close + 1));
  } catch (e) {
    return [];
  }
  return Array.isArray(parsed) ? parsed : [];
}

// The shard files a loader names, in the order it names them — [] for the one-file layout.
export function shardFiles(loaderSrc) {
  const out = [];
  const re = new RegExp(SHARD_RE.source, "g");
  let m;
  while ((m = re.exec(text(loaderSrc))) !== null) out.push(m[1]);
  return out;
}

// Loader text + its shards' texts → the raw row arrays, concatenated in shard order.
export function rawRows(loaderSrc, shardSrcs) {
  if (!shardSrcs.length) return rowsIn(loaderSrc);
  let out = [];
  for (let i = 0; i < shardSrcs.length; i++) out = out.concat(rowsIn(shardSrcs[i]));
  return out;
}

export function parseRows(loaderSrc, shardSrcs) {
  const raw = rawRows(loaderSrc, shardSrcs || []);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const row = normalizeRow(raw[i]);
    if (row) out.push(row);
  }
  return out;
}

// local.js exports an OBJECT — { rows: [...], hidden: [...] } — not a bare array. In the sharded
// layout the rows ride the shards and the loader keeps `hidden: [...]` as a literal.
export function parseLocal(loaderSrc, shardSrcs) {
  const s = text(loaderSrc);
  const shards = shardSrcs || [];
  let raw = [];
  let hidden = [];
  if (!shards.length) {
    const open = s.indexOf("{");
    const close = s.lastIndexOf("}");
    if (open < 0 || close <= open) return { rows: [], hidden: [] };
    let parsed = null;
    try {
      parsed = JSON.parse(s.slice(open, close + 1));
    } catch (e) {
      return { rows: [], hidden: [] };
    }
    raw = parsed && Array.isArray(parsed.rows) ? parsed.rows : [];
    hidden = parsed && Array.isArray(parsed.hidden) ? parsed.hidden : [];
  } else {
    raw = rawRows(s, shards);
    const hid = /hidden"?\s*:\s*(\[[^\]]*\])/.exec(s);
    if (hid) {
      try {
        const parsed = JSON.parse(hid[1]);
        if (Array.isArray(parsed)) hidden = parsed;
      } catch (e) {
        hidden = [];
      }
    }
  }
  const rows = [];
  for (let i = 0; i < raw.length; i++) {
    const row = normalizeRow(raw[i]);
    if (row) rows.push(row);
  }
  return { rows: rows, hidden: hidden.map(text).filter(Boolean) };
}

// The mod's mergeShelf, mirrored: shipped minus hidden (id or path), local overlaid by id or path.
export function merge(shipped, local) {
  const hidden = {};
  for (let i = 0; i < local.hidden.length; i++) hidden[local.hidden[i]] = true;
  const out = [];
  const seat = {};
  function take(row, hideable) {
    if (hideable && ((row.id && hidden[row.id]) || (row.path && hidden[row.path]))) return;
    let at = -1;
    if (row.id && seat["i:" + row.id] !== undefined) at = seat["i:" + row.id];
    else if (row.path && seat["p:" + row.path] !== undefined) at = seat["p:" + row.path];
    if (at < 0) {
      at = out.length;
      out.push(row);
    } else {
      out[at] = row;
    }
    if (row.id) seat["i:" + row.id] = at;
    if (row.path) seat["p:" + row.path] = at;
  }
  for (let i = 0; i < shipped.length; i++) take(shipped[i], true);
  for (let i = 0; i < local.rows.length; i++) take(local.rows[i], false);
  return out;
}

export function scriptText(objectApi, path) {
  try {
    return text(objectApi && objectApi.getScript ? objectApi.getScript(path) : "");
  } catch (e) {
    return "";
  }
}

// A loader plus every shard it names, as texts. A shard slot that isn't written yet reads "".
export function sources(objectApi, loaderPath) {
  const loader = scriptText(objectApi, loaderPath);
  const files = shardFiles(loader);
  const shards = [];
  for (let i = 0; i < files.length; i++) shards.push(scriptText(objectApi, LIB + files[i]));
  return { loader: loader, shards: shards };
}

export function keyOf(src) {
  return src.length + ":" + src.slice(0, 400);
}

// [] for all the absences: no mod, no shelf written yet, text that will not parse.
export function rows(objectApi) {
  if (!installed(objectApi)) {
    cacheSources = [];
    cacheRows = null;
    return [];
  }
  const cat = sources(objectApi, CATALOG);
  const loc = sources(objectApi, LOCAL);
  if (!cat.loader && !loc.loader) return [];
  const current = [cat.loader, loc.loader, ...cat.shards, ...loc.shards];
  if (cacheRows && current.length === cacheSources.length && current.every((src, i) => src === cacheSources[i])) return cacheRows.slice();
  cacheRows = merge(parseRows(cat.loader, cat.shards), parseLocal(loc.loader, loc.shards));
  cacheSources = current;
  return cacheRows.slice();
}

export function slug(v) {
  return text(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function search(objectApi, query, limit) {
  const q = text(query).trim().toLowerCase();
  const cap = limit > 0 ? limit : 40;
  const all = rows(objectApi);
  if (!q) return all.slice(0, cap);
  const hits = [];
  for (let i = 0; i < all.length && hits.length < cap; i++) {
    const r = all[i];
    const name = r.name.toLowerCase();
    let why = "";
    let rank = 9;
    if (name === q) {
      why = "name";
      rank = 0;
    } else if (name.indexOf(q) >= 0) {
      why = "name";
      rank = 1;
    } else if (r.tags.join(" ").toLowerCase().indexOf(q) >= 0) {
      why = "tag";
      rank = 2;
    } else if (r.kind.toLowerCase() === q) {
      why = "kind";
      rank = 3;
    } else if (r.note.toLowerCase().indexOf(q) >= 0) {
      why = "note";
      rank = 4;
    } else if (r.path.toLowerCase().indexOf(q) >= 0) {
      why = "file";
      rank = 5;
    }
    if (why) hits.push({ row: r, why: why, rank: rank });
  }
  hits.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.row.name.localeCompare(b.row.name);
  });
  const out = [];
  for (let i = 0; i < hits.length; i++) {
    const r = hits[i].row;
    out.push({
      id: r.id,
      name: r.name,
      path: r.path,
      kind: r.kind,
      tags: r.tags,
      clips: r.clips,
      note: r.note,
      thumb: r.thumb,
      why: hits[i].why,
    });
  }
  return out;
}

// ── THE LADDER (jace, 2026-09-01: "if an asset cannot be found in the asset library, the asset tag should also search the game's own assets"). clip) and in its scripts' string literals, synthesized into rows path a literal /cdn/ path written in the tag resolves as itself A rung matches by id, by name, by slug, and by the FILE's stem title ("model-town-square-stone- fountain" reads as "Town Square Stone Fountain"), so a thing can be named the way its file is.

const CDN_RE = /\/cdn\/[A-Za-z0-9_\-./%]+(?:\?[A-Za-z0-9_\-=&,.%+]*)?/g;
const PROJECT = LIB + "project.js";

export function basePath(p) {
  return text(p).split("?")[0];
}

export function extOf(p) {
  const clean = basePath(p);
  const dot = clean.lastIndexOf(".");
  return dot < 0 ? "" : clean.slice(dot).toLowerCase();
}

export function kindOf(p) {
  const raw = text(p);
  const ext = extOf(raw);
  if (ext === ".glb" || ext === ".gltf") return /[?&]animations=/.test(raw) ? "animation" : "model";
  if (ext === ".mp3" || ext === ".wav" || ext === ".ogg") return "sound";
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp" || ext === ".mp4" || ext === ".webm") return "image";
  return "model";
}

export function clipsOf(p) {
  const m = /[?&]animations=([^&#]*)/i.exec(text(p));
  if (!m) return [];
  return decodeURIComponent(m[1]).split(",").map((c) => c.trim()).filter(Boolean);
}

// "model-town-square-stone-fountain.glb" -> "Town Square Stone Fountain"
export function stemTitle(p) {
  const file = basePath(p).split("/").pop() || "";
  const stem = file.replace(/\.[a-z0-9]+(\.glb|\.gltf)?$/i, "").replace(/\.[a-z0-9]+$/i, "");
  return stem
    .replace(/^(model|sprite|sfx|music|voice|portrait|texture|image|prop|card)-/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function synthRow(path, source) {
  const p = text(path).trim();
  return { id: "", name: stemTitle(p), path: p, kind: kindOf(p), tags: [], clips: clipsOf(p), note: "", thumb: "", source: source };
}

export function withSource(row, source) {
  const out = {};
  for (const k in row) if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k];
  out.source = source;
  return out;
}

// One rung: the first row answering to the token, by id, name, slug, or file-stem title.
export function pick(list, want) {
  const wl = want.toLowerCase();
  const ws = slug(want);
  let bySlug = null;
  let byStem = null;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r.id && r.id === want) return r;
    if (r.name.toLowerCase() === wl) return r;
    if (!bySlug && ((r.id && slug(r.id) === ws) || slug(r.name) === ws)) bySlug = r;
    if (!byStem && r.path && slug(stemTitle(r.path)) === ws) byStem = r;
  }
  return bySlug || byStem;
}

export function projectRows(objectApi) {
  const raw = rowsIn(scriptText(objectApi, PROJECT));
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const row = normalizeRow(raw[i]);
    if (row) out.push(row);
  }
  return out;
}

let gameKey = "";
let gameRows = null;

// Every /cdn/ path this game wears — spec objects first, then its scripts' literals. The asset-library shard files are the shelf itself (rung one) and are skipped here. Cached on the script list plus the object count, so a shoot press pays the scan once.
export function gameAssetRows(objectApi, refresh = false) {
  let scripts = [];
  try {
    scripts = (objectApi.listScripts && objectApi.listScripts()) || [];
  } catch (e) {
    scripts = [];
  }
  let places = null;
  try {
    places = objectApi.getSpec ? objectApi.getSpec("places") : null;
  } catch (e) {
    places = null;
  }
  const seen = {};
  const paths = [];
  function take(p) {
    const s = text(p).trim();
    if (s.indexOf("/cdn/") !== 0 && s.indexOf("cdn/") !== 0) return;
    const norm = s.indexOf("/") === 0 ? s : "/" + s;
    if (seen[norm]) return;
    seen[norm] = true;
    paths.push(norm);
  }
  let objCount = 0;
  if (places && typeof places === "object") {
    for (const pk in places) {
      const objs = (places[pk] && places[pk].objects) || {};
      for (const id in objs) {
        objCount++;
        const pr = (objs[id] && (objs[id].properties || objs[id])) || {};
        take(typeof pr.model === "string" ? pr.model : pr.model && pr.model.id);
        take(pr.material && pr.material.texture);
        take(pr.audio && pr.audio.clip);
        take(pr.sprite && pr.sprite.texture);
      }
    }
  }
  const key = scripts.join("|") + "#" + objCount;
  if (!refresh && key === gameKey && gameRows) {
    // objects may have changed under the same script list; the object paths are re-read above,
    // the script scan is what the cache saves.
    const merged = gameRows.slice();
    for (let i = 0; i < paths.length; i++) merged.unshift(synthRow(paths[i], "game"));
    return merged;
  }
  const fromScripts = [];
  for (let i = 0; i < scripts.length; i++) {
    const p = text(scripts[i]);
    if (p.indexOf("mods/asset-library/lib/") >= 0) continue;
    const src = scriptText(objectApi, p);
    const re = new RegExp(CDN_RE.source, "g");
    let m;
    while ((m = re.exec(src)) !== null) {
      const s = m[0].replace(/[.,]+$/, "");
      if (!seen[s]) {
        seen[s] = true;
        fromScripts.push(synthRow(s, "game"));
      }
    }
  }
  gameKey = key;
  gameRows = fromScripts;
  const out = [];
  for (let i = 0; i < paths.length; i++) out.push(synthRow(paths[i], "game"));
  return out.concat(fromScripts);
}

export function resolve(objectApi, token) {
  const want = text(token).trim();
  if (!want) return null;
  const shelf = pick(rows(objectApi), want);
  if (shelf) return withSource(shelf, "shelf");
  const proj = pick(projectRows(objectApi), want);
  if (proj) return withSource(proj, "project");
  const game = pick(gameAssetRows(objectApi), want);
  if (game) return game;
  if (/^\/?cdn\//i.test(want)) return synthRow(want.indexOf("/") === 0 ? want : "/" + want, "path");
  return null;
}

module.exports = {
  MOD_ID: MOD_ID,
  CATALOG: CATALOG,
  LOCAL: LOCAL,
  installed: installed,
  gameAssetRows: gameAssetRows,
  rows: rows,
  search: search,
  resolve: resolve,
  slug: slug,
};
