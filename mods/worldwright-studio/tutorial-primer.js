import { homeOf as cleanupHome, completed, burn, failure } from "./lib/primer-cleanup.js";
// Worldwright tutorial seed and task hints. Preserve existing documents; tutorial revisions must not overwrite authored work.

const FILE = "tutorial-primer.js";
// NO WORKSHOP GUARD (jace, 2026-08-27 night): "This is a godmode tool. It only works in a workshop. Other rows are never read, never reordered and never dropped — read-modify-write of this id alone.
const ROW = "primer";
// ME: minted names, not the old tutorial* four. app-shell still answers tutorialPlay/Next/Back/Skip until the demolition lane strikes them, and a shared name would have fired the old demo tour from my buttons. Declared by patchInputs at spawn (app-shell declares its own the same way), and removed by the burn.
const ACT_NEXT = "primerNext";
const ACT_BACK = "primerBack";
const ACT_SKIP = "primerSkip";
const ACT_FOLD = "primerFold";
const ACTIONS = [ACT_NEXT, ACT_BACK, ACT_SKIP, ACT_FOLD];
// TRAP TWO (ME, 2026-09-01, caught live in an installed game): the panel realm's sendAction is auto-rewritten to "worldwright-studio:primerFold" in an INSTALLED game (mod-prefixed panels) and stays bare in the workshop — declared name ≠ dispatched name unless BOTH spellings are declared, read, and removed by the burn. TRAP ONE's dual-context lesson, action-shaped.
const PREFIX = "worldwright-studio:";
const SPELLINGS = ACTIONS.concat(ACTIONS.map(function (n) { return PREFIX + n; }));

// TRAP ONE (ME): the same file answers to a different registry key in the workshop ("worldwright-studio/…") than in an installed game ("mods/worldwright-studio/…"). Probe, most-qualified first, and use the one that reads back — never one hardcoded home.
const HOMES = ["mods/worldwright-studio/", "scripts/mods/worldwright-studio/", "worldwright-studio/", "scripts/worldwright-studio/", ""];

// --------------------------------------------------------------------------------------------- reading the REAL shelf (pure — same functions serve the panel's preview and the ear's advance) ---------------------------------------------------------------------------------------------

export function S(v) {
  return String(v === undefined || v === null ? "" : v);
}

export function bookIds(ui) {
  const rows = ((ui && ui.library) || {}).books || [];
  const out = [];
  for (let i = 0; i < rows.length; i++) if (rows[i] && rows[i].id) out.push(S(rows[i].id));
  return out;
}

export function cardsOf(ui) {
  return (ui && ui.cards) || {};
}

export function cardIds(ui) {
  const rows = cardsOf(ui).list || [];
  const out = [];
  for (let i = 0; i < rows.length; i++) if (rows[i] && rows[i].id) out.push(S(rows[i].id));
  return out;
}

export function folderRows(ui) {
  return cardsOf(ui).folders || [];
}

export function statsOf(ui) {
  const s = (ui && ui.bookStats) || {};
  return { words: Number(s.words || 0), pages: Number(s.pages || 0), cards: Number(s.cards || 0) };
}

// Every "#[ … ]" token the seat currently has text for: the open card's loaded pages, the page
//   doc under the editor, and the card's own summary. Real prose only — nothing invented.
export function tokenCount(ui) {
  const c = cardsOf(ui);
  const bits = [];
  const push = (rows) => {
    for (let i = 0; i < (rows || []).length; i++) {
      const p = rows[i] || {};
      bits.push(S(p.content), S(p.header), S(p.footer));
    }
  };
  push(c.pages);
  push(((c.pageDoc || {}).pages) || []);
  const doc = (c.pageDoc || {}).page || null;
  if (doc) bits.push(S(doc.content), S(doc.header), S(doc.footer));
  if (c.card) bits.push(S(c.card.summary));
  const secs = ((c.meta || {}).sections) || [];
  for (let i = 0; i < secs.length; i++) bits.push(S((secs[i] || {}).content));
  let n = 0;
  const hay = bits.join("\n");
  let at = hay.indexOf("#[");
  while (at >= 0) {
    n += 1;
    at = hay.indexOf("#[", at + 2);
  }
  return n;
}


