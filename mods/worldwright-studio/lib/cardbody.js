// cardbody.js — a card's Body section parsed into the PROPERTIES half of an object spec (model / primitive / light / none). Pure leaf, zero requires; lib/shoot.js does the spawning.

var VERSION = 1;

var BODY_SECTION_NAMES = ["body", "asset", "appearance", "in-scene", "in scene"];

// dims = the ordered list a bare "box 2 x 0.3 x 5" fills; keys = the named ones.
var PRIMS = {
  box: { dims: ["width", "height", "depth"], keys: { w: "width", h: "height", d: "depth", width: "width", height: "height", depth: "depth" } },
  sphere: { dims: ["radius"], keys: { r: "radius", radius: "radius" } },
  cylinder: { dims: ["radius", "height"], keys: { r: "radius", radius: "radius", h: "height", height: "height" } },
  cone: { dims: ["radius", "height"], keys: { r: "radius", radius: "radius", h: "height", height: "height" } },
  capsule: { dims: ["radius", "height"], keys: { r: "radius", radius: "radius", h: "height", height: "height" } },
  plane: { dims: ["width", "depth"], keys: { w: "width", width: "width", d: "depth", depth: "depth" } },
  torus: { dims: ["radius", "tube"], keys: { r: "radius", radius: "radius", tube: "tube" } },
};

var LIGHT_KINDS = ["ambient", "hemisphere", "directional", "point", "spot"];

var COMMON = ["scale", "color", "colour", "cast", "shadow"];

export function text(v) {
  return typeof v === "string" ? v : v === 0 || v ? String(v) : "";
}

export function lower(v) {
  return text(v).trim().toLowerCase();
}

export function num(v) {
  var n = parseFloat(text(v));
  return isFinite(n) ? n : null;
}

export function parseColor(v) {
  var s = text(v).trim();
  if (!s) return null;
  if (s.indexOf("oklch") === 0 || s.indexOf("rgb") === 0 || s.indexOf("hsl") === 0) return { css: s, rgb: null };
  var m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(s);
  if (!m) return { css: s, rgb: null };
  var hex = m[1];
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  var r = parseInt(hex.slice(0, 2), 16) / 255;
  var g = parseInt(hex.slice(2, 4), 16) / 255;
  var b = parseInt(hex.slice(4, 6), 16) / 255;
  return { css: "#" + hex, rgb: { r: r, g: g, b: b } };
}

export function tokens(line) {
  var out = [];
  var re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  var m;
  while ((m = re.exec(line)) !== null) out.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);
  return out;
}

export function pairs(toks) {
  var out = {};
  var order = [];
  for (var i = 0; i < toks.length; i++) {
    var k = toks[i];
    var eq = k.indexOf("=");
    if (eq > 0) {
      var kk = lower(k.slice(0, eq)).replace(/:$/, "");
      out[kk] = k.slice(eq + 1);
      order.push(kk);
      continue;
    }
    kk = lower(k).replace(/:$/, "");
    var v = i + 1 < toks.length ? toks[i + 1] : "";
    // A key with no value at all is a flag; record it as true rather than dropping it silently.
    if (!v || /^[a-z_][a-z0-9_-]*:?$/i.test(v) === true && /^(style|color|colour|pose|animations|offset)$/.test(kk) === false && isNaN(parseFloat(v))) {
      out[kk] = true;
      order.push(kk);
      continue;
    }
    out[kk] = v;
    order.push(kk);
    i++;
  }
  out.__order = order;
  return out;
}

export function leadingDims(toks) {
  var joined = toks.join(" ").replace(/\s*[x×*]\s*/gi, " ");
  var parts = joined.split(/\s+/);
  var nums = [];
  var used = 0;
  for (var i = 0; i < parts.length; i++) {
    var n = num(parts[i]);
    if (n === null) break;
    nums.push(n);
    used++;
  }
  return { nums: nums, rest: parts.slice(used) };
}

