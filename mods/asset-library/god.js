// Asset Library — the world half. Rides the god entity, so every panel
// sendAction lands here. It owns three jobs: writing the catalog back into the
// spec, turning a card into a real thing standing in the world, and capturing a
// group of placed things as a set that keeps its arrangement.

const S = require("lib/store.js");
const BK = require("lib/brainkit.js");
// The materials half: reading this game for the surfaces it wears, and putting
// one of them onto a real thing.
const MAT = require("lib/matkit.js");
const V = require("builtin/vec3");

const TAG = "asset-library";
// The clickable marker on a placed effect — see effect-plate.js.
const HANDLE_TAG = "al-fx-handle";

// Install-proof: the catalog module is whichever lib/catalog.js sits beside us,
// whether that's scripts/asset-library/ in the workshop or mods/asset-library/
// after somebody installs the published mod.
export function catalogPath(api) {
  const all = api.listScripts() || [];
  const hit = all.find((p) => /(^|\/)lib\/catalog\.js$/.test(p) && p.indexOf("asset-library") >= 0);
  return hit || "scripts/asset-library/lib/catalog.js";
}

// The catalog's rows don't live inside catalog.js any more — they ride numbered
// shards beside it (lib/catalog-1.js …), for the same reason local's do: the
// authored-UI realm drops a whole mount whose biggest module is over 1,000,000
// chars, and the merged shelf a workshop save writes is past 1.5M. Same
// install-proof scan as everything else, then the name derived from whichever
// catalog.js we found: a shard we are about to WRITE for the first time isn't in
// listScripts yet, so the scan alone can't answer.
export function catalogShardPath(api, n) {
  const tail = "lib/catalog-" + n + ".js";
  const all = api.listScripts() || [];
  const hit = all.find((p) => p.indexOf("asset-library") >= 0 && (p === tail || p.slice(-(tail.length + 1)) === "/" + tail));
  if (hit) return hit;
  return catalogPath(api).replace(/catalog\.js$/, "catalog-" + n + ".js");
}

export function projectPath(api) {
  const all = api.listScripts() || [];
  const hit = all.find((p) => /(^|\/)lib\/project\.js$/.test(p) && p.indexOf("asset-library") >= 0);
  if (hit) return hit;
  return catalogPath(api).replace(/catalog\.js$/, "project.js");
}

export function cratesPath(api) {
  const all = api.listScripts() || [];
  const hit = all.find((p) => /(^|\/)lib\/crates\.js$/.test(p) && p.indexOf("asset-library") >= 0);
  if (hit) return hit;
  return catalogPath(api).replace(/catalog\.js$/, "crates.js");
}

// This game's own half of the shelf. Only written where the mod is INSTALLED —
// see saveCatalog.
export function localPath(api) {
  const all = api.listScripts() || [];
  const hit = all.find((p) => /(^|\/)lib\/local\.js$/.test(p) && p.indexOf("asset-library") >= 0);
  if (hit) return hit;
  return catalogPath(api).replace(/catalog\.js$/, "local.js");
}

// The rows of this game's own shelf don't live in local.js any more — they ride
// numbered shards beside it (lib/local-1.js …), because the authored-UI realm
// drops a whole mount whose biggest module is over 1,000,000 chars and the shelf
// outgrew that. Same install-proof scan as everything else, then the name
// derived from whichever local.js we found: a shard we are about to WRITE for
// the first time isn't in listScripts yet, so the scan alone can't answer.
export function localShardPath(api, n) {
  const tail = "lib/local-" + n + ".js";
  const all = api.listScripts() || [];
  const hit = all.find((p) => p.indexOf("asset-library") >= 0 && (p === tail || p.slice(-(tail.length + 1)) === "/" + tail));
  if (hit) return hit;
  return localPath(api).replace(/local\.js$/, "local-" + n + ".js");
}

// The effect library — fire, sparks, weather, lamplight. Ships with the mod in
// its own module so a game's own shelf edits and a new release of the effects
// can never overwrite each other.
export function effectsPath(api) {
  const all = api.listScripts() || [];
  const hit = all.find((p) => /(^|\/)lib\/effects\.js$/.test(p) && p.indexOf("asset-library") >= 0);
  if (hit) return hit;
  return catalogPath(api).replace(/catalog\.js$/, "effects.js");
}

// The workshop is the game the mod is being BUILT in — its files sit under
// scripts/. Anywhere else the mod arrived installed, under mods/, and its
// catalog is a shipment: we leave it alone so the next release can replace it.
export function isWorkshop(api) {
  return !/(^|\/)mods\//.test(catalogPath(api));
}

export function idlePath(api) {
  const all = api.listScripts() || [];
  return all.find((p) => /asset-library\/idle\.js$/.test(p)) || "scripts/asset-library/idle.js";
}

export function critterPath(api) {
  const all = api.listScripts() || [];
  return all.find((p) => /asset-library\/critter\.js$/.test(p)) || "scripts/asset-library/critter.js";
}

// Which gait a card wants, if any — and ONLY a row that says so out loud gets
// one. The audit writes "gait-serpent" and friends onto the rows that are real
// creatures with no skeleton in the file; "unrigged" on its own says nothing
// about what the thing IS, and most of those rows are market stalls and semi
// trucks. A prop stands still, so no gait tag means no motion behavior.
export function gaitTag(asset) {
  const tags = (asset && asset.tags) || [];
  for (const t of tags) {
    const m = /^gait-([a-z]+)$/.exec(String(t));
    if (m) return m[1];
  }
  return null;
}

// The Motions shelf's world half — the hand that puts a clip on a body.
const MK = require("lib/motionkit.js");

// Motion card pictures. Motions have no catalog row, so their shots live in
// their own generated module beside the catalog.
export function motionShotsPath(api) {
  const all = api.listScripts() || [];
  const hit = all.find((p) => /(^|\/)lib\/shots\.js$/.test(p) && p.indexOf("asset-library") >= 0);
  if (hit) return hit;
  return catalogPath(api).replace(/catalog\.js$/, "shots.js");
}

export function saveMotionShots(api, shots) {
  const out = {};
  for (const k of Object.keys(shots || {})) {
    const url = String(shots[k] || "");
    if (k && url) out[k] = url;
  }
  const source =
    "// Asset Library — card pictures for the Motions shelf. Generated by the Motions\n" +
    "// tab: a rigged body stood in front of the camera wearing the motion, photographed,\n" +
    "// and filed here under its registry key. Motions have no catalog row of their own.\n" +
    "module.exports = " +
    JSON.stringify(out, null, 2) +
    ";\n";
  persist(api, () => api.setScript(motionShotsPath(api), source));
  return Object.keys(out).length;
}

// One answer, one line — the panel's note strip is where a drop reports back,
// the same lane the project scan and the stage's ready signal ride.
export function sayMotion(api, text) {
  try {
    api.uiEvent("alMotion", { say: String(text || "") }, { kind: "all" });
  } catch (e) {
    /* no ui lane here; the notifyDm below still carries it */
  }
}

// The body a motion landed on (or didn't), reported the way every other kind
// reports: a line for the creator, and telemetry for whoever is building this.
export function motionLanded(api, res, label) {
  const name = label || (res && res.key) || "that motion";
  if (res && res.ok) {
    sayMotion(api, res.was && res.was !== res.key ? name + " swapped in on " + res.name : name + " is on " + res.name);
    try {
      api.highlight(res.id, { color: "oklch(0.86 0.17 145)", style: "pulse", duration: 0.9 });
    } catch (e) {
      /* highlight is a nicety */
    }
    api.notifyDm("Asset Library: put the motion “" + name + "” on " + res.id + (res.was ? " (was " + res.was + ")" : ""));
    return;
  }
  const why = (res && res.why) || "nothing";
  sayMotion(
    api,
    why === "nobody"
      ? name + " needs a body — that thing has nothing to animate"
      : why === "unknown"
        ? "this game hasn't got a motion called " + name
        : "landed on empty ground — a motion has to go on a body"
  );
}

export function persist(api, work) {
  if (typeof api.withPersistence === "function") {
    api.withPersistence(work);
    return;
  }
  work();
}

// ---- where a dropped card lands ------------------------------------------

export function groundAt(api, x, z, fallbackY) {
  const h = api.getTerrainHeight(x, z);
  return typeof h === "number" ? h : fallbackY;
}

// The ray under the cursor, rebuilt from the live camera. The panel hands us
// the drop point in its own viewport pixels, which is the same viewport.
export function rayFromScreen(cam, payload) {
  const w = Number(payload.w) || 1;
  const h = Number(payload.h) || 1;
  const ndcX = (Number(payload.x) / w) * 2 - 1;
  const ndcY = 1 - (Number(payload.y) / h) * 2;
  const fov = ((cam.fov || 60) * Math.PI) / 180;
  const tanHalf = Math.tan(fov / 2);
  const aspect = cam.aspect || w / h;
  const fwd = V.normalize(cam.forward);
  let right = V.cross(fwd, { x: 0, y: 1, z: 0 });
  if (V.length(right) < 0.0001) right = { x: 1, y: 0, z: 0 };
  right = V.normalize(right);
  const up = V.normalize(V.cross(right, fwd));
  const dir = V.add(fwd, V.add(V.scale(right, ndcX * tanHalf * aspect), V.scale(up, ndcY * tanHalf)));
  return { origin: cam.position, direction: V.normalize(dir) };
}

// March until we're under the ground — the honest fallback when the ray hits
// nothing solid, so a drop over empty sky still lands on the hillside.
export function marchToGround(api, origin, dir) {
  let last = origin;
  for (let t = 1; t <= 300; t += 2) {
    const p = V.add(origin, V.scale(dir, t));
    const g = api.getTerrainHeight(p.x, p.z);
    if (typeof g === "number" && p.y <= g) return { x: p.x, y: g, z: p.z };
    last = p;
  }
  return { x: last.x, y: groundAt(api, last.x, last.z, last.y), z: last.z };
}

// The cursor ray, best source first: the engine's own pointer ray (it knows
// where the mouse is, whatever the camera is doing), then the hand-rolled
// camera basis from the panel's viewport pixels.
export function cursorRay(api, cam, payload, input) {
  if (input && typeof api.getInputRay === "function") {
    const r = api.getInputRay(input);
    if (r && r.direction) return r;
  }
  return rayFromScreen(cam, payload);
}

export function dropPoint(api, payload, input, ignore) {
  const cam = api.getCamera();
  if (!cam) {
    return { x: 0, y: groundAt(api, 0, 0, 0), z: 0 };
  }
  // The drag ghost must never be what the ray lands on — otherwise every
  // move re-aims at the ghost's own face and it walks into the camera.
  const opts = { distance: 300 };
  if (ignore && ignore.length) opts.ignoreEntities = ignore;
  if (payload.aim === "screen") {
    const ray = cursorRay(api, cam, payload, input);
    const hit = api.raycast(ray.origin, ray.direction, opts);
    if (hit && hit.position) return hit.position;
    return marchToGround(api, ray.origin, ray.direction);
  }
  const fwd = V.normalize(cam.forward);
  const ahead = V.add(cam.position, V.scale(fwd, 6));
  const hit = api.raycast(cam.position, fwd, Object.assign({}, opts, { distance: 60 }));
  if (hit && hit.position) return hit.position;
  return { x: ahead.x, y: groundAt(api, ahead.x, ahead.z, ahead.y), z: ahead.z };
}

// What the cursor was actually OVER when the card was let go — the entity the
// same ray hits, or null for open ground. A material card uses this to tell
// "dress this wall" from "stand a picture up in the field". The drag ghost and
// its puck are never the answer: aiming at your own preview would dress the
// preview.
export function dropHitId(api, payload, input, ignore) {
  const cam = api.getCamera();
  if (!cam) return null;
  const opts = { distance: 300 };
  if (ignore && ignore.length) opts.ignoreEntities = ignore;
  const ray = cursorRay(api, cam, payload, input);
  let hits = [];
  try {
    hits = api.raycast(ray.origin, ray.direction, Object.assign({ multiple: true }, opts)) || [];
  } catch (e) {
    hits = [];
  }
  const skip = {};
  for (const id of ignore || []) skip[String(id)] = true;
  for (const hit of hits) {
    const id = hit && hit.objectId ? String(hit.objectId) : "";
    if (!id || skip[id]) continue;
    let view = null;
    try {
      view = api.getObject(id);
    } catch (e) {
      view = null;
    }
    const tags = (view && view.tags) || [];
    // The ghost, its puck, the god-mode furniture: not scenery, not a target.
    if (tags.indexOf("ghost") >= 0) continue;
    if (id.indexOf("__god_mode") >= 0 || id.indexOf("/handle") >= 0) continue;
    let parent = null;
    try {
      const p = api.getParent ? api.getParent(id) : null;
      parent = typeof p === "string" ? p : p && p.id;
    } catch (e) {
      parent = null;
    }
    if (parent && skip[String(parent)]) continue;
    return id;
  }
  return null;
}

