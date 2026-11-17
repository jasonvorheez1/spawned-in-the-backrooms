// Asset Library — the materials half. Two jobs, both pure enough to exercise
// from a run_script: read this game for every surface texture it is wearing
// (so the shelf never goes stale), and dress a real thing in one of them.
//
// A material is not a picture of something — it IS the surface. So its card
// picture is the texture file itself, and a card can be dropped onto a wall.

// The path shape a texture wears in this engine. Deliberately loose: a script
// writes it as a bare string, the spec as a material field, and both spellings
// (with or without the leading slash) mean the same file.
const TEX_SOURCE = "(\\/?cdn\\/[A-Za-z0-9_.\\/-]+\\.(?:png|jpg|jpeg|webp))";

// The generated registries are the shelf's own bookkeeping — every path in
// them is already ON the shelf, so reading them as SOURCES would make the scan
// congratulate itself for finding what it wrote last time.
const SKIP_SOURCE_RE = /(^|\/)lib\/(catalog|local|effects|shots|crates|project)\.js$/;

// One file, one canonical spelling: no query, no fragment, leading slash.
export function canon(path) {
  const clean = String(path || "").split("?")[0].split("#")[0].trim();
  if (!clean) return "";
  return clean.charAt(0) === "/" ? clean : "/" + clean;
}