export function buildModel(toks, warn) {
  var url = toks.length ? toks[0] : "";
  if (!url) {
    warn("`model` with no url — write `model /cdn/.../model-thing.glb`.");
    return null;
  }
  var p = pairs(toks.slice(1));
  var anims = text(p.animations || p.anims || p.clips).trim();
  var pose = text(p.pose || p.idle).trim();
  // Clips ride in the url's own query, which is how this engine names them.
  if (anims && url.indexOf("?animations=") === -1 && url.indexOf("&animations=") === -1) {
    url += (url.indexOf("?") === -1 ? "?" : "&") + "animations=" + anims.replace(/\s*,\s*/g, ",");
  }
  var props = { model: url };
  var off = text(p.offset).trim();
  if (off) {
    var o = off.split(/\s*,\s*/).map(num);
    if (o.length === 3 && o[0] !== null && o[1] !== null && o[2] !== null) props.model = { id: url, offset: [o[0], o[1], o[2]] };
    else warn('`offset ' + off + "` needs three numbers — `offset 0, 0.2, 0`.");
  }
  return { kind: "model", ...props, pose: pose || "", scale: num(p.scale) };
}

// `#[asset: Old Beggar] animations Limp pose Idle` — the ONE tag grammar's kinded token, as a body.
export function buildAssetRef(inner, toks, warn) {
  var name = text(inner).replace(/\s+/g, " ").trim();
  if (!name) {
    warn("`#[asset: ]` names nothing — write the shelf card's name: `#[asset: Old Beggar]`.");
    return null;
  }
  var p = pairs(toks);
  var anims = text(p.animations || p.anims || p.clips).trim();
  var extra = [];
  if (anims) {
    var parts = anims.split(/\s*,\s*/);
    for (var i = 0; i < parts.length; i++) if (parts[i] && extra.indexOf(parts[i]) === -1) extra.push(parts[i]);
  }
  var pose = text(p.pose || p.idle).trim();
  var body = { kind: "asset", name: name, extraAnims: extra, pose: pose || "", scale: num(p.scale) };
  var off = text(p.offset).trim();
  if (off) {
    var o = off.split(/\s*,\s*/).map(num);
    if (o.length === 3 && o[0] !== null && o[1] !== null && o[2] !== null) body.offset = [o[0], o[1], o[2]];
    else warn('`offset ' + off + "` needs three numbers — `offset 0, 0.2, 0`.");
  }
  return body;
}

export function buildPrim(word, toks, warn) {
  var def = PRIMS[word];
  var lead = leadingDims(toks);
  var prim = { kind: word };
  for (var i = 0; i < lead.nums.length && i < def.dims.length; i++) prim[def.dims[i]] = lead.nums[i];
  if (lead.nums.length > def.dims.length) {
    warn("`" + word + "` takes " + def.dims.length + " number" + (def.dims.length === 1 ? "" : "s") + " (" + def.dims.join(" x ") + ") — the extra ones were ignored.");
  }
  var p = pairs(lead.rest);
  var order = p.__order || [];
  var props = { primitive: prim, anchor: spawnFlatCentre(prim), pivot: spawnFlatCentre(prim) };
  for (var j = 0; j < order.length; j++) {
    var k = order[j];
    if (def.keys[k]) {
      var n = num(p[k]);
      if (n !== null) prim[def.keys[k]] = n;
      continue;
    }
    if (k === "color" || k === "colour") {
      var c = parseColor(p[k]);
      if (c) props.material = { color: c.css };
      continue;
    }
    if (k === "texture") {
      props.material = props.material || {};
      props.material.texture = text(p[k]);
      continue;
    }
    if (k === "scale") continue;
    warn("`" + k + "` means nothing on a " + word + " — dropped.");
  }
  return { kind: "primitive", ...props, scale: num(p.scale) };
}