// ---- the drag ghost ------------------------------------------------------
// While a card is being dragged, the real asset stands in the world under the
// cursor. It carries no collider and no sound, so it can be swept across the
// hillside; letting go swaps it for the placed thing.

export function ghostSpec(asset, point, api) {
  const feet = { x: point.x, z: point.z, y: { terrain: 0 } };
  const props = { feetPosition: feet, physics: "none", castShadow: false };
  if (asset.kind === "effect") {
    // The real effect burns under the cursor — an fx card can't be photographed,
    // so the drag IS its preview.
    const own = Object.assign({}, asset.props || {});
    if (own.fx && own.fx.script && api) {
      const found = S.resolveScript(api.listScripts() || [], own.fx.script);
      if (found) own.fx = Object.assign({}, own.fx, { script: found });
      else delete own.fx;
    }
    Object.assign(props, own, { feetPosition: feet, physics: "none", castShadow: false });
  } else if (asset.kind === "set") {
    // Nothing to stand up — a set has no file. The footprint box says how much
    // ground the drop is about to cover.
    const span = asset.span || {};
    props.primitive = {
      kind: "box",
      width: Math.max(1, Number(span.w) || 0),
      height: Math.max(1, Number(span.h) || 0),
      depth: Math.max(1, Number(span.d) || 0),
    };
    props.material = {
      color: "oklch(0.88 0.13 195)",
      emissive: "oklch(0.72 0.16 195)",
      emissiveIntensity: 0.5,
      opacity: 0.28,
      transparent: true,
    };
  } else if (asset.kind === "image") {
    props.rotation = { pitch: 90 };
    props.primitive = { kind: "plane", width: 3, height: 3 }; spawnKeepFlatCentre(props);
    props.material = { texture: asset.path, opacity: 0.7, roughness: 0.85 };
  } else if (asset.kind === "sound") {
    props.primitive = { kind: "sphere", radius: 0.25 };
    props.material = { color: "oklch(0.85 0.15 195)", emissive: "oklch(0.75 0.18 195)", opacity: 0.6 };
  } else {
    // The exact path the card carries — stripping ?animations asks the CDN for
    // a different derivation, which for a rigged body is a body nobody cooked.
    props.model = asset.path;
  }
  // A lit puck rides under every ghost, so the cursor always has something
  // following it even while the model itself is still cooking.
  const puck = {
    feetPosition: { x: 0, y: 0.02, z: 0 },
      rotation: { pitch: 90 },
      primitive: { kind: "circle", radius: 0.7 }, anchor: "center", pivot: "center",
      material: { color: "oklch(0.9 0.14 195)", emissive: "oklch(0.8 0.17 195)", opacity: 0.4 },
      physics: "none",
      castShadow: false,
  };
  return { tags: [TAG, "ghost"], ...props, children: [puck] };
}

export function clearGhost(api) {
  const st = api.getState() || {};
  if (st.ghostId) {
    try {
      api.destroy(st.ghostId);
    } catch (e) {
      /* already gone */
    }
  }
  api.patchState({ ghostId: null });
}

export function moveGhost(api, point) {
  const st = api.getState() || {};
  if (!st.ghostId) return;
  api.setObjectProperty(st.ghostId, "feetPosition", { x: point.x, z: point.z, y: { terrain: 0 } });
}

// ---- placing ------------------------------------------------------------

// Everything the panel drops has to become a REAL object in the world: a spec
// entity, so god mode can click it, drag it, undo it, and so it's still there
// after a rebuild. A bare api.spawn is runtime-only — it renders and then can't
// be touched — so every placement goes through the persist lane below.
export function persistSpawn(api, id, spec) {
  let made = null;
  persist(api, () => {
    made = id ? api.spawn(id, spec) : api.spawn(spec);
  });
  return made;
}

export function placedId(api, asset) {
  const st = api.getState() || {};
  const counts = Object.assign({}, st.placed || {});
  const n = (counts[asset.id] || 0) + 1;
  counts[asset.id] = n;
  api.patchState({ placed: counts });
  return String(asset.id || "asset").replace(/[^a-z0-9-]+/gi, "-") + "-" + n;
}

// The clip a placed body should already be breathing on. A rig's clip list comes
// home in whatever order the model was authored in, so the first name is not
// reliably the resting one — a wyvern can lead with Fly, a guard with Attack.
// An exact "idle" wins, then any name carrying idle (Idle_A, CombatIdle), and
// only then the first clip, which is better than nothing to stand on.
export function idleClip(clips) {
  const list = (clips || []).map((c) => String(c || "").trim()).filter(Boolean);
  if (!list.length) return null;
  for (const c of list) if (c.toLowerCase() === "idle") return c;
  for (const c of list) if (c.toLowerCase().indexOf("idle") >= 0) return c;
  return list[0];
}

// Feet for a drop: ground-relative where the place has ground, the drop point's
// own y (a raycast hit, a floor slab, an explicit `at`) where terrain is off —
// there `{ terrain: n }` parks at bare y = n and a piece dropped on an upper
// floor would fall through to 0.
export function dropFeet(api, point, lift) {
  const g = api.getTerrainHeight(point.x, point.z);
  const up = Number(lift) || 0;
  if (typeof g === "number") return { x: point.x, z: point.z, y: { terrain: up } };
  return { x: point.x, y: (Number(point.y) || 0) + up, z: point.z };
}

export function placeSpec(api, asset, point) {
  const feet = dropFeet(api, point, 0);

  if (asset.kind === "sound") {
    return {
      tags: [TAG, "sound"],
      feetPosition: feet,
        primitive: { kind: "sphere", radius: 0.22 },
        material: { color: "oklch(0.82 0.16 195)", emissive: "oklch(0.7 0.18 195)", opacity: 0.75 },
        audio: { clip: asset.path, loop: true, spatial: true, gain: 0.35 },
        physics: { body: "static", collider: "sphere" },
        visibleTo: "editors",
    };
  }

  // An effect has no file — its card carries the properties themselves: an fx
  // program, a light, a moving water surface, or a mix. The fx script travels
  // inside the mod, so its path is resolved the way a captured behavior is.
  if (asset.kind === "effect") {
    const props = Object.assign({ feetPosition: feet, physics: "none" }, asset.props || {});
    if (props.fx && props.fx.script) {
      const found = S.resolveScript(api.listScripts() || [], props.fx.script);
      if (!found) {
        api.notifyDm("Asset Library: " + asset.name + " needs " + props.fx.script + ", and this game hasn't got that file.");
        return null;
      }
      props.fx = Object.assign({}, props.fx, { script: found });
    }
    // Fire has nothing to click. The handle is a child marker — visible only
    // while a god-mode session is alive (see wakeHandles) — that carries the
    // remove/freeze strip and drags the effect around with it.
    const handle = S.resolveScript(api.listScripts() || [], "asset-library/effect-plate.js");
    // A geometry row may carry its own children (a card body plus its sign);
    // they spawn beside the handle.
    const own = Array.isArray(asset.children) ? asset.children.slice() : [];
    return {
      tags: [TAG, "effect"],
      ...props,
      children: own.concat([
        {
          tags: [HANDLE_TAG],
          state: { fxName: asset.name },
          behavior: handle || "scripts/asset-library/effect-plate.js",
          feetPosition: { x: 0, y: 0.5, z: 0 },
            primitive: { kind: "octahedron", radius: 0.22 },
            material: { color: "oklch(0.86 0.17 85)", emissive: "oklch(0.86 0.17 85)", emissiveIntensity: 1.4, opacity: 0.8 },
            physics: "none",
            castShadow: false,
            visible: false,
            visibleTo: "editors",
        },
      ]),
    };
  }

  if (asset.kind === "image") {
    return {
      tags: [TAG, "image"],
      feetPosition: feet,
        rotation: { pitch: 90 },
        primitive: { kind: "plane", width: 3, height: 3 }, anchor: "center", pivot: "center",
        material: { texture: asset.path, roughness: 0.85 },
        physics: { body: "static", collider: "box" },
    };
  }

  const spec = {
    tags: [TAG, asset.kind],
    feetPosition: feet,
      model: asset.path,
      physics: { body: "static", collider: "auto" },
  };
  // Some bodies come home with a skeleton and a clip list; the ones the rigging
  // pass couldn't read — wolves, wurms, wyverns — come home as one static lump.
  // Those get the shared gait library instead, so nothing stands frozen.
  const gait = gaitTag(asset);
  if (gait) {
    spec.behavior = critterPath(api);
    spec.state = { gait: gait, critterName: asset.name || asset.path };
    spec.physics = { body: "static", collider: "box" };
  } else if ((asset.clips || []).length) {
    spec.behavior = idlePath(api);
    spec.state = { clip: idleClip(asset.clips) };
    // A box around a breathing body: still grabbable, no mesh collider fighting
    // the animation.
    spec.physics = { body: "static", collider: "box" };
  }
  return spec;
}

export function place(api, asset, point) {
  const spec = placeSpec(api, asset, point);
  if (!spec) return null;
  const made = persistSpawn(api, placedId(api, asset), spec);
  // Placed from inside god mode, so its handle is wanted right now — the spec
  // keeps it hidden for everybody who isn't flying.
  if (made && asset.kind === "effect") showHandles(api, true);
  return made;
}

// ---- the shooter ---------------------------------------------------------
// A card's picture has to BE the asset, so we stand the real thing in front of
// the creator's camera against a plain backdrop and let the panel photograph
// the frame. No conjured lookalikes anywhere in this tool.

export function clearStage(api) {
  for (const row of api.query({ tags: [TAG, "stage"], radius: 100000 }) || []) api.destroy(row.id);
}

export function stagePath(api) {
  const all = api.listScripts() || [];
  return all.find((p) => /asset-library\/stage\.js$/.test(p)) || "scripts/asset-library/stage.js";
}

export function stageAsset(api, asset) {
  clearStage(api);
  const cam = api.getCamera();
  const p = (cam && cam.position) || { x: 0, y: 3, z: 0 };
  const f = (cam && cam.forward) || { x: 0, y: 0, z: -1 };
  const len = Math.max(0.0001, Math.sqrt(f.x * f.x + f.y * f.y + f.z * f.z));
  const dir = { x: f.x / len, y: f.y / len, z: f.z / len };
  // Provisional spot 4m out; stage.js re-frames it off the model's real bounds
  // the moment the body serves, and only then calls for the shutter.
  const backId = api.spawn({
    tags: [TAG, "stage"],
    lifetime: 40,
    feetPosition: { x: p.x + dir.x * 9, y: p.y - 3, z: p.z + dir.z * 9 },
      primitive: { kind: "plane", width: 20, height: 20 }, anchor: "center", pivot: "center",
      rotation: { lookAt: { x: p.x, y: p.y, z: p.z } },
      material: { color: "oklch(0.29 0.02 265)", roughness: 0.95, metalness: 0 },
      physics: "none",
      castShadow: false,
      scale: 1,
  });
  // A motion card's picture is a body IN the pose: the same booth, with the
  // player riding along and the motion written on the body it stands up.
  const wearing = asset.motion ? MK.playPath(api) : null;
  const spot = { x: p.x + dir.x * 4, y: p.y + dir.y * 4 - 1, z: p.z + dir.z * 4 };
  // A geometry effect (a scripted primitive — HYLLA's furniture rows) has no
  // model file: the booth stands the row's own properties up instead. Its
  // handle child and collider stay out of the portrait.
  const geo = asset.kind === "effect" && asset.props && asset.props.primitive;
  const body = geo
    ? Object.assign({}, placeSpec(api, asset, spot), {
        feetPosition: spot,
        rotation: { lookAt: { x: p.x, y: p.y, z: p.z } },
        physics: "none",
        castShadow: false,
      })
    : {
        feetPosition: spot,
        model: asset.path,
        rotation: { lookAt: { x: p.x, y: p.y, z: p.z } },
        physics: "none",
        castShadow: false,
      };
  const staged = api.spawn({
    tags: [TAG, "stage"],
    lifetime: 40,
    behavior: wearing ? [stagePath(api), wearing] : stagePath(api),
    state: {
      cam: { x: p.x, y: p.y, z: p.z },
      fwd: dir,
      asset: asset.id,
      back: backId,
      tries: 0,
      framed: false,
      motion: asset.motion || null,
      motionLoop: asset.loop || null,
    },
    ...body,
  });
  // A body still cooking has no skeleton for the clip to bind to, and
  // motion-play only re-arms when state.motion CHANGES — so nudge the flag once
  // the model has had a second to serve, and it binds against a real rig.
  if (wearing && staged) {
    api.runInSeconds(1, () => {
      try {
        api.patchObjectState(staged, { motionPlaying: "__restage" });
      } catch (e) {
        /* the booth expired */
      }
    });
  }
  return staged;
}