// The baseline a step is measured against — taken the moment the step arms, so "a NEW book row"
//   means new since the author read the box, on a shelf that may already be full of their work.
export function baseOf(ui) {
  const c = cardsOf(ui);
  const st = statsOf(ui);
  return {
    bookIds: bookIds(ui),
    bookId: S(c.bookId),
    cardIds: cardIds(ui),
    words: st.words,
    pages: st.pages,
    tokens: tokenCount(ui),
  };
}

export function grew(list, was) {
  const had = {};
  for (let i = 0; i < (was || []).length; i++) had[was[i]] = true;
  for (let i = 0; i < (list || []).length; i++) if (!had[list[i]]) return true;
  return false;
}

// --------------------------------------------------------------------------------------------- the boxes — the old primer's teaching, reshaped so the author practises on their own shelf.

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Worldwright Studio",
    body:
      "Welcome to your writing and worldbuilding desk. Books hold folders and cards; cards hold metadata and pages. The first stops use your own shelf, so anything you make stays yours. Later stops introduce optional music and scene tools. Fold this box to work, then reopen it; Next moves on without requiring you to try a tool.",
  },
  {
    id: "book",
    title: "Make a book",
    body:
      "Your shelf is on the left. Press ＋ to add a book; double-tap its name to rename it. The shelf also holds Search, metadata controls and Trash. Drag either divider to make room: metadata expands when you pull its left edge left. Focus a divider and use the arrow keys if you prefer.",
    ask: "watching your shelf for a new book",
    won: "there it is — a real row in your database, not a demonstration.",
    watch: (ui, base) => grew(bookIds(ui), base.bookIds),
  },
  {
    id: "open",
    title: "Open it",
    body:
      "Tap a book once to open it in the middle pane. The middle is where a book's contents live — folders first, then cards — with the trail along the top telling you how deep you are. The footer keeps that book's vitals: cards, words, pages.",
    ask: "watching for a book open in the middle pane",
    won: "the middle pane is your book now.",
    watch: (ui, base) => {
      const c = cardsOf(ui);
      return !!S(c.bookId) && c.loaded !== false && S(c.bookId) !== S(base.bookId);
    },
  },
  {
    id: "card",
    title: "Make a card",
    body:
      "A card is one person, place, scene, chapter or score. Press ＋ New Card. Tap its tile to select it and see metadata; right-click or hold to edit its summary, status, sections and tags. Double-tap opens its pages. Keep related cards in a folder, or stack related versions.",
    ask: "watching this book for a new card",
    won: "one real card, yours.",
    watch: (ui, base) => S(cardsOf(ui).bookId) === S(base.bookId) && grew(cardIds(ui), base.cardIds),
  },
  {
    id: "file",
    title: "File it",
    body:
      "Books hold folders as well as cards, as deep as you care to go. Make one with the ＋ New Folder tile beside New Card, then drag your card onto it — the folder takes the card and its count goes up. The trail at the top walks you back out, and dragging onto a trail step files it there.",
    ask: "watching for a folder with something in it",
    won: "filed — that folder is a real row too.",
    watch: (ui) => {
      const rows = folderRows(ui);
      for (let i = 0; i < rows.length; i++) {
        const f = rows[i] || {};
        if (Number(((f.childCounts || {}).cards) || 0) > 0) return true;
      }
      return ((cardsOf(ui).folderPath) || []).length > 0 && cardIds(ui).length > 0;
    },
  },
  {
    id: "page",
    title: "Write a page",
    body:
      "Double-tap your card to open its pages. Tap the header, body or footer to edit; leave the zone to render its Markdown and tags. Save keeps the edit. Paper has real line and width limits: use ＋ New Page, not an overflowing sheet. Page metadata chooses paper size. Codex defaults to A3; Piano Paper is landscape A3, footerless, with four grand-staff systems.",
    ask: "watching this book's word count",
    won: "saved — that word count in the footer is reading your own prose.",
    watch: (ui, base) => {
      if (S(cardsOf(ui).bookId) !== S(base.bookId)) return false;
      const st = statsOf(ui);
      return st.words > base.words || st.pages > base.pages;
    },
  },
  {
    id: "reference",
    title: "Point at something",
    body:
      "Write #[card-id] to refer to another card; the rendered label follows its name. Type #[ to choose a reference, or ask Savi to insert one. Tags also cover counts, dates, assets, sound and scene directions. Docs ▸ References & Tags has the syntax. A missing target is a reference to repair, not a new book.",
    ask: "watching your prose for a #[ … ] token",
    won: "a live reference — rename that card and this sentence follows it.",
    watch: (ui, base) => tokenCount(ui) > base.tokens,
  },
  {
    id: "search",
    title: "Search",
    body:
      "The Search… box over your books searches the text of your cards — names, summaries, sections and the pages under them — and the middle pane turns into results as you type. Edit ▸ Search… opens the full window, where you can narrow to one book or one folder; Edit ▸ Find & Replace… changes the words it finds.",
    ask: "watching for a search over your own text",
    won: "your own words, found.",
    watch: (ui) => {
      const s = cardsOf(ui).search || {};
      const w = (ui && ui.searchWin) || {};
      const live = S(s.query).trim() !== "" && (((s.results || []).length > 0) || Number(s.count || 0) > 0 || s.open === true);
      return live || (w.ran === true && S(w.query).trim() !== "");
    },
  },
  {
    id: "keep",
    title: "Keep it",
    body:
      "Save commits a page or piano draft; a live preview does not. When leaving an unsaved editor, choose Save, Discard or Cancel in the in-app prompt. Undo and Redo handle recent changes; Trash holds deletions until emptied. File ▸ Import and Export move documents, not a full database backup. Export before a major rewrite.",
  },
  {
    id: "piano",
    title: "Play a page",
    body:
      "Optional: open or create a score card in Sound studio ▸ Piano Rolls. Open a page, then use Piano Roll in its metadata; this edits that page, not a separate song. Draw notes, drag to move, and pull a note’s right edge to resize. Scroll / pan moves the view without drawing. Preview follows time horizontally; your pitch scroll stays yours. Save writes the page-bound drafts.",
  },
  {
    id: "clips",
    title: "Choose an instrument",
    body:
      "Optional: piano, bell and synth are built in. In Clips, upload audio or paste its CDN reference. Choose SFX for original-pitch sounds, or Pitched sample for a guitar or other recorded note; set its recorded MIDI pitch (C4 = 60). Set trim, gain and looping, then Apply to track and Save. Save updates that matching track across numbered score pages. Only use recordings you may use.",
  },
  {
    id: "render",
    title: "Keep the song as audio",
    body:
      "Tempo, Fade and Trigger live in the first page header and apply across the score. Source tags can also render as turnable notation sheets. Save, then Render WAV reads every saved numbered page and mixes piano, synth and custom clips. Play file previews the recording; Download WAV saves it to your device; Copy sound tag reuses it. Render again after edits. Event-triggered notes need fixed timing before rendering.",
  },
  {
    id: "scenes",
    title: "Build a scene from cards",
    body:
      "Optional: designate a folder for cinematic or level work, then Compile to inspect its plan and missing dependencies. Shoot stages written sets and timed directions; it is separate from Render WAV. Cue ▸ Copy card link reuses a saved score in a scene. Supported Mods explains Cinema, Assets, Film and Atmosphere. Missing partners never stop writing or local piano preview. Asset Studio owns posing and keyframes; manuscript pose directives are reference-only.",
  },
  {
    id: "rest",
    title: "The rest of the room",
    body:
      "Codex is the read-only plan; Research holds prose; Sound studio holds scores and sounds; Asset Studio holds models, poses, sets and textures. Co-op ▸ Allow & Deny controls access to your shelf; other authors start read-only. Preferences holds appearance and paper settings. The bottom-right button folds the desk into a draggable notepad. Docs ▸ Readme stays available. Done removes this one-run primer; it cannot replay.",
  },
];

