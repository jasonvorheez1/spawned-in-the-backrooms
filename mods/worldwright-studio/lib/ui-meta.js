const EDITOR=require("lib/editor-registry.js");
// ui-meta.js — the MetadataSidebar for one card. render(state) -> html string. Pure: no api, no SQL.
// READ-ONLY everywhere except the section text boxes during page edit view — the reason `view` is a parameter.

const REFS = require("lib/refs.js");
const PL = require("lib/pagelayout.js");
const CARDSUI = require("lib/ui-cards.js");
const PIN = require("lib/pinned.js");

// The pane is handed a card BUNDLE, not a book row, so the registry answers by name; a bookId, when
// a caller hands one over, is believed first.
export function readOnlyBook(s) {
  if (PIN.isLocked(String((s && s.bookId) || ""))) return true;
  const name = String(((s && s.meta) || {}).bookName || (s && s.bookName) || "")
    .trim()
    .toLowerCase();
  if (!name) return false;
  return PIN.all().some((b) => b.locked && String(b.name).trim().toLowerCase() === name);
}

// A seat the write fence denied reads the same way a locked book does: the state, no switch.
export function frozen(s) {
  return readOnlyBook(s) || (s && s.canWrite === false);
}

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

export function Q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function act(op, extra) {
  return "sendAction('cardAct', { op: '" + Q(op) + "'" + (extra ? ", " + extra : "") + " })";
}

export function refAct(op, extra) {
  return "sendAction('refsAct', { op: '" + Q(op) + "'" + (extra ? ", " + extra : "") + " })";
}

export function row(label, value) {
  return `<div class="mrow"><span>${E(label)}</span><div>${value}</div></div>`;
}

// COMPILE — the switch decides whether this row shows up for export. Y rides along in a whole-book export; N is left out of it. Exporting one card explicitly ignores the flag entirely — asking for that card IS the decision (lib/cards.js's compileFlag comment says the same). A locked book or a denied seat gets the STATE, not the switch.
export function compileBadge(on) {
  const yes = on !== false;
  return `<span class="sb-pill mcomp${yes ? " on" : ""}">${yes ? "Y — exports" : "N — held back"}</span>`;
}

export function compileSwitch(on, ro, extra) {
  if (ro) return compileBadge(on);
  const yes = on !== false;
  return `<div class="mseg">
    <button class="mseg-btn${yes ? " on" : ""}" data-interactive title="include this in whole-book exports"
      onclick="${act("compileSet", extra + ", value: true")}">Y</button>
    <button class="mseg-btn${yes ? "" : " on"}" data-interactive title="leave this out of whole-book exports"
      onclick="${act("compileSet", extra + ", value: false")}">N</button>
  </div>`;
}

export function statusBadge(status) {
  const s = String(status || "");
  if (!s) return `<span class="dim">—</span>`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.toLowerCase().charCodeAt(i)) % 360;
  // Hue is the status's identity; lightness is the theme's, off the chip tokens ui.js emits.
  return `<span class="sb-pill" style="background:color-mix(in oklch, oklch(0.62 0.14 ${h}) var(--sb-tint, 32%), var(--sb-chip));border-color:color-mix(in oklch, oklch(0.62 0.14 ${h}) var(--sb-tint, 32%), var(--sb-chip-edge));color:color-mix(in oklch, oklch(0.62 0.14 ${h}) 16%, var(--sb-chip-ink))">${E(s)}</span>`;
}

export function priority(p) {
  const n = Math.max(0, Math.min(5, Math.floor(Number(p) || 0)));
  if (!n) return `<span class="dim">none</span>`;
  // Numbers, not dots — dots read as something to click. His call.
  return `<span class="mprio">${n}<span class="dim"> of 5</span></span>`;
}

// Canonical wording for the tag-vs-reference seam — lib/ui-cards.js's Tags field must match it word for word.
export function tags(list) {
  if (!(list || []).length)
    return `<span class="mteach">none yet — open Edit Card, type a word into Tags and press Enter.
      Tags group cards across folders — the same tag on a card in any book gathers them together.
      A tag is not a <b>#[…]</b> token: it never resolves inside your prose.</span>`;
  return list.map((t) => `<span class="sb-tag ro">${E(t.name || t.id)}</span>`).join("");
}