// ---- what this project is already wearing --------------------------------
// The Project tab needs to know every asset this game actually uses. Nothing
// lists a project's uploads, but the game itself names them: every /cdn/ path
// in the spec and in the scripts is an asset in use. We read those.

const CDN_RE = /\/cdn\/[A-Za-z0-9_\-./]+\.(?:glb|gltf|png|jpg|jpeg|webp|mp3|wav|ogg|mp4)(?:\?[A-Za-z0-9_,=&%\-.]*)?/g;

export function noteUse(found, path, where) {
  const clean = String(path).split("#")[0];
  if (!clean) return;
  const row = found[clean] || (found[clean] = { path: clean, where: [], uses: 0 });
  row.uses += 1;
  if (where && row.where.length < 4 && row.where.indexOf(where) < 0) row.where.push(where);
}

// Walk the spec looking for asset paths, carrying a short human label for
// where each one was found ("main/oak-tree", "main atmosphere", "player").
export function walkSpec(node, label, found, depth) {
  if (depth > 12 || node == null) return;
  if (typeof node === "string") {
    const hits = node.match(CDN_RE);
    if (hits) for (const h of hits) noteUse(found, h, label);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkSpec(item, label, found, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  for (const key of Object.keys(node)) {
    let next = label;
    if (key === "objects" || key === "places" || key === "properties" || key === "materials") next = label;
    else if (!label) next = key;
    else if (label.split("/").length < 3 && /^[a-z0-9_\-]+$/i.test(key) && key.length < 40) next = label + "/" + key;
    walkSpec(node[key], next, found, depth + 1);
  }
}

export function scanProject(api) {
  const found = {};
  let spec = null;
  try {
    spec = api.getSpec();
  } catch (e) {
    spec = null;
  }
  if (spec) {
    // `scripts` is skipped on purpose: the loop below reads script bodies with a
    // filename label, and the shelf module itself must not count as "in use".
    for (const key of Object.keys(spec)) {
      if (key === "scripts") continue;
      walkSpec(spec[key], key === "places" ? "" : key, found, 0);
    }
  }
  const scripts = api.listScripts() || [];
  for (const p of scripts) {
    // The shelf modules themselves must not count as "in use" — and the shelf is
    // a loader plus its numbered shards now, so every one of them is skipped.
    if (/lib\/(catalog(-\d+)?|project)\.js$/.test(p)) continue;
    let src = "";
    try {
      src = api.getScript(p) || "";
    } catch (e) {
      src = "";
    }
    const hits = src.match(CDN_RE);
    if (!hits) continue;
    const short = p.split("/").pop();
    for (const h of hits) noteUse(found, h, short);
  }

  // Runtime-spawned objects never reach the spec, but they are absolutely in
  // this game — anything already placed from the shelf lives here.
  try {
    const live = api.query({ radius: 100000 }) || [];
    for (const row of live) {
      const view = api.getObject(row.id);
      if (!view || !view) continue;
      walkSpec(view, String(row.id).slice(0, 28), found, 8);
    }
  } catch (e) {
    /* a scan with no live read is still a scan */
  }

  // Anything on the shelf is in this project too, even if nothing in the world
  // wears it yet — the Project tab lists everything, and the sync pill is what
  // says which is which.
  try {
    // The shelf is written across a loader and its shards, so every module it
    // rides gets read — one file back in the pre-shard layout.
    for (const shelf of catalogSources(api)) {
      // Only the "path" field — a card's photograph is not an asset of the project.
      for (const m of String(shelf || "").match(/"path":"[^"]+"/g) || []) {
        const clean = m.slice(9, -1).split("#")[0];
        if (!/^\/cdn\//.test(clean)) continue;
        if (found[clean]) continue;
        found[clean] = { path: clean, where: ["the shelf"], uses: 0 };
      }
    }
  } catch (e) {
    /* no shelf to fold in */
  }

  // Last, whatever he pointed at by hand — a pin outlives every rescan.
  for (const pin of storedPins(api)) {
    const row = found[pin.path];
    if (row) {
      if (pin.seen && row.where.length < 4 && row.where.indexOf(pin.seen) < 0) row.where.push(pin.seen);
    } else {
      found[pin.path] = { path: pin.path, where: [pin.seen || "picked in the world"], uses: 1 };
    }
  }

  const rows = Object.keys(found).map((path) => {
    const r = found[path];
    return {
      path: path,
      kind: S.kindFromPath(path),
      name: S.prettyName(path),
      clips: S.clipsFromPath(path),
      where: r.where,
      uses: r.uses,
    };
  });
  rows.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind.localeCompare(b.kind)));
  return rows;
}

// ---- pinned by hand ------------------------------------------------------
// The reading is good, never perfect: an asset can hide inside a path the game
// builds at runtime, or ride a child nothing in the spec names. So he can point
// instead — select the thing in the world, hit ＋ add selection, and every asset
// path it wears is pinned onto the Project list. Pins live in the game's own
// table, so the next rescan folds them back in rather than forgetting them.
export function pinTable(api) {
  if (!api.sql) return false;
  try {
    api.sql`CREATE TABLE IF NOT EXISTS al_project_pins (path TEXT PRIMARY KEY, seen TEXT, added INTEGER)`;
    return true;
  } catch (e) {
    return false;
  }
}

export function storedPins(api) {
  if (!pinTable(api)) return [];
  try {
    const rows = api.sql`SELECT path, seen FROM al_project_pins ORDER BY added ASC` || [];
    const out = [];
    for (const r of rows) {
      const path = String((r && r.path) || "");
      if (path) out.push({ path, seen: String((r && r.seen) || "") });
    }
    return out;
  } catch (e) {
    return [];
  }
}

export function storePin(api, path, seen) {
  if (!pinTable(api)) return;
  let tick = 0;
  try {
    tick = api.getTick ? api.getTick() : 0;
  } catch (e) {
    tick = 0;
  }
  try {
    api.sql`INSERT OR REPLACE INTO al_project_pins (path, seen, added) VALUES (${String(path)}, ${String(seen || "")}, ${Number(tick) || 0})`;
  } catch (e) {
    /* the row still shows up in this scan */
  }
}

// Everything the selected things wear, pinned and published in one gesture.
export function syncSelection(api, payload) {
  const given = payload && Array.isArray(payload.ids) ? payload.ids.filter(Boolean) : [];
  const ids = given.length ? given : api.getSelectedEntityIds ? api.getSelectedEntityIds() || [] : [];
  if (!ids.length) {
    api.notifyDm("Asset Library: nothing is selected — click the thing in the world first, then hit ＋ add selection.");
    return 0;
  }
  const found = {};
  for (const id of ids) {
    const label = String(id).split("/").pop().slice(0, 28);
    let spec = null;
    try {
      spec = api.getObjectSpec ? api.getObjectSpec(id) : null;
    } catch (e) {
      spec = null;
    }
    if (spec) walkSpec(spec, label, found, 8);
    const view = api.getObject(id);
    if (view) walkSpec(view, label, found, 8);
    if (view && view.state) walkSpec(view.state, label, found, 8);
  }
  const paths = Object.keys(found);
  if (!paths.length) {
    api.notifyDm(
      "Asset Library: " +
        (ids.length === 1 ? "that piece" : "those " + ids.length + " pieces") +
        " wears no asset file — nothing to add. Shapes drawn in code have no path to pin."
    );
    return 0;
  }
  for (const p of paths) storePin(api, p, (found[p].where || [])[0] || "picked in the world");
  publishProject(api);
  const names = paths.map((p) => S.prettyName(p));
  api.notifyDm(
    "Asset Library: added " +
      (paths.length === 1 ? "1 asset" : paths.length + " assets") +
      " from what you had selected — " +
      names.slice(0, 4).join(", ") +
      (names.length > 4 ? " and " + (names.length - 4) + " more" : "") +
      ". They're on the Project list now."
  );
  return paths.length;
}

export function publishProject(api) {
  const rows = scanProject(api);
  const trimmed = rows.slice(0, 240);
  const source =
    "// Asset Library — what this project is wearing. Generated by the Project tab.\nmodule.exports = [\n" +
    trimmed.map((r) => "  " + JSON.stringify(r)).join(",\n") +
    "\n];\n";
  persist(api, () => api.setScript(projectPath(api), source));
  api.uiEvent("alProject", { rows: trimmed, total: rows.length });
  return trimmed.length;
}

// ---- sets ----------------------------------------------------------------
// A set is a group of placed things that keeps its arrangement — a castle with
// its buildings, its furniture and its people, lifted out of one scene and set
// down in another. No file stands behind it: the members ARE the asset, so the
// shelf carries them, and only the world half can read the scene. Every shape
// here is lib/store.js's (MEMBER_PROPS, normalizeMembers, setSpan, makeAsset);
// nothing below re-invents that schema.

// The shelf as data. The catalog modules are generated JSON rows, so reading the
// source back is exact — a require() would hand us whatever was compiled before
// the last write.
//
// Every module the catalog is written across, in row order: the loader first,
// then the shards it names. One file back in the pre-shard layout, which is what
// an installed mod from an older release still has.
export function catalogSources(api) {
  let src = "";
  try {
    src = api.getScript(catalogPath(api)) || "";
  } catch (e) {
    src = "";
  }
  const out = [src];
  // A loader names its shards in literal require() calls; the old layout has the
  // rows themselves. Which one this is decides where to read from.
  if (src.indexOf('require("lib/catalog-') < 0) return out;
  const count = S.CATALOG_SHARDS || 8;
  for (let n = 1; n <= count; n++) {
    let part = "";
    try {
      part = api.getScript(catalogShardPath(api, n)) || "";
    } catch (e) {
      part = "";
    }
    out.push(part);
  }
  return out;
}

export function parseCatalogWhole(src) {
  const open = src.indexOf("[");
  const close = src.lastIndexOf("]");
  if (open < 0 || close <= open) return [];
  try {
    const rows = JSON.parse(src.slice(open, close + 1));
    return Array.isArray(rows) ? rows.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

export function parseCatalog(api) {
  const srcs = catalogSources(api);
  if (srcs.length === 1) return parseCatalogWhole(srcs[0]);
  if (typeof S.parseCatalogFiles === "function") return S.parseCatalogFiles(srcs[0], srcs.slice(1));
  // An older lib/store.js beside this god.js — read the shards the plain way.
  const rows = [];
  for (const part of srcs.slice(1)) for (const row of parseCatalogWhole(part)) rows.push(row);
  return rows;
}

// The half of the shelf that belongs to this game alone — the rows it added on
// top of the shipment, and the shipped rows it took off. Empty in the workshop,
// where every row is a travelling one.
// The one-file layout this replaced: module.exports = { rows, hidden } as JSON.
// Still read, because an installed game that hasn't saved since the shards
// landed still has its shelf written that way.
export function parseLocalWhole(src) {
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

export function parseLocal(api) {
  let src = "";
  try {
    src = api.getScript(localPath(api)) || "";
  } catch (e) {
    src = "";
  }
  // A loader names its shards in literal require() calls; the old layout has
  // the rows themselves. Which one this is decides where to read from.
  if (src.indexOf('require("lib/local-') < 0) return parseLocalWhole(src);
  const count = S.LOCAL_SHARDS || 8;
  const sources = [];
  for (let n = 1; n <= count; n++) {
    let part = "";
    try {
      part = api.getScript(localShardPath(api, n)) || "";
    } catch (e) {
      part = "";
    }
    sources.push(part);
  }
  if (typeof S.parseLocalFiles === "function") return S.parseLocalFiles(src, sources);
  // An older lib/store.js beside this god.js — read the shards the plain way.
  const rows = [];
  for (const part of sources) {
    const open = part.indexOf("[");
    const close = part.lastIndexOf("]");
    if (open < 0 || close <= open) continue;
    try {
      const arr = JSON.parse(part.slice(open, close + 1));
      if (Array.isArray(arr)) for (const row of arr) if (row) rows.push(row);
    } catch (e) {}
  }
  const hid = /hidden"?\s*:\s*(\[[^\]]*\])/.exec(src);
  let hidden = [];
  if (hid) {
    try {
      hidden = JSON.parse(hid[1]) || [];
    } catch (e) {
      hidden = [];
    }
  }
  return { rows, hidden };
}

// The effect rows, read the same exact way — source in, JSON out.
export function parseEffects(api) {
  let src = "";
  try {
    src = api.getScript(effectsPath(api)) || "";
  } catch (e) {
    src = "";
  }
  const open = src.indexOf("[");
  const close = src.lastIndexOf("]");
  if (open < 0 || close <= open) return [];
  try {
    const rows = JSON.parse(src.slice(open, close + 1));
    return Array.isArray(rows) ? rows.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

// Everything that arrived with the mod: the shelf rows and the effect library.
export function parseShipped(api) {
  return parseCatalog(api).concat(parseEffects(api));
}

// The whole shelf as anybody reads it: shipment plus this game's own.
export function parseShelf(api) {
  return S.mergeShelf(parseShipped(api), parseLocal(api));
}

// …exact, but not instant. A behavior reads the spec ITS session last compiled,
// so a set captured a moment ago can still be missing from that view — the
// creator saves a castle, clicks place, and the shelf says it never happened.
// So every set this entity writes is also held in session state and folded back
// over the parsed rows: freshest copy wins, a set dropped here stays dropped.
export function setCache(api) {
  const st = api.getState() || {};
  return st.setCache && typeof st.setCache === "object" ? st.setCache : {};
}

export function rememberSet(api, row) {
  const cache = Object.assign({}, setCache(api));
  cache[row.id] = row;
  api.patchState({ setCache: cache });
}

export function forgetSet(api, id) {
  const cache = Object.assign({}, setCache(api));
  cache[String(id)] = false;
  api.patchState({ setCache: cache });
}

// …and the module the panel reads is a PUBLICATION, not the record. A set is
// born in the world, the world half cannot read its own writes back, and the
// panel's list can arrive without it — three ways for a captured castle to
// vanish. So sets are kept in a table, and the module is rewritten from it.
export function setTable(api) {
  if (!api.sql) return false;
  try {
    api.sql`CREATE TABLE IF NOT EXISTS al_sets (id TEXT PRIMARY KEY, name TEXT, added INTEGER, row TEXT)`;
    return true;
  } catch (e) {
    return false;
  }
}

export function storedSets(api) {
  if (!setTable(api)) return [];
  try {
    const rows = api.sql`SELECT row FROM al_sets ORDER BY added DESC` || [];
    const out = [];
    for (const r of rows) {
      try {
        const a = JSON.parse(r.row);
        if (a && a.id) out.push(a);
      } catch (e) {
        /* a row we can't read is a row we don't publish */
      }
    }
    return out;
  } catch (e) {
    return [];
  }
}

export function storeSet(api, row) {
  if (!setTable(api)) return;
  try {
    api.sql`INSERT OR REPLACE INTO al_sets (id, name, added, row) VALUES (${row.id}, ${row.name}, ${Number(row.added) || 0}, ${JSON.stringify(row)})`;
  } catch (e) {
    /* the session copy still carries it */
  }
}

export function unstoreSet(api, id) {
  if (!setTable(api)) return;
  try {
    api.sql`DELETE FROM al_sets WHERE id = ${String(id)}`;
  } catch (e) {
    /* nothing to forget */
  }
}

// Every set the world knows: the table, overwritten by anything this session
// wrote, minus anything this session dropped.
export function worldSets(api) {
  const cache = setCache(api);
  const out = [];
  const seen = {};
  for (const k of Object.keys(cache)) {
    const row = cache[k];
    if (row && row.id) {
      out.push(row);
      seen[row.id] = true;
    } else if (cache[k] === false) {
      seen[k] = true;
    }
  }
  for (const row of storedSets(api)) if (!seen[row.id]) out.push(row);
  return out;
}

export function readCatalog(api) {
  const rows = parseShelf(api);
  const world = worldSets(api);
  const byId = {};
  for (const w of world) byId[w.id] = w;
  const cache = setCache(api);
  const out = [];
  const seen = {};
  for (const r of rows) {
    if (!r) continue;
    if (r.kind === "set" && cache[r.id] === false) continue;
    const fresh = r.kind === "set" && byId[r.id] ? byId[r.id] : r;
    out.push(fresh);
    if (fresh.id) seen[fresh.id] = true;
  }
  for (const w of world) if (!seen[w.id]) out.unshift(w);
  return out;
}

// The members never ride in on the payload — the panel only knows a card's id
// and name. Match hardest first: id, then path, then the name the creator typed
// (a set re-saved with a different piece count earns a new id hash, and a card
// the panel read before that still points at the old one).
export function pickSet(sets, id, hint) {
  const want = String(id || (hint && hint.id) || "").trim();
  const path = String((hint && hint.path) || "");
  const name = String((hint && hint.name) || "").trim().toLowerCase();
  for (const a of sets) if (want && a.id === want) return a;
  for (const a of sets) if (path && a.path === path) return a;
  for (const a of sets) if (name && String(a.name || "").toLowerCase() === name) return a;
  const stem = want ? want.replace(/^set-/, "").replace(/-\d{3,6}$/, "") : "";
  if (stem) for (const a of sets) if (S.slug(a.name) === stem || a.path === "set:" + stem) return a;
  return null;
}

export function setLookup(api, id, hint) {
  const list = readCatalog(api);
  const sets = list.filter((a) => a && a.kind === "set");
  return { row: pickSet(sets, id, hint), rows: list.length, sets: sets.length };
}

export function findSet(api, id, hint) {
  return setLookup(api, id, hint).row;
}

export function missingSetDm(api, id, look) {
  api.notifyDm(
    "Asset Library: no set matched " + (id || "that card") + " — searched " + look.rows + " shelf rows (" + look.sets +
      " of them sets). Nothing was placed."
  );
}

export function r3(v) {
  const n = Number(v);
  return isFinite(n) ? Math.round(n * 1000) / 1000 : 0;
}

// The live view reports a packed colour where the spec says oklch. Convert
// rather than drop: a captured piece should look like the piece it came from.
export function hexColor(n) {
  const v = (Number(n) >>> 0) & 0xffffff;
  let s = v.toString(16);
  while (s.length < 6) s = "0" + s;
  return "#" + s;
}

export function cleanMaterial(mat) {
  if (!mat || typeof mat !== "object") return mat;
  const out = {};
  for (const k of Object.keys(mat)) {
    if (k === "key") continue; // a runtime family handle, not something to author
    const v = mat[k];
    out[k] = (k === "color" || k === "emissive") && typeof v === "number" ? hexColor(v) : v;
  }
  return out;
}

export function memberProps(src) {
  const props = {};
  for (const k of S.MEMBER_PROPS) {
    const v = src ? src[k] : undefined;
    if (v === undefined || v === null) continue;
    if (k === "visible" && v === true) continue; // the default, and it only bloats the row
    props[k] = k === "material" ? cleanMaterial(v) : v;
  }
  return props;
}

export function memberPath(props) {
  const m = props.model;
  if (typeof m === "string" && m) return m;
  if (m && typeof m === "object" && m.id) return String(m.id);
  if (props.sprite && props.sprite.texture) return String(props.sprite.texture);
  if (props.material && props.material.texture) return String(props.material.texture);
  return "";
}

export function parentOf(api, id) {
  try {
    const spec = api.getObjectSpec ? api.getObjectSpec(id) : null;
    if (spec && spec.parent) return String(spec.parent);
  } catch (e) {
    /* runtime-only, ask the view */
  }
  try {
    const view = api.getObject(id);
    const p = view && view.parent;
    if (p) return String(p);
  } catch (e) {
    /* gone */
  }
  return "";
}

export function hasSelectedAncestor(api, id, inSet) {
  let cur = parentOf(api, id);
  for (let i = 0; i < 8 && cur; i++) {
    if (inSet[cur]) return true;
    cur = parentOf(api, cur);
  }
  return false;
}

// Install-proof, the same habit catalogPath keeps: a behavior captured in the
// workshop reads scripts/asset-library/idle.js, and the same file in an
// installed mod reads mods/asset-library/idle.js. Match the filename when the
// exact path is gone, and carry nothing that isn't really there.
export function resolveBehavior(api, path, scripts) {
  return S.resolveScript(scripts || api.listScripts() || [], path);
}

// A piece's whole script stack, put back. Anything this game hasn't got is
// dropped and named — that is the honest answer when a set saved beside AI
// Brains is set down in a world where nobody installed it.
export function resolveBehaviors(api, list, scripts) {
  return S.resolveScripts(scripts || api.listScripts() || [], list);
}

// Read the scene. Anything whose parent is also selected is dropped: a
// generator root rebuilds its own children, so capturing both would duplicate
// them on the way back down.
export function captureMembers(api, ids) {
  const inSet = {};
  for (const id of ids) inSet[String(id)] = true;
  const raw = [];
  for (const id of ids) {
    if (hasSelectedAncestor(api, id, inSet)) continue;
    const view = api.getObject(id);
    if (!view) continue;
    const tags = view.tags || [];
    if (tags.indexOf("ghost") >= 0 || tags.indexOf("stage") >= 0 || tags.indexOf("preview") >= 0) continue;
    // The capture box is the lens, never a member — saving it would make every
    // drop of the set spit out another box.
    if (tags.indexOf("capture-box") >= 0 || String(id).indexOf("capture-box") === 0) continue;
    let spec = null;
    try {
      spec = api.getObjectSpec ? api.getObjectSpec(id) : null;
    } catch (e) {
      spec = null;
    }
    // The authored row is the honest source — the live view reports resolved
    // defaults (physics with its collider forgotten, a packed colour). A
    // runtime-only piece has no row, so there the view is all there is.
    const src = (spec) || view || {};
    const props = memberProps(src);
    if (!props.model && !props.primitive && !props.sprite && !props.text && !props.light) continue;
    const path = memberPath(props);
    // Every script it was wearing, in order: idle.js keeps it breathing, a brain
    // keeps it thinking, the plate keeps its knobs reachable. Dropping all but
    // the first is how a captured guard used to land as furniture.
    const behaviors = S.normalizeBehaviors(spec && spec.behavior);
    // state.clip is what keeps a captured villager breathing after the drop.
    const live = view.state && Object.keys(view.state).length ? view.state : null;
    const state = live || (spec && spec.state) || null;
    const feet = (view.worldFeetPosition ?? view.feetPosition) || { x: 0, y: 0, z: 0 };
    raw.push({
      id: String(id),
      name: path ? S.prettyName(path) : String(id).split("/").pop(),
      path,
      props,
      behaviors,
      state,
      tags: tags.filter((t) => t !== TAG),
      feet: { x: Number(feet.x) || 0, y: Number(feet.y) || 0, z: Number(feet.z) || 0 },
    });
  }
  if (!raw.length) return [];
  // The anchor: the group's mean ground footprint, sitting at its lowest feet.
  // Everything is measured from there, so a piece that sat on the ground lands
  // on the ground and a lantern three metres up stays three metres up.
  let sx = 0;
  let sz = 0;
  let low = Infinity;
  for (const r of raw) {
    sx += r.feet.x;
    sz += r.feet.z;
    if (r.feet.y < low) low = r.feet.y;
  }
  const anchor = { x: sx / raw.length, y: low, z: sz / raw.length };
  // Who else got captured, by index — so "this guard is about that captain"
  // survives as a relationship instead of an entity id from another scene.
  const indexOf = {};
  for (let i = 0; i < raw.length; i++) indexOf[raw[i].id] = i;
  const memberOf = (id) => (indexOf[id] === undefined ? -1 : indexOf[id]);
  return S.normalizeMembers(
    raw.map((r) => ({
      name: r.name,
      path: r.path,
      props: r.props,
      behaviors: r.behaviors,
      // A thinking body's route and home are pinned to the ground it thinks on,
      // so they are stored relative to the set and re-pinned where it lands.
      state: BK.packState(r.state, anchor, memberOf),
      tags: r.tags,
      off: { x: r3(r.feet.x - anchor.x), y: r3(r.feet.y - anchor.y), z: r3(r.feet.z - anchor.z) },
    }))
  );
}

export function nextAdded(list) {
  let n = 0;
  for (const a of list || []) n = Math.max(n, Number(a && a.added) || 0);
  return n + 1;
}

// Everything planted in the capture box right now, read straight off the box's
// own footprint — the same rule the box's chip uses (feet decide membership).
export function insideBox(api) {
  const box = api.getObject("capture-box-1");
  if (!box) return [];
  const p = box || {};
  const prim = p.primitive || {};
  const sc = p.scale;
  const s = typeof sc === "number" ? { x: sc, y: sc, z: sc } : sc || {};
  const w = (Number(prim.width) || 10) * (Number(s.x) || 1);
  const h = (Number(prim.height) || 6) * (Number(s.y) || 1);
  const d = (Number(prim.depth) || 10) * (Number(s.z) || 1);
  const feet = (box.worldFeetPosition ?? box.feetPosition) || (p.worldFeetPosition ?? p.feetPosition) || { x: 0, y: 0, z: 0 };
  const cx = Number(feet.x) || 0;
  const cz = Number(feet.z) || 0;
  const fy = Number(feet.y) || 0;
  const c = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, minY: fy - 0.75, maxY: fy + h };
  const radius = Math.sqrt(w * w + h * h + d * d) / 2 + 1;
  const found = api.query({ center: { x: cx, y: fy + h / 2, z: cz }, radius: radius }) || [];
  const out = [];
  for (const o of found) {
    const id = String(o.id || "");
    const tags = o.tags || [];
    if (!id || id.indexOf("capture-box") === 0) continue;
    if (tags.indexOf("capture-box") >= 0 || tags.indexOf("ghost") >= 0 || tags.indexOf("stage") >= 0 || tags.indexOf("preview") >= 0) continue;
    const f = (o.worldFeetPosition ?? o.feetPosition);
    if (!f) continue;
    if (f.x < c.minX || f.x > c.maxX || f.z < c.minZ || f.z > c.maxZ) continue;
    if (f.y != null && (f.y < c.minY || f.y > c.maxY)) continue;
    out.push(id);
  }
  return out;
}

// What the capture box last framed. God mode owns the selection and hands it
// back to whatever the creator clicked last — usually the box itself — so the
// box's own memory of "Select inside" outlives the selection that made it.
export function boxHeld(api) {
  const seen = {};
  const out = [];
  const take = (state) => {
    const held = state && state.held;
    if (!Array.isArray(held)) return;
    for (const id of held) {
      const key = String(id);
      if (!key || seen[key]) continue;
      seen[key] = true;
      out.push(key);
    }
  };
  try {
    take(api.getObjectState("capture-box-1"));
  } catch (e) {
    /* no box out */
  }
  if (!out.length) {
    try {
      const view = api.getObject("capture-box-1");
      take(view && view.state);
    } catch (e) {
      /* no box out */
    }
  }
  if (!out.length) {
    const boxes = api.query({ tags: ["capture-box"], center: { x: 0, y: 1, z: 0 }, radius: 100000 }) || [];
    for (const b of boxes) take(b.state);
  }
  // Last resort, and the kindest one: nobody has to press "select inside" at all
  // — if a box is standing over a scene, whatever is planted in it IS the set.
  if (!out.length) {
    for (const id of insideBox(api)) {
      if (!seen[id]) {
        seen[id] = true;
        out.push(id);
      }
    }
  }
  // Only pieces still standing can be captured.
  return out.filter((id) => {
    try {
      return !!api.getObject(id);
    } catch (e) {
      return false;
    }
  });
}

export function saveSet(api, payload) {
  const given = Array.isArray(payload.ids) ? payload.ids.filter(Boolean) : [];
  let ids = given.length ? given : (api.getSelectedEntityIds ? api.getSelectedEntityIds() || [] : []);
  let members = ids.length ? captureMembers(api, ids) : [];
  let fromBox = false;
  if (!members.length) {
    const held = boxHeld(api);
    if (held.length) {
      ids = held;
      members = captureMembers(api, held);
      fromBox = members.length > 0;
    }
  }
  if (!members.length) {
    api.notifyDm(
      ids.length
        ? "Asset Library: none of the " + ids.length + " selected things had anything to capture (no model, primitive, sprite, text or light). The shelf is untouched."
        : "Asset Library: nothing was selected, so there was no set to save. Stretch the capture box over the scene and hit “select inside”, or shift + right-click the pieces — the shelf is untouched."
    );
    return 0;
  }
  const list = readCatalog(api);
  const name = String(payload.name || "Untitled Set").slice(0, 64);
  const row = S.makeAsset({
    name,
    path: S.setPath(name),
    kind: "set",
    tags: payload.tags || [],
    note: String(payload.note || ""),
    members,
    autoTag: true,
    added: nextAdded(list),
  });
  const at = list.findIndex((a) => a && a.kind === "set" && (a.id === row.id || a.path === row.path));
  if (at >= 0) list[at] = row;
  else list.unshift(row);
  storeSet(api, row);
  rememberSet(api, row);
  const wrote = saveCatalog(api, list);
  api.notifyDm(
    "Asset Library: saved the set “" + row.name + "” (" + row.id + ") — " + members.length + " piece" +
      (members.length === 1 ? "" : "s") + (fromBox ? " from the capture box" : "") + ", " + row.span.w + "x" + row.span.d + "m" +
      (at >= 0 ? ", replaced the set of the same name" : "") + ". Wrote " + wrote + " shelf rows to " + catalogPath(api) + "."
  );
  return members.length;
}

// Where a set lands. The panel's drop is the same screen-aim path a single card
// takes; a script can hand an explicit world point in `at` instead.
export function setPoint(api, payload, input) {
  const at = payload && payload.at;
  if (at && isFinite(Number(at.x)) && isFinite(Number(at.z))) {
    const x = Number(at.x);
    const z = Number(at.z);
    return { x, y: groundAt(api, x, z, Number(at.y) || 0), z };
  }
  return dropPoint(api, payload || {}, input);
}

// ---- sets by reference (plan 08) -------------------------------------------
// A set row may carry only a pointer: { ref: { file, key } }, the members living
// in an unrequired data file inside the mod folder (data/sets-<place>.json),
// read with getScript. A file that isn't there, doesn't parse, or has no such
// key is a clean miss — one DM, nothing spawned — never a half-placed set.
export function refFilePath(api, file) {
  const want = String(file || "").replace(/^\.?\//, "");
  const all = api.listScripts() || [];
  const tail = want.replace(/^scripts\//, "").replace(/^mods\/asset-library\//, "").replace(/^asset-library\//, "");
  const hit = all.find((p) => p.indexOf("asset-library") >= 0 && (p === tail || p.slice(-(tail.length + 1)) === "/" + tail));
  if (hit) return hit;
  return catalogPath(api).replace(/lib\/catalog\.js$/, tail);
}

export function readSetRef(api, row) {
  const ref = row && row.ref;
  if (!ref || !ref.file) return { ok: false, why: "no ref" };
  const path = refFilePath(api, ref.file);
  let src = "";
  try {
    src = api.getScript(path) || "";
  } catch (e) {
    src = "";
  }
  if (!src) return { ok: false, why: "missing file " + path };
  let doc = null;
  try {
    doc = JSON.parse(src);
  } catch (e) {
    return { ok: false, why: path + " did not parse" };
  }
  const sets = doc && typeof doc === "object" ? doc.sets || doc : null;
  const entry = sets && ref.key ? sets[ref.key] : null;
  const members = entry && Array.isArray(entry.members) ? entry.members : Array.isArray(entry) ? entry : null;
  if (!members || !members.length) return { ok: false, why: "no set “" + ref.key + "” in " + path };
  const made = S.makeAsset({ id: row.id, name: row.name, path: row.path, kind: "set", tags: row.tags, members, span: entry.span || row.span });
  if (!made.members.length) return { ok: false, why: "set “" + ref.key + "” has no placeable members" };
  return { ok: true, members: made.members, span: made.span, file: path };
}

// The members a set really has: inline when the row carries them, else read
// through its reference.
export function setMembers(api, row) {
  if (row && Array.isArray(row.members) && row.members.length) return { ok: true, members: row.members };
  return readSetRef(api, row);
}

export function placeSet(api, row, point) {
  const got = setMembers(api, row);
  if (!got.ok) {
    api.notifyDm("Asset Library: the set “" + (row && row.name) + "” has no members to place — " + got.why + ". Nothing was placed.");
    return [];
  }
  const members = got.members;
  const base = placedId(api, row);
  // Terrain-off places answer no ground height: there the drop point's own y
  // (the raycast hit, the floor slab, an explicit at.y) is the floor, and
  // off.y is a lift above it. Heightmap places keep the hillside rule.
  const ground = api.getTerrainHeight(point.x, point.z);
  const onTerrain = typeof ground === "number";
  const made = [];
  const scripts = api.listScripts() || [];
  // The piece ids are decided before anything is spawned, so a body that is
  // about another member of the same set can be pointed at it on the way down.
  const idAt = (n) => (n >= 0 && n < members.length ? base + "-piece-" + (n + 1) : "");
  const hasBody = (id) => {
    try {
      return !!api.getObject(id);
    } catch (e) {
      return false;
    }
  };
  const thinking = [];
  const skipped = [];
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const props = Object.assign({}, m.props || {});
    // Ground under each piece plus its own lift: the arrangement survives, and
    // so does the hillside it lands on.
    props.feetPosition = onTerrain
      ? { x: point.x + m.off.x, z: point.z + m.off.z, y: { terrain: m.off.y } }
      : { x: point.x + m.off.x, y: (Number(point.y) || 0) + m.off.y, z: point.z + m.off.z };
    const spec = { tags: [TAG, "set-piece", row.id], ...props };
    if (Array.isArray(m.children) && m.children.length) spec.children = m.children;
    const worn = resolveBehaviors(api, m.behaviors !== undefined ? m.behaviors : m.behavior, scripts);
    if (worn.kept.length) spec.behavior = worn.kept.length === 1 ? worn.kept[0] : worn.kept;
    // A brain whose script isn't in this game is a brain that cannot think:
    // the body lands as plain scenery rather than wearing a dead vocabulary.
    const lost = worn.missing.some((p) => BK.isBrainScript(p));
    const brain = BK.brainOf(m);
    const state = lost ? BK.stripBrain(m.state) : BK.unpackState(m.state, point, idAt, hasBody);
    if (state) spec.state = state;
    const id = persistSpawn(api, base + "-piece-" + (i + 1), spec);
    if (id) made.push(id);
    if (brain) (lost ? skipped : thinking).push(brain);
  }
  api.notifyDm(
    "Asset Library: dropped the set “" + row.name + "” — " + made.length + " of " + members.length + " pieces at " +
      point.x.toFixed(1) + ", " + point.z.toFixed(1) + "." +
      (thinking.length ? " " + thinking.length + " of them woke up thinking (" + thinking.join(", ") + ")." : "") +
      (skipped.length
        ? " " + skipped.length + " saved brain" + (skipped.length === 1 ? "" : "s") + " stayed asleep (" + skipped.join(", ") +
          ") — the AI Brains mod isn't installed here."
        : "")
  );
  return made;
}

export function dropSet(api, id) {
  const want = String(id || "");
  const list = readCatalog(api);
  const gone = list.filter((a) => a && a.kind === "set" && (a.id === want || a.path === want));
  const next = list.filter((a) => gone.indexOf(a) < 0);
  if (!gone.length) {
    api.notifyDm("Asset Library: no set called " + want + " on the shelf (" + list.length + " rows searched) — nothing removed.");
    return 0;
  }
  for (const row of gone) forgetSet(api, row.id);
  saveCatalog(api, next, gone.map((a) => a.id).concat([want]));
  api.notifyDm("Asset Library: took the set " + want + " off the shelf.");
  return list.length - next.length;
}

// ---- actions -------------------------------------------------------------

// The panel sends its whole list, and a panel that mounted before a set was
// captured still remembers the shelf without it. Sets are born in the world, so
// they outlive a stale list: one the panel didn't send stays, unless the same
// payload names it in dropSets (which is how the panel's remove and alSetDrop
// agree on a real deletion).
// Writing this game's own shelf is a multi-file job: the rows are resharded
// every save and lib/local.js is rewritten as the loader over them. One
// persistence scope for the whole set — a scope costs the client a stall
// whatever its size, and a half-written shelf is a shelf that lost rows.
//
// An unused shard slot is written EMPTY rather than deleted: the loader's
// require list is fixed at LOCAL_SHARDS entries, and a ref with no module
// behind it parks a compile report against every new spec version. Only a
// shard past the end of the list (an older, wider layout) is really deleted.
export function writeLocal(api, own) {
  const files = S.serializeLocal(own);
  if (typeof files === "string") {
    // An older lib/store.js beside a newer god.js — write the one file it knows
    // rather than dropping rows on the floor.
    persist(api, () => api.setScript(localPath(api), files));
    return { rows: (own && own.rows && own.rows.length) || 0, shards: 0 };
  }
  const slots = files.shards.length;
  const stale = [];
  for (const p of api.listScripts() || []) {
    if (p.indexOf("asset-library") < 0) continue;
    const m = /(^|\/)lib\/local-(\d+)\.js$/.exec(p);
    if (m && Number(m[2]) > slots) stale.push(p);
  }
  persist(api, () => {
    for (let i = 0; i < slots; i++) api.setScript(localShardPath(api, i + 1), files.shards[i].source);
    api.setScript(localPath(api), files.loader);
    for (const p of stale) if (typeof api.deleteScript === "function") api.deleteScript(p);
  });
  return { rows: files.rows, shards: slots, used: files.used };
}

// ---- appending rows to this game's own shelf --------------------------------
// A behavior may read the spec ITS session last compiled, so a shelf written a
// moment ago can read back without the rows it just gained (the setCache /
// matCache law). Every row this session appended or re-photographed is held in
// state.shelfCache and folded over the parsed shards — freshest copy wins — so
// a second append, or the thumb batch that follows one, never drops them.
export function shelfCache(api) {
  const st = api.getState() || {};
  return st.shelfCache && typeof st.shelfCache === "object" ? st.shelfCache : {};
}

export function rememberRows(api, rows) {
  const cache = Object.assign({}, shelfCache(api));
  for (const r of rows || []) if (r && r.id) cache[r.id] = r;
  api.patchState({ shelfCache: cache });
}

// The local shelf as this session knows it: the shards, overlaid by the cache.
export function localNow(api) {
  const local = parseLocal(api);
  const cache = shelfCache(api);
  // A row this session took off stays off, whatever the stale shards still say.
  const rows = (local.rows || []).filter((r) => !(r && cache[r.id] === false));
  const at = {};
  for (let i = 0; i < rows.length; i++) if (rows[i] && rows[i].id) at[rows[i].id] = i;
  for (const id of Object.keys(cache)) {
    const row = cache[id];
    if (!row) continue;
    if (at[id] !== undefined) rows[at[id]] = row;
    else {
      at[id] = rows.length;
      rows.push(row);
    }
  }
  return { rows, hidden: local.hidden || [] };
}

// (packer reserves the shard wrapper since store.js v2620 — see packRows)
const APPEND_BAND = [12000, 12399];
const APPEND_ADDED_MIN = 9820;

// Append rows to this game's own shelf — the ONLY way new rows land there
// (never a shard splice, never alSave). The whole batch is refused when any
// row collides with a seated id or path, breaks the id/added law (tail in the
// band, added at or past the base — `loose: true` waives the law for rows that
// are not HYLLA's), or would push a shard past its budget.
export function appendLocal(api, payload) {
  const p = payload || {};
  const incoming = (Array.isArray(p.rows) ? p.rows : []).filter(Boolean);
  if (!incoming.length) {
    api.notifyDm("Asset Library: localAppend got no rows — nothing written.");
    return { ok: false, added: 0, why: "no rows" };
  }
  const band = Array.isArray(p.band) && p.band.length === 2 ? p.band : APPEND_BAND;
  const addedMin = isFinite(Number(p.addedMin)) ? Number(p.addedMin) : APPEND_ADDED_MIN;
  const local = localNow(api);
  const seated = {};
  for (const r of parseShipped(api).concat(local.rows)) {
    if (!r) continue;
    if (r.id) seated["i:" + r.id] = true;
    if (r.path) seated["p:" + r.path] = true;
  }
  const made = [];
  const bad = [];
  for (const raw of incoming) {
    const row = S.makeAsset(raw);
    if (!row.path) {
      bad.push((row.id || "?") + ": no path");
      continue;
    }
    if (seated["i:" + row.id]) bad.push(row.id + ": id already on the shelf");
    else if (seated["p:" + row.path]) bad.push(row.id + ": path " + row.path + " already on the shelf");
    if (!p.loose) {
      const m = /-(\d+)$/.exec(row.id);
      const tail = m ? Number(m[1]) : NaN;
      if (!(tail >= band[0] && tail <= band[1])) bad.push(row.id + ": id tail outside " + band[0] + "–" + band[1]);
      if (!(Number(row.added) >= addedMin)) bad.push(row.id + ": added " + row.added + " < " + addedMin);
    }
    seated["i:" + row.id] = true;
    seated["p:" + row.path] = true;
    made.push(row);
  }
  if (bad.length) {
    api.notifyDm("Asset Library: localAppend refused the whole batch (" + incoming.length + " rows) — " + bad.slice(0, 6).join("; ") + (bad.length > 6 ? " … +" + (bad.length - 6) : ""));
    return { ok: false, added: 0, why: bad };
  }
  const next = { rows: local.rows.concat(made), hidden: local.hidden };
  const files = S.serializeLocal(next);
  const over = typeof files === "string" ? [] : files.shards.filter((s) => s.source.length > (S.LOCAL_SHARD_CHARS || 500000));
  if (over.length) {
    api.notifyDm("Asset Library: localAppend refused — the shelf would overflow " + over.length + " shard(s) past " + (S.LOCAL_SHARD_CHARS || 500000) + " chars. Nothing written.");
    return { ok: false, added: 0, why: "shard overflow" };
  }
  const res = writeLocal(api, next);
  rememberRows(api, made);
  api.patchState({ lastAppend: { added: made.length, rows: res.rows, ids: made.map((r) => r.id) } });
  api.notifyDm("Asset Library: appended " + made.length + (made.length === 1 ? " row" : " rows") + " to this game's shelf — now " + res.rows + " local rows across " + (res.used || res.shards) + " shard(s). Close and reopen the Assets tab to see them.");
  return { ok: true, added: made.length, rows: res.rows };
}

// The undo for an append: take named rows back off this game's shelf, same road.
export function removeLocal(api, ids) {
  const want = {};
  for (const id of Array.isArray(ids) ? ids : []) want[String(id)] = true;
  const local = localNow(api);
  const rows = local.rows.filter((r) => !(r && (want[r.id] || want[r.path])));
  const gone = local.rows.length - rows.length;
  if (!gone) return 0;
  writeLocal(api, { rows, hidden: local.hidden });
  const cache = Object.assign({}, shelfCache(api));
  for (const id of Object.keys(want)) cache[id] = false;
  api.patchState({ shelfCache: cache, lastRemove: { gone } });
  api.notifyDm("Asset Library: took " + gone + " row" + (gone === 1 ? "" : "s") + " off this game's shelf.");
  return gone;
}

// One photograph batch onto the local shelf: [{ id, thumb }] → the row's thumb,
// ONE writeLocal for the lot (a per-shot write would rebuild from the
// pre-session shelf each time and, after a localAppend in the same session,
// drop every appended row).
export function writeThumbs(api, thumbs) {
  const list = (Array.isArray(thumbs) ? thumbs : []).filter((t) => t && t.id && typeof t.thumb === "string");
  if (!list.length) return 0;
  const local = localNow(api);
  const want = {};
  for (const t of list) want[String(t.id)] = t.thumb;
  let hit = 0;
  const touched = [];
  const rows = local.rows.map((r) => {
    if (!r || want[r.id] === undefined) return r;
    hit++;
    const next = Object.assign({}, r, { thumb: want[r.id] });
    touched.push(next);
    return next;
  });
  if (!hit) {
    api.notifyDm("Asset Library: " + list.length + " photograph(s) arrived for rows that are not on this game's shelf — nothing written.");
    return 0;
  }
  writeLocal(api, { rows, hidden: local.hidden });
  rememberRows(api, touched);
  api.notifyDm("Asset Library: filed " + hit + "/" + list.length + " photograph" + (list.length === 1 ? "" : "s") + " onto the shelf.");
  return hit;
}

// The travelling shelf is a multi-file write for exactly the same reason: the
// rows are resharded every save and lib/catalog.js is rewritten as the loader
// over them. Shards land BEFORE the loader so no window loses rows, and all of
// it rides ONE persistence scope — a scope costs the client a stall whatever
// its size, and a half-written shelf is a shelf that lost rows.
//
// An unused shard slot is written EMPTY rather than deleted: the loader's
// require list is fixed at CATALOG_SHARDS entries, and a ref with no module
// behind it parks a compile report against every new spec version. Only a shard
// past the end of the list (an older, wider layout) is really deleted.
export function writeCatalog(api, shelf) {
  const files = S.serializeCatalog(shelf);
  if (typeof files === "string") {
    // An older lib/store.js beside a newer god.js — write the one file it knows
    // rather than shipping nothing.
    persist(api, () => api.setScript(catalogPath(api), files));
    return { rows: (shelf || []).length, shards: 0 };
  }
  const slots = files.shards.length;
  const stale = [];
  for (const p of api.listScripts() || []) {
    if (p.indexOf("asset-library") < 0) continue;
    const m = /(^|\/)lib\/catalog-(\d+)\.js$/.exec(p);
    if (m && Number(m[2]) > slots) stale.push(p);
  }
  persist(api, () => {
    for (let i = 0; i < slots; i++) api.setScript(catalogShardPath(api, i + 1), files.shards[i].source);
    api.setScript(catalogPath(api), files.loader);
    for (const p of stale) if (typeof api.deleteScript === "function") api.deleteScript(p);
  });
  return { rows: files.rows, shards: slots, used: files.used };
}

export function saveCatalog(api, assets, dropSets) {
  // Motion rows are generated from lib/motions.js at render time and are never
  // catalog rows — one that wandered in through a stale panel never lands here.
  const incoming = (assets || []).filter(Boolean).filter((a) => a.kind !== "motion");
  const sent = {};
  for (const a of incoming) {
    if (a.id) sent["i:" + a.id] = true;
    if (a.path) sent["p:" + a.path] = true;
  }
  const drop = {};
  for (const d of dropSets || []) drop[String(d)] = true;
  for (const id of Object.keys(drop)) unstoreSet(api, id);
  const kept = worldSets(api).filter((a) => !drop[a.id] && !drop[a.path] && !sent["i:" + a.id] && !sent["p:" + a.path]);
  const list = kept.concat(incoming);
  if (isWorkshop(api)) {
    // Building the mod: this IS the travelling shelf. The effect library is its
    // own module (lib/effects.js) and never rides along in here.
    const shelf = list.filter((a) => a && a.kind !== "effect");
    writeCatalog(api, shelf);
  } else {
    // Installed: the shipment stays untouched so the next release can bring new
    // rows in, and only what this game did differently is written down.
    const own = S.splitShelf(list, parseShipped(api));
    writeLocal(api, own);
  }
  return list.length;
}

// Crates are the panel's own bookkeeping — a name, who packed it, and which
// shelf paths belong to it. The world half only writes them down, the same way
// it writes the shelf: whole list in, whole module out.
export function saveCrates(api, crates) {
  const list = (crates || []).filter(Boolean).map((c) => S.makeCrate(c));
  persist(api, () => api.setScript(cratesPath(api), S.serializeCrates(list)));
  return list.length;
}

// ---- materials -----------------------------------------------------------
// The shelf goes stale the moment somebody dresses a wall in something new. So
// the scan reads the whole game — every script body, every place's terrain
// materials, every object's material and sprite — keeps only the surfaces
// (texture-… / tex-…), and writes whatever the shelf hasn't got into this
// game's own module as image rows whose picture IS the texture itself.

// What this session already wrote. The world half reads the spec ITS session
// last compiled, so a scan fired twice in a row can look at a local.js without
// the first scan's rows in it — and would happily write them a second time.
export function matCache(api) {
  const st = api.getState() || {};
  return st.matCache && typeof st.matCache === "object" ? st.matCache : {};
}

export function rememberMats(api, rows) {
  const cache = Object.assign({}, matCache(api));
  for (const row of rows || []) if (row && row.path) cache[MAT.normKey(row.path)] = row;
  api.patchState({ matCache: cache });
}

export function matScan(api) {
  const local = parseLocal(api);
  const rows = (local.rows || []).slice();
  const seen = {};
  for (const r of rows) if (r && r.path) seen[MAT.normKey(r.path)] = true;
  const cache = matCache(api);
  for (const key of Object.keys(cache)) {
    if (seen[key]) continue;
    rows.push(cache[key]);
    seen[key] = true;
  }
  const res = MAT.scan(api, [parseCatalog(api), rows]);
  if (!res.rows.length) {
    api.notifyDm(
      "Asset Library: re-read this game for materials — " +
        res.scanned +
        (res.scanned === 1 ? " surface texture" : " surface textures") +
        " in use, every one already on the shelf. Nothing added."
    );
    return 0;
  }
  const next = { rows: rows.concat(res.rows), hidden: local.hidden || [] };
  writeLocal(api, next);
  rememberMats(api, res.rows);
  const names = res.rows.slice(0, 8).map((r) => r.name).join(", ");
  api.notifyDm(
    "Asset Library: read " +
      res.scanned +
      " surface textures in this game and put " +
      res.rows.length +
      (res.rows.length === 1 ? " new one" : " new ones") +
      " on the shelf — " +
      names +
      (res.rows.length > 8 ? " …" : "") +
      ". Close and reopen the Assets tab to see them."
  );
  return res.rows.length;
}

// A material card landing on something real. The write is a dot-path, so the
// colour and roughness a surface already carries survive it; a scripted
// material is a program and is never overwritten, only named.
export function paintCard(api, asset, ids, where) {
  const path = String((asset && asset.path) || "");
  if (!path) return 0;
  const name = (asset && asset.name) || MAT.materialName(path);
  const list = (ids || []).filter(Boolean);
  if (!list.length) {
    api.notifyDm("Asset Library: nothing is selected — click the thing you want dressed, then hit 🖌 paint.");
    return 0;
  }
  const res = MAT.paintMaterial(api, list, path);
  if (res.painted.length) {
    try {
      api.highlight(list[0], { color: "oklch(0.86 0.17 145)", style: "pulse", duration: 0.9 });
    } catch (e) {
      /* highlight is a nicety */
    }
  }
  const bits = [];
  bits.push(
    res.painted.length
      ? "dressed " + res.painted.length + (res.painted.length === 1 ? " piece" : " pieces") + " in " + name
      : "nothing took " + name
  );
  bits.push("on " + list.slice(0, 4).join(", ") + (list.length > 4 ? " …" : ""));
  if (res.scripted.length) {
    bits.push(
      "skipped " +
        res.scripted.length +
        (res.scripted.length === 1 ? " scripted material" : " scripted materials") +
        " — " +
        res.scripted.slice(0, 6).join(", ") +
        (res.scripted.length > 6 ? " …" : "") +
        " (their surface is drawn by code; a texture would switch it off)"
    );
  }
  api.notifyDm("Asset Library: " + bits.join(" · ") + (where ? " (" + where + ")" : ""));
  return res.painted.length;
}

export function applyToSelection(api, asset, mode) {
  const ids = api.getSelectedEntityIds ? api.getSelectedEntityIds() || [] : [];
  if (!ids.length) {
    // Nothing selected is not a dead end — the asset lands in front of the view.
    place(api, asset, dropPoint(api, { aim: "front" }));
    return 0;
  }
  for (const id of ids) {
    if (mode === "skin") {
      api.setObjectProperty(id, "material.texture", asset.path);
    } else if (mode === "swap") {
      api.setObjectProperty(id, "model", asset.path);
    } else if (mode === "clips") {
      const view = api.getObject(id);
      const current = view && view.model;
      const stem = S.basePath(typeof current === "string" && current ? current : asset.path);
      const clips = (asset.clips || []).join(",");
      api.setObjectProperty(id, "model", clips ? stem + "?animations=" + clips : stem);
    }
  }
  return ids.length;
}

export function onInput(api, input) {
  const data = input.actionData || {};

  if (input.actions.alSave && data.alSave) {
    saveCatalog(api, data.alSave.assets, data.alSave.dropSets);
  }

  if (input.actions.alSetSave && data.alSetSave) {
    saveSet(api, data.alSetSave);
  }

  if (input.actions.alSetPlace && data.alSetPlace) {
    const p = data.alSetPlace;
    const look = setLookup(api, p.id, p.asset);
    if (look.row) placeSet(api, look.row, setPoint(api, p, input));
    else missingSetDm(api, p.id, look);
  }

  if (input.actions.alSetDrop && data.alSetDrop) {
    dropSet(api, data.alSetDrop.id);
  }

  if (input.actions.alWheel) {
    const w = data.alWheel || {};
    api.notifyDmOnce(
      "alx-wheel-receipt",
      "Asset Library: the panel DID receive a wheel notch (dy " +
        w.dy +
        ", mode " +
        w.mode +
        ", ctrl " +
        w.ctrl +
        ") and scrolled its list " +
        w.from +
        " → " +
        w.to +
        ". The engine kept its own copy for the dolly."
    );
  }

  if (input.actions.alScan) {
    publishProject(api);
  }

  // 🎨 Scan materials — read this game's surfaces and shelve the new ones.
  if (input.actions.alMatScan) {
    matScan(api);
  }

  // 🖌 paint — the same dressing the drop does, handed to the selection.
  if (input.actions.alMatPaint && data.alMatPaint) {
    const asset = data.alMatPaint.asset;
    const ids = api.getSelectedEntityIds ? api.getSelectedEntityIds() || [] : [];
    if (asset && asset.path) paintCard(api, asset, ids, "painted onto the selection");
  }

  if (input.actions.alCrateSave && data.alCrateSave) {
    const p = data.alCrateSave;
    if (Array.isArray(p.assets)) saveCatalog(api, p.assets, p.dropSets);
    saveCrates(api, p.crates);
    if (p.dm) api.notifyDm("Asset Library: " + String(p.dm).slice(0, 240));
  }

  if (input.actions.alSyncSel) {
    syncSelection(api, data.alSyncSel || {});
  }

  if (input.actions.alPlace && data.alPlace) {
    const asset = data.alPlace.asset;
    if (asset && asset.path) {
      const point = dropPoint(api, data.alPlace, input);
      place(api, asset, point);
    }
  }

  if (input.actions.alGhost && data.alGhost) {
    const asset = data.alGhost.asset;
    if (asset && (asset.path || asset.kind === "set")) {
      clearGhost(api);
      const point = dropPoint(api, Object.assign({ aim: "screen" }, data.alGhost), input);
      // A set card carries no members and often no span — the shelf has both.
      const card =
        asset.kind === "set" ? Object.assign({}, asset, { span: (findSet(api, asset.id, asset) || {}).span || asset.span }) : asset;
      const id = api.spawn(ghostSpec(card, point, api));
      api.patchState({ ghostId: id, ghostAsset: card });
    }
  }

  if (input.actions.alGhostMove && data.alGhostMove) {
    const st = api.getState() || {};
    moveGhost(api, dropPoint(api, Object.assign({ aim: "screen" }, data.alGhostMove), input, st.ghostId ? [st.ghostId] : null));
  }

  if (input.actions.alGhostDrop && data.alGhostDrop) {
    const st = api.getState() || {};
    const asset = st.ghostAsset;
    const aim = Object.assign({ aim: "screen" }, data.alGhostDrop);
    const ignore = st.ghostId ? [st.ghostId] : null;
    const point = dropPoint(api, aim, input, ignore);
    // Only a material card asks what it landed on — everything else stands
    // where the cursor was, exactly as before.
    const onto = asset && asset.kind === "image" ? dropHitId(api, aim, input, ignore) : null;
    clearGhost(api);
    if (asset && asset.kind === "set") {
      const look = setLookup(api, asset.id, asset);
      if (look.row) placeSet(api, look.row, point);
      else missingSetDm(api, asset.id, look);
    } else if (asset && asset.kind === "image" && onto) {
      // A material card that lands ON something dresses it. Only open ground
      // gets the flat picture panel.
      paintCard(api, asset, [onto], "dropped straight onto it");
    } else if (asset && asset.path) {
      place(api, asset, point);
      api.notifyDm(
        "Asset Library: dropped " + asset.name + " at " +
          point.x.toFixed(1) + ", " + point.z.toFixed(1) +
          " (cursor " + Math.round(Number(data.alGhostDrop.x) || 0) + "," + Math.round(Number(data.alGhostDrop.y) || 0) +
          " of " + Math.round(Number(data.alGhostDrop.w) || 0) + "x" + Math.round(Number(data.alGhostDrop.h) || 0) + ")"
      );
    }
    api.patchState({ ghostAsset: null });
  }

  if (input.actions.alGhostCancel) {
    clearGhost(api);
    api.patchState({ ghostAsset: null });
  }

  // ---- motions ------------------------------------------------------------
  // A motion card dropped on the world: whatever the cursor was over gets it.
  if (input.actions.alMotion && data.alMotion) {
    const p = data.alMotion;
    const cam = api.getCamera();
    let hitId = null;
    if (cam) {
      const ray = cursorRay(api, cam, p, input);
      const hit = api.raycast(ray.origin, ray.direction, { distance: 300 });
      hitId = hit ? hit.objectId : null;
    }
    motionLanded(api, MK.applyMotion(api, hitId, p.key, { loop: p.loop }), p.label || p.key);
  }

  // The same motion, handed to whatever is selected — the road the other kinds
  // take when a card is clicked instead of dragged.
  if (input.actions.alMotionApply && data.alMotionApply) {
    const p = data.alMotionApply;
    const ids = api.getSelectedEntityIds ? api.getSelectedEntityIds() || [] : [];
    if (!ids.length) {
      sayMotion(api, "nothing selected — drag it onto a body, or click the body first");
    } else {
      let last = null;
      let hits = 0;
      for (const id of ids) {
        last = MK.applyMotion(api, id, p.key, { loop: p.loop });
        if (last.ok) hits++;
      }
      if (hits > 1) sayMotion(api, (p.label || p.key) + " is on " + hits + " bodies");
      else motionLanded(api, last, p.label || p.key);
    }
  }

  // Taking it back off: state.motion clears and motion-play hands the body back
  // to its own idle clip.
  if (input.actions.alMotionClear) {
    const ids = api.getSelectedEntityIds ? api.getSelectedEntityIds() || [] : [];
    if (!ids.length) {
      sayMotion(api, "nothing selected — click the body you want to stop first");
    } else {
      let cleared = 0;
      let name = "";
      for (const id of ids) {
        const res = MK.clearMotion(api, id);
        if (res.ok) {
          cleared++;
          name = res.name;
        }
      }
      sayMotion(api, cleared ? (cleared === 1 ? name + " is back to its own idle" : cleared + " bodies back to their idles") : "nothing selected was wearing one");
      if (cleared) api.notifyDm("Asset Library: took the motion off " + cleared + (cleared === 1 ? " body" : " bodies"));
    }
  }

  if (input.actions.alMotionShot && data.alMotionShot) {
    saveMotionShots(api, data.alMotionShot.shots);
  }

  if (input.actions.alPreview && data.alPreview) {
    const asset = data.alPreview.asset;
    if (asset && asset.path) {
      const cam = api.getCamera();
      const p = cam ? cam.position : { x: 0, y: 2, z: 0 };
      api.spawn({
        tags: [TAG, "preview"],
        lifetime: 10,
        feetPosition: { x: p.x, y: p.y, z: p.z },
          audio: { clip: asset.path, loop: false, spatial: false, gain: 0.8 },
      });
    }
  }

  if (input.actions.alShoot && data.alShoot) {
    const asset = data.alShoot.asset;
    if (asset && asset.path) stageAsset(api, asset);
  }

  if (input.actions.alUnshoot) {
    clearStage(api);
  }

  // One photograph batch for geometry rows (thumbs onto the local shelf).
  if (input.actions.alThumb && data.alThumb) {
    writeThumbs(api, data.alThumb.thumbs);
  }

  // The panel-lane road for appending rows, for when a script's emit can't
  // reach this ear.
  if (input.actions.alLocalAppend && data.alLocalAppend) {
    appendLocal(api, data.alLocalAppend);
  }

  if (input.actions.alApply && data.alApply) {
    const asset = data.alApply.asset;
    if (asset && asset.path) applyToSelection(api, asset, data.alApply.mode);
  }

  if (input.actions.alMint && data.alMint) {
    const asset = data.alMint.asset;
    if (asset && asset.path) {
      api.notifyDm("Asset Library: minted " + asset.name + " → " + asset.path + " (" + asset.kind + ")");
    }
  }

  // Sweep the bench: everything this tool put in the world goes away, so the next
  // test starts on clean ground. The capture box stays — it is the lens, not scenery.
  if (input.actions.alClear) {
    const rows = api.query({ center: { x: 0, y: 1, z: 0 }, radius: 100000 }) || [];
    const doomed = [];
    for (const row of rows) {
      const id = String(row.id);
      const tags = row.tags || [];
      if (id.indexOf("/handle") >= 0 || id.indexOf("__god_mode") >= 0) continue;
      if (tags.indexOf("capture-box") >= 0 || id.indexOf("capture-box") === 0) continue;
      if (tags.indexOf(TAG) >= 0) doomed.push(id);
    }
    persist(api, () => {
      for (const id of doomed) {
        try {
          api.destroy(id);
        } catch (e) {
          /* an orphan from a dead session refuses — the DM says so */
        }
      }
    });
    const left = (api.query({ tags: [TAG], center: { x: 0, y: 1, z: 0 }, radius: 100000 }) || []).filter(
      (r) => (r.tags || []).indexOf("capture-box") < 0
    );
    api.notifyDm(
      left.length
        ? "Asset Library: cleared " +
            doomed.length +
            " placed pieces, but " +
            left.length +
            " won't go — they belong to an earlier session. Ask me to reboot the room and they're gone."
        : "Asset Library: cleared the scene — " +
            doomed.length +
            (doomed.length === 1 ? " placed piece gone." : " placed pieces gone.")
    );
  }

  // "💬 tell savi" — the shelf card, handed over as a sentence she can act on.
  // Everything she'd otherwise have to go hunting for goes in one line: the row
  // id to look it up by, the path to place or read, the tags and clips.
  if (input.actions.alShare && data.alShare) {
    const a = data.alShare.asset || {};
    const bits = [];
    if (a.kind) bits.push(a.kind);
    if (a.kind === "set") {
      const n = Array.isArray(a.members) ? a.members.length : 0;
      if (n) bits.push(n + (n === 1 ? " piece" : " pieces"));
      if (a.span && a.span.w) bits.push(a.span.w + "x" + a.span.d + "m");
    } else if (a.path) {
      bits.push(a.path);
    }
    const clips = Array.isArray(a.clips) ? a.clips.filter(Boolean) : [];
    if (clips.length) bits.push("clips " + clips.slice(0, 12).join(", "));
    const tags = Array.isArray(a.tags) ? a.tags.filter(Boolean) : [];
    if (tags.length) bits.push("tagged " + tags.slice(0, 8).join(", "));
    const thumb = a.thumb || (a.kind === "image" ? a.path : "");
    if (thumb) bits.push("card picture " + thumb);
    api.notifyDm(
      "Asset Library — the creator just pressed “💬 tell savi” on a shelf card: “" + (a.name || a.id || "unnamed") + "” (" +
        (a.id || "no id") + "). " + bits.join(" · ") + ". " +
        "SAY IT BACK: answer in chat with one short line naming this card (name + kind + clips) so they can see you have it, then wait — " +
        "whatever they ask next is about THIS asset. No card image unless they ask; the pictures render huge. " +
        "And use this path when you build with it — it already exists, so don't conjure a replacement."
    );
  }

  if (input.actions.alRequest && data.alRequest) {
    const names = (data.alRequest.names || []).join(", ");
    api.notifyDm("Asset Library: tried to drop " + names + " on the shelf — models and audio need to come in through chat. Shelve them for me?");
  }
}

// The same set verbs, reachable from a script instead of the panel: emit
// "assetLibrary" with { verb: "setSave" | "setPlace" | "setDrop", ... } and the
// world half answers with the same code the buttons run. The panel never needs
// this — it exists so a set can be captured or dropped without god mode (and so
// the verbs can be exercised from a run_script).
// The effect handles are god-mode-only furniture, and this script IS the god
// mode session: it rides the god entity, which is born when somebody flies in
// and dies when they drop out. So waking here shows the markers and dying here
// puts them away — runtime writes, never persisted, so a rebuilt world comes
// back with them hidden.
export function showHandles(api, on) {
  let hits = [];
  try {
    hits = api.query({ tags: [HANDLE_TAG], radius: 100000, center: { x: 0, y: 0, z: 0 } }) || [];
  } catch (e) {
    hits = [];
  }
  for (const h of hits) {
    try {
      api.setObjectProperty(h.id, "visible", !!on);
    } catch (e) {
      /* gone already */
    }
  }
  return hits.length;
}

// Effects placed before the handles existed are still standing out there with
// nothing to click. Give each one its marker the first time a god-mode session
// finds it bare.
export function healHandles(api) {
  let fx = [];
  try {
    fx = api.query({ tags: [TAG, "effect"], radius: 100000, center: { x: 0, y: 0, z: 0 } }) || [];
  } catch (e) {
    return 0;
  }
  if (!fx.length) return 0;
  const handled = {};
  let marks = [];
  try {
    marks = api.query({ tags: [HANDLE_TAG], radius: 100000, center: { x: 0, y: 0, z: 0 } }) || [];
  } catch (e) {
    marks = [];
  }
  for (const m of marks) {
    const p = api.getParent ? api.getParent(m.id) : null;
    const pid = typeof p === "string" ? p : p && p.id;
    if (pid) handled[pid] = true;
  }
  const script = S.resolveScript(api.listScripts() || [], "asset-library/effect-plate.js") || "scripts/asset-library/effect-plate.js";
  let made = 0;
  for (const f of fx) {
    if (handled[f.id]) continue;
    const view = api.getObject(f.id);
    const name = (view && view.name) || "effect";
    persist(api, () =>
      api.spawn({
        parent: f.id,
        tags: [HANDLE_TAG],
        state: { fxName: name },
        behavior: script,
        feetPosition: { x: 0, y: 0.5, z: 0 },
          primitive: { kind: "octahedron", radius: 0.22 },
          material: { color: "oklch(0.86 0.17 85)", emissive: "oklch(0.86 0.17 85)", emissiveIntensity: 1.4, opacity: 0.8 },
          physics: "none",
          castShadow: false,
          visible: false,
          visibleTo: "editors",
      })
    );
    made++;
  }
  return made;
}

export function onDestroy(api) {
  try {
    showHandles(api, false);
  } catch (e) {
    /* leaving god mode; nothing else to do */
  }
}

export function onSpawn(api) {
  // A transactional spawn (an entity born inside a run_script) cannot install
  // ears — that is the engine's rule, not a fault worth reporting, and the
  // action lane below is untouched either way.
  try {
    healHandles(api);
    showHandles(api, true);
  } catch (e) {
    /* no handles yet */
  }
  try {
    armVerbs(api);
  } catch (e) {
    /* no ear here; the panel's actions still land in onInput */
  }
  // The Project tab is a list of what THIS game is wearing. The list travels
  // inside the mod as a generated module, so a fresh install would otherwise
  // open showing the workshop it was published from. Re-read the game the
  // moment the world half wakes up here, and rewrite the list if it is
  // somebody else's — nobody has to press rescan to see their own project.
  try {
    healProject(api);
  } catch (e) {
    /* the ↻ rescan button still does it by hand */
  }
}

export function healProject(api) {
  const rows = scanProject(api).slice(0, 240);
  let stale = [];
  try {
    const src = api.getScript(projectPath(api)) || "";
    const open = src.indexOf("[");
    const close = src.lastIndexOf("]");
    if (open >= 0 && close > open) {
      const parsed = JSON.parse(src.slice(open, close + 1));
      stale = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    }
  } catch (e) {
    stale = [];
  }
  const key = (list) =>
    (list || [])
      .map((r) => String((r && (r.path || r.name)) || ""))
      .sort()
      .join("|");
  if (key(stale) === key(rows)) return 0;
  const source =
    "// Asset Library — what this project is wearing. Generated by the Project tab.\nmodule.exports = [\n" +
    rows.map((r) => "  " + JSON.stringify(r)).join(",\n") +
    "\n];\n";
  persist(api, () => api.setScript(projectPath(api), source));
  api.notifyDm(
    "Asset Library: the Project tab was showing another game's assets — rescanned this one, " +
      rows.length +
      (rows.length === 1 ? " asset" : " assets") +
      " found. Close and reopen the Assets tab to see them."
  );
  return rows.length;
}

export function armVerbs(api) {
  // The dressing lane's door from a run_script: api.emit("al:localAppend", { rows }).
  api.on("al:localAppend", (_ctx, msg) => {
    appendLocal(api, msg || {});
  });
  api.on("al:thumb", (_ctx, msg) => {
    writeThumbs(api, (msg || {}).thumbs);
  });
  api.on("assetLibrary", (_ctx, msg) => {
    const p = msg || {};
    if (p.verb === "setSave") {
      saveSet(api, p);
    } else if (p.verb === "localAppend") {
      appendLocal(api, p);
    } else if (p.verb === "localRemove") {
      removeLocal(api, p.ids);
    } else if (p.verb === "thumb") {
      writeThumbs(api, p.thumbs);
    } else if (p.verb === "setPlace") {
      const look = setLookup(api, p.id, p.asset);
      if (look.row) placeSet(api, look.row, setPoint(api, p, null));
      else missingSetDm(api, p.id, look);
    } else if (p.verb === "probe") {
      // What the world half can actually see of the shelf right now — the
      // answer to "I just saved it and place says it isn't there".
      const list = readCatalog(api);
      api.patchState({
        probe: {
          rows: list.length,
          ids: list.map((a) => a && a.id),
          sets: list.filter((a) => a && a.kind === "set").map((a) => a.id),
          scriptRows: parseCatalog(api).length,
          path: catalogPath(api),
        },
      });
    } else if (p.verb === "place" && p.asset && p.asset.path) {
      // The shelf's own drop, reachable from a script: the same road the dragged
      // card takes — placeSpec, the persist lane, the same id counter — so a
      // placement can be exercised (and checked) without a cursor. { at:{x,z} }
      // names the spot; without one it lands in front of the view.
      const at = p.at && typeof p.at.x === "number" ? { x: p.at.x, y: Number(p.at.y) || 0, z: Number(p.at.z) || 0 } : dropPoint(api, { aim: "front" });
      place(api, p.asset, at);
    } else if (p.verb === "matScan") {
      // The materials rescan, reachable without god mode — same code the
      // 🎨 button runs.
      matScan(api);
    } else if (p.verb === "paint" && p.asset && p.asset.path) {
      const ids = Array.isArray(p.ids) && p.ids.length ? p.ids : api.getSelectedEntityIds ? api.getSelectedEntityIds() || [] : [];
      paintCard(api, p.asset, ids, "painted by script");
    } else if (p.verb === "setDrop") {
      dropSet(api, p.id);
    } else if (p.verb === "save") {
      saveCatalog(api, p.assets, p.dropSets);
    }
  });
}


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
