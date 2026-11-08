// refpick — the type-ahead that opens when an author types `#[` in a page zone. GUARD: two lanes ride this one module — the `#[` lane owns #sb-refpick / #sb-refpick-data, the prose-token picker reads REALM_V here; the former plugin field picker is retired.
const VISIBLE = 8;
const ROW_CAP = 40;
const CARD_CAP = 400;
// THE SHELF RIDES WHOLE. His 2026-09-01 report: "it cuts off and only shows a to b" — the old 200-row alphabetical slice never reached the c's. This is a guard against a runaway shelf, not a cut a reader would ever see.
const ASSET_CAP = 4000;
// Shelf mode: rows drawn per paint before the "N more" foot, and rows visible before the list scrolls.
const SHELF_CAP = 300;
const SHELF_VIS = 13;
// Kind order for the tab strip; anything else the shelf grows lands after these in shelf order.
const KIND_ORDER = ["model", "prop", "animation", "set", "sound", "image", "effect", "motion"];
// Tags that name the whole shelf rather than one row — dropped from a row's sub-line so the
//   words that distinguish it (prop, weapon, humanoid) are the ones he reads.
const FAMILY_TAGS = {
  "lowpoly-cozy": 1, "painterly-fantasy": 1, "toon-vibrant": 1, "voxel-bright": 1, "realistic-gritty": 1,
  "scifi-neon": 1, "gothic-horror": 1, "pixel-bright": 1, "pixel-moody": 1,
  "scripted-geometry": 1, "card-art": 1, "project": 1,
};
const SHOT_CAP = 200;
const ATMO_CAP = 40;

export function str(v) {
  return v === null || v === undefined ? "" : String(v);
}

// One attribute-safe field: tabs and newlines are the row/field separators, so none may ride inside.
export function cell(v) {
  return str(v).replace(/[\t\n\r]+/g, " ").trim();
}

export function hasTag(tags, word) {
  const list = Array.isArray(tags) ? tags : str(tags) ? str(tags).split(/[\s,]+/) : [];
  for (let i = 0; i < list.length; i++) if (str(list[i]).toLowerCase() === word) return true;
  return false;
}

// A row's readable tags: the first three that are not shelf-wide family words.
export function rowTags(tags) {
  const list = Array.isArray(tags) ? tags : str(tags) ? str(tags).split(/[\s,]+/) : [];
  const out = [];
  for (let i = 0; i < list.length && out.length < 3; i++) {
    const t = cell(list[i]);
    if (!t || FAMILY_TAGS[t.toLowerCase()]) continue;
    out.push(t);
  }
  return out.join(" ");
}

// The realm's shape for assets ({ kind: "id\tname\ttags\n..." }) back into flat rows — the worker
//   filter() below reads either shape, so an old payload never breaks it.
export function flatAssets(assets) {
  if (Array.isArray(assets)) {
    const out = [];
    for (let i = 0; i < assets.length; i++) {
      const r = assets[i] || {};
      if (!str(r.id)) continue;
      out.push({ id: str(r.id), name: str(r.name) || str(r.id), kind: str(r.kind), tags: str(r.tags) });
    }
    return out;
  }
  if (!assets || typeof assets !== "object") return [];
  const kinds = Object.keys(assets);
  const order = [];
  for (let i = 0; i < KIND_ORDER.length; i++) if (kinds.indexOf(KIND_ORDER[i]) >= 0) order.push(KIND_ORDER[i]);
  for (let i = 0; i < kinds.length; i++) if (order.indexOf(kinds[i]) < 0) order.push(kinds[i]);
  const out = [];
  for (let k = 0; k < order.length; k++) {
    const lines = str(assets[order[k]]).split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      const f = lines[i].split("\t");
      if (!f[0]) continue;
      out.push({ id: f[0], name: f[1] || f[0], kind: order[k], tags: f[2] || "" });
    }
  }
  return out;
}


export function candidates(opts) {
  const o = opts || {};
  const index = o.index || {};
  const bookId = str(o.bookId);
  const names = {};
  const shelf = Array.isArray(o.books) ? o.books : [];
  for (let i = 0; i < shelf.length; i++) names[str(shelf[i].id)] = str(shelf[i].name);

  const tags = [];
  const items = Array.isArray(o.tagItems) ? o.tagItems : [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    if (!str(it.insert)) continue;
    tags.push({ label: str(it.label), insert: str(it.insert), example: str(it.example || it.hint || "") });
  }

    const cards = [];
  const entries = (index && index.entries) || [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e || e.kind !== "card") continue;
    const id = str(e.id);
    if (!id) continue;
    const b = str(e.bookId);
        const own = str(e.bookName);
    cards.push({ id: id, name: str(e.name), book: b && b !== bookId ? own || names[b] || "another book" : "" });
  }
  cards.sort(function (a, b) {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });

  // Grouped by kind, each group its own sorted "id\tname\ttags" lines — the whole shelf, one string per tab.
  const byKind = {};
  const arows = Array.isArray(o.assets) ? o.assets : [];
  let shelfN = 0;
  for (let i = 0; i < arows.length && shelfN < ASSET_CAP; i++) {
    const r = arows[i] || {};
    const id = cell(r.id);
    if (!id) continue;
    let kind = cell(r.kind).toLowerCase() || "model";
    // The shelf files its scripted-geometry props (fx:vil-mkt-stall-…) under "effect"; to a writer a
    //   market stall is a prop, so those rows get their own tab. Grouping only — the id is untouched.
    if (kind === "effect" && hasTag(r.tags, "scripted-geometry")) kind = "prop";
    (byKind[kind] = byKind[kind] || []).push({ id: id, name: cell(r.name) || id, tags: rowTags(r.tags) });
    shelfN += 1;
  }
  const assets = {};
  const kinds = Object.keys(byKind);
  for (let k = 0; k < kinds.length; k++) {
    const rows = byKind[kinds[k]];
    rows.sort(function (a, b) {
      const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
    const lines = [];
    for (let i = 0; i < rows.length; i++) lines.push(rows[i].id + "\t" + rows[i].name + "\t" + rows[i].tags);
    assets[kinds[k]] = lines.join("\n");
  }

    const shots = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e || e.kind !== "shot") continue;
    const id = str(e.id);
    if (!id) continue;
    shots.push({ id: id, name: str(e.name) || id });
  }
  shots.sort(function (a, b) {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });

    const atmoRows = [];
  const arows2 = Array.isArray(o.atmos) ? o.atmos : [];
  for (let i = 0; i < arows2.length; i++) {
    const r = arows2[i] || {};
    const id = str(r.id);
    if (!id) continue;
    atmoRows.push({ id: id, name: str(r.name) || id, mood: str(r.mood) });
  }

  return {
    version: Number((index && index.version) || 0),
    bookId: bookId,
    tags: tags,
    cards: cards.slice(0, CARD_CAP),
    assets: assets,
    shelfCount: shelfN,
    shots: shots.slice(0, SHOT_CAP),
    atmos: atmoRows.slice(0, ATMO_CAP),
  };
}