export function sections(list, editable) {
  if (!(list || []).length) return `<div class="dim">no sections</div>`;
  return list
    .map((s) => {
      const lines = PL.sectionLines(s.content, s.lineLimit);
      const body = editable
        ? // data-sbrp-free: the `#[` picker works here, but the page-zone fit law and save machinery
          // stay off — this box's own onchange -> sectionSet is the commit lane.
          `<textarea class="msec-text" rows="3" data-interactive data-sbrp-free="1"
            oninput="if(window.__SBRP)window.__SBRP.sync(this);"
            onkeydown="if(window.__SBRP&&window.__SBRP.key(this,event)){event.preventDefault();return false;}"
            onkeyup="if(window.__SBRP)window.__SBRP.sync(this);"
            onclick="if(window.__SBRP)window.__SBRP.sync(this);"
            onfocus="if(window.__SBRP)window.__SBRP.focus(this);"
            onblur="if(window.__SBRP)window.__SBRP.blur(this);"
            onchange="${act("sectionSet", "id: '" + Q(s.id) + "', value: this.value")}">${E(s.content)}</textarea>`
        : `<div class="msec-prev">${E(String(s.content || "")) || `<span class="dim">empty</span>`}</div>`;
      return `<div class="msec" id="sb-meta-sec-${E(s.id)}">
        <div class="msec-head"><span class="msec-name">${E(s.name)}</span>
          <span class="sb-lines${lines.over ? " over" : ""}">${E(lines.text)}</span></div>
        ${body}
      </div>`;
    })
    .join("");
}

// His stack ruling: a reference points at the PRIMARY card (id === stackId), never the face-up tile.
export function backlinks(bl, ctx) {
  const b = bl || {};
  const same = b.sameBook || [];
  const cross = b.crossBook || [];
  const c = ctx || {};
  const stack = c.stack || null;
  const cardId = String((c.card || {}).id || "");
  const primaryId = String((stack || {}).primaryId || "");
  const inStack = !!stack && Number(stack.size || 0) > 1;
  const isPrimary = !primaryId || primaryId === cardId;

  let stackLine = "";
  if (inStack && !isPrimary) {
    // viaStack rides along only when the shell asks refs.backlinks for it (opts.primaryId).
    const via = b.viaStack || null;
    const n = via ? Number(via.count || 0) : -1;
    const named = via && via.name ? E(via.name) : "its primary card";
    const count =
      n < 0
        ? ""
        : n === 0
        ? " Nothing points at it yet."
        : ` ${n} reference${n === 1 ? "" : "s"} point${n === 1 ? "s" : ""} there.`;
    stackLine = `<div class="mteach mstack-ref">this card sits in a stack. A <b>#[…]</b> reference to the stack
      resolves to ${named} — the stack's primary — never to whichever card is face-up on the tile.${count}
      ${
        via && via.cardId
          ? `<button class="sb-link" data-interactive onclick="${act(
              "openCard",
              "id: '" + Q(via.cardId) + "', bookId: '" + Q(via.bookId || "") + "'"
            )}">open ${E(via.name || "the primary")}</button>`
          : ""
      }</div>`;
  } else if (inStack && isPrimary) {
    stackLine = `<div class="mnote mstack-ref">this card is the stack's primary — every reference to the
      stack resolves here, whichever card the tile is showing.</div>`;
  }

  if (same.length || cross.length)
    return `${row("Same book", links(same))}${row("Other books", links(cross))}${stackLine}`;
  return `<div class="mteach">nothing points here yet. A reference is a #[…] token written into another
    card's page that resolves to this card's name — type <b>#[</b> in a page, or use <b>Insert ▸ Reference</b>.
    It points at this card's id, so renaming this card never breaks the sentence that mentions it.</div>${stackLine}`;
}