export function buildLight(toks, warn) {
  var kind = lower(toks.length ? toks[0] : "point");
  var rest = toks.slice(1);
  if (LIGHT_KINDS.indexOf(kind) === -1) {
    rest = toks.slice(0);
    kind = "point";
  }
  var p = pairs(rest);
  var light = { kind: kind };
  var c = parseColor(p.color || p.colour);
  if (c) light.color = c.css;
  var keys = ["intensity", "distance", "angle", "penumbra"];
  for (var i = 0; i < keys.length; i++) {
    var n = num(p[keys[i]]);
    if (n !== null) light[keys[i]] = n;
  }
  // Card grammar is DEGREES and, since engine v5.2.35, so is the engine's spot cone (half-angle, 0-90) — no translation anymore, just the clamp. (Pre-5.2.35 this multiplied by PI/180; a radian-era value replayed today would render as a needle cone, which is why the clamp stays.)
  if (kind === "spot" && typeof light.angle === "number") {
    light.angle = round3(Math.min(90, Math.max(0, light.angle)));
  }
  if (p.shadow) light.shadow = true;
  return { kind: "light", light: light, scale: null };
}

export function round3(n) {
  return Math.round(n * 1000) / 1000;
}

// The FIRST line naming a body wins; every line after it may add or override a key.
export function parseBody(src) {
  var out = { kind: "none", scale: null, pose: "", warnings: [], error: "", found: false };
  var raw = text(src);
  if (!raw.trim()) return out;

  var lines = raw.split(/\r?\n/);
  var body = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/^[\s>*\-+]*/, "").replace(/\s+$/, "");
    if (!line) continue;
    var lineNo = i + 1;

    /* eslint-disable no-loop-func */
    var warn = (function (n, l) {
      return function (msg) {
        out.warnings.push("Body line " + n + " (" + l + "): " + msg);
      };
    })(lineNo, line.length > 60 ? line.slice(0, 57) + "…" : line);
    /* eslint-enable no-loop-func */

    // The shelf reference — the one #[…] line a Body reads. Every other token line stays prose.
    var am = /^#\[\s*asset\s*:\s*([^\]]*)\]\s*(.*)$/i.exec(line);
    if (am) {
      var ar = buildAssetRef(am[1], tokens(am[2]), warn);
      if (ar) body = ar;
      out.found = true;
      continue;
    }
    if (line.indexOf("//") === 0 || line.indexOf("#") === 0) continue;

    var toks = tokens(line);
    if (!toks.length) continue;
    var head = lower(toks[0]).replace(/:$/, "");
    var tail = toks.slice(1);

    if (head === "none" || head === "nothing" || head === "concept" || head === "abstract") {
      out.found = true;
      out.kind = "none";
      body = null;
      continue;
    }
    if (head === "model" || head === "glb" || head === "mesh") {
      var m = buildModel(tail, warn);
      if (m) body = m;
      out.found = true;
      continue;
    }
    if (PRIMS[head]) {
      body = buildPrim(head, tail, warn);
      out.found = true;
      continue;
    }
    if (head === "light" || head === "lamp") {
      body = buildLight(tail, warn);
      out.found = true;
      continue;
    }

    if (COMMON.indexOf(head) !== -1 || head === "pose" || head === "animations" || head === "physics") {
      if (!body && head !== "scale") {
        warn("`" + head + "` before any body — name the body first (`model …`, `box …`, `light …`).");
        continue;
      }
      if (head === "scale") {
        var s = num(tail[0]);
        if (s === null) warn("`scale` wants a number.");
        else out.scale = s;
        continue;
      }
      if (head === "pose") {
        body.pose = tail.join(" ").trim();
        continue;
      }
      if (head === "physics") {
        body.physics = lower(tail[0]) || "static";
        continue;
      }
      if (head === "color" || head === "colour") {
        var cc = parseColor(tail[0]);
        if (!cc) {
          warn("`color` wants #rrggbb.");
          continue;
        }
        body.material = body.material || {};
        body.material.color = cc.css;
        continue;
      }
      if (head === "animations") {
        warn("`animations` belongs on the same line as `model`.");
        continue;
      }
      continue;
    }

    // Anything else is prose living in the section: allowed, and deliberately silent.
  }

  if (body) {
    out.kind = body.kind;
    out.properties = body;
    out.pose = body.pose || "";
    if (body.scale !== null && body.scale !== undefined && out.scale === null) out.scale = body.scale;
    if (body.kind === "asset") {
      out.name = body.name;
      out.extraAnims = body.extraAnims;
      if (body.offset) out.offset = body.offset;
    }
  }
  if (out.scale !== null && out.scale !== undefined) out.scale = out.scale;
  return out;
}