const LAST = STEPS.length - 1;
const VERSION = 2;
const LEGACY_IDS = ["welcome","book","open","card","file","page","reference","search","keep","rest"];

export function clampStep(n) {
  const i = Math.floor(Number(n) || 0);
  return i < 0 ? 0 : i > LAST ? LAST : i;
}

export function normalize(p) {
  const raw = p && typeof p === "object" ? p : {};
  // Stable step IDs keep an in-progress tour at its old lesson after new stops are inserted.
  const id = raw.stepId || (raw.version !== VERSION ? LEGACY_IDS[Math.floor(Number(raw.step) || 0)] : null);
  const found = id ? STEPS.findIndex(step => step.id === id) : -1;
  const step = found >= 0 ? found : clampStep(raw.step);
  return {
    cleanup: raw.cleanup || null,
    version: VERSION,
    stepId: STEPS[step].id,
    active: raw.active !== false && raw.burned !== true,
    burned: raw.burned === true,
    step: step,
    folded: raw.folded === true,
    armedTrue: raw.armedTrue === true,
    holdT: Number(raw.holdT || 0),
    base: raw.base && typeof raw.base === "object" ? raw.base : null,
  };
}

export function watchNow(step, ui, base) {
  if (!step || typeof step.watch !== "function") return false;
  try {
    return !!step.watch(ui || {}, base || baseOf(ui || {}));
  } catch (e) {
    return false;
  }
}

