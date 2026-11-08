const PACKAGE_PATH=require("lib/package-path.js");
// Shoot adapter: read and parse a scene card, replace its tagged set, then send the timed camera/action/sound plan through optional Cinema and Film Kit contracts. Source pages stay unchanged; all spawned set pieces share SET_TAG for cleanup.

const SPEC = require("lib/shootspec.js");
const PATH = require("lib/workbench-path.js");
// THE SOUND GRAMMAR, a pure leaf beside the shoot grammar: the scene card's Sound section, read as cue rows and scheduled onto the plan's own clock. Its cues ride out on the SAME clip payload — the director already owns an audio channel (playSound / musicShift on its effects track), so nothing here builds a second player.
const SOUND = require("lib/soundspec.js");
const ORIGIN = require("lib/sound-origin.js");
const ROLL = require("lib/pianoroll.js");
const DOCUMENT = require("lib/document-reference.js");
// THE CUE CONDUCTOR — Codex's own playback for those cues. jace, 2026-08-26: "We do not need absolute cinema's thingy.
const SOUNDPLAY = require("lib/soundplay.js");
const BODY = require("lib/cardbody.js");
const CARDS = require("lib/cards.js");
const REFS = require("lib/refs.js");
// The Asset Library shelf, read-only — the vocabulary a bare-word cue source resolves through, the same one #[asset:…] uses. Zero SQL: the shelf is a generated module read with getScript and cached on its own text, so a cue naming a file costs the compile nothing at all.
const SHELF = require("lib/assetshelf.js");
// THE LIGHT (jace: "moonlit" is a mood, and "atmo transitions should happen IN PAGE"): a page's #[atmo: …] token is read at compile through this lens | a preset id or name, the nearest preset sharing a word, or free text that paints nothing. lib/atmokitchen.js is read-only data; no mod surface, no writes.
const KITCHEN = require("lib/atmokitchen.js");

const VERSION = 1;

// Every object this lane puts in the world wears this. It is the ONLY thing dress() will destroy,
// so a shoot can never eat the room's own furniture.
const SET_TAG = "sb-set";

// An id prefix that reads in a query result and in god mode: sb-set-brother-kael-1.
const ID_PREFIX = "sb-set-";

// The behavior every MODEL set piece wears (the player's courier is attached the same way, minus "scripts/"): it holds state.pose through the mixer and plays state.act when the courier writes one. Primitives and lights wear nothing — there is no clip to hold.
const SET_PIECE_BEHAVIOR = "set-piece.js";

// A set larger than this is almost certainly a runaway reference, not a scene. It is a guard, not a
// budget: the author is told the number and nothing is silently dropped past it.
const SET_CAP = 120;

export function text(v) {
  return typeof v === "string" ? v : v === 0 || v ? String(v) : "";
}

