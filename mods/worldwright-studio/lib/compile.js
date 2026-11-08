// Compile orchestration over designated folders and optional mod contracts. Keep source documents unchanged; return explicit validation and landing errors.

const CARDS = require("lib/cards.js");
const REFS = require("lib/refs.js");
const STORE = require("lib/store.js");

const VERSION = 1;

// The designations a folder can wear that COMPILE. lib/cards.js owns the column and its '' state.
const KINDS = ["cinematic", "level"];

export function text(v) {
  return typeof v === "string" ? v : v === 0 || v ? String(v) : "";
}

export function num(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

export function plural(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

// ── THE ADAPTER CONTRACT ───────────────────────────────────────────────────────────────────────── One row per lane. } — the only place a lane touches a mod. The prose cannot say that, so a lane whose landing lives in the world hands it back here and the next plan can hold the ROOM against the manifest, not only the words. A pending line never reads as "unchanged" on the next plan; it comes back as an add with a sentence saying it never landed. Pending is LANE-DECLARED, never inferred: a lane whose skips are by design (atmosphere — moods ride the scene) declares none, and its lines rest as kept. THE FILE IS REQUIRED AT CALL TIME, by literal path: a lane still being built costs a sentence in the plan, never a boot error in the app. (Never require('mods/…') — anywhere, gated or not; his 2026-09-01 law: soft connections only.
export function laneFile(id) {
  if (id === "cinema") return require("lib/shoot.js");
  if (id === "level") return require("lib/levellane.js");
  if (id === "atmosphere") return require("lib/atmokitchen.js");
  return null;
}

// Reaching for a lane file is never fatal: a missing file, a missing export or a throw inside one all
// come back as an honest empty lane with a sentence the author can read.
export function laneModuleOf(row, out) {
  try {
    const mod = laneFile(row.id);
    if (mod) return mod;
  } catch (e) {
    if (out) out.push(row.name + " lane could not be loaded: " + text(e && e.message ? e.message : e));
    return null;
  }
  if (out) out.push(row.name + " lane has no file yet — its items are listed but nothing will land.");
  return null;
}

const LANES = [
  {
    id: "cinema",
    name: "Cinema",
    file: "lib/shoot.js",
    modId: "absolute-cinema",
    modBy: "ress",
    what: "shots, spoken lines and score, handed to the camera director",
    kinds: ["cam", "shot", "line", "score", "sound", "act", "nav"],
    docs: ["cinematic"],
    // js already answers the presence question for absolute-cinema; its compile lane (planLane/landLane) arrives after this file — until then the row plans from the tokens and says plainly that nothing crosses to the director. THE PER-TARGET LAW: the lane's own installed() answers for BOTH its targets (Absolute Cinema's director and film-kit's shot list) — active when either is installed, waiting only when neither is.
    installed: function (api) {
      const mod = laneModuleOf(this, null);
      if (mod && typeof mod.installed === "function") {
        const dep = mod.installed(api) || {};
        return { installed: !!dep.installed, version: text(dep.version), notice: text(dep.notice), cinema: dep.cinema, film: dep.film };
      }
      if (mod && typeof mod.dependency === "function") {
        const dep = mod.dependency(api);
        return { installed: !!dep.installed, version: text(dep.version), notice: text(dep.notice) };
      }
      return { installed: false, version: "", notice: "The cinema lane is not loadable from here." };
    },
    plan: function (ctx) {
      const mod = laneModuleOf(this, ctx.warnings);
      if (mod && typeof mod.planLane === "function") return mod.planLane(ctx);
      return {
        items: itemsFromTokens(ctx.tokens),
        warnings: ctx.tokens.length
          ? [
              "The cinema lane lands through lib/shoot.js's compile lane, which is not written yet — " +
                plural(ctx.tokens.length, "line is", "lines are") +
                " planned but nothing will reach Absolute Cinema.",
            ]
          : [],
      };
    },
    land: function (ctx) {
      const mod = laneModuleOf(this, ctx.warnings);
      if (mod && typeof mod.landLane === "function") return mod.landLane(ctx);
      return {
        landed: 0,
        skipped: ctx.live.length,
        pending: ctx.live.map(function (it) { return it.key; }),
        warnings: ["Nothing was sent to Absolute Cinema — lib/shoot.js has no landLane yet."],
      };
    },
  },
  {
    id: "level",
    name: "Level",
    file: "lib/levellane.js",
    modId: "",
    modBy: "",
    what: "props and placement, laid out in prose",
    kinds: ["asset"],
    docs: ["level"],
    installed: function (api) {
      const mod = laneModuleOf(this, null);
      if (mod && typeof mod.installed === "function") return mod.installed(api);
      return { installed: false, version: "", notice: "The level lane is not loadable from here." };
    },
    plan: function (ctx) {
      const mod = laneModuleOf(this, ctx.warnings);
      if (mod && typeof mod.planLane === "function") return mod.planLane(ctx);
      return { items: itemsFromTokens(ctx.tokens), warnings: [] };
    },
    land: function (ctx) {
      const mod = laneModuleOf(this, ctx.warnings);
      if (mod && typeof mod.landLane === "function") return mod.landLane(ctx);
      return {
        landed: 0,
        skipped: ctx.live.length,
        pending: ctx.live.map(function (it) { return it.key; }),
        warnings: ["The level lane has no landing yet."],
      };
    },
  },
  {
    id: "atmosphere",
    name: "Atmosphere",
    file: "lib/atmokitchen.js",
    modId: "atmosphere-kitchen",
    modBy: "",
    what: "the moods the scene is lit by",
    kinds: ["atmo"],
    docs: ["cinematic", "level"],
    // READ-ONLY BY DESIGN: an #[atmo:…] mark rides the scene it is written in (lib/shoot.js carries the mood across with the clip). The lane exists so a plan can SHOW a mood change; it lands nothing of its own, and that is not a gap.
    installed: function (api) {
      const mod = laneModuleOf(this, null);
      const version = mod && typeof mod.installed === "function" ? text(mod.installed(api)) : "";
      return {
        installed: !!version,
        version: version,
        notice: version ? "" : "Atmosphere Kitchen is not installed — tagged moods still read as free text.",
      };
    },
    plan: function (ctx) {
      const mod = laneModuleOf(this, ctx.warnings);
      const items = [];
      for (const t of ctx.tokens) {
        const p = t.payload || {};
        const row = mod && typeof mod.resolve === "function" ? mod.resolve(p.token) : null;
        items.push({
          key: "atmo:" + text(p.atmo || p.token).toLowerCase(),
          what: row ? text(row.name) : text(p.token),
          detail: (row ? "preset" : "free mood") + " · " + text(t.cardName),
          sig: text(p.atmo || p.token).toLowerCase(),
          payload: p,
        });
      }
      return { items: items, warnings: [] };
    },
    land: function (ctx) {
      return {
        landed: 0,
        skipped: ctx.live.length,
        warnings: ctx.live.length ? ["Moods ride the scene they are written in — nothing to land separately."] : [],
      };
    },
  },

];

export function laneRow(id) {
  for (const row of LANES) if (row.id === text(id)) return row;
  return null;
}

// The fallback shaping when a lane has not grown its own plan yet: one item per token, keyed by where
// it sits in the prose, so the diff is still honest about order.
export function itemsFromTokens(tokens) {
  return (tokens || []).map(function (t) {
    const p = t.payload || {};
    return {
      key: t.kind + ":" + t.cardId + ":" + t.ordinal,
      what: text(p.plain) || text(p.token),
      detail: text(t.cardName),
      sig: text(p.token),
      payload: p,
    };
  });
}

// ── THE READ ───────────────────────────────────────────────────────────────────────────────────── ONE batched cardspec read for the whole folder: three book-wide reads the graph already serves (his db-cost law — never a query per card), grouped in memory, in folder order.
export async function readFolder(api, bookId, folderId) {
  const fid = text(folderId);
  const answers = await Promise.all([
    CARDS.allCards(api, bookId),
    CARDS.allSections(api, bookId),
    CARDS.allPages(api, bookId),
  ]);
  const all = answers[0] || [];
  const byCard = {};
  for (const c of all) byCard[text(c.id)] = { sections: [], pages: [] };
  for (const s of answers[1] || []) {
    const slot = byCard[text(s.cardId)];
    if (slot) slot.sections.push(s);
  }
  for (const p of answers[2] || []) {
    const slot = byCard[text(p.cardId)];
    if (slot) slot.pages.push(p);
  }
  const byId = {};
  const byName = {};
  const entries = all.map(function (c) {
    const slot = byCard[text(c.id)];
    const entry = { id: text(c.id), name: text(c.name), folderId: text(c.folderId), sections: slot.sections, pages: slot.pages };
    byId[entry.id] = entry;
    const nm = entry.name.trim().toLowerCase();
    // Two cards sharing a name cannot be called by it — false marks the collision so a lane can say so.
    if (nm) byName[nm] = Object.prototype.hasOwnProperty.call(byName, nm) ? false : entry;
    return entry;
  });
  return {
    cards: entries.filter(function (c) {
      return c.folderId === fid;
    }),
    book: { byId: byId, byName: byName },
  };
}

// SECTIONS FIRST, then pages: the structured blocks (Set, Sound, Body) are the scene's frame and the
// pages are the prose inside it — the order an author reads the card in.
export function textsOf(entry) {
  const out = [];
  for (const s of entry.sections) out.push({ where: "section", name: text(s.name), body: text(s.content) });
  for (const p of entry.pages) {
    out.push({ where: "page", name: text(p.title), body: text(p.header) });
    out.push({ where: "page", name: text(p.title), body: text(p.content) });
    out.push({ where: "page", name: text(p.title), body: text(p.footer) });
  }
  return out.filter(function (t) {
    return t.body;
  });
}

// The token census — lib/refs.js walks, this only files what came back. ONE cache for the whole
// press, so the reference map, the asset shelf and the clip vault load once (his batching law).
export async function census(api, bookId, cards, cache) {
  const out = [];
  const counts = {};
  for (const entry of cards) {
    for (const t of textsOf(entry)) {
      const segs = await REFS.resolveSegments(api, t.body, { projectId: bookId, bookId: bookId, cache: cache });
      for (const seg of segs) {
        if (!seg || seg.kind === "text" || seg.kind === "tag" || seg.kind === "ref") continue;
        const k = seg.kind + ":" + entry.id;
        counts[k] = (counts[k] || 0) + 1;
        out.push({
          kind: seg.kind,
          cardId: entry.id,
          cardName: entry.name,
          where: t.where + (t.name ? " · " + t.name : ""),
          ordinal: counts[k],
          payload: seg,
        });
      }
    }
  }
  return out;
}

// ── THE DIFF ───────────────────────────────────────────────────────────────────────────────────── add: a key the manifest never held.
export function diffLane(items, prev) {
  const before = prev && typeof prev === "object" ? prev : {};
  const seen = {};
  const rows = [];
  for (const it of items || []) {
    const key = text(it.key);
    seen[key] = true;
    const old = before[key];
    // A pending mark outranks the signature: the last press planned this line and its lane named it
    // as a skip, so "same words" must not read as "already landed". It comes back as an add, with the
    // reason in the row.
    const op = !old ? "add" : old.pending ? "add" : text(old.sig) === text(it.sig) ? "keep" : "update";
    let warn = text(it.warn);
    if (old && old.pending) {
      const note = "planned last press — nothing landed yet";
      warn = warn ? warn + " · " + note : note;
    }
    rows.push({
      op: op,
      what: text(it.what),
      detail: text(it.detail),
      warn: warn,
      key: key,
      sig: text(it.sig),
      payload: it.payload || null,
    });
  }
  for (const key of Object.keys(before)) {
    if (seen[key]) continue;
    const old = before[key];
    rows.push({
      op: "remove",
      what: text(old && old.what) || key,
      detail: text(old && old.detail),
      warn: "",
      key: key,
      sig: text(old && old.sig),
      payload: null,
    });
  }
  return rows;
}

export function tally(items) {
  const out = { add: 0, update: 0, remove: 0, keep: 0 };
  for (const it of items) out[it.op] = (out[it.op] || 0) + 1;
  return out;
}

export async function manifestOf(api, bookId, folderId) {
  const b = STORE.book(text(bookId));
  if (!b || typeof b.compileStateGet !== "function") return { lanes: {}, kind: "", landedAt: 0, landedBy: "" };
  const res = await b.compileStateGet(api, text(folderId));
  const row = ((res && res.rows) || [])[0];
  if (!row) return { lanes: {}, kind: "", landedAt: 0, landedBy: "" };
  let parsed = null;
  try {
    parsed = JSON.parse(text(row.manifest) || "{}");
  } catch (e) {
    parsed = null;
  }
  return {
    lanes: (parsed && parsed.lanes) || {},
    kind: text(row.kind),
    landedAt: num(row.landedAt),
    landedBy: text(row.landedBy),
  };
}

// ── THE PLAN ─────────────────────────────────────────────────────────────────────────────────────
// Lands NOTHING. Every press reads this first, and a press that is never confirmed costs the world
// exactly nothing.
export async function compilePlan(api, bookId, folderId) {
  require('lib/source-book.js').refuseExecution(bookId);
  const out = {
    v: VERSION,
    bookId: text(bookId),
    folderId: text(folderId),
    kind: "",
    folderName: "",
    cards: 0,
    tokens: 0,
    lanes: [],
    counts: { add: 0, update: 0, remove: 0, keep: 0 },
    landedAt: 0,
    landedBy: "",
    warnings: [],
  };

  const folder = await CARDS.getFolder(api, bookId, folderId);
  if (!folder) {
    out.warnings.push("That folder is not in this book any more.");
    return out;
  }
  out.folderName = text(folder.name);
  out.kind = CARDS.docFlag(folder.doc);
  if (KINDS.indexOf(out.kind) === -1) {
    out.warnings.push("“" + out.folderName + "” has no designation — mark it Cinematic or Level and its cards compile.");
    return out;
  }

  const cache = {};
  const answers = await Promise.all([readFolder(api, bookId, folderId), manifestOf(api, bookId, folderId)]);
  const cards = answers[0].cards;
  const book = answers[0].book;
  const prior = answers[1];
  out.cards = cards.length;
  out.landedAt = prior.landedAt;
  out.landedBy = prior.landedBy;

  const tokens = await census(api, bookId, cards, cache);
  out.tokens = tokens.length;
  const poseNotes = tokens.filter(t => t.kind === "pose").length;
  if (poseNotes) out.warnings.push(plural(poseNotes, "pose directive is", "pose directives are") + " reference-only; Compile does not apply them. Pose and keyframe the model in Asset Studio, then use its exported GLB.");

  for (const row of LANES) {
    if (row.docs.indexOf(out.kind) === -1) continue;
    const mine = tokens.filter(function (t) {
      return row.kinds.indexOf(t.kind) !== -1;
    });
    const dep = row.installed(api);
    const laneWarnings = [];
    const ctx = {
      api: api,
      bookId: text(bookId),
      folderId: text(folderId),
      kind: out.kind,
      folderName: out.folderName,
      lane: row,
      cards: cards,
      book: book,
      tokens: mine,
      installed: dep,
      prev: prior.lanes[row.id] || {},
      cache: cache,
      warnings: laneWarnings,
    };
    let planned = { items: [], warnings: [] };
    try {
      // AWAITED: a lane whose plan needs the reference map (lib/shoot.js's does) answers with a
      // promise. A lane that plans synchronously is unaffected — await on a plain object is a no-op.
      planned = (await row.plan(ctx)) || planned;
    } catch (e) {
      laneWarnings.push(row.name + " lane could not plan: " + text(e && e.message ? e.message : e));
      planned = { items: [], warnings: [] };
    }
    const items = diffLane(planned.items || [], ctx.prev);
    const warns = laneWarnings.concat(planned.warnings || []);
    if (!dep.installed && dep.notice && mine.length) warns.push(dep.notice);
    const lane = {
      id: row.id,
      name: row.name,
      modId: row.modId,
      modBy: row.modBy,
      what: row.what,
      installed: !!dep.installed,
      version: text(dep.version),
      items: items,
      counts: tally(items),
      warnings: warns,
    };
    out.lanes.push(lane);
    for (const k of Object.keys(lane.counts)) out.counts[k] = (out.counts[k] || 0) + lane.counts[k];
    for (const w of warns) out.warnings.push(w);
  }

  if (!out.tokens) {
    out.warnings.push(
      out.cards
        ? "Nothing to compile yet — none of these " + plural(out.cards, "card", "cards") + " speaks a #[…] directive."
        : "This folder has no cards in it yet."
    );
  }
  return out;
}

// ── THE LANDING ────────────────────────────────────────────────────────────────────────────────── Walks the plan's lanes in registry order, hands each its own items, then writes the manifest the next plan diffs against. A lane that throws is NAMED and the rest still land: one broken mod may not take the compile with it.
export async function compileLand(api, plan, opts) {
  require('lib/source-book.js').refuseExecution(plan?.bookId);
  const o = opts || {};
  const out = {
    ok: false,
    bookId: text(plan && plan.bookId),
    folderId: text(plan && plan.folderId),
    kind: text(plan && plan.kind),
    lanes: [],
    landed: 0,
    skipped: 0,
    landedAt: 0,
    warnings: [],
    error: "",
  };
  if (!plan || KINDS.indexOf(out.kind) === -1) {
    out.error = "Nothing to land — this folder is not designated as a compile doc.";
    return out;
  }

  const manifest = { v: VERSION, kind: out.kind, folderId: out.folderId, lanes: {} };

  // ONE map of bodies for the whole press. A lane that stands something up writes its id here under
  // the names the prose uses for downstream scene operations. A fresh {} per lane
  // would strand every supported hand-off between them.
  const targets = o.targets && typeof o.targets === "object" ? o.targets : {};

  for (const lane of plan.lanes || []) {
    const row = laneRow(lane.id);
    if (!row) continue;
    const live = (lane.items || []).filter(function (it) {
      return it.op !== "remove";
    });
    const laneWarnings = [];
    const ctx = {
      api: api,
      bookId: out.bookId,
      folderId: out.folderId,
      kind: out.kind,
      lane: row,
      plan: plan,
      items: lane.items || [],
      live: live,
      targets: targets,
      // How a lane reaches a mod that listens on an ACTION rather than a file: the caller lends its own sender (app-shell's outbox, the very one the Shoot panel hands lib/shoot.js). Absent, a lane that needs one says so in its own sentence and lands whatever else it can.
      send: typeof o.send === "function" ? o.send : null,
      play: !!o.play,
      installed: { installed: !!lane.installed, version: text(lane.version) },
      warnings: laneWarnings,
    };
    // The fallbacks — a lane that answers nothing or throws landed nothing, so every live line stays
    // pending: the next plan must offer them again, not read them back as unchanged.
    const allKeys = live.map(function (it) { return it.key; });
    let res = { landed: 0, skipped: live.length, warnings: [], error: "", pending: allKeys };
    try {
      res = (await row.land(ctx)) || res;
    } catch (e) {
      res = { landed: 0, skipped: live.length, warnings: [], error: text(e && e.message ? e.message : e), pending: allKeys };
    }
    const warns = laneWarnings.concat(res.warnings || []);
    out.lanes.push({
      id: row.id,
      name: row.name,
      modId: row.modId,
      installed: !!lane.installed,
      landed: num(res.landed),
      skipped: num(res.skipped),
      warnings: warns,
      error: text(res.error),
    });
    out.landed += num(res.landed);
    out.skipped += num(res.skipped);
    for (const w of warns) out.warnings.push(w);

    // THE MANIFEST records what the prose SAYS after this press, not what a mod acknowledged: a lane
    // that skipped because its mod is absent must not read as a removal the next time it runs.
    const kept = {};
    const landedBy = (res && res.manifest && typeof res.manifest === "object") ? res.manifest : {};
    const pendingBy = {};
    for (const k of Array.isArray(res && res.pending) ? res.pending : []) pendingBy[text(k)] = true;
    for (const it of live) {
      kept[it.key] = { what: it.what, detail: it.detail, sig: it.sig };
      // …plus what the lane actually put in the world for that line, when it has one. This is the half of the next diff the prose cannot supply: without it a plan can only ask "did the words change", never "is the thing still where we left it".
      if (landedBy[it.key]) kept[it.key].landed = landedBy[it.key];
      // A SKIP IS NOT A LANDING. The line stays in the manifest (so its deletion still reads as a remove, and an absent mod never reads as one), but it wears the lane's own word for it: still to do. diffLane hands it back as an add until a press truly lands it.
      else if (pendingBy[it.key]) kept[it.key].pending = true;
    }
    manifest.lanes[row.id] = kept;
  }

  const b = STORE.book(out.bookId);
  if (!b || typeof b.compileStateSet !== "function") {
    out.error = "lib/store.js has no compile_state statement set for this book.";
    return out;
  }
  const now = await b.compileStateGet(api, out.folderId);
  out.landedAt = num(((now && now.rows) || [{}])[0] && ((now.rows || [{}])[0].landedAt)) || 0;
  const stamp = Date && false ? 0 : out.landedAt; // never a wall clock from this file — see below
  await b.compileStateSet(api, out.folderId, out.kind, JSON.stringify(manifest), num(o.landedAt) || stamp, text(o.actor));
  out.landedAt = num(o.landedAt) || stamp;
  out.ok = !out.lanes.some(function (l) {
    return l.error;
  });
  return out;
}

// Forget what landed — the next plan reports the whole folder as new. The prose is untouched; this is
// only the memory of a press.
export async function compileForget(api, bookId, folderId) {
  require('lib/source-book.js').refuseExecution(bookId);
  const b = STORE.book(text(bookId));
  if (!b || typeof b.compileStateClear !== "function") return false;
  await b.compileStateClear(api, text(folderId));
  return true;
}

// The one-line summary a notice shows: "4 added, 1 changed, 2 unchanged".
export function summary(plan) {
  if (!plan || !plan.kind) return "Nothing to compile.";
  const c = plan.counts || {};
  const bits = [];
  if (c.add) bits.push(c.add + " added");
  if (c.update) bits.push(c.update + " changed");
  if (c.remove) bits.push(c.remove + " removed");
  if (c.keep) bits.push(c.keep + " unchanged");
  if (!bits.length) return "Nothing to compile in “" + text(plan.folderName) + "” yet.";
  return bits.join(", ") + " · " + plural(num(plan.cards), "card", "cards");
}

module.exports = {
  VERSION: VERSION,
  KINDS: KINDS,
  LANES: LANES,
  laneRow: laneRow,
  readFolder: readFolder,
  census: census,
  diffLane: diffLane,
  manifestOf: manifestOf,
  compilePlan: compilePlan,
  compileLand: compileLand,
  compileForget: compileForget,
  summary: summary,
};