// --------------------------------------------------------------------------------------------- THE BOX (the tab panel). Pure render — every value comes off published state. ---------------------------------------------------------------------------------------------

export function E(s) {
  return S(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// The app's palette lives on #sb-app and cannot reach a second panel, so the box carries its own copy of Slate and prefers the author's LIVE theme when the app has published one. (Chrome floor values read off ui.js CHROME_FALLBACK.)
const SLATE = {
  ink: "oklch(0.88 0.012 85)",
  inkDim: "oklch(0.66 0.012 80)",
  line: "oklch(0.32 0.010 70)",
  panel: "oklch(0.235 0.008 70)",
  panel2: "oklch(0.255 0.009 72)",
  hover: "oklch(0.30 0.012 72)",
  accent: "oklch(0.78 0.105 68)",
  ok: "oklch(0.76 0.110 148)",
};

export function palette(ui) {
  const c = ((ui && ui.theme) || {}).chrome || {};
  return {
    ink: S(c.ink) || SLATE.ink,
    inkDim: S(c.inkDim) || SLATE.inkDim,
    line: S(c.line) || SLATE.line,
    panel: S(c.panel) || SLATE.panel,
    panel2: S(c.panel2) || SLATE.panel2,
    hover: S(c.hover) || SLATE.hover,
    accent: S(c.accent) || SLATE.accent,
    ok: S(c.ok) || SLATE.ok,
  };
}

export function fontScale(ui) {
  const n = Number((ui || {}).fontScale);
  return n >= 0.5 && n <= 2 ? n : 1;
}

// ME: z-index 9500 — over the app's block veil (9000) and any leftover tour box (8000), under the
//   drag ghost (99999) so a card being carried still reads on top of everything.
export function styles(pal, fs) {
  return `<style>
  #cbp-box, #cbp-box * { box-sizing: border-box; }
  #cbp-box {
    position: fixed; z-index: 9500; pointer-events: none;
    left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(420px, calc(100vw - 32px));
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: calc(12.5px * ${fs});
    color: ${pal.ink};
  }
  #cbp-box.folded { top: auto; bottom: 18px; transform: translate(-50%, 0); width: auto; }
  /* the box itself is the only thing that takes a pointer — the real app stays clickable */
  #cbp-box .cbp-card, #cbp-box .cbp-pill { pointer-events: auto; }
  #cbp-box .cbp-card {
    display: flex; flex-direction: column; gap: 8px; padding: 13px 15px 11px;
    background: ${pal.panel}; border: 1px solid ${pal.accent}; border-radius: 2px;
    box-shadow: 0 22px 56px rgba(0,0,0,0.55);
    max-height: min(74vh, 560px);
  }
  #cbp-box .cbp-head { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
  #cbp-box .cbp-kick {
    font-size: calc(9.5px * ${fs}); letter-spacing: 0.14em; text-transform: uppercase; color: ${pal.accent};
  }
  #cbp-box .cbp-grow { flex: 1 1 auto; }
  #cbp-box .cbp-count { font-size: calc(10.5px * ${fs}); color: ${pal.inkDim}; }
  #cbp-box .cbp-title { font-size: calc(15px * ${fs}); font-weight: 600; letter-spacing: 0.2px; flex: 0 0 auto; }
  #cbp-box .cbp-body {
    flex: 1 1 auto; overflow: auto; line-height: 1.55; color: ${pal.ink};
  }
  #cbp-box .cbp-watch {
    display: flex; align-items: center; gap: 7px; flex: 0 0 auto;
    padding: 6px 8px; border: 1px solid ${pal.line}; border-radius: 2px;
    background: ${pal.panel2}; color: ${pal.inkDim}; font-size: calc(11px * ${fs});
  }
  #cbp-box .cbp-watch.on { border-color: ${pal.ok}; color: ${pal.ink}; }
  #cbp-box .cbp-eye { width: 7px; height: 7px; border-radius: 50%; background: ${pal.accent}; flex: 0 0 auto; animation: cbp-pulse 1.4s ease-in-out infinite; }
  #cbp-box .cbp-watch.on .cbp-eye { background: ${pal.ok}; animation: none; }
  @keyframes cbp-pulse { 0%,100% { opacity: 0.35 } 50% { opacity: 1 } }
  #cbp-box .cbp-dots { display: flex; gap: 4px; flex-wrap: wrap; flex: 0 0 auto; }
  #cbp-box .cbp-dot { width: 5px; height: 5px; border-radius: 50%; background: ${pal.line}; }
  #cbp-box .cbp-dot.on { background: ${pal.accent}; }
  #cbp-box .cbp-dot.done { background: ${pal.ok}; }
  #cbp-box .cbp-foot { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; margin-top: 2px; }
  #cbp-box button {
    cursor: pointer; font: inherit; font-size: calc(12px * ${fs}); min-height: 34px; padding: 5px 14px;
    background: ${pal.panel2}; color: ${pal.ink}; border: 1px solid ${pal.line}; border-radius: 2px;
  }
  #cbp-box button:hover { background: ${pal.hover}; }
  #cbp-box button.go { background: ${pal.accent}; border-color: ${pal.accent}; color: ${pal.panel}; font-weight: 600; min-width: 92px; }
  #cbp-box button.quiet { background: transparent; border-color: transparent; color: ${pal.inkDim}; padding: 5px 8px; }
  #cbp-box button.quiet:hover { color: ${pal.ink}; background: transparent; text-decoration: underline; }
  #cbp-box .cbp-pill {
    display: flex; align-items: center; gap: 9px; padding: 6px 8px 6px 12px;
    background: ${pal.panel}; border: 1px solid ${pal.accent}; border-radius: 2px;
    box-shadow: 0 14px 34px rgba(0,0,0,0.45); font-size: calc(11.5px * ${fs}); white-space: nowrap;
  }
  #cbp-box .cbp-pill .cbp-line { color: ${pal.inkDim}; }
  #cbp-box .cbp-pill .cbp-line b { color: ${pal.ink}; font-weight: 600; }
  @media(pointer:coarse){#cbp-box button{min-height:44px;min-width:44px;}}
  @media(max-width:620px){#cbp-box.folded{width:calc(100vw - 80px);left:calc(50% - 24px);}#cbp-box .cbp-pill{white-space:normal;}#cbp-box .cbp-pill .cbp-line{min-width:0;}}
  </style>`;
}

export function dots(i) {
  const out = [];
  for (let n = 0; n <= LAST; n++) out.push(`<i class="cbp-dot${n === i ? " on" : n < i ? " done" : ""}"></i>`);
  return out.join("");
}

// THE COMPOSER — the same box, byte for byte, now returned as a string the ear publishes into its overlay row instead of drawn by a tab render. hotIn is handed in by the caller that just measured the watcher (the update loop already has it); otherwise it is measured here.
export function boxHtml(ui, p, hotIn) {
  const i = p.step;
  const step = STEPS[i];
  const pal = palette(ui);
  const fs = fontScale(ui);
  const hot = hotIn === undefined ? watchNow(step, ui, p.base) : !!hotIn;
  const asks = typeof step.watch === "function";

  // FOLDED (ME): his "gets out of the way" — one strip at the foot of the screen carrying the
  //   step and whether its watcher has seen the real thing yet.
  if (p.folded) {
    return `${styles(pal, fs)}
  <div id="cbp-box" class="folded" data-interactive>
    <div class="cbp-pill">
      <span class="cbp-eye${hot ? "" : ""}"></span>
      <span class="cbp-line"><b>${E(step.title)}</b> · ${i + 1} of ${STEPS.length}${asks ? (hot ? " · ✓ done" : " · " + E(step.ask || "watching")) : ""}</span>
      <button data-interactive onclick="sendAction('${ACT_FOLD}', { folded: false })">Open</button>
    </div>
  </div>`;
  }

  const line = asks
    ? `<div class="cbp-watch${hot ? " on" : ""}"><span class="cbp-eye"></span><span>${hot ? "✓ " + E(step.won || "done") : E(step.ask || "watching")}</span></div>`
    : "";

  return `${styles(pal, fs)}
  <div id="cbp-box" data-interactive>
    <div class="cbp-card" role="dialog">
      <div class="cbp-head">
        <span class="cbp-kick">Primer</span>
        <span class="cbp-grow"></span>
        <span class="cbp-count">${i + 1} of ${STEPS.length}</span>
        <button class="quiet" data-interactive title="Fold the box out of the way"
          onclick="sendAction('${ACT_FOLD}', { folded: true })">Fold ⌄</button>
      </div>
      <div class="cbp-title">${E(step.title)}</div>
      <div class="cbp-body">${E(step.body)}</div>
      ${line}
      <div class="cbp-dots">${dots(i)}</div>
      <div class="cbp-foot">
        ${i < LAST ? `<button class="quiet" data-interactive title="Skip to the last primer page"
          onclick="sendAction('${ACT_SKIP}', {})">Skip</button>` : ""}
        <span class="cbp-grow"></span>
        ${i > 0 ? `<button data-interactive onclick="sendAction('${ACT_BACK}', {})">Back</button>` : ""}
        <button class="go" data-interactive onclick="sendAction('${ACT_NEXT}', {})">${i >= LAST ? "Done" : i === 0 ? "Start" : "Next"}</button>
      </div>
    </div>
  </div>`;
}

// The tab render is no longer the surface. This export stays as an inert husk so that an older install of this file — one whose onSpawn had registered a "Primer" tab — draws nothing rather than throwing if that stale tab entry is still in a room's spec. Named on purpose: the behavior-side parser refuses an anonymous function statement.
export default function primerPanel() {
  return "";
}

// overlays as one row, id "primer". TRANSITIONS ONLY: every caller below is one (arm, step change, watcher flip, fold/unfold, burn), and the compare against the row already there is what keeps an idle tick silent.

export function rowsOf(st) {
  const rows = (st || {}).overlays;
  return Array.isArray(rows) ? rows : [];
}

export function rowHtmlOf(rows, id) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r && typeof r === "object" && S(r.id) === id) return S(r.html);
  }
  return "";
}

