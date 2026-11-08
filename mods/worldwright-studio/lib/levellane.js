// Compile-lane adapter for authored level data. Validate references and optional tool contracts before landing; do not deploy private editor drafts.

const SHELF = require("lib/assetshelf.js");
const ATMO = require("lib/atmokitchen.js");
const REFS = require("lib/refs.js");

const VERSION = 1;

// Every object this lane stands up wears BOTH tags: the shared one, so a person can find everything
// the tool has ever placed, and the folder's own, so two level folders can never clear each other.
const LEVEL_TAG = "sb-lvl";
const ID_PREFIX = "sb-lvl-";

// A guard, not a budget: past this a folder is a reference loop, not a level. Nothing is dropped
// silently — the number is named in the plan.
const MAX_PLACEMENTS = 200;

// How deep a composite call may nest. Three is a group of groups of groups; past that it is a loop
// wearing a costume, and the plan says so.
const MAX_DEPTH = 3;

// How far a prop may sit from where the manifest says it landed before the plan calls it moved by
// hand. Coarse on purpose: a god-mode drag is centimetres at least, never micrometres.
const DRIFT = 0.05;

// Placement is OURS — no mod stands behind this lane. `installed` still answers the contract's shape so the orchestrator never special-cases a row. The shelf's absence is a plan sentence, not a broken lane: a level doc with no Asset Library still reads, it just has nothing to stand up.
const DEP = {
  id: "",
  title: "Level placement",
  what: "props from the prose, stood up in the room",
};

const SHELF_DEP = {
  title: "Asset Library",
  install: "Install it from the Spawn mod library — search “asset-library”.",
};

export function text(v) {
  return typeof v === "string" ? v : v === 0 || v ? String(v) : "";
}

export function num(v, d) {
  const n = Number(v);
  return isFinite(n) ? n : d || 0;
}