export function slug(v) {
  return text(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "thing";
}

// ── 1. READ — the card, as a scene. ────────────────────────────────────────── The lens the pure grammar borrows: id in, display name out, off the reference map already in hand. Absent from the map = empty string, and the grammar falls back to showing the raw id.
export function nameLens(map) {
  const names = (map && map.names) || {};
  return function (id) {
    const row = names[text(id).trim().toLowerCase()];
    return row ? text(row.name) : "";
  };
}

// js reads.
export async function read(objectApi, bookId, cardId, map) {
  const out = { card: null, scene: null, error: "" };
  const card = await CARDS.getCard(objectApi, bookId, cardId);
  if (!card) {
    out.error = "That card is not in this book any more.";
    return out;
  }
  const sections = await CARDS.listSections(objectApi, bookId, cardId);
  const pages = await CARDS.listPages(objectApi, bookId, cardId);
  const m = map || (await REFS.loadMap(objectApi, bookId));
  out.card = card;
  // ONE shaping, read by BOTH grammars. The Sound section arrives in the very rows listSections
  // already returned for the Set — no second read, no query per cue (his batching law).
  const cardspec = {
    id: cardId,
    name: card.name, bookId, editor: card.editor,
    sections: sections.map((s) => ({ id:s.id, name:s.name, content:s.content })),
    pages: pages.map((p) => ({ id:p.id, title:p.title, header:p.header, body:p.content, footer:p.footer })),
  };
  out.scene = SPEC.parseScene(cardspec, nameLens(m));
  const track = SOUND.parseCard(cardspec);
  out.scene.cues = track.cues;
  out.scene.soundReferences = track.references;
  out.scene.warnings = (out.scene.warnings || []).concat(track.warnings);
  return out;
}

// One bounded source census on Shoot/Compile, never on a link render or playback tick.
export async function documentSources(objectApi,bookId,cues,references,map){
 const rows=new Map(),warnings=[],wanted=new Map(),m=map||{names:{}};
 for(const c of [...(cues||[]),...(references||[])]){
  if(c.invalid)continue;
  const id=DOCUMENT.idOf(c.source);
  if(id)wanted.set(id,true);
 }
 const ids=[...wanted.keys()];if(ids.length>DOCUMENT.MAX_SOURCES)warnings.push("Sound source census exceeds "+DOCUMENT.MAX_SOURCES+" distinct cards; remaining references were refused.");
 let reads=0;
 for(let start=0;start<Math.min(ids.length,DOCUMENT.MAX_SOURCES);start+=4)await Promise.all(ids.slice(start,Math.min(start+4,DOCUMENT.MAX_SOURCES)).map(async id=>{
  const live=liveCard(m,id),home=(m.names?.[id]?.bookId)||bookId;
  if(!live){rows.set(id,{card:{id,bookId:home},error:"Card is missing or in Trash."});return;}
  try{
   reads++;const [card,sections,pages]=await Promise.all([CARDS.getCard(objectApi,home,id),CARDS.listSections(objectApi,home,id),CARDS.listPages(objectApi,home,id)]);
   rows.set(id,card?{card,pages,sections}:{card:{id,bookId:home},error:"Card is missing or in Trash."});
  }catch(e){rows.set(id,{card:{id,bookId:home},error:"Could not read sound source: "+text(e.message||e)});}
 }));
 const documents=DOCUMENT.createResolver([...rows.values()]);
 return {documents,warnings,receipt:{distinct:ids.length,loaded:rows.size,repositorySnapshots:reads,maxSources:DOCUMENT.MAX_SOURCES,perFrameReads:0}};
}
export function sourceLens(objectApi,documents){
 const lens=function(cue){
  const want=text(cue?.source).trim();if(!want)return "";
  if(cue.sourceKind==="card"||DOCUMENT.idOf(want))return documents?DOCUMENT.audioOf(documents.resolve(want)):{error:"Document source was not loaded; no shelf fallback."};
  try{if(!SHELF.installed(objectApi))return "";const row=SHELF.resolve(objectApi,want);return row&&row.kind==="sound"?text(row.path):"";}catch(e){return "";}
 };
 if(documents)lens.resolveDocument=documents.resolve;
 return lens;
}

// ── 2. ──────────── A token already IS the card id — nothing to look up, only to prove: on the map's name index (it exists) and off its trash index (it lives). A trashed or unknown id is correctly a grey stand-in, never an error. The map is project-wide and already in hand, so this costs no query per placement — only the card whose Body we then read costs one.
export function liveCard(map, id) {
  const key = text(id).trim().toLowerCase();
  if (!key) return "";
  if (!((map && map.names) || {})[key]) return "";
  if (map && map.trashed && map.trashed[key]) return "";
  return key;
}

// "). Members it cannot build are counted into ONE warning naming the set — never a throw.
export function clipListOf(url) {
  const m = text(url).match(/[?&]animations=([^&#]*)/i);
  if (!m) return [];
  return decodeURIComponent(m[1]).split(",").map((c) => c.trim()).filter(Boolean);
}
export function withClips(url, clips) {
  const u = text(url);
  const list = clips.join(",");
  if (/[?&]animations=/i.test(u)) return u.replace(/([?&]animations=)[^&#]*/i, "$1" + list);
  if (!list) return u;
  return u + (u.indexOf("?") === -1 ? "?" : "&") + "animations=" + list;
}
export function hasScript(scripts, path) {
  const p = text(path).trim();
  if (!p) return false;
  const bare = p.replace(/^scripts\//, "");
  for (let i = 0; i < scripts.length; i++) {
    const s = text(scripts[i]);
    if (s === p || s === "scripts/" + bare || s === bare) return true;
  }
  return false;
}
export function buildable(member, scripts) {
  const p = (member && member.props) || {};
  if (p.model) {
    const url = typeof p.model === "string" ? p.model : text(p.model && p.model.id);
    return url.indexOf("/cdn/") === 0 || url.indexOf("cdn/") === 0;
  }
  if (p.primitive) {
    if (text(p.primitive.kind) === "scripted") return hasScript(scripts, p.primitive.script);
    return !!p.primitive.kind;
  }
  return !!(p.light || p.text || (p.sprite && p.sprite.texture));
}
export function shelfBody(objectApi, ref, shown, warnings) {
  const name = text(ref.name).trim();
  const fallback = () => {
    const ph = BODY.placeholderBody(shown);
    ph.cardId = ref.cardId;
    return ph;
  };
  let installed = "";
  let row = null;
  try {
    installed = SHELF.installed(objectApi);
    // The ladder: shelf, then the mod's project list, then this game's own assets, then a literal
    // /cdn/ path. The lower rungs answer even with no shelf installed.
    row = SHELF.resolve(objectApi, name);
  } catch (e) {
    installed = "";
    row = null;
  }
  if (!installed && !row) {
    warnings.push('"' + shown + '": Body names "' + name + '" from the Asset Library, but the shelf is not installed and nothing this game wears answers to it either. A grey stand-in is holding its place.');
    return fallback();
  }
  if (!row) {
    warnings.push('"' + shown + '": Body names "' + name + '", but nothing on the Asset Library shelf or among this game\'s own assets answers to that name. Nothing stands for it; a grey stand-in is holding its place.');
    return fallback();
  }
  const source = text(row.source) || "shelf";
  // The ladder's lower rungs are this game's own assets, not the shelf: the drawer says so.
  if (source === "game" || source === "path") warnings.push('"' + shown + '": "' + name + '" is from the game\'s own assets (' + row.path + '), not the Asset Library shelf.');
  const extras = Array.isArray(ref.extraAnims) ? ref.extraAnims : [];
  const carried = ref || {};
  if (row.kind === "animation" || row.kind === "model") {
    const clips = clipListOf(row.path).slice();
    for (let i = 0; i < row.clips.length; i++) if (clips.indexOf(row.clips[i]) === -1) clips.push(row.clips[i]);
    for (let i = 0; i < extras.length; i++) if (clips.indexOf(extras[i]) === -1) clips.push(extras[i]);
    const url = withClips(row.path, clips);
    const props = {};
    for (const k in carried) if (Object.prototype.hasOwnProperty.call(carried, k)) props[k] = carried[k];
    props.model = ref.offset ? { id: url, offset: ref.offset } : url;
    return { kind: "model", ...props, scale: ref.scale, pose: ref.pose || "", warnings: [], error: "", found: true, cardId: ref.cardId, source: source, shelf: { id: row.id, name: row.name, kind: row.kind } };
  }
  if (row.kind === "set") {
    let scripts = [];
    try {
      scripts = (objectApi.listScripts && objectApi.listScripts()) || [];
    } catch (e) {
      scripts = [];
    }
    const members = row.members || [];
    const children = [];
    let skipped = 0;
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!buildable(m, scripts)) {
        skipped++;
        continue;
      }
      const props = {};
      const src = m.props || {};
      for (const k in src) if (Object.prototype.hasOwnProperty.call(src, k)) props[k] = src[k];
      props.feetPosition = { x: m.off.x, y: m.off.y, z: m.off.z };
      props.physics = "none";
      children.push({ tags: [SET_TAG], ...props, name: m.name });
    }
    if (skipped) {
      warnings.push('"' + shown + '": the shelf set “' + row.name + '” has ' + members.length + " pieces; " + skipped + " of them need generator scripts this game hasn't got, so " + (children.length ? children.length + " stand" : "none stand") + ".");
    }
    if (!children.length) return fallback();
    const props = {};
    for (const k in carried) if (Object.prototype.hasOwnProperty.call(carried, k)) props[k] = carried[k];
    return { kind: "set", ...props, children: children, scale: ref.scale, pose: "", warnings: [], error: "", found: true, cardId: ref.cardId, source: source, shelf: { id: row.id, name: row.name, kind: row.kind, members: members.length, skipped: skipped } };
  }
  warnings.push('"' + shown + '": Body names "' + row.name + '", but that row is a ' + row.kind + '. A Body can stand up a model, an animation, or a set; a grey stand-in is holding its place.');
  return fallback();
}

// Resolve every distinct placement token to a body. Distinct — a scene that places the same
// candle nine times reads that card once. The caller may lend its map (shoot() does).
export async function bodies(objectApi, bookId, placements, map) {
  const m = map || (await REFS.loadMap(objectApi, bookId));
  const label = nameLens(m);
  const out = {};
  const warnings = [];
  const seen = {};
  for (let i = 0; i < placements.length; i++) {
    const key = placements[i].key;
    if (seen[key]) continue;
    seen[key] = true;
    const ref = placements[i].ref;
    const shown = placements[i].name || label(ref) || ref;
    const id = liveCard(m, ref);
    if (!id) {
      out[key] = BODY.placeholderBody(shown);
      warnings.push('"' + shown + '" (#[' + ref + "]) is not a live card in this project — a grey stand-in is holding its place.");
      continue;
    }
    // A placed card's Body is read from the card's OWN book, not the scene's — definitions live in Research (jace's model: definitions there, prose everywhere else references them), and the map already knows each card's home. Same-book placements pass through unchanged.
    const home = (m.names[id] && m.names[id].bookId) || bookId;
    let sections = [];
    try {
      sections = await CARDS.listSections(objectApi, home, id);
    } catch (e) {
      sections = [];
    }
    let pages=[];
    try { pages=await CARDS.listPages(objectApi,home,id); } catch(e) {warnings.push('"'+shown+'": sound pages could not be read.');}
    const sounds=SOUND.parseCard({id,bookId:home,sections,pages});
    warnings.push(...sounds.warnings.map(w=>'"'+shown+'": '+w));
    const b = BODY.bodyOfCard({ sections: sections.map((s) => ({ name: s.name, content: s.content })) });
    if (!b.found) {
      const ph = BODY.placeholderBody(shown);
      ph.cardId = id;
      ph.soundCues=sounds.cues;
      ph.soundReferences=sounds.references;
      out[key] = ph;
      warnings.push('"' + shown + '" has no Body section yet — a grey stand-in is holding its place. Add one and re-shoot.');
      continue;
    }
    b.cardId = id;
    for (let w = 0; w < b.warnings.length; w++) warnings.push('"' + shown + '": ' + b.warnings[w]);
    // `#[asset: Name]` is a reference until the shelf answers it: resolve it here, once per card.
    out[key] = b.kind === "asset" ? shelfBody(objectApi, b, shown, warnings) : b;
    out[key].cardId=id;
    out[key].soundCues=sounds.cues;
    out[key].soundReferences=sounds.references;
  }
  return { bodies: out, warnings: warnings };
}

// ── 3. DRESS — strike the last set, stand this one up. ─────────────────────── Everything this lane has ever put in the world, gone. Called before every dress and by the Strike button, so a room is never left wearing yesterday's scene.
export function strike(objectApi, place) {
  // The set goes quiet with the lights: every cue emitter destroyed and every pending cue timer
  // disowned (lib/soundplay.js owns both). Striking a set that is still singing would be a room
  // holding a sound nothing on screen explains.
  try {
    SOUNDPLAY.stop(objectApi, place);
  } catch (e) {
    /* a seat with no conductor is a seat with nothing to silence */
  }
  const opts = { tags: [SET_TAG] };
  if (place) opts.place = place;
  let hits = [];
  try {
    hits = objectApi.query(opts) || [];
  } catch (e) {
    hits = [];
  }
  // A set root takes its children with it (destroy is recursive), so a child whose parent is also in the census is never destroyed by name — that second call would land on a body already gone and the engine logs every one of them as a bad reference.
  const have = {};
  for (let i = 0; i < hits.length; i++) have[hits[i].id] = true;
  const orphan = (id) => {
    let cut = id.lastIndexOf("/");
    while (cut > 0) {
      if (have[id.slice(0, cut)]) return false;
      cut = id.lastIndexOf("/", cut - 1);
    }
    return true;
  };
  let n = 0;
  for (let i = 0; i < hits.length; i++) {
    if (!orphan(hits[i].id)) {
      n++;
      continue;
    }
    try {
      objectApi.destroy(hits[i].id);
      n++;
    } catch (e) {
      /* already gone — the count is what landed, not what was asked */
    }
  }
  return n;
}

// A placement plus its body, as one object spec. feetPosition is the placement's own coordinates —
// bottom-centre, which is why the Set grammar takes floor coordinates and an author never has to
// think about a mesh's origin.
export function specFor(placement, body, index, place, api) {
  const props = {};
  const src = body || {};
  for (const k in src) if (Object.prototype.hasOwnProperty.call(src, k)) props[k] = src[k];

  props.feetPosition = { x: placement.position.x, y: placement.position.y, z: placement.position.z };
  props.rotation = { yaw: placement.yaw };

  // The placement's own scale multiplies the body's, so a scene can shrink one instance of a thing
  // without editing the card everyone else uses.
  const pScale = typeof placement.scale === "number" && placement.scale > 0 ? placement.scale : 1;
  if (pScale !== 1) {
    const base = typeof props.scale === "number" ? props.scale : 1;
    props.scale = Math.round(base * pScale * 1000) / 1000;
  }

  // A set piece is scenery: it must not shove the camera or the player around mid-take.
  if (props.physics === undefined) props.physics = "none";
  // `offstage` on the Set line: standing, unseen, until a #[nav: ... enter] reveals it (set-piece.js).
  if (placement.offstage) props.visible = false;

  const spec = {
    // The slug reads in god mode, so it is cut from the display name, not the id:
    // sb-set-kneeling-pilgrim-4, never sb-set-mt9qf5lsklmdl-4.
    id: ID_PREFIX + slug(placement.name || placement.ref) + "-" + (index + 1),
    tags: [SET_TAG],
    ...props,
  };
  if (place) spec.place = place;

  // A model with a named pose holds that clip standing still — no locomotion behavior, because a set piece is a photograph, not a performance. set-piece.js is the reader: it holds the pose and plays the action beats the courier writes into state.act.
  spec.state={cardId:body.cardId||placement.ref,cardKey:placement.key,cardName:placement.name||placement.ref};
  if (body.pose) spec.state.pose = body.pose;
  if (body.kind === "model") spec.behavior = api ? PACKAGE_PATH.resolve(api,SET_PIECE_BEHAVIOR) : SET_PIECE_BEHAVIOR;
  // A shelf SET stands as one root with its members as children: local offsets under the placement,
  // the engine composes the yaw. Each child wears the set tag and an id that reads beside its root.
  if (body.kind === "set" && Array.isArray(body.children) && body.children.length) {
    spec.children = body.children.map((c, k) => {
      const cp = {};
      const srcp = c || {};
      for (const key in srcp) if (Object.prototype.hasOwnProperty.call(srcp, key)) cp[key] = srcp[key];
      return { id: spec.id + "-" + (k + 1), tags: [SET_TAG], ...cp };
    });
  }
  return spec;
}

// ── ACTION BEATS — compiled beats become set-piece ids and clips the pieces actually have. Matched case-insensitively, spaces and dashes ignored, then by the phrase's first word; no match is ONE sentence per subject+clip telling the author which Body line to extend — never a silent skip.
export function clipsOf(body) {
  if (!body || body.kind !== "model") return [];
  const model = body && body.model;
  const url = typeof model === "string" ? model : model && typeof model === "object" ? text(model.id) : "";
  const m = url.match(/[?&]animations=([^&#]*)/i);
  if (!m) return [];
  return decodeURIComponent(m[1]).split(",").map((c) => c.trim()).filter(Boolean);
}
export function clipKey(v) {
  return text(v).toLowerCase().replace(/[^a-z0-9]+/g, "");
}
export function matchClip(clips, want) {
  const full = clipKey(want);
  const first = clipKey(text(want).trim().split(/\s+/)[0]);
  let hit = "";
  for (let i = 0; i < clips.length && !hit; i++) if (clipKey(clips[i]) === full) hit = clips[i];
  for (let i = 0; i < clips.length && !hit; i++) if (first && clipKey(clips[i]) === first) hit = clips[i];
  return hit;
}
// beats: compile()'s rows · segments: shoot()'s resolved swap schedule, each carrying idByKey (the set
// piece id every placement key became in that segment) · bodyMap: bodies().bodies.
export function actionsOf(beats, segments, bodyMap) {
  const out = { actions: [], warnings: [] };
  const warned = {};
  for (let i = 0; i < (beats || []).length; i++) {
    const b = beats[i];
    // The segment live at the beat's shot — the last one that opened at or before it.
    let seg = null;
    for (let g = 0; g < segments.length; g++) if (Number(segments[g].atShot || 0) <= Number(b.shot || 0)) seg = segments[g];
    const ids = (seg && seg.idByKey) || {};
    for (let sIdx = 0; sIdx < (b.subjects || []).length; sIdx++) {
      const sub = b.subjects[sIdx];
      const shown = text(sub.name) || text(sub.ref);
      const body = bodyMap[sub.key];
      const clips = clipsOf(body);
      const clip = matchClip(clips, b.clip);
      const wkey = sub.key + "|" + clipKey(b.clip);
      if (!clip) {
        if (!warned[wkey]) {
          warned[wkey] = true;
          const want = text(b.clip).trim();
          const list = clips.length ? clips.join(",") + "," : "Idle,";
          out.warnings.push('"' + shown + '" has no "' + want + '" clip — add it to its Body line: animations ' + list + want.charAt(0).toUpperCase() + want.slice(1));
        }
        continue;
      }
      const id = ids[sub.key];
      if (!id) {
        if (!warned[wkey + "|stand"]) {
          warned[wkey + "|stand"] = true;
          out.warnings.push('"' + shown + '" is not standing on the set at that shot (hidden, or its Body is `none`) — nothing there plays "' + clip + '".');
        }
        continue;
      }
      const row = { kind: "act", id: id, clip: clip, time: Number(b.time || 0), key: text(b.key), anchor: b.anchor || { shot: Number(b.shot || 0) }, offset: Number(b.offset || 0), subject: shown };
      if (Number(b.hold || 0) > 0) row.hold = Number(b.hold);
      if (b.afterKey) row.afterKey = text(b.afterKey);
      out.actions.push(row);
    }
  }
  out.actions.sort((a, b) => a.time - b.time);
  return out;
}

// move models based on a path set up in a card") ─── compile()'s nav rows become courier rows: the set-piece id that walks, the waypoints as world metres (a Path card's `at <cardId>` and a `to <cardId>` hop resolve against the LIVE segment's placements, stopping `near` metres short along the approach), a clip the piece really has (a miss falls back to the first clip whose name carries "walk", else the pose slides), and seconds for the whole route (written, or route length at speed / WALK_SPEED; pauses add on top).
export function navsOf(navs, segments, bodyMap, paths) {
  const out = { actions: [], warnings: [] };
  const warned = {};
  const say = (k, w) => {
    if (warned[k]) return;
    warned[k] = true;
    out.warnings.push(w);
  };
  for (let i = 0; i < (navs || []).length; i++) {
    const n = navs[i];
    let seg = null;
    for (let g = 0; g < segments.length; g++) if (Number(segments[g].atShot || 0) <= Number(n.shot || 0)) seg = segments[g];
    const ids = (seg && seg.idByKey) || {};
    const pos = (seg && seg.posByKey) || {};
    // The route, before the subject: shared by every subject that walks it.
    let raw = [];
    let facings = [];
    let pauses = [];
    let pathSeconds=0;
    const route = n.route || {};
    if (route.path) {
      const p = (paths || {})[route.path];
      if (!p || p.error || !Array.isArray(p.points) || !p.points.length) {
        say("path|" + route.path, '"' + text(route.name || route.path) + '" has no Path section to walk | add one (a section named Path, one `at X, Y, Z` per line) and re-shoot.');
        continue;
      }
      raw = p.points;
      facings = p.facings || [];
      pauses = p.pauses || [];
      pathSeconds=Number(p.seconds||0);
    } else if (route.point) {
      raw = [{ x: route.point.x, y: route.point.y, z: route.point.z }];
    } else if (route.ref) {
      raw = [{ ref: route.ref, near: Number(n.near || SPEC.NEAR_DEFAULT) }];
    }
    for (let sIdx = 0; sIdx < (n.subjects || []).length; sIdx++) {
      const sub = n.subjects[sIdx];
      const shown = text(sub.name) || text(sub.ref);
      const id = ids[sub.key];
      if (!id) {
        say(sub.key + "|nav|stand", '"' + shown + '" is not standing on the set at that shot (hidden, or its Body is `none`) — nothing there walks.');
        continue;
      }
      const clips = clipsOf(bodyMap[sub.key]);
      let clip = matchClip(clips, n.clip);
      if (!clip) {
        const want = text(n.clip).trim();
        const list = clips.length ? clips.join(",") + "," : "Idle,";
        say(sub.key + "|" + clipKey(n.clip), '"' + shown + '" has no "' + want + '" clip — add it to its Body line: animations ' + list + want.charAt(0).toUpperCase() + want.slice(1));
        for (let c = 0; c < clips.length && !clip; c++) if (clipKey(clips[c]).indexOf("walk") >= 0) clip = clips[c];
      }
      // Resolve the waypoints against where things stand; walk from the subject's own placement.
      let cur = pos[sub.key] || { x: 0, y: 0, z: 0 };
      const points = [];
      const fac = [];
      const pau = [];
      let length = 0;
      for (let k = 0; k < raw.length; k++) {
        const w = raw[k];
        let pt = null;
        if (w && w.ref) {
          const at = pos[text(w.ref).toLowerCase()];
          if (!at) {
            say(sub.key + "|near|" + w.ref, '"' + shown + '" walks to "' + text(w.ref) + '", which is not placed on the set at that shot — that waypoint was skipped.');
            continue;
          }
          const dx = at.x - cur.x;
          const dz = at.z - cur.z;
          const dy=Number(at.y||0)-Number(cur.y||0);
          const d = Math.hypot(dx,dy,dz);
          const near = Math.max(0, Number(w.near || 0));
          const f = d > near ? (d - near) / d : 0;
          pt = { x: round2(cur.x + dx * f), y: round2(cur.y+dy*f), z: round2(cur.z + dz * f) };
        } else if (w) pt = { x: Number(w.x || 0), y: Number(w.y || 0), z: Number(w.z || 0) };
        if (!pt) continue;
        length += Math.hypot(pt.x-cur.x,pt.y-cur.y,pt.z-cur.z);
        cur = pt;
        points.push(pt);
        fac.push(facings[k] === 0 || facings[k] ? Number(facings[k]) : null);
        pau.push(Math.max(0, Number(pauses[k] || 0)));
      }
      if (!points.length) continue;
      let seconds = Number(n.seconds || 0);
      if (!(seconds > 0)) seconds = Number(n.speed||0)>0?round2(length/Number(n.speed)):pathSeconds>0?pathSeconds:round2(length/SPEC.WALK_SPEED);
      const row = { kind: "nav", id: id, time: Number(n.time || 0), key: text(n.key), anchor: n.anchor || { shot: Number(n.shot || 0) }, offset: Number(n.offset || 0), seconds: Math.max(0.2, seconds), points: points, facings: fac, pauses: pau, clip: clip || "", exit: !!n.exit, enter: !!n.enter, subject: shown };
      if (n.afterKey) row.afterKey = text(n.afterKey);
      out.actions.push(row);
    }
  }
  out.actions.sort((a, b) => a.time - b.time);
  return out;
}

// js chunkSpeech — one rule with the compile estimate). One voice identity per speaker, reused for every line they speak: the speaker's slug ("Narrator" -> narrator; a card -> its display name slugged); the clip is the chunk's own words.
export function voiceSlug(v) {
  return text(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function linesOf(compiledLines, opts) {
  const o = opts || {};
  const out = { actions: [], warnings: [] };
  const label = typeof o.nameOf === "function" ? o.nameOf : null;
  for (let i = 0; i < (compiledLines || []).length; i++) {
    const ln = compiledLines[i];
    const parsed = REFS.lineParse(ln.raw);
    if (!text(parsed.words)) {
      out.warnings.push('A spoken line — “' + text(ln.raw) + '” — carries a speaker but no words, so nothing is said.');
      continue;
    }
    let who = text(parsed.who);
    if (parsed.whoId && label) who = label(parsed.whoId) || who;
    const identity = voiceSlug(who) || "narrator";
    const chunks = SPEC.chunkSpeech(parsed.words).map((c) => ({ text: c.text, seconds: c.seconds, clip: "/cdn/voice-" + identity + "-saying-" + voiceSlug(c.text) + ".mp3" }));
    let seconds = 0;
    for (let c = 0; c < chunks.length; c++) seconds += chunks[c].seconds;
    const row = { kind: "line", time: Number(ln.time || 0), key: text(ln.key), anchor: ln.anchor || { shot: Number(ln.shot || 0) }, offset: Number(ln.offset || 0), who: who, identity: identity, text: text(parsed.words), chunks: chunks, seconds: round2(seconds) };
    const narrator=!parsed.who||/^(narrator|narration|screen)$/i.test(parsed.who);
    row.speaker=narrator?"screen":parsed.whoId||text(parsed.who).trim().toLowerCase().replace(/\s+/g,"-");
    row.speakerBindings=o.bindings||[];
    row.origin=narrator?{kind:"screen"}:ORIGIN.resolve({speaker:row.speaker},row.time,row.speakerBindings);
    if(row.origin.error) out.warnings.push('Voice "'+who+'": '+row.origin.error+'; subtitles remain.');
    if (ln.afterKey) row.afterKey = text(ln.afterKey);
    out.actions.push(row);
  }
  return out;
}

// Stand the whole set up. Returns what actually landed, never what was intended. Takes a scene (its .placements) or a bare placements list — shoot() hands it the OPENING segment's list, so a #[set: …] written before the first shot opens on the right set.
export function dress(objectApi, sceneOrList, bodyMap, place) {
  const result = { struck: 0, placed: 0, skipped: 0, ids: [], warnings: [] };
  result.struck = strike(objectApi, place);

  const list = Array.isArray(sceneOrList) ? sceneOrList : (sceneOrList && sceneOrList.placements) || [];
  if (list.length > SET_CAP) {
    result.warnings.push("This set names " + list.length + " things; the first " + SET_CAP + " were placed. That is usually a reference loop, not a scene.");
  }
  const n = Math.min(list.length, SET_CAP);

  for (let i = 0; i < n; i++) {
    const p = list[i];
    const body = bodyMap[p.key];
    if (!body || body.kind === "none") {
      result.skipped++;
      continue;
    }
    if (p.tags && p.tags.indexOf("hidden") !== -1) {
      result.skipped++;
      continue;
    }
    try {
      const id = objectApi.spawn(specFor(p, body, i, place, objectApi));
      result.ids.push(text(id));
      result.placed++;
    } catch (e) {
      result.warnings.push('"' + (p.name || p.ref) + '" would not stand up: ' + text(e && e.message ? e.message : e));
    }
  }
  return result;
}

// ── 4. ───────────────────────────── ── THE DEPENDENCY ──────────────────────────────────────────────────────────────────────────── Worldwright Studio does not own a camera director and will never grow one. " So: never copy a line of it, never vendor it, never quietly reimplement its timeline.
const DEP = {
  id: "absolute-cinema",
  title: "Absolute Cinema",
  author: "ress",
  minVersion: "1.14.0",
  what: "the camera director that plays these shots back",
  install: "Install it from the mod browser — search “Absolute Cinema”.",
};

// The mod's own import door.
const IMPORT_ACTION = "absolute-cinema:cinema:libImport";
const PLAY_ACTION = "absolute-cinema:cinema:play";

// Is the director here? spec.mods is the registry of what this game has installed — the one honest
// answer, and it costs nothing. Returns the shape the Shoot panel draws its install notice from.
export function dependency(objectApi) {
  let mods = null;
  try {
    mods = objectApi.getSpec ? objectApi.getSpec("mods") : null;
  } catch (e) {
    mods = null;
  }
  const version = mods && mods[DEP.id] ? text(mods[DEP.id]) : "";
  return {
    id: DEP.id,
    title: DEP.title,
    author: DEP.author,
    what: DEP.what,
    install: DEP.install,
    version: version,
    installed: !!version,
    // The one sentence the panel shows when it is missing. Credit first, instruction second.
    notice: version
      ? ""
      : "Shooting needs " + DEP.title + " by " + DEP.author + " — " + DEP.what + ". It is a separate mod, not part of Worldwright Studio. " + DEP.install,
    credit: "Playback by " + DEP.title + ", a mod by " + DEP.author + ".",
  };
}

// The lens compile() borrows for a #[atmo: …] token's words: exact preset -> "preset", one shared word
// -> "nearest", anything else -> "free" (id null; the author's own words ARE the mood).
export function atmoLens() {
  return function (raw) {
    try {
      return KITCHEN.place(raw);
    } catch (e) {
      return { id: null, name: text(raw).trim(), source: "free" };
    }
  };
}

export function clipFor(scene, name) {
  const built = SPEC.compile(scene, { name: text(name) || "Scene", atmoOf: atmoLens() });
  return built;
}

// ── THE MOODS — compiled #[atmo:] rows become courier rows, plus one sentence each.
export function moodsOf(compiledMoods) {
  const out = { moods: [], rows: [], notes: [] };
  const list = Array.isArray(compiledMoods) ? compiledMoods : [];
  const said = {};
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const atmo = m.atmo || { id: null, name: m.raw, source: "free" };
    const patch = atmo.id ? KITCHEN.values(atmo.id) : null;
    const mood = { shot: Number(m.shot || 0), time: Number(m.time || 0), raw: text(m.raw), atmo: atmo, paints: !!patch };
    out.moods.push(mood);
    const key = atmo.source + "|" + text(atmo.id || atmo.name).toLowerCase();
    if (patch) {
      out.rows.push({ kind: "atmo", time: mood.time, atmo: { id: atmo.id, name: atmo.name, source: atmo.source }, patch: patch, blend: KITCHEN.blendSeconds(atmo.id), raw: mood.raw });
      if (atmo.source === "nearest" && !said[key]) {
        said[key] = true;
        out.notes.push('"' + mood.raw + '" is painted as ' + atmo.name + ' at ' + mood.time + 's.');
      }
    } else if (!said[key]) {
      said[key] = true;
      if (atmo.id) out.notes.push('"' + mood.raw + '" is ' + atmo.name + ', a transition rather than a light | it is noted as the mood and the light stays.');
      else out.notes.push('"' + mood.raw + '" is noted as the mood; no preset matches it, so the light stays.');
    }
  }
  return out;
}

// Send the clip over. `send` is whatever the caller uses to reach the director — app-shell hands in
// its own sendAction so this file never has to know how a seat talks to a mod.
export function roll(send, clip, opts) {
  const o = opts || {};
  const out = { sent: false, played: false, error: "", missing: null };
  // The dependency gate. Refuse in full sentences, with the author's name in them.
  if (o.dep && !o.dep.installed) {
    out.missing = o.dep;
    out.error = o.dep.notice;
    return out;
  }
  if (typeof send !== "function") {
    out.error = "No way to reach the cinema director from this seat.";
    return out;
  }
  if (!clip || !Array.isArray(clip.nodes) || !clip.nodes.length) {
    out.error = "This scene has no camera in it. Write at least one #[cam: …] tag in the prose.";
    return out;
  }
  try {
    // JSON TEXT, per the director's own reader. See the note on IMPORT_ACTION above.
    send(IMPORT_ACTION, { data: JSON.stringify(clip), name: clip.name, replace: true });
    out.sent = true;
  } catch (e) {
    out.error = "The cinema director would not take the clip: " + text(e && e.message ? e.message : e);
    return out;
  }
  if (o.play) {
    try {
      send(PLAY_ACTION, { name: clip.name });
      out.played = true;
    } catch (e) {
      out.error = "The clip is loaded but would not start: " + text(e && e.message ? e.message : e);
    }
  }
  return out;
}

// ── 5. SHOOT — the one call a button makes. ────────────────────────────────── Read, dress, compile, hand over. Every stage's warnings ride out together so an author sees the whole truth of one press in one notice, rather than three that arrive in a random order.
export async function shoot(objectApi, bookId, cardId, opts) {
  require('lib/source-book.js').refuseExecution(bookId);
  const o = opts || {};
  const out = {
    ok: false,
    name: "",
    placed: 0,
    struck: 0,
    skipped: 0,
    shots: 0,
    sounds: 0,
    // How many cues this press actually armed on the seat. 0 on a Preview by definition.
    playing: 0,
    seconds: 0,
    clip: null,
    cues: [],
    // compile()'s #[act: …] rows, and the same rows resolved to set-piece ids + real clips.
    beats: [],
    actions: [],
    // compile()'s #[atmo: …] rows, each saying whether it paints (a preset) or is noted (free text).
    moods: [],
    warnings: [],
    error: "",
    dep: dependency(objectApi),
  };

  // ONE reference-map load per press — read() names the labels with it, bodies() proves life with it. Two loads would be four extra statements for the same answer (his batching law). A caller running both targets off one press (shootAll/statusAll) hands the load in as o.map.
  const map = o.map || (await REFS.loadMap(objectApi, bookId));

  const got = await read(objectApi, bookId, cardId, map);
  if (got.error) {
    out.error = got.error;
    return out;
  }
  const scene = got.scene;
  out.name = text(got.card.name) || "Scene";
  out.warnings = out.warnings.concat(scene.warnings || []);
  if (scene.error) {
    out.error = scene.error;
    return out;
  }

  // Bodies for EVERY set on the card, resolved once — a card with three sets still reads each
  // referenced card exactly once (bodies() dedupes by key; his batching law).
  const setsArr = Array.isArray(scene.sets) && scene.sets.length ? scene.sets : null;
  let allPlacements = scene.placements || [];
  if (setsArr) {
    allPlacements = [];
    for (let sx = 0; sx < setsArr.length; sx++) allPlacements = allPlacements.concat(setsArr[sx].placements);
  }
  const b = await bodies(objectApi, bookId, allPlacements, map);
  out.warnings = out.warnings.concat(b.warnings);

  // Compile BEFORE dressing: segment 0 knows which set OPENS the scene — a #[set: …] written
  // before the first shot can open on a later section's set, not the first section's.
  const built = clipFor(scene, out.name);
  out.warnings = out.warnings.concat(built.warnings || []);
  if (built.error) {
    out.error = built.error;
    return out;
  }
  out.clip = built.clip;
  out.shots = built.clip.sequence.length;
  out.seconds = Math.round((built.seconds || 0) * 10) / 10;

  // THE SWAP SCHEDULE (jace, 2026-08-26: multiple scenes/sets on a card): one row per stretch of shots sharing a live set, each row's pieces already resolved into spawn-ready specs — a playback swap is strike + spawns on the courier's seat, zero reads mid-take.
  const segs = built.segments || [];
  out.segments = [];
  for (let g = 0; g < segs.length; g++) {
    const list = segs[g].placements || [];
    if (list.length > SET_CAP)
      out.warnings.push('Set "' + (segs[g].set || "unnamed") + '" holds ' + list.length + " things — only the first " + SET_CAP + " will stand.");
    const n = Math.min(list.length, SET_CAP);
    const specs = [];
    // Which set piece each placement key became in this segment — the beats below are addressed to
    // pieces, and a card placed twice answers to its first piece.
    const idByKey = {};
    // Where each placement key stands in this segment — the walks resolve `at <cardId>` against it.
    const posByKey = {};
    for (let i = 0; i < n; i++) {
      const p = list[i];
      const body = b.bodies[p.key];
      if (!body || body.kind === "none") continue;
      if (p.tags && p.tags.indexOf("hidden") !== -1) continue;
      // g * SET_CAP keeps ids unique across segments, so a swap can never collide with a piece
      // a failed strike left standing.
      const spec = specFor(p, body, g * SET_CAP + i, o.place, objectApi);
      specs.push(spec);
      if (!idByKey[p.key]) idByKey[p.key] = spec.id;
      if (!posByKey[p.key]) posByKey[p.key] = { x: p.position.x, y: p.position.y, z: p.position.z };
    }
    out.segments.push({ set: segs[g].set, time: segs[g].time, atShot: segs[g].atShot, specs: specs, idByKey: idByKey, posByKey: posByKey });
  }
  out.sets = setsArr ? setsArr.length : allPlacements.length ? 1 : 0;

  // THE ACTION BEATS (jace, 2026-09-01): compile() put every #[act: …] on the plan's clock; here each becomes the set piece that plays it plus a clip that piece really has. app-shell stages res.actions onto the player's sbStage and scripts/cinema-courier.js fires them on the director's own clock — the swap schedule's pattern, one clock, never two.
  out.beats = Array.isArray(built.beats) ? built.beats : [];
  const acted = actionsOf(out.beats, out.segments, b.bodies);
  out.actions = acted.actions;
  out.warnings = out.warnings.concat(acted.warnings);

  // THE WALKS (jace 2026-09-02): the distinct Path cards the navs name, read ONCE each through
  // CARDS.listSections from the card's home book (the very read bodies() makes), then every nav
  // becomes a courier row beside the beats.
  out.navs = Array.isArray(built.navs) ? built.navs : [];
  const paths = {};
  for (let ni = 0; ni < out.navs.length; ni++) {
    const route = out.navs[ni].route || {};
    if (!route.path || paths[route.path]) continue;
    const pid = liveCard(map, route.path);
    const shownPath = text(route.name) || text(route.path);
    if (!pid) {
      paths[route.path] = { error: "missing" };
      out.warnings.push('"' + shownPath + '" (#[' + route.path + "]) is not a live card in this project — nothing walks its path.");
      continue;
    }
    const home = (map.names[pid] && map.names[pid].bookId) || bookId;
    // Numbered source pages are authoritative; malformed saved paths never silently use a stale section.
    try {
      const pages=await CARDS.listPages(objectApi,home,pid),saved=PATH.fromPages(pages);
      if(saved){paths[route.path]=saved;continue;}
    } catch(e) {paths[route.path]={error:'invalid-path'};out.warnings.push('"'+shownPath+'": '+text(e.message||e));continue;}
    let psecs = [];
    try {
      psecs = await CARDS.listSections(objectApi, home, pid);
    } catch (e) {
      psecs = [];
    }
    let pathSec = null;
    for (let ps = 0; ps < psecs.length && !pathSec; ps++) if (SPEC.PATH_SECTION_NAMES.indexOf(text(psecs[ps].name).trim().toLowerCase()) >= 0) pathSec = psecs[ps];
    if (!pathSec) {
      paths[route.path] = { error: "no-path" };
      out.warnings.push('"' + shownPath + '" has no Path section (Path, Route, Waypoints or Nav) — nothing walks its route. Add one and re-shoot.');
      continue;
    }
    const parsedPath = SPEC.parsePath(pathSec.content);
    for (let pw = 0; pw < parsedPath.warnings.length; pw++) out.warnings.push('"' + shownPath + '": ' + parsedPath.warnings[pw]);
    paths[route.path] = parsedPath;
  }
  const walked = navsOf(out.navs, out.segments, b.bodies, paths);
  out.actions = out.actions.concat(walked.actions);
  out.warnings = out.warnings.concat(walked.warnings);

  // THE LINES ON THE CAMERA (jace 2026-09-02): every #[line:] is a courier row — subtitle + voice on
  // Codex's own seat (lib/soundplay.js's ruling). The voices cook on first play; say so once.
  const spoken = linesOf(built.lines || [], { nameOf: nameLens(map), bindings: ORIGIN.index(out.segments,built.seconds) });
  out.lines = spoken.actions;
  out.actions = out.actions.concat(spoken.actions);
  out.warnings = out.warnings.concat(spoken.warnings);
  if (spoken.actions.length) {
    const nl = spoken.actions.length;
    out.warnings.push(nl + (nl === 1 ? " voice line cooks" : " voice lines cook") + " on first play -- subtitles show at once, the voices arrive on a later press." + (nl > 20 ? " Speech generation has a budget (40 lines an hour, 150 a day per game), so a long scene's voices arrive over more than one day." : ""));
  }

  // EVENT ANCHORS: a row that waits on another beat's END carries that beat's set-piece id, so the courier can read the piece's own done marker (navDone / actDone); a line anchor is the courier's own schedule and needs no id. An act that plays on a piece still offstage is named once.
  const rowByKey = {};
  for (let ri = 0; ri < out.actions.length; ri++) {
    const r = out.actions[ri];
    if (r && r.key && !rowByKey[r.key]) rowByKey[r.key] = r;
  }
  const enterAt = {};
  for (let ri = 0; ri < out.actions.length; ri++) {
    const r = out.actions[ri];
    if (r && r.afterKey && rowByKey[r.afterKey] && rowByKey[r.afterKey].id) r.anchorId = rowByKey[r.afterKey].id;
    if (r && r.kind === "nav" && r.enter && (enterAt[r.id] === undefined || r.time < enterAt[r.id])) enterAt[r.id] = r.time;
  }
  const offstageIds = {};
  for (let g = 0; g < out.segments.length; g++) {
    const seg = out.segments[g];
    for (let sp = 0; sp < seg.specs.length; sp++) if (seg.specs[sp] && seg.specs[sp].visible === false) offstageIds[seg.specs[sp].id] = true;
  }
  const saidOff = {};
  for (let ri = 0; ri < out.actions.length; ri++) {
    const r = out.actions[ri];
    if (!r || r.kind !== "act" || !offstageIds[r.id] || saidOff[r.id]) continue;
    if (enterAt[r.id] !== undefined && enterAt[r.id] <= r.time) continue;
    saidOff[r.id] = true;
    out.warnings.push('"' + text(r.subject || r.id) + '" is offstage at that shot — it has not entered yet, so "' + text(r.clip) + '" plays unseen.');
  }
  out.actions.sort((a, c) => a.time - c.time);

  // THE MOODS (jace: the page's #[atmo: …] token IS the setting, on the clock): compile() put every token on the plan's clock; here each preset becomes a courier row with the kitchen's values, and free text becomes one sentence.
  const mooded = moodsOf(built.moods);
  out.moods = mooded.moods;
  if (mooded.rows.length) {
    out.actions = out.actions.concat(mooded.rows);
    out.actions.sort((a, c) => a.time - c.time);
  }
  out.warnings = out.warnings.concat(mooded.notes);

  if (o.dress !== false) {
    const opening = out.segments.length ? segs[0].placements : scene;
    const d = dress(objectApi, opening, b.bodies, o.place);
    out.placed = d.placed;
    out.struck = d.struck;
    out.skipped = d.skipped;
    out.warnings = out.warnings.concat(d.warnings);
  }

  // timeline, never re-derived). The clip that crosses to the director is camera work only, so there is exactly one player for a sound and nothing to double up.
  const bindings=ORIGIN.index(out.segments,built.seconds);
  const pending=ORIGIN.collect(scene.cues,cardId,bindings,b.bodies,SOUND.MAX_CUES,scene.soundReferences);
  const sources=await documentSources(objectApi,bookId,pending.cues,pending.references,map);
  const track=SOUND.linkReferences(pending,sources.documents.resolve);
  out.warnings.push(...track.warnings,...sources.warnings);
  const cued = SOUND.attach(track.cues, scene.shots, { times: built.timeline, total: built.seconds }, { sourceOf: sourceLens(objectApi,sources.documents),emitterOf:(c,t)=>ORIGIN.resolve(c,t,bindings) });
  // Validate native scheduling before staging; an invalid roll cannot silence the entire take.
  let noteCount=0; const refused=new Set();
  for(const effect of cued.effects) if(effect.params.sourceKind==="roll") {
    const p=effect.params;
    try {
      const count=ROLL.schedule(p.roll,p.from,p.to,p.until-effect.time,p.pitch,p.loop).length;
      if(noteCount+count>2048) throw Error("scene exceeds 2048 scheduled piano notes");
      noteCount+=count;
    } catch(e) { refused.add(effect.id); cued.warnings.push("Sound "+effect.id+": "+text(e.message||e)+"; cue left silent."); }
  }
  cued.effects=cued.effects.filter(e=>!refused.has(e.id));
  cued.cues=cued.cues.filter(c=>!refused.has(c.id));
  out.warnings = out.warnings.concat(cued.warnings);
  out.cues = cued.cues;
  out.sounds = cued.cues.length;

  if (o.send) {
    const r = roll(o.send, built.clip, { play: o.play !== false, dep: out.dep });
    if (r.error) {
      out.error = r.error;
      out.missing = r.missing || null;
      // The set is standing and the clip is compiled — only playback is missing. Say exactly that,
      // so an author who installs the mod can press Shoot again and lose nothing.
      if (r.missing) out.warnings.push("The set is standing and the shots are ready — they just have nowhere to play yet.");
      return out;
    }
    // THE CUES RIDE WITH THE CLIP — PLAYED BY THE COURIER, NOT HERE (jace, 2026-08-27 ~2:20 AM: "it played before the shot did, before I left godmode").
    if (r.played && cued.effects.length) {
      out.cueEffects = cued.effects;
    }
  }
  out.ok = true;
  return out;
}

// Everything the Shoot panel needs to draw itself before an author presses anything: is the
// director here, whose is it, and what does this card compile to. One call, no world touched.
export async function status(objectApi, bookId, cardId, opts) {
  const dep = dependency(objectApi);
  if (!bookId || !cardId) return { dep: dep, scene: null };
  const res = await preview(objectApi, bookId, cardId, opts);
  res.dep = dep;
  return res;
}

// A dry run: everything except touching the world or the director. What the Shoot panel draws
// BEFORE the author commits, so a bad set is caught while it is still only words.
export async function preview(objectApi, bookId, cardId, opts) {
  const o = opts || {};
  o.dress = false;
  o.send = null;
  return shoot(objectApi, bookId, cardId, o);
}

// The one sentence a notice shows. Fiction, not telemetry: what happened on the set.
export function summary(res) {
  if (!res) return "";
  if (res.error) return res.error;
  const bits = [];
  bits.push(res.placed === 1 ? "One thing on the set" : res.placed + " things on the set");
  if (res.sets > 1) bits.push(res.sets + " sets");
  bits.push(res.shots === 1 ? "one shot" : res.shots + " shots");
  if (res.sounds) bits.push(res.sounds === 1 ? "one cue" : res.sounds + " cues");
  // The light: how many moods paint, and how many are only noted (free text the kitchen has no preset for).
  const moods = Array.isArray(res.moods) ? res.moods : [];
  if (moods.length) {
    let paints = 0;
    for (let i = 0; i < moods.length; i++) if (moods[i] && moods[i].paints) paints++;
    const noted = moods.length - paints;
    if (paints) bits.push(paints === 1 ? "one mood painted" : paints + " moods painted");
    if (noted) bits.push(noted === 1 ? "one mood noted" : noted + " moods noted");
  }
  if (res.seconds) bits.push(res.seconds + "s");
  return bits.join(", ") + ".";
}

// ── 6. " Integration is pull-only everywhere else — a mod's material lands ON a card. This lane writes that file and nothing else — never a command, never an internal, never a second copy of film-kit's own runtime. A third target is a third emitter plus a DEP row here, never a second card reader.
const FILM_DEP = {
  id: "film-kit",
  // Author verified against the installed partner’s public listing, 2026-09-14.
  title: "Film Kit",
  author: "eva",
  minVersion: "1.0.0",
  what: "the filmmaking kit whose shot list this writes",
  need: "Writing a shot list needs",
  creditVerb: "Shot list compiled for",
  install: "Install it from the mod browser — search “film-kit”.",
};

// The one documented door. getScript/setScript keys drop the leading "scripts/", so this key IS the
// tree path scripts/lib/data/film.json — the HOST GAME's file, not a Worldwright Studio file.
const FILM_CONTRACT = "lib/data/film.json";
const FILM_PATH = "scripts/" + FILM_CONTRACT;

// film-kit's documented empty shape (its skill, section "The contract"). A film.json this lane
// creates starts exactly here and gains nothing beyond the shots it compiled.
export function emptyFilm() {
  return { title: "", family: "", sets: {}, cast: {}, shots: [] };
}

// The DEP gate, generalised: presence out of spec.mods, refusal in full sentences, credit first and instruction second. dependency() above stays as it is written — its sentences are the cinema lane's own and the Shoot panel already draws them — and a THIRD target costs a DEP row plus one call here.
export function modGate(objectApi, dep) {
  let mods = null;
  try {
    mods = objectApi && objectApi.getSpec ? objectApi.getSpec("mods") : null;
  } catch (e) {
    mods = null;
  }
  const version = mods && mods[dep.id] ? text(mods[dep.id]) : "";
  const by = dep.author ? " by " + dep.author : "";
  return {
    id: dep.id,
    title: dep.title,
    author: dep.author,
    what: dep.what,
    install: dep.install,
    version: version,
    installed: !!version,
    notice: version ? "" : dep.need + " " + dep.title + by + " — " + dep.what + ". It is a separate mod, not part of Worldwright Studio. " + dep.install,
    credit: dep.creditVerb + " " + dep.title + (dep.author ? ", a mod by " + dep.author : "") + ".",
  };
}

export function filmDependency(objectApi) {
  return modGate(objectApi, FILM_DEP);
}

// Read the contract file. MISSING IS NOT AN ERROR — it is a film that has not started, and the empty shape stands in. A file that is on disk but is not JSON IS an error: this lane refuses rather than overwriting an author's work with its own idea of the shape.
export function readFilm(objectApi) {
  const out = { doc: null, existed: false, error: "" };
  let raw = null;
  try {
    raw = objectApi && objectApi.getScript ? objectApi.getScript(FILM_CONTRACT) : null;
  } catch (e) {
    raw = null;
  }
  if (typeof raw !== "string" || !raw.trim()) {
    out.doc = emptyFilm();
    return out;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    parsed = null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    out.error = FILM_PATH + " is there, but it is not readable film-kit JSON — nothing was written. Fix or move that file and shoot again.";
    return out;
  }
  out.existed = true;
  out.doc = parsed;
  // The keys film-kit's own commands expect. A missing one is filled with its EMPTY value so the
  // merge has somewhere to land — never with a value of ours.
  if (typeof out.doc.title !== "string") out.doc.title = "";
  if (typeof out.doc.family !== "string") out.doc.family = "";
  if (!out.doc.sets || typeof out.doc.sets !== "object" || Array.isArray(out.doc.sets)) out.doc.sets = {};
  if (!out.doc.cast || typeof out.doc.cast !== "object" || Array.isArray(out.doc.cast)) out.doc.cast = {};
  if (!Array.isArray(out.doc.shots)) out.doc.shots = [];
  return out;
}

// THE MERGE.
export function mergeFilm(doc, emitted) {
  const out = { added: 0, replaced: 0, kept: 0, at: 0 };
  const mark = emitted.key + "-";
  const was = Array.isArray(doc.shots) ? doc.shots : [];
  const kept = [];
  let at = -1;
  for (let i = 0; i < was.length; i++) {
    const id = text(was[i] && was[i].id);
    if (id.indexOf(mark) === 0) {
      if (at < 0) at = kept.length;
      out.replaced += 1;
      continue;
    }
    kept.push(was[i]);
  }
  out.kept = kept.length;
  out.at = at < 0 ? kept.length : at;
  doc.shots = kept.slice(0, out.at).concat(emitted.shots, kept.slice(out.at));
  out.added = emitted.shots.length;
  const sets = doc.sets && typeof doc.sets === "object" ? doc.sets : {};
  for (const k in sets) if (Object.prototype.hasOwnProperty.call(sets, k) && text(k).indexOf(mark) === 0) delete sets[k];
  for (const k2 in emitted.sets) if (Object.prototype.hasOwnProperty.call(emitted.sets, k2)) sets[k2] = emitted.sets[k2];
  doc.sets = sets;
  return out;
}

// Land the emitted rows in the contract file. The gate first, in full sentences, exactly like the
// cinema crossing: no half-write, no silent no-op. This is the ONLY function in the lane that
// writes anything anywhere.
export function landFilm(objectApi, emitted, opts) {
  const o = opts || {};
  const out = { wrote: false, created: false, added: 0, replaced: 0, total: 0, path: FILM_PATH, error: "", missing: null };
  const dep = o.dep || filmDependency(objectApi);
  if (!dep.installed) {
    out.missing = dep;
    out.error = dep.notice;
    return out;
  }
  if (!emitted || emitted.error) {
    out.error = (emitted && emitted.error) || "Nothing to write.";
    return out;
  }
  if (!emitted.shots.length) {
    out.error = "This scene has no camera in it. Write at least one #[cam: …] tag in the prose.";
    return out;
  }
  const got = readFilm(objectApi);
  if (got.error) {
    out.error = got.error;
    return out;
  }
  const doc = got.doc;
  out.created = !got.existed;
  // A file this lane is creating has no title to protect, so the card names the film. An existing
  // one keeps its own title, its own family, and everything else it came with.
  if (!got.existed && !text(doc.title)) doc.title = text(emitted.title);
  const m = mergeFilm(doc, emitted);
  try {
    objectApi.setScript(FILM_CONTRACT, JSON.stringify(doc, null, 2) + "\n");
  } catch (e) {
    out.error = "film-kit's shot list would not take the write: " + text(e && e.message ? e.message : e);
    return out;
  }
  out.wrote = true;
  out.added = m.added;
  out.replaced = m.replaced;
  out.total = doc.shots.length;
  return out;
}

// THE ONE CALL A BUTTON MAKES on this target: read the card once, emit film-kit's rows, land them. opts: { place ("main"), write: false for a dry read }. It dresses nothing and destroys nothing — film-kit owns its own world; this hands it the picture plan.
export async function film(objectApi, bookId, cardId, opts) {
  require('lib/source-book.js').refuseExecution(bookId);
  const o = opts || {};
  const out = {
    ok: false,
    name: "",
    key: "",
    shots: 0,
    sets: 0,
    seconds: 0,
    added: 0,
    replaced: 0,
    total: 0,
    created: false,
    wrote: false,
    path: FILM_PATH,
    film: null,
    warnings: [],
    error: "",
    missing: null,
    dep: filmDependency(objectApi),
  };
  const map = o.map || (await REFS.loadMap(objectApi, bookId));
  const got = await read(objectApi, bookId, cardId, map);
  if (got.error) {
    out.error = got.error;
    return out;
  }
  const scene = got.scene;
  out.name = text(got.card.name) || "Scene";
  if (scene.error) {
    out.warnings = out.warnings.concat(scene.warnings || []);
    out.error = scene.error;
    return out;
  }
  // The second emit shape, off the very parse the cinema lane compiles (emitFilm carries the
  // scene's own warnings out with its own, so they are not added twice here).
  const emitted = SPEC.emitFilm(scene, { name: out.name, cardId: text(cardId), place: o.place });
  out.warnings = out.warnings.concat(emitted.warnings || []);
  out.film = emitted;
  out.key = emitted.key;
  out.shots = emitted.shots.length;
  out.sets = Object.keys(emitted.sets || {}).length;
  out.seconds = emitted.seconds;
  if (emitted.error) {
    out.error = emitted.error;
    return out;
  }
  if (o.write === false) {
    out.ok = true;
    return out;
  }
  const landed = landFilm(objectApi, emitted, { dep: out.dep });
  out.wrote = landed.wrote;
  out.created = landed.created;
  out.added = landed.added;
  out.replaced = landed.replaced;
  out.total = landed.total;
  if (landed.error) {
    out.error = landed.error;
    out.missing = landed.missing || null;
    if (landed.missing) out.warnings.push("The shot list is compiled and waiting — it just has nowhere to be written yet.");
    return out;
  }
  out.ok = true;
  return out;
}

// Everything a panel needs before an author presses anything on this target: is film-kit here, what
// is already in its file, and what this card would emit. One call, nothing written.
export async function filmStatus(objectApi, bookId, cardId, opts) {
  const o = opts || {};
  const dep = filmDependency(objectApi);
  const got = readFilm(objectApi);
  const file = {
    path: FILM_PATH,
    exists: got.existed,
    error: got.error,
    shots: got.doc && Array.isArray(got.doc.shots) ? got.doc.shots.length : 0,
    mine: 0,
    title: got.doc ? text(got.doc.title) : "",
  };
  if (!bookId || !cardId) return { dep: dep, file: file, film: null, shots: 0, seconds: 0, warnings: [], error: "" };
  const res = await film(objectApi, bookId, cardId, { write: false, map: o.map });
  res.dep = dep;
  if (res.key && got.doc && Array.isArray(got.doc.shots)) {
    const mark = res.key + "-";
    for (let i = 0; i < got.doc.shots.length; i++) if (text(got.doc.shots[i] && got.doc.shots[i].id).indexOf(mark) === 0) file.mine += 1;
  }
  res.file = file;
  return res;
}

// ── 6.

export async function statusAll(objectApi, bookId, cardId) {
  const map = await REFS.loadMap(objectApi, bookId);
  const cinema = await status(objectApi, bookId, cardId, { map: map });
  const filmRes = await filmStatus(objectApi, bookId, cardId, { map: map });
  return { cinema: cinema, film: filmRes };
}

export async function shootAll(objectApi, bookId, cardId, opts) {
  require('lib/source-book.js').refuseExecution(bookId);
  const o = opts || {};
  const map = await REFS.loadMap(objectApi, bookId);
  const cinema = await shoot(objectApi, bookId, cardId, Object.assign({}, o.cinema || {}, { map: map }));
  const filmRes = await film(objectApi, bookId, cardId, Object.assign({}, o.film || {}, { map: map }));
  return { cinema: cinema, film: filmRes };
}

// The one sentence a notice shows for this target — the film lane's summary().
export function filmSummary(res) {
  if (!res) return "";
  if (res.error) return res.error;
  const bits = [];
  bits.push(res.shots === 1 ? "One shot" : res.shots + " shots");
  if (res.sets) bits.push(res.sets === 1 ? "one set" : res.sets + " sets");
  if (res.seconds) bits.push(res.seconds + "s");
  if (res.wrote) bits.push(res.replaced ? res.replaced + " replaced in " + FILM_PATH : (res.created ? "written to a new " : "added to ") + FILM_PATH);
  else bits.push("not written yet");
  return bits.join(", ") + ".";
}

// ── 7. The lane is ACTIVE when EITHER mod is installed and waits only when NEITHER is; inside plan and land each target is gated on its own, in its own sentence, and one absent mod never silences the other. NOTHING LANDS IN A PLAN, and landing is never a second walk of the prose: every item carries the row it WOULD write as its payload, so land() is the plan's own numbers going out.
const FOLDER_PLACE = "main";
// film-kit's own doctrine for a score: "a bed under the whole film (gain ~0.3, felt not heard)". An
// author who writes `gain 0.6` keeps their number; this is only the number for a cue that names none.
const SCORE_BED_GAIN = 0.3;

export function pad2n(n) {
  return n < 10 ? "0" + n : String(n);
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

// THE PER-TARGET PRESENCE READ. Both gates, one answer, and the notice names both mods when the lane
// has nowhere at all to land.
export function installed(objectApi) {
  const ac = dependency(objectApi);
  const fk = filmDependency(objectApi);
  const on = !!(ac.installed || fk.installed);
  return {
    installed: on,
    version: text(ac.version) || text(fk.version),
    notice: on ? "" : ac.notice + " " + fk.notice,
    cinema: ac,
    film: fk,
  };
}

// The orchestrator's batched row, in the cardspec shape both grammars read. The one translation is the page's text field — cards.js calls it `content`, the card grammar calls it `body` — exactly the translation read() makes for a single card.
export function cardspecOf(entry) {
  const secs = (entry && entry.sections) || [];
  const pgs = (entry && entry.pages) || [];
  return {
    name: text(entry && entry.name),
    sections: secs.map((s) => ({ name: text(s.name), content: text(s.content) })),
    pages: pgs.map((p) => ({ title: text(p.title), header: text(p.header), body: text(p.content), footer: text(p.footer) })),
  };
}

// THE WORDS — #[line: who — words] and #[score: …] read by the parsers that already own them (lib/refs.js's line grammar, lib/soundspec.js's cue grammar; never a second parser for one token) and stamped onto the shot they were written under. A score that names a shot ("on kael") is placed by that name; anything else rides where it sits in the prose.
export function voiceOf(scene, opts) {
  const o = opts || {};
  const out = { lines: [], music: [], warnings: [] };
  const shots = (scene && scene.shots) || [];
  const label = typeof o.nameOf === "function" ? o.nameOf : null;

  const raws = (scene && scene.lines) || [];
  for (let i = 0; i < raws.length; i++) {
    const parsed = REFS.lineParse(raws[i].raw);
    if (!text(parsed.words)) {
      out.warnings.push('A spoken line — “' + text(raws[i].raw) + '” — carries a speaker but no words, so nothing is said.');
      continue;
    }
    if (!shots.length) {
      out.warnings.push('“' + text(parsed.words) + '” has no shot to be spoken over — write a #[cam: …] before it.');
      continue;
    }
    let who = text(parsed.who);
    if (parsed.whoId && label) who = label(parsed.whoId) || who;
    const at = Math.min(Math.max(0, (raws[i].after || 0) - 1), shots.length - 1);
    out.lines.push({ at: at, who: who, text: text(parsed.words), label: (who ? who + " — " : "") + text(parsed.words) });
  }

  const cues = (scene && scene.scores) || [];
  for (let c = 0; c < cues.length; c++) {
    const cue = SOUND.parseCue(cues[c].raw);
    for (let w = 0; w < (cue.warnings || []).length; w++) out.warnings.push(cue.warnings[w]);
    if (!text(cue.source)) continue;
    let clip = text(cue.source);
    if (cue.sourceKind !== "path") {
      const resolved=typeof o.sourceOf === "function"?o.sourceOf(cue):"";
      if(resolved&&typeof resolved==="object"){out.warnings.push("Score "+cue.source+": "+(resolved.error||"Film Kit requires an explicitly exported recording, not a native document")+"; no music file was invented.");continue;}
      clip=typeof resolved==="string"?resolved:"";
      if (!clip) {
        out.warnings.push('The score names “' + text(cue.source) + '”, which is not on the Asset Library shelf — no music was written for that shot.');
        continue;
      }
    }
    if (!shots.length) {
      out.warnings.push('“' + clip + '” has no shot to play under — write a #[cam: …] first.');
      continue;
    }
    let at = Math.max(0, (cues[c].after || 0) - 1);
    if (cue.onShot) {
      const hit = SOUND.matchEvent(cue.onShot, SOUND.identities(shots));
      if (hit && hit.index >= 0) at = hit.index;
      else out.warnings.push('The score says "on ' + text(cue.onShot) + '" and no shot answers to that name — it rides the shot it is written under.');
    }
    const wroteGain = /\bgain\b/i.test(text(cues[c].raw));
    out.music.push({
      at: Math.min(at, shots.length - 1),
      clip: clip,
      gain: wroteGain ? cue.gain : SCORE_BED_GAIN,
      loop: !!cue.loop,
      label: clip,
    });
  }
  return out;
}

// Every card in the folder, parsed once: the shot list, the sound track and the words. PURE past the
// map and the shelf lens it is lent — no SQL of its own, no world touched.
export function scenesOf(cards, map, sourceOf) {
  const label = nameLens(map);
  const out = [];
  for (const entry of cards || []) {
    const spec = cardspecOf(entry);
    const parse = SPEC.parseScene(spec, label);
    const track = SOUND.parseCard(spec,{referenceOf:sourceOf?.resolveDocument});
    const voice = voiceOf(parse, { nameOf: label, sourceOf: sourceOf });
    out.push({
      id: text(entry.id),
      name: spec.name || "Scene",
      parse: parse,
      cues: track.cues || [],
      voice: voice,
      warnings: (parse.warnings || []).concat(track.warnings || [], voice.warnings),
    });
  }
  return out;
}

// An emitter re-says the scene's own warnings on its way out (both do, by design). The folder says
// each one ONCE, in the card's name, and keeps only what the emitter itself found.
export function emitterOnly(list, scene, name) {
  const seen = {};
  for (const w of (scene && scene.warnings) || []) seen[w] = true;
  const out = [];
  for (const w of list || []) if (!seen[w]) out.push("“" + name + "”: " + w);
  return out;
}

// ONE MERGED FILM for the film-kit target. Every scene emits through the very emitter the single-card
// lane uses; the folder only renumbers, so shot ids run 01..NN across the whole film and each scene's
// set keeps its own id.
export function filmOfScenes(scenes, opts) {
  const o = opts || {};
  const out = {
    key: "",
    title: text(o.title) || "Film",
    place: text(o.place) || FOLDER_PLACE,
    shots: [],
    sets: {},
    seconds: 0,
    rows: [],
    warnings: [],
  };
  let n = 0;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const em = SPEC.emitFilm(sc.parse, {
      name: sc.name,
      cardId: o.folderId,
      place: out.place,
      lines: sc.voice.lines,
      music: sc.voice.music,
    });
    out.key = out.key || text(em.key);
    for (const w of emitterOnly(em.warnings, sc.parse, sc.name)) out.warnings.push(w);
    if (em.error || !em.shots.length) continue;
    const setMap = {};
    let k = 0;
    for (const row of em.shots) {
      const oldSet = text(row.set);
      if (!setMap[oldSet]) {
        setMap[oldSet] = oldSet.indexOf(em.key + "-set") === 0 ? em.key + "-s" + pad2n(i + 1) + oldSet.slice(em.key.length + 4) : oldSet;
      }
      row.set = setMap[oldSet];
      n += 1;
      k += 1;
      row.id = em.key + "-" + pad2n(n);
      out.shots.push(row);
      out.rows.push({ cardId: sc.id, cardName: sc.name, scene: i, ordinal: k, row: row });
    }
    for (const key in em.sets) {
      if (!Object.prototype.hasOwnProperty.call(em.sets, key)) continue;
      out.sets[setMap[key] || key] = em.sets[key];
    }
    out.seconds = round2(out.seconds + (em.seconds || 0));
  }
  return out;
}

// ONE CLIP for the Absolute Cinema target: the scenes' sequences end to end on one clock. `end` on a shot stops the director, so only the last shot of the last scene may carry it — an earlier one is named and dropped rather than ending the film in its second scene.
export function clipOfScenes(scenes, opts) {
  const o = opts || {};
  const out = {
    clip: { name: text(o.title) || "Film", nodes: [], sequence: [], effects: [] },
    seconds: 0,
    entries: [],
    fx: [],
    warnings: [],
  };
  let clock = 0;
  let lastWantedEnd = false;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const built = SPEC.compile(sc.parse, { name: sc.name });
    for (const w of emitterOnly(built.warnings, sc.parse, sc.name)) out.warnings.push(w);
    if (built.error || !built.clip.sequence.length) continue;
    const pre = "s" + pad2n(i + 1) + "-";
    const nodeById = {};
    for (const node of built.clip.nodes) {
      node.id = pre + node.id;
      nodeById[node.id] = node;
      out.clip.nodes.push(node);
    }
    for (let q = 0; q < built.clip.sequence.length; q++) {
      const e = built.clip.sequence[q];
      e.nodeId = pre + e.nodeId;
      const opening = q === 0 && out.clip.sequence.length > 0;
      if (opening && e.transition) {
        out.warnings.push('“' + sc.name + '” opens on a blend — a scene boundary is a cut, so its first shot was cut into.');
        e.transition = 0;
      }
      lastWantedEnd = !!e.ending;
      if (e.ending && !(i === scenes.length - 1 && q === built.clip.sequence.length - 1)) {
        out.warnings.push('“' + sc.name + '” asks to end on this shot — only the last shot of the last scene ends the film, so it plays on.');
      }
      e.ending = false;
      out.clip.sequence.push(e);
      out.entries.push({ cardId: sc.id, scene: i, ordinal: out.entries.length + 1, seq: e, node: nodeById[e.nodeId] || null });
    }
    for (const fx of built.clip.effects) {
      out.fx.push({
        cardId: sc.id,
        scene: i,
        fx: { id: "fx-" + (out.fx.length + 1), type: fx.type, time: round2((fx.time || 0) + clock), params: fx.params || {} },
      });
    }
    clock = round2(clock + (built.seconds || 0));
  }
  for (const row of out.fx) out.clip.effects.push(row.fx);
  if (lastWantedEnd && out.clip.sequence.length) out.clip.sequence[out.clip.sequence.length - 1].ending = true;
  out.seconds = clock;
  return out;
}

// ── THE DIFF ROWS ──────────────────────────────────────────────────────────────────────────────── One item per thing that lands, keyed so a key survives an edit that did not touch it: a shot is its CARD plus its ordinal in that card, so a scene added at the top of the folder does not re-add every shot below it.
export function shotSig(row, seq) {
  return JSON.stringify({
    s: row.seconds,
    l: row.lens,
    c: row.camera,
    u: text(row.subject),
    e: text(row.set),
    d: row.card || null,
    h: seq ? seq.hold : 0,
    t: seq ? seq.transition : 0,
    g: seq ? text(seq.easing) : "",
  });
}

export function itemsOf(scenes, film, clip) {
  const items = [];
  const filmByScene = {};
  const clipByScene = {};
  for (const r of film.rows) (filmByScene[r.scene] = filmByScene[r.scene] || []).push(r);
  for (const e of clip.entries) (clipByScene[e.scene] = clipByScene[e.scene] || []).push(e);
  for (const f of clip.fx) (clipByScene["fx" + f.scene] = clipByScene["fx" + f.scene] || []).push(f);

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const rows = filmByScene[i] || [];
    const ents = clipByScene[i] || [];
    for (let k = 0; k < rows.length; k++) {
      const row = rows[k].row;
      const ent = ents[k] || null;
      const shown = ent && ent.node ? text(ent.node.name) : text(row.subject) || "Shot " + pad2n(k + 1);
      items.push({
        key: "shot:" + sc.id + ":" + pad2n(k + 1),
        what: shown,
        detail: sc.name + " · " + row.seconds + "s · " + row.lens + "mm",
        sig: shotSig(row, ent && ent.seq),
        warn: ent ? "" : "This shot reaches film-kit but has no camera node for the director.",
        payload: { film: row, seq: ent ? ent.seq : null, node: ent ? ent.node : null },
      });
    }
    if (rows.length !== ents.length) {
      items.push({
        key: "shot:" + sc.id + ":mismatch",
        what: "The two targets disagree about “" + sc.name + "”",
        detail: rows.length + " shots for film-kit, " + ents.length + " for the director",
        sig: rows.length + "|" + ents.length,
        warn: "Only the shots both targets agree on will land.",
        payload: null,
      });
    }
    const fxs = clipByScene["fx" + i] || [];
    for (let f = 0; f < fxs.length; f++) {
      const fx = fxs[f].fx;
      const p = fx.params || {};
      items.push({
        key: "fx:" + sc.id + ":" + pad2n(f + 1),
        what: text(fx.type) + (text(p.text) ? " · " + text(p.text) : text(p.message) ? " · " + text(p.message) : ""),
        detail: sc.name + " · at " + fx.time + "s",
        sig: text(fx.type) + "|" + JSON.stringify(p),
        warn: "",
        payload: { fx: fx },
      });
    }
    for (let l = 0; l < sc.voice.lines.length; l++) {
      const ln = sc.voice.lines[l];
      items.push({
        key: "line:" + sc.id + ":" + pad2n(l + 1),
        what: ln.label,
        detail: sc.name + " · shot " + (ln.at + 1),
        sig: ln.who + "|" + ln.text + "|" + ln.at,
        warn: "",
        payload: { line: { who: ln.who, text: ln.text }, at: ln.at },
      });
    }
    for (let m = 0; m < sc.voice.music.length; m++) {
      const mu = sc.voice.music[m];
      items.push({
        key: "score:" + sc.id + ":" + pad2n(m + 1),
        what: mu.label,
        detail: sc.name + " · shot " + (mu.at + 1) + " · bed " + mu.gain,
        sig: mu.clip + "|" + mu.gain + "|" + mu.at,
        warn: "",
        payload: { music: { clip: mu.clip, gain: mu.gain }, at: mu.at },
      });
    }
  }
  return items;
}

// ── PLAN ───────────────────────────────────────────────────────────────────────────────────────── Reads the folder the orchestrator already batched, compiles every scene card once, and answers what WOULD land. Nothing is written, nothing is dressed, nothing crosses to a mod.
export async function planLane(ctx) {
  const api = ctx && ctx.api;
  const out = { items: [], warnings: [] };
  const cards = (ctx && ctx.cards) || [];
  const dep = (ctx && ctx.installed && (ctx.installed.cinema || ctx.installed.film) ? ctx.installed : installed(api));
  const acDep = dep.cinema || dependency(api);
  const fkDep = dep.film || filmDependency(api);
  if (!cards.length) return out;

  // ONE reference map for the whole press — the orchestrator's shared cache already holds it, so this
  // costs nothing (his batching law).
  let map = null;
  try {
    map = await REFS.loadMap(api, ctx.bookId, ctx.cache);
  } catch (e) {
    map = null;
  }

  const tracks=cards.map(entry=>SOUND.parseCard(cardspecOf(entry)));
  const sources=await documentSources(api,ctx.bookId,tracks.flatMap(t=>t.cues),tracks.flatMap(t=>t.references),map);
  out.warnings.push(...sources.warnings);
  const scenes = scenesOf(cards,map,sourceLens(api,sources.documents));
  let title = text(ctx && ctx.folderName);
  if (!title) {
    try {
      const folder = await CARDS.getFolder(api, ctx.bookId, ctx.folderId);
      title = text(folder && folder.name);
    } catch (e) {
      title = "";
    }
  }
  title = title || "Film";

  const film = filmOfScenes(scenes, { folderId: ctx.folderId, title: title, place: FOLDER_PLACE });
  const clip = clipOfScenes(scenes, { title: title });
  out.items = itemsOf(scenes, film, clip);

  for (const sc of scenes) for (const w of sc.warnings) out.warnings.push("“" + sc.name + "”: " + w);
  for (const w of film.warnings) out.warnings.push(w);
  for (const w of clip.warnings) out.warnings.push(w);

  let lines = 0;
  let score = 0;
  let cues = 0;
  for (const sc of scenes) {
    lines += sc.voice.lines.length;
    score += sc.voice.music.length;
    cues += sc.cues.length;
  }
  // WHERE THE CONTRACT HAS NO HOME, THE PLAN SAYS SO. film-kit's shot carries `lines` and `music`; Absolute Cinema's clip carries a camera and an effects track and nothing spoken. Lines now play on Codex's own seat (subtitle + voice, the courier); only the score has no home in the director's clip.
  if (score) {
    out.warnings.push("Absolute Cinema plays the picture only -- " + score + (score === 1 ? " music cue rides" : " music cues ride") + " film-kit's shot list; the director's clip has no home for them.");
  }
  if (cues) {
    out.warnings.push(
      cues + (cues === 1 ? " #[sound: …] cue stays" : " #[sound: …] cues stay") + " with the scene's own playback — a compile lands the picture, not the sound."
    );
  }
  if (!acDep.installed && clip.clip.sequence.length) out.warnings.push(acDep.notice);
  if (!fkDep.installed && film.shots.length) out.warnings.push(fkDep.notice);
  if (film.shots.length && fkDep.installed) {
    // The single-card lane writes its own block under its own card key. Both blocks in one file is
    // the same scene twice, so it is named rather than quietly deduped.
    const got = readFilm(api);
    const doubled = [];
    for (const sc of scenes) {
      const mark = "cb-" + text(sc.id).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 28) + "-";
      for (const row of (got.doc && got.doc.shots) || []) {
        if (text(row && row.id).indexOf(mark) === 0) {
          doubled.push(sc.name);
          break;
        }
      }
    }
    if (doubled.length)
      out.warnings.push(
        "“" + doubled.join("”, “") + "” " + (doubled.length === 1 ? "already has" : "already have") +
          " its own shots in " + FILM_PATH + " from a single-card Shoot — landing the folder puts those scenes in the file twice. Cut them there, or shoot only the folder."
      );
  }
  return out;
}

// ── LAND ───────────────────────────────────────────────────────────────────────────────────────── Both targets, exactly the way the single-card lane lands them: film-kit's contract file merged by this film's own key, and the clip handed to Absolute Cinema as JSON TEXT over its documented import action.
export async function landLane(ctx) {
  const api = ctx && ctx.api;
  const out = { landed: 0, skipped: 0, warnings: [], error: "" };
  const live = (ctx && ctx.live) || [];
  if (!live.length) return out;

  const plan = (ctx && ctx.plan) || {};
  const title = text(plan.folderName) || "Film";
  const shots = [];
  const sets = {};
  const nodes = [];
  const seenNode = {};
  const sequence = [];
  const effects = [];
  let words = 0;
  for (const item of live) {
    const p = (item && item.payload) || null;
    if (!p) continue;
    if (p.film) {
      shots.push(p.film);
      if (text(p.film.set) && !sets[text(p.film.set)]) {
        sets[text(p.film.set)] = { place: FOLDER_PLACE, notes: 'A set from the Worldwright Studio folder "' + title + '".' };
      }
      if (p.node && !seenNode[text(p.node.id)]) {
        seenNode[text(p.node.id)] = true;
        nodes.push(p.node);
      }
      if (p.seq) sequence.push(p.seq);
    } else if (p.fx) {
      effects.push(p.fx);
    } else if (p.line || p.music) {
      words += 1;
    }
  }
  if (!shots.length) {
    out.skipped = live.length;
    out.warnings.push("This plan carries no shot rows — press Compile again before landing.");
    return out;
  }

  // THE FILM-KIT TARGET — its own contract file, merged under this folder's key.
  const fkDep = filmDependency(api);
  if (fkDep.installed) {
    const emitted = { key: text(shots[0].id).replace(/-\d+$/, ""), title: title, shots: shots, sets: sets, place: FOLDER_PLACE };
    const landed = landFilm(api, emitted, { dep: fkDep });
    if (landed.error) out.warnings.push(landed.error);
    else out.landed += shots.length + words;
  } else {
    out.skipped += shots.length + words;
    out.warnings.push(fkDep.notice);
  }

  // THE ABSOLUTE CINEMA TARGET — the clip, as JSON TEXT over the director's own import action.
  const acDep = dependency(api);
  if (!acDep.installed) {
    out.skipped += sequence.length;
    out.warnings.push(acDep.notice);
  } else if (typeof (ctx && ctx.send) !== "function") {
    out.skipped += sequence.length;
    out.warnings.push("The film is written and ready — this seat has no way to hand it to " + DEP.title + ", so nothing was imported.");
  } else {
    const clip = { name: title, nodes: nodes, sequence: sequence, effects: effects };
    const rolled = roll(ctx.send, clip, { play: !!(ctx && ctx.play), dep: acDep });
    if (rolled.error) out.warnings.push(rolled.error);
    else out.landed += sequence.length;
  }
  return out;
}

module.exports = {
  VERSION: VERSION,
  SET_TAG: SET_TAG,
  ID_PREFIX: ID_PREFIX,
  SET_CAP: SET_CAP,
  IMPORT_ACTION: IMPORT_ACTION,
  PLAY_ACTION: PLAY_ACTION,
  DEP: DEP,
  dependency: dependency,
  status: status,
  read: read,
  bodies: bodies,
  strike: strike,
  dress: dress,
  // the action-beat lane: a placement's spec (behavior included) and beats → set-piece actions
  SET_PIECE_BEHAVIOR: SET_PIECE_BEHAVIOR,
  specFor: specFor,
  actionsOf: actionsOf,
  navsOf: navsOf,
  linesOf: linesOf,
  clipFor: clipFor,
  roll: roll,
  shoot: shoot,
  preview: preview,
  summary: summary,
  // ── the film-kit target: same cards, film-kit's own contract file ──
  FILM_DEP: FILM_DEP,
  FILM_CONTRACT: FILM_CONTRACT,
  FILM_PATH: FILM_PATH,
  emptyFilm: emptyFilm,
  filmDependency: filmDependency,
  readFilm: readFilm,
  mergeFilm: mergeFilm,
  landFilm: landFilm,
  film: film,
  filmStatus: filmStatus,
  filmSummary: filmSummary,
  statusAll: statusAll,
  shootAll: shootAll,
  // ── the folder lane: lib/compile.js's adapter contract, both targets ──
  installed: installed,
  voiceOf: voiceOf,
  scenesOf: scenesOf,
  filmOfScenes: filmOfScenes,
  clipOfScenes: clipOfScenes,
  planLane: planLane,
  landLane: landLane,
};