// Only DEAD references offer a repair — one in the trash is waiting, not broken.
export function dangling(rows, ro) {
  const list = (rows || []).filter((r) => r && r.toId);
  if (!list.length) return "";
  const dead = list.filter((r) => r.state === "dead").length;
  const trashed = list.length - dead;
  const head = [
    dead ? `${dead} dead` : "",
    trashed ? `${trashed} in the trash` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const items = list
    .map((r) => {
      const target = r.toName ? E(r.toName) : `<code>${E(r.toId)}</code>`;
      const fix =
        ro
          ? `<span class="dim">read-only</span>`
          : r.state === "dead"
          ? `<button class="sb-link mfix" data-interactive title="drop this edge from the index"
              onclick="${refAct("clearEdge", "fromId: '" + Q(r.fromId) + "', toId: '" + Q(r.toId) + "'")}">clear</button>`
          : `<span class="dim">restore it from Trash</span>`;
      return `<div class="mdang ${r.state === "dead" ? "dead" : "trash"}">
        <span class="dot"></span>
        <span class="nm">${target}</span>
        <span class="st">${E(r.label || (r.state === "dead" ? "Deleted Reference" : "Reference In Trash"))}</span>
        ${fix}</div>`;
    })
    .join("");
  return `<div class="msection-title">Dangling references <span class="mnote">— ${E(head)}</span></div>
    ${items}
    <div class="mteach">clearing drops the broken edge from the index. The <b>#[…]</b> token itself stays in
      the prose until you edit that sentence — the words are yours, so nothing rewrites them for you.</div>`;
}

export function links(list) {
  if (!(list || []).length) return `<span class="dim">none</span>`;
  return list
    .map(
      (l) =>
        `<button class="sb-link" data-interactive
      onclick="${act("openCard", "id: '" + Q(l.cardId || l.id) + "', bookId: '" + Q(l.bookId || "") + "'")}">${E(
          l.name || l.cardId || l.id
        )}</button>`
    )
    .join("");
}

export function styles() {
  return `<style>
  #sb-meta .meta-wait { display: flex; align-items: center; justify-content: center; padding: 34px 0; }
  #sb-meta .mspin { width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid color-mix(in oklch, var(--sb-line) 80%, transparent);
    border-top-color: var(--accent); animation: sb-meta-spin 0.7s linear infinite; }
  @keyframes sb-meta-spin { to { transform: rotate(360deg); } }
  #sb-meta .mrow { display: flex; gap: 8px; padding: 3px 0; align-items: flex-start; }
  #sb-meta .mrow > span { flex: 0 0 88px; font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.1px; text-transform: uppercase;
    color: color-mix(in oklch, var(--sb-ink-dim) 68%, var(--sb-line)); padding-top: 2px; }
  #sb-meta .mrow > div { flex: 1 1 auto; min-width: 0; font-size: calc(12px * var(--sb-fs, 1)); }
  #sb-meta .maddr { font-size: calc(11.5px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 73%, var(--sb-ink)); line-height: 1.4; word-break: break-word; }
  #sb-meta .maddr .sep { color: color-mix(in oklch, var(--sb-ink-dim) 53%, var(--sb-line)); margin: 0 4px; }
  #sb-meta .mname { margin: 6px 0 10px; font-size: calc(15px * var(--sb-fs, 1)); font-weight: 600; letter-spacing: 0.2px; color: color-mix(in oklch, var(--sb-ink) 80%, white); }
  #sb-meta .mprio { display: inline-flex; align-items: center; gap: 3px; }
  #sb-meta .mprio i { width: 5px; height: 5px; border-radius: 50%; background: color-mix(in oklch, var(--sb-line) 88%, var(--sb-ink-dim)); }
  #sb-meta .mprio i.on { background: var(--accent); }
  #sb-meta .mflag { display: inline-flex; align-items: center; gap: 5px; font-size: calc(11.5px * var(--sb-fs, 1)); }
  #sb-meta .mflag .dot { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in oklch, var(--sb-line) 88%, var(--sb-ink-dim)); }
  #sb-meta .mflag.on .dot { background: var(--sb-accent); box-shadow: 0 0 8px color-mix(in oklch, var(--sb-accent) 50%, transparent); }
  #sb-meta .msection-title { margin: 14px 0 6px; padding-top: 10px; border-top: 1px solid var(--line);
    font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.4px; text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line)); }
  #sb-meta .msec { margin-bottom: 7px; padding: 7px 8px; background: var(--sb-center);
    border: 1px solid var(--line); border-radius: 3px; }
  #sb-meta .msec-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  #sb-meta .msec-name { flex: 1 1 auto; font-size: calc(11.5px * var(--sb-fs, 1)); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-meta .sb-lines { font-size: calc(10.5px * var(--sb-fs, 1)); font-family: ui-monospace, Menlo, monospace; color: var(--ink-dim); }
  #sb-meta .sb-lines.over { color: var(--sb-warn); }
  #sb-meta .msec-prev { font-size: calc(11px * var(--sb-fs, 1)); line-height: 1.4; color: var(--sb-ink-dim);
    white-space: pre-wrap; max-height: 160px; overflow: auto; }
  #sb-meta .msec-text { width: 100%; padding: 5px 7px; font: inherit; font-size: calc(11.5px * var(--sb-fs, 1)); color: inherit;
    background: color-mix(in oklch, var(--sb-field) 85%, black); border: 1px solid var(--line); border-radius: 3px; outline: none; resize: vertical; }
  #sb-meta .msec-text:focus { border-color: var(--accent); }
  #sb-meta .mmember { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: calc(11.5px * var(--sb-fs, 1)); }
  #sb-meta .mmember .n { width: 14px; color: var(--ink-dim); font-size: calc(10.5px * var(--sb-fs, 1)); }
  #sb-meta .mmember .nm { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-meta .sb-tag.ro { margin-right: 4px; }
  #sb-meta .mnote { font-size: calc(11px * var(--sb-fs, 1)); font-style: italic; color: color-mix(in oklch, var(--sb-ink-dim) 59%, var(--sb-line)); }
  #sb-meta .mstack-ref { margin-top: 6px; }
  #sb-meta .sb-pill.top, #sb-meta .sb-pill.primary { font-size: calc(9.5px * var(--sb-fs, 1)); letter-spacing: 0.6px; text-transform: uppercase; }
  /* one dangling reference: state dot, target, his words for the state, and the repair if there is one */
  #sb-meta .mdang { display: flex; align-items: baseline; gap: 6px; padding: 3px 0; font-size: calc(11.5px * var(--sb-fs, 1)); }
  #sb-meta .mdang .dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto;
    background: color-mix(in oklch, var(--sb-line) 80%, var(--sb-ink-dim)); }
  #sb-meta .mdang.dead .dot { background: var(--sb-warn); }
  #sb-meta .mdang .nm { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-meta .mdang .st { font-style: italic; color: color-mix(in oklch, var(--sb-ink-dim) 66%, var(--sb-line)); }
  #sb-meta .mdang .mfix { flex: 0 0 auto; }
  /* COMPILE — a two-chip switch, thumb-sized: this pane is read on a tablet */
  #sb-meta .mseg { display: inline-flex; gap: 0; }
  #sb-meta .mseg-btn { min-width: 46px; height: 34px; font: inherit; font-weight: 600;
    font-size: calc(12.5px * var(--sb-fs, 1)); letter-spacing: 0.4px; cursor: pointer;
    background: var(--sb-chip); color: var(--sb-chip-ink); border: 1px solid var(--sb-chip-edge); }
  #sb-meta .mseg-btn:first-child { border-radius: 3px 0 0 3px; }
  #sb-meta .mseg-btn:last-child { border-radius: 0 3px 3px 0; border-left: 0; }
  #sb-meta .mseg-btn:hover { border-color: var(--accent, var(--sb-accent)); }
  #sb-meta .mseg-btn.on { background: var(--accent, var(--sb-accent)); color: var(--sb-bg);
    border-color: var(--accent, var(--sb-accent)); }
  #sb-meta .sb-pill.mcomp { font-size: calc(10.5px * var(--sb-fs, 1)); letter-spacing: 0.5px; }
  #sb-meta .mcompteach { margin: 2px 0 8px; }
  /* the teaching an empty block does instead of saying "none" */
  #sb-meta .mteach { display: block; font-size: calc(11px * var(--sb-fs, 1)); line-height: 1.45;
    color: color-mix(in oklch, var(--sb-ink-dim) 62%, var(--sb-line)); }
  #sb-meta .mteach b { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: calc(10.5px * var(--sb-fs, 1));
    font-weight: 400; color: color-mix(in oklch, var(--sb-ink-dim) 86%, var(--sb-ink)); }
  </style>`;
}


export function render(state) {
  const s = state || {};
  const m = s.meta;

  if (s.metaLoading) {
    return `${styles()}<div class="pane-label">Metadata</div>
      <div class="meta-wait"><i class="mspin"></i></div>`;
  }
  if (!m || !m.card) {
    return `${styles()}<div class="pane-label">Metadata</div>
      <div class="meta-empty">select a card to see its metadata</div>`;
  }
  const card = m.card;
  // READ-ONLY, asked once: it closes the section boxes, the pane's one editable thing.
  const ro = readOnlyBook(s);
  const editable = !ro && String(s.view || "folder") === "page";
  const addr = CARDSUI.address(m.address || [], 44)
    .map((p) => E(p))
    .join(`<span class="sep">›</span>`);
  const stack = m.stack || null;

  // members[0] is the TOP (what the tile draws); the PRIMARY is id === stackId (what references point at).
  const stackBlock = stack && stack.size > 1
    ? `<div class="msection-title">Stack membership</div>
       ${row("Size", `${E(stack.size)} card${stack.size === 1 ? "" : "s"}`)}
       <div class="mstack">${(stack.members || [])
         .map(
           (mm, i) => `<div class="mmember"><span class="n">${i + 1}</span>
             <span class="nm">${E(mm.name)}</span>
             ${i === 0 ? `<span class="sb-pill top" title="face-up on the tile">top</span>` : ""}
             ${
               String(mm.id) === String(stack.primaryId)
                 ? `<span class="sb-pill primary" title="references and exports resolve here">primary</span>`
                 : ""
             }
             ${String(mm.id) === String(card.id) ? `<span class="dim">this</span>` : ""}</div>`
         )
         .join("")}</div>
       <div class="mteach">top is the card face-up on the tile — cycling changes it. Primary is what
         <b>#[…]</b> references and exports resolve to, and only Set Primary moves that.</div>`
    : `<div class="msection-title">Stack membership</div><div class="dim">standalone card</div>`;

  return `${styles()}
    <div class="pane-label">Metadata</div>
    <div class="mname">${E(card.name)}</div>
    <div class="maddr">${addr}</div>
    <div class="msection-title">Card</div>
    ${row("Editor", E(EDITOR.label(card.editor)))}
    ${row("Status", statusBadge(card.status))}
    ${row("Priority", priority(card.priority))}
    ${row(
      "Open question",
      `<span class="mflag${card.openQuestion ? " on" : ""}"><span class="dot"></span>${
        card.openQuestion ? "open" : "closed"
      }</span>`
    )}
    ${row(
      "Tags",

      (m.tags || []).length || !ro ? tags(m.tags) : `<span class="dim">none</span>`
    )}
    ${row("Summary", card.summary ? E(card.summary) : `<span class="dim">—</span>`)}
    ${row("Export", compileSwitch(m.compile, frozen(s), "kind: 'card', id: '" + Q(card.id) + "'"))}
    <div class="mteach mcompteach">${
      m.compile === false
        ? `left out of whole-book exports — this card stays behind when the book leaves as one document.
           Exporting <i>this card</i> on its own still writes it: asking for it is the decision.`
        : `included in exports — this card rides along when the whole book leaves as one document.
           Set it to <b>N</b> and it is left out of whole-book exports, while an export of this card alone still writes it.`
    }</div>
    <div class="msection-title">Sections${
      editable ? ` <span class="mnote">— editable in page edit view</span>` : ""
    }</div>
    ${sections(m.sections, editable)}
    <div class="msection-title">Pages</div>
    ${row("Count", `${E(Number(m.pageCount) || 0)}`)}
    ${stackBlock}
    <div class="msection-title">Backlinks</div>
    ${backlinks(m.backlinks, { card: card, stack: stack })}
    ${dangling(m.dangling, ro)}
    ${
      m.lineage
        ? `<div class="msection-title">Lineage</div>${row("Duplicated from", E(m.lineage))}`
        : ""
    }
    <div class="meta-foot">
      <div><span>Key</span>${E(card.id)}</div>
    </div>`;
}

// menu.
export function docSeg(f, ro) {
  const cur = CARDSUI.docRow(f.doc);
  if (ro) return `<span class="sb-pill">${E(cur.seg || cur.label)}</span>`;
  return (
    `<div class="mseg mdoc">` +
    CARDSUI.DOCS.map(
      (d) =>
        `<button class="mseg-btn${d.id === cur.id ? " on" : ""}" data-interactive title="${E(d.label)}"
          onclick="${"sendAction('docSet', { id: '" + Q(f.id) + "', doc: '" + Q(d.id) + "' })"}">${E(d.seg || d.label)}</button>`
    ).join("") +
    `</div>`
  );
}

export function docTeach(doc) {
  const cur = CARDSUI.docRow(doc);
  if (cur.id === "cinematic")
    return `a cinematic doc — its prose compiles: shot lines in these cards become a film. Press Compile to see what would change before anything lands.`;
  if (cur.id === "level")
    return `a level doc — its prose compiles: placement lines in these cards stand up in the room. Press Compile to see what would change before anything lands.`;
  return `a story folder — plain prose, nothing compiles. Mark it Cinematic or Level and its cards become a doc the world reads.`;
}

// The FOLDER pane. A folder has no card bundle, so it gets its own small pane instead of falling through to the book's metadata — an author sets its designation and its export switch here. state: { folder: { id, name, compile, doc, counts }, bookId, bookName, path: [...], canWrite, loading }
export function renderFolder(state) {
  const s = state || {};
  const f = s.folder || null;
  if (!f || s.loading) {
    return `${styles()}<div class="pane-label">Metadata</div>
      <div class="meta-wait"><i class="mspin"></i></div>`;
  }
  const ro = frozen(s);
  const on = f.compile !== false;
  const counts = f.counts || {};
  const cards = Number(counts.cards || 0);
  const folders = Number(counts.folders || 0);
  const cur = CARDSUI.docRow(f.doc);
  const compileBtn =
    cur.id && !ro
      ? `<button class="sb-btn mcompilebtn" data-interactive title="See what this doc would change"
          onclick="${"sendAction('compileOpen', { folderId: '" + Q(f.id) + "', name: '" + Q(f.name) + "' })"}">Compile</button>`
      : "";
  const addr = CARDSUI.address([].concat(s.bookName ? [s.bookName] : [], s.path || [], [f.name]), 44)
    .map((p) => E(p))
    .join(`<span class="sep">›</span>`);
  return `${styles()}
    <div class="pane-label">Metadata</div>
    <div class="mname">${E(f.name)}</div>
    <div class="maddr">${addr}</div>
    <div class="msection-title">Folder</div>
    ${row("Holds", `${E(cards)} card${cards === 1 ? "" : "s"} · ${E(folders)} folder${folders === 1 ? "" : "s"}`)}
    ${row("Doc", docSeg(f, ro))}
    <div class="mteach mdocteach">${docTeach(f.doc)}</div>
    ${compileBtn ? `<div class="mrow mcompilerow"><span></span><div>${compileBtn}</div></div>` : ""}
    ${row("Export", compileSwitch(f.compile, ro, "kind: 'folder', id: '" + Q(f.id) + "'"))}
    <div class="mteach mcompteach">${
      on
        ? `included in exports — everything under this folder rides along when the whole book leaves as
           one document. Set it to <b>N</b> and this folder's <i>whole subtree</i> is left out of whole-book
           exports: its cards, and every folder beneath it.`
        : `left out of whole-book exports — this folder's whole subtree stays behind: its cards, and every
           folder beneath it. Exporting one card from inside it on its own still writes that card.`
    }</div>
    <div class="mteach">a folder holds cards; the Export switch is about whole-book exports, never about
      what you can open or write. ${ro ? `This book is read-only, so the switches are shown as they stand.` : ``}</div>
    <div class="meta-foot">
      <div><span>Key</span>${E(f.id)}</div>
    </div>`;
}

module.exports = { render, renderFolder };