// The ranking rule: tags first (they are the grammar), then cards; prefix beats substring, and
//   same-book cards beat cards from elsewhere.
export function filter(cands, query, cap, gram) {
  const c = cands || {};
  const q = str(query).trim().toLowerCase();
  const limit = Math.max(1, Math.floor(Number(cap) || ROW_CAP));
  const out = [];

  const rank = function (name, insert) {
    const n = str(name).toLowerCase();
    if (!q) return 1;
    if (n.indexOf(q) === 0) return 0;
    if (n.indexOf(q) > 0) return 1;
    if (str(insert).toLowerCase().indexOf(q) > 0) return 2;
    return -1;
  };

  const tags = [];
  const tagRows = Array.isArray(c.tags) ? c.tags : [];
  for (let i = 0; i < tagRows.length; i++) {
    const t = tagRows[i];
    const r = rank(t.label, t.insert);
    if (r < 0) continue;
    tags.push({ kind: "tag", rank: r, order: i, label: str(t.label), sub: str(t.example), insert: str(t.insert) });
  }
  tags.sort(function (a, b) {
    return a.rank !== b.rank ? a.rank - b.rank : a.order - b.order;
  });

  const cards = [];
  const cardRows = Array.isArray(c.cards) ? c.cards : [];
  for (let i = 0; i < cardRows.length; i++) {
    const e = cardRows[i];
    let r = rank(e.name, "");
    if (r < 0 && q && str(e.id).toLowerCase().indexOf(q) === 0) r = 3;
    if (r < 0) continue;
    cards.push({
      kind: "card",
      rank: r,
      order: i,
      id: str(e.id),
      label: str(e.name),
      sub: str(e.book),
      insert: "#[" + str(e.id) + "]",
    });
  }
  cards.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const ab = a.sub ? 1 : 0;
    const bb = b.sub ? 1 : 0;
    if (ab !== bb) return ab - bb;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });

    const assets = [];
  const assetRows = flatAssets(c.assets);
  const grammar = q === "asset" || q.slice(0, 6) === "asset:";
  const aq = q.slice(0, 6) === "asset:" ? q.slice(6).trim() : grammar ? "" : q;
  for (let i = 0; i < assetRows.length; i++) {
    const e = assetRows[i];
    const n = str(e.name).toLowerCase();
    let r = -1;
    if (!aq) r = grammar || !q ? 1 : -1;
    else if (n.indexOf(aq) === 0) r = 0;
    else if (n.indexOf(aq) > 0) r = 1;
    else if (str(e.tags).toLowerCase().indexOf(aq) >= 0) r = 2;
    else if (str(e.id).toLowerCase().indexOf(aq) === 0) r = 3;
    if (r < 0) continue;
    assets.push({
      kind: "asset",
      rank: r,
      order: i,
      id: str(e.id),
      label: str(e.name),
      sub: str(e.tags) || str(e.kind),
      kl: str(e.kind),
      insert: "#[asset:" + str(e.id) + "]",
    });
  }
  assets.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });

    const shots = [];
  const shotRows = Array.isArray(c.shots) ? c.shots : [];
  const sgrammar = q === "shot" || q.slice(0, 5) === "shot:";
  const sq = q.slice(0, 5) === "shot:" ? q.slice(5).trim() : sgrammar ? "" : q;
  for (let i = 0; i < shotRows.length; i++) {
    const e = shotRows[i];
    const n = str(e.name).toLowerCase();
    let r = -1;
    if (!sq) r = sgrammar || !q ? 1 : -1;
    else if (n.indexOf(sq) === 0) r = 0;
    else if (n.indexOf(sq) > 0) r = 1;
    else if (str(e.id).toLowerCase().indexOf(sq) === 0) r = 3;
    if (r < 0) continue;
    shots.push({
      kind: "shot",
      rank: r,
      order: i,
      id: str(e.id),
      label: str(e.name),
      sub: "clip",
      insert: "#[shot:" + str(e.id) + "]",
    });
  }
  shots.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });

    const atmos = [];
  const atmoRows = Array.isArray(c.atmos) ? c.atmos : [];
  const mgrammar = q === "atmo" || q.slice(0, 5) === "atmo:";
  const mq = q.slice(0, 5) === "atmo:" ? q.slice(5).trim() : mgrammar ? "" : q;
  for (let i = 0; i < atmoRows.length; i++) {
    const e = atmoRows[i];
    const n = str(e.name).toLowerCase();
    let r = -1;
    if (!mq) r = mgrammar || !q ? 1 : -1;
    else if (n.indexOf(mq) === 0) r = 0;
    else if (n.indexOf(mq) > 0) r = 1;
    else if (str(e.id).toLowerCase().indexOf(mq) === 0) r = 3;
    if (r < 0) continue;
    atmos.push({
      kind: "atmo",
      rank: r,
      order: i,
      id: str(e.id),
      label: str(e.name),
      sub: str(e.mood),
      insert: "#[atmo:" + str(e.id) + "]",
    });
  }
  atmos.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });

  // His ask 2026-08-26: the word itself is offered as a completion, and commits `#[asset:` OPEN.
  if (assetRows.length && q && "asset".indexOf(q) === 0 && out.length < limit) {
    out.push({ kind: "asset", rank: 0, order: -1, label: "asset", sub: "Asset Library — pick from the shelf", insert: "#[asset:", open: true });
  }
    if (shotRows.length && q && "shot".indexOf(q) === 0 && out.length < limit) {
    out.push({ kind: "shot", rank: 0, order: -1, label: "shot", sub: "Absolute Cinema — pick a saved clip", insert: "#[shot:", open: true });
  }
    if (atmoRows.length && q && "atmo".indexOf(q) === 0 && out.length < limit) {
    out.push({ kind: "atmo", rank: 0, order: -1, label: "atmo", sub: "a mood — pick one, or type your own words", insert: "#[atmo:", open: true });
  }
    const camrow = { kind: "cam", rank: 0, order: -1, label: "#[cam: …]", sub: "camera directive — size/angle on <cardId> · 3s · blend", insert: "#[cam: ", open: true };
  if (gram && q && "cam".indexOf(q) === 0 && out.length < limit) out.push(camrow);
  for (let i = 0; i < tags.length && out.length < limit; i++) out.push(tags[i]);
  if (gram && !q && out.length < limit) out.push(camrow);
  for (let i = 0; i < cards.length && out.length < limit; i++) out.push(cards[i]);
  for (let i = 0; i < assets.length && out.length < limit; i++) out.push(assets[i]);
  for (let i = 0; i < shots.length && out.length < limit; i++) out.push(shots[i]);
  for (let i = 0; i < atmos.length && out.length < limit; i++) out.push(atmos[i]);
  return out;
}