export function plural(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

export function round2(n) {
  return Math.round(num(n, 0) * 100) / 100;
}

export function yawOf(v) {
  return round2(((num(v, 0) % 360) + 360) % 360);
}

export function scaleOf(v) {
  return Math.max(0.01, round2(v));
}

// ── THE GRAMMAR ────────────────────────────────────────────────────────────────────────────────── The token is the noun of the author's own sentence (jace, 2026-08-29: "All of them should be that way. #[asset: Humanoid Villager at 2, -1] #[pose: Kneeling] A token that carries its own `at` reads ONLY what is inside its brackets — several can share one sentence, each standing where its own words say. The same mention rule holds (no `at`, no call — a plain ref in a sentence is just a link), the definition card lives OUTSIDE the compiled folder (inside it, its lines already compile on their own — the call is skipped and named), and calls may nest a few levels but never loop.
const AT_RE = /\bat\s*\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?/;
const SAID_AT_RE = /\bat\b/;
const FACING_RE = /\bfacing\s+(-?\d+(?:\.\d+)?)/;
const SCALE_RE = /\bscale\s+(\d+(?:\.\d+)?)/;
const SOLID_RE = /\bsolid\b/;

// The card's text in the order lib/compile.js reads it: the structured blocks first, then the pages
// — the order the author reads the card in, so line order in the plan matches line order on screen.
export function bodiesOf(cards) {
  const out = [];
  for (const entry of cards || []) {
    const cardId = text(entry.id);
    const cardName = text(entry.name);
    for (const s of entry.sections || []) {
      if (text(s.content)) out.push({ cardId: cardId, cardName: cardName, body: text(s.content) });
    }
    for (const p of entry.pages || []) {
      for (const part of [p.header, p.content, p.footer]) {
        if (text(part)) out.push({ cardId: cardId, cardName: cardName, body: text(part) });
      }
    }
  }
  return out;
}

// js's own lexer, borrowed whole: the tokens come out named, and the prose BETWEEN them comes back as `rest` — which is the only part a BARE token's coordinate words are ever read from, so a number inside a token can never be mistaken for a line position.
export function scanLine(line) {
  const re = new RegExp(REFS.TOKEN_SOURCE, "g");
  const out = { assets: [], poses: [], atmos: [], plains: [], rest: "" };
  let m;
  let last = 0;
  let rest = "";
  while ((m = re.exec(line)) !== null) {
    rest += line.slice(last, m.index) + " ";
    last = re.lastIndex;
    const t = REFS.parseToken(m[1]);
    const up = text(t.name).toUpperCase();
    if (up === REFS.ASSET_NAME) out.assets.push(REFS.splitArgs(text(t.value).trim()));
    else if (up === REFS.POSE_NAME) out.poses.push(text(t.value).trim());
    else if (up === REFS.ATMO_NAME) out.atmos.push(text(t.value).trim());
    else if (!t.value && t.raw.indexOf(":") === -1 && up !== "COUNT" && up !== "TOTAL" && up !== "DATETIME") {
      // A PLAIN card ref — the composite-call candidate. Whether it CALLS is decided where the
      // position is read: no place, no call, just a link in the author's sentence.
      out.plains.push(REFS.splitArgs(t.raw));
    }
  }
  rest += line.slice(last);
  out.rest = rest.toLowerCase();
  return out;
}

export function positionIn(rest) {
  const m = rest.match(AT_RE);
  if (!m) return { found: false, saidAt: SAID_AT_RE.test(rest) };
  // Three numbers are x, y, z — the author pinned the height. Two are x, z, and the prop meets the
  // ground wherever the ground happens to be (y: { terrain: 0 }), which survives a terrain edit.
  if (m[3] !== undefined) {
    return { found: true, saidAt: true, x: round2(m[1]), y: round2(m[2]), z: round2(m[3]), ground: false };
  }
  return { found: true, saidAt: true, x: round2(m[1]), y: 0, z: round2(m[2]), ground: true };
}

export function feetOf(pos) {
  return pos.ground ? { x: pos.x, z: pos.z, y: { terrain: 0 } } : { x: pos.x, y: pos.y, z: pos.z };
}

// The sentence a warning uses for a place: the way the author wrote it, not the way the engine
// stores it — "3, -2" when they gave two numbers, "3, 0.4, -2" when they gave three.
export function sayAt(pos) {
  if (!pos) return "nowhere";
  return pos.ground ? round2(pos.x) + ", " + round2(pos.z) : round2(pos.x) + ", " + round2(pos.y) + ", " + round2(pos.z);
}

export function sayLive(at, ground) {
  if (!at) return "nowhere";
  return ground ? round2(at.x) + ", " + round2(at.z) : round2(at.x) + ", " + round2(at.y) + ", " + round2(at.z);
}

// What KIND of thing a shelf row is, for placement: the path decides first (it is the truth about the file), the row's own kind word second. A sound, an animation clip with no mesh, or a `set:` arrangement is not one prop — it comes back "" and is named as a skip, never guessed at.
export function renderOf(row) {
  const p = text(row && row.path).toLowerCase();
  if (!p || p.indexOf("set:") === 0) return "";
  if (/\.(glb|gltf)(\?|$)/.test(p)) return "model";
  if (/\.(png|jpe?g|webp|gif)(\?|$)/.test(p)) return "sprite";
  const k = text(row && row.kind).toLowerCase();
  if (k === "model" || k === "animation") return "model";
  if (k === "image" || k === "sprite") return "sprite";
  return "";
}

export function folderTag(folderId) {
  return ID_PREFIX + SHELF.slug(folderId);
}

// The line's placement vocabulary, read once per line — the words OUTSIDE the tokens.
export function lineWordsOf(scan) {
  const ym = scan.rest.match(FACING_RE);
  const sm = scan.rest.match(SCALE_RE);
  return { pos: positionIn(scan.rest), yaw: ym ? yawOf(ym[1]) : 0, scale: sm ? scaleOf(sm[1]) : 1, solid: SOLID_RE.test(scan.rest) };
}

// The one read of a token's placement words: its OWN args when it carries them, the line's words
// when it is bare. Embedded args are a closed room — prose outside the brackets never leaks in.
export function wordsOf(a, lineWords) {
  if (!a.args) return { pos: lineWords.pos, yaw: lineWords.yaw, scale: lineWords.scale, solid: lineWords.solid, own: false };
  const ar = " " + a.args.toLowerCase() + " ";
  const ym = ar.match(FACING_RE);
  const sm = ar.match(SCALE_RE);
  return { pos: positionIn(ar), yaw: ym ? yawOf(ym[1]) : 0, scale: sm ? scaleOf(sm[1]) : 1, solid: SOLID_RE.test(ar), own: true };
}

// ── COMPOSITES ─────────────────────────────────────────────────────────────────────────────────── A member's LOCAL words, stamped into the room by the call's anchor: offsets rotate by the call's facing (engine yaw: 0 faces -Z, counter-clockwise from above) and scale by its scale; yaws add, scales multiply, solid inherits.
export function placeMember(m, a) {
  const th = (a.yaw * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const lx = m.pos.x * a.scale;
  const lz = m.pos.z * a.scale;
  const ground = m.pos.ground && a.pos.ground;
  const baseY = a.pos.ground ? 0 : a.pos.y;
  return {
    pos: {
      x: round2(a.pos.x + lx * cos + lz * sin),
      y: ground ? 0 : round2(m.pos.ground ? baseY : baseY + m.pos.y * a.scale),
      z: round2(a.pos.z + (-lx * sin + lz * cos)),
      ground: ground,
    },
    yaw: yawOf(m.yaw + a.yaw),
    scale: scaleOf(m.scale * a.scale),
    solid: m.solid || a.solid,
  };
}

// The call's card, or null with the reason already said. `book` is lib/compile.js's whole-book
// index, built off the three reads it already makes — this lane still runs zero SQL.
export function resolveCall(book, head, folderId, visited, depth, warnings) {
  const name = text(head).trim();
  if (!name || !book) return null;
  if (depth > MAX_DEPTH) {
    warnings.push("“" + name + "” sits more than " + MAX_DEPTH + " calls deep — that is a loop's shape, and it was cut there.");
    return null;
  }
  const card = book.byId[name] || book.byName[name.toLowerCase()];
  if (card === false) {
    warnings.push("Two cards share the name “" + name + "” — call it by its id.");
    return null;
  }
  if (!card) {
    warnings.push("“" + name + "” is placed like a card, but no card in this book wears that name.");
    return null;
  }
  if (text(card.folderId) === text(folderId)) {
    warnings.push("“" + text(card.name) + "” is inside this folder — its lines already compile on their own, so the call was skipped.");
    return null;
  }
  if (visited[card.id]) {
    warnings.push("“" + text(card.name) + "” calls itself in a loop — the loop was cut.");
    return null;
  }
  return card;
}

// The function body, read flat: every placed #[asset: …] line in the definition card, LOCAL coordinates kept exactly as written; nested calls expand and fold into this same frame. Mentions inside a definition are prose, same as everywhere. Free poses bind to their line's first member.
export function collectMembers(book, card, folderId, visited, depth, warnings) {
  const out = [];
  const chain = Object.assign({}, visited);
  chain[card.id] = true;
  for (const entry of bodiesOf([card])) {
    for (const lineRaw of entry.body.split(/\r?\n/)) {
      const raw = lineRaw.trim();
      if (!raw) continue;
      const scan = scanLine(raw);
      if (!scan.assets.length && !scan.plains.length) continue;
      const lineWords = lineWordsOf(scan);
      let bound = "";
      for (const d of scan.poses) {
        const parsed = REFS.poseParse(d);
        if (parsed && parsed.pose && !parsed.target && !bound) bound = text(parsed.pose);
      }
      for (const a of scan.assets) {
        const w = wordsOf(a, lineWords);
        if (!w.pos.found) continue;
        out.push({ token: a.head, pos: w.pos, yaw: w.yaw, scale: w.scale, solid: w.solid, pose: bound });
        bound = "";
      }
      for (const c of scan.plains) {
        const w = wordsOf(c, lineWords);
        if (!w.pos.found) continue;
        const inner = resolveCall(book, c.head, folderId, chain, depth + 1, warnings);
        if (!inner) continue;
        for (const m of collectMembers(book, inner, folderId, chain, depth + 1, warnings)) {
          const t = placeMember(m, w);
          out.push({ token: m.token, pos: t.pos, yaw: t.yaw, scale: t.scale, solid: t.solid, pose: m.pose });
        }
      }
    }
  }
  return out;
}

// One placement, stood into the read: the shelf answers what the token IS, the seat counter keeps duplicate lines distinct, and `via` (the composite a member arrived through) is part of the seat — a group's members can never trade keys with a directly-written twin.
export function standUp(out, seen, api, shelfUp, entry, raw, token, w, pose, folderId, via) {
  if (out.rows.length >= MAX_PLACEMENTS) {
    out.capped++;
    return false;
  }
  const row = shelfUp ? SHELF.resolve(api, token) : null;
  const assetKey = row ? text(row.id) : SHELF.slug(token) || "unnamed";
  const seatKey = (via ? (SHELF.slug(via) || "group") + ">" : "") + assetKey;
  const seat = entry.cardId + ":" + seatKey;
  seen[seat] = (seen[seat] || 0) + 1;
  const render = row ? renderOf(row) : "";
  const name = row ? text(row.name) : token;
  const state = !shelfUp ? "nomod" : !row ? "missing" : !render ? "unplaceable" : "live";
  out.rows.push({
    key: "lvl:" + entry.cardId + ":" + seatKey + ":" + seen[seat],
    cardId: entry.cardId,
    cardName: entry.cardName,
    line: raw,
    token: token,
    assetKey: assetKey,
    name: name,
    path: row ? text(row.path) : "",
    kind: row ? text(row.kind) : "",
    render: render,
    state: state,
    pos: { x: w.pos.x, y: w.pos.y, z: w.pos.z, ground: w.pos.ground },
    yaw: w.yaw,
    scale: w.scale,
    solid: w.solid,
    pose: pose,
    via: via || "",
    folderId: text(folderId),
  });
  return true;
}

// ── THE READ ───────────────────────────────────────────────────────────────────────────────────── The folder's cards, line by line, into placements. No database, no mod: ctx.cards is already in memory and the shelf is a cached text read.
export function readLevel(api, cards, folderId, book) {
  const out = { rows: [], mentions: 0, mood: null, moodToken: "", warnings: [], capped: 0 };
  const seen = {};
  const shelfUp = !!SHELF.installed(api);

  for (const entry of bodiesOf(cards)) {
    const lines = entry.body.split(/\r?\n/);
    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li].trim();
      if (!raw) continue;
      const scan = scanLine(raw);
      // A mood rides the FOLDER, not a line: the first #[atmo: …] in the folder is the level's mood, resolved through the kitchen's own table. Free text is a legitimate mood (its ruling), so an unresolved word is carried as written, never treated as an error.
      for (const a of scan.atmos) {
        if (!out.moodToken && a) {
          out.moodToken = a;
          out.mood = ATMO.resolve(a);
        }
      }
      if (!scan.assets.length && !scan.plains.length) continue;

      // The line's words place any BARE token on it — one placement per line, the older grammar. A token that carries its own args reads ONLY its brackets, so prose saying "solid" or "at midnight" can never leak into a token that already said where it stands — and several such tokens can share one sentence, each standing where its own words say.
      const lineWords = lineWordsOf(scan);
      // A free pose (#[pose: Kneeling], no " on …") written on a placement line belongs to that
      // line's prop as a reference-only annotation. No pose is applied by this lane.
      let bound = "";
      for (const d of scan.poses) {
        const parsed = REFS.poseParse(d);
        if (parsed && parsed.pose && !parsed.target && !bound) bound = text(parsed.pose);
      }

      let bareMentions = 0;
      for (const a of scan.assets) {
        const w = wordsOf(a, lineWords);
        if (!w.pos.found) {
          // A prop named in a sentence with no place is a MENTION. It is not placed and it is not
          // in the diff — it would otherwise land at the origin and read as a bug in the prose.
          bareMentions++;
          continue;
        }
        if (standUp(out, seen, api, shelfUp, entry, raw, a.head, w, bound, folderId, "")) {
          bound = "";
        }
      }

      // THE CALLS: a plain ref with a place stamps its definition card here, whole. No place, no
      // call — a card named mid-sentence stays what it always was, a link.
      for (const c of scan.plains) {
        const w = wordsOf(c, lineWords);
        if (!w.pos.found) {
          if (w.own) {
            out.warnings.push('“' + c.head + '” says “at” but no coordinates follow it — nothing was placed from that call.');
          }
          continue;
        }
        const card = resolveCall(book, c.head, folderId, {}, 1, out.warnings);
        if (!card) continue;
        const members = collectMembers(book, card, folderId, {}, 1, out.warnings);
        if (!members.length) {
          out.warnings.push('“' + text(card.name) + '” places nothing — no #[asset: … at …] line inside it.');
          continue;
        }
        const via = text(card.name) || text(card.id);
        for (const m of members) {
          standUp(out, seen, api, shelfUp, entry, raw, m.token, placeMember(m, w), m.pose, folderId, via);
        }
      }
      if (bareMentions) {
        out.mentions += bareMentions;
        if (lineWords.pos.saidAt && !lineWords.pos.found) {
          out.warnings.push('“' + raw.slice(0, 80) + '” says “at” but no coordinates follow it — nothing was placed from that line.');
        }
      }
    }
  }
  if (out.capped) {
    out.warnings.push(
      "This folder names " + (out.rows.length + out.capped) + " placements; the first " + MAX_PLACEMENTS + " are the level. That is usually a reference loop, not a room."
    );
  }
  // The mood rides the whole folder, so it is stamped on every prop the folder placed — including
  // the lines written above the #[atmo: …] token, which is why it is applied after the walk.
  const moodLabel = out.mood ? text(out.mood.name) : text(out.moodToken);
  for (const row of out.rows) row.mood = moodLabel;
  return out;
}