// Read-modify-write of the shared array: every other publisher's row rides through untouched, mine
//   is replaced where it already sits (order kept) or appended once, and an empty html drops it.
export function withRow(rows, id, html) {
  const out = [];
  let placed = false;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || typeof r !== "object") { out.push(r); continue; }
    if (S(r.id) === id) {
      if (html) {
        out.push({ id: id, html: html });
        placed = true;
      }
      continue;
    }
    out.push(r);
  }
  if (html && !placed) out.push({ id: id, html: html });
  return out;
}

// pIn: the primer object the caller just wrote, so an arm publishes the box it armed rather than
//   whatever a re-read happens to hand back. Returns true only when it actually wrote.
export function publish(api, pIn, hotIn) {
  const st = api.getState() || {};
  const p = pIn || normalize(st.primer);
  const rows = rowsOf(st);
  const html = p.active && !p.burned ? boxHtml(st.ui || {}, p, hotIn) : "";
  if (rowHtmlOf(rows, ROW) === html) return false; // nothing moved — this tick writes nothing
  api.patchState({ overlays: withRow(rows, ROW, html) });
  return true;
}

// --------------------------------------------------------------------------------------------- THE EAR (godMode.behavior). Watches the real state, moves the box, and burns. ---------------------------------------------------------------------------------------------