// …and one comparison key, so "/cdn/x.png" and "cdn/x.png" can never both land
// on the shelf as two rows for one file.
export function normKey(path) {
  return canon(path).replace(/^\//, "").toLowerCase();
}

export function fileOf(path) {
  return canon(path).split("/").pop() || "";
}

// What counts as a MATERIAL. A portrait, a card thumbnail, an img-<hash>.png
// somebody pasted in — those are pictures OF things. A material is named for
// what it is made of, and this game names them texture-… / tex-….
export function isMaterialPath(path) {
  const clean = canon(path);
  if (!clean) return false;
  if (/\.png\.glb$/i.test(clean)) return false;
  // A file on the CDN, and an image. A scripted texture
  // (material.texture: "scripts/tex-slate.js") is a PROGRAM that paints a
  // surface — it has no picture to put on a card and belongs to its game.
  if (!/^\/cdn\//i.test(clean)) return false;
  if (!/\.(?:png|jpg|jpeg|webp)$/i.test(clean)) return false;
  return /^(texture|tex)-/i.test(fileOf(clean));
}

// ---- reading the game ----------------------------------------------------

export function scanScripts(api) {
  const out = [];
  let scripts = [];
  try {
    scripts = api.listScripts() || [];
  } catch (e) {
    scripts = [];
  }
  for (const p of scripts) {
    if (SKIP_SOURCE_RE.test(p)) continue;
    let src = "";
    try {
      src = api.getScript(p) || "";
    } catch (e) {
      src = "";
    }
    if (!src) continue;
    const re = new RegExp(TEX_SOURCE, "g");
    const label = String(p).split("/").pop();
    let m;
    while ((m = re.exec(src))) {
      // The regex stops at ".png" inside "portrait-fox.png.glb" — that tail is
      // a MODEL derived from an image, never a surface.
      if (src.slice(re.lastIndex, re.lastIndex + 4).toLowerCase() === ".glb") continue;
      out.push({ path: m[1], where: label });
    }
  }
  return out;
}

export function scanObjects(list, where, out, depth) {
  if (!list || depth > 8) return;
  const rows = Array.isArray(list) ? list : Object.keys(list).map((k) => list[k]);
  for (const o of rows) {
    if (!o || typeof o !== "object") continue;
    const props = o || {};
    const label = where + "/" + String(o.id || "object").slice(0, 24);
    const mat = props.material && props.material.texture;
    if (mat) out.push({ path: mat, where: label });
    const sprite = props.sprite && props.sprite.texture;
    if (sprite) out.push({ path: sprite, where: label });
    if (o.children) scanObjects(o.children, where, out, depth + 1);
  }
}

export function scanSpec(api) {
  const out = [];
  let spec = null;
  try {
    spec = api.getSpec();
  } catch (e) {
    spec = null;
  }
  const places = (spec && spec.places) || {};
  for (const id of Object.keys(places)) {
    const place = places[id] || {};
    const mats = (place.terrain && place.terrain.materials) || [];
    for (const m of mats) {
      if (m && m.albedo) out.push({ path: m.albedo, where: id + " terrain" });
    }
    scanObjects(place.objects, id, out, 0);
  }
  return out;
}

// Every surface texture this game wears, deduplicated, each carrying the first
// place it was seen. The where line is what makes a scan readable afterwards.
export function collect(api) {
  const seen = {};
  const rows = [];
  for (const hit of scanScripts(api).concat(scanSpec(api))) {
    if (!isMaterialPath(hit.path)) continue;
    const key = normKey(hit.path);
    if (!key) continue;
    const row = seen[key];
    if (row) {
      if (row.where.length < 4 && row.where.indexOf(hit.where) < 0) row.where.push(hit.where);
      row.uses += 1;
      continue;
    }
    const made = { path: canon(hit.path), key, where: [hit.where], uses: 1 };
    seen[key] = made;
    rows.push(made);
  }
  rows.sort((a, b) => a.path.localeCompare(b.path));
  return rows;
}

// ---- turning a path into a shelf row -------------------------------------

export function slug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// The name is the file with its plumbing taken off: the texture- prefix that
// says what kind of file it is, the terrain- that says where it is used, and
// the -albedo tail that names which map of the set this one is.
export function materialName(path) {
  let stem = fileOf(path).replace(/\.[a-z0-9]+$/i, "");
  stem = stem.replace(/^texture-/i, "").replace(/^tex-/i, "");
  stem = stem.replace(/^terrain-/i, "");
  stem = stem.replace(/-albedo.*$/i, "");
  const words = stem.split(/[-_]+/).filter(Boolean);
  if (!words.length) return "Material";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").slice(0, 64);
}

// What the surface is made of, read off its own name — the same reading the
// shelf's intake does for models, kept short because a material only ever
// answers one question: what would I use this for?
const CATEGORY = [
  ["ground", ["sand", "grass", "dirt", "soil", "gravel", "ground", "terrain", "lawn", "sidewalk", "street", "asphalt", "road", "path", "mud", "snow", "cobble", "turf", "earth", "beach"]],
  ["stone", ["stone", "granite", "marble", "rock", "cobble", "slate", "gravel", "boulder", "flagstone", "basalt"]],
  ["brick", ["brick", "masonry"]],
  ["concrete", ["concrete", "asphalt", "cement", "pavement", "plaza", "sidewalk", "street", "tarmac"]],
  ["wood", ["wood", "timber", "oak", "plank", "board", "shingle", "bark", "log", "pine", "birch", "walnut"]],
  ["metal", ["metal", "steel", "iron", "brass", "copper", "bronze", "gunmetal", "rust", "chrome", "tin", "alloy"]],
  ["glass", ["glass", "window", "curtainwall"]],
  ["cloth", ["cloth", "canvas", "fabric", "linen", "wool", "cotton", "awning", "tarp", "banner", "silk", "leather"]],
  ["plaster", ["plaster", "stucco", "render", "wattle", "adobe"]],
  ["roof", ["roof", "thatch", "shingle", "tile"]],
  ["water", ["water", "ocean", "river", "lava", "ice"]],
  ["foliage", ["leaf", "leaves", "foliage", "moss", "ivy", "hedge"]],
];

// A word only counts where a word STARTS — "mainstreet" is not a street and
// "cobblestone" is cobble, which is stone anyway. Matching anywhere inside the
// name tags an awning as ground.
export function categoryTags(path) {
  const name = fileOf(path).toLowerCase();
  const out = [];
  for (const pair of CATEGORY) {
    for (const word of pair[1]) {
      const at = name.indexOf(word);
      if (at < 0) continue;
      const before = at === 0 ? "" : name.charAt(at - 1);
      if (at !== 0 && before !== "-" && before !== "_" && before !== ".") continue;
      if (out.indexOf(pair[0]) < 0) out.push(pair[0]);
      break;
    }
  }
  return out;
}

// A moodboard path carries its own style family — the namespace the whole look
// of a world lives under. A bare /cdn/ path belongs to no family and gets none.
export function familyTags(path) {
  const m = /\/cdn\/moodboard-([a-z0-9-]+)\//i.exec(canon(path));
  return m ? [m[1].toLowerCase()] : [];
}

export function makeRow(path, n, added, note) {
  const name = materialName(path);
  const clean = canon(path);
  return {
    id: "image-mat-" + (slug(name) || "material") + "-" + n,
    name,
    path: clean,
    kind: "image",
    tags: ["material", "surface"].concat(categoryTags(clean)).concat(familyTags(clean)),
    clips: [],
    note: String(note || "In use in this game.").slice(0, 240),
    // A material's picture IS the file. Nothing to photograph, nothing to miss.
    thumb: clean,
    added: Number(added) || 0,
  };
}

// The shelf as a lookup: every path already on it, by comparison key, so a
// rescan can only ever bring home what is genuinely new.
export function knownPaths(rowLists) {
  const known = {};
  for (const list of rowLists || []) {
    for (const row of list || []) {
      if (row && row.path) known[normKey(row.path)] = true;
    }
  }
  return known;
}

// Where the next row's numbers start: the id tail and the added counter both
// continue the run already in the file rather than restarting it.
export function nextSeeds(rowLists) {
  let id = 9099;
  let added = 0;
  for (const list of rowLists || []) {
    for (const row of list || []) {
      if (!row) continue;
      const m = /^image-mat-.*-(\d+)$/.exec(String(row.id || ""));
      if (m) id = Math.max(id, Number(m[1]) || 0);
      added = Math.max(added, Number(row.added) || 0);
    }
  }
  return { id: id + 1, added: added + 1 };
}

// The whole reading, in one call: what is in use, what of it is new, and the
// rows those new ones should become. Writing them down is the caller's job.
export function scan(api, rowLists) {
  const found = collect(api);
  const known = knownPaths(rowLists);
  const seeds = nextSeeds(rowLists);
  const rows = [];
  const fresh = [];
  let n = seeds.id;
  let added = seeds.added;
  for (const hit of found) {
    if (known[hit.key]) continue;
    known[hit.key] = true;
    rows.push(makeRow(hit.path, n, added));
    fresh.push(hit);
    n += 1;
    added += 1;
  }
  return { found, rows, fresh, scanned: found.length };
}

// ---- dressing a thing ----------------------------------------------------

// Almost everything in this game is an assembly — a root with the real meshes
// hanging off it — so painting the thing under the cursor means painting its
// direct children too, or the wall changes nothing and the creator is right to
// say it did not work.
export function paintTargets(api, ids) {
  const out = [];
  const seen = {};
  const add = (id) => {
    const key = String(id || "");
    if (!key || seen[key]) return;
    seen[key] = true;
    out.push(key);
  };
  for (const raw of ids || []) {
    if (!raw) continue;
    add(raw);
    let kids = [];
    try {
      kids = (api.getObjectChildren && api.getObjectChildren(raw)) || [];
    } catch (e) {
      kids = [];
    }
    for (const k of kids) add(k);
  }
  return out;
}

// A scripted material is a program, not a picture. It answers to two names:
// the authored spec says kind: "scripted", and the live view of the same
// surface comes back as key: "Scripted" with the script ref beside it. Reading
// only one of them paints straight over the other.
export function isScriptedMaterial(mat) {
  if (!mat || typeof mat !== "object") return false;
  if (String(mat.kind || "").toLowerCase() === "scripted") return true;
  if (String(mat.key || "").toLowerCase() === "scripted") return true;
  return !!mat.script;
}

// The surface a thing is really wearing: the authored one where there is one,
// and the live one otherwise.
export function materialOf(api, id) {
  let spec = null;
  try {
    spec = api.getObjectSpec ? api.getObjectSpec(id) : null;
  } catch (e) {
    spec = null;
  }
  const authored = spec ? spec.material : null;
  let view = null;
  try {
    view = api.getObject(id);
  } catch (e) {
    view = null;
  }
  const live = view ? view.material : null;
  return { authored, live, exists: !!(view || spec) };
}

// …skipped and named, never clobbered.
export function paintMaterial(api, ids, path, opts) {
  const clean = canon(path);
  const targets = paintTargets(api, ids);
  const painted = [];
  const scripted = [];
  const missing = [];
  if (!clean) return { painted, scripted, missing, targets };
  const work = () => {
    for (const id of targets) {
      const mat = materialOf(api, id);
      if (!mat.exists) {
        missing.push(id);
        continue;
      }
      if (isScriptedMaterial(mat.authored) || isScriptedMaterial(mat.live)) {
        scripted.push(id);
        continue;
      }
      try {
        // A dot-path write, so the colour, roughness and everything else the
        // surface already carries stays exactly where it was.
        api.setObjectProperty(id, "material.texture", clean);
        painted.push(id);
      } catch (e) {
        missing.push(id);
      }
    }
  };
  if (opts && opts.persist === false) work();
  else if (typeof api.withPersistence === "function") api.withPersistence(work);
  else work();
  return { painted, scripted, missing, targets };
}

module.exports = {
  TEX_SOURCE,
  canon,
  normKey,
  isMaterialPath,
  collect,
  materialName,
  categoryTags,
  familyTags,
  makeRow,
  knownPaths,
  nextSeeds,
  scan,
  paintTargets,
  paintMaterial,
  isScriptedMaterial,
  materialOf,
};