// The signature the diff compares: everything a line SAYS about the thing. Position is in it, so
// nudging one coordinate is exactly one update; the mood is not, because a folder-wide mood change
// must not repaint every prop as changed.
export function sigOf(p) {
  return [p.assetKey, p.path, p.pos.x, p.pos.ground ? "g" : p.pos.y, p.pos.z, p.yaw, p.scale, p.solid ? "solid" : "ghost", p.pose].join("|");
}

// ── WHAT IS ACTUALLY STANDING ──────────────────────────────────────────────────────────────────── The other half of the diff. Every object this lane placed carries its own line key in state, so a prop that was renamed, re-ordered in the prose or dragged across the room is still THE prop that line stands for.
export function census(api, folderId) {
  const out = { rows: [], byKey: {}, byId: {}, ids: {} };
  let hits = [];
  try {
    hits = api.query({ tags: [folderTag(folderId)] }) || [];
  } catch (e) {
    hits = [];
  }
  for (const h of hits) {
    // The query answers with state on this engine; a seat that hands back a bare row still gets its
    // line key, read straight off the object rather than guessed from the id.
    let held = h && h.state ? h.state : null;
    if (!held || !held.level) {
      try {
        held = api.getObjectState(text(h.id)) || null;
      } catch (e) {
        held = held || null;
      }
    }
    const st = (held && held.level) || {};
    const row = {
      id: text(h.id),
      key: text(st.key),
      at: (h.worldFeetPosition ?? h.feetPosition) || null,
      ground: !!st.ground,
      render: text(st.render),
      sig: text(st.sig),
    };
    out.rows.push(row);
    out.ids[row.id] = true;
    out.byId[row.id] = row;
    if (row.key && !out.byKey[row.key]) out.byKey[row.key] = row;
  }
  return out;
}