export const updateSchedule = { every: { seconds: 0.5 } };

// ME: how long a freshly-satisfied watcher holds before the box moves on — long enough that the
//   author sees the tick land against what they just did.
const HOLD_SECONDS = 1.2;

let retrySeconds = 0;

export function homeOf(api) { return cleanupHome(api); }

export function selfRef(api) {
  return homeOf(api) + FILE;
}

// TRAP TWO (ME): the app is itself a god tab. This tab is registered with a mod-shaped id when the file lives under mods/ — the engine only hands a panel the mod's "{mod}:" input prefix when the tab id reads "{modName}#{panelId}", and the mod's inputs are namespaced post-install.
export function tabId(api) {
  return homeOf(api).indexOf("mods/") >= 0 ? "worldwright-studio#primer" : "codexprimer";
}

export function readPrimer(api) {
  return normalize((api.getState() || {}).primer);
}

export function writePrimer(api, patch) {
  const cur = readPrimer(api);
  api.patchState({ primer: Object.assign({}, cur, patch || {}) });
}

// Arm a step: take the baseline off the REAL state now, and note whether the thing it asks for is already true here (an already-true box never auto-advances — the author presses Next, so the primer can't sprint past a stop on work they did last week).
export function go(api, index) {
  const st = api.getState() || {};
  const ui = st.ui || {};
  const i = clampStep(index);
  const base = baseOf(ui);
  const armedTrue = watchNow(STEPS[i], ui, base);
  const next = Object.assign({}, normalize(st.primer), {
    active: true,
    step: i,
    stepId: STEPS[i].id,
    version: VERSION,
    base: base,
    armedTrue: armedTrue,
    holdT: 0,
  });
  api.patchState({ primer: next });
  // ARM is a transition: the new box publishes off the object just written, not off a re-read.
  publish(api, normalize(next), armedTrue);
}

