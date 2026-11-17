// Asset Library — shared, pure helpers. Required by both the panel (UI realm)
// and god.js (world realm), so nothing in here may touch objectApi or the DOM.

const KINDS = ["model", "image", "sound", "animation", "set", "effect", "motion"];

const KIND_META = {
  model: { label: "Models", icon: "🧊", ext: ".glb" },
  image: { label: "Images", icon: "🖼️", ext: ".png" },
  sound: { label: "Sounds", icon: "🔊", ext: ".mp3" },
  animation: { label: "Animations", icon: "🏃", ext: ".glb" },
  set: { label: "Sets", icon: "🏛️", ext: "" },
  effect: { label: "Effects", icon: "✨", ext: "" },
  motion: { label: "Motions", icon: "🎞️", ext: "" },
};

// A set is a bundle of placed things that keep their arrangement — a whole
// castle with its furniture and its people, lifted out of one scene and set
// down in another. It has no file behind it: the members ARE the asset, so a
// set travels in the catalog itself and in a crate, and needs no CDN fetch.
const MEMBER_PROPS = ["model", "primitive", "material", "scale", "rotation", "sprite", "text", "light", "physics", "attachment", "visible"];

export function setPath(name) {
  return "set:" + (slug(name) || "unnamed");
}

// An effect is the other asset with no file behind it: fire, sparks, a shaft of
// lamplight, a patch of moving water. What it IS lives in `props` — the object
// properties god.js spawns — so a card can carry an fx program, a light, a
// water surface, or all three, and place them as one thing.
const EFFECT_PROPS = ["fx", "light", "audio", "primitive", "material", "rotation", "scale", "physics", "visibleTo", "castShadow", "visibleRange"];

export function fxPath(name) {
  return "fx:" + (slug(name) || "unnamed");
}

// A motion is the third asset with no file behind it, and the only one with no
// row in the catalog either: the authored clips ARE the library, so a motion
// card is generated from lib/motions.js every time the panel renders. What a
// row carries is the registry key, the group it reads under, and how long one
// cycle runs — everything the shelf needs to filter, search and count it like
// anything else, and everything the drop needs to put it on a body.
export function motionPath(key) {
  return "motion:" + (slug(key) || "unnamed");
}

export function motionKeyOf(asset) {
  if (!asset) return "";
  if (asset.key) return String(asset.key);
  const p = String(asset.path || "");
  return p.indexOf("motion:") === 0 ? p.slice(7) : "";
}

// A registry card (motions.cards()) as a shelf row.
export function motionAsset(card, thumb) {
  const c = card || {};
  return makeAsset({
    kind: "motion",
    key: c.key,
    name: c.label || c.key,
    group: c.group,
    groupLabel: c.groupLabel,
    icon: c.icon,
    loop: c.loop,
    seconds: c.seconds,
    tags: c.tags,
    thumb: thumb || "",
  });
}

export function normalizeEffectProps(props) {
  const out = {};
  const src = props && typeof props === "object" ? props : {};
  for (const k of EFFECT_PROPS) if (src[k] !== undefined && src[k] !== null) out[k] = src[k];
  return out;
}

export function num(v, dflt) {
  const n = Number(v);
  return isFinite(n) ? n : dflt || 0;
}

// A piece's scripts, as a list. Old rows saved one behavior as a bare string;
// both shapes read the same way here so a shelf written last week still places.
export function normalizeBehaviors(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const out = [];
  for (const b of raw) {
    const s = String(b || "").trim();
    if (s && out.indexOf(s) < 0) out.push(s);
  }
  return out;
}

// ---- finding a saved script again ------------------------------------------
// A behavior captured in the workshop reads scripts/asset-library/idle.js; the
// same file in an installed mod reads mods/asset-library/idle.js, and a set
// shared to another game may find it under neither. Match by the tails a file
// is really known by — "ai/wander.js" pins a brain to its folder, then the mod
// name pins a loose file to its mod — and answer "" when this game hasn't got
// it, because a missing script is the honest signal that a mod isn't installed.
export function resolveScript(all, want) {
  const path = String(want || "");
  if (!path) return "";
  const list = all || [];
  if (list.indexOf(path) >= 0) return path;
  const parts = path.split("/");
  const file = parts.pop();
  const pair = parts.length ? parts[parts.length - 1] + "/" + file : file;
  const folder = parts.length > 1 ? parts[parts.length - 2] : parts[0] || "";
  const ends = (p, tail) => p === tail || p.slice(-(tail.length + 1)) === "/" + tail;
  return (
    list.find((p) => ends(p, pair)) ||
    (folder && list.find((p) => p.split("/").pop() === file && p.indexOf(folder) >= 0)) ||
    list.find((p) => p.split("/").pop() === file) ||
    ""
  );
}

// A whole script stack, resolved: what this game can run, and what it can't.
export function resolveScripts(all, wanted) {
  const kept = [];
  const missing = [];
  for (const want of normalizeBehaviors(wanted)) {
    const hit = resolveScript(all, want);
    if (hit) {
      if (kept.indexOf(hit) < 0) kept.push(hit);
    } else missing.push(want);
  }
  return { kept, missing };
}

// One member = one thing that stood in the scene: what to spawn, how it looked,
// and where it sat relative to the set's anchor (ground centre of the bundle).
export function normalizeMembers(members) {
  const out = [];
  for (const m of members || []) {
    if (!m) continue;
    const props = {};
    const src = m.props || {};
    for (const k of MEMBER_PROPS) if (src[k] !== undefined && src[k] !== null) props[k] = src[k];
    if (!props.model && !props.primitive && !props.sprite && !props.text && !props.light) continue;
    const row = {
      name: String(m.name || "piece").slice(0, 64),
      path: String(m.path || ""),
      props,
      // Everything the piece was wearing, in the order it wore it — a captured
      // villager is idle.js plus whatever brain and plate were dropped on it,
      // and all three have to come back down together or it lands asleep.
      behaviors: normalizeBehaviors(m.behaviors !== undefined ? m.behaviors : m.behavior),
      state: m.state && typeof m.state === "object" ? m.state : null,
      tags: normalizeTags(m.tags),
      off: { x: num(m.off && m.off.x), y: num(m.off && m.off.y), z: num(m.off && m.off.z) },
    };
    // A member may be an assembly (a price card is a body plus its sign child):
    // the child specs ride the member as authored and spawn with it.
    if (Array.isArray(m.children) && m.children.length) row.children = m.children;
    out.push(row);
  }
  return out;
}