export function mintId(folderId, p, taken) {
  const base = ID_PREFIX + SHELF.slug(folderId) + "-" + (SHELF.slug(p.name || p.token) || "prop").slice(0, 28);
  let n = 1;
  while (taken[base + "-" + n]) n++;
  const id = base + "-" + n;
  taken[id] = true;
  return id;
}

export function installed() {
  return { installed: true, version: text(VERSION), notice: "" };
}

// ── PLAN ───────────────────────────────────────────────────────────────────────────────────────── Lands nothing, reads everything: the prose, the manifest of the last press, and the room itself. SYNCHRONOUS — lib/compile.js calls plan() without awaiting it.
export function planLane(ctx) {
  const api = ctx && ctx.api;
  const folderId = text(ctx && ctx.folderId);
  const prev = (ctx && ctx.prev) || {};
  const level = readLevel(api, (ctx && ctx.cards) || [], folderId, (ctx && ctx.book) || null);
  const live = census(api, folderId);
  const items = [];
  const warnings = level.warnings.slice();

  let noShelf = 0;
  const claimed = {};
  for (const p of level.rows) {
    claimed[p.key] = true;
    const record = (prev[p.key] && prev[p.key].landed) || null;
    const obj = live.byKey[p.key] || (record && live.byId[text(record.id)]) || null;
    let warn = "";

    if (p.state === "nomod") {
      noShelf++;
      warn = "the Asset Library shelf is not readable — nothing to stand up";
    } else if (p.state === "missing") {
      warn = "“" + p.token + "” is not on the shelf — check the name in the Asset Library window";
    } else if (p.state === "unplaceable") {
      warn = "“" + p.name + "” is a " + (p.kind || "row") + ", not a prop that can stand in a room";
    } else if (obj && record && record.at) {
      // THE COLLISION, named before anything stomps it: the room disagrees with the manifest, so
      // somebody moved this by hand and the prose is about to win.
      const at = obj.at || {};
      const movedXZ = Math.abs(num(at.x, 0) - num(record.at.x, 0)) > DRIFT || Math.abs(num(at.z, 0) - num(record.at.z, 0)) > DRIFT;
      const movedY = !record.ground && Math.abs(num(at.y, 0) - num(record.at.y, 0)) > DRIFT;
      if (movedXZ || movedY) {
        warn =
          "moved by hand — it stands at " +
          sayLive(at, record.ground) +
          "; the prose says " +
          sayAt(p.pos) +
          ". Landing puts it back.";
      }
    } else if (record && !obj) {
      warn = "nothing is standing where this landed — the next Land stands it up again";
    }

    items.push({
      key: p.key,
      what: p.name,
      detail: p.cardName + (p.via ? " · via " + p.via : "") + " · at " + sayAt(p.pos) + (p.yaw ? " facing " + p.yaw : "") + (p.pose ? " · " + p.pose + " (reference only)" : ""),
      sig: sigOf(p),
      warn: warn,
      payload: p,
    });
    if (warn) warnings.push("“" + p.name + "” — " + warn);
  }

  if (noShelf) {
    warnings.push(
      SHELF_DEP.title +
        " is not installed — " +
        plural(noShelf, "placement line was", "placement lines were") +
        " read from the prose, but nothing can be stood up. " +
        SHELF_DEP.install
    );
  }
  if (level.mentions) {
    warnings.push(
      plural(level.mentions, "prop is", "props are") + " named in the prose without a place — write “at x, z” on the line and it stands up."
    );
  }

  // Props from an earlier press that no line claims any more and the manifest has forgotten: they
  // are named here and cleared on the next Land, so a room never quietly keeps yesterday's level.
  let orphans = 0;
  for (const row of live.rows) {
    if (row.key && !claimed[row.key] && !prev[row.key]) orphans++;
  }
  if (orphans) {
    warnings.push(plural(orphans, "object", "objects") + " from an earlier compile answers to no line any more — landing clears them.");
  }
  if (level.moodToken) {
    warnings.push("Mood: " + (level.mood ? level.mood.name : level.moodToken) + " rides this level.");
  }

  return { items: items, warnings: warnings };
}