export function onSpawn(api) {
  try {
    const home = homeOf(api), p = (api.getState() || {}).primer;
    if (completed(api, home) || (p && (p.burned || (p.active === false && !p.cleanup?.checkOnly)))) { close(api); return; }
    if (p?.cleanup?.checkOnly) api.patchState({primer: {...p, active:true, cleanup:null}});
  } catch (e) { failure(api, e, undefined, true); return; }
  // NO TAB REGISTRATION (his ruling tonight).
  try {
    const actions = {};
    for (let i = 0; i < SPELLINGS.length; i++) actions[SPELLINGS[i]] = {};
    api.patchInputs({ actions: actions });
  } catch (e) {
    try { api.log("[primer] actions could not be declared: " + S((e && e.message) || e)); } catch (err) {}
  }
  // ENTRY (ME) — there is no button to press anymore, so the primer arms itself: a seat with no
  //   state.primer is a first run and gets box one. A burned or already-run primer carries its key
  //   and never comes back.
  const cur = (api.getState() || {}).primer;
  if (!cur || typeof cur !== "object") {
    go(api, 0);
    return;
  }
  // A seat that reloaded mid-run: put the box back exactly where the author left it.
  publish(api);
}

export function onInput(api, input) {
  const acts = (input && input.actions) || {};
  const data = (input && input.actionData) || {};
  // Both spellings answer (TRAP TWO): bare in the workshop, "worldwright-studio:"-prefixed in installs.
  const a = {};
  const d = {};
  for (let i = 0; i < ACTIONS.length; i++) {
    const n = ACTIONS[i];
    const scoped = PREFIX + n;
    const pressed = (input && input.pressed) || {};
    const released = (input && input.released) || {};
    // Remain self-contained when this primer burns. A payload is a UI delivery,
    // even when 6.0 drops its pressed flag; an explicit release never advances it.
    const delivered = (Object.prototype.hasOwnProperty.call(data, n) && !released[n]) ||
      (Object.prototype.hasOwnProperty.call(data, scoped) && !released[scoped]);
    a[n] = acts[n] || acts[scoped] || pressed[n] || pressed[scoped] || delivered;
    d[n] = data[n] !== undefined ? data[n] : data[scoped];
  }
  if (!a[ACT_NEXT] && !a[ACT_BACK] && !a[ACT_SKIP] && !a[ACT_FOLD]) return;
  const p = readPrimer(api);
  if (p.burned || !p.active) { close(api); return; }

  if (a[ACT_FOLD]) {
    const want = d[ACT_FOLD] && typeof d[ACT_FOLD] === "object" ? d[ACT_FOLD].folded : undefined;
    writePrimer(api, { folded: want === undefined ? !p.folded : !!want });
  }
  if (a[ACT_BACK]) go(api, p.step - 1);
  if (a[ACT_SKIP]) {
    // The old primer's law, kept: skip lands on the last box rather than out the door — nobody
    //   leaves without being shown where the rest of the room is.
    if (p.step >= LAST) close(api);
    else go(api, LAST);
  }
  if (a[ACT_NEXT]) {
    if (p.step >= LAST) close(api);
    else go(api, p.step + 1);
  }
  // fold/unfold is a transition of its own; go() already published the ones that moved a step, and
  //   the compare inside publish makes the second call on those paths a no-op.
  if (!readPrimer(api).burned) publish(api);
}