export function bodyOfCard(card) {
  if (typeof card === "string") return parseBody(card);
  var c = card || {};
  var secs = c.sections || [];
  for (var i = 0; i < secs.length; i++) {
    var nm = lower(secs[i] && (secs[i].name || secs[i].title));
    if (BODY_SECTION_NAMES.indexOf(nm) !== -1) return parseBody(secs[i].content || secs[i].body || secs[i].text);
  }
  var out = parseBody("");
  out.found = false;
  return out;
}

export function placeholderBody(label) {
  return {
    kind: "placeholder",
    primitive: { kind: "box", width: 0.6, height: 1.7, depth: 0.4 },
      material: { color: "oklch(0.62 0.02 250)", roughness: 0.9 },
    scale: null,
    pose: "",
    label: text(label),
    warnings: [],
    error: "",
    found: false,
  };
}

// The one place the Body grammar is written out — panels and docs must read THIS, never restate it.
export function contract() {
  return [
    "A CARD'S BODY — what this card looks like when a scene places it.",
    "Write it in a section named Body (or Asset, or Appearance).",
    "",
    "  model /cdn/…/model-brother-kael.glb animations Idle,Walk pose Idle scale 1",
    "  #[asset: Old Beggar] animations Limp pose Idle   (an Asset Library shelf card by name; its own",
    "    clips ride along and `animations` ADDS to them; a `set` row stands its members up as one piece;",
    "    a name the shelf lacks is searched among this game's own assets, and a /cdn/ path is itself)",
    "  box 2 x 0.3 x 5 color #6b5136",
    "  light point color #ffb066 intensity 3 distance 12",
    "  none",
    "",
    "Primitives: " + Object.keys(PRIMS).join(", ") + ".",
    "",
    "`none` is a real answer: a concept card places nothing, and the camera can still aim at where",
    "it would have stood. A card with no Body section at all gets a grey stand-in you can see.",
    "",
    "Change the Body once and every scene that references this card re-dresses the next time it",
    "is shot. Nothing bakes.",
  ].join("\n");
}

module.exports = {
  VERSION: VERSION,
  BODY_SECTION_NAMES: BODY_SECTION_NAMES,
  PRIMS: PRIMS,
  LIGHT_KINDS: LIGHT_KINDS,
  parseColor: parseColor,
  parseBody: parseBody,
  bodyOfCard: bodyOfCard,
  placeholderBody: placeholderBody,
  contract: contract,
};


/** A plane, circle, ring or torus stands by its centre here: "center" for those four kinds, nothing for any other. */
function spawnFlatCentre(primitive) {
  const kind = typeof primitive === "string" ? primitive : primitive != null ? primitive.kind : undefined;
  return kind === "plane" || kind === "circle" || kind === "ring" || kind === "torus" ? "center" : undefined;
}

/** A part whose shape is decided as the line runs gets pivot "center" when it is a plane, circle, ring or torus that names no pivot. */
function spawnKeepFlatCentre(part) {
  if (part != null && spawnFlatCentre(part.primitive) !== undefined) {
    if (part.pivot == null) part.pivot = "center";
  }
  return part;
}

/** Writes a part's primitive and keeps it standing the same way when the new shape is a plane, circle, ring or torus: the value written. */
function spawnSetPrimitive(part, primitive) {
  part.primitive = primitive;
  spawnKeepFlatCentre(part);
  return primitive;
}