// ── LAND ───────────────────────────────────────────────────────────────────────────────────────── Adds, updates, removes — then hands back the manifest of what is actually standing, keyed by line. A row that cannot stand up is a named skip; nothing here throws.
export async function landLane(ctx) {
  const api = ctx && ctx.api;
  const folderId = text(ctx && ctx.folderId);
  const items = (ctx && ctx.items) || [];
  const live = (ctx && ctx.live) || [];
  // `pending` is the contract's word for a named skip (lib/compile.js § THE ADAPTER CONTRACT): every
  // key this lane could not stand up goes in it, so the next plan offers the line again instead of
  // reading it back as unchanged.
  const out = { landed: 0, skipped: 0, warnings: [], error: "", manifest: {}, pending: [] };
  if (!items.length && !live.length) return out;

  if (!SHELF.installed(api)) {
    out.skipped = live.length;
    for (const it of live) out.pending.push(text(it.key));
    if (live.length) {
      out.warnings.push(
        SHELF_DEP.title + " is not installed — " + plural(live.length, "placement was", "placements were") + " skipped. " + SHELF_DEP.install
      );
    }
    return out;
  }

  const standing = census(api, folderId);
  const taken = {};
  for (const id in standing.ids) taken[id] = true;
  const claimed = {};
  for (const it of live) claimed[text(it.key)] = true;

  // 1 — REMOVES first, so a line an author deleted is gone before anything else moves, and the ids
  // it held are free again. Orphans (placed by an older press, claimed by no line) go with them.
  const doomed = [];
  const marked = {};
  for (const row of standing.rows) {
    if (!row.key) {
      // Ours by tag but carrying no line key: something outside this lane made it. It is left
      // standing and named, because destroying what we cannot identify is how a tool eats a room.
      out.warnings.push("“" + row.id + "” wears this level's tag but no line — left standing, untouched.");
      continue;
    }
    if (claimed[row.key] || marked[row.id]) continue;
    marked[row.id] = true;
    doomed.push(row);
  }
  let cleared = 0;
  for (const row of doomed) {
    try {
      api.destroy(row.id);
      delete standing.byKey[row.key];
      delete standing.byId[row.id];
      cleared++;
    } catch (e) {
      out.warnings.push("“" + row.id + "” would not come down: " + text(e && e.message ? e.message : e));
    }
  }
  out.landed += cleared;

  // 2 — ADDS, UPDATES and the self-healing KEEPS. A keep whose object somebody deleted stands up again; a keep whose object somebody dragged is put back where the prose says. The author was warned in the plan — this is the press they pressed.
  for (const it of live) {
    const p = it && it.payload;
    if (!p || !p.key) {
      out.skipped++;
      if (it && it.key) out.pending.push(text(it.key));
      continue;
    }
    if (p.state !== "live") {
      out.skipped++;
      out.pending.push(text(p.key));
      continue;
    }
    const feet = feetOf(p.pos);
    const physics = p.solid ? "static" : "none";
    const stamp = {
      key: p.key,
      folderId: folderId,
      sig: sigOf(p),
      render: p.render,
      ground: !!p.pos.ground,
      at: { x: p.pos.x, y: p.pos.y, z: p.pos.z },
      mood: p.mood || "",
    };
    let obj = standing.byKey[p.key];
    let id = obj ? obj.id : "";

    // A line that changed from a model to a sprite (or back) is a different THING: it comes down and
    // goes up again rather than wearing two render properties at once.
    if (obj && obj.render && obj.render !== p.render) {
      try {
        api.destroy(obj.id);
      } catch (e) {
        /* already gone — the respawn below is what matters */
      }
      delete standing.byKey[p.key];
      obj = null;
      id = "";
    }

    try {
      if (obj) {
        api.setObjectProperty(id, "feetPosition", feet);
        api.setObjectProperty(id, "rotation", { yaw: p.yaw });
        api.setObjectProperty(id, "scale", p.scale);
        api.setObjectProperty(id, "physics", physics);
        if (p.render === "model") api.setObjectProperty(id, "model", p.path);
        else api.setObjectProperty(id, "sprite", { texture: p.path });
        api.patchObjectState(id, { level: stamp });
      } else {
        id = mintId(folderId, p, taken);
        const props = {
          feetPosition: feet,
          rotation: { yaw: p.yaw },
          physics: physics,
        };
        if (p.scale !== 1) props.scale = p.scale;
        if (p.render === "model") props.model = p.path;
        else props.sprite = { texture: p.path };
        api.spawn({
          id: id,
          tags: [LEVEL_TAG, folderTag(folderId)],
          state: { level: stamp },
          ...props,
        });
        standing.byKey[p.key] = { id: id, key: p.key, at: { x: p.pos.x, y: p.pos.y, z: p.pos.z }, ground: !!p.pos.ground, render: p.render, sig: stamp.sig };
      }
      out.landed++;
      out.manifest[p.key] = {
        id: id,
        at: { x: p.pos.x, y: p.pos.y, z: p.pos.z },
        ground: !!p.pos.ground,
        path: p.path,
        render: p.render,
        yaw: p.yaw,
        scale: p.scale,
        physics: physics,
        mood: p.mood || "",
      };
      // Bodies placed here remain addressable by the names used in scene prose.
      const targets = ctx && ctx.targets;
      if (targets && typeof targets === "object") {
        targets[p.name] = id;
        targets[p.token] = id;
        targets[SHELF.slug(p.name)] = id;
        targets[p.assetKey] = id;
      }
    } catch (e) {
      out.skipped++;
      out.pending.push(text(p.key));
      out.warnings.push("“" + p.name + "” would not stand up: " + text(e && e.message ? e.message : e));
    }
  }

  if (cleared) out.warnings.push(plural(cleared, "prop was", "props were") + " taken down — the prose no longer says it stands there.");
  return out;
}

module.exports = {
  VERSION: VERSION,
  DEP: DEP,
  LEVEL_TAG: LEVEL_TAG,
  ID_PREFIX: ID_PREFIX,
  MAX_PLACEMENTS: MAX_PLACEMENTS,
  folderTag: folderTag,
  installed: installed,
  planLane: planLane,
  landLane: landLane,
  // For the fixtures and the window: the same read plan() does, without the diff.
  readLevel: readLevel,
  census: census,
  sigOf: sigOf,
};