// GUARD: a cam target is a BARE card id after `on` — a token can never nest inside a token, so the
//   picker completes a WORD here: rows show card names, the row lands the id.

const CAM_OPEN = /^\s*cam\s*:([\s\S]*)$/i;
const CAM_SLOT = /(?:^|[^a-z0-9])on[ \t]+([^\s]*)$/i;

export function camTarget(inner) {
  const m = CAM_OPEN.exec(str(inner));
  if (!m) return null;
  const w = CAM_SLOT.exec(m[1]);
  return w ? w[1] : null;
}

// { start, q } = an ordinary token; { start, q, cam: true } = a cam target, `start` at the partial
//   WORD — the commit replaces the word, never the token. The realm's tok() mirrors this rule.
export function slotAt(value, caret) {
  const v = str(value);
  const c = Math.max(0, Math.min(Number(caret) || 0, v.length));
  // His 2026-09-02 report: "the cursor being near a # causes the popup to fire, even on a full token" — a caret sitting ON or BEFORE the `#[` (lastIndexOf counts a match starting at the caret) read as an empty query. The opener must be wholly BEHIND the caret: `#[▮` is a slot, `▮#[…]` and `#▮[…]` are not.
  if (c < 2) return null;
  const i = v.lastIndexOf("#[", c - 2);
  if (i < 0) return null;
  const inner = v.slice(i + 2, c);
  if (inner.length > 120) return null;
  if (inner.indexOf("]") >= 0 || inner.indexOf("[") >= 0 || inner.indexOf("\n") >= 0) return null;
  // His ask 2026-08-26: the picker "should only appear when there is no closing ] for a #[".
  const rest = v.slice(c);
  const close = rest.indexOf("]");
  if (close >= 0) {
    const nl = rest.indexOf("\n");
    const open2 = rest.indexOf("[");
    if ((nl < 0 || close < nl) && (open2 < 0 || close < open2)) return null;
  }
  const part = camTarget(inner);
  if (part !== null) return { start: c - part.length, q: part, cam: true };
  return { start: i, q: inner };
}

export function camFilter(cands, query, cap) {
  const c = cands || {};
  const rows = filter({ tags: [], cards: Array.isArray(c.cards) ? c.cards : [] }, query, cap);
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.kind !== "card" || !r.id) continue;
    out.push({ kind: "card", bare: true, rank: r.rank, order: r.order, id: r.id, label: r.label, sub: r.sub, insert: r.id + " " });
  }
  return out;
}

export function applySlot(value, caret, slot, insert) {
  const v = str(value);
  const c = Math.max(0, Math.min(Number(caret) || 0, v.length));
  const s = slot && typeof slot.start === "number" ? Math.max(0, Math.min(slot.start, c)) : c;
  const ins = str(insert);
  return { text: v.slice(0, s) + ins + v.slice(c), caret: s + ins.length };
}

// GUARD: emitted as ONE attribute's worth of JavaScript — single quotes only, no template literals, no line comments a collapsed newline could swallow. Bumped on every change to the realm half below — the installed-once guard compares it.
const REALM_V = 18;