export function update(api, dt) {
  const st = api.getState() || {};
  const p = normalize(st.primer);
  if (p.cleanup?.checkOnly) {
    retrySeconds -= Number(dt) || 0;
    if (retrySeconds <= 0) { retrySeconds = 10; onSpawn(api); }
    return;
  }
  if (!p.active || p.burned) {
    if (p.cleanup && p.cleanup.pending === false) return;
    retrySeconds -= Number(dt) || 0;
    if (retrySeconds <= 0) close(api);
    return;
  }
  const step = STEPS[p.step];
  const ui = st.ui || {};
  const base = p.base || baseOf(ui);
  const now = typeof step.watch === "function" ? watchNow(step, ui, base) : false;
  // The watcher flip — the tick appearing or vanishing — is the transition this loop owns. publish
  //   compares before it writes, so a tick where nothing moved writes nothing at all.
  publish(api, p, now);
  if (typeof step.watch !== "function") return;
  if (!now) {
    if (p.holdT > 0) writePrimer(api, { holdT: 0 });
    return;
  }
  // Already true when this box armed: the tick shows, the box waits for Next.
  if (p.armedTrue) return;
  const held = p.holdT + (Number(dt) || 0);
  if (held < HOLD_SECONDS) {
    writePrimer(api, { holdT: held });
    return;
  }
  if (p.step >= LAST) return;
  go(api, p.step + 1);
}

// Seat completion suppresses the lesson immediately. The file receipt and deletion
// are the permanent per-world burn; no package source is stubbed or pre-completed.
export function close(api) {
  retrySeconds = 10;
  try { return burn(api, homeOf(api)); }
  catch (e) { failure(api, e); return false; }
}