// A set stored by reference (plan 08): the members live in an unrequired data
// file inside the mod folder and the row carries only the pointer. Kept as
// authored when it has a file; anything else is not a reference.
export function normalizeRef(ref) {
  if (!ref || typeof ref !== "object" || !ref.file) return undefined;
  const out = { file: String(ref.file), key: String(ref.key || "") };
  if (ref.url) out.url = String(ref.url);
  if (Array.isArray(ref.gens)) out.gens = ref.gens.map((g) => String(g)).filter(Boolean);
  return out;
}

export function setSpan(members) {
  let w = 0;
  let h = 0;
  let d = 0;
  for (const m of members || []) {
    w = Math.max(w, Math.abs(m.off.x) * 2);
    h = Math.max(h, Math.abs(m.off.y) + 1);
    d = Math.max(d, Math.abs(m.off.z) * 2);
  }
  return { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10, d: Math.round(d * 10) / 10 };
}

export function extOf(path) {
  const clean = String(path || "").split("?")[0];
  const dot = clean.lastIndexOf(".");
  return dot < 0 ? "" : clean.slice(dot).toLowerCase();
}

// An asset's kind is readable straight off its path. Animations are models that
// declare clips, so the ?animations= query is the tell.
export function kindFromPath(path) {
  const raw = String(path || "");
  if (raw.indexOf("set:") === 0) return "set";
  if (raw.indexOf("fx:") === 0) return "effect";
  if (raw.indexOf("motion:") === 0) return "motion";
  const ext = extOf(raw);
  if (ext === ".glb" || ext === ".gltf") {
    return /[?&]animations=/.test(raw) ? "animation" : "model";
  }
  if (ext === ".mp3" || ext === ".wav" || ext === ".ogg") return "sound";
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") return "image";
  if (ext === ".mp4" || ext === ".webm") return "image";
  return "model";
}