const REALM = [
  "(function(){",
  /* Installed once, but versioned — bump REALM_V and the running tab takes the new copy. */
  "  if (window.__SBRP && window.__SBRP.v === " + REALM_V + ") return;",
  "  var D = document;",
  "  try { var old = D.getElementById('sb-refpick'); if (old && old.parentNode) old.parentNode.removeChild(old); } catch (e0) {}",
  "  try { var oldq = D.getElementById('sb-qpick'); if (oldq && oldq.parentNode) oldq.parentNode.removeChild(oldq); } catch (e0a) {}",
  "  try { if (window.__SBRP && window.__SBRP.tick) clearInterval(window.__SBRP.tick); } catch (e0b) {}",
  "  var VIS = " + VISIBLE + ";",
  "  var CAP = " + ROW_CAP + ";",
  "  var SCAP = " + SHELF_CAP + ";",
  "  var SVIS = " + SHELF_VIS + ";",
  "  var KORDER = " + JSON.stringify(KIND_ORDER) + ";",
  "  var KLABEL = { all: 'All', model: 'Models', prop: 'Props', animation: 'Animated', set: 'Sets', sound: 'Sounds', image: 'Images', effect: 'Effects', motion: 'Motion' };",
  /* st.tab is the shelf tab he last stood on; it survives close/open so the shelf reopens where he left it. */
  "  var st = { el: null, start: -1, rows: [], sel: 0, panel: null, list: null, live: 0, quiet: 0, shelf: null, tab: 'all', tfired: 0 };",
  "  var KEYS = ['fontFamily','fontSize','fontWeight','fontStyle','fontVariant','letterSpacing','lineHeight','textIndent','textTransform','wordSpacing','whiteSpace','wordBreak','overflowWrap','tabSize','textAlign','direction','boxSizing','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'];",
  /* The whole shelf rides the data node now, so the parse is memoed on the raw attribute string:
     a keystroke re-reads a 100k+ attribute for free, and only a re-render with new candidates pays. */
  "  var DC = { raw: null, bag: null };",
  "  function data(){",
  "    var empty = { tags: [], cards: [], assets: [], shots: [], atmos: [], akinds: [] };",
  "    var n = D.getElementById('sb-refpick-data');",
  "    if (!n) return empty;",
  "    var raw = n.getAttribute('data-cands') || '{}';",
  "    if (DC.raw === raw && DC.bag) return DC.bag;",
  "    var o;",
  "    try { o = JSON.parse(raw); } catch (e) { return empty; }",
  "    var assets = [], akinds = [], src = o.assets || [], i, k, f, lines;",
  "    if (Array.isArray(src)) {",
  "      for (i = 0; i < src.length; i++) { if (!src[i] || !src[i].id) continue; k = String(src[i].kind || 'model'); assets.push({ id: String(src[i].id), name: String(src[i].name || src[i].id), kind: k, tags: String(src[i].tags || '') }); if (akinds.indexOf(k) < 0) akinds.push(k); }",
  "    } else if (src && typeof src === 'object') {",
  "      var ks = Object.keys(src), ord = [];",
  "      for (i = 0; i < KORDER.length; i++) if (ks.indexOf(KORDER[i]) >= 0) ord.push(KORDER[i]);",
  "      for (i = 0; i < ks.length; i++) if (ord.indexOf(ks[i]) < 0) ord.push(ks[i]);",
  "      for (var ki = 0; ki < ord.length; ki++) {",
  "        k = ord[ki]; lines = String(src[k] || '').split('\\n'); var had = 0;",
  "        for (i = 0; i < lines.length; i++) { if (!lines[i]) continue; f = lines[i].split('\\t'); if (!f[0]) continue; assets.push({ id: f[0], name: f[1] || f[0], kind: k, tags: f[2] || '' }); had = 1; }",
  "        if (had) akinds.push(k);",
  "      }",
  "    }",
  "    DC.raw = raw;",
  "    DC.bag = { tags: o.tags || [], cards: o.cards || [], assets: assets, shots: o.shots || [], atmos: o.atmos || [], akinds: akinds };",
  "    return DC.bag;",
  "  }",
  // SHELF MODE: the token reads `asset:` and the list becomes the shelf itself — every row, under tabs by kind, narrowed by the words after the colon (name prefix, then name, then tags, then id). counts are per kind for the CURRENT words so the tab strip tells him where the hits are.
  "  function shelfQ(inner){ var m = /^\\s*asset\\s*:([\\s\\S]*)$/i.exec(String(inner || '')); return m ? String(m[1]).trim().toLowerCase() : null; }",
  "  function shelfRows(aq){",
  "    var d = data(), out = [], counts = { all: 0 }, i, e, r, an, at;",
  "    for (i = 0; i < d.assets.length; i++) {",
  "      e = d.assets[i]; an = e.name.toLowerCase(); at = e.tags.toLowerCase(); r = -1;",
  "      if (!aq) r = 1;",
  "      else if (an.indexOf(aq) === 0) r = 0;",
  "      else if (an.indexOf(aq) > 0) r = 1;",
  "      else if (at.indexOf(aq) >= 0) r = 2;",
  "      else if (e.id.toLowerCase().indexOf(aq) === 0) r = 3;",
  "      if (r < 0) continue;",
  "      counts.all += 1; counts[e.kind] = (counts[e.kind] || 0) + 1;",
  "      if (st.tab !== 'all' && e.kind !== st.tab) continue;",
  "      out.push({ kind: 'asset', rank: r, order: i, id: e.id, label: e.name, sub: e.tags, kl: e.kind, insert: '#[asset:' + e.id + ']' });",
  "    }",
  "    out.sort(function(a, b){ if (a.rank !== b.rank) return a.rank - b.rank; var al = a.label.toLowerCase(), bl = b.label.toLowerCase(); return al < bl ? -1 : al > bl ? 1 : 0; });",
  "    return { rows: out, counts: counts, kinds: d.akinds };",
  "  }",
  "  function tabNames(){ return ['all'].concat((st.shelf && st.shelf.kinds) || []); }",
  "  function retab(kn){",
  "    st.tab = kn;",
  "    if (!st.el) return;",
  "    var t = tok(st.el);",
  "    if (!t) { close(); return; }",
  "    st.sel = 0; st.rows = [];",
  "    show(st.el, t);",
  "  }",
  "  function tabStep(dir){ var ks = tabNames(); var ci = ks.indexOf(st.tab); if (ci < 0) ci = 0; retab(ks[(ci + dir + ks.length) % ks.length]); }",
  "  function dbg(s){ try { if (st.panel) st.panel.setAttribute('data-dbg', String(s).slice(0, 240)); } catch (e) {} }",
  "  function tok(el){",
  "    var v = el.value || '';",
  "    var c = el.selectionStart;",
  "    if (c === null || c === undefined) return null;",
  "    if (el.selectionEnd !== c) return null;",
  "    if (c < 2) return null;",
  "    var i = v.lastIndexOf('#[', c - 2);",
  "    if (i < 0) return null;",
  "    var inner = v.slice(i + 2, c);",
  "    if (inner.length > 120) return null;",
  "    if (inner.indexOf(']') >= 0 || inner.indexOf('[') >= 0 || inner.indexOf('\\n') >= 0) return null;",
  "    var rst = v.slice(c);",
  "    var cl = rst.indexOf(']');",
  "    if (cl >= 0) { var nl2 = rst.indexOf('\\n'); var op2 = rst.indexOf('['); if ((nl2 < 0 || cl < nl2) && (op2 < 0 || cl < op2)) return null; }",
  "    var cm = /^\\s*cam\\s*:([\\s\\S]*)$/i.exec(inner);",
  "    if (cm) { var cw = /(?:^|[^a-z0-9])on[ \\t]+([^\\s]*)$/i.exec(cm[1]); if (cw) return { start: c - cw[1].length, q: cw[1], cam: 1 }; }",
  "    return { start: i, q: inner };",
  "  }",
  "  function rank(name, insert, q){",
  "    var n = String(name || '').toLowerCase();",
  "    if (!q) return 1;",
  "    if (n.indexOf(q) === 0) return 0;",
  "    if (n.indexOf(q) > 0) return 1;",
  "    if (String(insert || '').toLowerCase().indexOf(q) > 0) return 2;",
  "    return -1;",
  "  }",
  "  function rowsFor(query){ return rowsFrom(data(), query, 1); }",
  "  function rowsFrom(bag, query, gram){",
  "    var d = { tags: (bag && bag.tags) || [], cards: (bag && bag.cards) || [], assets: (bag && bag.assets) || [], shots: (bag && bag.shots) || [], atmos: (bag && bag.atmos) || [] };",
  "    var q = String(query || '').trim().toLowerCase();",
  "    var tags = [], cards = [], i, r, t, e;",
  "    for (i = 0; i < d.tags.length; i++) {",
  "      t = d.tags[i];",
  "      r = rank(t.label, t.insert, q);",
  "      if (r < 0) continue;",
  "      tags.push({ kind: 'tag', rank: r, order: i, label: String(t.label || ''), sub: String(t.example || ''), insert: String(t.insert || '') });",
  "    }",
  "    tags.sort(function(a, b){ return a.rank !== b.rank ? a.rank - b.rank : a.order - b.order; });",
  "    for (i = 0; i < d.cards.length; i++) {",
  "      e = d.cards[i];",
  "      r = rank(e.name, '', q);",
  "      if (r < 0 && q && String(e.id || '').toLowerCase().indexOf(q) === 0) r = 3;",
  "      if (r < 0) continue;",
  "      cards.push({ kind: 'card', rank: r, order: i, id: String(e.id || ''), label: String(e.name || ''), sub: String(e.book || ''), insert: '#[' + String(e.id || '') + ']' });",
  "    }",
  "    cards.sort(function(a, b){",
  "      if (a.rank !== b.rank) return a.rank - b.rank;",
  "      var ab = a.sub ? 1 : 0, bb = b.sub ? 1 : 0;",
  "      if (ab !== bb) return ab - bb;",
  "      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;",
  "    });",
  "    var assets = [];",
  "    var grammar = q === 'asset' || q.slice(0, 6) === 'asset:';",
  "    var aq = q.slice(0, 6) === 'asset:' ? q.slice(6).trim() : (grammar ? '' : q);",
  "    for (i = 0; i < d.assets.length; i++) {",
  "      e = d.assets[i];",
  "      var an = String(e.name || '').toLowerCase();",
  "      r = -1;",
  "      if (!aq) { r = (grammar || !q) ? 1 : -1; }",
  "      else if (an.indexOf(aq) === 0) r = 0;",
  "      else if (an.indexOf(aq) > 0) r = 1;",
  "      else if (String(e.id || '').toLowerCase().indexOf(aq) === 0) r = 3;",
  "      if (r < 0) continue;",
  "      assets.push({ kind: 'asset', rank: r, order: i, id: String(e.id || ''), label: String(e.name || ''), sub: String(e.tags || e.kind || ''), kl: String(e.kind || ''), insert: '#[asset:' + String(e.id || '') + ']' });",
  "    }",
  "    assets.sort(function(a, b){ if (a.rank !== b.rank) return a.rank - b.rank; return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; });",
  "    var shots = [];",
  "    var sgrammar = q === 'shot' || q.slice(0, 5) === 'shot:';",
  "    var sq = q.slice(0, 5) === 'shot:' ? q.slice(5).trim() : (sgrammar ? '' : q);",
  "    for (i = 0; i < d.shots.length; i++) {",
  "      e = d.shots[i];",
  "      var sn = String(e.name || '').toLowerCase();",
  "      r = -1;",
  "      if (!sq) { r = (sgrammar || !q) ? 1 : -1; }",
  "      else if (sn.indexOf(sq) === 0) r = 0;",
  "      else if (sn.indexOf(sq) > 0) r = 1;",
  "      else if (String(e.id || '').toLowerCase().indexOf(sq) === 0) r = 3;",
  "      if (r < 0) continue;",
  "      shots.push({ kind: 'shot', rank: r, order: i, id: String(e.id || ''), label: String(e.name || ''), sub: 'clip', insert: '#[shot:' + String(e.id || '') + ']' });",
  "    }",
  "    shots.sort(function(a, b){ if (a.rank !== b.rank) return a.rank - b.rank; return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; });",
  "    var atmos = [];",
  "    var mgrammar = q === 'atmo' || q.slice(0, 5) === 'atmo:';",
  "    var mq = q.slice(0, 5) === 'atmo:' ? q.slice(5).trim() : (mgrammar ? '' : q);",
  "    for (i = 0; i < d.atmos.length; i++) {",
  "      e = d.atmos[i];",
  "      var mn = String(e.name || '').toLowerCase();",
  "      r = -1;",
  "      if (!mq) { r = (mgrammar || !q) ? 1 : -1; }",
  "      else if (mn.indexOf(mq) === 0) r = 0;",
  "      else if (mn.indexOf(mq) > 0) r = 1;",
  "      else if (String(e.id || '').toLowerCase().indexOf(mq) === 0) r = 3;",
  "      if (r < 0) continue;",
  "      atmos.push({ kind: 'atmo', rank: r, order: i, id: String(e.id || ''), label: String(e.name || ''), sub: String(e.mood || ''), insert: '#[atmo:' + String(e.id || '') + ']' });",
  "    }",
  "    atmos.sort(function(a, b){ if (a.rank !== b.rank) return a.rank - b.rank; return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; });",
  "    var g = null;",
  "    if (d.assets.length && q && 'asset'.indexOf(q) === 0) g = { kind: 'asset', rank: 0, order: -1, label: 'asset', sub: 'Asset Library - the whole shelf, by tab', insert: '#[asset:', open: 1 };",
  "    var sg = null;",
  "    if (d.shots.length && q && 'shot'.indexOf(q) === 0) sg = { kind: 'shot', rank: 0, order: -1, label: 'shot', sub: 'Absolute Cinema - pick a saved clip', insert: '#[shot:', open: 1 };",
  "    var mg = null;",
  "    if (d.atmos.length && q && 'atmo'.indexOf(q) === 0) mg = { kind: 'atmo', rank: 0, order: -1, label: 'atmo', sub: 'a mood - pick one, or type your own words', insert: '#[atmo:', open: 1 };",
  "    var camrow = { kind: 'cam', rank: 0, order: -1, label: '#[cam: ...]', sub: 'camera directive - size/angle on <cardId> | 3s | blend', insert: '#[cam: ', open: 1 };",
  "    var out = [];",
  "    if (g && out.length < CAP) out.push(g);",
  "    if (sg && out.length < CAP) out.push(sg);",
  "    if (mg && out.length < CAP) out.push(mg);",
  "    if (gram && q && 'cam'.indexOf(q) === 0 && out.length < CAP) out.push(camrow);",
  "    for (i = 0; i < tags.length && out.length < CAP; i++) out.push(tags[i]);",
  "    if (gram && !q && out.length < CAP) out.push(camrow);",
  "    for (i = 0; i < cards.length && out.length < CAP; i++) out.push(cards[i]);",
  "    for (i = 0; i < assets.length && out.length < CAP; i++) out.push(assets[i]);",
  "    for (i = 0; i < shots.length && out.length < CAP; i++) out.push(shots[i]);",
  "    for (i = 0; i < atmos.length && out.length < CAP; i++) out.push(atmos[i]);",
  "    return out;",
  "  }",
  "  function camRows(query){",
  "    var rows = rowsFrom({ tags: [], cards: data().cards }, query, 0), out = [], i, r;",
  "    for (i = 0; i < rows.length; i++) {",
  "      r = rows[i];",
  "      if (r.kind !== 'card' || !r.id) continue;",
  "      out.push({ kind: 'card', bare: 1, rank: r.rank, order: r.order, id: r.id, label: r.label, sub: r.sub, insert: r.id + ' ' });",
  "    }",
  "    return out;",
  "  }",
  "  function caretAt(el){",
  "    var r = el.getBoundingClientRect();",
  // PAPER ZOOM (--pz): rects are post-zoom viewport px, computed styles pre-zoom CSS px — mixing them wraps the mirror wrong and lands the panel off the caret.
  "    var z = el.offsetWidth ? (r.width / el.offsetWidth) : 1;",
  "    if (!isFinite(z) || z <= 0) z = 1;",
  "    var m = D.createElement('div');",
  "    var cs = window.getComputedStyle(el);",
  "    for (var i = 0; i < KEYS.length; i++) { try { m.style[KEYS[i]] = cs[KEYS[i]]; } catch (e1) {} }",
  "    m.style.position = 'fixed'; m.style.left = '-4000px'; m.style.top = '0px';",
  "    try { m.style.zoom = z; } catch (e2) {}",
  "    m.style.width = (r.width / z) + 'px'; m.style.height = 'auto';",
  "    m.style.whiteSpace = 'pre-wrap'; m.style.overflowWrap = 'break-word'; m.style.visibility = 'hidden';",
  "    var c = el.selectionStart || 0;",
  "    m.textContent = (el.value || '').slice(0, c);",
  "    var mark = D.createElement('span');",
  "    mark.textContent = '\\u200b';",
  "    m.appendChild(mark);",
  "    D.body.appendChild(m);",
  "    var mr = m.getBoundingClientRect(), sr = mark.getBoundingClientRect();",
  "    var out = { x: r.left + (sr.left - mr.left), y: r.top + (sr.top - mr.top) - (el.scrollTop || 0) * z, h: sr.height || 16 };",
  "    D.body.removeChild(m);",
  "    return out;",
  "  }",
  "  function theme(panel){",
  "    var app = D.getElementById('sb-app');",
  "    if (!app) return;",
  "    var cs = window.getComputedStyle(app);",
  "    var names = ['--sb-panel','--sb-panel-2','--sb-ink','--sb-ink-dim','--sb-line','--sb-accent','--sb-hover','--sb-select','--sb-select-ink'];",
  "    for (var i = 0; i < names.length; i++) {",
  "      var v = cs.getPropertyValue(names[i]);",
  "      if (v) panel.style.setProperty(names[i], v.trim());",
  "    }",
  "  }",
  "  function panel(){",
  "    if (st.panel && st.panel.parentNode) return st.panel;",
  "    var p = D.createElement('div');",
  "    p.id = 'sb-refpick';",
  "    p.setAttribute('data-v', '" + REALM_V + "');",
  "    p.setAttribute('data-interactive', '');",
  "    p.style.position = 'fixed';",
  "    p.style.zIndex = '4000';",
  "    p.style.pointerEvents = 'auto';",
  "    p.style.display = 'none';",
  "    D.body.appendChild(p);",
  "    st.panel = p;",
  "    theme(p);",
  "    return p;",
  "  }",
  "  function close(){",
  "    st.el = null; st.start = -1; st.rows = []; st.sel = 0; st.shelf = null; st.list = null;",
  "    if (st.panel) st.panel.style.display = 'none';",
  "  }",
  "  function kindWord(row){",
  "    if (row.bare) return 'id';",
  "    if (row.kind === 'tag') return 'tag';",
  "    if (row.kind === 'asset') return row.kl ? (KLABEL[row.kl] ? KLABEL[row.kl].replace(/s$/, '') : row.kl) : 'asset';",
  "    if (row.kind === 'shot') return 'clip';",
  "    if (row.kind === 'cam') return 'cam';",
  "    if (row.kind === 'atmo') return 'mood';",
  "    return 'ref';",
  "  }",
  /* Shelf mode paints a tab strip over a scrolling list; plain mode paints rows straight into the
     panel. Either way st.list is the element the rows live in (scrollSel reads it). */
  "  function paint(){",
  "    var p = panel();",
  "    while (p.firstChild) p.removeChild(p.firstChild);",
  "    var host = p;",
  "    if (st.shelf) {",
  "      p.className = 'shelf';",
  "      var tabs = D.createElement('div');",
  "      tabs.className = 'sbrp-tabs';",
  "      tabs.setAttribute('data-interactive', '');",
  "      var names = tabNames();",
  "      for (var ti = 0; ti < names.length; ti++) {",
  "        (function(kn){",
  "          var tb = D.createElement('div');",
  "          tb.className = 'sbrp-tab' + (kn === st.tab ? ' on' : '');",
  "          tb.setAttribute('data-interactive', '');",
  "          var tl = D.createElement('span'); tl.textContent = KLABEL[kn] || kn; tb.appendChild(tl);",
  "          var tc = D.createElement('span'); tc.className = 'sbrp-tc'; tc.textContent = String(st.shelf.counts[kn] || 0); tb.appendChild(tc);",
  /* Same law as the rows: mousedown must not steal the caret, and one press is one tab change. */
  "          tb.addEventListener('mousedown', function(ev){ ev.preventDefault(); });",
  "          tb.addEventListener('pointerdown', function(ev){ ev.preventDefault(); });",
  "          var pick = function(ev){ ev.preventDefault(); ev.stopPropagation(); if (st.tfired) return; st.tfired = 1; retab(kn); setTimeout(function(){ st.tfired = 0; }, 120); };",
  "          tb.addEventListener('pointerup', pick);",
  "          tb.addEventListener('mouseup', pick);",
  "          tb.addEventListener('click', pick);",
  "          tabs.appendChild(tb);",
  "        })(names[ti]);",
  "      }",
  "      p.appendChild(tabs);",
  "      host = D.createElement('div');",
  "      host.className = 'sbrp-list';",
  "      host.setAttribute('data-interactive', '');",
  "      host.addEventListener('mousedown', function(ev){ if (ev.target === host) ev.preventDefault(); });",
  "      p.appendChild(host);",
  "      var hint = D.createElement('div');",
  "      hint.className = 'sbrp-hint';",
  "      hint.textContent = st.shelf.q ? (st.shelf.counts.all + ' on the shelf match. Tab switches tabs, Enter picks.') : 'Type to narrow. Tab or Left/Right switches tabs, Enter picks.';",
  "      p.appendChild(hint);",
  "      if (!st.rows.length) {",
  "        var z = D.createElement('div');",
  "        z.className = 'sbrp-none';",
  "        z.textContent = st.shelf.counts.all ? 'Nothing under ' + (KLABEL[st.tab] || st.tab) + ' matches that. Another tab has it.' : 'Nothing on the shelf matches that.';",
  "        host.appendChild(z);",
  "      }",
  "    } else p.className = '';",
  "    st.list = host;",
  "    var lim = st.shelf ? Math.min(st.rows.length, SCAP) : st.rows.length;",
  "    for (var i = 0; i < lim; i++) {",
  "      (function(row, n){",
  "        var b = D.createElement('div');",
  "        b.className = 'sbrp-row' + (n === st.sel ? ' on' : '');",
  "        b.setAttribute('data-interactive', '');",
  "        var a = D.createElement('span');",
  "        a.className = 'sbrp-n';",
  "        a.textContent = row.label;",
  "        b.appendChild(a);",
  "        if (row.sub) {",
  "          var c = D.createElement('span');",
  "          c.className = 'sbrp-s';",
  "          c.textContent = row.sub;",
  "          b.appendChild(c);",
  "        }",
  "        var k = D.createElement('span');",
  "        k.className = 'sbrp-k';",
  "        k.textContent = kindWord(row);",
  "        b.appendChild(k);",
  /* GUARD: mousedown keeps the caret in the box, pointerup commits, click is the fallback — a
     guard stops the double insert. */
  "        b.addEventListener('mousedown', function(ev){ ev.preventDefault(); });",
  "        b.addEventListener('pointerdown', function(ev){ ev.preventDefault(); });",
  "        var fire = function(ev){ ev.preventDefault(); if (st.fired) return; st.fired = 1; st.sel = n; dbg('row-click ' + row.insert); commit(); setTimeout(function(){ st.fired = 0; }, 120); };",
  "        b.addEventListener('pointerup', fire);",
  "        b.addEventListener('mouseup', fire);",
  "        b.addEventListener('click', fire);",
  "        host.appendChild(b);",
  "      })(st.rows[i], i);",
  "    }",
  "    if (st.shelf && st.rows.length > lim) {",
  "      var more = D.createElement('div');",
  "      more.className = 'sbrp-none';",
  "      more.textContent = (st.rows.length - lim) + ' more below the fold. Keep typing to narrow.';",
  "      host.appendChild(more);",
  "    }",
  "  }",
  "  function place(el){",
  "    var p = panel();",
  "    var pt = caretAt(el);",
  "    p.style.display = 'block';",
  "    var w = st.shelf ? 560 : 262;",
  "    w = Math.min(w, (window.innerWidth || 900) - 16);",
  "    if (st.shelf) { p.style.maxHeight = ''; p.style.overflowY = 'hidden'; if (st.list) { st.list.style.maxHeight = (SVIS * 30) + 'px'; st.list.style.overflowY = 'auto'; } }",
  "    else { p.style.maxHeight = (VIS * 30) + 'px'; p.style.overflowY = ''; }",
  "    var x = Math.max(6, Math.min(pt.x, (window.innerWidth || 900) - w - 8));",
  "    p.style.left = x + 'px';",
  "    p.style.width = w + 'px';",
  "    var below = pt.y + pt.h + 4;",
  "    var h = p.offsetHeight || 120;",
  "    if (below + h > (window.innerHeight || 700) - 8) {",
  "      var above = pt.y - h - 4;",
  "      p.style.top = Math.max(6, above) + 'px';",
  "    } else p.style.top = below + 'px';",
  "  }",
  "  function show(el, t){",
  "    st.el = el; st.id = el.id || ''; st.start = t.start;",
  "    var was = st.rows.length ? st.rows[st.sel] : null;",
  "    var sq = t.cam ? null : shelfQ(t.q);",
  "    if (sq !== null && data().assets.length) {",
  "      var sr = shelfRows(sq);",
  "      st.shelf = { q: sq, counts: sr.counts, kinds: sr.kinds };",
  "      st.rows = sr.rows;",
  "    } else {",
  "      st.shelf = null;",
  "      st.rows = t.cam ? camRows(t.q) : rowsFor(t.q);",
  "      if (!st.rows.length) { close(); return; }",
  "    }",
  "    st.sel = 0;",
  "    if (was) { for (var i = 0; i < st.rows.length; i++) if (st.rows[i].insert === was.insert) { st.sel = i; break; } }",
  "    paint();",
  "    place(el);",
  "    scrollSel();",
  "  }",
  "  function scrollSel(){",
  "    var box = st.list || st.panel;",
  "    if (!box || !st.rows.length) return;",
  "    var row = box.children[st.sel];",
  "    if (!row) return;",
  "    var top = row.offsetTop, bot = top + row.offsetHeight;",
  "    if (top < box.scrollTop) box.scrollTop = top;",
  "    else if (bot > box.scrollTop + box.clientHeight) box.scrollTop = bot - box.clientHeight;",
  "  }",
  "  function fits(el, v){",
  "    var prev = el.value;",
  "    el.value = v;",
  "    var ok = el.scrollHeight <= el.clientHeight + 1;",
  "    if (!ok) el.value = prev;",
  "    return ok;",
  "  }",
  "  function commit(){",
  /* The active box wins over the remembered one: a re-render can hand us a fresh textarea node,
     and the row he clicked must land where his caret actually is. */
  "    var el = st.el, row = st.rows[st.sel];",
  "    var live = D.activeElement;",
  "    if (live && live !== el && live.className && String(live.className).indexOf('sbp-raw') >= 0) el = live;",
  "    if ((!el || !el.parentNode) && st.id) el = D.getElementById(st.id) || el;",
  "    if (!el || !row) { dbg('commit-noel row=' + (row ? row.insert : 'none')); close(); return; }",
  "    var t = tok(el);",
  "    if (!t) { dbg('commit-notok caret=' + el.selectionStart + ' end=' + el.selectionEnd); close(); return; }",
  "    var v = el.value || '';",
  "    var head = v.slice(0, t.start), tail = v.slice(el.selectionStart || 0);",
  "    var next = head + row.insert + tail;",
  "    var caret = head.length + row.insert.length;",
  "    close();",
  // A box wearing data-sbrp-free manages its own limits — section boxes live under a LINE cap the shell enforces on commit, not the page band's visual fit — so the fit law and the page-save machinery both stay off it. Its own change/input lane carries the insert out.
  "    var free = el.getAttribute && el.getAttribute('data-sbrp-free') === '1';",
  "    if (free) { el.value = next; }",
  "    else if (!fits(el, next)) { dbg('commit-nofit len=' + next.length); return; }",
  "    dbg('commit-ok ' + row.insert);",
  "    if (!free) { el.setAttribute('data-fit', next); el.scrollTop = 0; }",
  "    try { el.setSelectionRange(caret, caret); } catch (e) {}",
  /* HIS SAVE MODEL: a picked token is an edit like any other keystroke — it lands in the box and
     the page goes dirty. Nothing reaches the book until Save. */
  "    if (!free && window.__SBSAVE) window.__SBSAVE.touch(el);",
  /* An OPEN row (the `asset` grammar completion) leaves the token unclosed on purpose — re-sync
     immediately so the caret sitting after `#[asset:` opens the shelf list without a keystroke. */
  "    if (row.open) { try { el.focus(); } catch (e3) {} sync(el); }",
  "  }",
  // Live resolution: the words he writes go to the shell after a beat of quiet and the paper behind the box redraws with tags and references resolved. Typing never waits on it — the raw layer is what he is looking at until he pauses.
  "  function typing(el){",
  "    if (st.live) { clearTimeout(st.live); st.live = 0; }",
  // WAS: a debounced pageLive send that re-resolved the paper behind the box. Under his save model that is a state round trip while the caret is in the field — the one thing the rename bug taught us never to do — so typing now only marks the page dirty. The box he looks at is the raw layer; the resolved paper catches up when he saves.
  "    if (window.__SBSAVE) window.__SBSAVE.touch(el);",
  "  }",
  "  function sync(el){",
  "    var t = tok(el);",
  // Close by NAME as well as by node — a re-render can hand back a different node for the same zone (show() already remembers st.id for exactly this), and a panel opened for the old node must still close when the caret in the new one stands nowhere.
  "    if (!t) { if (st.el === el || (st.id && el.id === st.id)) close(); return; }",
  "    show(el, t);",
  "  }",
  "  function outsideToken(ev){ var t=ev.target; if(st.el && t!==st.el && !(st.panel && st.panel.contains(t))) close(); }",
  "  D.addEventListener('pointerdown', outsideToken, true);",
  "  window.__SBRP = {",
  "    v: " + REALM_V + ",",
  "    tick: null,",
  "    off: function(){ D.removeEventListener('pointerdown', outsideToken, true); close(); },",
  "    input: function(el){ typing(el); sync(el); },",
  "    sync: function(el){ sync(el); },",
  "    focus: function(el){ sync(el); },",
  "    blur: function(el){ if (st.el === el || st.rows.length) close(); },",
  "    key: function(el, ev){",
  // The zone he types in is re-rendered under him (live resolution sends the text back, the paper redraws). If that ever hands us a NEW textarea node, an identity check would leave the open list answering to a node nobody is typing in — list on screen, every key falling through. So an open list re-adopts the box under the caret instead of refusing it.
  "      if (st.el !== el) { var rt = tok(el); if (!rt) return false; var keep = st.rows.length ? st.rows[st.sel] : null; show(el, rt); if (keep) { for (var ri = 0; ri < st.rows.length; ri++) if (st.rows[ri].insert === keep.insert) { st.sel = ri; break; } } }",
  "      var k = ev.key;",
  "      if (k === 'Escape' && (st.rows.length || st.shelf)) { close(); return true; }",
  /* SHELF MODE KEYS: Tab walks the tab strip (Shift+Tab back) instead of committing, and while the
     words after `asset:` are empty Left/Right walk it too; once he is typing, Left/Right are his caret. */
  "      if (st.shelf) {",
  "        if (k === 'Tab') { tabStep(ev.shiftKey ? -1 : 1); return true; }",
  "        if ((k === 'ArrowLeft' || k === 'ArrowRight') && !st.shelf.q) { tabStep(k === 'ArrowLeft' ? -1 : 1); return true; }",
  "      }",
  "      if (!st.rows.length) return false;",
  "      var nrows = st.shelf ? Math.min(st.rows.length, SCAP) : st.rows.length;",
  "      if (k === 'ArrowDown') { st.sel = (st.sel + 1) % nrows; paint(); scrollSel(); return true; }",
  "      if (k === 'ArrowUp') { st.sel = (st.sel - 1 + nrows) % nrows; paint(); scrollSel(); return true; }",
  "      if (k === 'PageDown') { st.sel = Math.min(nrows - 1, st.sel + SVIS); paint(); scrollSel(); return true; }",
  "      if (k === 'PageUp') { st.sel = Math.max(0, st.sel - SVIS); paint(); scrollSel(); return true; }",
  "      if (k === 'Enter' || k === 'Tab') { commit(); return true; }",
  "      return false;",
  "    }",
  "  };",
  "})()",
].join("\n");

// The <img onerror> bootstrap's handler — the engine's own run-once lane for realm code (a render
// that changes this source re-fires it, and the module is idempotent either way).
export function bootScript() {
  return REALM;
}

module.exports = {
  REALM_V,
  VISIBLE,
  ROW_CAP,
  CARD_CAP,
  candidates,
  filter,
  camTarget,
  slotAt,
  camFilter,
  applySlot,
  bootScript,
};