export function clipsFromPath(path) {
  const m = /[?&]animations=([^&]+)/.exec(String(path || ""));
  if (!m) return [];
  return decodeURIComponent(m[1])
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function basePath(path) {
  return String(path || "").split("?")[0];
}

export function slug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function prettyName(path) {
  const file = basePath(path).split("/").pop() || "asset";
  const stem = file.replace(/\.[a-z0-9]+$/i, "");
  return stem
    .replace(/^(model|sprite|sfx|music|voice|portrait|texture|image)-/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeTags(tags) {
  const out = [];
  for (const t of tags || []) {
    const s = slug(t);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

// Every entry that lands in the catalog goes through here — one shape, always.
export function makeAsset(input) {
  const path = String(input.path || "").trim();
  const kind = KINDS.includes(input.kind) ? input.kind : kindFromPath(path);
  const clips = input.clips && input.clips.length ? normalizeClips(input.clips) : clipsFromPath(path);
  // autoTag is set by intake only — never by a re-serialize — so a tag the
  // creator pulled off a card stays off.
  const tags = input.autoTag ? (input.tags || []).concat(autoTags(input)) : input.tags;
  if (kind === "set") {
    const members = normalizeMembers(input.members);
    const row = {
      id: input.id || `set-${slug(input.name) || "unnamed"}-${idTail(path + members.length)}`,
      name: String(input.name || "Untitled Set").slice(0, 64),
      path: path || setPath(input.name),
      kind: "set",
      tags: normalizeTags(tags),
      clips: [],
      note: String(input.note || "").slice(0, 240),
      thumb: String(input.thumb || ""),
      added: Number(input.added) || 0,
      members,
      span: input.span && input.span.w !== undefined ? input.span : setSpan(members),
    };
    // Sets by reference (plan 08): the pointer to the payload file, and the
    // member count the card shows while the members themselves stay in the file.
    const ref = normalizeRef(input.ref);
    if (ref) row.ref = ref;
    const count = Number(input.count);
    if (isFinite(count) && count > 0) row.count = Math.round(count);
    else if (members.length) row.count = members.length;
    if (Array.isArray(input.children) && input.children.length) row.children = input.children;
    return row;
  }
  if (kind === "motion") {
    const key = String(input.key || (path.indexOf("motion:") === 0 ? path.slice(7) : "")).trim();
    return {
      id: input.id || `motion-${slug(key) || "unnamed"}`,
      name: String(input.name || input.label || prettyName(key)).slice(0, 64),
      path: path || motionPath(key),
      kind: "motion",
      tags: normalizeTags(tags),
      clips: [],
      note: String(input.note || "").slice(0, 240),
      thumb: String(input.thumb || ""),
      added: Number(input.added) || 0,
      key,
      group: String(input.group || ""),
      groupLabel: String(input.groupLabel || ""),
      icon: String(input.icon || ""),
      loop: input.loop === "once" ? "once" : "loop",
      seconds: Number(input.seconds) || 2,
    };
  }
  if (kind === "effect") {
    const row = {
      id: input.id || `effect-${slug(input.name) || "unnamed"}-${idTail(path)}`,
      name: String(input.name || prettyName(path)).slice(0, 64),
      path: path || fxPath(input.name),
      kind: "effect",
      tags: normalizeTags(tags),
      clips: [],
      note: String(input.note || "").slice(0, 240),
      thumb: String(input.thumb || ""),
      added: Number(input.added) || 0,
      props: normalizeEffectProps(input.props),
    };
    // A geometry row may be an assembly (price card body + sign child).
    if (Array.isArray(input.children) && input.children.length) row.children = input.children;
    return row;
  }
  return {
    id: input.id || `${kind}-${slug(input.name || prettyName(path)) || "asset"}-${idTail(path)}`,
    name: String(input.name || prettyName(path)).slice(0, 64),
    path,
    kind: clips.length && kind === "model" ? "animation" : kind,
    tags: normalizeTags(tags),
    clips,
    note: String(input.note || "").slice(0, 240),
    thumb: String(input.thumb || ""),
    added: Number(input.added) || 0,
  };
}

// ---- the reader ----------------------------------------------------------
// An asset's own name and path already say most of what it is, so intake reads
// them and shelves the thing pre-labelled: what world it belongs to, what it's
// made of, what it is, and who it is. Every group is additive and every tag
// stays hand-editable afterwards — this is a first pass, not a verdict.

const VOCAB = {
  theme: {
    pirate: ["pirate", "buccaneer", "galleon", "corsair", "cutlass", "treasure", "kraken", "shipwreck", "jolly-roger", "schooner"],
    space: ["space", "spaceship", "starship", "astronaut", "planet", "asteroid", "orbital", "nebula", "satellite", "rocket", "lunar", "moon-base"],
    scifi: ["scifi", "sci-fi", "futuristic", "neon", "laser", "plasma", "hologram", "android", "mech", "cyber"],
    cyberpunk: ["cyberpunk", "neon-city", "chrome", "netrunner"],
    city: ["city", "urban", "street", "sidewalk", "skyscraper", "downtown", "traffic", "streetlight", "subway", "hydrant", "manhole", "bus-stop", "storefront"],
    medieval: ["medieval", "castle", "keep", "portcullis", "battlement", "tavern", "blacksmith", "peasant", "knight", "catapult", "drawbridge"],
    fantasy: ["fantasy", "wizard", "mage", "spell", "rune", "enchanted", "fairy", "magic", "potion", "grimoire"],
    western: ["western", "saloon", "cowboy", "revolver", "cactus", "wagon", "sheriff", "wanted-poster"],
    horror: ["horror", "haunted", "cursed", "gore", "coffin", "crypt", "tombstone", "gravestone", "eerie", "spooky"],
    nature: ["tree", "forest", "pine", "oak", "bush", "shrub", "flower", "fern", "grass", "leaf", "moss", "log", "boulder", "mushroom", "meadow"],
    desert: ["desert", "dune", "sandstone", "oasis", "mesa"],
    winter: ["snow", "winter", "ice", "icicle", "frozen", "frost", "glacier", "igloo"],
    ocean: ["ocean", "sea", "beach", "coral", "reef", "wave", "seaweed", "buoy", "harbor", "harbour", "dock", "pier"],
    farm: ["farm", "barn", "silo", "tractor", "haystack", "hay", "crop", "wheat", "scarecrow", "chicken-coop", "fence-post"],
    industrial: ["factory", "industrial", "warehouse", "pipe", "girder", "crane", "generator", "conveyor", "refinery", "scaffold"],
    military: ["military", "army", "soldier", "tank", "bunker", "sandbag", "ammo", "barracks", "camo", "turret", "trench"],
    ruins: ["ruin", "ruins", "rubble", "broken", "abandoned", "derelict", "overgrown", "collapsed"],
    temple: ["temple", "shrine", "monastery", "altar", "pagoda", "chapel", "cathedral", "church", "monument", "obelisk"],
    tropical: ["tropical", "jungle", "palm", "bamboo", "vine", "tiki"],
    steampunk: ["steampunk", "clockwork", "brass-gear", "airship", "cog"],
    japanese: ["japanese", "torii", "sakura", "tatami", "samurai", "ninja", "koi", "zen"],
    egypt: ["egypt", "egyptian", "pyramid", "sphinx", "sarcophagus", "hieroglyph", "anubis"],
    viking: ["viking", "norse", "longship", "runestone", "valhalla"],
    cozy: ["cozy", "cottage", "hearth", "quilt", "teapot", "armchair", "lantern-warm"],
  },
  material: {
    wood: ["wood", "wooden", "plank", "timber", "log", "oak", "pine-board", "bark", "crate", "barrel", "lumber"],
    stone: ["stone", "rock", "boulder", "cobble", "granite", "slate", "pebble", "gravel", "flagstone"],
    metal: ["metal", "steel", "iron", "copper", "bronze", "brass", "aluminium", "aluminum", "tin", "chrome", "girder"],
    rust: ["rust", "rusty", "rusted", "corroded"],
    brick: ["brick", "masonry"],
    concrete: ["concrete", "cement", "asphalt", "tarmac"],
    glass: ["glass", "window", "windowpane", "mirror", "crystal-pane"],
    fabric: ["fabric", "cloth", "linen", "canvas", "curtain", "banner", "flag", "tent", "sail", "carpet", "rug", "quilt", "wool"],
    leather: ["leather", "hide", "saddle"],
    rope: ["rope", "cord", "twine", "net"],
    thatch: ["thatch", "straw", "reed-roof"],
    marble: ["marble"],
    gold: ["gold", "golden", "gilded", "treasure", "coin"],
    crystal: ["crystal", "gem", "gemstone", "quartz", "amethyst", "diamond"],
    water: ["water", "river", "lake", "pond", "sea", "ocean", "wave", "puddle", "fountain", "waterfall", "rain"],
    lava: ["lava", "magma", "molten", "ember"],
    grass: ["grass", "turf", "lawn", "meadow"],
    dirt: ["dirt", "mud", "soil", "earth", "sand", "clay"],
    snow: ["snow", "ice", "frost"],
    paper: ["paper", "parchment", "scroll", "poster", "book", "map"],
    plastic: ["plastic", "vinyl", "rubber"],
    bone: ["bone", "skull", "skeleton", "rib"],
  },
  form: {
    humanoid: ["humanoid", "human", "person", "character", "villager", "knight", "soldier", "guard", "merchant", "farmer", "pirate", "wizard", "citizen", "npc", "man", "woman", "boy", "girl", "child", "king", "queen", "elf", "dwarf", "orc", "goblin", "zombie", "skeleton", "android", "astronaut", "cowboy", "samurai", "ninja", "monk"],
    creature: ["creature", "beast", "monster", "animal", "dragon", "wolf", "bear", "deer", "horse", "cow", "sheep", "pig", "chicken", "cat", "dog", "fox", "rabbit", "bird", "crow", "fish", "shark", "spider", "bat", "rat", "slime", "golem", "troll", "kraken"],
    vehicle: ["vehicle", "car", "truck", "cart", "wagon", "boat", "ship", "raft", "plane", "airship", "tank", "bike", "bicycle", "motorcycle", "train", "kart", "rover", "submarine"],
    building: ["building", "house", "cottage", "hut", "cabin", "tower", "castle", "barn", "shop", "stall", "warehouse", "temple", "church", "wall", "roof", "door", "gate", "bridge", "stairs", "fence", "pillar", "column", "arch", "shed", "silo", "kiosk"],
    weapon: ["weapon", "sword", "axe", "spear", "bow", "arrow", "dagger", "hammer", "mace", "gun", "rifle", "pistol", "revolver", "cannon", "musket", "shield", "cutlass", "club"],
    furniture: ["furniture", "chair", "stool", "bench", "table", "desk", "bed", "shelf", "bookshelf", "cabinet", "wardrobe", "chest", "dresser", "sofa", "armchair"],
    container: ["crate", "barrel", "box", "chest", "sack", "basket", "bucket", "pot", "jar", "bin", "urn"],
    foliage: ["tree", "bush", "shrub", "plant", "flower", "fern", "vine", "palm", "cactus", "mushroom", "hedge", "sapling"],
    light: ["lamp", "lantern", "torch", "candle", "chandelier", "streetlight", "brazier", "campfire", "neon-sign", "sconce"],
    food: ["food", "bread", "apple", "meat", "fish-food", "cheese", "fruit", "vegetable", "stew", "bottle", "mug", "tankard", "ale"],
    clothing: ["clothing", "hat", "helmet", "cloak", "robe", "boots", "armor", "armour", "gloves", "mask", "cape"],
    terrain: ["terrain", "ground", "floor", "tile", "tileable", "seamless", "cliff", "hill", "path", "road"],
    prop: ["prop", "debris", "clutter", "sign", "signpost", "anvil", "barrel-stack", "wheel", "bucket", "tool"],
    ui: ["ui", "icon", "button", "cursor", "frame-art", "hud", "badge"],
    ambience: ["ambience", "ambient", "atmosphere", "loop", "wind", "birds", "crickets", "rain-loop", "hum", "drone"],
  },
  species: {
    undead: ["skeleton", "zombie", "ghoul", "lich", "mummy", "wraith", "ghost", "specter", "spectre"],
    robot: ["robot", "android", "droid", "mech", "automaton", "bot"],
    elf: ["elf", "elven"],
    dwarf: ["dwarf", "dwarven"],
    orc: ["orc", "orcish"],
    goblin: ["goblin", "gremlin"],
    alien: ["alien", "extraterrestrial", "xeno"],
    human: ["human", "villager", "person", "man", "woman", "boy", "girl", "citizen", "farmer", "merchant", "guard", "knight", "soldier", "cowboy", "pirate", "sailor", "monk", "king", "queen", "prince", "princess"],
    dragon: ["dragon", "wyvern", "drake"],
    cat: ["cat", "kitten", "feline", "lion", "tiger"],
    dog: ["dog", "puppy", "wolf", "hound", "canine"],
    horse: ["horse", "pony", "stallion", "mare"],
    bird: ["bird", "crow", "raven", "owl", "chicken", "duck", "seagull", "parrot"],
    fish: ["fish", "koi", "shark", "salmon", "trout"],
    insect: ["insect", "beetle", "spider", "bee", "ant", "moth"],
  },
  gender: {
    male: ["male", "man", "boy", "guy", "king", "prince", "father", "sir", "lord", "gentleman"],
    female: ["female", "woman", "girl", "lady", "queen", "princess", "mother", "witch", "nun", "maid"],
  },
  sound: {
    music: ["music", "theme", "song", "soundtrack", "anthem", "bgm"],
    sfx: ["sfx", "impact", "clang", "whoosh", "footstep", "swing", "click", "splash", "explosion", "creak"],
    voice: ["voice", "saying", "dialog", "dialogue", "line", "shout", "grunt"],
  },
};

// Every word the asset carries, dash-delimited and dash-padded, so a needle
// wrapped in dashes only ever matches a whole word: "-man-" never fires on
// "human" or "woman".
export function wordsOf(input) {
  const file = (basePath(input.path || "").split("/").pop() || "").replace(/\.[a-z0-9]+$/i, "");
  // Filename and name only. Clip names and creator prose ("Wave", "loops under
  // the trees") lied about theme and material every time they were let in.
  const pieces = (input.members || []).map((m) => m && m.name).filter(Boolean).slice(0, 40).join("-");
  return (
    "-" +
    [file, input.name || "", pieces]
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-"
  );
}

// Tags an asset earns from its own name — theme, material, what it is, who it
// is. Groups are capped so a single word can't bury the card in labels.
export function autoTags(input) {
  const hay = wordsOf(input);
  const kind = KINDS.includes(input.kind) ? input.kind : kindFromPath(input.path);
  const hit = (needles) => needles.some((n) => hay.indexOf("-" + n + "-") >= 0);
  const out = [];
  const take = (group, cap) => {
    let n = 0;
    for (const tag of Object.keys(group)) {
      if (n >= cap) break;
      if (hit(group[tag])) {
        if (!out.includes(tag)) out.push(tag);
        n++;
      }
    }
  };
  take(VOCAB.theme, 2);
  take(VOCAB.material, 2);
  take(VOCAB.form, 2);
  take(VOCAB.species, 1);
  take(VOCAB.gender, 1);
  if (kind === "sound") take(VOCAB.sound, 1);
  if (kind === "animation" && !out.includes("humanoid")) out.push("rigged");
  return normalizeTags(out);
}

// Tag search — the shelf can grow hundreds of labels, so the chip row is a
// result set, not a wall. A query matches anywhere in the tag.
export function searchTags(list, query, activeTags) {
  const q = slug(query || "");
  const all = tagCounts(list);
  const active = (activeTags || []).filter((t) => !q || t.indexOf(q) >= 0);
  const rest = all.filter((t) => (activeTags || []).indexOf(t.tag) < 0 && (!q ? false : t.tag.indexOf(q) >= 0));
  return {
    total: all.length,
    active: active.map((t) => ({ tag: t, count: (all.find((x) => x.tag === t) || {}).count || 0 })),
    hits: rest,
  };
}

// The style family a path already lives in, so a derived preview stays in the
// same world as the thing it depicts.
export function familyOf(path) {
  const m = /\/cdn\/moodboard-([a-z0-9-]+)\//i.exec(String(path || ""));
  return m ? m[1] : "";
}

// What a card shows — and it is always the asset itself, never a lookalike. An
// image IS its own preview. A model's picture is a shot of that exact model
// standing in this game (asset.thumb, taken by the shooter in the panel); with
// no shot yet the card shows its kind icon and says so. A painted companion in
// the family used to fill that gap and it was the wrong picture every time.
export function previewPath(asset) {
  if (!asset) return "";
  if (asset.thumb) return asset.thumb;
  if (asset.kind === "image") return asset.path;
  return "";
}

export function normalizeClips(clips) {
  const out = [];
  for (const c of clips || []) {
    const s = String(c || "").replace(/[^A-Za-z0-9_]/g, "");
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

export function idTail(path) {
  let h = 0;
  const s = String(path || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return String(h).padStart(4, "0").slice(-4);
}

export function haystack(asset) {
  const pieces = (asset.members || []).map((m) => m && m.name).filter(Boolean).slice(0, 60).join(" ");
  return [asset.name, asset.path, asset.note, (asset.tags || []).join(" "), (asset.clips || []).join(" "), asset.groupLabel || "", pieces]
    .join(" ")
    .toLowerCase();
}

// Search: every whitespace-separated word must appear somewhere. A `#tag` word
// only matches tags, so `#stone bridge` reads exactly how it looks.
export function matches(asset, query, kind, activeTags) {
  if (kind && kind !== "all" && asset.kind !== kind) return false;
  for (const t of activeTags || []) {
    if (!(asset.tags || []).includes(t)) return false;
  }
  const words = String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return true;
  const hay = haystack(asset);
  const tags = (asset.tags || []).join(" ");
  return words.every((w) => (w[0] === "#" ? tags.includes(w.slice(1)) : hay.includes(w)));
}

export function search(list, query, kind, activeTags) {
  return (list || []).filter((a) => matches(a, query, kind, activeTags));
}

// Tag cloud, most-used first — the shelf labels the library grew on its own.
export function tagCounts(list) {
  const counts = {};
  for (const a of list || []) for (const t of a.tags || []) counts[t] = (counts[t] || 0) + 1;
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
    .map((tag) => ({ tag, count: counts[tag] }));
}

export function kindCounts(list) {
  const counts = { all: (list || []).length };
  for (const k of KINDS) counts[k] = 0;
  for (const a of list || []) counts[a.kind] = (counts[a.kind] || 0) + 1;
  return counts;
}

// A conjure path, built from words. This is how a brand-new asset enters the
// library: name it, and the CDN mints it on first fetch.
export function conjurePath(opts) {
  const kind = KINDS.includes(opts.kind) ? opts.kind : "model";
  const family = slug(opts.family || "");
  const dir = family ? `/cdn/moodboard-${family}` : "/cdn";
  const name = slug(opts.name) || "unnamed";
  if (kind === "sound") {
    const prefix = opts.music ? "music" : "sfx";
    return `${dir}/${prefix}-${name}.mp3`;
  }
  if (kind === "image") {
    return `${dir}/${opts.sprite ? "sprite" : "texture"}-${name}.png`;
  }
  const clips = normalizeClips(opts.clips);
  const base = `${dir}/model-${name}.glb`;
  return clips.length ? `${base}?animations=${clips.join(",")}` : base;
}

const FAMILIES = [
  "lowpoly-cozy",
  "painterly-fantasy",
  "toon-vibrant",
  "voxel-bright",
  "realistic-gritty",
  "scifi-neon",
  "gothic-horror",
  "pixel-bright",
  "pixel-moody",
];

// ---- the travelling shelf, written as shards ------------------------------
// The catalog is stored as spec modules so it is versioned, shared with every
// collaborator, and readable from the sandboxed UI realm with a plain require.
//
// It was one module, once. Then the shelf grew: the authored-UI realm drops the
// whole Assets mount when any ONE module in the require closure passes
// 1,000,000 chars (REALM_SIZE_CAPS.source), and a workshop save writes every
// non-effect row in here — over 1.5M chars of them. So the rows ride numbered
// shards and lib/catalog.js became a loader that hand-lists them (require()
// takes no computed path) and concatenates them in order. Order is the
// contract: mergeShelf seats a row by id OR path, so the concatenation has to
// read exactly like the one file it replaced — and what comes back is still the
// plain array of rows every reader has always required.
const CATALOG_SHARDS = 8;
// Row budget per shard. Half the cap, so the shelf can keep growing between
// reshards without anyone having to think about it again.
const CATALOG_SHARD_CHARS = 500000;

export function catalogShardFile(n) {
  return "catalog-" + n + ".js";
}

// Rows packed into at most `slots` lists, in order, at `budgetChars` a slot. A
// row never splits, so one huge row (a set carrying hundreds of members) simply
// takes its own shard, and the last slot absorbs whatever is left rather than
// spilling. Both shelves pack with this — local's shards and the catalog's.
export function packRows(rows, slots, budgetChars) {
  const list = rows || [];
  const lens = list.map((r) => JSON.stringify(r).length + 6);
  let total = 0;
  for (const n of lens) total += n;
  // The packer counts rows only; each serialized shard also wears a header and
  // footer (~400 chars). Reserve that here, or a shard packed to the budget
  // reads as over it once written — which is exactly how localAppend refused
  // HYLLA's rows with five empty shards standing by (2026-09-02).
  const WRAPPER = 1200;
  const budget = Math.max(budgetChars - WRAPPER, Math.ceil(total / slots) + 1);
  const out = [];
  let cur = [];
  let chars = 0;
  for (let i = 0; i < list.length; i++) {
    if (cur.length && chars + lens[i] > budget && out.length < slots - 1) {
      out.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(list[i]);
    chars += lens[i];
  }
  if (cur.length || !out.length) out.push(cur);
  return out;
}

export function shardCatalogRows(rows) {
  return packRows(rows, CATALOG_SHARDS, CATALOG_SHARD_CHARS);
}

export function serializeCatalogShard(rows, n, count) {
  const body = (rows || []).map((a) => "  " + JSON.stringify(a)).join(",\n");
  return (
    "// Asset Library catalog — the travelling shelf, shard " +
    n +
    " of " +
    count +
    ". Generated;\n" +
    "// edited through the Assets tab. lib/catalog.js is the loader over every\n" +
    "// shard and the only module anyone requires — hand-editing a shard reorders\n" +
    "// the shelf, and order decides which row keeps its seat.\n" +
    "module.exports = [\n" +
    body +
    (body ? "\n" : "") +
    "];\n"
  );
}

export function serializeCatalogLoader() {
  const lines = [];
  for (let n = 1; n <= CATALOG_SHARDS; n++) {
    lines.push('try { add(require("lib/' + catalogShardFile(n) + '")); } catch (e) {}');
  }
  return (
    "// Asset Library catalog — generated. Edited through the Assets tab. This is\n" +
    "// the shelf that travels with the mod; a game's own rows ride lib/local.js\n" +
    "// and the two are merged on read.\n" +
    "//\n" +
    "// The rows live in lib/catalog-1.js onward: the UI realm drops a mount whose\n" +
    "// biggest module passes 1,000,000 chars, and this shelf outgrew that.\n" +
    "// require() takes no computed path, so the shards are listed by hand and a\n" +
    "// slot that isn't filled yet simply reads empty. What comes back is the same\n" +
    "// array of rows this file always exported.\n" +
    "const rows = [];\n" +
    "function add(part) {\n" +
    "  if (!part || !part.length) return;\n" +
    "  for (let i = 0; i < part.length; i++) rows.push(part[i]);\n" +
    "}\n" +
    lines.join("\n") +
    "\n" +
    "module.exports = rows;\n"
  );
}

// The whole travelling shelf as FILES — the loader plus one source per shard
// slot. Not a string any more: every writer lands all of them (god.js
// writeCatalog), so a caller that hands this straight to setScript is a caller
// that would have shipped an empty shelf.
export function serializeCatalog(list) {
  const rows = (list || []).map((a) => makeAsset(a));
  const parts = shardCatalogRows(rows);
  const shards = [];
  for (let n = 1; n <= CATALOG_SHARDS; n++) {
    const part = parts[n - 1] || [];
    shards.push({ file: catalogShardFile(n), rows: part.length, source: serializeCatalogShard(part, n, parts.length) });
  }
  return { loader: serializeCatalogLoader(), shards, rows: rows.length, used: parts.length };
}

// The other direction: loader source plus shard sources in shard order, back to
// the row array. Reads the one-file layout too, so a mod that hasn't saved since
// the shards landed still opens.
export function parseCatalogFiles(loaderSrc, shardSrcs) {
  const src = String(loaderSrc || "");
  if (src.indexOf('require("lib/catalog-') < 0) {
    const open = src.indexOf("[");
    const close = src.lastIndexOf("]");
    if (open < 0 || close <= open) return [];
    try {
      const arr = JSON.parse(src.slice(open, close + 1));
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }
  const rows = [];
  for (const part of shardSrcs || []) {
    const s = String(part || "");
    const open = s.indexOf("[");
    const close = s.lastIndexOf("]");
    if (open < 0 || close <= open) continue;
    try {
      const arr = JSON.parse(s.slice(open, close + 1));
      if (Array.isArray(arr)) for (const row of arr) if (row) rows.push(row);
    } catch (e) {}
  }
  return rows;
}

// ---- one shelf, two halves -----------------------------------------------
// The shelf a creator builds is meant to follow them into every game they make,
// so the rows themselves ride inside the mod: lib/catalog.js is the TRAVELLING
// shelf, written where the mod is being built and shipped with every release.
//
// A game the mod is installed into also has its own additions, and an update
// must never wipe those. So that game writes lib/local.js instead — only what
// it added, changed, or took off — and the shelf anybody reads is the two
// merged. New releases keep bringing new rows; nothing local is ever lost.

export function shelfKey(a) {
  if (!a) return "";
  return String(a.id || a.path || "");
}

// The shelf as it should read: what arrived with the mod, minus what this game
// hid, overlaid with what this game added or edited.
export function mergeShelf(shipped, local) {
  const loc = local && typeof local === "object" ? local : {};
  const hidden = {};
  for (const h of loc.hidden || []) hidden[String(h)] = true;
  const out = [];
  const seat = {};
  const take = (input, hideable) => {
    if (!input) return;
    const row = makeAsset(input);
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
  };
  for (const a of shipped || []) take(a, true);
  for (const a of loc.rows || []) take(a, false);
  return out;
}

// The other direction: given the shelf as it now stands and the shelf that came
// with the mod, what this game's own module should say. Rows identical to the
// shipped ones are left out entirely, so a later release can update them.
export function splitShelf(list, shipped) {
  const ship = {};
  const shipRows = [];
  for (const a of shipped || []) {
    const row = makeAsset(a);
    shipRows.push(row);
    if (row.id) ship["i:" + row.id] = row;
    if (row.path) ship["p:" + row.path] = row;
  }
  const rows = [];
  const seen = {};
  for (const a of list || []) {
    const row = makeAsset(a);
    const was = (row.id && ship["i:" + row.id]) || (row.path && ship["p:" + row.path]) || null;
    if (!was) {
      rows.push(row);
      continue;
    }
    seen[shelfKey(was)] = true;
    if (JSON.stringify(was) !== JSON.stringify(row)) rows.push(row);
  }
  const hidden = [];
  for (const row of shipRows) if (!seen[shelfKey(row)]) hidden.push(shelfKey(row));
  return { rows, hidden };
}

// ---- this game's own shelf, written as shards -----------------------------
// A shelf grows. The authored-UI realm doesn't: it drops a whole mount — the
// panel never runs — when any ONE module in the require closure passes
// 1,000,000 chars, and a cataloguing sweep took local.js to 826 rows /
// 1,434,760. So the rows ride numbered shards and lib/local.js became a loader
// that hand-lists them (require() takes no computed path) and concatenates them
// in order. Order is the contract: mergeShelf seats a row by id OR path, so the
// concatenation has to read exactly like the one file it replaced.
const LOCAL_SHARDS = 8;
// Row budget per shard. Well under the 1,000,000 cap, so a shelf can keep
// growing between reshards without anyone having to think about it again.
const LOCAL_SHARD_CHARS = 500000;

export function localShardFile(n) {
  return "local-" + n + ".js";
}

// Rows packed into at most LOCAL_SHARDS lists, in order — the same packer the
// catalog's shards use (packRows above), so the two shelves shard alike.
export function shardLocalRows(rows) {
  return packRows(rows, LOCAL_SHARDS, LOCAL_SHARD_CHARS);
}

export function serializeLocalShard(rows, n, count) {
  const body = (rows || []).map((a) => "    " + JSON.stringify(a)).join(",\n");
  return (
    "// Asset Library — this game's own shelf rows, shard " +
    n +
    " of " +
    count +
    ". Generated;\n" +
    "// edited through the Assets tab. lib/local.js is the loader over every shard\n" +
    "// and the only module anyone requires — hand-editing a shard reorders the\n" +
    "// shelf, and order decides which row keeps its seat.\n" +
    "module.exports = [\n" +
    body +
    (body ? "\n" : "") +
    "];\n"
  );
}

export function serializeLocalLoader(hidden) {
  const keys = (hidden || []).map((h) => String(h)).filter(Boolean);
  const lines = [];
  for (let n = 1; n <= LOCAL_SHARDS; n++) {
    lines.push('try { add(require("lib/' + localShardFile(n) + '")); } catch (e) {}');
  }
  return (
    "// Asset Library — this game's own shelf rows. Generated; edited through the\n" +
    "// Assets tab. The shelf that travels with the mod is lib/catalog.js, and the\n" +
    "// two are merged on read, so mod updates can never overwrite what you added.\n" +
    "//\n" +
    "// The rows live in lib/local-1.js onward: the UI realm drops a mount whose\n" +
    "// biggest module passes 1,000,000 chars, and this shelf outgrew that.\n" +
    "// require() takes no computed path, so the shards are listed by hand and a\n" +
    "// slot that isn't there yet simply reads empty. What comes back is the same\n" +
    "// { rows, hidden } this file always exported.\n" +
    "const rows = [];\n" +
    "function add(part) {\n" +
    "  if (!part || !part.length) return;\n" +
    "  for (let i = 0; i < part.length; i++) rows.push(part[i]);\n" +
    "}\n" +
    lines.join("\n") +
    "\n" +
    "module.exports = { rows: rows, hidden: " +
    JSON.stringify(keys) +
    " };\n"
  );
}

// The whole local shelf as FILES — the loader plus one source per shard slot.
// Not a string any more: every writer lands all of them (god.js writeLocal), so
// a caller that hands this straight to setScript is a caller that would have
// lost 800 rows.
export function serializeLocal(local) {
  const l = local && typeof local === "object" ? local : {};
  const rows = (l.rows || []).map((a) => makeAsset(a));
  const hidden = (l.hidden || []).map((h) => String(h)).filter(Boolean);
  const parts = shardLocalRows(rows);
  const shards = [];
  for (let n = 1; n <= LOCAL_SHARDS; n++) {
    const part = parts[n - 1] || [];
    shards.push({ file: localShardFile(n), rows: part.length, source: serializeLocalShard(part, n, parts.length) });
  }
  return { loader: serializeLocalLoader(hidden), shards, rows: rows.length, used: parts.length, hidden };
}

// The other direction: loader source plus shard sources in shard order, back to
// { rows, hidden }. Reads the one-file layout too, so a game that hasn't saved
// since the shards landed still opens.
export function parseLocalFiles(loaderSrc, shardSrcs) {
  const src = String(loaderSrc || "");
  if (src.indexOf('require("lib/local-') < 0) {
    const open = src.indexOf("{", src.indexOf("module.exports"));
    const close = src.lastIndexOf("}");
    if (open < 0 || close <= open) return { rows: [], hidden: [] };
    try {
      const obj = JSON.parse(src.slice(open, close + 1));
      return {
        rows: Array.isArray(obj && obj.rows) ? obj.rows.filter(Boolean) : [],
        hidden: Array.isArray(obj && obj.hidden) ? obj.hidden : [],
      };
    } catch (e) {
      return { rows: [], hidden: [] };
    }
  }
  const rows = [];
  for (const part of shardSrcs || []) {
    const s = String(part || "");
    const open = s.indexOf("[");
    const close = s.lastIndexOf("]");
    if (open < 0 || close <= open) continue;
    try {
      const arr = JSON.parse(s.slice(open, close + 1));
      if (Array.isArray(arr)) for (const row of arr) if (row) rows.push(row);
    } catch (e) {}
  }
  let hidden = [];
  const hid = /hidden"?\s*:\s*(\[[^\]]*\])/.exec(src);
  if (hid) {
    try {
      const parsed = JSON.parse(hid[1]);
      if (Array.isArray(parsed)) hidden = parsed;
    } catch (e) {}
  }
  return { rows, hidden };
}

// ---- crates: a shelf you can hand to someone -----------------------------
// A crate is a named bundle of shelf rows plus one share code, and the code IS
// the crate: the rows themselves, compressed and written in letters, so it can
// travel through a chat message to a person on another account with no server
// standing between them and nothing of theirs leaking back. What rides inside
// is only ever asset metadata — cdn paths, names, tags, clips, and a set's
// arrangement. Never a script body, never a url off the cdn, never anything a
// game will execute: readCrate rebuilds every row through makeAsset, so a
// doctored code can carry no field the library doesn't already understand.

const CODE_TAG = "ALX1.";
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function utf8ToLatin1(str) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 128) out += String.fromCharCode(c);
    else if (c < 2048) out += String.fromCharCode(192 | (c >> 6), 128 | (c & 63));
    else out += String.fromCharCode(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
  }
  return out;
}

export function latin1ToUtf8(str) {
  let out = "";
  let i = 0;
  while (i < str.length) {
    const c = str.charCodeAt(i);
    if (c < 128) {
      out += String.fromCharCode(c);
      i += 1;
    } else if (c < 224) {
      out += String.fromCharCode(((c & 31) << 6) | (str.charCodeAt(i + 1) & 63));
      i += 2;
    } else {
      out += String.fromCharCode(((c & 15) << 12) | ((str.charCodeAt(i + 1) & 63) << 6) | (str.charCodeAt(i + 2) & 63));
      i += 3;
    }
  }
  return out;
}

// Plain LZW over the bytes — a shelf repeats its own long cdn paths over and
// over, and that is exactly what this eats.
const LZW_MAX = 65535;

export function lzwEncode(s) {
  const dict = {};
  let size = 256;
  let w = "";
  const out = [];
  const code = (x) => (x.length === 1 ? x.charCodeAt(0) : dict[x]);
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (w === "") {
      w = c;
      continue;
    }
    const wc = w + c;
    if (dict[wc] !== undefined) {
      w = wc;
      continue;
    }
    out.push(code(w));
    if (size < LZW_MAX) dict[wc] = size++;
    w = c;
  }
  if (w !== "") out.push(code(w));
  return out;
}

export function lzwDecode(codes) {
  const dict = {};
  let size = 256;
  if (!codes.length) return "";
  let w = String.fromCharCode(codes[0]);
  let out = w;
  for (let i = 1; i < codes.length; i++) {
    const k = codes[i];
    let entry;
    if (k < 256) entry = String.fromCharCode(k);
    else if (dict[k] !== undefined) entry = dict[k];
    else if (k === size) entry = w + w.charAt(0);
    else return null;
    out += entry;
    if (size < LZW_MAX) dict[size++] = w + entry.charAt(0);
    w = entry;
  }
  return out;
}

// Codes are written as narrow as they can be — nine bits while the dictionary
// is small, widening only as it fills. Both sides derive the width from the
// code's position alone, so they never have to agree about anything else.
export function widthAt(i) {
  let b = 9;
  while (b < 16 && 255 + i >= 1 << b) b++;
  return b;
}

export function codesToText(codes) {
  let bits = "";
  let out = "";
  for (let i = 0; i < codes.length; i++) {
    const w = widthAt(i);
    let b = (codes[i] & 0xffff).toString(2);
    while (b.length < w) b = "0" + b;
    bits += b.slice(-w);
    while (bits.length >= 6) {
      out += B64.charAt(parseInt(bits.slice(0, 6), 2));
      bits = bits.slice(6);
    }
  }
  if (bits.length) {
    while (bits.length < 6) bits += "0";
    out += B64.charAt(parseInt(bits, 2));
  }
  return out;
}

export function textToCodes(text) {
  let bits = "";
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const v = B64.indexOf(text.charAt(i));
    if (v < 0) continue;
    let b = v.toString(2);
    while (b.length < 6) b = "0" + b;
    bits += b;
    let w = widthAt(out.length);
    while (bits.length >= w) {
      out.push(parseInt(bits.slice(0, w), 2));
      bits = bits.slice(w);
      w = widthAt(out.length);
    }
  }
  return out;
}

export function crateId(name, stamp) {
  return "crate-" + (slug(name) || "crate") + "-" + String(stamp || 0);
}

// The rows a crate carries, rebuilt clean. Every one goes back through
// makeAsset, so an unknown field in a pasted code is dropped on the way in.
export function crateRows(assets) {
  const out = [];
  const seen = {};
  for (const a of assets || []) {
    if (!a || !a.path) continue;
    if (seen[a.path]) continue;
    seen[a.path] = true;
    const row = makeAsset(a);
    // A photograph is this game's own file; it travels only if it is a cdn
    // image, which is the only kind the other side can actually fetch.
    if (row.thumb && !/^\/cdn\//.test(row.thumb)) row.thumb = "";
    out.push(row);
  }
  return out;
}

export function writeCrate(input) {
  const name = String((input && input.name) || "Crate").slice(0, 64);
  const by = String((input && input.by) || "").slice(0, 48);
  const rows = crateRows(input && input.assets);
  const note = String((input && input.note) || "").slice(0, 240);
  const payload = { v: 1, n: name, by, d: note, a: rows };
  return CODE_TAG + codesToText(lzwEncode(utf8ToLatin1(JSON.stringify(payload))));
}

export function readCrate(code) {
  const raw = String(code || "").trim();
  const body = raw.indexOf(CODE_TAG) === 0 ? raw.slice(CODE_TAG.length) : raw;
  if (!body) return { ok: false, error: "that code is empty" };
  let json = null;
  try {
    const bytes = lzwDecode(textToCodes(body.replace(/\s+/g, "")));
    if (bytes === null) return { ok: false, error: "that code is damaged — copy the whole thing, start to end" };
    json = JSON.parse(latin1ToUtf8(bytes));
  } catch (e) {
    return { ok: false, error: "that doesn't read as a share code" };
  }
  if (!json || typeof json !== "object" || !Array.isArray(json.a)) return { ok: false, error: "that code holds no assets" };
  const assets = crateRows(json.a);
  if (!assets.length) return { ok: false, error: "that crate came through empty" };
  return {
    ok: true,
    name: String(json.n || "Shared crate").slice(0, 64),
    by: String(json.by || "").slice(0, 48),
    note: String(json.d || "").slice(0, 240),
    assets,
  };
}

// What the library keeps about a crate: the name, who packed it, and the paths
// of its members. The assets themselves always live on the one shelf — a crate
// is a way of looking at the shelf, never a second copy of it.
export function makeCrate(input) {
  const name = String((input && input.name) || "Crate").slice(0, 64);
  const paths = [];
  const seen = {};
  for (const p of (input && input.paths) || []) {
    const s = String(p || "");
    if (!s || seen[s]) continue;
    seen[s] = true;
    paths.push(s);
  }
  return {
    id: String((input && input.id) || crateId(name, (input && input.added) || 0)),
    name,
    by: String((input && input.by) || "").slice(0, 48),
    note: String((input && input.note) || "").slice(0, 240),
    paths,
    added: Number(input && input.added) || 0,
  };
}

export function serializeCrates(list) {
  const rows = (list || []).map((c) => makeCrate(c));
  const body = rows.map((c) => "  " + JSON.stringify(c)).join(",\n");
  return `// Asset Library crates — generated. Edited through the Assets tab.\nmodule.exports = [\n${body}\n];\n`;
}

// The effect library ships as its own module so a game's own shelf edits and a
// new release of the effects can never overwrite each other.
export function serializeEffects(list) {
  const rows = (list || []).map((a) => makeAsset(Object.assign({ kind: "effect" }, a)));
  const body = rows.map((a) => "  " + JSON.stringify(a)).join(",\n");
  return `// Asset Library effects — generated. The fx programs live beside this file in effects/.\nmodule.exports = [\n${body}\n];\n`;
}

module.exports = {
  KINDS,
  KIND_META,
  FAMILIES,
  extOf,
  kindFromPath,
  clipsFromPath,
  basePath,
  familyOf,
  previewPath,
  slug,
  prettyName,
  normalizeTags,
  normalizeClips,
  makeAsset,
  autoTags,
  searchTags,
  VOCAB,
  MEMBER_PROPS,
  setPath,
  setSpan,
  fxPath,
  motionPath,
  motionKeyOf,
  motionAsset,
  EFFECT_PROPS,
  normalizeEffectProps,
  serializeEffects,
  normalizeMembers,
  normalizeBehaviors,
  resolveScript,
  resolveScripts,
  matches,
  search,
  tagCounts,
  kindCounts,
  conjurePath,
  serializeCatalog,
  serializeCatalogShard,
  serializeCatalogLoader,
  shardCatalogRows,
  parseCatalogFiles,
  catalogShardFile,
  CATALOG_SHARDS,
  CATALOG_SHARD_CHARS,
  packRows,
  shelfKey,
  mergeShelf,
  splitShelf,
  serializeLocal,
  serializeLocalShard,
  serializeLocalLoader,
  shardLocalRows,
  parseLocalFiles,
  localShardFile,
  LOCAL_SHARDS,
  LOCAL_SHARD_CHARS,
  CODE_TAG,
  crateId,
  crateRows,
  writeCrate,
  readCrate,
  makeCrate,
  serializeCrates,
};
