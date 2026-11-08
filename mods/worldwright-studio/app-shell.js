const EXPORT_POLICY=require('lib/document-export-policy.js');
const DOCUMENT_EXPORT=require('lib/document-export.js');
const ARRANGEMENT=require('lib/arrangement.js');
const EDITOR_CHOICE=require('lib/editor-registry.js');
const EDITOR_SESSION=require('lib/editor-session.js');
const STUDIOPROJECTS=require('lib/studio-projects.js');
const WORKBENCH=require("lib/workbench.js");
const PAPER_FORMAT=require("lib/paper-format.js");
const PAGE_ROLL=require("lib/page-roll.js");
const PIANO_EDITOR = require("lib/roll-editor.js");
const UIINPUT = require("lib/ui-input.js");
// Worldwright session state and action routing on the god-mode seat. Cards open through saved editor metadata; the renderer reads state.ui.

const THEME = require("lib/data/ui-theme.yml");
const MODS = require("lib/ui-mods.js");
const LIB = require("lib/library.js");
const QUIET = require("lib/ui-quiet.js");
const PROJECTS = require("lib/projects.js");
const SHELFACCESS = require("lib/shelfaccess.js");
const ROWS = require("lib/game-owner.js");
const FENCE = require("lib/writefence.js");
const PAGELOCK = require("lib/pagelock.js");
// Book revision helpers; idle polling is disabled.
const BOOKREV = require("lib/bookrev.js");
const CONFIG = require("lib/config.js");
const SCHEMA = require("lib/schema.js");
const STORE = require("lib/store.js");
// The id vocabulary — SENTINELS/isSentinel, so the pinned builtin books can be refused by name
// rather than by prefix. A leaf module: it requires nothing, so this can never make a cycle.
const IDS = require("lib/ids.js");
const RESEARCH = require("lib/research.js");
const CARDS = require("lib/cards.js");
// THE COMPILE ORCHESTRATOR — the plan and the landing both come from here; this file never speaks to
// a lane or a mod itself, and never writes compile_state of its own (his one-shape-per-mod law).
const COMPILE = require("lib/compile.js");
// his batching law: no query of our own around SHOOT — shoot.js batches its reads, one map load per press.
const SHOOT = require("lib/shoot.js");
const KITCHEN = require("lib/atmokitchen.js");
const BUILDSTATE = require("lib/buildstate.js");
const PHASELOCK = require("lib/phaselock.js");
const CARDIMAGE = require("lib/cardimage.js");
const GRAPH = require("lib/graph.js");
const JOURNAL = require("lib/journal.js");
const CARDJSON = require("lib/cardjson.js");
// his ask: a book leaves as an archive of files, not as one long file.
const CARDBUNDLE = require("lib/cardbundle.js");
// THE ONE DESCENT every export walk shares — folders and cards in the cards pane's reading order.
const EXPORTWALK = require("lib/exportwalk.js");
const SECTIONS = require("lib/cardsections.js");
const CARDSUI = require("lib/ui-cards.js");
const PAGEUI = require("lib/ui-page.js");
const PL = require("lib/pagelayout.js");
const CHANGELOG = require("lib/changelog.js");
const PASTE = require("lib/paste.js");
const REFS = require("lib/refs.js");
const TAGDEFS = require("lib/tagdefs.js");
const REFPICK = require("lib/refpick.js");
const DOCSUI = require("lib/ui-docs.js");
const SFX = require("lib/sfx.js");

const FIND = require("lib/find.js");
const SEARCH = require("lib/search.js");
// his ruling: no merging, just support — the Asset Library mod's shelf is read-only.
const ASSETSHELF = require("lib/assetshelf.js");
const TRASH = require("lib/trash.js");
const IMPORT = require("lib/import.js");







const RECOVER = require("lib/recover.js");
const UNINSTALL = require("lib/uninstall.js");

const CUE_NOW = {
  select: "cards.select",
  openCard: "cards.select",
  open: "cards.open",
  openPages: "cards.open",
  searchOpen: "cards.open",
  stackOpen: "cards.stackOpen",
  cycle: "cards.stackFlick",
  pageGo: "pages.turn",
  sortMenu: "ui.buttonPress",
  moveTo: "ui.buttonPress",
  sort: "ui.buttonPress",
  sortDir: "ui.buttonPress",
  backToFolder: "ui.buttonPress",
  folderUp: "ui.buttonPress",
  folderOpen: "ui.buttonPress",
  renameStart: "ui.buttonPress",
  compileSet: "ui.buttonPress",
  searchClear: "ui.buttonPress",
  searchScope: "ui.buttonPress",
  trashOpen: "ui.windowOpen",
  insertTag: "ui.windowOpen",
  insertRef: "ui.windowOpen",
  pageDeleteAsk: "ui.windowOpen",
  trashClose: "ui.windowClose",
  editClose: "ui.windowClose",
  draftDiscard: "ui.windowClose",
  insertClose: "ui.windowClose",
  exportClose: "ui.windowClose",
  pageDeleteCancel: "ui.windowClose",
  clear: "ui.windowClose",
};
const CUE_DONE = {
  new: "cards.created",
  newFolder: "cards.created",
  newStack: "cards.created",
  duplicate: "cards.created",
  dupVersion: "cards.created",
  dupStack: "cards.created",
  trash: "cards.trashed",
  trashPurge: "cards.trashed",
  trashEmpty: "cards.trashed",
  pageDelete: "cards.trashed",
  trashRestore: "cards.restored",
  drop: "cards.drop",
  moveToFolder: "cards.drop",
  shiftLeft: "cards.drop",
  shiftRight: "cards.drop",
  shiftUp: "cards.drop",
  shiftDown: "cards.drop",
  pageMoveLeft: "cards.drop",
  pageMoveRight: "cards.drop",
  pageNew: "pages.created",
  pageDup: "pages.created",
  pageDupCard: "pages.created",
};
const CHROME_CUE = {
  uiMenuItem: "ui.menuItem",
  uiShell: "ui.buttonPress",
  uiNotepadPane: "ui.buttonPress",
  cfgTab: "ui.buttonPress",
  bookSelect: "ui.buttonPress",
  bookToggle: "ui.buttonPress",
  bookRenameStart: "ui.buttonPress",
  bookMeta: "ui.windowOpen",
  cfgOpen: "ui.windowOpen",
  docsOpen: "ui.windowOpen",
  cfgClose: "ui.windowClose",
  docsClose: "ui.windowClose",
  expClose: "ui.windowClose",
  bookAdd: "cards.created",
  // bookRemove is DELIBERATELY not here (2026-08-31): this map fires once per action RECEIPT, so the trash sound played on the ask and on the cancel as loudly as on the burn. The cue now rides the actual deletion inside the bookRemove branch; the ask/escalate stages ring windowOpen.
  recoverOpen: "ui.windowOpen",
  recoverClose: "ui.windowClose",
  recoverRescan: "ui.buttonPress",
  recoverAdopt: "cards.restored",
  recoverRebuild: "cards.restored",
  recoverSweep: "ui.buttonPress",
};
const CHROME_KEYS = Object.keys(CHROME_CUE);

const DOORBELL_JOKES = [
  "Deleting your files…",
  "Formatting drive C:…",
  "Selling your manuscript to a rival author…",
  "Feeding your drafts to the shredder…",
  "Replacing every noun with “moist”…",
  "Rearranging your chapters alphabetically…",
  "Emailing your first draft to your ex…",
  "Renaming every character Greg…",
  "Setting all cards to Archived…",
  "Telling your protagonist how it ends…",
  "Burning the manuscript for warmth…",
];
const DOORBELL_TRUTH = "Ringing Savi. She is on her way.";
const DOORBELL_BEAT = 3.5;

const NPBOX = Object.assign({ x: 132, y: 76 }, (THEME.layout && THEME.layout.notepad) || {});

const DEFAULT_UI = {
  door: { locked: false, booting: false, error: null, myRoom: null },
  shelf: { owner: "", mine: true, name: "", error: "", canWrite: true },
  menu: null,
  
  
  
  
  
  
  navWidth: THEME.layout.navWidth,
  metaWidth: THEME.layout.metaWidth,
  metaOpen: false,
  shell: "full",
  notepadPane: null,
  notepadBox: { x: NPBOX.x, y: NPBOX.y },
  search: "",
  savi: { awake: false, token: 0, line: "", ask: false, sent: false },
  theme: themeFrom(null),
  phase: null,
  // Seven keys the app writes but never declared (his sweep ruling, 2026-08-27 — finding 2). Each value is what a fresh seat already observes at boot, so no reader branches differently: save = paintSave's first paint off CHANGELOG.indicator(); edit = an empty changelog. // my call
  save: { state: "idle", savedAt: 0, error: "", unsaved: false },
  edit: { canUndo: false, canRedo: false, undoLabel: "", redoLabel: "" },
  bookStats: null,
  shootMin: null,
  coop: null,
  booting: false,
  library: {
    books: [],
    selected: null,
    openBook: null,
    metaFor: null,
    expanded: {},
    kids: {},
    renaming: null,
    confirmRemove: null,
    loaded: false,
    loading: false,
  },
  config: { open: false, tab: "user", user: null, room: null, remove: null },
  fontScale: 1,
  trash: { open: false, loading: false, items: [], bookName: "", error: "", now: 0 },
  recover: {
    open: false,
    loading: false,
    projects: [],
    books: [],
    content: [],
    confirm: null,
    notice: "",
    error: "",
  },
  
  
  exportWin: { open: false, loading: false, scope: "book", format: "text", text: "", addr: "", files: [], error: "" },
  
  findWin: {
    open: false,
    bookName: "",
    query: "",
    replacement: "",
    opts: {
      caseSensitive: false,
      wholeWord: false,
      regex: false,
      fields: { title: true, summary: true, section: true, page: true, tags: true },
    },
    running: false,
    ran: false,
    results: [],
    total: 0,
    cards: 0,
    locked: 0,
    truncated: false,
    confirm: false,
    notice: "",
    error: "",
  },
  searchWin: {
    open: false,
    stashed: false,
    query: "",
    scope: "all",
    matchCase: false,
    wholeWord: false,
    running: false,
    ran: false,
    groups: [],
    total: 0,
    hits: 0,
    shown: 0,
    page: 0,
    pages: 1,
    truncated: false,
    skipped: [],
    bookName: "",
    folderName: "",
    opened: null,
    error: "",
    minChars: SEARCH.MIN_CHARS,
    assets: [],
    atmos: [],
  },
  busy: {},
  // THE WHAT-CHANGED WINDOW's whole state. Written by this file and nowhere else (house law 7);
  // lib/ui-compile.js only reads it. plan is lib/compile.js's planShape, results its landShape.
  compile: { open: false, folderId: "", folderName: "", kind: "", plan: null, results: null, landing: false, error: "" },
  importWin: {
    open: false,
    loading: false,
    text: "",
    format: "auto",
    parsing: false,
    parsed: false,
    preview: null,
    mode: "new book",
    bookName: "",
    target: { bookId: "", bookName: "", folderId: "", folderName: "" },
    books: [],
    folders: [],
    confirm: false,
    running: false,
    notice: "",
    error: "",
    fileName: "",
    fileBusy: false,
  },
  clipboard: null,
  cards: {
    bookId: null,
    bookName: "",
    folderId: null,
    folderPath: [],
    folderTrail: [],
    folders: [],
    list: [],
    sort: { mode: "default", dir: "asc" },
    sortMenu: false,
    selected: null,
    menu: false,
    moveMenu: false,
    view: "folder",
    card: null,
    pages: [],
    stack: [],
    stackId: null,
    modal: null,
    draft: null,
    meta: null,
    metaLoading: false,
    // The folder pane's row — a selected FOLDER has no card bundle, so its own small pane reads this.
    folderMeta: null,
    // UNREAD — the dot's overlay: [{ id, folderId }] for this book's unread cards, read beside the tiles and stamped onto the tile rows (ui.js hands ui-cards a NAMED key set, so a new pane key would never arrive — the flag has to ride `list`).
    unread: [],
    moving: {},
    folderBusy: false,
    folderLoading: false,
    renaming: null,
    pageDoc: null,
    search: { query: "", scope: "book", loading: false, results: [], count: 0, open: false, error: "" },
    notice: "",
    error: "",
    loaded: false,
  },
};

// shell contract: every write that can move the shell ends here, so the three keys can never drift apart; ui.shell is one of exactly two words, anything else lands on 'full'.
export function shellSync(ui, next) {
  const want = next === undefined ? ui.shell : next;
  ui.shell = want === "notepad" ? "notepad" : "full";
  const pane = ui.notepadPane;
  ui.notepadPane = ui.shell === "notepad" && (pane === "nav" || pane === "meta") ? pane : null;
  ui.notepadBox = boxSane(ui.notepadBox);
  return ui;
}

export function boxSane(box) {
  const b = box && typeof box === "object" ? box : {};
  const one = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : d;
  };
  return { x: one(b.x, NPBOX.x), y: one(b.y, NPBOX.y) };
}

export function seatRow(objectApi) {
  try {
    const id = String(objectApi.id || "");
    const playerId = id.indexOf("god/") === 0 ? id.slice(4) : id;
    const players = objectApi.getPlayers() || [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i] || {};
      if (ROWS.rowId(p) === playerId) return p;
    }
  } catch (e) {
  }
  return null;
}

export function who(objectApi) {
  try {
    const direct = String(objectApi.getUsername() || "");
    if (direct) return direct;
  } catch (e) {
  }
  const row = seatRow(objectApi);
  return row ? ROWS.rowName(row) : "";
}

export function busyStart(objectApi, key, text) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  const busy = Object.assign({}, ui.busy || {});
  busy[String(key)] = String(text || "Working…");
  ui.busy = busy;
  objectApi.patchState({ ui });
  objectApi.runInSeconds(40, () => busyEnd(objectApi, key));
}

export function busyEnd(objectApi, key) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  const busy = Object.assign({}, ui.busy || {});
  busy[String(key)] = null;
  ui.busy = busy;
  objectApi.patchState({ ui });
}

export function busyClear(objectApi) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  const keys = Object.keys(ui.busy || {}).filter((k) => !!ui.busy[k]);
  if (!keys.length) return;
  const busy = Object.assign({}, ui.busy);
  for (const k of keys) busy[k] = null;
  ui.busy = busy;
  objectApi.patchState({ ui });
}

export function patchLibrary(objectApi, patch) {
  if (patch && "openBook" in patch && String(patch.openBook||"")!==String(openBookOf(objectApi)?.id||"")) leaveEditor(objectApi);
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.library = Object.assign({}, DEFAULT_UI.library, ui.library || {}, patch);
  objectApi.patchState({ ui });
  return ui;
}

export function myId(objectApi) {
  try {
    const direct = String(objectApi.userId || "");
    if (direct) return direct;
  } catch (e) {
  }
  const row = seatRow(objectApi);
  return row ? String(row.userId || "") : "";
}

export function amHost(objectApi) {
  const ui = objectApi.getState().ui || {};
  return !!((ui.room || {}).owner);
}

let SHELF_OWNER = "";

export async function shelfOwner(objectApi) {
  const guest = String(((objectApi.getState().ui || {}).shelf || {}).owner || "");
  if (guest) return guest;
  if (SHELF_OWNER) return SHELF_OWNER;
  SHELF_OWNER = String(myId(objectApi) || "");
  return SHELF_OWNER;
}

export function patchShelf(objectApi, patch) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.shelf = Object.assign({}, DEFAULT_UI.shelf, ui.shelf || {}, patch || {});
  objectApi.patchState({ ui });
  return ui.shelf;
}

export function patchDoorState(objectApi, patch) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.door = Object.assign({}, DEFAULT_UI.door, ui.door || {}, patch || {}, { locked: false });
  objectApi.patchState({ ui });
  return ui.door;
}

let REFRESH_IN_FLIGHT = null;
export async function refresh(objectApi, patch) {
  if (!REFRESH_IN_FLIGHT) {
    patchLibrary(objectApi, { loading: true });
    const pass = (async () => {
      try {
        const books = await LIB.list(objectApi, PROJECTS.PROJECT_ID);
        objectApi.log("[shelf] read " + (books || []).length + " book(s) for " + PROJECTS.PROJECT_ID);
        patchLibrary(objectApi, { books, loaded: true, loading: false });
        if (!openBookOf(objectApi)) await refreshBookStats(objectApi);
      } catch (e) { patchLibrary(objectApi, { loading: false }); throw e; }
    })();
    REFRESH_IN_FLIGHT = pass;
    pass.then(() => { if (REFRESH_IN_FLIGHT === pass) REFRESH_IN_FLIGHT = null; },
      () => { if (REFRESH_IN_FLIGHT === pass) REFRESH_IN_FLIGHT = null; });
  }
  await REFRESH_IN_FLIGHT;
  if (patch) patchLibrary(objectApi, patch);
}

// Appearance is read-only. Legacy preferences still render identically after an upgrade;
// no theme editor or preference-write route remains.
export function themeFrom(seatCfg) {
  const chromes = THEME.chrome || {};
  const papers = THEME.paper || {};
  const metas = THEME.themes || {};
  const base = String(THEME.defaultThemeId !== undefined ? THEME.defaultThemeId : "0");
  const raw = seatCfg && seatCfg.themeId !== undefined && seatCfg.themeId !== null ? String(seatCfg.themeId) : base;
  const wanted = raw === "" ? base : raw;
  const id = chromes[wanted] || papers[wanted] || metas[wanted] ? wanted : base;
  const adj = seatCfg && seatCfg.themeAdjustments && typeof seatCfg.themeAdjustments === "object" ? seatCfg.themeAdjustments : {};
  return {
    id: id,
    name: String((metas[id] && metas[id].name) || (papers[id] && papers[id].name) || "Theme " + id),
    chrome: Object.assign({}, chromes[base] || {}, chromes[id] || {}, adj.chrome && typeof adj.chrome === "object" ? adj.chrome : {}),
    paper: Object.assign({}, papers[base] || {}, papers[id] || {}, adj.paper && typeof adj.paper === "object" ? adj.paper : {}),
  };
}

const FONT_STEPS = [0.85, 1, 1.15, 1.3, 1.5];
export function fontScaleOf(value) {
  const n = Number(value);
  for (const s of FONT_STEPS) if (Math.abs(s - n) < 0.001) return s;
  return 1;
}

export function publishFontScale(objectApi, userCfg) {
  const now = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  now.fontScale = fontScaleOf(userCfg && userCfg.fontScale);
  objectApi.patchState({ ui: now });
}

// On-screen paper zoom mirror — same rails as CONFIG.clampUser("paperZoom").
export function paperZoomOf(value) {
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return 1;
  return Math.max(0.5, Math.min(3, Math.round(n * 100) / 100));
}

export async function loadConfig(objectApi, patch) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  const lib = Object.assign({}, DEFAULT_UI.library, ui.library || {});
  const user = await CONFIG.getUser(objectApi, myId(objectApi));
  const now = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  now.config = Object.assign({}, DEFAULT_UI.config, now.config || {}, { user, room: {} }, patch || {});
  now.theme = themeFrom(user);
  now.fontScale = fontScaleOf(user && user.fontScale);
  now.themeEdit = null; // retire an old open drawer without changing its saved appearance
  objectApi.patchState({ ui: now });
}

export function refreshDepthLabels(objectApi) {
  const book = openBookOf(objectApi);
  if (!book) return;
  CONFIG.resolveDepthLabels(objectApi, book.id, projectIdOf(objectApi), myId(objectApi))
    .then((r) => patchCards(objectApi, { depthLabels: (r && r.labels) || null }))
    .catch(() => {});
}

export function patchCards(objectApi, patch) {
  if(patch?.view && patch.view!=="page" && EDITOR_SESSION.state(objectApi).phase!=="closed" && (!objectApi.editorCurrent||objectApi.editorCurrent())) leaveEditor(objectApi);
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.cards = Object.assign({}, DEFAULT_UI.cards, ui.cards || {}, patch || {});
  if(patch?.view && patch.view!=="page")ui.cards.referenceTrail=[];
  objectApi.patchState({ ui });
  return ui.cards;
}

export function patchCardsAndPhase(objectApi, patch, phase) {
  if(patch?.view && patch.view!=="page" && EDITOR_SESSION.state(objectApi).phase!=="closed" && (!objectApi.editorCurrent||objectApi.editorCurrent())) leaveEditor(objectApi);
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.cards = Object.assign({}, DEFAULT_UI.cards, ui.cards || {}, patch || {});
  if(patch?.view && patch.view!=="page")ui.cards.referenceTrail=[];
  if (phase !== undefined) ui.phase = phase;
  objectApi.patchState({ ui });
  return ui.cards;
}

export async function phaseFor(objectApi, book) {
  try {
    const id = String((book && book.id) || "");
    if (!id || id !== BUILDSTATE.bookId()) return null;
    if (!PHASELOCK.installed(objectApi)) return null;
    const build = await BUILDSTATE.read(objectApi);
    return PHASELOCK.state(objectApi, build);
  } catch (e) {
    return null;
  }
}

export function cardsState(objectApi) {
  const ui = objectApi.getState().ui || {};
  return Object.assign({}, DEFAULT_UI.cards, ui.cards || {});
}

// his ask: the workspace folds to one chip while a staged clip waits (ui.shootMin).
export function setShootMin(objectApi, min) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.shootMin = min || null;
  objectApi.patchState({ ui });
}

// his ruling: the clip-ready chip goes away once the clip has played.
export function sweepStaleChip(objectApi) {
  const min = ((objectApi.getState() || {}).ui || {}).shootMin;
  if (!min || !min.playerId) return;
  const ps = objectApi.getObjectState(min.playerId) || {};
  const st = ps.sbStage;
  const tok = st && typeof st === "object" ? Number(st.token || 0) : 0;
  const waiting = tok && tok !== Number(ps.sbStageDone || 0);
  if (!waiting) setShootMin(objectApi, null);
}

export function openBookOf(objectApi) {
  const ui = objectApi.getState().ui || {};
  const lib = Object.assign({}, DEFAULT_UI.library, ui.library || {});
  const id = String(lib.openBook || "");
  if (!id || RESEARCH.isRetired(id)) return null;
  const pinned = RESEARCH.bookOf(id);
  if (pinned) return pinned;
  const book = (lib.books || []).find((b) => b.id === id);
  return book ? { id: book.id, name: book.name } : null;
}

export function surface(objectApi, e) {
  const msg = String((e && e.message) || e || "unknown failure");
  objectApi.log("[cards] " + msg);
  patchCards(objectApi, { error: msg });
  SFX.play(objectApi, "ui.error");
}

// his ruling: one project, always, and it is the game — no project, no book.
export function projectIdOf(objectApi) {
  return PROJECTS.PROJECT_ID;
}

// his rule: undo reverses my command only if nobody else has touched it since.

export function paintSave(objectApi, snap) {
  const live = snap || CHANGELOG.indicator();
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  const was = ui.save || {};
  const next = {
    state: String(live.state || "idle"),
    savedAt: Number(live.savedAt || 0),
    error: live.error ? String(live.error) : "",
    unsaved: !!live.unsaved,
  };
  if (was.state === next.state && Number(was.savedAt || 0) === next.savedAt && String(was.error || "") === next.error) {
    return;
  }
  ui.save = next;
  objectApi.patchState({ ui });
  if (next.state === "saved" && String(was.state || "") !== "saved") SFX.play(objectApi, "pages.saved");
}

export async function syncEdit(objectApi) {
  const projectId = projectIdOf(objectApi);
  const st = await CHANGELOG.status(objectApi, { projectId });
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.edit = {
    canUndo: !!st.canUndo,
    canRedo: !!st.canRedo,
    undoLabel: String(st.undoLabel || ""),
    redoLabel: String(st.redoLabel || ""),
  };
  ui.save = {
    state: String(st.state || "idle"),
    savedAt: Number(st.savedAt || 0),
    error: st.error ? String(st.error) : "",
    unsaved: !!st.unsaved,
  };
  objectApi.patchState({ ui });
  return ui.edit;
}

export async function editStep(objectApi, dir) {
  const projectId = projectIdOf(objectApi);
  const redo = dir === "redo";
  await JOURNAL.flush(objectApi);
  const res = redo
    ? await CHANGELOG.redo(objectApi, { projectId })
    : await CHANGELOG.undo(objectApi, { projectId });

  if (res && res.ok) {
    const what = CHANGELOG.describe((res.command || {}).type) || "the last change";
    await JOURNAL.flush(objectApi);
    await refreshCards(objectApi);
    await refresh(objectApi);
    patchCards(objectApi, { notice: (redo ? "Redid " : "Undid ") + what, error: "" });
    SFX.play(objectApi, redo ? "pages.redo" : "pages.undo");
  } else if (res && res.denied) {
    // His rule, in his words: someone else has been here since, so it does not come back.
    patchCards(objectApi, {
      error: "can't undo that — " + (res.touchedBy || "someone else") + " has changed it since",
      notice: "",
    });
    SFX.play(objectApi, "ui.error");
  } else if (res && res.reason === "busy") {
  } else {
    patchCards(objectApi, { notice: redo ? "nothing to redo" : "nothing to undo", error: "" });
  }
  await syncEdit(objectApi);
}

export async function cardBundle(objectApi, book, cardId) {
  const card = await CARDS.getCard(objectApi, book.id, cardId);
  if (!card) return null;
  const tags = await CARDS.listTags(objectApi, book.id, card.id);
  const sections = await CARDS.listSections(objectApi, book.id, card.id);
  const pages = await CARDS.listPages(objectApi, book.id, card.id);
  try {
    const marks = await CARDS.listAtmos(objectApi, book.id, card.id);
    const offer = !!KITCHEN.installed(objectApi);
    const presets = offer ? KITCHEN.presets() : [];
    const pick = String((cardsState(objectApi).modal || {}).atmoPick || "");
    for (let i = 0; i < sections.length; i++) {
      const set = String(marks.sections[sections[i].id] || "");
      sections[i].atmo = set;
      sections[i].atmoLabel = set ? KITCHEN.label(set) : "";
      sections[i].atmoOffer = offer;
      sections[i].atmoPresets = presets;
      sections[i].atmoPick = pick;
    }
  } catch (e) {
    objectApi.log("[cards] atmosphere marks unavailable: " + ((e && e.message) || e));
  }
  const members = await CARDS.listStack(objectApi, book.id, card.stackId);
  let backlinks = { sameBook: [], crossBook: [] };
  try {
    backlinks = await REFS.backlinks(objectApi, {
      projectId: projectIdOf(objectApi),
      bookId: book.id,
      cardId: card.id,
      primaryId: card.stackId,
    });
  } catch (e) {
    objectApi.log("[cards] backlinks unavailable: " + ((e && e.message) || e));
  }
  let dangling = [];
  try {
    const rep = await REFS.danglingRefs(objectApi, { projectId: projectIdOf(objectApi) });
    dangling = (rep.rows || []).filter((r) => String(r.fromId) === String(card.id));
  } catch (e) {
    objectApi.log("[cards] dangling report unavailable: " + ((e && e.message) || e));
  }
  let lineage = "";
  if (card.duplicatedFrom) {
    try {
      const row = await CARDS.nameOf(objectApi, card.duplicatedFrom);
      lineage = String((row && row.name) || card.duplicatedFrom || "");
    } catch (e) {
      lineage = card.duplicatedFrom;
    }
  }
  let image = NO_PICTURE;
  try {
    image = (await cardImageRow(objectApi, book.id, card.id)) || NO_PICTURE;
  } catch (e) {
    objectApi.log("[cards] picture unread for " + card.id + ": " + ((e && e.message) || e));
  }
  // COMPILE — read as an OVERLAY at render-prep time, never off the graph mirror: the mirror copies
  //   rows column for column and knows nothing of this column, so a mirrored read answers a stale 1.
  let compile = true;
  try {
    const flags = await CARDS.compileFlags(objectApi, book.id);
    compile = ((flags || {}).cards || {})[String(card.id)] !== false;
  } catch (e) {
    objectApi.log("[cards] compile flag unread for " + card.id + ": " + ((e && e.message) || e));
  }
  const st = cardsState(objectApi);
  return {
    card,
    compile,
    bookId: book.id,
    image,
    bookName: book.name,
    folderPath: st.folderPath || [],
    address: [book.name].concat(st.folderPath || [], [card.name]),
    tags,
    sections,
    pages,
    pageCount: pages.length,
    stack: { size: members.length, members, primaryId: card.stackId },
    backlinks,
    dangling,
    lineage,
  };
}

export async function loadKids(objectApi, nodeId, bookId) {
  const id = String(nodeId || "");
  if (!id) return;
  const bid = String(bookId || id);
  const answers = await Promise.all([
    CARDS.listFolders(objectApi, bid, id),
    CARDS.listFolder(objectApi, bid, id),
  ]);
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  const lib = Object.assign({}, DEFAULT_UI.library, ui.library || {});
  if (!(lib.expanded || {})[id]) return;
  const kids = Object.assign({}, lib.kids || {});
  kids[id] = (answers[0] || [])
    .map((f) => ({
      id: String(f.id),
      name: String(f.name || ""),
      isFolder: true,
      bookId: bid,
      counts: f.childCounts || { folders: 0, cards: 0 },
    }))
    .concat(
      (answers[1] || []).map((t) => ({
        id: String(t.id),
        name: String(t.name || ""),
        isStack: !!t.isStack,
        size: Number(t.stackSize || 1),
        bookId: bid,
      }))
    );
  patchLibrary(objectApi, { kids });
}

// Opening a card IS reading it: the column goes to 0 and the id leaves the overlay in the same
// beat, so the dot dies the moment he opens it — no folder reload needed.
export async function markCardRead(objectApi, bookId, cardId) {
  const id = String(cardId || "");
  const bid = String(bookId || "");
  if (!id || !bid) return;
  const st = cardsState(objectApi);
  const was = Array.isArray(st.unread) ? st.unread : [];
  if (was.some((r) => r && String(r.id) === id)) {
    const now = was.filter((r) => !(r && String(r.id) === id));
    patchCards(objectApi, {
      unread: now,
      list: stampUnread(
        (st.list || []).map((t) => (t && String(t.id) === id ? Object.assign({}, t, { unread: false }) : t)),
        now,
        st.folders || [],
        bid
      ),
    });
  }
  try {
    await CARDS.setCardRead(objectApi, bid, id);
  } catch (e) {
    objectApi.log("[cards] could not clear the unread mark on " + id + ": " + ((e && e.message) || e));
  }
}

// Ordinary pages open with metadata; piano pages start with the score alone.
// Decide after the mode read, rather than flashing an unrelated sidebar while it loads.
export function preparePageMeta(api,bookId,cardId){
  const ui=uiNow(api);ui.metaOpen=false;
  if(ui.notepadPane==="meta")ui.notepadPane=null;
  ui.cards={...ui.cards,meta:null,metaLoading:false,metaDeferred:cardId,metaEntry:{bookId,cardId}};
  shellSync(ui);api.patchState({ui});
}
export function pageMetaDefault(api,bookId,cardId,piano,force){
  const ui=uiNow(api),entry=(ui.cards||{}).metaEntry;
  if(!force&&(!entry||entry.bookId!==bookId||entry.cardId!==cardId))return;
  ui.metaOpen=!piano;if(piano&&ui.notepadPane==="meta")ui.notepadPane=null;
  ui.cards={...ui.cards,metaEntry:null,metaLoading:!piano,metaDeferred:piano?cardId:""};
  shellSync(ui);api.patchState({ui});
}
export function openMetaWithPage(api){const c=cardsState(api),b=openBookOf(api);if(b&&c.card)pageMetaDefault(api,b.id,c.card.id,false,true);}
export function requestPageMeta(api){
  const ui=uiNow(api),c=ui.cards||{};
  if(c.view!=="page"||!c.card||!c.pageDoc||c.metaLoading)return;
  if(!c.metaDeferred&&c.meta)return;
  const scoped=editorApi(api);
  patchCards(scoped,{metaLoading:true});
  loadMeta(scoped,c.card.id).catch(e=>{if(scoped.editorCurrent()){patchCards(scoped,{metaLoading:false,metaDeferred:c.card.id});surface(scoped,e);}});
}

// THE DOT'S OVERLAY, stamped onto the tile rows. Cards in the unread set get `unread`; a folder gets `unreadUnder` when ANY unread card sits anywhere beneath it — ancestors walked from the {id, folderId} rows up through the folder tree the pane already holds.
export function stampUnread(list, rows, folders, bookId) {
  const cards = {};
  const under = {};
  const parent = {};
  for (const f of folders || []) if (f && f.id) parent[String(f.id)] = String(f.folderId || bookId || "");
  for (const r of rows || []) {
    if (!r || !r.id) continue;
    cards[String(r.id)] = true;
    let at = String(r.folderId || "");
    for (let hop = 0; at && hop < 24; hop++) {
      if (under[at]) break;
      under[at] = true;
      at = parent[at] || "";
    }
  }
  return (list || []).map((t) => {
    if (!t || !t.id) return t;
    const id = String(t.id);
    if (t.isFolder) return under[id] ? Object.assign({}, t, { unreadUnder: true }) : t;
    return cards[id] ? Object.assign({}, t, { unread: true }) : t;
  });
}

export async function loadFolder(objectApi, patch, known) {
  if(objectApi.editorCurrent&&!objectApi.editorCurrent())return;
  if(patch?.view&&patch.view!=="page"&&EDITOR_SESSION.state(objectApi).phase!=="closed")leaveEditor(objectApi);
  objectApi=EDITOR_SESSION.scope(objectApi,EDITOR_SESSION.state(objectApi),true);
  JOURNAL.flush(objectApi).catch((e) => objectApi.log("[journal] nav flush: " + ((e && e.message) || e)));
  const book = known || openBookOf(objectApi);
  if (!book) {
    patchCardsAndPhase(
      objectApi,
      Object.assign({ bookId: null, bookName: "", list: [], loaded: true, folderLoading: false }, patch || {}),
      null
    );
    refreshBookStats(objectApi);
    return;
  }
  if(STUDIOPROJECTS.kind(book.id))await STUDIOPROJECTS.prepare(objectApi,book.id);
  const st = cardsState(objectApi);
  const wanted = (patch && patch.folderId) || (st.bookId === book.id ? st.folderId : "") || book.id;
  const folderId = String(wanted);
  const t0 = perfMark(objectApi);
  const answers = await Promise.all([
    CARDS.listFolders(objectApi, book.id, folderId),
    CARDS.listFolder(objectApi, book.id, folderId),
    CARDS.folderPath(objectApi, book.id, folderId),
    CARDS.folderTree(objectApi, book.id),
    CONFIG.resolveDepthLabels(objectApi, book.id, projectIdOf(objectApi), myId(objectApi)).catch(() => null),
    folderImages(objectApi, book.id, folderId),
    CARDS.unreadIds(objectApi, book.id).catch(() => []),
  ]);
  perfLog(objectApi, "folder: six reads", t0);
  const trail = answers[2] || [];
  const depthLabels = (answers[4] && answers[4].labels) || null;
  const pictures = answers[5] || {};
  const tiles = (answers[1] || []).map((c) => {
    const im = pictures[String(c.id)];
    return im ? Object.assign({}, c, { image: im }) : c;
  });
  const phase = await phaseFor(objectApi, book);
  perfLog(objectApi, "folder: phase gate", t0);
  const unread = answers[6] || [];
  patchCardsAndPhase(
    objectApi,
    Object.assign(
      {
        bookId: book.id,
        bookName: book.name,
        folderId,
        unread,
        list: stampUnread((answers[0] || []).concat(tiles), unread, answers[3] || [], book.id),
        folderTrail: trail,
        folderPath: trail.map((t) => String(t.name || "")),
        folders: answers[3] || [],
        depthLabels,
        loaded: true,
        folderLoading: false,
        error: "",
      },
      patch || {}
    ),
    phase
  );
  await syncStudioProject(objectApi, {bookId:book.id,folderId,trail,folders:answers[3]||[],list:(answers[0]||[]).concat(tiles)});
  refreshBookStats(objectApi, book);
  // with nothing selected, the metadata pane shows the folder you are STANDING IN. Fill its row here so every navigation lands it; the book root keeps the book pane. A bookMeta press (lib.metaFor) outranks the default until the next real navigation spends it.
  const navigated = String(st.folderId || "") !== folderId || String(st.bookId || "") !== String(book.id);
  if (navigated && ((objectApi.getState().ui || {}).library || {}).metaFor) {
    patchLibrary(objectApi, { metaFor: null });
  }
  const selAfter = patch && "selected" in patch ? patch.selected : st.selected;
  if (!selAfter && folderId !== String(book.id)) {
    await loadFolderMeta(objectApi, folderId);
  }
}

// his ruling: the crumb's book name returns as instantly as the back arrow — close on the tap, not on the folder's round trip.
export function leavePageForFolder(objectApi, folderId) {
  leaveEditor(objectApi);
  const st = cardsState(objectApi);
  if (String(st.view || "folder") === "folder") return;
  penClose(objectApi);
  patchCards(objectApi, {
    view: "folder",
    card: null,
    pages: [],
    stack: [],
    stackId: null,
    pageDoc: null,
    list: [],
    folderId: String(folderId || ""),
    folderTrail: [],
    folderPath: [],
    selected: null,
    menu: false,
    moveMenu: false,
    meta: null,
    folderLoading: true,
  });
}

export function perfMark(objectApi) {
  try {
    return objectApi.getTick();
  } catch (e) {
    return 0;
  }
}
export function perfLog(objectApi, what, t0) {
  try {
    console.log("[perf] " + what + " +" + (objectApi.getTick() - t0) + "t");
  } catch (e) {}
}

export async function syncStudioProject(api,input){
 const book=openBookOf(api);if(!book||book.id!==input.bookId)return null;
 return STUDIOPROJECTS.sync(api,input);
}
export async function studioWorkspace(api,p){
 if(p.op==='editor'||p.op==='linked')return require('lib/editor-switch.js').run(api,p,()=>studioWorkspaceInner(api,p));
 return studioWorkspaceInner(api,p);
}
async function studioWorkspaceInner(api,p){
 const book=openBookOf(api),s=STUDIOPROJECTS.state(api),op=String(p.op||'');
 if(!book||!STUDIOPROJECTS.kind(book.id))return;
 const into=async(folderId,view,cardId)=>{
   leaveEditor(api);
   api=EDITOR_SESSION.scope(api,EDITOR_SESSION.state(api),true);
   STUDIOPROJECTS.begin(api,book.id,folderId,view);
   if(cardId)STUDIOPROJECTS.patch(api,{arrangementCardId:String(cardId)});
   patchCards(api,{view:'folder',card:null,pageDoc:null,pages:[],selected:null,menu:false,modal:null,folderLoading:true});
   try{await loadFolder(api,{folderId,view:'folder',card:null,pageDoc:null,pages:[],selected:null,menu:false,meta:null,modal:null,error:''},book);}finally{patchCards(api,{folderLoading:false});}
 };
 if(op==='linked'||op==='editor'){
   // Browser page-save guards own dirty drafts (studioWorkspace is a NAV_RESUME action).
   // Re-check this exact source after every asynchronous read, before retiring its page.
   const doc=cardsState(api).pageDoc,w=WORKBENCH.state(api);
   if(book.id!=='ASSET00STUDIO'||!doc||doc.bookId!==book.id||p.cardId!==doc.cardId||p.bookId&&p.bookId!==doc.bookId||p.pageId&&p.pageId!==doc.pageId||p.loadKey!=null&&p.loadKey!==w.loadKey)throw Error('This editor request is out of date. Choose the tool again from the current card.');
   const seq=(w.linkSeq||0)+1,key=w.loadKey,baseline=w.baseline;
   WORKBENCH.patch(api,{linkSeq:seq,linkChoices:[],linkNotice:''});
   const fresh=()=>{const d=cardsState(api).pageDoc,n=WORKBENCH.state(api);return openBookOf(api)?.id===book.id&&d?.bookId===doc.bookId&&d?.cardId===doc.cardId&&d?.pageId===doc.pageId&&n.linkSeq===seq&&n.loadKey===key&&n.baseline===baseline;};
   const LINKS=require('lib/studio-links.js');
   const target=op==='editor'?await require('lib/asset-editors.js').switchEditor(api,{bookId:book.id,cardId:doc.cardId,editor:p.editor,components:p.components,guard:()=>{if(!fresh())throw Error('The editor changed; the late switch was stopped');}}):await LINKS.resolve(api,{bookId:book.id,cardId:doc.cardId,tag:p.tag,editor:p.editor});
   if(!fresh())return true;
   if(!target){WORKBENCH.patch(api,{linkNotice:'No linked file for this editor. Metadata choice is unchanged.'});return false;}
   if(target.ok===false){WORKBENCH.patch(api,{linkChoices:target.choices||[],linkNotice:target.message,linkChoiceSource:{bookId:doc.bookId,cardId:doc.cardId,pageId:doc.pageId,loadKey:key}});return true;}
   if(target.bookId!==book.id)throw Error('Linked files cannot leave this Asset Studio project.');
   if(target.cardId===doc.cardId){if(!w.open||w.cardId!==doc.cardId||w.data?.mode!==target.editor||EDITOR_SESSION.state(api).editor!==target.editor)await openCardDocument(api,{cardId:doc.cardId,pageId:doc.pageId,editor:target.editor});return true;}
   const row=await CARDS.getCard(api,book.id,target.cardId);if(!fresh())return true;
   if(!row||row.trashed)throw Error('The linked file is no longer available.');
   const source=await LINKS.project(api,book.id,doc.cardId);if(!fresh())return true;
   const root=await STUDIOPROJECTS.rootFor(api,book.id,row.folderId);if(!fresh())return true;
   if(root?.id!==source.root.id)throw Error('The linked file moved outside this project.');
   await openCardDocument(api,{cardId:target.cardId,editor:target.editor});return true;
 }
 if(op==='projects'){await into(book.id,'projects');return;}
 if(op==='instruments'){
   if(book.id!==STUDIOPROJECTS.SOUND)return;
   const bank=(await CARDS.listFolders(api,book.id,book.id)).find(f=>require('lib/studio-project-data.js').shared(book.id,f));
   if(!bank)throw Error('Custom Instruments is not available on this shelf.');await into(bank.id,'files');return;
 }
 if(op==='types'){if(!s.projectId)throw Error('Choose a project first.');await into(s.projectId,'types');return;}
 if(op==='files'){await into(s.folderId!==s.projectId?s.folderId:s.projectId||book.id,'files');return;}
 if(op==='type'){
   const projectId=String(p.projectId||s.projectId||'');let f;
   if(p.type)f=await STUDIOPROJECTS.ensureType(api,{bookId:book.id,projectId,type:p.type,actor:who(api)});
   else {f=await CARDS.getFolder(api,book.id,String(p.folderId||''));if(!f||f.folderId!==projectId)throw Error('Choose a type inside this project.');}
   if(openBookOf(api)?.id!==book.id)return;await into(f.id,'files');return;
 }
 if(op==='open'){
   const id=String(p.projectId||s.projectId||''),f=id&&await CARDS.getFolder(api,book.id,id);
   if(!f||f.folderId!==book.id||require('lib/studio-project-data.js').shared(book.id,f))throw Error('Choose a project, not Custom Instruments.');
   if(openBookOf(api)?.id!==book.id)return;await into(id,'types');return;
 }
 if(op==='arrangement'){
   return await openCardDocument(api,{cardId:String(p.cardId||''),folderId:String(p.folderId||s.folderId||''),arrangement:true});
 }
 if(op==='create'){
   const row=await STUDIOPROJECTS.create(api,{bookId:book.id,name:p.name,actor:who(api)});if(!row||openBookOf(api)?.id!==book.id)return;
   await into(row.id,'types');await refreshCards(api);return;
 }
 if(op==='notes'||op==='newScore'){
   if(book.id!==STUDIOPROJECTS.SOUND)return;
   let cardId=String(p.cardId||'');
   if(op==='newScore'){
     if(!s.projectId)throw Error('Open a sound project first.');
     if(s.creating)return;STUDIOPROJECTS.patch(api,{creating:true,error:''});
     try{
       const type=s.type==='sfx'?'sfx':'music',destination=await STUDIOPROJECTS.ensureType(api,{bookId:book.id,projectId:s.projectId,type,actor:who(api)});
       const row=await CARDS.createCardRow(api,book.id,{folderId:destination.id,name:type==='sfx'?'New SFX':'New soundtrack',actor:who(api)});if(!row)throw Error('Score creation was refused.');cardId=row.id;
       const done=await CARDS.settleOf(book.id,cardId);if(done?.ok===false)throw Error(done.error||'Score creation did not finish.');
       await CARDS.setMeta(api,book.id,cardId,{editor:'piano'},{actor:who(api)});
       const content=require('lib/pianoroll.js').serialize({version:1,bpm:120,beats:16,tracks:[{instrument:'piano',notes:[]}]}),pages=await CARDS.listPages(api,book.id,cardId);
       if(pages.length){if(String(pages[0].content||'').trim())throw Error('The new score already contains writing; it was not overwritten.');await CARDS.setPageContent(api,book.id,pages[0].id,content,{actor:who(api)});}
       else {const pageId=await CARDS.createPage(api,book.id,cardId,{title:'Score',actor:who(api)});await CARDS.setPageContent(api,book.id,pageId,content,{actor:who(api)});}
     }finally{if(STUDIOPROJECTS.state(api).bookId===book.id)STUDIOPROJECTS.patch(api,{creating:false});}
   }
   if(openBookOf(api)?.id!==book.id)return;
   const card=await CARDS.getCard(api,book.id,cardId);if(!card)throw Error('That score card is no longer available.');
   const trail=await CARDS.folderPath(api,book.id,card.folderId);if(s.projectId&&trail[0]?.id!==s.projectId)throw Error('That score is outside the selected project.');
   await openCardDocument(api,{cardId});return;
 }
}

export async function openPinnedBook(objectApi, pin) {
  const book = { id: pin.id, name: pin.name };
  let folderId = book.id;
  if (pin.folder) {
    const found = await RESEARCH.folderIdNamed(objectApi, book.id, pin.folder);
    if (found) folderId = found;
  }
  const patch = { folderId, selected: null, menu: false, meta: null, modal: null, view: "folder", error: "" };
  // The root's crumb is empty; a folder's trail is loadFolder's own answer and must not be blanked.
  if (folderId === book.id) patch.folderPath = [];
  await loadFolder(objectApi, patch, book);
}

let STATS_TOKEN = 0;
export function refreshBookStats(objectApi, known) {
  const book = known || openBookOf(objectApi);
  const token = ++STATS_TOKEN;
  if (!book) {
    const shut = Object.assign({}, objectApi.getState().ui || {});
    if (shut.bookStats) {
      shut.bookStats = null;
      objectApi.patchState({ ui: shut });
    }
    return;
  }
  let here = 0;
  try {
    here = (objectApi.getPlayers() || []).length;
  } catch (e) {
    here = 0;
  }
  Promise.resolve(CARDS.bookStats(objectApi, book.id))
    .then((s) => {
      if (!s || token !== STATS_TOKEN) return;
      const now = openBookOf(objectApi);
      if (!now || String(now.id) !== String(book.id)) return;
      const ui = Object.assign({}, objectApi.getState().ui || {});
      ui.bookStats = {
        statusCounts: s.statusCounts || {},
        cards: Number(s.cards || 0),
        words: Number(s.words || 0),
        pages: Number(s.pages || 0),
        coopN: here,
      };
      objectApi.patchState({ ui });
    })
    .catch((e) => objectApi.log("[cards] book vitals unread: " + ((e && e.message) || e)));
}

// The footer's totals follow the text (his report, 2026-08-27: a page's words never showed until a meta edit reloaded the folder). Every completed index pass — page, section, summary, paste, find & replace, import, undo — lands here; a burst of writes collapses to ONE re-read because only the newest timer survives. refreshBookStats's own token still guards the paint.
let VITALS_FOLLOW = 0;
CARDS.registerAfterIndex(function (objectApi, bookId) {
  const book = openBookOf(objectApi);
  if (!book || String(book.id) !== String(bookId)) return;
  const t = ++VITALS_FOLLOW;
  try {
    objectApi.runInTicks(5, function () {
      if (t === VITALS_FOLLOW) refreshBookStats(objectApi);
    });
  } catch (e) {
    if (t === VITALS_FOLLOW) refreshBookStats(objectApi);
  }
});

export async function loadMeta(objectApi, cardId) {
  const book=openBookOf(objectApi),ui=uiNow(objectApi),c=cardsState(objectApi);
  if(!book||!cardId){patchCards(objectApi,{meta:null,metaLoading:false});return;}
  const lazy=c.view==='page'&&(c.pageDoc?.pianoRoll||EDITOR_SESSION.state(objectApi).editor==='arrangement'),generation=EDITOR_SESSION.state(objectApi).generation;
  if(lazy&&!ui.metaOpen&&ui.notepadPane!=='meta'){
    patchCards(objectApi,{meta:null,metaLoading:false,metaDeferred:cardId});return;
  }
  const bundle=await cardBundle(objectApi,book,cardId),now=cardsState(objectApi),currentBook=openBookOf(objectApi);
  if(!currentBook||currentBook.id!==book.id||EDITOR_SESSION.state(objectApi).generation!==generation)return;
  const latest=uiNow(objectApi);
  if(lazy&&!latest.metaOpen&&latest.notepadPane!=='meta'){
    patchCards(objectApi,{metaLoading:false,metaDeferred:cardId});return;
  }
  if(now.view==="page"){if(!now.card||String(now.card.id)!==String(cardId))return;}
  else if(now.selected&&String(now.selected.id)!==String(cardId))return;
  patchCards(objectApi,{meta:bundle,metaLoading:false,metaDeferred:"",...(now.pageDoc?.cardId===cardId?{pageDoc:{...now.pageDoc,sections:bundle?.sections||[]}}:{})});
}

// The FOLDER pane's prep. Its one live value is the compile flag, read through CARDS.compileFlags —
//   the overlay, never a widened graph read.
export async function loadFolderMeta(objectApi, folderId, name) {
  const book = openBookOf(objectApi);
  const fid = String(folderId || "");
  if (!book || !fid) {
    patchCards(objectApi, { folderMeta: null });
    return;
  }
  let compile = true;
  try {
    const flags = await CARDS.compileFlags(objectApi, book.id);
    compile = ((flags || {}).folders || {})[fid] !== false;
  } catch (e) {
    objectApi.log("[cards] compile flag unread for folder " + fid + ": " + ((e && e.message) || e));
  }
  const st = cardsState(objectApi);
  if (st.selected && String(st.selected.id) !== fid) return;
  // No selection: this fill is for the folder he is STANDING IN — a stale call for a folder he
  // already left writes nothing.
  if (!st.selected && String(st.folderId || "") !== fid) return;
  const tile = tileOf(st, fid);
  const here = !tile && String(st.folderId || "") === fid;
  // The designation: off the tile's own row when the pane shows a child, one cached read otherwise.
  let doc = "";
  try {
    doc = tile ? CARDS.docFlag(tile.doc) : await CARDS.folderDoc(objectApi, book.id, fid);
  } catch (e) {
    objectApi.log("[cards] doc flag unread for folder " + fid + ": " + ((e && e.message) || e));
  }
  // Standing IN the folder, its contents are the loaded list — count them instead of guessing 0/0.
  const inList = here ? (st.list || []).filter((t) => t && t.isFolder).length : 0;
  const counts = here
    ? { folders: inList, cards: Math.max(0, (st.list || []).length - inList) }
    : (tile && tile.childCounts) || { folders: 0, cards: 0 };
  const path = st.folderPath || [];
  patchCards(objectApi, {
    folderMeta: {
      id: fid,
      name: String(
        (tile && tile.name) || name || (here && path[path.length - 1]) || (st.selected && st.selected.name) || "Folder"
      ),
      compile,
      doc,
      counts,
      path: here ? path.slice(0, -1) : path,
      bookName: book.name,
      bookId: book.id,
    },
  });
}

export async function openModal(objectApi, cardId) {
  const book = openBookOf(objectApi);
  if (!book || !cardId) return;
  const st = cardsState(objectApi);
  const tile = tileOf(st, cardId);
  patchCards(objectApi, {
    modal: {
      loading: true,
      cardId: String(cardId),
      bookId: book.id,
      bookName: book.name,
      folderPath: st.folderPath || [],
      card: tile
        ? { id: tile.id, name: tile.name, status: tile.status, priority: tile.priority, summary: tile.summary, image: tile.image || null }
        : { id: String(cardId), name: "" },
      tags: [],
      sections: [],
      pages: [],
      pageCount: 0,
      stack: { size: 1, members: [], primaryId: String(cardId) },
      backlinks: null,
      lineage: "",
    },
    menu: false,
    moveMenu: false,
  });
  SFX.play(objectApi, "ui.windowOpen");
  // the edit modal does NOT clear the unread dot. Page view is the one reading surface — and it opens the metadata sidebar with it, so everything a minted card carries is seen in the same open. markCardRead stays out of here.
  if (!st.draft || String(st.draft.cardId) !== String(cardId)) setDraft(objectApi, blankDraft(cardId));
  const bundle = await cardBundle(objectApi, book, cardId);
  if (!bundle) return;
  let refCandidates = null;
  try {
    refCandidates = await refCandidatesFor(objectApi, projectIdOf(objectApi), String(book.id));
  } catch (e) {
    objectApi.log("[cards] reference candidates unavailable: " + ((e && e.message) || e));
  }
  const now = cardsState(objectApi);
  if (!now.modal || String(now.modal.cardId || (now.modal.card && now.modal.card.id)) !== String(cardId)) return;
  patchCards(objectApi, {
    modal: Object.assign({ loading: false }, bundle, refCandidates ? { refCandidates: refCandidates } : {}),
    menu: false,
    moveMenu: false,
  });
}

// his ask: a card's picture comes from its content or a description box — and there is no generation call in this engine, writing the /cdn/ path IS the mint.

const NO_BOOK_PICTURE = "open a book first — a picture belongs to a card";
const NO_PICTURE = { url: "", prompt: "", version: 0 };

export function imagesOf(bookId) {
  const id = String(bookId || "");
  return id ? GRAPH.book(id) : null;
}

export function imageRow(r) {
  return {
    url: String((r && r.url) || ""),
    prompt: String((r && r.prompt) || ""),
    version: Number((r && r.version) || 0),
  };
}

export async function folderImages(objectApi, bookId, folderId) {
  const h = imagesOf(bookId);
  if (!h || typeof h.imagesInFolder !== "function") return {};
  try {
    const res = await h.imagesInFolder(objectApi, folderId);
    const map = {};
    for (const r of (res && res.rows) || []) map[String(r.cardId)] = imageRow(r);
    return map;
  } catch (e) {
    objectApi.log("[cards] thumbnails unread in folder " + folderId + ": " + ((e && e.message) || e));
    return {};
  }
}

export async function cardImageRow(objectApi, bookId, cardId) {
  const h = imagesOf(bookId);
  if (!h || typeof h.imageOf !== "function") return null;
  const res = await h.imageOf(objectApi, cardId);
  const row = ((res && res.rows) || [])[0];
  return row ? imageRow(row) : null;
}

export function paintImage(objectApi, cardId, row) {
  const st = cardsState(objectApi);
  const id = String(cardId);
  const patch = {};
  let touched = false;
  const list = (st.list || []).map((t) => {
    if (String(t.id) !== id) return t;
    touched = true;
    return Object.assign({}, t, { image: row });
  });
  if (touched) patch.list = list;
  const m = st.modal;
  if (m && String(m.cardId || (m.card && m.card.id) || "") === id) {
    patch.modal = Object.assign({}, m, {
      image: row,
      card: m.card ? Object.assign({}, m.card, { image: row }) : m.card,
      imageError: "",
      imageBusy: false,
    });
  }
  const meta = st.meta;
  if (meta && meta.card && String(meta.card.id) === id) patch.meta = Object.assign({}, meta, { image: row });
  if (touched || patch.modal || patch.meta) patchCards(objectApi, patch);
}

export function pictureName(objectApi, cardId) {
  const st = cardsState(objectApi);
  const m = st.modal;
  if (m && m.card && String(m.card.id) === String(cardId) && m.card.name) return String(m.card.name);
  const tile = tileOf(st, cardId);
  return String((tile && tile.name) || "the card");
}

export function quoted(name) {
  return "“" + String(name || "") + "”";
}

export function pictureFail(objectApi, cardId, e) {
  const msg = String((e && e.message) || e || "unknown failure");
  objectApi.log("[cards] " + msg);
  const st = cardsState(objectApi);
  const m = st.modal;
  if (m && String(m.cardId || (m.card && m.card.id) || "") === String(cardId)) {
    patchCards(objectApi, { modal: Object.assign({}, m, { imageError: msg, imageBusy: false }) });
  } else {
    patchCards(objectApi, { error: msg });
  }
  SFX.play(objectApi, "ui.error");
}

export function stampNow(objectApi) {
  try {
    return Math.floor(Number(objectApi.getWallClockTime ? objectApi.getWallClockTime() : 0) || 0);
  } catch (e) {
    return 0;
  }
}

export async function cardAsItStands(objectApi, book, cardId) {
  const st = cardsState(objectApi);
  const m = st.modal;
  let card = null;
  let sections = [];
  if (m && m.card && String(m.card.id) === String(cardId) && !m.loading) {
    card = Object.assign({}, m.card);
    sections = (m.sections || []).map((s) => ({ name: s.name, content: s.content }));
  } else {
    const held = await CARDS.getCard(objectApi, book.id, cardId);
    if (!held) return null;
    card = Object.assign({}, held);
    try {
      sections = await CARDS.listSections(objectApi, book.id, cardId);
    } catch (e) {
      sections = [];
    }
  }
  const draft = st.draft && String(st.draft.cardId) === String(cardId) ? st.draft : null;
  const edits = (draft && draft.edits) || {};
  if (Object.prototype.hasOwnProperty.call(edits, "name")) card.name = edits.name;
  if (Object.prototype.hasOwnProperty.call(edits, "summary")) card.summary = edits.summary;
  if (Object.prototype.hasOwnProperty.call(edits, "status")) card.status = edits.status;
  card.sections = sections;
  return card;
}

export async function recordPicture(objectApi, book, cardId, before, after, label) {
  try {
    await CHANGELOG.record(objectApi, {
      type: "SET_CARD_IMAGE",
      projectId: projectIdOf(objectApi),
      bookId: book.id,
      targetId: String(cardId),
      targetType: "card",
      before: before,
      after: Object.assign({}, after, { label: label }),
      actor: who(objectApi),
    });
  } catch (e) {
    objectApi.log("[cards] the picture change went unrecorded: " + ((e && e.message) || e));
  }
  syncEdit(objectApi).catch((e) => objectApi.log("[cards] undo status unread: " + ((e && e.message) || e)));
}

export async function cardPicture(objectApi, ask) {
  const a = ask || {};
  const id = String(
    (a.make && a.make.id) || (a.clear && a.clear.id) || (a.prompt && a.prompt.id) || ""
  );
  if (!id) return;
  const typed = a.prompt ? String(a.prompt.text == null ? "" : a.prompt.text) : null;
  const book = openBookOf(objectApi);
  if (!book) return void patchCards(objectApi, { error: NO_BOOK_PICTURE });
  const h = imagesOf(book.id);
  if (!h || typeof h.setImage !== "function") {
    return void pictureFail(objectApi, id, new Error("this book has no picture table — reopen the book and try again"));
  }

  try {
    const held = (await cardImageRow(objectApi, book.id, id)) || NO_PICTURE;
    const name = pictureName(objectApi, id);

    if (a.clear) {
      if (held.version || held.url || held.prompt) {
        await h.clearImage(objectApi, id);
        await recordPicture(objectApi, book, id, held, NO_PICTURE, "Took the picture off " + quoted(name));
      }
      paintImage(objectApi, id, NO_PICTURE);
      patchCards(objectApi, { notice: "Took the picture off " + quoted(name), error: "" });
      SFX.play(objectApi, "cards.trashed");
      return;
    }

    if (a.make) {
      const described = typed === null ? held.prompt : typed;
      let phrase = "";
      if (String(described || "").trim()) {
        phrase = CARDIMAGE.promptFor(null, described);
      } else {
        const card = await cardAsItStands(objectApi, book, id);
        if (!card) throw new Error("that card is no longer here");
        phrase = CARDIMAGE.promptFromCard(card);
      }
      const version = CARDIMAGE.nextVersion(held);
      const url = CARDIMAGE.urlFor(id, phrase, version);
      const row = { url: url, prompt: phrase, version: version };
      await h.setImage(objectApi, id, phrase, url, version, stampNow(objectApi));
      const label = held.version ? "Redrew " + quoted(name) : "Gave " + quoted(name) + " a picture";
      await recordPicture(objectApi, book, id, held, row, label);
      paintImage(objectApi, id, row);
      patchCards(objectApi, { notice: label, error: "" });
      SFX.play(objectApi, "cards.created");
      return;
    }

    const words = String(typed || "").trim();
    if (words === String(held.prompt || "").trim()) return;
    await h.setImage(objectApi, id, words, held.url, held.version, stampNow(objectApi));
    paintImage(objectApi, id, { url: held.url, prompt: words, version: held.version });
  } catch (e) {
    pictureFail(objectApi, id, e);
  }
}

export function specFrom(bookCfg) {
  let spec = bookCfg && bookCfg.pageSpec && typeof bookCfg.pageSpec === "object" ? bookCfg.pageSpec : null;
  if (!spec) spec = PL.DEFAULT_SPEC;
  if (!PL.isUnit(spec.unit)) spec = PL.convert(spec, "mm");
  const v = PL.validate(spec);
  return v.ok ? v.spec : PL.normalize(PL.DEFAULT_SPEC);
}

export function paperFrom(seatCfg) {
  const themes = THEME.paper || {};
  const base = String(THEME.defaultThemeId !== undefined ? THEME.defaultThemeId : "0");
  const raw = seatCfg && seatCfg.themeId !== undefined && seatCfg.themeId !== null ? String(seatCfg.themeId) : base;
  const id = themes[raw === "" ? base : raw] ? (raw === "" ? base : raw) : base;
  const adj = seatCfg && seatCfg.themeAdjustments && typeof seatCfg.themeAdjustments === "object" ? seatCfg.themeAdjustments.paper : null;
  return Object.assign({}, PAGEUI.PAPER_FALLBACK, themes[id] || themes[base] || {}, adj && typeof adj === "object" ? adj : {});
}

export async function resolved(objectApi, text, ctx, chrome) {
  const src = String(text == null ? "" : text);
  if (!src) return "";
  const segs = await REFS.resolveSegments(objectApi, src, ctx);
  return chrome ? PAGEUI.chromeRender(src, segs) : PAGEUI.mdRender(src, segs);
}

const ZONE_HTML = { content: "bodyHtml", header: "headerHtml", footer: "footerHtml" };

export function zoneMarks(doc, field, on) {
  const was = (doc && doc.dirty) || {};
  const dirty = { content: !!was.content, header: !!was.header, footer: !!was.footer };
  dirty[field] = !!on;
  return dirty;
}

export function paintZone(objectApi, pageId, field, value) {
  const doc = cardsState(objectApi).pageDoc;
  if (!doc || String(doc.pageId || "") !== String(pageId)) return false;
  const page = Object.assign({}, doc.page || {});
  page[field] = value;
  const next = Object.assign({}, doc, { page: page, dirty: zoneMarks(doc, field, true) });
  next[ZONE_HTML[field]] = plainRender(value, field !== "content");
  patchCards(objectApi, { pageDoc: next });
  return true;
}

export function plainRender(value, chrome) {
  const raw = String(value == null ? "" : value);
  const segs = raw ? [{ kind: "text", start: 0, end: raw.length, plain: raw, html: REFS.escapeText(raw) }] : [];
  return chrome ? PAGEUI.chromeRender(raw, segs) : PAGEUI.mdRender(raw, segs);
}

export function clearZoneMark(objectApi, pageId, field, value) {
  const doc = cardsState(objectApi).pageDoc;
  if (!doc || String(doc.pageId || "") !== String(pageId)) return;
  if (String((doc.page && doc.page[field]) || "") !== String(value || "")) return;
  patchCards(objectApi, { pageDoc: Object.assign({}, doc, { dirty: zoneMarks(doc, field, false) }) });
}

export async function resolveZone(objectApi, pageId, field, value) {
  const doc = cardsState(objectApi).pageDoc;
  if (!doc || String(doc.pageId || "") !== String(pageId)) return;
  const book = openBookOf(objectApi);
  let html = null;
  try {
    const pid = projectIdOf(objectApi);
    let customTags = {};
    try {
      customTags = (await TAGDEFS.map(objectApi, pid)) || {};
    } catch (e) {
      objectApi.log("[page] custom tags unavailable: " + ((e && e.message) || e));
    }
    const ctx = { projectId: pid, bookId: book ? book.id : "", cardId: doc.cardId, cache: {}, customTags };
    html = await resolved(objectApi, value, ctx, field !== "content");
  } catch (e) {
    objectApi.log("[page] zone preview unresolved: " + ((e && e.message) || e));
    return;
  }
  const now = cardsState(objectApi).pageDoc;
  if (!now || String(now.pageId || "") !== String(pageId)) return;
  if (String((now.page && now.page[field]) || "") !== String(value || "")) return;
  const next = Object.assign({}, now);
  next[ZONE_HTML[field]] = html;
  patchCards(objectApi, { pageDoc: next });
}

const REFCANDS = { key: "", payload: null };

export function refShelfRows(objectApi) {
  try {
    return ASSETSHELF.rows(objectApi) || [];
  } catch (e) {
    return [];
  }
}

export function refShelfStamp(objectApi, rows) {
  const list = rows || refShelfRows(objectApi);
  let out = "";
  for (let i = 0; i < list.length; i++) {
    const r = list[i] || {};
    out += String(r.id || "") + String(r.name || "") + String(r.kind || "") + "|";
  }
  return out;
}

export async function refCandidatesFor(objectApi, projectId, bookId) {
  const pid = String(projectId || "");
  const bid = String(bookId || "");
  let version = 0;
  try {
    version = REFS.indexVersion(pid);
  } catch (e) {
    version = 0;
  }
  const shelf = refShelfRows(objectApi);
  const key =
    pid + "/" + bid + "/" + version + "/" + refShelfStamp(objectApi, shelf) + "/" + KITCHEN.installed(objectApi);
  if (REFCANDS.key === key && REFCANDS.payload) return REFCANDS.payload;
  let index = { entries: [], version: version };
  let projTags = [];
  try {
    index = await REFS.autocompleteIndex(objectApi, { projectId: pid, bookId: bid });
  } catch (e) {
    objectApi.log("[page] reference candidates unavailable: " + ((e && e.message) || e));
  }
  try {
    projTags = (await TAGDEFS.insertItems(objectApi, pid)) || [];
  } catch (e) {
    projTags = [];
  }
  const ui = objectApi.getState().ui || {};
  const lib = Object.assign({}, DEFAULT_UI.library, ui.library || {});
  const payload = REFPICK.candidates({
    index: index,
    tagItems: (PAGEUI.TAG_ITEMS || []).concat(projTags),
    bookId: bid,
    books: lib.books || [],
    assets: shelf,
    atmos: KITCHEN.installed(objectApi) ? KITCHEN.presets().concat(KITCHEN.transitions()) : [],
  });
  REFCANDS.key = key;
  REFCANDS.payload = payload;
  return payload;
}

// his ruling: pages preload with the active book and open near-instantly.
const PAGEENV = {};
const PAGEENV_FILL = {};

export function refIndexVersion(projectId) {
  try {
    return REFS.indexVersion(String(projectId || ""));
  } catch (e) {
    return 0;
  }
}

export function pageEnvNow(bookId) {
  const id = String(bookId || "");
  return (id && PAGEENV[id]) || null;
}

export function pageEnvDrop(bookId) {
  const id = String(bookId || "");
  if (!id) return;
  delete PAGEENV[id];
  delete PAGEENV_FILL[id];
}

export function pageEnvDropAll() {
  for (const k of Object.keys(PAGEENV)) delete PAGEENV[k];
  for (const k of Object.keys(PAGEENV_FILL)) delete PAGEENV_FILL[k];
}

export async function pageEnvGather(objectApi, bookId) {
  const pid = projectIdOf(objectApi);
  const t0 = perfMark(objectApi);
  const [seatCfg, bookCfg, customTags, refCandidates] = await Promise.all([
    CONFIG.getUser(objectApi, myId(objectApi)).catch((e) => {
      objectApi.log("[page] settings unreadable: " + ((e && e.message) || e));
      return null;
    }),
    CONFIG.getBook(objectApi, bookId).catch((e) => {
      objectApi.log("[page] settings unreadable: " + ((e && e.message) || e));
      return null;
    }),
    TAGDEFS.map(objectApi, pid).then(
      (m) => m || {},
      (e) => {
        objectApi.log("[page] custom tags unavailable: " + ((e && e.message) || e));
        return {};
      }
    ),
    refCandidatesFor(objectApi, pid, bookId).catch((e) => {
      objectApi.log("[page] reference candidates unavailable: " + ((e && e.message) || e));
      return null;
    }),
  ]);
  perfLog(objectApi, "env: all four reads", t0);
  const env = {
    pid: pid,
    spec: specFrom(bookCfg),
    paper: paperFrom(seatCfg),
    customTags: customTags,
    refCandidates: refCandidates,
    refVersion: refIndexVersion(pid),
    shelfStamp: refShelfStamp(objectApi),
  };
  PAGEENV[String(bookId)] = env;
  return env;
}

export function pageEnvFill(objectApi, bookId) {
  const id = String(bookId || "");
  if (!id) return Promise.resolve(null);
  if (PAGEENV[id]) return Promise.resolve(PAGEENV[id]);
  if (PAGEENV_FILL[id]) return PAGEENV_FILL[id];
  const p = pageEnvGather(objectApi, id).then(
    (env) => {
      delete PAGEENV_FILL[id];
      return env;
    },
    (e) => {
      delete PAGEENV_FILL[id];
      throw e;
    }
  );
  PAGEENV_FILL[id] = p;
  return p;
}

export function pageEnvWarm(objectApi, bookId) {
  const id = String(bookId || "");
  if (!id || PAGEENV[id] || PAGEENV_FILL[id]) return;
  Promise.resolve(pageEnvFill(objectApi, id)).catch((e) =>
    objectApi.log("[page] could not warm the book's page environment: " + ((e && e.message) || e))
  );
}

export async function pageEnvRefreshRefs(objectApi, bookId) {
  const env = pageEnvNow(bookId);
  if (!env) return null;
  const version = refIndexVersion(env.pid);
  const stamp = refShelfStamp(objectApi);
  if (version === env.refVersion && stamp === String(env.shelfStamp || "")) return null;
  let refCandidates = env.refCandidates;
  try {
    refCandidates = await refCandidatesFor(objectApi, env.pid, bookId);
  } catch (e) {
    objectApi.log("[page] reference candidates unavailable: " + ((e && e.message) || e));
    return null;
  }
  const held = pageEnvNow(bookId);
  if (!held) return null;
  held.refCandidates = refCandidates;
  held.refVersion = version;
  held.shelfStamp = stamp;
  return refCandidates;
}

export async function warmPinnedBooks(objectApi) {
  for (const spec of RESEARCH.all()) {
    if (spec.id === "WWSCODE0BOOK") continue;
    const handle = GRAPH.book(String(spec.id));
    if (!handle) continue;
    try {
      await handle.load(objectApi);
      await handle.loadRefs(objectApi);
    } catch (e) {
      objectApi.log(`[pinned] ${spec.name} did not warm: ${(e && e.message) || e}`);
    }
  }
}

// his ruling: refresh the grid on join — a script save re-evaluates every module, so this seat's caches restart empty.
export async function warmOpenPage(objectApi, bookId) {
 const st=cardsState(objectApi);if(st.view!=='page'||openBookOf(objectApi)?.id!==bookId)return;
 const cardId=String(st.card?.id||'');if(!cardId)return await loadFolder(objectApi);
 // A lost machine-local note cache is not a navigation request. Metadata/chrome
 // can be the first input after module wake; the delayed book warm must not
 // replace the already-playing browser document. Notes recover on demand.
 if(EDITOR_SESSION.state(objectApi).editor==='arrangement'&&['loading','ready'].includes(EDITOR_SESSION.state(objectApi).phase))return await loadPageDoc(objectApi,{});
 return await openCardDocument(objectApi,{cardId,pageId:String(st.pageDoc?.pageId||''),name:st.card?.name||''});
}

export function warmOpenBook(objectApi) {
  try {
    const cards = (((objectApi.getState() || {}).ui || {}).cards) || {};
    const bookId = String(cards.bookId || "");
    if (!bookId) return;
    const handle = GRAPH.book(bookId);
    if (handle) {
      Promise.resolve(handle.load(objectApi))
        .then(() => handle.loadRefs(objectApi))
        .then(() => warmOpenPage(objectApi, bookId))
        .catch((e) => objectApi.log("[warm] open book rows: " + ((e && e.message) || e)));
    }
    pageEnvWarm(objectApi, bookId);
    if (String(cards.view || "folder") === "folder") {
      loadFolder(objectApi).catch((e) => objectApi.log("[warm] folder re-read: " + ((e && e.message) || e)));
    }
  } catch (e) {
    objectApi.log("[warm] open book: " + ((e && e.message) || e));
  }
}

export function pageRowsNow(bookId, cardId) {
  const id = String(bookId || "");
  const cid = String(cardId || "");
  if (!id || !cid) return null;
  let handle = null;
  try {
    handle = GRAPH.book(id);
  } catch (e) {
    return null;
  }
  if (!handle || typeof handle.pagesForCardNow !== "function") return null;
  const rows = handle.pagesForCardNow(cid);
  if (!rows) return null;
  return rows
    .map((r) => ({
      id: String(r.id == null ? "" : r.id),
      cardId: String(r.cardId == null ? "" : r.cardId),
      sortKey: String(r.sortKey == null ? "" : r.sortKey),
      title: String(r.title == null ? "" : r.title),
      content: String(r.content == null ? "" : r.content),
      header: String(r.header == null ? "" : r.header),
      footer: String(r.footer == null ? "" : r.footer),
    }))
    .sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function pageOpenWarm(bookId, cardId) {
  if (!pageEnvNow(bookId)) return null;
  return pageRowsNow(bookId, cardId);
}

// his ruling: coop restricts card pages to one editor at a time until multi-user editing lands.
let PEN = null;
let PEN_TOKEN = 0;

const PEN_GATED = {
  pageNew: 1,
  pageTitle: 1,
  pageContent: 1,
  pageHeader: 1,
  pageFooter: 1,
  pageLive: 1,
  pagePaste: 1,
  refPickCommit: 1,
  pageDeleteAsk: 1,
  pageDelete: 1,
  pageMoveLeft: 1,
  pageMoveRight: 1,
  pageDup: 1,
  pageSpec: 1,
  pageFormat: 1,
};

export function penMe(objectApi) {
  return PAGELOCK.identity(objectApi);
}

export function penOf(cardId) {
  const id = String(cardId || "");
  if (!PEN || !id || String(PEN.cardId) !== id) return null;
  if (PEN.parked) return { mine: false, parked: true, holder: "", holderName: "", stale: false };
  if (PEN.mine) return { mine: true, parked: false };
  const name = PEN.holder || "someone";
  return { mine: false, parked: false, holder: name, holderName: name, stale: !!PEN.stale };
}

export function penDenies(st) {
  const card = st && st.card ? String(st.card.id || "") : "";
  const v = penOf(card);
  return !!(v && v.mine === false);
}

export function penMirror(objectApi) {
  const st = cardsState(objectApi);
  const doc = st.pageDoc;
  if (!doc) return;
  patchCards(objectApi, { pageDoc: Object.assign({}, doc, { pen: penOf(doc.cardId) }) });
}

export function penSet(objectApi, v) {
  if (!PEN) return;
  const m = !!(v && v.mine);
  const parked = !!(v && v.parked);
  const stale = !!(v && v.stale);
  const h = String((v && v.holderName) || "");
  const takenAt = Number(v && v.takenAt) || 0;
  if (PEN.mine === m && !!PEN.parked === parked && PEN.holder === h && !!PEN.stale === stale && PEN.takenAt === takenAt) return;
  const gained = m && !PEN.mine;
  PEN = Object.assign({}, PEN, { mine: m, parked, stale, holder: h, takenAt });
  penMirror(objectApi);
  if (gained) {
    Promise.resolve(loadPageDoc(objectApi, {})).catch((e) => objectApi.log("[pen] " + ((e && e.message) || e)));
  }
}

// his law: the window goes up on the click — never awaited by its callers.
export function penOpen(objectApi, bookId, cardId) {
  const prev = PEN;
  PEN = null;
  const token = ++PEN_TOKEN;
  Promise.resolve(penTake(objectApi, prev, bookId, cardId, token)).catch((e) =>
    objectApi.log("[pen] " + ((e && e.message) || e))
  );
}

export async function penTake(objectApi, prev, bookId, cardId, token) {
  const me = penMe(objectApi);
  if (prev && prev.mine) await PAGELOCK.release(objectApi, prev.bookId, prev.cardId, me.id);
  const b = String(bookId || "");
  const c = String(cardId || "");
  if (!b || !c || !me.id) return;
  const v = await PAGELOCK.acquire(objectApi, b, c, me.id, me.name);
  if (token !== PEN_TOKEN) {
    if (v && v.mine) await PAGELOCK.release(objectApi, b, c, me.id);
    return;
  }
  PEN = {
    bookId: b,
    cardId: c,
    mine: !!(v && v.mine),
    parked: !!(v && v.parked),
    stale: !!(v && v.stale),
    holder: (v && v.holderName) || "",
    takenAt: Number(v && v.takenAt) || 0,
  };
  penMirror(objectApi);
  penWatch(objectApi, token, 0);
}

export function penClose(objectApi) {
  const prev = PEN;
  PEN = null;
  PEN_TOKEN += 1;
  if (!prev || !prev.mine) return;
  const me = penMe(objectApi);
  Promise.resolve(PAGELOCK.release(objectApi, prev.bookId, prev.cardId, me.id)).catch((e) =>
    objectApi.log("[pen] " + ((e && e.message) || e))
  );
}

export async function penPark(objectApi) {
  const held = PEN;
  if (!held || !held.mine || held.parked) return;
  const me = penMe(objectApi);
  const v = await PAGELOCK.park(objectApi, held.bookId, held.cardId, me.id);
  if (!PEN || String(PEN.cardId) !== String(held.cardId)) return;
  penSet(objectApi, v);
}

export async function penClaim(objectApi) {
  const held = PEN;
  if (!held) return;
  const me = penMe(objectApi);
  if (!me.id) return;
  const v = await PAGELOCK.claim(objectApi, held.bookId, held.cardId, me.id, me.name);
  if (!PEN || String(PEN.cardId) !== String(held.cardId)) return;
  penSet(objectApi, v);
}

// Compatibility entry for old callers. No timer, polling, heartbeat, or retry.
export function penWatch(objectApi, token, passes) {}

// Draft mirroring and confirmation dialogs are not persistence actions.
export function penWriteAction(op) { return op === "pageSave" || !!PEN_GATED[op] && op !== "pageLive" && op !== "pageDeleteAsk"; }

// A stale UI badge is never authority. Revalidate the already-held lease only when
// the hand changes something; never steal an expired/released lease behind a draft.
export async function penBeforeWrite(objectApi, st, bookId) {
  const cardId=String(st?.card?.id||st?.meta?.card?.id||st?.pageDoc?.cardId||"");
  if (!cardId) return true;
  const held=PEN;
  if (!held || held.bookId!==bookId || held.cardId!==cardId || !held.mine || held.parked) {
    patchCards(objectApi,{error:"This card’s ownership must be checked before saving. Reopen it; your draft is kept."});
    return false;
  }
  const token=PEN_TOKEN,me=penMe(objectApi),v=await PAGELOCK.renew(objectApi,bookId,cardId,me.id);
  if(token!==PEN_TOKEN||PEN!==held)return false;
  if(!v||!v.mine||v.degraded||v.parked||!v.takenAt||(held.takenAt&&held.takenAt!==v.takenAt)){
    patchCards(objectApi,{error:"This card’s ownership changed or could not be checked. Your draft is kept; reopen before saving."});
    return false;
  }
  return true;
}

export function pageIndexFor(pages, o, prev) {
  const wanted = String(o.pageId !== undefined ? o.pageId || "" : prev.pageId || "");
  if (wanted) {
    const at = pages.findIndex((p) => String(p.id) === wanted);
    if (at >= 0) return at;
  }
  return Math.min(Math.max(0, Number(prev.index) || 0), Math.max(0, pages.length - 1));
}

export function assemblePageDoc(a) {
  const pages = a.pages;
  const idx = a.idx;
  const page = a.page;
  const doc = {
    loading: false,
    dirty: { content: false, header: false, footer: false },
    bookId: a.book.id,
    cardId: a.card.id,
    cardName: a.card.name,
    editor: a.card.editor || "",
    bookName: a.book.name,
    pen: penOf(a.card.id),
    pages: pages.map((p) => ({ id: p.id, title: p.title })),
    page: page
      ? { id: page.id, title: page.title, content: page.content, header: page.header, footer: page.footer }
      : null,
    pageId: page ? page.id : "",
    index: idx,
    count: pages.length,
    prevId: idx > 0 && pages[idx - 1] ? pages[idx - 1].id : "",
    nextId: pages[idx + 1] ? pages[idx + 1].id : "",
    bodyHtml: a.bodyHtml,
    headerHtml: a.headerHtml,
    footerHtml: a.footerHtml,
    spec: a.spec,
    paper: a.paper,
    refCandidates: a.refCandidates,
    confirmDelete: a.o.confirmDelete !== undefined ? !!a.o.confirmDelete : !!a.prev.confirmDelete,
    insert: a.o.insert !== undefined ? a.o.insert : a.prev.insert || null,
    exportDoc: a.o.exportDoc !== undefined ? a.o.exportDoc : a.prev.exportDoc || null,
  };
  if (a.warm) doc.warm = a.warm;
  return doc;
}

export async function finishPageDoc(objectApi, a) {
  const ctx = { projectId: a.env.pid, bookId: a.book.id, cardId: a.card.id, cache: {}, customTags: a.env.customTags };
  if (a.page && a.owed.length) {
    const html = {};
    for (const field of a.owed) {
      html[field] = await resolved(objectApi, a.page[field], ctx, field !== "content");
    }
    const now = cardsState(objectApi).pageDoc;
    if (now && String(now.pageId || "") === String(a.page.id)) {
      const next = Object.assign({}, now);
      let moved = false;
      for (const field of a.owed) {
        if (String((now.page && now.page[field]) || "") !== String(a.page[field] || "")) continue;
        next[ZONE_HTML[field]] = html[field];
        moved = true;
      }
      if (moved) patchCards(objectApi, { pageDoc: next });
    }
  }
  {
    const fresh = await pageEnvRefreshRefs(objectApi, a.book.id);
    const now = fresh ? cardsState(objectApi).pageDoc : null;
    if (now && String(now.cardId || "") === String(a.card.id)) {
      patchCards(objectApi, { pageDoc: Object.assign({}, now, { refCandidates: fresh }) });
    }
  }
  await warmNeighbours(objectApi, a.pages, a.idx, ctx);
}

export async function syncPageRoll(api,doc,knownMode,knownCard){
  if(!doc||!doc.pageId&&knownMode!==true){PIANO_EDITOR.stop(api);PIANO_EDITOR.patch(api,{open:false});return;}
  const on=knownMode===undefined?await PAGE_ROLL.mode(api,doc):knownMode,now=cardsState(api).pageDoc;
  if(cardsState(api).view!=="page"||!now||now.bookId!==doc.bookId||now.pageId!==doc.pageId||now.cardId!==doc.cardId)return;
  const next={...now,pianoRoll:on};patchCards(api,{pageDoc:next});
  if(on){const held=PIANO_EDITOR.state(api);if(!held.open||held.loading||!held.inline||held.pageId!==doc.pageId||held.baseline!==String(doc.page?.content||""))await PIANO_EDITOR.openPage(api,next,knownCard||cardsState(api).card);}
  else {PIANO_EDITOR.stop(api);PIANO_EDITOR.patch(api,{open:false});}
}

export async function loadPianoDoc(api,a){
  const doc=assemblePageDoc({...a,spec:null,paper:null,refCandidates:null,bodyHtml:"",headerHtml:"",footerHtml:"",warm:{}});
  doc.pianoRoll=true;
  if(a.pages&&a.pages.length)doc.rollHeader={id:a.pages[0].id,header:a.pages[0].header||""};
  const entering=a.prev.bookId!==a.book.id||a.prev.cardId!==a.card.id||a.prev.pageId!==doc.pageId||!a.prev.pianoRoll;
  pageMetaDefault(api,a.book.id,a.card.id,true,entering);
  const out={pages:a.pages.map(p=>({id:p.id,cardId:p.cardId,sortKey:p.sortKey,title:p.title})),pageDoc:doc,view:"page",card:a.card};
  if(a.o.error!==undefined)out.error=a.o.error;if(a.o.notice!==undefined)out.notice=a.o.notice;
  patchCards(api,out);await syncPageRoll(api,doc,true,a.card);
}

export async function loadAssetDoc(api,a,mode){
 const doc=assemblePageDoc({...a,spec:null,paper:null,refCandidates:null,bodyHtml:'',headerHtml:'',footerHtml:'',warm:{}});
 doc.editor=mode;doc.pianoRoll=false;
 pageMetaDefault(api,a.book.id,a.card.id,false,false);
 patchCards(api,{view:'page',card:a.card,pages:a.pages,pageDoc:doc,error:a.o.error||'',notice:a.o.notice||''});
 await syncPageRoll(api,doc,false);
 await WORKBENCH.open(api,{mode,cardId:a.card.id,remember:false});
}

export async function loadPageDoc(api,patch){
 if(api.editorCurrent&&!api.editorCurrent())return;
 const st=cardsState(api),o=patch||{},book=openBookOf(api),card=o.card||st.card,prev=st.pageDoc,session=EDITOR_SESSION.state(api);
 const arrangementRefresh=!o.reload&&o.pianoMode===undefined&&!o.editor&&st.view==='page'&&session.editor==='arrangement'&&book&&card&&session.bookId===book.id&&session.cardId===card.id;
 // A pen or metadata reply during opening belongs to that opening, not a new one.
 if(arrangementRefresh&&session.phase==='loading')return session;
 if(arrangementRefresh&&session.phase==='ready'&&ARRANGEMENT.state(api).cardId===card.id){await ARRANGEMENT.refresh(api);return EDITOR_SESSION.state(api);}
 const inPlace=o.pianoMode===undefined&&st.view==='page'&&session.phase==='ready'&&session.editor==='source'&&
  book&&card&&prev&&!prev.loading&&!prev.pianoRoll&&prev.bookId===book.id&&prev.cardId===card.id&&
  session.bookId===book.id&&session.cardId===card.id&&(!card.editor||card.editor==='source');
 if(!inPlace)return await openCardDocument(api,{...o,cardId:card?.id,pageId:o.pageId??prev?.pageId??'',reload:true});
 const root=api.editorRoot||api,token=EDITOR_SESSION.turnPage(root),scoped=EDITOR_SESSION.scope(root,token);
 try{
  await loadPageContents(scoped,{...o,card,previous:prev,inPlace:true,destination:EDITOR_CHOICE.route({editor:'source'})});
  if(scoped.editorCurrent())EDITOR_SESSION.ready(root,token,{pageId:cardsState(scoped).pageDoc?.pageId||''});
 }catch(e){if(scoped.editorCurrent())patchCards(scoped,{error:String(e.message||e)});}
 return EDITOR_SESSION.state(root);
}
async function loadPageContents(objectApi, patch) {
  const o=patch||{},book=openBookOf(objectApi),st=cardsState(objectApi),card=o.card;
  if(!book||!card)return;
  const prev=o.previous||{},t0=perfMark(objectApi),current=objectApi.editorCurrent;
  const destination=o.destination;
  const env = pageEnvNow(book.id);
  const rows = Array.isArray(o.pages)?o.pages:pageRowsNow(book.id,card.id);
  if(book.id==='WWSCODE0BOOK'){
    const pages=rows||await CARDS.listPageHeaders(objectApi,book.id,card.id);
    if(!current())return;
    if(o.pageId&&!pages.some(p=>String(p.id)===String(o.pageId)))throw Error('This source page is no longer available.');
    const idx=pageIndexFor(pages,o,prev);let page=pages[idx]||null;
    if(page&&page.content===undefined)page=await CARDS.getPage(objectApi,book.id,page.id);
    if(!current())return;
    const doc=assemblePageDoc({book,card,prev,o,pages,idx,page,spec:specFrom({pageSpec:require('lib/page-sizes.js').preset('a3')}),paper:paperFrom(null),refCandidates:[],bodyHtml:'',headerHtml:'',footerHtml:'',warm:{}});
    patchCards(objectApi,{pages:pages.map(p=>({id:p.id,title:p.title,sortKey:p.sortKey})),pageDoc:{...doc,pages:pages.map(p=>({id:p.id,title:p.title,sortKey:p.sortKey})),pianoRoll:false,readOnly:true},view:'page',card,error:'',notice:''});
    return;
  }
  const pianoMode=destination.window==='piano';
  if(rows){
    if(o.inPlace&&o.pageId&&!rows.some(p=>String(p.id)===String(o.pageId)))throw Error('This page is no longer available.');
    const idx=pageIndexFor(rows,o,prev);let page=rows[idx]||null;
    if(page&&page.content===undefined){page=await CARDS.getPage(objectApi,book.id,page.id);rows[idx]=page;}
    if(!current())return;
    if(pianoMode){await loadPianoDoc(objectApi,{book,card,prev,o,pages:rows,idx,page});perfLog(objectApi,"piano ready · page data only",t0);return;}
    if(destination.window==='asset')return await loadAssetDoc(objectApi,{book,card,prev,o,pages:rows,idx,page},destination.editor);
    if(!o.inPlace)pageMetaDefault(objectApi,book.id,card.id,false,false);
  }
  if (env && rows) {
    const idx = pageIndexFor(rows, o, prev);
    const page = rows[idx] || null;
    // Piano pages deliberately carry empty HTML; that is NOT a warm paper render.
    const sameCard = !prev.pianoRoll && String(prev.cardId || "") === String(card.id);
    const held = sameCard && prev.warm && typeof prev.warm === "object" ? prev.warm : {};
    const known = page ? held[String(page.id)] : null;
    const settled = env.refVersion === refIndexVersion(env.pid);
    const html = {};
    const owed = [];
    for (const field of ["content", "header", "footer"]) {
      const key = ZONE_HTML[field];
      const raw = page ? String(page[field] == null ? "" : page[field]) : "";
      if (!raw) {
        html[key] = "";
        continue;
      }
      if (settled && known && String(known[field] || "") === raw && typeof known[key] === "string") {
        html[key] = known[key];
        continue;
      }
      if (
        settled &&
        sameCard &&
        page &&
        String(prev.pageId || "") === String(page.id) &&
        String((prev.page && prev.page[field]) || "") === raw &&
        typeof prev[key] === "string"
      ) {
        html[key] = prev[key];
        continue;
      }
      html[key] = plainRender(raw, field !== "content");
      owed.push(field);
    }
    const doc = assemblePageDoc({
      book,
      card,
      prev,
      o,
      pages: rows,
      idx,
      page,
      spec: Object.assign({}, env.spec),
      paper: Object.assign({}, env.paper),
      refCandidates: env.refCandidates,
      bodyHtml: html.bodyHtml,
      headerHtml: html.headerHtml,
      footerHtml: html.footerHtml,
      warm: held,
    });
    const out = { pages: rows, pageDoc: doc, view: "page", card };
    if (o.error !== undefined) out.error = o.error;
    if (o.notice !== undefined) out.notice = o.notice;
    patchCards(objectApi, out);
    if(!o.inPlace){await syncPageRoll(objectApi,doc,false);WORKBENCH.patch(objectApi,{open:false});}
    perfLog(objectApi, "page WARM on screen", t0);
    if(current())await finishPageDoc(objectApi, { book, card, pages: rows, idx, page, owed, env });
    return;
  }

  try {
    console.log("[perf] page COLD (env " + (env ? "yes" : "no") + ", rows " + (rows ? "yes" : "no") + ")");
  } catch (e) {}
  const movingOn =
    String(prev.cardId || "") !== String(card.id) ||
    (o.pageId !== undefined && String(o.pageId || "") !== String(prev.pageId || ""));
  if (movingOn&&!o.inPlace) {
    patchCards(objectApi, {
      pageDoc: Object.assign({}, prev, {
        loading: true,
        pianoRoll:false,
        bookId:book.id,
        cardId: card.id,
        cardName: card.name,
        bookName: book.name,
        page: null,
        pageId: String(o.pageId || ""),
        bodyHtml: "",
        headerHtml: "",
        footerHtml: "",
      }),
    });
  }
  const pages = rows || await (CARDS.listPageHeaders?CARDS.listPageHeaders(objectApi, book.id, card.id):CARDS.listPages(objectApi, book.id, card.id));
  if(!current())return;
  if(o.inPlace&&o.pageId&&!pages.some(p=>String(p.id)===String(o.pageId)))throw Error('This page is no longer available.');
  perfLog(objectApi, "page cold: rows (graph load rides here)", t0);
  const idx = pageIndexFor(pages, o, prev);
  let page = pages[idx] || null;
  if(page&&page.content===undefined){page=await CARDS.getPage(objectApi,book.id,page.id);pages[idx]=page;}
  if(!current())return;
  if(pianoMode){await loadPianoDoc(objectApi,{book,card,prev,o,pages,idx,page});perfLog(objectApi,"piano ready · page data only",t0);return;}
  if(destination.window==='asset')return await loadAssetDoc(objectApi,{book,card,prev,o,pages,idx,page},destination.editor);
  if(!o.inPlace)pageMetaDefault(objectApi,book.id,card.id,false,false);

  let cold = null;
  try {
    cold = await pageEnvFill(objectApi, book.id);
  } catch (e) {
    objectApi.log("[page] settings unreadable: " + ((e && e.message) || e));
  }
  if (!cold) {
    cold = { pid: projectIdOf(objectApi), spec: specFrom(null, null), paper: paperFrom(null), customTags: {}, refCandidates: null, refVersion: 0 };
  }
  perfLog(objectApi, "page cold: env", t0);
  const ctx = { projectId: cold.pid, bookId: book.id, cardId: card.id, cache: {}, customTags: cold.customTags };
  const doc = assemblePageDoc({
    book,
    card,
    prev,
    o,
    pages,
    idx,
    page,
    spec: Object.assign({}, cold.spec),
    paper: Object.assign({}, cold.paper),
    refCandidates: cold.refCandidates,
    bodyHtml: page ? await resolved(objectApi, page.content, ctx, false) : "",
    headerHtml: page ? await resolved(objectApi, page.header, ctx, true) : "",
    footerHtml: page ? await resolved(objectApi, page.footer, ctx, true) : "",
  });
  perfLog(objectApi, "page cold: text resolved", t0);
  const still = cardsState(objectApi);
  if (!current() || !still.card || String(still.card.id) !== String(card.id)) return;
  const out = { pages, pageDoc: doc, view: "page", card };
  if (o.error !== undefined) out.error = o.error;
  if (o.notice !== undefined) out.notice = o.notice;
  patchCards(objectApi, out);
  if(!o.inPlace){await syncPageRoll(objectApi,doc,false);WORKBENCH.patch(objectApi,{open:false});}
  perfLog(objectApi, "page cold: on screen", t0);
  await warmNeighbours(objectApi, pages, idx, ctx);
}

export async function warmNeighbours(objectApi, pages, idx, ctx) {
  const around = [pages[idx - 1], pages[idx + 1]].filter(Boolean);
  if (!around.length) return;
  const st = cardsState(objectApi);
  const doc = st.pageDoc;
  if (!doc) return;
  const warm = {};
  for (let i = 0; i < around.length; i++) {
    let p = around[i];
    if(p.content===undefined)p=await CARDS.getPage(objectApi,ctx.bookId,p.id);
    if(!p)continue;
    const key = String(p.id);
    const had = (doc.warm || {})[key];
    if (had && had.content === (p.content || "") && had.header === (p.header || "") && had.footer === (p.footer || "")) {
      warm[key] = had;
      continue;
    }
    warm[key] = {
      content: p.content || "",
      header: p.header || "",
      footer: p.footer || "",
      bodyHtml: await resolved(objectApi, p.content, ctx, false),
      headerHtml: await resolved(objectApi, p.header, ctx, true),
      footerHtml: await resolved(objectApi, p.footer, ctx, true),
    };
  }
  const now = cardsState(objectApi);
  if (!now.pageDoc || String(now.pageDoc.pageId) !== String(doc.pageId)) return;
  patchCards(objectApi, { pageDoc: Object.assign({}, now.pageDoc, { warm }) });
}

export function paintPage(objectApi, pageId) {
  const st = cardsState(objectApi);
  const doc = st.pageDoc;
  const id = String(pageId || "");
  if (!doc || !id) return false;
  const rows = st.pages || [];
  const at = rows.findIndex((r) => String(r.id) === id);
  if (at < 0) return false;
  const row = rows[at];
  const w = (doc.warm || {})[id];
  if (!w || w.content !== (row.content || "") || w.header !== (row.header || "") || w.footer !== (row.footer || "")) {
    return false;
  }
  patchCards(objectApi, {
    pageDoc: Object.assign({}, doc, {
      page: { id: row.id, title: row.title, content: row.content, header: row.header, footer: row.footer },
      pageId: id,
      index: at,
      count: rows.length,
      prevId: at > 0 && rows[at - 1] ? rows[at - 1].id : "",
      nextId: rows[at + 1] ? rows[at + 1].id : "",
      bodyHtml: w.bodyHtml,
      headerHtml: w.headerHtml,
      footerHtml: w.footerHtml,
      confirmDelete: false,
      insert: null,
      exportDoc: null,
    }),
  });
  return true;
}

export function pageAsText(cardName, page, index) {
  const out = ["# " + String(cardName || "Card") + " — page " + (Number(index) + 1) + (page.title ? ": " + page.title : "")];
  if (page.header) out.push("[header] " + page.header);
  out.push("", String(page.content || ""));
  if (page.footer) out.push("", "[footer] " + page.footer);
  return out.join("\n");
}

export async function cardAsText(objectApi, bookId, cardId, fallbackName, depth) {
  EXPORT_POLICY.assertExportable(bookId);
  const card = await CARDS.getCard(objectApi, bookId, cardId);
  const hashes = "#".repeat(Math.min(6, Math.max(2, Number(depth) || 2)));
  const lines = [hashes + " " + String((card && card.name) || fallbackName || "Card")];
  if (card && card.status) lines.push("status: " + card.status);
  if (card && card.priority) lines.push("priority: " + card.priority);
  if (card && card.openQuestion) lines.push("open question: yes");
  if (card && card.summary) lines.push("", card.summary);
  const sections = await CARDS.listSections(objectApi, bookId, cardId);
  for (const s of sections) lines.push("", "**" + String(s.name || "") + "**", String(s.content || ""));
  const pages = await CARDS.listPages(objectApi, bookId, cardId);
  for (let i = 0; i < pages.length; i++) {
    lines.push("", "---", "", pageAsText((card && card.name) || fallbackName, pages[i], i));
  }
  return lines.join("\n");
}

// The whole-book text/markdown assembly. `cut` is the tally of what compile = N kept out — the
//   Export sheet's footer reads it.
export function emptyCut() {
  return { compile: null, folders: 0, cards: 0 };
}

export async function bookAsText(objectApi, bookId, bookName, cut) {
  EXPORT_POLICY.assertExportable(bookId);
  const tally = cut || emptyCut();
  if (!tally.compile) {
    try {
      tally.compile = await CARDS.compileFlags(objectApi, String(bookId));
    } catch (e) {
      tally.compile = null;
    }
  }
  const lines = ["# " + String(bookName || "Book")];
  // ONE descent (lib/exportwalk.js): folders first at every level, each fully descended, then that level's own cards — the cards pane's own reading order. A heading is depth + 1 hashes, a card depth + 2, exactly the shape this lane has always written. No ceiling: the text lane never had one.
  const order = await EXPORTWALK.bookOrder(objectApi, String(bookId), {
    compile: tally.compile || null,
    cardCeiling: 0,
  });
  for (const e of order.entries) {
    if (e.kind === "folder") {
      lines.push("", "#".repeat(Math.min(6, e.depth + 1)) + " " + (e.name || "Folder"));
      continue;
    }
    // COMPILE = N on a folder: the folder, its cards and its sub-folders never reach the page.
    if (e.kind === "folderCut") {
      tally.folders += 1;
      continue;
    }
    if (e.kind === "cardCut") {
      tally.cards += 1;
      continue;
    }
    lines.push("", await cardAsText(objectApi, String(bookId), e.id, e.name, e.depth + 2));
  }
  return lines.join("\n");
}

// his export ruling: a reference leaves as its result, never as the token.
export async function exportResolved(objectApi, text, bookId) {
  EXPORT_POLICY.assertExportable(bookId);
  const src = String(text === undefined || text === null ? "" : text);
  if (!src || src.indexOf("#[") === -1) return src;
  const pid = projectIdOf(objectApi);
  let customTags = {};
  try {
    customTags = (await TAGDEFS.map(objectApi, pid)) || {};
  } catch (e) {
    objectApi.log("[export] custom tags unavailable: " + ((e && e.message) || e));
  }
  try {
    return await REFS.resolvePlain(objectApi, src, {
      projectId: pid,
      bookId: bookId || "",
      cache: {},
      customTags,
      atInsertTime: true,
    });
  } catch (e) {
    objectApi.log("[export] token resolution failed — exporting as written: " + ((e && e.message) || e));
    return src;
  }
}

export async function makeResolver(objectApi, bookId) {
  EXPORT_POLICY.assertExportable(bookId);
  const pid = projectIdOf(objectApi);
  let customTags = {};
  try {
    customTags = (await TAGDEFS.map(objectApi, pid)) || {};
  } catch (e) {
    objectApi.log("[export] custom tags unavailable: " + ((e && e.message) || e));
  }
  const cache = {};
  return async function (value) {
    const src = String(value === undefined || value === null ? "" : value);
    if (!src || src.indexOf("#[") === -1) return src;
    try {
      return await REFS.resolvePlain(objectApi, src, {
        projectId: pid,
        bookId: String(bookId || ""),
        cache,
        customTags,
        atInsertTime: true,
      });
    } catch (e) {
      return src;
    }
  };
}

// his ask: the export card/page buttons carry one card out as both shapes at once.

export function exportStem(book, name) {
  const b = String((book && book.name) || "").trim();
  const n = String(name || "Card").trim();
  return (b ? b + " — " + n : n).slice(0, 70);
}

export async function cardExportDoc(objectApi, book, cardRef) {
  EXPORT_POLICY.assertExportable(book?.id);
  await EXPORTWALK.prepareDocuments(objectApi, book.id);
  const bookId = book ? book.id : "";
  const cardId = String((cardRef && cardRef.id) || "");
  const name = String((cardRef && cardRef.name) || "Card");
  const card = await CARDS.getCard(objectApi, bookId, cardId);
  const sections = await CARDS.listSections(objectApi, bookId, cardId);
  const pages = await CARDS.listPages(objectApi, bookId, cardId);
  const title = String((card && card.name) || name || "Card");
  const lines = ["# " + title];
  if (card && card.status) lines.push("status: " + card.status);
  if (card && card.priority) lines.push("priority: " + card.priority);
  if (card && card.openQuestion) lines.push("open question: yes");
  if (card && card.summary) lines.push("", card.summary);
  for (const s of sections) lines.push("", "## " + s.name, String(s.content || ""));
  for (let i = 0; i < pages.length; i++) lines.push("", "---", "", pageAsText(title, pages[i], i));
  const text = EXPORT_POLICY.isDocumentBook(bookId) ? lines.join("\n") : await exportResolved(objectApi, lines.join("\n"), bookId);
  let json = "";
  try {
    const resolve = EXPORT_POLICY.isDocumentBook(bookId) ? undefined : await makeResolver(objectApi, bookId);
    const out = await CARDJSON.oneCardAsCards(objectApi, bookId, cardId, title, [], { resolve });
    json = CARDJSON.stringify(out.cards, exportStem(book, title));
  } catch (e) {
    objectApi.log("[export] card json unavailable: " + ((e && e.message) || e));
  }
  return { requestId: "card:"+String(++EXPORT_REQUEST)+":"+String(objectApi.random()), bookId, title: "Export Card", text, json, stem: exportStem(book, title) };
}

export async function pageExportDoc(objectApi, book, cardRef, pd) {
  EXPORT_POLICY.assertExportable(book?.id);
  await EXPORTWALK.prepareDocuments(objectApi, book.id);
  const bookId = book ? book.id : "";
  const cardId = String((cardRef && cardRef.id) || "");
  const cardName = String((pd && pd.cardName) || (cardRef && cardRef.name) || "Card");
  const idx = Number(pd && pd.index) || 0;
  const raw = pageAsText(cardName, pd.page, idx);
  const text = EXPORT_POLICY.isDocumentBook(bookId) ? raw : await exportResolved(objectApi, raw, bookId);
  let json = "";
  try {
    const resolve = EXPORT_POLICY.isDocumentBook(bookId) ? undefined : await makeResolver(objectApi, bookId);
    const out = await CARDJSON.oneCardAsCards(objectApi, bookId, cardId, cardName, [], { resolve });
    const one = out.cards && out.cards[0];
    if (one) {
      const pages = one.pages || [];
      one.pages = pages.length > idx ? [pages[idx]] : pages.slice(0, 1);
      json = CARDJSON.stringify([one], exportStem(book, cardName + " — page " + (idx + 1)));
    }
  } catch (e) {
    objectApi.log("[export] page json unavailable: " + ((e && e.message) || e));
  }
  const pageTitle = String((pd && pd.page && pd.page.title) || "page " + (idx + 1));
  return { requestId: "page:"+String(++EXPORT_REQUEST)+":"+String(objectApi.random()), bookId, title: "Export Page", text, json, stem: exportStem(book, cardName + " — " + pageTitle) };
}

export async function exportBookChoice(objectApi, selectedId) {
  const active=openBookOf(objectApi),id=String(selectedId||active?.id||'');
  EXPORT_POLICY.assertExportable(id);
  const fixed=EXPORT_POLICY.DOCUMENT_BOOKS.find(b=>b.id===id);if(fixed)return fixed;
  const books=await LIB.list(objectApi,projectIdOf(objectApi));
  const book=books.find(b=>b.id===id);if(!book)throw Error('Choose a document book on this project shelf.');
  return book;
}

export async function exportCardsFor(objectApi, scope, selectedId) {
  const pid=projectIdOf(objectApi),author=who(objectApi);
  if(scope!=='all'){
    const book=await exportBookChoice(objectApi,selectedId);
    if(EXPORT_POLICY.isDocumentBook(book.id))return await DOCUMENT_EXPORT.bookDocument(objectApi,book.id,book.name,'json',{author,project:pid});
    const resolve=await makeResolver(objectApi,book.id);
    const b=await CARDBUNDLE.bookBundle(objectApi,book.id,book.name,{resolve,author,project:pid,stamp:book.name});
    return {bookId:book.id,addr:b.addr,text:b.index,files:b.entries,bundle:true,foldersLeftOut:b.foldersLeftOut||0,cardsLeftOut:b.cardsLeftOut||0,error:''};
  }
  const list=EXPORT_POLICY.exportBooks(await LIB.list(objectApi,pid)),files=[],shelf=[];
  let cards=0,books=0,skipped=0;
  for(const book of list){
    if(!EXPORT_POLICY.isDocumentBook(book.id)){
      let include=true;try{include=await CONFIG.resolveExportInclude(objectApi,book.id,pid,myId(objectApi));}catch(e){}
      if(!include){skipped++;continue;}
    }
    const result=await exportCardsFor(objectApi,'book',book.id),dir=CARDBUNDLE.slug(book.name)+'/';
    let cardCount=0;try{const index=JSON.parse(result.text);cardCount=Array.isArray(index.cards)?index.cards.length:Number(index.cards)||0;}catch(e){}
    for(const entry of result.files||[])files.push({name:dir+entry.name,text:entry.text});
    cards+=cardCount;books++;shelf.push({book:book.name,folder:dir,cards:cardCount});
  }
  files.unshift({name:'index.json',text:JSON.stringify({codexbuilder:{format:'project-bundle',exported:author},books:shelf,leftOut:skipped},null,2)});
  return {bookId:'',addr:books+' books · '+cards+' cards'+(skipped?' — '+skipped+' left out':''),text:files[0].text,files,bundle:true,error:''};
}

export async function exportTextFor(objectApi, scope, selectedId) {
  const pid=projectIdOf(objectApi);
  if(scope!=='all'){
    const book=await exportBookChoice(objectApi,selectedId);
    if(EXPORT_POLICY.isDocumentBook(book.id))return await DOCUMENT_EXPORT.bookDocument(objectApi,book.id,book.name,'text',{author:who(objectApi),project:pid});
    const cut=emptyCut(),body=await bookAsText(objectApi,book.id,book.name,cut);
    return {bookId:book.id,addr:book.name,text:await exportResolved(objectApi,body,book.id),foldersLeftOut:cut.folders,cardsLeftOut:cut.cards,error:''};
  }
  const books=EXPORT_POLICY.exportBooks(await LIB.list(objectApi,pid)),parts=[],files=[];
  let skipped=0,foldersOut=0,cardsOut=0;
  for(const book of books){
    if(!EXPORT_POLICY.isDocumentBook(book.id)){
      let include=true;try{include=await CONFIG.resolveExportInclude(objectApi,book.id,pid,myId(objectApi));}catch(e){}
      if(!include){skipped++;continue;}
    }
    const out=await exportTextFor(objectApi,'book',book.id);
    foldersOut+=out.foldersLeftOut||0;cardsOut+=out.cardsLeftOut||0;
    parts.push(out.text);files.push({name:book.name,text:out.text});
  }
  return {bookId:'',addr:files.length+' books'+(skipped?' — '+skipped+' left out':''),text:parts.join('\n\n'),files,foldersLeftOut:foldersOut,cardsLeftOut:cardsOut,error:''};
}

let EXPORT_REQUEST=0;
export async function openExport(objectApi, scope, format, selectedId) {
  require("lib/export-preview.js").clear(objectApi,"book");
  const want=scope==='all'?'all':'book',shape=format==='json'?'json':'text';
  const requestId=String(++EXPORT_REQUEST)+':'+String(objectApi.random());
  const id=want==='book'?String(selectedId||openBookOf(objectApi)?.id||''):'';
  const ui=Object.assign({},DEFAULT_UI,objectApi.getState().ui||{});
  ui.exportWin={open:true,loading:true,scope:want,format:shape,bookId:id,requestId,text:'',addr:'',files:[],error:'',author:who(objectApi)};
  ui.menu=null;objectApi.patchState({ui});SFX.play(objectApi,'ui.windowOpen');
  let out;
  try{out=shape==='json'?await exportCardsFor(objectApi,want,id):await exportTextFor(objectApi,want,id);}
  catch(e){out={addr:'',text:'',files:[],error:String(e?.message||e)};}
  const next=Object.assign({},DEFAULT_UI,objectApi.getState().ui||{});
  if(!next.exportWin?.open||next.exportWin.requestId!==requestId)return;
  next.exportWin={open:true,loading:false,scope:want,format:shape,bookId:id,requestId,bundle:!!out.bundle,text:out.text,addr:out.addr,files:out.files||[],foldersLeftOut:Number(out.foldersLeftOut||0),cardsLeftOut:Number(out.cardsLeftOut||0),error:out.error||'',author:who(objectApi)};
  objectApi.patchState({ui:next});if(!out.error)SFX.play(objectApi,'system.exportDone');
}

export async function refreshCards(objectApi, patch) {
  if(objectApi.editorCurrent&&!objectApi.editorCurrent())return;
  objectApi=EDITOR_SESSION.scope(objectApi,EDITOR_SESSION.state(objectApi),true);
  await loadFolder(objectApi, patch);
  syncEdit(objectApi).catch((e) => objectApi.log("[cards] undo status unread: " + ((e && e.message) || e)));
  const shelfBook = openBookOf(objectApi);
  if (shelfBook) {
    const lib = Object.assign({}, DEFAULT_UI.library, (objectApi.getState().ui || {}).library || {});
    const expanded = lib.expanded || {};
    if (expanded[shelfBook.id]) await loadKids(objectApi, shelfBook.id, shelfBook.id);
    const here = cardsState(objectApi);
    for (const f of here.folders || []) {
      if (expanded[String(f.id)]) await loadKids(objectApi, String(f.id), shelfBook.id);
    }
  }
  const st = cardsState(objectApi);
  if (st.modal && st.modal.card) await openModal(objectApi, st.modal.card.id);
  // A selected FOLDER refreshes its own pane row (doc + compile flag), never the card path.
  if (st.selected && String(st.selected.kind || "") === "folder")
    await loadFolderMeta(objectApi, st.selected.id, st.selected.name);
  else if (st.selected) await loadMeta(objectApi, st.selected.id);
  if (st.view === "stack" && st.stackId) {
    const book = openBookOf(objectApi);
    if (book) patchCards(objectApi, { stack: await CARDS.listStack(objectApi, book.id, st.stackId) });
  }
  if (st.view === "page" && st.card) {
    // The open card may be the very thing this refresh is about (trashed or purged). getCard answers trashed rows by design, so ask the trash too — a dead card drops the pane back to its folder instead of reopening a ghost (his report, 2026-08-28).
    const openId = String(st.card.id || "");
    const fresh = shelfBook && openId ? await CARDS.getCard(objectApi, shelfBook.id, openId) : null;
    const dead = !fresh || (await CARDS.isTrashed(objectApi, openId));
    if (dead) await loadFolder(objectApi, { card: null, pages: [], view: "folder" });
    else await loadPageDoc(objectApi, {});
  }
}

const SEARCH_DEBOUNCE = 0.2;
const SEARCH_RETRY = 0.12;
const BLANK_SEARCH = { query: "", scope: "book", loading: false, results: [], count: 0, open: false, error: "" };
let SEARCH_TOKEN = 0;
let SEARCH_BUSY = false;

// trashEmpty's latch — one purge walk at a time; a doubled press is swallowed, never raced.
let TRASH_EMPTY_BUSY = false;

export function patchSearch(objectApi, patch) {
  const st = cardsState(objectApi);
  const cur = Object.assign({}, BLANK_SEARCH, st.search || {});
  patchCards(objectApi, { search: Object.assign(cur, patch || {}) });
  return cur;
}

export function searchableBooks(objectApi) {
  const ui = objectApi.getState().ui || {};
  const lib = Object.assign({}, DEFAULT_UI.library, ui.library || {});
  const books = (lib.books || [])
    .map((b) => ({ id: String(b.id), name: String(b.name || "") }))
    .filter((b) => b.id && !RESEARCH.isPinned(b.id));
  for (const p of RESEARCH.all()) books.push({ id: p.id, name: p.name });
  return books;
}

export async function runSearch(objectApi, token) {
  if (token !== SEARCH_TOKEN) return;
  if (SEARCH_BUSY) {
    objectApi.runInSeconds(SEARCH_RETRY, () => {
      runSearch(objectApi, token).catch((e) => surface(objectApi, e));
    });
    return;
  }
  const sc = Object.assign({}, BLANK_SEARCH, cardsState(objectApi).search || {});
  const q = String(sc.query || "");
  if (!q.trim()) return void patchSearch(objectApi, { loading: false, results: [], count: 0, error: "" });
  const books = searchableBooks(objectApi);
  const open = openBookOf(objectApi);
  const scope = String(sc.scope || "book") === "all" ? "all" : "book";
  const wanted = scope === "all" || !open ? books : books.filter((b) => b.id === open.id);
  if (!wanted.length) return void patchSearch(objectApi, { loading: false, results: [], count: 0, error: "" });
  const nameOfBook = {};
  for (const b of books) nameOfBook[b.id] = b.name;
  SEARCH_BUSY = true;
  try {
    const rows = await CARDS.searchBooks(objectApi, wanted.map((b) => b.id), q, { limit: 40, total: 60 });
    if (token !== SEARCH_TOKEN) return;
    const results = rows.map((r) => ({
      id: String(r.cardId || ""),
      bookId: String(r.bookId || ""),
      bookName: String(nameOfBook[String(r.bookId || "")] || ""),
      folderId: String(r.folderId || ""),
      name: String(r.name || ""),
      summary: String(r.summary || ""),
      status: String(r.status || ""),
      priority: Number(r.priority || 0),
      openQuestion: !!r.openQuestion,
      where: String(r.where || ""),
      field: String(r.field || "text"),
      fieldIn: String(r.fieldIn || ""),
      snippet: String(r.snippet || ""),
    }));
    patchSearch(objectApi, { loading: false, results, count: results.length, error: "" });
    if (results.length) SFX.play(objectApi, "system.searchResults");
  } catch (e) {
    if (token === SEARCH_TOKEN) {
      patchSearch(objectApi, { loading: false, results: [], count: 0, error: String((e && e.message) || e) });
      objectApi.log("[search] " + String((e && e.message) || e));
    }
  } finally {
    SEARCH_BUSY = false;
  }
}

export function searchTyped(objectApi, q, patch) {
  const query = String(q == null ? "" : q);
  SEARCH_TOKEN += 1;
  const token = SEARCH_TOKEN;
  if (!query.trim()) {
    patchSearch(objectApi, Object.assign({ query: query, loading: false, results: [], count: 0, open: false, error: "" }, patch || {}));
    return;
  }
  patchSearch(objectApi, Object.assign({ query: query, loading: true, open: false, error: "" }, patch || {}));
  objectApi.runInSeconds(SEARCH_DEBOUNCE, () => {
    runSearch(objectApi, token).catch((e) => surface(objectApi, e));
  });
}

export function patchSearchWin(objectApi, patch) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.searchWin = Object.assign({}, DEFAULT_UI.searchWin, ui.searchWin || {}, patch || {});
  objectApi.patchState({ ui });
  return ui.searchWin;
}

export function searchWinState(objectApi) {
  const ui = objectApi.getState().ui || {};
  return Object.assign({}, DEFAULT_UI.searchWin, ui.searchWin || {});
}

export function shelfRows(objectApi, query) {
  if (!String(query || "").trim()) return [];
  try {
    return ASSETSHELF.search(objectApi, query, 12).map(function (r) {
      return {
        id: String(r.id || ""),
        name: String(r.name || ""),
        kind: String(r.kind || ""),
        tags: Array.isArray(r.tags) ? r.tags : [],
        thumb: String(r.thumb || ""),
        path: String(r.path || ""),
      };
    });
  } catch (e) {
    objectApi.log("[search] asset shelf unreadable: " + ((e && e.message) || e));
    return [];
  }
}

export async function runSearchWin(objectApi, token, page) {
  if (token !== SEARCH_TOKEN) return;
  if (SEARCH_BUSY) {
    objectApi.runInSeconds(SEARCH_RETRY, () => {
      runSearchWin(objectApi, token, page).catch((e) => surface(objectApi, e));
    });
    return;
  }
  const x = searchWinState(objectApi);
  const q = String(x.query || "");
  const book = openBookOf(objectApi);
  const st = cardsState(objectApi);
  SEARCH_BUSY = true;
  try {
    const rep = await SEARCH.run(objectApi, q, {
      scope: x.scope,
      matchCase: x.matchCase,
      wholeWord: x.wholeWord,
      bookId: book ? book.id : "",
      bookName: book ? book.name : "",
      folderId: String(st.folderId || ""),
      projectId: projectIdOf(objectApi),
      books: searchableBooks(objectApi),
      page: Math.max(0, Number(page) || 0),
      limit: 25,
    });
    if (token !== SEARCH_TOKEN) return;
    patchSearchWin(objectApi, {
      running: false,
      ran: !rep.tooShort,
      assets: rep.tooShort ? [] : shelfRows(objectApi, q),
      atmos: rep.tooShort ? [] : rep.atmos || [],
      groups: rep.groups || [],
      total: rep.total || 0,
      hits: rep.hits || 0,
      shown: rep.shown || 0,
      page: rep.page || 0,
      pages: rep.pages || 1,
      truncated: !!rep.truncated,
      skipped: (rep.books && rep.books.skipped) || [],
      bookName: book ? book.name : "",
      error: rep.error || ((rep.errors || []).length ? rep.errors[0].message : ""),
    });
    if ((rep.total || 0) > 0) SFX.play(objectApi, "system.searchResults");
  } catch (e) {
    if (token === SEARCH_TOKEN) {
      patchSearchWin(objectApi, {
        running: false,
        ran: true,
        groups: [],
        assets: [],
        total: 0,
        hits: 0,
        error: String((e && e.message) || e),
      });
      objectApi.log("[search] " + String((e && e.message) || e));
    }
  } finally {
    SEARCH_BUSY = false;
  }
}

export function startSearchWin(objectApi, query, opts) {
  const o = opts || {};
  const q = String(query == null ? "" : query);
  SEARCH_TOKEN += 1;
  const token = SEARCH_TOKEN;
  patchSearchWin(
    objectApi,
    Object.assign(
      {
        open: true,
        stashed: false,
        query: q,
        running: q.trim().length >= SEARCH.MIN_CHARS,
        error: "",
      },
      o.patch || {}
    )
  );
  const page = Math.max(0, Number(o.page) || 0);
  if (o.force) runSearchWin(objectApi, token, page).catch((e) => surface(objectApi, e));
  else
    objectApi.runInSeconds(SEARCH_DEBOUNCE, () => {
      runSearchWin(objectApi, token, page).catch((e) => surface(objectApi, e));
    });
}

export async function searchGoTo(objectApi, p) {
  const cardId = String(p.cardId || "");
  if (!cardId) return;
  const bookId = String(p.bookId || "");
  const book = openBookOf(objectApi);
  patchSearchWin(objectApi, { open: false, stashed: true, opened: { cardId, name: String(p.name || "") } });
  if (bookId && (!book || book.id !== bookId)) patchLibrary(objectApi, { selected: bookId, openBook: bookId });
  if (p.pageId) {
    await cardAct(objectApi, { op: "openPages", id: cardId, pageId: String(p.pageId), bookId });
    return;
  }
  if (p.folderId) await cardAct(objectApi, { op: "folderOpen", id: String(p.folderId), bookId });
  await cardAct(objectApi, { op: "openCard", id: cardId, bookId });
}

export function tileOf(st, id) {
  return (st.list || []).find((c) => String(c.id) === String(id)) || null;
}

export function paintCard(objectApi, cardId, patch) {
  const id = String(cardId || "");
  if (!id) return;
  const st = cardsState(objectApi);
  const merge = (c) => (c && String(c.id) === id ? Object.assign({}, c, patch) : c);
  const out = {};
  out.list = (st.list || []).map(merge);
  if (st.stack && st.stack.length) out.stack = st.stack.map(merge);
  if (st.meta && st.meta.card) out.meta = Object.assign({}, st.meta, { card: merge(st.meta.card) });
  if (st.modal && st.modal.card) out.modal = Object.assign({}, st.modal, { card: merge(st.modal.card) });
  patchCards(objectApi, out);
}

export function paintRow(objectApi, listKey, rowId, patch) {
  const rid = String(rowId || "");
  if (!rid) return;
  const st = cardsState(objectApi);
  const apply = (bundle) => {
    if (!bundle || !bundle[listKey]) return bundle;
    const rows = patch
      ? bundle[listKey].map((r) => (String(r.id) === rid ? Object.assign({}, r, patch) : r))
      : bundle[listKey].filter((r) => String(r.id) !== rid);
    return Object.assign({}, bundle, { [listKey]: rows });
  };
  const out = {};
  if (st.meta) out.meta = apply(st.meta);
  if (st.modal) out.modal = apply(st.modal);
  patchCards(objectApi, out);
}

export function paintTags(objectApi, cardId, change) {
  const id = String(cardId || "");
  if (!id) return;
  const st = cardsState(objectApi);
  const apply = (bundle) => {
    if (!bundle || !bundle.card || String(bundle.card.id) !== id) return bundle;
    const tags = (bundle.tags || []).slice();
    if (change.add) {
      const name = String(change.add);
      if (tags.some((t) => String(t.name).toLowerCase() === name.toLowerCase())) return bundle;
      tags.push({ id: "pending:" + name, name, pending: true });
    } else if (change.remove) {
      const gone = String(change.remove);
      return Object.assign({}, bundle, { tags: tags.filter((t) => String(t.id) !== gone) });
    }
    return Object.assign({}, bundle, { tags });
  };
  const out = {};
  if (st.meta) out.meta = apply(st.meta);
  if (st.modal) out.modal = apply(st.modal);
  patchCards(objectApi, out);
}

const DRAFT_META = { status: 1, summary: 1, priority: 1, openQuestion: 1 };

export function blankDraft(cardId) {
  return {
    cardId: String(cardId || ""),
    base: {},
    edits: {},
    tags: { add: [], remove: [] },
    secNew: [],
    secDel: [],
    secSeq: 0,
    dirty: false,
    saving: false,
    confirm: false,
  };
}

export function setDraft(objectApi, next) {
  patchCards(objectApi, { draft: null });
  if (next) patchCards(objectApi, { draft: next });
}

export function draftNormalize(field, value) {
  if (field === "priority") return Math.max(0, Math.min(5, Math.floor(Number(value) || 0)));
  if (field === "openQuestion") return value === true || value === "true";
  return String(value == null ? "" : value);
}

export function draftStored(modal, field) {
  if (!modal) return "";
  const key = String(field || "");
  if (key === "name" || DRAFT_META[key]) return draftNormalize(key, (modal.card || {})[key]);
  const parts = key.split(":");
  const list = parts[0] === "section" ? modal.sections : parts[0] === "page" ? modal.pages : null;
  if (!list || parts.length < 3) return "";
  const row = (list || []).filter((r) => String(r.id) === parts[1])[0] || {};
  return draftNormalize(key, row[parts[2]]);
}

export function draftDirty(d) {
  if (!d) return false;
  if (Object.keys(d.edits || {}).length) return true;
  if ((d.secNew || []).length || (d.secDel || []).length) return true;
  const t = d.tags || {};
  return !!((t.add || []).length || (t.remove || []).length);
}

export function draftOp(objectApi, op, p) {
  const st = cardsState(objectApi);
  const m = st.modal;
  const cardId = String((m && m.card && m.card.id) || (m && m.cardId) || "");
  const cur = st.draft && String(st.draft.cardId) === cardId ? st.draft : blankDraft(cardId);
  const t = cur.tags || {};
  const d = {
    cardId: String(cur.cardId || cardId),
    base: Object.assign({}, cur.base),
    edits: Object.assign({}, cur.edits),
    tags: { add: (t.add || []).slice(), remove: (t.remove || []).slice() },
    secNew: (cur.secNew || []).slice(),
    secDel: (cur.secDel || []).slice(),
    secSeq: Number(cur.secSeq || 0),
    dirty: false,
    saving: !!cur.saving,
    confirm: !!cur.confirm,
  };

  if (op === "draftSet") {
    const field = String(p.field || "");
    if (!field) return;
    if (!Object.prototype.hasOwnProperty.call(d.base, field)) d.base[field] = draftStored(m, field);
    const value = draftNormalize(field, p.value);
    if (value === d.base[field]) delete d.edits[field];
    else d.edits[field] = value;
  } else if (op === "draftFields") {
    // THE TAP-COMMIT SWEEP (jace, 2026-09-01 "tapping outside the name box does not accept the entry"): the modal's pointerdown ships every uncommitted [data-draft-field] box here in ONE payload under its OWN action name — a blur-commit riding cardAct in the same frame as the tap's own click is clobbered by the engine's same-frame action fold; draftFields survives it.
    if (!m) return;
    const fields = p && p.fields && typeof p.fields === "object" ? p.fields : {};
    const names = Object.keys(fields);
    if (!names.length) return;
    for (let i = 0; i < names.length; i++) {
      const field = String(names[i] || "");
      if (!field) continue;
      if (!Object.prototype.hasOwnProperty.call(d.base, field)) d.base[field] = draftStored(m, field);
      const value = draftNormalize(field, fields[names[i]]);
      if (value === d.base[field]) delete d.edits[field];
      else d.edits[field] = value;
    }
  } else if (op === "draftTag") {
    if (p.add != null) {
      const nm = String(p.add).trim();
      if (!nm) return;
      const lower = nm.toLowerCase();
      const onCard = ((m && m.tags) || []).some(
        (x) => String(x.name).toLowerCase() === lower && d.tags.remove.indexOf(String(x.id)) === -1
      );
      if (onCard || d.tags.add.some((n) => String(n).toLowerCase() === lower)) return;
      d.tags.add.push(nm);
    } else if (p.remove != null) {
      const tid = String(p.remove);
      if (tid.slice(0, 8) === "pending:") {
        const nm = tid.slice(8);
        d.tags.add = d.tags.add.filter((n) => String(n) !== nm);
      } else if (d.tags.remove.indexOf(tid) === -1) d.tags.remove.push(tid);
    } else return;
  } else if (op === "sectionNew") {
    const n = Number(d.secSeq || 0) + 1;
    d.secSeq = n;
    d.secNew.push("pending-" + n);
  } else if (op === "sectionDelete") {
    const sid = String(p.id || "");
    if (!sid) return;
    // Whatever was typed into that row goes with it — Done must not rename a row it is deleting.
    delete d.edits["section:" + sid + ":name"];
    delete d.edits["section:" + sid + ":content"];
    if (sid.slice(0, 8) === "pending-") d.secNew = d.secNew.filter((x) => String(x) !== sid);
    else if (d.secDel.indexOf(sid) === -1) d.secDel.push(sid);
  } else if (op === "draftConfirm") {
    d.confirm = p.open === true || p.open === "true";
  } else if (op === "draftDiscard") {
    patchCards(objectApi, { modal: null, draft: null });
    return;
  } else if (op === "editTryClose") {
    if (!m) return void patchCards(objectApi, { draft: null });
    if (!draftDirty(cur)) return void patchCards(objectApi, { modal: null, draft: null });
    d.confirm = true;
  } else return;

  d.dirty = draftDirty(d);
  setDraft(objectApi, d);
}

// THE STASH NET's state half (2026-09-01, the lost-page incident): the realm ships idle typing here so an app reload can hand it back. Session state only — the book never sees a stash; Save stays the one book write (his no-drafts-for-pages ruling bends for the reload net, not for the save model).
export function stashPatch(objectApi, p) {
  const pid = String((p && p.id) || "");
  if (!pid) return;
  const ui = Object.assign({}, (objectApi.getState() || {}).ui || {});
  const cur = ui.pageStash && typeof ui.pageStash === "object" ? ui.pageStash : null;
  if (p && (p.clear === 1 || p.clear === true || p.clear === "1")) {
    if (!cur) return;
    if (String(cur.pageId || "") !== pid) return;
    ui.pageStash = null;
    objectApi.patchState({ ui });
    return;
  }
  const zin = p && p.zones && typeof p.zones === "object" ? p.zones : null;
  if (!zin) return;
  const zones = {};
  let any = false;
  const names = Object.keys(zin);
  for (let i = 0; i < names.length && i < 6; i++) {
    const k = String(names[i] || "");
    if (!/^[a-z]+$/.test(k)) continue;
    let v = String(zin[names[i]] == null ? "" : zin[names[i]]);
    if (v.length > 40000) v = v.slice(0, 40000);
    zones[k] = v;
    any = true;
  }
  if (!any) return;
  const prev = cur && String(cur.pageId || "") === pid ? cur.zones || {} : {};
  ui.pageStash = { pageId: pid, zones: Object.assign({}, prev, zones) };
  objectApi.patchState({ ui });
}

export function targetId(st, d) {
  return String((d && d.id) || (st.selected && st.selected.id) || "");
}

export function editorSession(api){return EDITOR_SESSION.state(api);}
export function editorApi(api){return EDITOR_SESSION.scope(api);}
// Called only after the existing browser dirty-leave guard has released navigation.
export function leaveEditor(api){
 if(api.editorCurrent&&!api.editorCurrent())return;
 const root=api.editorRoot||api;
 EDITOR_SESSION.close(root);
 PIANO_EDITOR.stop(root);PIANO_EDITOR.patch(root,{open:false,loading:false,busy:false,loadSeq:(PIANO_EDITOR.state(root).loadSeq||0)+1});
 WORKBENCH.patch(root,{open:false,loadKey:(WORKBENCH.state(root).loadKey||0)+1});
 ARRANGEMENT.close(root);penClose(root);
}
async function loadArrangementDoc(api,book,card,folderId){
 if(book.id!==STUDIOPROJECTS.SOUND)throw Error('Arrangements open inside Sound Studio projects.');
 const root=await STUDIOPROJECTS.rootFor(api,book.id,folderId);if(!api.editorCurrent())return;
 if(!root)throw Error('Choose Music or SFX inside a sound project.');
 STUDIOPROJECTS.patch(api,{kind:'sound',bookId:book.id,folderId,projectId:root.id,name:root.name,view:'arrangement',loading:false,arrangementCardId:card?.id||''});
 await ARRANGEMENT.open(api,{bookId:book.id,folderId,cardId:card?.id||'',name:card?.name||root.name});
 if(!api.editorCurrent())return;
 const arr=ARRANGEMENT.state(api);if(arr.error)throw Error(arr.error);if(!arr.open||arr.loading)throw Error('The arrangement did not finish opening.');
 patchCards(api,{card:card||{id:arr.cardId,name:arr.name,editor:'arrangement'},pages:arr.pages||[],pageDoc:{...cardsState(api).pageDoc,loading:false,pageId:arr.pages?.[0]?.id||'',pages:arr.pages||[],editor:'arrangement'}});
}
export async function openCardDocument(api,args={}){
 if(api.editorCurrent&&!api.editorCurrent())return;
 api=api.editorRoot||api;
 const book=openBookOf(api),cardId=String(args.cardId||''),folderOnly=!cardId&&args.arrangement;
 if(!book||!cardId&&!folderOnly)return;
 const priorCards=cardsState(api),referenceTrail=EDITOR_SESSION.referenceTrailForOpen(priorCards,{...args,bookId:book.id,cardId});
 const previous=args.reload?cardsState(api).pageDoc||{}:{};
 const cached=(cardsState(api).list||[]).find(c=>c.id===cardId)||(cardsState(api).card?.id===cardId?cardsState(api).card:null);
 const openingEditor=args.arrangement?'arrangement':EDITOR_CHOICE.value(args.editor||cached?.editor);
 const token=EDITOR_SESSION.begin(api,{bookId:book.id,cardId,pageId:args.pageId,editor:openingEditor,kind:openingEditor});
 const scoped=EDITOR_SESSION.scope(api,token),current=scoped.editorCurrent;
 try{
 ARRANGEMENT.close(scoped);WORKBENCH.patch(scoped,{open:false});PIANO_EDITOR.stop(scoped);PIANO_EDITOR.patch(scoped,{open:false,loading:false});
 patchCards(scoped,{bookId:book.id,view:'page',referenceTrail,...(args.referenceLocation?{folderId:args.referenceLocation.folderId,folderPath:args.referenceLocation.folderPath,folderTrail:args.referenceLocation.folderTrail}:{}),card:{id:cardId,name:args.name||''},pages:[],menu:false,modal:null,draft:null,error:'',
  pageDoc:{loading:true,pianoRoll:false,bookId:book.id,cardId,cardName:args.name||'',bookName:book.name,pageId:String(args.pageId||''),page:null,pages:[],index:0,count:0,prevId:'',nextId:'',bodyHtml:'',headerHtml:'',footerHtml:'',warm:{}}});
  let card=null,destination=EDITOR_CHOICE.route({editor:'arrangement'}),pages;
  if(!folderOnly){
   card=await CARDS.getCard(scoped,book.id,cardId);if(!current())return;
   if(!card)throw Error('This card is no longer available');
   destination=EDITOR_CHOICE.route(book.id==='WWSCODE0BOOK'?{editor:'source'}:args.editor?{editor:EDITOR_CHOICE.validate(args.editor)}:card);EDITOR_SESSION.select(api,token,destination);
   patchCards(scoped,{card,folderId:card.folderId,pageDoc:{...cardsState(scoped).pageDoc,editor:card.editor||'',cardName:card.name}});
   if(await CARDS.isTrashed(scoped,cardId)){if(current())throw Error('This card is no longer available');return;}if(!current())return;
   // No body scan to guess an editor: blank metadata opens ordinary prose pages.
  }
  EDITOR_SESSION.select(api,token,destination);
  if(destination.error)throw Error(destination.error);
  if(book.id==='RESEARCH0BOOK'&&destination.editor!=='source')throw Error('Research is for prose. Use Sound Studio or Asset Studio.');
  patchCards(scoped,{pageDoc:{...cardsState(scoped).pageDoc,editor:destination.editor}});
  if(!folderOnly&&book.id!=='WWSCODE0BOOK'){penOpen(scoped,book.id,cardId);preparePageMeta(scoped,book.id,cardId);}
  if(destination.window==='arrangement')await loadArrangementDoc(scoped,book,card,card?.folderId||args.folderId);
  else {
   STUDIOPROJECTS.patch(scoped,{view:'files',loading:false});
   await loadPageContents(scoped,{...args,card,pages,destination,previous,error:'',notice:args.notice||''});
  }
  if(!current())return;
  const adapter=destination.window==='piano'?PIANO_EDITOR.state(scoped):destination.window==='asset'?WORKBENCH.state(scoped):null;
  if(adapter?.error)throw Error(adapter.error);
  if(adapter&&(!adapter.open||adapter.loading))throw Error('The selected editor did not finish opening.');
  // The document is ready when its editor is ready. A slow optional metadata
  // pane must not keep the opening half-finished or turn its error into a reload.
  EDITOR_SESSION.ready(api,token,{cardId:cardsState(scoped).card?.id||cardId,pageId:cardsState(scoped).pageDoc?.pageId||''});
  if(!folderOnly){
   try{if(book.id!=='WWSCODE0BOOK')await loadMeta(scoped,cardId);}catch(e){if(current()){patchCards(scoped,{metaLoading:false,metaDeferred:cardId});scoped.log('[metadata] '+String(e?.message||e));}}
   if(!current())return;markCardRead(scoped,book.id,cardId).catch(e=>scoped.log('[cards] unread marker: '+String(e)));
  }
 }catch(e){if(current()){
  const doc=cardsState(scoped).pageDoc||{};patchCards(scoped,{pageDoc:{...doc,loading:false},error:String(e.message||e)});
  EDITOR_SESSION.fail(api,token,e);
 }}
 return EDITOR_SESSION.state(api);
}

export async function cardAct(objectApi, d) {
  const p = d || {};
  const op = String(p.op || "");
  const actor = who(objectApi);
  const st = cardsState(objectApi);
  const book = openBookOf(objectApi);

  if (op === "sortMenu") return void patchCards(objectApi, { sortMenu: !st.sortMenu, moveMenu: false });
  if (op === "pageSizeMenu")
    return void patchCards(objectApi, { sizeMenu: !st.sizeMenu, sortMenu: false, moveMenu: false });

  if (op === "searchClear") return void searchTyped(objectApi, "");
  if (op === "searchScope") {
    const all = p.all === true || p.all === "true" || String(p.scope || "") === "all";
    const sc = Object.assign({}, BLANK_SEARCH, st.search || {});
    const q = String(sc.query || "");
    patchSearch(objectApi, { scope: all ? "all" : "book", open: false, loading: !!q.trim(), error: "" });
    if (!q.trim()) return;
    SEARCH_TOKEN += 1;
    const token = SEARCH_TOKEN;
    runSearch(objectApi, token).catch((e) => surface(objectApi, e));
    return;
  }
  const returnTrail=EDITOR_SESSION.referenceTrail(st);
  if(op==='referenceBack'||op==='backToFolder'&&st.view==='page'&&returnTrail.length){
    const index=p.index===undefined?returnTrail.length-1:Number(p.index);
    if(!Number.isInteger(index)||index<0||index>=returnTrail.length)return;
    const origin=returnTrail[index],bid=String(origin.bookId||'');
    const target=searchableBooks(objectApi).find(b=>b.id===bid)||(book?.id===bid?book:null);
    if(!target){surface(objectApi,new Error('The source book is no longer available.'));return;}
    if(!book||book.id!==bid)patchLibrary(objectApi,{selected:bid,openBook:bid});
    await openCardDocument(objectApi,{cardId:origin.cardId,pageId:origin.pageId,name:origin.cardName,referenceTrail:returnTrail.slice(0,index),referenceLocation:origin});
    return;
  }
  if (op === "searchOpen" || op === "referenceOpen") {
    const cardId = String(p.id || "");
    if (!cardId) return;
    const bid = String(p.bookId || "") || (book ? book.id : "");
    if (!bid) return;
    const target = searchableBooks(objectApi).find((b) => b.id === bid) || (book && book.id === bid ? book : null);
    if (!target) return;
    const origin=op==='referenceOpen'?EDITOR_SESSION.referenceOrigin(st):null;
    if(origin&&origin.bookId===bid&&origin.cardId===cardId&&(!p.pageId||String(p.pageId)===origin.pageId))return;
    const referenceTrail=origin?[...returnTrail,origin]:[];
    if(op === "searchOpen")patchSearch(objectApi, { open: true });
    if (!book || book.id !== bid) patchLibrary(objectApi, { selected: bid, openBook: bid });
    await openCardDocument(objectApi,{cardId,pageId:String(p.pageId||""),referenceTrail});
    return;
  }
  if (op === "clear") {
    if (st.modal) return void draftOp(objectApi, "editTryClose", p);
    return void patchCards(objectApi, {
      selected: null,
      menu: false,
      moveMenu: false,
      meta: null,
      folderMeta: null,
    });
  }

  // COMPILE — one op, both grains: { op: 'compileSet', kind: 'card' | 'folder', id, value }. The desk is PAID FIRST: lib/journal.js stages whole card/folder rows and its flush re-inserts them without this column, so a staged row landing after the UPDATE would answer 1 again.
  if (op === "compileSet") {
    if (!book) return;
    const kind = String(p.kind || "") === "folder" ? "folder" : "card";
    const tid = String(p.id || (st.selected && st.selected.id) || "");
    if (!tid) return;
    const on = !(p.value === false || p.value === 0 || p.value === "false" || p.value === "0");
    if (CARDS.isLockedBook(book.id)) {
      surface(objectApi, new Error("the " + String(book.name || "Codex") + " book is read-only — its compile switch is fixed"));
      return;
    }
    if (!FENCE.mayWrite()) {
      surface(objectApi, new Error(FENCE.refusalLine(FENCE.get().name)));
      return;
    }
    try {
      await JOURNAL.flush(objectApi, book.id);
      if (kind === "folder") await CARDS.setFolderCompile(objectApi, book.id, tid, on);
      else await CARDS.setCardCompile(objectApi, book.id, tid, on);
    } catch (e) {
      surface(objectApi, e);
      return;
    }
    // Re-read the flags rather than trusting the click — the pane shows what the column says.
    let flags = null;
    try {
      flags = await CARDS.compileFlags(objectApi, book.id);
    } catch (e) {
      flags = null;
    }
    const now = cardsState(objectApi);
    if (kind === "folder") {
      const fm = now.folderMeta;
      if (fm && String(fm.id) === tid) {
        const val = flags ? ((flags.folders || {})[tid] !== false) : on;
        patchCards(objectApi, { folderMeta: Object.assign({}, fm, { compile: val }), error: "" });
      }
    } else {
      const mb = now.meta;
      if (mb && mb.card && String(mb.card.id) === tid) {
        const val = flags ? ((flags.cards || {})[tid] !== false) : on;
        patchCards(objectApi, { meta: Object.assign({}, mb, { compile: val }), error: "" });
      }
    }
    return;
  }
  if (op === "draftSet" || op === "draftTag" || op === "draftConfirm" || op === "draftDiscard" || op === "editTryClose")
    return void draftOp(objectApi, op, p);
  if (op === "editClose") return void patchCards(objectApi, { modal: null, draft: null });
  if (op === "moveTo") return void patchCards(objectApi, { moveMenu: !st.moveMenu, sortMenu: false });
  if (op === "backToFolder") {
    const folderId=st.folderId||book?.id;
    leavePageForFolder(objectApi,folderId);
    const nav=EDITOR_SESSION.scope(objectApi,EDITOR_SESSION.state(objectApi),true);
    STUDIOPROJECTS.patch(nav,{view:'files',loading:false});
    try{await loadFolder(nav,{view:'folder',folderId,folderLoading:false});}catch(e){patchCards(nav,{folderLoading:false,error:String(e.message||e)});}
    return;
  }
  if (op === "sort" || op === "sortDir") {
    const sort =
      op === "sortDir"
        ? { mode: st.sort.mode, dir: st.sort.dir === "asc" ? "desc" : "asc" }
        : { mode: String(p.mode || "default"), dir: st.sort.dir };
    patchCards(objectApi, { sort, sortMenu: false });
    const ok = await CONFIG.setUser(objectApi, myId(objectApi), "sortMode", sort);
    if (!ok) throw new Error("the sort order write was refused");
    return;
  }

  if (!book) return;
  const id = targetId(st, p);

  if (op === "new") {
    const folderId = st.folderId || book.id;
    const project=STUDIOPROJECTS.state(objectApi);
    const fileEditor=STUDIOPROJECTS.kind(book.id)&&project.type?require("lib/studio-project-data.js").type(book.id,project.type)?.editor||"":"";
    if(STUDIOPROJECTS.kind(book.id)&&(folderId===book.id||folderId===project.projectId))throw Error('Choose a project and type before creating a file.');
    const row = await CARDS.createCardRow(objectApi, book.id, {
      folderId,
      name: CARDS.DEFAULT_NAME,
      editor: fileEditor,
      actor,
    });
    if (!row) return;
    const newId = row.id;

    patchCards(objectApi, {
      list: CARDS.listFolderCached(book.id, folderId),
      selected: { id: newId, kind: "card", name: row.name, size: 1 },
      menu: true,
      renaming: newId,
      error: "",
    });
    const settled = await CARDS.settleOf(book.id, newId);
    if (settled && settled.ok === false) {
      surface(objectApi, new Error(settled.error || "the card could not be written"));
    }
    // refreshCards, not bare loadFolder: the nav tree's kids cache re-reads too, so the new
    // card shows up under its expanded folder without a collapse/expand (his 11:24 report).
    await refreshCards(objectApi, {});
    await loadMeta(objectApi, newId);
    return;
  }

  if (op === "newFolder") {
    if (st.folderBusy) return;
    if(STUDIOPROJECTS.kind(book.id)&&(st.folderId||book.id)===book.id){await STUDIOPROJECTS.create(objectApi,{bookId:book.id,name:'New project',actor});await refreshCards(objectApi);return;}
    const parentId = String(st.folderId || book.id);
    const depth = (st.folderPath || []).length;
    patchCards(objectApi, { folderBusy: true, error: "" });
    try {
      const row = await CARDS.createFolderRow(objectApi, book.id, {
        folderId: parentId,
        name: CARDSUI.folderDefaultName(depth, st.depthLabels),
        actor,
      });
      if (!row) return;
      // A cold cache answers this concat EMPTY — painting that wipes the pane and the new tile's name editor with it ("creating a folder does not let you set its name"). Paint the quick list only when it has something; either way `renaming` rides ahead, and refreshCards's SQL paint below draws the tile wearing the editor.
      const quick = CARDS.listFoldersCached(book.id, parentId).concat(CARDS.listFolderCached(book.id, parentId));
      patchCards(
        objectApi,
        Object.assign(
          {
            selected: { id: row.id, kind: "folder", name: row.name, size: 1 },
            menu: true,
            renaming: row.id,
            meta: null,
            error: "",
          },
          quick.length ? { list: quick } : {}
        )
      );
      const settled = await CARDS.folderSettleOf(book.id, row.id);
      if (settled && settled.ok === false) {
        surface(objectApi, new Error(settled.error || "the folder could not be written"));
      }
      // refreshCards, not bare loadFolder — the nav pane reads its own kids cache, and a new
      // folder that skips it stays invisible in the tree until a collapse/expand.
      await refreshCards(objectApi, {});
    } finally {
      patchCards(objectApi, { folderBusy: false });
    }
    return;
  }

  if (op === "folderOpen") {
    const target = String(p.id || "");
    if (!target) return;
    if (st.folderLoading) return;
    const other = String(p.bookId || "");
    let into = book;
    if (other && other !== book.id) {
      const lib = Object.assign({}, DEFAULT_UI.library, (objectApi.getState().ui || {}).library || {});
      const picked = (lib.books || []).find((b) => String(b.id) === other);
      if (picked) {
        patchLibrary(objectApi, { selected: other, openBook: other });
        into = { id: picked.id, name: picked.name };
      }
    }
    leavePageForFolder(objectApi, target);
    patchCards(objectApi, { folderLoading: true });
    try {
      await loadFolder(
        objectApi,
        { folderId: target, selected: null, menu: false, moveMenu: false, meta: null, modal: null, view: "folder", error: "" },
        into
      );
    } finally {
      patchCards(objectApi, { folderLoading: false });
    }
    return;
  }

  if (op === "folderUp") {
    if (st.folderLoading) return;
    const trail = st.folderTrail || [];
    const parent = trail.length > 1 ? String(trail[trail.length - 2].id) : String(book.id);
    patchCards(objectApi, { folderLoading: true });
    try {
      await loadFolder(objectApi, {
        folderId: parent,
        selected: null,
        menu: false,
        moveMenu: false,
        meta: null,
        view: "folder",
        error: "",
      });
    } finally {
      patchCards(objectApi, { folderLoading: false });
    }
    return;
  }

  if (op === "renameStart") {
    if (!id) return;
    const rt = tileOf(st, id);
    const renameId = rt && rt.isStack && rt.topId ? String(rt.topId) : id;
    patchCards(objectApi, { renaming: renameId, menu: false, moveMenu: false });
    return;
  }

  if (op === "select") {
    const tile = tileOf(st, id);
    if (!tile) return;
    if (tile.isFolder) {
      // his ruling: selecting fills the metadata pane — a folder fills it with the FOLDER pane.
      patchCards(objectApi, {
        selected: { id: tile.id, kind: "folder", name: tile.name, size: 1 },
        menu: true,
        moveMenu: false,
        sortMenu: false,
        meta: null,
        metaLoading: false,
        folderMeta: null,
      });
      await loadFolderMeta(objectApi, tile.id, tile.name);
      return;
    }
    patchCards(objectApi, {
      selected: {
        id: tile.id,
        kind: tile.isStack ? "stack" : "card",
        name: tile.name,
        size: tile.stackSize || 1,
      },
      menu: true,
      moveMenu: false,
      sortMenu: false,
      meta: null,
      metaLoading: true,
      folderMeta: null,
    });
    // his ruling: selecting fills the metadata pane, it never opens it.
    await loadMeta(objectApi, tile.id);
    return;
  }

  if (op === "stackOpen") {
    const tile = tileOf(st, id);
    if (!tile || !tile.isStack) return;
    leaveEditor(objectApi);objectApi=EDITOR_SESSION.scope(objectApi,EDITOR_SESSION.state(objectApi),true);
    const members = await CARDS.listStack(objectApi, book.id, tile.stackId);
    patchCards(objectApi, { view: "stack", stackId: tile.stackId, stack: members, menu: false });
    return;
  }

  if (op === "open" || op === "openPages") {
    const tile = tileOf(st,id) || (st.stack||[]).find(c=>String(c.id)===id);
    if(tile?.isFolder)return await cardAct(objectApi,{op:"folderOpen",id:tile.id});
    const cardId=tile?.isStack?String(tile.topId||tile.id):id;
    return await openCardDocument(objectApi,{cardId,pageId:String(p.pageId||""),name:tile?.name||""});
  }

  if (op === "hold" || op === "edit") {
    const tile = tileOf(st, id);
    if (tile && tile.isFolder) return await cardAct(objectApi, { op: "renameStart", id: tile.id });
    // his rule: press-and-hold opens a stack; the edit window belongs to a single card.
    if (op === "hold" && tile && tile.isStack) return await cardAct(objectApi, { op: "stackOpen", id: tile.id });
    const cardId = tile && tile.isStack ? String(tile.topId || tile.id) : id;
    if (!cardId) return;
    await openModal(objectApi, cardId);
    return;
  }

  // his ask: an Export button beside Edit in folder view — text copy / markdown file / json file.
  if (op === "exportCardClose") {require("lib/export-preview.js").clear(objectApi,"card");return void patchCards(objectApi, { exportDoc: null });}
  if (op === "exportCard") {
    const tile = tileOf(st, id);
    if (tile && tile.isFolder) return;
    const cardId = tile && tile.isStack ? String(tile.topId || tile.id) : id || String(st.card ? st.card.id : "");
    if (!cardId || !book) return;
    patchCards(objectApi, {
      error: "",
      exportDoc: { loading: true, title: "Export Card", text: "gathering this card…", json: "", stem: "" },
    });
    try {
      const doc = await cardExportDoc(objectApi, book, { id: cardId, name: (tile && tile.name) || "" });
      patchCards(objectApi, { exportDoc: doc });
    } catch (e) {
      patchCards(objectApi, { exportDoc: null });
      surface(objectApi, e);
    }
    return;
  }

  if (op === "openCard") {
    const other = String(p.bookId || "");
    if (other && other !== book.id) {
      patchLibrary(objectApi, { selected: other, openBook: other });
      await loadFolder(objectApi, { selected: null, menu: false, view: "folder", modal: null });
    }
    await loadMeta(objectApi, id);
    const now = cardsState(objectApi);
    const tile = tileOf(now, id);
    if (tile) patchCards(objectApi, { selected: { id: tile.id, kind: tile.isStack ? "stack" : "card", name: tile.name, size: tile.stackSize || 1 }, menu: true });
    return;
  }

  if (op === "shiftLeft" || op === "shiftRight") {
    const moving = tileOf(st, id);
    const mine = (st.list || []).filter((c) => !!(c && c.isFolder) === !!(moving && moving.isFolder));
    const order = (moving && moving.isFolder ? mine : CARDSUI.sortTiles(mine, st.sort)).map((c) => String(c.id));
    const nb = CARDSUI.wrapMove(order, id, op === "shiftLeft" ? "left" : "right");
    if (!nb) return;
    if (moving && moving.isFolder) await CARDS.moveFolder(objectApi, book.id, id, Object.assign({ actor }, nb));
    else await CARDS.moveCard(objectApi, book.id, id, Object.assign({ actor }, nb));
    await refreshCards(objectApi);
    return;
  }

  if (op === "drop") {
    const opts = { actor };
    if (p.beforeId) opts.beforeId = String(p.beforeId);
    else if (p.afterId) opts.afterId = String(p.afterId);
    const dragged = tileOf(st, id);
    try {
      if (dragged && dragged.isFolder) await CARDS.moveFolder(objectApi, book.id, id, opts);
      else await CARDS.moveCard(objectApi, book.id, id, opts);
    } catch (e) {
      surface(objectApi, e);
    }
    await refreshCards(objectApi);
    return;
  }

  if (op === "moveToFolder") {
    const moving = tileOf(st, id);
    const rowBook = String(p.bookId || "");
    if (rowBook && rowBook !== String(book.id)) {
      surface(objectApi, new Error("that row is in another book — open it first, then drag"));
      await refreshCards(objectApi, { moveMenu: false });
      return;
    }
    const dest = String(p.folderId || book.id);
    const inFlight = Object.assign({}, st.moving || {});
    inFlight[String(id)] = true;
    patchCards(objectApi, { moving: inFlight, moveMenu: false });
    try {
      if (moving && moving.isFolder) await CARDS.moveFolder(objectApi, book.id, id, { folderId: dest, actor });
      else await CARDS.moveCard(objectApi, book.id, id, { folderId: dest, actor });
    } catch (e) {
      surface(objectApi, e);
    }
    const settled = Object.assign({}, ((objectApi.getState().ui || {}).cards || {}).moving || {});
    delete settled[String(id)];
    await refreshCards(objectApi, { moveMenu: false, moving: settled });
    return;
  }

  // his rule: the trash can is a door, not a hole — Put Back returns the card to the folder it came from.
  if (op === "trashOpen" || op === "trashReload") {
    const ui0 = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
    ui0.trash = { open: true, loading: true, items: [], bookName: book.name || "", error: "" };
    objectApi.patchState({ ui: ui0 });
    let t = null;
    let error = "";
    try {
      t = await TRASH.list(objectApi, book.id, { bookName: book.name || "" });
    } catch (err) {
      error = String((err && err.message) || err);
    }
    const ui1 = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
    if (!ui1.trash || !ui1.trash.open) return;
    ui1.trash = {
      open: true,
      loading: false,
      items: (t && t.items) || [],
      entries: (t && t.entries) || null,
      count: (t && t.count) || 0,
      cap: (t && t.cap) || TRASH.CAP,
      full: !!(t && t.full),
      remaining: (t && t.remaining) || 0,
      retention: (t && t.retention) || TRASH.RETENTION,
      bookName: book.name || "",
      error,
      // getWallClockTime hands back a Date — state must be JSON-safe (the engine flagged this exact
      // write), so it is coerced to epoch ms before it rides the patch.
      now: Number(objectApi.getWallClockTime ? objectApi.getWallClockTime() : 0) || 0,
    };
    objectApi.patchState({ ui: ui1 });
    return;
  }

  if (op === "trashClose") {
    const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
    ui.trash = { open: false, loading: false, items: [], error: "" };
    objectApi.patchState({ ui });
    return;
  }

  if (op === "trashRestore" || op === "trashPurge") {
    if (!id) return;
    const uiA = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
    if (uiA.trash && uiA.trash.open) {
      uiA.trash = Object.assign({}, uiA.trash, {
        items: (uiA.trash.items || []).filter((it) => String(it.id) !== id),
      });
      objectApi.patchState({ ui: uiA });
    }
    const entityType = String(p.entityType || "card");
    try {
      if (op === "trashRestore") {
        await JOURNAL.flush(objectApi);
        const r = await TRASH.restore(objectApi, book.id, id, { entityType, actor });
        if (r && r.note) patchCards(objectApi, { notice: String(r.note) });
      } else {
        if (p.confirm !== true && p.confirm !== "true") return;
        await TRASH.purge(objectApi, book.id, id, { entityType, actor });
      }
    } catch (err) {
      surface(objectApi, err);
    }
    await refreshCards(objectApi);
    return await cardAct(objectApi, { op: "trashReload" });
  }

  if (op === "trashEmpty") {
    // ONE run at a time: a doubled press used to race the purge walk — the echo counted a half-emptied can and refused with the smaller number (his 2026-08-29 "always says 9"). And a refusal RELOADS the window before painting its error, so the prompt the author retypes from always names the live count — the stale-11-vs-live-9 trap dies here.
    if (TRASH_EMPTY_BUSY) return;
    TRASH_EMPTY_BUSY = true;
    let refusal = "";
    try {
      const res = await TRASH.empty(objectApi, book.id, { confirm: String(p.confirm || ""), actor });
      for (const err of (res && res.errors) || []) surface(objectApi, new Error(String(err.message || err)));
      if (res && res.note) patchCards(objectApi, { notice: String(res.note) });
    } catch (err) {
      refusal = String((err && err.message) || err);
    } finally {
      TRASH_EMPTY_BUSY = false;
    }
    await refreshCards(objectApi);
    await cardAct(objectApi, { op: "trashReload" });
    if (refusal) {
      const uiX = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
      uiX.trash = Object.assign({}, uiX.trash || {}, { error: refusal });
      objectApi.patchState({ ui: uiX });
    }
    return;
  }

  if (op === "trash") {
    const doomed = tileOf(st, id);
    patchCards(objectApi, {
      list: (st.list || []).filter((t) => String(t.id) !== String(id)),
      selected: null,
      menu: false,
      meta: null,
      modal: null,
    });
    try {
      const r = await TRASH.trash(objectApi, book.id, id, {
        entityType: doomed && doomed.isFolder ? "folder" : doomed && doomed.isStack ? "stack" : "card",
        actor,
      });
      if (r && r.note) patchCards(objectApi, { notice: String(r.note) });
    } catch (e) {
      surface(objectApi, e);
    }
    patchCards(objectApi, { selected: null, menu: false, meta: null, modal: null });
    // his report (2026-08-28): the nav tree must wake on deletes too — full refresh, not a bare re-read.
    await refreshCards(objectApi, { error: "" });
    return;
  }

  if (op === "duplicate") {
    const tile = tileOf(st, id);
    if (tile && tile.isFolder) {
      try {
        await CARDS.duplicateFolder(objectApi, book.id, id, { actor });
      } catch (e) {
        surface(objectApi, e);
      }
      await refreshCards(objectApi);
      return;
    }
    if (tile && tile.isStack) await CARDS.duplicateStack(objectApi, book.id, tile.stackId, { actor });
    else await CARDS.duplicateCard(objectApi, book.id, id, { actor });
    await refreshCards(objectApi);
    return;
  }

  if (op === "dupVersion") {
    const tile = tileOf(st, id);
    const stackId = (tile && tile.stackId) || st.stackId || "";
    const srcId = (tile && (tile.topId || tile.id)) || id;
    try {
      await CARDS.duplicateCard(objectApi, book.id, srcId, { actor, stackId: stackId || null });
    } catch (e) {
      surface(objectApi, e);
    }
    await refreshCards(objectApi);
    return;
  }

  if (op === "dupStack") {
    const tile = tileOf(st, id);
    await CARDS.duplicateStack(objectApi, book.id, (tile && tile.stackId) || st.stackId || id, { actor });
    await refreshCards(objectApi);
    return;
  }

  if (op === "newStack") {
    await CARDS.createStackFrom(objectApi, book.id, id, { actor });
    await refreshCards(objectApi);
    return;
  }

  if (op === "cycle") {
    const tile = tileOf(st, id);
    const stackId = String((tile && tile.stackId) || st.stackId || "");
    if (!stackId) return;
    await CARDS.cycleStack(objectApi, book.id, stackId, String(p.dir || "left") === "right" ? "right" : "left", {
      actor,
    });
    await refreshCards(objectApi);
    return;
  }

  if (op === "primary") {
    const stackId = String(st.stackId || (tileOf(st, id) || {}).stackId || "");
    const newId = String(id || "");
    if (!stackId || !newId || stackId === newId) return;
    const wasStack = st.view === "stack";
    if (wasStack) patchCards(objectApi, { stackId: newId });
    try {
      await CARDS.setStackPrimary(objectApi, book.id, stackId, newId, { actor });
    } catch (e) {
      if (wasStack) patchCards(objectApi, { stackId });
      surface(objectApi, e);
    }
    await refreshCards(objectApi);
    return;
  }

  if (op === "shiftUp" || op === "shiftDown") {
    patchCards(objectApi, {
      error:
        "Move Up / Move Down inside a stack needs a member-reorder verb on CardRepository — cycle rotates the whole stack instead.",
    });
    return;
  }

  const modalId = String((st.modal && st.modal.card && st.modal.card.id) || id);

  if (op === "draftDone") {
    const dr = st.draft && String(st.draft.cardId) ? st.draft : null;
    const cardId = String((dr && dr.cardId) || modalId);
    if (!dr || !cardId) return void patchCards(objectApi, { modal: null, draft: null });
    if (dr.saving) return;
    if (!draftDirty(dr)) return void patchCards(objectApi, { modal: null, draft: null });
    setDraft(objectApi, Object.assign({}, dr, { saving: true, confirm: false }));

    const e = dr.edits || {};
    const has = (k) => Object.prototype.hasOwnProperty.call(e, k);
    const META_KEYS = ["status", "summary", "priority", "openQuestion"];
    const newName = has("name") && String(e.name).trim() ? String(e.name) : "";

    const paint = {};
    if (newName) paint.name = newName;
    META_KEYS.forEach((k) => {
      if (has(k)) paint[k] = e[k];
    });
    if (Object.keys(paint).length) paintCard(objectApi, cardId, paint);
    const tags = dr.tags || {};
    (tags.add || []).forEach((nm) => paintTags(objectApi, cardId, { add: String(nm) }));
    (tags.remove || []).forEach((tid) => paintTags(objectApi, cardId, { remove: String(tid) }));

    let failed = null;
    try {
      if (newName) await CARDS.renameCard(objectApi, book.id, cardId, newName, { actor });
      const meta = {};
      META_KEYS.forEach((k) => {
        if (has(k)) meta[k] = e[k];
      });
      if (Object.keys(meta).length) await CARDS.setMeta(objectApi, book.id, cardId, meta, { actor });
      const adds = tags.add || [];
      for (let i = 0; i < adds.length; i++) {
        const tagId = await CARDS.ensureTag(objectApi, book.id, String(adds[i]), { actor });
        await CARDS.addTag(objectApi, book.id, cardId, tagId, { actor });
      }
      const drops = tags.remove || [];
      for (let i = 0; i < drops.length; i++) {
        await CARDS.removeTag(objectApi, book.id, cardId, String(drops[i]), { actor });
      }
      const keys = Object.keys(e);
      for (let i = 0; i < keys.length; i++) {
        const parts = keys[i].split(":");
        const val = String(e[keys[i]] == null ? "" : e[keys[i]]);
        if (parts[0] === "page" && parts[2] === "title")
          await CARDS.setPageChrome(objectApi, book.id, parts[1], { title: val }, { actor });
      }

      const pend = (dr.secNew || []).map(String);
      const gone = (dr.secDel || []).map(String);
      const secEdit = (sid, part, fallback) =>
        Object.prototype.hasOwnProperty.call(e, "section:" + sid + ":" + part)
          ? String(e["section:" + sid + ":" + part] == null ? "" : e["section:" + sid + ":" + part])
          : fallback;
      const secPlan = { creates: [], renames: [], contents: [], deletes: gone };
      for (let i = 0; i < pend.length; i++) {
        secPlan.creates.push({
          tempId: pend[i],
          name: secEdit(pend[i], "name", ""),
          content: secEdit(pend[i], "content", ""),
        });
      }
      for (let i = 0; i < keys.length; i++) {
        const parts = keys[i].split(":");
        if (parts[0] !== "section" || parts.length < 3) continue;
        const sid = parts[1];
        if (pend.indexOf(sid) !== -1 || gone.indexOf(sid) !== -1) continue;
        const val = String(e[keys[i]] == null ? "" : e[keys[i]]);
        if (parts[2] === "name") secPlan.renames.push({ id: sid, name: val });
        else if (parts[2] === "content") secPlan.contents.push({ id: sid, content: val });
      }
      const secRes = await SECTIONS.commitSections(objectApi, book.id, cardId, secPlan, {
        actor,
        projectId: projectIdOf(objectApi),
        cardName: String((st.modal && st.modal.card && st.modal.card.name) || ""),
      });
      if (!secRes.ok) throw new Error((secRes.failed || []).join(" · ") || "the sections were refused");
    } catch (err) {
      failed = err;
    }

    if (failed) {
      surface(objectApi, failed);
      const live = cardsState(objectApi).draft;
      setDraft(objectApi, Object.assign({}, live || dr, { saving: false, confirm: false, dirty: true }));
      await refreshCards(objectApi);
      return;
    }
    patchCards(objectApi, { modal: null, draft: null });
    await refreshCards(objectApi);
    return;
  }

  if (op === "renameCancel") {
    patchCards(objectApi, { renaming: null });
    return;
  }

  if (op === "rename") {
    const next = String(p.value || "");
    const target = tileOf(st, id);
    // A stale pane must not misroute a folder commit into the card lane (the "rename does
    // nothing" night: no tile → card branch → "no card" on a real folder). When the painted
    // list misses, ask the book which kind this id is.
    let isFolder = !!(target && target.isFolder);
    if (!target) {
      try {
        isFolder = !!(await CARDS.getFolder(objectApi, book.id, id));
      } catch (e) {
        isFolder = false;
      }
    }
    if (isFolder) {
      if (String(st.renaming || "") === String(id)) patchCards(objectApi, { renaming: null });
      if (next && (!target || next !== target.name)) {
        paintCard(objectApi, id, { name: next });
        try {
          await CARDS.renameFolder(objectApi, book.id, id, next, { actor });
        } catch (e) {
          surface(objectApi, e);
        }
      }
      await refreshCards(objectApi);
      return;
    }
    const wasInline = String(st.renaming || "") === String(modalId);
    if (wasInline) patchCards(objectApi, { renaming: null });
    if (next) {
      paintCard(objectApi, modalId, { name: next });
      await CARDS.renameCard(objectApi, book.id, modalId, next, { actor });
    }
    await refreshCards(objectApi);
    return;
  }

  if (op === "meta") {
    const field = String(p.field || "");
    const patch = {};
    if (field === "priority") patch.priority = Number(p.value) || 0;
    else if (field === "openQuestion") patch.openQuestion = p.value === true || p.value === "true";
    else if (field === "status" || field === "summary") patch[field] = String(p.value == null ? "" : p.value);
    else return;
    paintCard(objectApi, modalId, patch);
    await CARDS.setMeta(objectApi, book.id, modalId, patch, { actor });
    await refreshCards(objectApi);
    return;
  }

  if (op === "tagAdd") {
    const name = String(p.value || "").trim();
    if (!name) return;
    paintTags(objectApi, modalId, { add: name });
    const tagId = await CARDS.ensureTag(objectApi, book.id, name, { actor });
    await CARDS.addTag(objectApi, book.id, modalId, tagId, { actor });
    await refreshCards(objectApi);
    return;
  }

  if (op === "tagRemove") {
    paintTags(objectApi, modalId, { remove: String(p.tagId || "") });
    await CARDS.removeTag(objectApi, book.id, modalId, String(p.tagId || ""), { actor });
    await refreshCards(objectApi);
    return;
  }

  // his ruling: sections are created in memory first, then sent as one batch on Done.
  const inModal = !!(st.modal && st.modal.card && String(st.modal.card.id) === modalId && modalId);

  if (op === "sectionNew") {
    if (inModal) return void draftOp(objectApi, "sectionNew", p);
    await CARDS.createSection(objectApi, book.id, modalId, { name: "New Section", actor });
    await refreshCards(objectApi);
    return;
  }

  if (op === "sectionRename") {
    paintRow(objectApi, "sections", p.id, { name: String(p.value || "") });
    await CARDS.renameSection(objectApi, book.id, String(p.id || ""), String(p.value || ""), { actor });
    await refreshCards(objectApi);
    return;
  }

  if (op === "sectionSet") {
    paintRow(objectApi, "sections", p.id, { content: String(p.value == null ? "" : p.value) });
    await CARDS.setSectionContent(objectApi, book.id, String(p.id || ""), String(p.value == null ? "" : p.value), {
      actor,
    });
    await refreshCards(objectApi);
    return;
  }

  if (op === "sectionDelete") {
    if (inModal) return void draftOp(objectApi, "sectionDelete", p);
    paintRow(objectApi, "sections", p.id, null);
    await CARDS.deleteSection(objectApi, book.id, String(p.id || ""), { actor });
    await refreshCards(objectApi);
    return;
  }

  const inPage = st.view === "page" && !!st.card;
  const pd = st.pageDoc || null;
  const curPage = String((pd && pd.pageId) || "");

  if (PEN_GATED[op] && penDenies(st)) return;
  if (inPage && penWriteAction(op) && !(await penBeforeWrite(objectApi, st, book.id))) return;

  if (op === "penDrop") return void (await penPark(objectApi));
  if (op === "penGrab") return void (await penClaim(objectApi));

  if (op === "pageNew") {
    // his ruling: adding a page greys the screen out and blocks further clicks, with a wheel (pageBusy).
    if (cardsState(objectApi).pageBusy) return;
    const target = inPage && st.card ? st.card.id : modalId;
    const opts = { title: "", actor };
    if (inPage && curPage) opts.afterId = curPage;
    patchCards(objectApi, { pageBusy: true, error: "" });
    try {
      const madeId = await CARDS.createPage(objectApi, book.id, target, opts);
      if (inPage) await loadPageDoc(objectApi, { pageId: madeId, confirmDelete: false, insert: null, exportDoc: null, error: "", notice: "" });
      else await refreshCards(objectApi);
    } catch (e) {
      surface(objectApi, e);
    } finally {
      patchCards(objectApi, { pageBusy: false });
    }
    return;
  }

  if (op === "pageTitle") {
    paintRow(objectApi, "pages", p.id, { title: String(p.value || "") });
    await CARDS.setPageChrome(objectApi, book.id, String(p.id || ""), { title: String(p.value || "") }, { actor });
    await refreshCards(objectApi);
    return;
  }

  if (op === "pageContent" || op === "pageHeader" || op === "pageFooter") {
    const id = String(p.id || curPage || "");
    if (!id) return;
    const value = String(p.value == null ? "" : p.value);
    const field = op === "pageContent" ? "content" : op === "pageHeader" ? "header" : "footer";
    if (inPage) paintZone(objectApi, id, field, value);
    try {
      if (field === "content") await CARDS.setPageContent(objectApi, book.id, id, value, { actor });
      else await CARDS.setPageChrome(objectApi, book.id, id, field === "header" ? { header: value } : { footer: value }, { actor });
    } catch (e) {
      if (inPage) patchCards(objectApi, { error: "that page write didn't land: " + ((e && e.message) || e) });
      else await refreshCards(objectApi);
      return;
    }
    if (inPage) {
      clearZoneMark(objectApi, id, field, value);
      await resolveZone(objectApi, id, field, value);
    } else await refreshCards(objectApi);
    return;
  }

  if (op === "pageSave") {
    const id = String(p.id || curPage || "");
    const then = p.then && typeof p.then === "object" ? p.then : null;
    if (penDenies(st)) {
      if (then) await resumeNav(objectApi, then);
      return;
    }
    const fields = [];
    if (p.content !== undefined) fields.push(["content", String(p.content == null ? "" : p.content)]);
    if (p.header !== undefined) fields.push(["header", String(p.header == null ? "" : p.header)]);
    if (p.footer !== undefined) fields.push(["footer", String(p.footer == null ? "" : p.footer)]);
    if (id && fields.length) {
      if (inPage) for (let i = 0; i < fields.length; i++) paintZone(objectApi, id, fields[i][0], fields[i][1]);
      const chrome = {};
      try {
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i][0];
          const v = fields[i][1];
          if (f === "content") await CARDS.setPageContent(objectApi, book.id, id, v, { actor });
          else chrome[f] = v;
        }
        if (Object.keys(chrome).length) await CARDS.setPageChrome(objectApi, book.id, id, chrome, { actor });
        await JOURNAL.flush(objectApi, book.id);
      } catch (e) {
        if (inPage) patchCards(objectApi, { error: "that page write didn't land: " + ((e && e.message) || e) });
        else await refreshCards(objectApi);
        return;
      }
      if (inPage) {
        for (let i = 0; i < fields.length; i++) {
          clearZoneMark(objectApi, id, fields[i][0], fields[i][1]);
          await resolveZone(objectApi, id, fields[i][0], fields[i][1]);
        }
      } else await refreshCards(objectApi);
      // These words just reached the book — drop the stash net so a later reload can't re-serve
      // them. (The early-return above keeps the net up when the write FAILED — that's the point.)
      try {
        const uiNow = Object.assign({}, (objectApi.getState() || {}).ui || {});
        if (uiNow.pageStash && String(uiNow.pageStash.pageId || "") === id) {
          uiNow.pageStash = null;
          objectApi.patchState({ ui: uiNow });
        }
      } catch (e) {}
    }
    if (then) await resumeNav(objectApi, then);
    return;
  }

  if(op === "pageEditor"){
    const doc=st.pageDoc;
    if(!doc||p.bookId!==doc.bookId||p.cardId!==doc.cardId||p.pageId!==doc.pageId)return;
    return await require('lib/editor-switch.js').run(objectApi,{...p,editor:p.value},async()=>{
    const mode=require('lib/editor-registry.js').validate(p.value);if(!mode)return;
    if(doc.bookId==='RESEARCH0BOOK'&&mode!=='source')throw Error('Research is for prose. Use Sound studio or Asset Studio.');
    if(doc.bookId==='ASSET00STUDIO'&&require('lib/workbench-data.js').MODES.includes(mode)){
      const handled=await studioWorkspaceInner(objectApi,{op:'editor',bookId:doc.bookId,cardId:doc.cardId,pageId:doc.pageId,editor:mode});
      if(handled!==false)return;
      const live=cardsState(objectApi).pageDoc;
      if(!live||live.bookId!==doc.bookId||live.cardId!==doc.cardId||live.pageId!==doc.pageId)return;
    }
    if(!(await penBeforeWrite(objectApi,st,book.id)))throw Error(cardsState(objectApi).error||'The page pen is unavailable; saved content is unchanged.');
    await PAGE_ROLL.setMode(objectApi,doc,mode==='piano',mode);
    const cur=cardsState(objectApi).pageDoc;if(!cur||cur.bookId!==doc.bookId||cur.cardId!==doc.cardId||cur.pageId!==doc.pageId)return;
    WORKBENCH.patch(objectApi,{open:false});
    PIANO_EDITOR.stop(objectApi);PIANO_EDITOR.patch(objectApi,{open:false,loading:false,busy:false,loadSeq:(PIANO_EDITOR.state(objectApi).loadSeq||0)+1});
    patchCards(objectApi,{pageDoc:{...cur,pianoLoading:false,pianoRoll:mode==='piano'}});
    await loadPageDoc(objectApi,{pianoMode:mode==='piano'});
    return;
    });
  }


  if (op === "pageLive") {
    const id = String(p.pageId || p.id || curPage || "");
    if (!id || !inPage) return;
    const field = PASTE.fieldOf(p.field);
    const value = String(p.value == null ? "" : p.value);
    const doc = st.pageDoc;
    if (!doc || String(doc.pageId || "") !== id) return;
    if (String((doc.page && doc.page[field]) || "") === value) return;
    paintZone(objectApi, id, field, value);
    await resolveZone(objectApi, id, field, value);
    return;
  }

  if (op === "refPickCommit") {
    const id = String(p.pageId || p.id || curPage || "");
    if (!id) return;
    const field = PASTE.fieldOf(p.field);
    const value = String(p.value == null ? "" : p.value);
    if (inPage) paintZone(objectApi, id, field, value);
    try {
      if (field === "content") await CARDS.setPageContent(objectApi, book.id, id, value, { actor });
      else await CARDS.setPageChrome(objectApi, book.id, id, field === "header" ? { header: value } : { footer: value }, { actor });
    } catch (e) {
      if (inPage) patchCards(objectApi, { error: "that page write didn't land: " + ((e && e.message) || e) });
      return;
    }
    if (inPage) {
      clearZoneMark(objectApi, id, field, value);
      await resolveZone(objectApi, id, field, value);
    }
    return;
  }

  if (op === "pagePaste") {
    const id = String(p.pageId || p.id || curPage || "");
    if (!id) return;
    const field = PASTE.fieldOf(p.field);
    const value = String(p.value == null ? "" : p.value);
    const chunks = (Array.isArray(p.chunks) ? p.chunks : []).map((c) => String(c == null ? "" : c));
    if (inPage) paintZone(objectApi, id, field, value);
    try {
      await CARDS.pastePages(objectApi, book.id, id, { field, value, chunks, actor });
    } catch (e) {
      if (inPage) patchCards(objectApi, { error: "that paste didn't land: " + ((e && e.message) || e) });
      else await refreshCards(objectApi);
      return;
    }
    if (inPage) await loadPageDoc(objectApi, { pageId: id, error: "", notice: PASTE.noteFor(chunks.length) });
    else await refreshCards(objectApi);
    return;
  }

  if (op === "pageGo") {
    await loadPageDoc(objectApi, {
      pageId: String(p.id || ""),
      confirmDelete: false,
      insert: null,
      exportDoc: null,
      error: "",
      notice: "",
    });
    return;
  }

  if (op === "pageDeleteAsk") return void (await loadPageDoc(objectApi, { confirmDelete: true, insert: null, exportDoc: null }));
  if (op === "pageDeleteCancel") return void (await loadPageDoc(objectApi, { confirmDelete: false }));

  if (op === "pageDelete") {
    const id = String(p.id || curPage || "");
    if (!id) return;
    const goTo = pd ? String(pd.prevId || pd.nextId || "") : "";
    if (!inPage) paintRow(objectApi, "pages", id, null);
    await CARDS.deletePage(objectApi, book.id, id, { actor });
    if (inPage) await loadPageDoc(objectApi, { pageId: goTo, confirmDelete: false, insert: null, exportDoc: null, error: "", notice: "" });
    else await refreshCards(objectApi);
    return;
  }

  if (op === "pageMoveLeft" || op === "pageMoveRight") {
    if (!pd || !curPage) return;
    const opts = op === "pageMoveLeft" ? { beforeId: String(pd.prevId || "") } : { afterId: String(pd.nextId || "") };
    if (!opts.beforeId && !opts.afterId) return;
    await CARDS.reorderPage(objectApi, book.id, curPage, Object.assign({ actor }, opts));
    await loadPageDoc(objectApi, { pageId: curPage, error: "", notice: "" });
    return;
  }

  if (op === "pageDup" || op === "pageDupCard") {
    if (!pd || !pd.page) return;
    const src = pd.page;
    let cardId = st.card.id;
    let notice = "duplicated into this card";
    if (op === "pageDupCard") {
      cardId = await CARDS.createCard(objectApi, book.id, {
        folderId: st.folderId || book.id,
        name: String(st.card.name || CARDS.DEFAULT_NAME) + " — page " + (Number(pd.index) + 1),
        actor,
      });
      notice = "duplicated into a new card in this folder";
    }
    const madeId = await CARDS.createPage(objectApi, book.id, cardId, {
      title: src.title,
      actor,
      afterId: op === "pageDup" ? src.id : undefined,
    });
    if (src.content) await CARDS.setPageContent(objectApi, book.id, madeId, src.content, { actor });
    if (src.header || src.footer) {
      await CARDS.setPageChrome(objectApi, book.id, madeId, { header: src.header, footer: src.footer }, { actor });
    }
    if (op === "pageDup") await loadPageDoc(objectApi, { pageId: madeId, error: "", notice });
    else {
      // pageDupCard mints a CARD — the nav tree must see it (his 2026-08-28 report).
      await refreshCards(objectApi, { error: "" });
      await loadPageDoc(objectApi, { notice });
    }
    return;
  }

  if (op === "pageExport" || op === "cardExport") {
    if (!pd) return;
    if (op === "pageExport") {
      if (!pd.page) return;
      await loadPageDoc(objectApi, {
        exportDoc: await pageExportDoc(objectApi, book, st.card, pd),
        insert: null,
        confirmDelete: false,
      });
      return;
    }
    await loadPageDoc(objectApi, {
      exportDoc: await cardExportDoc(objectApi, book, st.card),
      insert: null,
      confirmDelete: false,
    });
    return;
  }

  // his doc 13 ruling: the popup queries the hierarchy through CardRepository — ReferenceResolver is not involved in autocomplete.
  if (op === "insertTag") {
    let mine = [];
    try {
      mine = await TAGDEFS.insertItems(objectApi, projectIdOf(objectApi));
    } catch (e) {
      objectApi.log("[tags] custom insert list unavailable: " + ((e && e.message) || e));
    }
    await loadPageDoc(objectApi, {
      insert: { kind: "tag", items: PAGEUI.TAG_ITEMS.concat(mine || []) },
      exportDoc: null,
      confirmDelete: false,
    });
    return;
  }

  if (op === "insertRef") {
    const list = await CARDS.listFolder(objectApi, book.id, st.folderId || book.id);
    const items = list
      .filter((c) => String(c.id) !== String(st.card.id))
      .map((c) => ({
        label: c.name,
        hint: c.isStack ? "stack of " + (c.stackSize || 2) : "card",
        insert: "#[" + c.id + "]",
      }));
    await loadPageDoc(objectApi, { insert: { kind: "ref", items }, exportDoc: null, confirmDelete: false });
    return;
  }

  if (op === "insertClose") return void (await loadPageDoc(objectApi, { insert: null }));
  if (op === "exportClose") {require("lib/export-preview.js").clear(objectApi,"card");return void (await loadPageDoc(objectApi, { exportDoc: null }));}

  if (op === "pageSpec") {
    if (!pd || !pd.spec) return;
    const field = String(p.field || "");
    if (["marginL", "marginR", "headerH", "footerH", "leading"].indexOf(field) < 0) return;
    const before = Object.assign({}, pd.spec);
    const next = Object.assign({}, pd.spec);
    next[field] = PL.fromPx(Number(p.px) || 0, before.unit);
    const v = PL.validate(next);
    if (!v.ok) {
      patchCards(objectApi, { error: v.error || "that page spec doesn't validate" });
      await loadPageDoc(objectApi, {});
      return;
    }
    const ok = await CONFIG.setBook(objectApi, book.id, "pageSpec", v.spec);
    if (!ok) throw new Error("the page spec write was refused for book " + book.id);
    pageEnvDrop(book.id);
    await CHANGELOG.record(objectApi, {
      type: "UPDATE_PAGE_SPEC",
      projectId: projectIdOf(objectApi),
      bookId: book.id,
      targetId: book.id,
      targetType: "book",
      before: { spec: before, field },
      after: { spec: v.spec, field },
      actor,
      undoable: true,
    });
    await loadPageDoc(objectApi, { error: "", notice: "" });
    return;
  }

  if (op === "pageFormat") {
    if (!pd || !pd.spec) return void patchCards(objectApi, { sizeMenu: false });
    const before = Object.assign({}, pd.spec);
    const built = PL.applyFormat(before, { id: p.id, w_mm: p.w_mm, h_mm: p.h_mm, orient: p.orient });
    if (!built) {
      patchCards(objectApi, { sizeMenu: false, error: "that isn't a page size this app knows." });
      return;
    }
    const v = PL.validate(built.spec);
    if (!v.ok) {
      patchCards(objectApi, { sizeMenu: false, error: v.error || "that page size doesn't validate" });
      return;
    }
    const SPEC_KEYS = ["unit", "width", "height", "marginL", "marginR", "headerH", "footerH", "leading"];
    if (SPEC_KEYS.every((k) => String(before[k]) === String(v.spec[k]))) {
      return void patchCards(objectApi, { sizeMenu: false });
    }
    const reflow=await PAPER_FORMAT.plan(objectApi,book.id,st.card.id,v.spec);
    patchCards(objectApi, { sizeMenu: false });
    const reflowed=await PAPER_FORMAT.apply(objectApi,reflow);
    const ok = await CONFIG.setBook(objectApi, book.id, "pageSpec", v.spec);
    if (!ok) throw new Error("the page size write was refused for book " + book.id);
    pageEnvDrop(book.id);
    await CHANGELOG.record(objectApi, {
      type: "UPDATE_PAGE_SPEC",
      projectId: projectIdOf(objectApi),
      bookId: book.id,
      targetId: book.id,
      targetType: "book",
      before: { spec: before, field: "format", ...(reflow?{sourcePages:reflow.before}:{}) },
      after: { spec: v.spec, field: "format", ...(reflow?{sourcePages:reflowed}:{}) },
      actor,
      undoable: true,
    });
    await loadPageDoc(objectApi, { error: "", notice: "" });
    return;
  }
}

let ROSTER = null;

// Checks happen on open/focus or a committed room revision, never idle SQL polling.
let REPOSITORY_CHECK = null;
const ROOM_REVISIONS_CHECKED = {};
export async function bookrevPoll(objectApi) {
  if (REPOSITORY_CHECK) return REPOSITORY_CHECK;
  const book = openBookOf(objectApi);
  if (!book || objectApi.getState().ui?.booting) return;
  const bid = String(book.id), folder = String(cardsState(objectApi).folderId || '');
  const token = EDITOR_SESSION.state(objectApi);
  const current = () => EDITOR_SESSION.same(objectApi, token) &&
    String(openBookOf(objectApi)?.id || '') === bid && String(cardsState(objectApi).folderId || '') === folder;
  // Folder navigation need not change an editor generation. Guard the root too,
  // so nested loaders cannot paint an old folder after a newer navigation.
  const root = new Proxy(objectApi, { get(target, key) {
    if (key === 'editorRoot') return undefined;
    if (key === 'patchState') return delta => { if (current()) target.patchState(delta); };
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
  const api = EDITOR_SESSION.scope(root, token, true);
  const pass = (async () => {
    await JOURNAL.flush(api, bid);
    const v = await BOOKREV.read(api, bid);
    if (!current()) return { stale: true };
    if (BOOKREV.seen(bid) === v.rev) return { changed: false, rev: v.rev };
    // A cold revision memo must not bless an already-resident stale graph.
    GRAPH.invalidate(bid);
    pageEnvDrop(bid);
    await loadFolder(api);
    if (!current()) return { stale: true };
    const expanded = api.getState().ui?.library?.expanded || {};
    if (expanded[bid]) await loadKids(api, bid, bid);
    for (const f of cardsState(api).folders || []) {
      if (!current()) return { stale: true };
      if (expanded[String(f.id)]) await loadKids(api, String(f.id), bid);
    }
    if (!current()) return { stale: true };
    // Never reload an open page or steal a pen. Arrangement.refresh only compares
    // the saved baseline and raises a notice; its private draft/audio stay put.
    if (ARRANGEMENT.state(api).open) await ARRANGEMENT.refresh(api);
    if (!current()) return { stale: true };
    BOOKREV.markSeen(bid, v.rev);
    const ui = objectApi.getState().ui || {};
    objectApi.patchState({ ui: { ...ui, repositorySync: { bookId: bid, rev: v.rev, status: 'refreshed', draftsKept: true } } });
    return { changed: true, rev: v.rev };
  })();
  REPOSITORY_CHECK = pass;
  try { return await pass; } finally { if (REPOSITORY_CHECK === pass) REPOSITORY_CHECK = null; }
}

export function repositoryRoomNotice(api) {
  if (REPOSITORY_CHECK || api.getState().ui?.booting) return false;
  const b = String(openBookOf(api)?.id || '');
  const stamp = b && api.world?.state?.wwsBookRevisions?.[b];
  if (!stamp || !stamp.rev || ROOM_REVISIONS_CHECKED[b] === stamp.rev) return false;
  ROOM_REVISIONS_CHECKED[b] = stamp.rev;
  if (BOOKREV.seen(b) === stamp.rev) return false;
  bookrevPoll(api).catch(e => api.log('[repository] refresh: ' + String(e?.message || e)));
  return true;
}

// The stamp carries a user id (or 'savi'); the notice wants a name. The roster answers when the
// writer is in the room; otherwise the pen's holder name; otherwise a plain word.
export function revName(objectApi, by) {
  const id = String(by || "");
  if (!id) return "Someone";
  if (id === "savi") return "Savi";
  try {
    for (const p of objectApi.getPlayers() || []) {
      const prof = objectApi.getProfile(ROWS.rowId(p)) || {};
      const pn = ROWS.field(prof, "displayName") || ROWS.field(p, "displayName");
      if (String(ROWS.field(prof, "userId") || ROWS.field(p, "userId") || "") === id && pn) return String(pn);
    }
  } catch (e) {
  }
  if (PEN && String(PEN.holder || "") === id && PEN.holderName) return String(PEN.holderName);
  return "Someone";
}

export const updateSchedule = { every: { seconds: 1 } };

export function update(objectApi, dt) {
  try {
    JOURNAL.rest(objectApi, 90);
  } catch (e) {
  }
  // One room-state comparison, no SQL unless a committed revision changed.
  repositoryRoomNotice(objectApi);
  try {
    const here = (objectApi.getPlayers() || []).map((p) => ROWS.rowId(p)).filter(Boolean);
    if (ROSTER === null) {
      ROSTER = here;
    } else {
      const me = String(objectApi.id || "");
      for (const id of here) if (id !== me && ROSTER.indexOf(id) < 0) SFX.play(objectApi, "coop.peerJoin");
      for (const id of ROSTER) if (id !== me && here.indexOf(id) < 0) SFX.play(objectApi, "coop.peerLeave");
      ROSTER = here;
    }
  } catch (e) {
  }
  try {
    sweepStaleChip(objectApi);
  } catch (e) {
  }
}

let SESSION_BOOTED = false;

// True from module birth until the first sessionHello is ruled on. A latch rather than a read of SESSION_BOOTED at hello time: a click can beat the hello through onInput on a fresh page, and that click must not make the boot look warm.
let FRESH_CLIENT = true;

// One startup in flight, no background retry ladder. Known queue refusals are recoverable on
// the next visible reopening; unknown-outcome writes are never blindly reissued.
let BOOT_IN_FLIGHT = null;
let BOOT_FAILURE = null;

export function boot(objectApi, reopening = false) {
  SESSION_BOOTED = true;
  if (BOOT_IN_FLIGHT) return BOOT_IN_FLIGHT;
  if (BOOT_FAILURE) {
    if (!reopening || !SCHEMA.startupRecoverable(BOOT_FAILURE) || !SCHEMA.retryStartup()) return Promise.resolve(false);
    BOOT_FAILURE = null;
  }
  const pass = (async () => {
    const drawn = !!(((objectApi.getState().ui || {}).library || {}).loaded);
    if (!drawn) busyClear(objectApi);
    patchDoorState(objectApi, drawn ? { error: null } : { booting: true, error: null });
    try {
      await bootRun(objectApi);
      const r = await SCHEMA.probeFts(objectApi);
      objectApi.notifyDmOnce("fts5-probe", r.fts5
        ? `[db] FTS5 is available — MATCH query returned ${r.matched} row(s).`
        : `[db] FTS5 is NOT available here: ${r.error}`);
      patchDoorState(objectApi, { booting: false, error: null });
      return true;
    } catch (e) {
      BOOT_FAILURE = e;
      const msg = String(e?.message || e || "the shelf could not be opened");
      const next = require("lib/studio-startup.js").stale(e)
        ? " — this tab is behind the world's latest saves. Reload the page; nothing was written."
        : SCHEMA.startupRecoverable(e)
        ? " — database busy; close and reopen the studio to retry. Your draft is kept."
        : " — startup paused; no write was retried. Your draft is kept.";
      objectApi.log("[boot] " + msg + next);
      patchDoorState(objectApi, { booting: false, error: msg + next });
      return false;
    } finally { BOOT_IN_FLIGHT = null; bootLatch(objectApi, false); }
  })();
  BOOT_IN_FLIGHT = pass;
  return pass;
}

// ui.booting — one flag, one owner. Kept off ui.door on purpose: door is the loading screen's word.
export function bootLatch(objectApi, on) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  if (!!ui.booting === !!on) return;
  ui.booting = !!on;
  objectApi.patchState({ ui });
}

export async function bootRun(objectApi) {
  CARDS.forget();
  try {
    SEARCH.forget();
    TRASH.forget();
  } catch (e) {
  }
  await CONFIG.ensure(objectApi);
  await SCHEMA.ensureProject(objectApi);
  const prefs = await CONFIG.getUser(objectApi, myId(objectApi));
  publishFontScale(objectApi, prefs);
  SHELF_OWNER = "";
  const owner = await shelfOwner(objectApi);
  try {
    await PROJECTS.ensure(objectApi);
  } catch (e) {
    objectApi.log("[shelf] the built-in project could not be ensured: " + ((e && e.message) || e));
    throw e;
  }
  // his rule: the shelf is never read periodically — one read on open, then on book operations.
  {
    try {
      LIB.forgetProject(PROJECTS.PROJECT_ID);
    } catch (e) {
    }
    await refresh(objectApi);
  }
  applySavedSort(objectApi, prefs);
  patchDoorState(objectApi, { booting: false, error: null });
  // his ruling: the primer only ever plays once, from the play button, never automatically — and it burns on completion.
  try {
    RESEARCH.open(objectApi)
      .then(() => warmPinnedBooks(objectApi))
      .catch((e) => objectApi.log(`[research] could not be opened: ${(e && e.message) || e}`));
  } catch (e) {
    objectApi.log(`[research] could not be prepared: ${(e && e.message) || e}`);
  }
  
  
  await loadConfig(objectApi);
  try {
    const sp = await SEARCH.prefs(objectApi, myId(objectApi));
    patchSearchWin(objectApi, sp);
  } catch (e) {
    objectApi.log("[search] preferences unreadable: " + ((e && e.message) || e));
  }
  // The join warm — re-reads the open book's rows and heals a held page view (a card trashed in a
  // past session must never reopen from yesterday's state). It logs its own failures.
  warmOpenBook(objectApi);
}

export function applySavedSort(objectApi, prefs) {
  try {
    const saved = prefs && prefs.sortMode;
    if (saved && typeof saved === "object" && saved.mode) {
      patchCards(objectApi, { sort: { mode: String(saved.mode), dir: saved.dir === "desc" ? "desc" : "asc" } });
    }
  } catch (e) {
    objectApi.log("[cards] sort mode unreadable: " + ((e && e.message) || e));
  }
}

const SHELF_REFUSAL = {
  key: "that code doesn't open anything",
  closed: "this shelf is closed",
  denied: "the author has denied you",
  unknown: "that shelf could not be opened",
};

export function shelfOwnerName(objectApi, ownerId) {
  try {
    const players = objectApi.getPlayers() || [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i] || {};
      if (String(ROWS.field(p, "userId") || "") === String(ownerId)) return ROWS.rowName(p);
    }
  } catch (e) {
  }
  return "";
}

export async function adoptShelfView(objectApi) {
  await refresh(objectApi, {
    selected: null,
    openBook: null,
    metaFor: null,
    renaming: null,
  });
  patchCards(objectApi, {
    bookId: null,
    bookName: "",
    folderId: null,
    folderPath: [],
    list: [],
    selected: null,
    menu: false,
    meta: null,
    modal: null,
    view: "folder",
    error: "",
  });
}

export async function myShelf(objectApi) {
  patchShelf(objectApi, { owner: "", mine: true, name: "", error: "", canWrite: true });
  SHELF_OWNER = "";
  FENCE.mine();
  await adoptShelfView(objectApi);
}

export async function openShelf(objectApi, payload) {
  const p = payload || {};
  const key = String(p.key || "");
  let owner = String(p.ownerId || "");
  try {
    if (!owner && key) owner = await SHELFACCESS.ownerOfKey(objectApi, key);
    if (!owner) {
      patchShelf(objectApi, { error: SHELF_REFUSAL.key });
      SFX.play(objectApi, "ui.error");
      return;
    }
    const verdict = await SHELFACCESS.tryShelf(objectApi, owner, key);
    if (!verdict || !verdict.ok) {
      patchShelf(objectApi, { error: SHELF_REFUSAL[(verdict || {}).reason] || SHELF_REFUSAL.unknown });
      SFX.play(objectApi, "ui.error");
      return;
    }
    if (verdict.reason === "mine") {
      await myShelf(objectApi);
      return;
    }
    const ownerName = shelfOwnerName(objectApi, owner);
    patchShelf(objectApi, { owner: owner, mine: false, name: ownerName, error: "" });
    SHELF_OWNER = "";
    // his ruling: reading is the default; the deny list shuts the door, only the allow list opens writing.
    const pen = await FENCE.evaluate(objectApi, owner, ownerName);
    patchShelf(objectApi, { canWrite: !!pen.ok });
    await adoptShelfView(objectApi);
    const now = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
    if (now.coop && typeof now.coop === "object") {
      now.coop = Object.assign({}, now.coop, { dialog: null, error: null });
      objectApi.patchState({ ui: now });
    }
    SFX.play(objectApi, "ui.windowOpen");
  } catch (e) {
    patchShelf(objectApi, { error: String((e && e.message) || e) });
  }
}

// his ask: the room parks while the window is up — renderResolution [128,72] parked, [3840,2160] awake.
const ROOM_PARK_RES = [128, 72];
const ROOM_FULL_RES = [3840, 2160];
let roomParkState = null;

export function parkRoom() {}

export function patchShootWin(objectApi, patch) {
  const st = cardsState(objectApi);
  // his ruling: no Preview button; ui.cards.shoot is the one home both surfaces read.
  const shoot = Object.assign({}, st.shoot || {}, patch || {});
  patchCards(objectApi, { shoot: shoot });
  return shoot;
}

export function shootTarget(objectApi, p) {
  const st = cardsState(objectApi);
  const modal = st.modal || {};
  const card = modal.card || st.card || {};
  const book = openBookOf(objectApi);
  return {
    bookId: String((p && p.bookId) || modal.bookId || (book && book.id) || st.bookId || ""),
    cardId: String((p && p.cardId) || card.id || ""),
    name: String(card.name || ""),
  };
}

export async function shootAct(objectApi, verb, p) {
  const t = shootTarget(objectApi, p);
  // ONE PRESS, EVERY TARGET (his ruling, 2026-09-01: "Cinema and film kit should not be chosen between.
  const dep = SHOOT.dependency(objectApi);
  const filmDep = SHOOT.filmDependency(objectApi);

  if (verb === "strike") {
    let struck = 0;
    try {
      struck = SHOOT.strike(objectApi);
    } catch (e) {
      patchShootWin(objectApi, { dep, filmDep, verb: "strike", error: String((e && e.message) || e) });
      return;
    }
    try {
      const players = objectApi.getPlayers() || [];
      const mine = players.find((pl) => pl && pl.userId === objectApi.userId) || players[0] || null;
      if (mine) {
        const cut = Number((objectApi.getObjectState(mine.id) || {}).sbStageCut || 0);
        objectApi.patchObjectState(mine.id, { sbStage: null, sbStageCut: cut + 1 });
      }
    } catch (e) {
    }
    patchShootWin(objectApi, {
      dep,
      filmDep,
      verb: "strike",
      shots: 0,
      warnings: [],
      error: "",
      filmError: "",
      filmLine: "",
      line: struck === 1 ? "One thing struck from the set." : struck + " things struck from the set.",
    });
    SFX.play(objectApi, "ui.buttonPress");
    return;
  }

  if (!t.bookId || !t.cardId) {
    patchShootWin(objectApi, { dep, verb, error: "Open a card first — a shoot reads one scene card." });
    return;
  }

  const key = "shoot:" + t.cardId;
  busyStart(objectApi, key, verb === "shoot" ? "Shooting “" + (t.name || "the scene") + "”…" : "Reading the set…");
  patchShootWin(objectApi, { dep, filmDep, verb, target: null, busy: true, error: "", filmError: "" });
  // Both lanes re-read the same scene, so shared parse warnings would land twice — exact-string merge.
  const mergeWarn = (a, b) => {
    const out = Array.isArray(a) ? a.slice() : [];
    const more = Array.isArray(b) ? b : [];
    for (let i = 0; i < more.length; i++) if (out.indexOf(more[i]) < 0) out.push(more[i]);
    return out;
  };
  try {
    if (verb === "shoot") {
      const outbox = [];
      const both = await SHOOT.shootAll(objectApi, t.bookId, t.cardId, {
        cinema: {
          dress: true,
          play: true,
          send: (name, data) => outbox.push({ action: String(name || ""), data: data || {} }),
        },
      });
      const res = both.cinema;
      const fres = both.film;
      let stagedOn = null;
      if (!res.error) {
        const imp = outbox.find((o) => /libImport/i.test(o.action));
        if (imp) {
          try {
            const clip = JSON.parse((imp.data && imp.data.data) || "{}");
            const players = objectApi.getPlayers() || [];
            const mine = players.find((pl) => pl && pl.userId === objectApi.userId) || players[0] || null;
            if (mine) {
              objectApi.patchObjectState(mine.id, {
                sbStage: {
                  token: objectApi.getTick(),
                  nodes: clip.nodes || [],
                  sequence: clip.sequence || [],
                  effects: clip.effects || [],
                  // his ruling: the soundtrack arms on the player when the picture starts, never earlier.
                  cues: Array.isArray(res.cues) ? res.cues : [],
                  cueEffects: Array.isArray(res.cueEffects) ? res.cueEffects : [],
                  // mid-take set swaps (multiple sets on a card) — staged only when there IS a swap
                  segments: Array.isArray(res.segments) && res.segments.length > 1 ? res.segments : [],
                  // ACTION BEATS (jace, 2026-09-01: "a thing for animations to be played/triggered for specified subjects") — shoot() resolves each beat to the set piece's spec id + clip + second; the courier fires them on the director's own clock, like the swaps.
                  actions: Array.isArray(res.actions) ? res.actions : [],
                  seconds: Number(res.seconds || 0),
                },
              });
              stagedOn = mine.id;
            }
          } catch (e) {
            objectApi.log("[shoot] stage failed: " + String((e && e.message) || e));
          }
        }
      }
      patchShootWin(objectApi, {
        dep: res.dep || dep,
        filmDep: fres.dep || filmDep,
        verb: "shoot",
        file: fres.file || null,
        busy: false,
        shots: Number(res.shots || 0),
        placed: Number(res.placed || 0),
        struck: Number(res.struck || 0),
        skipped: Number(res.skipped || 0),
        seconds: Number(res.seconds || 0),
        warnings: mergeWarn(res.warnings, fres.warnings),
        error: String(res.error || ""),
        filmError: String(fres.error || ""),
        line: SHOOT.summary(res),
        filmLine: fres.error ? "" : SHOOT.filmSummary(fres),
        cues: Array.isArray(res.cues) ? res.cues : [],
        deliver: [],
      });
      // one lane landing is a landing — the error chord only when BOTH refused.
      SFX.play(objectApi, res.error && fres.error ? "ui.error" : "system.exportDone");
      // his ruling: Worldwright Studio minimizes till the shoot is done, and the clip waits until he is out of godmode.
      if (!res.error && stagedOn && Number(res.seconds || 0) > 0) {
        setShootMin(objectApi, { seconds: Number(res.seconds || 0), playerId: stagedOn });
      }
    } else {
      const both = await SHOOT.statusAll(objectApi, t.bookId, t.cardId);
      const res = both.cinema;
      const fres = both.film;
      patchShootWin(objectApi, {
        dep: res.dep || dep,
        filmDep: fres.dep || filmDep,
        verb: "preview",
        file: fres.file || null,
        busy: false,
        shots: Number(res.shots || 0),
        placed: 0,
        struck: 0,
        skipped: Number(res.skipped || 0),
        seconds: Number(res.seconds || 0),
        warnings: mergeWarn(res.warnings, fres.warnings),
        error: String(res.error || ""),
        filmError: String(fres.error || ""),
        line: res.error ? String(res.error) : SHOOT.summary(Object.assign({}, res, { placed: (res.clip ? res.shots : 0) })),
        filmLine: fres.error ? "" : SHOOT.filmSummary(fres),
        cues: Array.isArray(res.cues) ? res.cues : [],
        deliver: [],
      });
      SFX.play(objectApi, res.error && fres.error ? "ui.error" : "ui.buttonPress");
    }
  } catch (e) {
    const msg = String((e && e.message) || e);
    objectApi.log("[shoot] " + msg);
    patchShootWin(objectApi, { dep, filmDep, verb, busy: false, error: msg });
    SFX.play(objectApi, "ui.error");
  } finally {
    busyEnd(objectApi, key);
  }
}

// js lands nothing in a plan), compileLand WRITES. js is a pure fragment that only reads it.
export function patchCompile(objectApi, patch) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.compile = Object.assign({}, DEFAULT_UI.compile, ui.compile || {}, patch || {});
  objectApi.patchState({ ui });
  return ui.compile;
}

export function compileState(objectApi) {
  const ui = objectApi.getState().ui || {};
  return Object.assign({}, DEFAULT_UI.compile, ui.compile || {});
}

// The designation write: one call to the foundation's verb, then the tiles re-read so the mark on the
// folder is what the COLUMN says, never what the click hoped for.
export async function docSetPress(objectApi, p) {
  const book = openBookOf(objectApi);
  if (!book) return;
  const st = cardsState(objectApi);
  const id = String((p && p.id) || (st.selected && st.selected.id) || "");
  if (!id) return;
  await CARDS.setFolderDoc(objectApi, book.id, id, String((p && p.doc) || ""));
  await refreshCards(objectApi);
  SFX.play(objectApi, "ui.buttonPress");
}

// THE PLAN. The window opens on a skeleton the instant the finger lifts (wait-state family) and the
// plan drops into it when the read comes back; a ui.busy notice carries the long job.
export async function compilePress(objectApi, p) {
  const book = openBookOf(objectApi);
  if (!book) return;
  const st = cardsState(objectApi);
  const id = String((p && p.folderId) || (p && p.id) || (st.selected && st.selected.id) || "");
  if (!id) return;
  const tile = (st.list || []).find((t) => t && String(t.id) === id) || null;
  const name = String((p && p.name) || (tile && tile.name) || (st.selected && st.selected.name) || "this folder");
  patchCompile(objectApi, {
    open: true,
    folderId: id,
    folderName: name,
    kind: String((tile && tile.doc) || ""),
    plan: null,
    results: null,
    landing: false,
    error: "",
  });
  SFX.play(objectApi, "ui.windowOpen");
  const key = "compile:" + id;
  busyStart(objectApi, key, "Reading “" + name + "”…");
  try {
    const plan = await COMPILE.compilePlan(objectApi, book.id, id);
    const now = compileState(objectApi);
    if (!now.open || String(now.folderId) !== id) return;
    patchCompile(objectApi, {
      plan: plan,
      kind: String(plan.kind || ""),
      folderName: String(plan.folderName || name),
      error: "",
    });
  } catch (e) {
    patchCompile(objectApi, { error: String((e && e.message) || e) });
    SFX.play(objectApi, "ui.error");
  } finally {
    busyEnd(objectApi, key);
  }
}

// THE LANDING. `landing` raises ui.js's #sb-blockveil — his ruling for a write the whole window waits
// on — and the per-lane results come back into the SAME window, beside the plan that predicted them.
export async function compileLandPress(objectApi) {
  const c = compileState(objectApi);
  if (!c.open || !c.plan || c.landing) return;
  patchCompile(objectApi, { landing: true, error: "" });
  const key = "compileland:" + c.folderId;
  busyStart(objectApi, key, "Landing “" + c.folderName + "”…");
  try {
    // The house clock, never a wall clock: the seat's primed offset when it has one, the database's
    // own answer when the seat has not primed yet.
    const synced = Number(LIB.nowMsSync(objectApi) || 0);
    const landedAt = synced || Number((await LIB.nowMs(objectApi)) || 0);
    const res = await COMPILE.compileLand(objectApi, c.plan, { actor: who(objectApi), landedAt: landedAt });
    patchCompile(objectApi, { results: res, landing: false, error: String((res && res.error) || "") });
    SFX.play(objectApi, res && res.error ? "ui.error" : "system.exportDone");
  } catch (e) {
    patchCompile(objectApi, { landing: false, error: String((e && e.message) || e) });
    SFX.play(objectApi, "ui.error");
  } finally {
    busyEnd(objectApi, key);
  }
}

// boot lands on the shelf — the user selects a book, no stale grid. The book LIST is stripped too: a real boot repopulates it from SQL within a beat, and until then the shelf must draw skeletons, never a dead session's names (the Test/Cinema-Demo haunting, 2026-08-29: a cold-start boot failed its SQL read and the stale template painted as truth).
export function shelfLanding(ui) {
  const lib = Object.assign({}, DEFAULT_UI.library, ui.library || {});
  ui.library = Object.assign({}, lib, {
    openBook: null,
    selected: null,
    metaFor: null,
    renaming: null,
    books: [],
    loaded: false,
    loading: true,
  });
  ui.cards = Object.assign({}, DEFAULT_UI.cards);
  ui.editorSession=EDITOR_SESSION.closed(ui.editorSession||{bookId:"",cardId:"",pageId:"",editor:"",kind:"",generation:0,error:""});
  ui.phase = null;
  return ui;
}

// GOD SEAT AMNESIA (jace, 2026-08-26 "leaving and reentering God mode… no longer open") — the TRUE mechanism, proven by the ready-chip thread (no boot follows a toggle: the seat and its ui survive god-mode re-entry): only the REALM dies with the tab, and EVERY rebuilt realm mints a fresh nonce — the nonce alone can never tell a toggle from a real page boot.
export function onSpawn(objectApi) {
  const edition='native-studio-package-20260916';
  if(objectApi.getState().wwsContentEpoch!==edition){
    if(objectApi.self?.state?.ui)for(const key of Object.keys(objectApi.self.state.ui))delete objectApi.self.state.ui[key];
    CARDS.forget();
    objectApi.patchState({wwsContentEpoch:edition,ui:JSON.parse(JSON.stringify(DEFAULT_UI))});
  }
  // Quill was retired with explicit permission to erase its state, not archive it.
  if (objectApi.self && objectApi.self.state.ui) {
    for (const key of ["snapWin","plugins","plugbar","plugmarks","plugopen","plug","plugwin","plugtrust","pluglib","plugsub"]) delete objectApi.self.state.ui[key];
  }
  if (objectApi.self && objectApi.self.state.ui?.config) {
    const cfg = objectApi.self.state.ui.config;
    delete cfg.room;
    if (cfg.tab === "room") cfg.tab = "user";
  }
  refreshSupportedMods(objectApi);
  const ui = objectApi.getState().ui;
  // his ruling: no migration and no legacy read — the project has not shipped.
  objectApi.patchState({ ui: shellSync(Object.assign({}, DEFAULT_UI, ui || {})) });
  try {
    objectApi.patchInputs({
      actions: {
        sessionHello: {},
        repositoryCheck: {},
        cardAct: {},
        draftFields: {},
        renameField: {},
        pageStash: {},
        errClear: {},
        sfxCue: {},
        
        
        
        
        
        
        findWinOpen: {},
        findWinClose: {},
        findRun: {},
        findOpt: {},
        findGo: {},
        findReplaceOne: {},
        findReplaceAll: {},
        searchRun: {},
        searchOpt: {},
        searchScope: {},
        searchGo: {},
        searchBack: {},
        searchClose: {},
        importWinOpen: {},
        importWinClose: {},
        importParse: {},
        importMode: {},
        importTarget: {},
        importApply: {},
        importFile: {},
        refsAct: {},
        shelfOpen: {},
        shelfMine: {},
        shelfBoot: {},
        
        
        
        
        // THE COMPILE LANE — the folder designation and the What-Changed window's two moves.
        modsRefresh: {},
        docSet: {},
        compileOpen: {},
        compileLand: {},
        compileClose: {},
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        saviPing: {},
        saviSend: {},
        cardImagePrompt: {},
        cardImageMake: {},
        cardImageClear: {},
        atmoPickOpen: {},
        atmoPickClose: {},
        atmoSet: {},
        atmoClear: {},
        penDrop: {},
        penGrab: {},
        uiShell: {},
        uiNotepadPane: {},
        uiNotepadBox: {},
        shootPreview: {},
        shootGo: {},
        shootStrike: {},
        shootBack: {},
        uiMenu: {},
        uiDismiss: {},
        uiMenuItem: {},
        pianoRoll: {},
        uiMeta: {},
        uiPane: {},
        uiSearch: {},
        bookSelect: {},
        bookToggle: {},
        bookAdd: {},
        bookRemove: {},
        bookRename: {},
        bookRenameStart: {},
        bookMove: {},
        bookMeta: {},
        bookMetaSet: {},
        cfgOpen: {},
        cfgClose: {},
        cfgSet: {},
        cfgTab: {},
        cfgRemoveArm: {},
        appRemove: {},
        docsOpen: {},
        docsClose: {},
        expOpen: {},
        expClose: {},
        expScope: {},
        exportData: {},
        tagDefAct: {},
        recoverOpen: {},
        recoverClose: {},
        recoverAdopt: {},
        recoverRescan: {},
        recoverRebuild: {},
        recoverSweep: {},
        coopOpen: {},
        coopCancel: {},
        coopListAdd: {},
        coopListRemove: {},
      },
    });
  } catch (e) {
    objectApi.log("[cards] could not declare the cardAct action: " + ((e && e.message) || e));
  }
  try {
    CHANGELOG.registerUndo("SET_ASSET_PAGES",async(api2,row,side)=>{
      const current=await CARDS.listPages(api2,row.bookId,row.targetId),target=row[side]?.pages||[],expected=row[side==="before"?"after":"before"]?.pages||[];
      const D=require("lib/workbench-data.js");
      if(D.fingerprint(current)===D.fingerprint(target))return; // Already restored exactly: history can move without another write.
      if(D.fingerprint(current.slice(0,expected.length))!==D.fingerprint(expected)||current.slice(expected.length).some(p=>p.content))throw Error("The asset has newer edits; history was refused");
      await CARDS.setAssetPages(api2,row.bookId,row.targetId,current,target,{history:true});
    });
    CHANGELOG.registerUndo("SET_SCORE_INSTRUMENTS", async (api2,row,side)=>{
      const next=row[side]?.pages,expected=row[side==="before"?"after":"before"]?.pages;
      if(!next||!expected)throw Error("The saved score instrument history is missing");
      await require("lib/roll-track-save.js").swap(api2,row.bookId,row.targetId,expected,next);
    });
    CHANGELOG.registerUndo("UPDATE_PAGE_SPEC", async (api2, row, side) => {
      const snap = side === "before" ? row.before : row.after;
      const spec = snap && snap.spec ? snap.spec : null;
      if (!spec || !row.bookId) return;
      if(snap.sourcePages)await PAPER_FORMAT.restore(api2,row.bookId,snap.sourcePages,(side==="before"?row.after:row.before)?.sourcePages);
      const ok = await CONFIG.setBook(api2, row.bookId, "pageSpec", spec);
      if (!ok) throw new Error("the page spec write was refused for book " + row.bookId);
      pageEnvDrop(row.bookId);
    });
  } catch (e) {
    objectApi.log("[page] could not register the page spec inverse: " + ((e && e.message) || e));
  }
  try {
    CHANGELOG.registerUndo("SET_CARD_IMAGE", async (api2, row, side) => {
      const snap = (side === "before" ? row.before : row.after) || {};
      const h = imagesOf(row.bookId);
      if (!h) throw new Error("no picture table for book " + (row.bookId || "(none)"));
      const version = Number(snap.version || 0);
      const url = String(snap.url || "");
      if (!version || !url) await h.clearImage(api2, row.targetId);
      else await h.setImage(api2, row.targetId, String(snap.prompt || ""), url, version, stampNow(api2));
    });
  } catch (e) {
    objectApi.log("[cards] could not register the picture inverse: " + ((e && e.message) || e));
  }
  try {
    CHANGELOG.watch((snap) => paintSave(objectApi, snap));
    paintSave(objectApi);
  } catch (e) {
    objectApi.log("[cards] could not attach the save indicator: " + ((e && e.message) || e));
  }
  boot(objectApi);
}

export function importPatch(objectApi, patch) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.importWin = Object.assign({}, DEFAULT_UI.importWin, ui.importWin || {}, patch || {});
  objectApi.patchState({ ui });
  return ui.importWin;
}

export function importState(objectApi) {
  const ui = objectApi.getState().ui || {};
  return Object.assign({}, DEFAULT_UI.importWin, ui.importWin || {});
}

export function importFail(objectApi, e) {
  const msg = String((e && e.message) || e || "the import could not be read");
  objectApi.log("[import] " + msg);
  importPatch(objectApi, { parsing: false, running: false, error: msg });
}

export async function folderPicks(objectApi, bookId) {
  try {
    const rows = await CARDS.folderTree(objectApi, bookId);
    return (rows || []).map((f) => ({ id: String(f.id), name: String(f.name || ""), depth: Number(f.depth || 0) }));
  } catch (e) {
    objectApi.log("[import] folder list unavailable: " + ((e && e.message) || e));
    return [];
  }
}

export async function openImport(objectApi) {
  const book = openBookOf(objectApi);
  const first = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  first.importWin = Object.assign({}, DEFAULT_UI.importWin, {
    open: true,
    loading: true,
    mode: book ? "into folder" : "new book",
    books: [],
    folders: [],
    target: book
      ? { bookId: book.id, bookName: book.name, folderId: "", folderName: "" }
      : { bookId: "", bookName: "", folderId: "", folderName: "" },
  });
  first.menu = null;
  objectApi.patchState({ ui: first });
  SFX.play(objectApi, "ui.windowOpen");

  let books = [];
  try {
    books = await LIB.list(objectApi, projectIdOf(objectApi));
  } catch (e) {
    objectApi.log("[import] shelf unavailable: " + ((e && e.message) || e));
  }
  const folders = book ? await folderPicks(objectApi, book.id) : [];
  if (!importState(objectApi).open) return;
  importPatch(objectApi, {
    loading: false,
    books: (books || []).map((b) => ({ id: String(b.id), name: String(b.name || "") })),
    folders: folders,
  });
}

let importFileBuf = null;

const IMPORT_REFUSE = {
  big: "that file is bigger than this window can carry — split it or paste the cards you want",
  read: "this window could not read that file — try it again, or paste the text below",
  zipcomp: "this archive is compressed — open it and give me cards.json",
  zipnone: "I could not find cards.json in that archive — open it and give me cards.json, or one file from the cards/ folder",
};

export async function importFileAct(objectApi, p) {
  const nm = String((p && p.name) || "file");
  if (p && p.refuse) {
    importFileBuf = null;
    importPatch(objectApi, {
      fileBusy: false,
      fileName: nm,
      error: IMPORT_REFUSE[String(p.refuse)] || IMPORT_REFUSE.read,
    });
    return;
  }

  const n = Math.max(1, Number(p.n) || 1);
  const i = Math.max(0, Math.min(n - 1, Number(p.i) || 0));
  if (!importFileBuf || importFileBuf.name !== nm || importFileBuf.n !== n || i === 0) {
    importFileBuf = { name: nm, n, parts: new Array(n), got: 0, zip: !!p.zip, paste: !!p.paste, book: String(p.book || "") };
    if (n > 1) {
      importPatch(objectApi, { fileName: nm, fileBusy: true, error: "", notice: "", confirm: false });
      const mine = importFileBuf;
      objectApi.runInSeconds(3 + n * 0.25, () => {
        if (importFileBuf !== mine) return;
        importFileBuf = null;
        importPatch(objectApi, {
          fileBusy: false,
          error: "that file arrived in pieces and " + (mine.n - mine.got) + " of " + mine.n + " went missing — press Choose a file… again, or paste it below",
        });
      });
    }
  }
  const buf = importFileBuf;
  if (buf.parts[i] === undefined) {
    buf.parts[i] = String(p.text === undefined ? "" : p.text);
    buf.got += 1;
  }
  if (buf.got < n) return;

  importFileBuf = null;
  const cur = importState(objectApi);
  if (!cur.open) return;
  const whole = buf.parts.join("");
  const sniff = IMPORT.sniffFile(buf.name, whole);
  if (sniff.refuse) {
    importPatch(objectApi, { fileBusy: false, fileName: buf.name, error: sniff.refuse });
    return;
  }
  const format = buf.paste ? String(cur.format || "auto") : String(sniff.format || "auto");
  importPatch(objectApi, { fileBusy: false, fileName: buf.paste ? "" : buf.name, error: "", notice: "" });
  await importAct(objectApi, {
    importParse: { text: whole, name: buf.paste ? buf.book || cur.bookName : cur.bookName, format },
  });
}

export async function importAct(objectApi, d) {
  const p = (d && (d.importParse || d.importMode || d.importTarget || d.importApply)) || {};
  const text = p.text === undefined ? importState(objectApi).text : String(p.text || "");
  const name = p.name === undefined ? importState(objectApi).bookName : String(p.name || "");
  importPatch(objectApi, { text, bookName: name });

  if (d.importParse) {
    const cur = importState(objectApi);
    const format = String(p.format || cur.format || "auto");
    importPatch(objectApi, { parsing: true, format, error: "", notice: "", confirm: false });
    const preview = IMPORT.parse(text, { format, bookName: name });
    importPatch(objectApi, {
      parsing: false,
      parsed: true,
      preview,
      format,
      error: preview.ok ? "" : (preview.warnings || [])[0] || "nothing card-shaped was found in that text",
    });
    return;
  }

  if (d.importMode) {
    importPatch(objectApi, { mode: IMPORT.normalizeMode(String(p.mode || "")), confirm: false });
    return;
  }

  if (d.importTarget) {
    const cur = importState(objectApi);
    const target = Object.assign({}, cur.target || {});
    if (p.bookId !== undefined) {
      const bid = String(p.bookId || "");
      const row = (cur.books || []).find((b) => String(b.id) === bid) || null;
      target.bookId = bid;
      target.bookName = row ? String(row.name || "") : "";
      target.folderId = "";
      target.folderName = "";
      importPatch(objectApi, { target, confirm: false, folders: bid ? await folderPicks(objectApi, bid) : [] });
      return;
    }
    if (p.folderId !== undefined) {
      const fid = String(p.folderId || "");
      const row = (cur.folders || []).find((f) => String(f.id) === fid) || null;
      target.folderId = fid;
      target.folderName = row ? String(row.name || "") : "";
      importPatch(objectApi, { target, confirm: false });
    }
    return;
  }

  if (p.cancel === true || p.cancel === "true") return void importPatch(objectApi, { confirm: false });
  if (!(p.confirm === true || p.confirm === "true")) return void importPatch(objectApi, { confirm: true });

  const cur = importState(objectApi);
  if (!cur.preview || !cur.preview.ok) {
    importPatch(objectApi, { confirm: false, error: "read the text first — there is nothing to import yet" });
    return;
  }
  importPatch(objectApi, { running: true, confirm: false, error: "", notice: "" });
  const report = await IMPORT.apply(
    objectApi,
    cur.preview,
    {
      projectId: projectIdOf(objectApi),
      bookId: String((cur.target || {}).bookId || ""),
      folderId: String((cur.target || {}).folderId || ""),
      bookName: name || cur.preview.bookName || String((cur.target || {}).bookName || ""),
      actor: who(objectApi),
    },
    cur.mode
  );
  const created = (report.created && report.created.cards) || 0;
  const merged = (report.merged && report.merged.cards) || 0;
  importPatch(objectApi, {
    running: false,
    error: (report.errors || [])[0] || "",
    notice: report.ok ? created + " new, " + merged + " merged — one undo takes it back" : "",
  });
  if (!report.ok) return;
  if ((report.errors || []).length === 0 && (report.skipped || []).length) {
    const s = report.skipped[0];
    surface(objectApi, new Error(String((s && s.reason) || "part of that import was skipped")));
  }
  SFX.play(objectApi, "system.exportDone");
  const openId = String(((objectApi.getState().ui || {}).library || {}).openBook || "");
  if (report.bookId && String(report.bookId) !== openId) {
    patchLibrary(objectApi, { selected: String(report.bookId), openBook: String(report.bookId) });
  }
  await refresh(objectApi, {});
  await refreshCards(objectApi);
}

export function findPatch(objectApi, patch) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.findWin = Object.assign({}, DEFAULT_UI.findWin, ui.findWin || {}, patch || {});
  objectApi.patchState({ ui });
  return ui.findWin;
}

export function findState(objectApi) {
  const cur = Object.assign({}, DEFAULT_UI.findWin, (objectApi.getState().ui || {}).findWin || {});
  const o = Object.assign({}, DEFAULT_UI.findWin.opts, cur.opts || {});
  o.fields = Object.assign({}, DEFAULT_UI.findWin.opts.fields, (cur.opts || {}).fields || {});
  cur.opts = o;
  return cur;
}

const NO_BOOK = "open a book first — Find & Replace works inside one book";

export function openFind(objectApi) {
  const book = openBookOf(objectApi);
  const prev = findState(objectApi);
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.findWin = Object.assign({}, DEFAULT_UI.findWin, {
    open: true,
    bookName: book ? book.name : "",
    query: String(prev.query || ""),
    replacement: String(prev.replacement || ""),
    opts: prev.opts,
    error: book ? "" : NO_BOOK,
  });
  ui.menu = null;
  objectApi.patchState({ ui });
  SFX.play(objectApi, "ui.windowOpen");
}

export function findTyped(objectApi, p) {
  const patch = {};
  if (p && p.query !== undefined) patch.query = String(p.query || "");
  if (p && p.replacement !== undefined) patch.replacement = String(p.replacement || "");
  return findPatch(objectApi, patch);
}

export async function findRun(objectApi, p) {
  findTyped(objectApi, p);
  const book = openBookOf(objectApi);
  if (!book) return void findPatch(objectApi, { running: false, error: NO_BOOK });
  const cur = findState(objectApi);
  findPatch(objectApi, { running: true, error: "", notice: "", confirm: false });
  let out = null;
  try {
    out = await FIND.searchReport(objectApi, book.id, cur.query, cur.opts);
  } catch (e) {
    const msg = String((e && e.message) || e);
    objectApi.log("[find] " + msg);
    findPatch(objectApi, {
      running: false,
      ran: true,
      results: [],
      total: 0,
      cards: 0,
      locked: 0,
      truncated: false,
      error: msg,
    });
    SFX.play(objectApi, "ui.error");
    return;
  }
  findPatch(objectApi, {
    running: false,
    ran: true,
    results: out.groups || [],
    total: Number(out.total || 0),
    cards: Number(out.cards || 0),
    locked: Number(out.locked || 0),
    truncated: !!out.truncated,
    error: "",
  });
}

export async function findOpt(objectApi, p) {
  findTyped(objectApi, p);
  const cur = findState(objectApi);
  const on = p && (p.on === true || p.on === "true");
  const opts = Object.assign({}, cur.opts, { fields: Object.assign({}, cur.opts.fields) });
  if (p && p.field) opts.fields[String(p.field)] = on;
  else if (p && p.opt) opts[String(p.opt)] = on;
  else return;
  findPatch(objectApi, { opts, confirm: false, notice: "" });
  if (cur.ran) await findRun(objectApi, { query: cur.query, replacement: cur.replacement });
}

export async function findGo(objectApi, p) {
  findTyped(objectApi, p);
  const cardId = String((p && p.cardId) || "");
  if (!cardId) return;
  const pageId = String((p && p.pageId) || "");
  if (pageId) {
    await cardAct(objectApi, { op: "openPages", id: cardId, pageId });
    return;
  }
  const cur = findState(objectApi);
  const g = (cur.results || [])[Number((p && p.g) || 0)] || null;
  if (g && g.folderId) await cardAct(objectApi, { op: "folderOpen", id: String(g.folderId) });
  await cardAct(objectApi, { op: "openCard", id: cardId });
}

export async function findReplaceOne(objectApi, p) {
  findTyped(objectApi, p);
  const book = openBookOf(objectApi);
  if (!book) return void findPatch(objectApi, { error: NO_BOOK });
  const cur = findState(objectApi);
  const group = (cur.results || [])[Number((p && p.g) || 0)] || null;
  const hit = ((group || {}).matches || [])[Number((p && p.m) || 0)] || null;
  if (!hit) return void findPatch(objectApi, { error: "that hit is no longer in the list — search again" });
  findPatch(objectApi, { running: true, error: "", notice: "", confirm: false });
  let res = null;
  try {
    res = await FIND.replaceOne(objectApi, book.id, hit, cur.replacement, { actor: who(objectApi) });
  } catch (e) {
    const msg = String((e && e.message) || e);
    objectApi.log("[find] " + msg);
    findPatch(objectApi, { running: false, error: msg });
    SFX.play(objectApi, "ui.error");
    return;
  }
  if (!res || !res.ok) {
    findPatch(objectApi, { running: false, error: String((res && res.reason) || "that hit could not be replaced") });
    SFX.play(objectApi, "ui.error");
    return;
  }
  await refreshCards(objectApi);
  await findRun(objectApi, { query: cur.query, replacement: cur.replacement });
  findPatch(objectApi, { notice: "Replaced 1 hit." });
}

export async function findReplaceAll(objectApi, p) {
  findTyped(objectApi, p);
  if (p && (p.cancel === true || p.cancel === "true")) return void findPatch(objectApi, { confirm: false });
  const confirmed = p && (p.confirm === true || p.confirm === "true");
  if (!confirmed) return void findPatch(objectApi, { confirm: true, notice: "", error: "" });
  const book = openBookOf(objectApi);
  if (!book) return void findPatch(objectApi, { confirm: false, error: NO_BOOK });
  const cur = findState(objectApi);
  findPatch(objectApi, { running: true, confirm: false, error: "", notice: "" });
  let res = null;
  try {
    res = await FIND.replaceAll(
      objectApi,
      book.id,
      cur.query,
      cur.replacement,
      Object.assign({ actor: who(objectApi) }, cur.opts)
    );
  } catch (e) {
    const msg = String((e && e.message) || e);
    objectApi.log("[find] " + msg);
    findPatch(objectApi, { running: false, error: msg });
    SFX.play(objectApi, "ui.error");
    return;
  }
  if (!res || !res.ok) {
    findPatch(objectApi, { running: false, error: String((res && res.reason) || "nothing was replaced") });
    SFX.play(objectApi, "ui.error");
    return;
  }
  await refreshCards(objectApi);
  await findRun(objectApi, { query: cur.query, replacement: cur.replacement });
  const n = Number(res.replaced || 0);
  const c = Number(res.cards || 0);
  const skipped = Array.isArray(res.skipped) ? res.skipped : [];
  const why = !n && skipped.length ? " — " + String(skipped[0].reason || "every hit was skipped") : "";
  findPatch(objectApi, {
    notice: "Replaced " + n + " hit" + (n === 1 ? "" : "s") + " across " + c + " card" + (c === 1 ? "" : "s") + "." + why,
  });
}

export async function clipAct(objectApi, kind) {
  const st = cardsState(objectApi);
  const book = openBookOf(objectApi);
  if (!book) return void patchCards(objectApi, { notice: "open a book first" });
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});

  if (kind === "paste") {
    const clip = ui.clipboard || null;
    if (!clip || !clip.id) return void patchCards(objectApi, { notice: "nothing on the clipboard yet — Copy a card first" });
    if (String(clip.bookId || "") !== String(book.id)) {
      return void patchCards(objectApi, { notice: "that card was copied from another book — Paste works inside its own book" });
    }
    const folderId = String(st.folderId || book.id);
    try {
      const newId = await CARDS.duplicateCard(objectApi, book.id, clip.id, { actor: who(objectApi) });
      if (newId && String(clip.folderId || "") !== folderId) {
        await CARDS.moveCard(objectApi, book.id, newId, { folderId, actor: who(objectApi) });
      }
    } catch (e) {
      return void surface(objectApi, e);
    }
    await refreshCards(objectApi);
    patchCards(objectApi, { notice: "pasted “" + String(clip.name || "card") + "”" });
    SFX.play(objectApi, "cards.created");
    return;
  }

  const sel = st.selected || null;
  const tile = sel ? (st.list || []).find((t) => String(t.id) === String(sel.id)) : null;
  if (!sel || (tile && tile.isFolder) || (sel.kind === "folder" && !tile)) {
    return void patchCards(objectApi, { notice: "select a card first — a folder is not a clipboard item" });
  }
  const cardId = String((tile && (tile.topId || tile.id)) || sel.id);
  let row = null;
  try {
    row = await CARDS.getCard(objectApi, book.id, cardId);
  } catch (e) {
    return void surface(objectApi, e);
  }
  if (!row) return void patchCards(objectApi, { notice: "that card is no longer here" });
  ui.clipboard = {
    id: cardId,
    bookId: String(book.id),
    folderId: String(row.folderId || book.id),
    name: String(row.name || sel.name || "card"),
    cut: kind === "cut",
  };
  objectApi.patchState({ ui });
  SFX.play(objectApi, "ui.buttonPress");
  if (kind === "cut") {
    await cardAct(objectApi, { op: "trash", id: cardId });
    patchCards(objectApi, { notice: "cut “" + String(ui.clipboard.name) + "” — Paste drops it back" });
    SFX.play(objectApi, "cards.trashed");
    return;
  }
  patchCards(objectApi, { notice: "copied “" + String(ui.clipboard.name) + "”" });
}

const NAV_RESUME = { bookSelect: true, shelfMine: true, studioWorkspace: true };

export async function resumeNav(objectApi, then) {
  const name = String((then && then.name) || "");
  const payload = (then && then.payload) || {};
  if (!name) return;
  if (name === "cardAct") {
    await cardAct(objectApi, payload);
    return;
  }
  if (!NAV_RESUME[name]) return;
  const actions = {};
  const actionData = {};
  actions[name] = true;
  actionData[name] = payload;
  onInput(objectApi, { actions, actionData });
}

export function openDocsWindow(objectApi, topic) {
  refreshSupportedMods(objectApi);
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.docs = { topic: DOCSUI.topicForLabel(topic) || "general-info" };
  ui.menu = null;
  objectApi.patchState({ ui });
}

export function recoverPatch(objectApi, patch) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.recover = Object.assign({}, DEFAULT_UI.recover, ui.recover || {}, patch || {});
  objectApi.patchState({ ui });
  return ui.recover;
}

export function recoverState(objectApi) {
  return Object.assign({}, DEFAULT_UI.recover, (objectApi.getState().ui || {}).recover || {});
}

export function recoverFail(objectApi, e) {
  const msg = String((e && e.message) || e || "unknown failure");
  objectApi.log("[recover] " + msg);
  recoverPatch(objectApi, { loading: false, confirm: null, error: msg });
  SFX.play(objectApi, "ui.error");
}

export async function runRecoverScan(objectApi) {
  let out = null;
  let error = "";
  try {
    out = await RECOVER.scan(objectApi, await shelfOwner(objectApi), myId(objectApi));
  } catch (e) {
    error = String((e && e.message) || e);
    objectApi.log("[recover] " + error);
  }
  if (!recoverState(objectApi).open) return;
  const errs = (out && out.errors) || [];
  recoverPatch(objectApi, {
    loading: false,
    confirm: null,
    projects: (out && out.projects) || [],
    books: (out && out.books) || [],
    content: (out && out.content) || [],
    error: error || errs.join(" · "),
  });
  if (error || errs.length) SFX.play(objectApi, "ui.error");
}

export async function openRecover(objectApi) {
  const ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  ui.recover = Object.assign({}, DEFAULT_UI.recover, { open: true, loading: true });
  ui.menu = null;
  objectApi.patchState({ ui });
  await runRecoverScan(objectApi);
}

export function recoverTargetProject(objectApi) {
  return PROJECTS.PROJECT_ID;
}

export async function recoverAdoptAct(objectApi, p) {
  const bid = String((p && p.bookId) || "");
  if (!bid) return;
  const pid = recoverTargetProject(objectApi);
  const st = recoverState(objectApi);
  const row = (st.books || []).find((b) => String(b.id) === bid) || null;
  recoverPatch(objectApi, { notice: "", error: "" });
  const res = await RECOVER.adoptBook(objectApi, bid, pid);
  if (!res || !res.ok) {
    return void recoverPatch(objectApi, { error: String((res && res.message) || "that book would not move.") });
  }
  await refresh(objectApi, {});
  await runRecoverScan(objectApi);
  recoverPatch(objectApi, {
    notice: "“" + String((row && row.name) || "that book") + "” is filed under the project you have open.",
  });
}

export async function recoverRebuildAct(objectApi, p) {
  const bid = String((p && p.bookId) || "");
  if (!bid) return;
  const pid = recoverTargetProject(objectApi);
  recoverPatch(objectApi, { notice: "", error: "" });
  const name = "Recovered book " + bid.slice(0, 4);
  const res = await RECOVER.rebuildBook(objectApi, bid, pid, name);
  if (!res || !res.ok) {
    return void recoverPatch(objectApi, {
      error: String((res && res.message) || "that content would not come back."),
    });
  }
  await refresh(objectApi, {});
  await runRecoverScan(objectApi);
  recoverPatch(objectApi, {
    notice: "“" + name + "” is on your shelf with its cards inside it — rename it from the shelf.",
  });
}

export async function recoverSweepAct(objectApi, p) {
  const bid = String((p && p.bookId) || "");
  if (!bid) return;
  const confirmed = p && (p.confirm === true || p.confirm === "true");
  if (!confirmed) {
    return void recoverPatch(objectApi, {
      confirm: p && p.cancel ? null : { id: bid, action: "sweep" },
      notice: "",
      error: "",
    });
  }
  recoverPatch(objectApi, { confirm: null, notice: "", error: "" });
  const res = await RECOVER.sweep(objectApi, bid);
  if (!res || !res.ok) {
    return void recoverPatch(objectApi, { error: String((res && res.message) || "those rows would not clear.") });
  }
  SFX.play(objectApi, "cards.trashed");
  await runRecoverScan(objectApi);
  recoverPatch(objectApi, { notice: "those rows are gone — nothing of that book is left in the database." });
}

// his ask: a cleanup routine for removing Worldwright Studio — it only ever runs behind the typed words.
export function removePatch(objectApi, patch) {
  const ui = uiNow(objectApi);
  ui.config = Object.assign({}, DEFAULT_UI.config, ui.config || {}, {
    remove: Object.assign({}, (ui.config || {}).remove || {}, patch),
  });
  objectApi.patchState({ ui });
}

export async function removeSurvey(objectApi) {
  removePatch(objectApi, { loading: true, error: null });
  try {
    const survey = await UNINSTALL.survey(objectApi);
    removePatch(objectApi, { loading: false, survey: survey, error: null });
  } catch (e) {
    removePatch(objectApi, { loading: false, error: String((e && e.message) || e) });
  }
}

export async function removeRun(objectApi, p) {
  const typed = String((p && p.confirm) || "");
  if (typed.trim().toUpperCase() !== UNINSTALL.CONFIRM) {
    return void removePatch(objectApi, {
      error: "type " + UNINSTALL.CONFIRM + " to remove it — nothing has been touched.",
    });
  }
  removePatch(objectApi, { busy: true, error: null });
  const res = await UNINSTALL.remove(objectApi, typed);
  if (!res || !res.ok) {
    const failed = ((res && res.failed) || []).join("; ");
    return void removePatch(objectApi, {
      busy: false,
      error: failed || (res && res.error) || "some tables would not drop.",
    });
  }
  SFX.play(objectApi, "cards.trashed");
  objectApi.log("[uninstall] Worldwright Studio removed itself: " + res.dropped + " tables dropped.");
  const clean = Object.assign({}, DEFAULT_UI);
  clean.config = Object.assign({}, DEFAULT_UI.config, {
    open: true,
    tab: "remove",
    remove: { done: true, dropped: res.dropped },
  });
  objectApi.patchState({ ui: clean });
}

export function uiNow(objectApi) {
  return Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
}

// THE PROMPT BEFORE THE BURN (his ruling, 2026-08-31). Nothing else is written: an ask deletes nothing, and a failed count leaves the shelf exactly as it stood.
export async function askBookRemove(objectApi, bookId, bookName, step) {
  const set = STORE.book(bookId);
  let row = {};
  if (set && typeof set.contentCounts === "function") {
    const res = await set.contentCounts(objectApi);
    row = ((res && res.rows) || [])[0] || {};
  }
  patchLibrary(objectApi, {
    confirmRemove: {
      id: String(bookId),
      name: String(bookName || bookId),
      folders: Number(row.folders || 0),
      cards: Number(row.cards || 0),
      pages: Number(row.pages || 0),
      trashed: Number(row.trashed || 0),
      step: Number(step) === 2 ? 2 : 1,
    },
  });
  SFX.play(objectApi, "ui.windowOpen");
}

export function refreshSupportedMods(objectApi) {
  let registry = {};
  try { registry = objectApi.getSpec("mods") || {}; } catch (e) { /* no installed mods */ }
  const ui = uiNow(objectApi);
  ui.supportedMods = MODS.rows(registry);
  objectApi.patchState({ ui });
}

export function onInput(objectApi, input) {
  const event = UIINPUT.read(input);
  const a = event.actions;
  const d = event.data;
  if(a.exportData){require("lib/export-preview.js").handle(objectApi,d.exportData||{});return;}
  if(a.repositoryCheck){
    const asked=String(d.repositoryCheck?.bookId||'');
    if(!asked||asked===String(openBookOf(objectApi)?.id||''))bookrevPoll(objectApi).catch(e=>objectApi.log('[repository] check: '+String(e?.message||e)));
  }
  if(a.arrangement){const p=d.arrangement||{};if(p.op==='open')openCardDocument(objectApi,{...p,arrangement:true});else if(p.op==='close')cardAct(objectApi,{op:'backToFolder'});else {const api=editorApi(objectApi);ARRANGEMENT.handle(api,p).catch(e=>ARRANGEMENT.fail(api,e));}return;}
  if(a.studioWorkspace){studioWorkspace(objectApi,d.studioWorkspace||{}).catch(e=>{STUDIOPROJECTS.patch(objectApi,{error:String(e?.message||e),loading:false,creating:false});surface(objectApi,e);});return;}
  if(a.editorLibrary){require('lib/editor-library.js').handle(objectApi,d.editorLibrary||{});return;}
  if (a.assetWorkbench) {const p=d.assetWorkbench||{},api=editorApi(objectApi);
    if(p.op==='close'){if(p.source)openCardDocument(objectApi,{cardId:cardsState(objectApi).pageDoc?.cardId,editor:'source'}).catch(e=>surface(api,e));else cardAct(objectApi,{op:'backToFolder'}).catch(e=>surface(api,e));}
    else if(p.op==='open')openCardDocument(objectApi,{cardId:p.cardId||cardsState(objectApi).card?.id});
    else WORKBENCH.handle(api,p).catch(e=>WORKBENCH.fail(api,e));return;}
  if (a.modsRefresh) { refreshSupportedMods(objectApi); return; }
  if (a.pianoRoll) {
    const args=d.pianoRoll||{};
    if(!["instrumentList","instrumentLoad","instrumentSave","save","preview","stop","trigger","renderLookup","renderPrepare","renderFinish","renderCancel","renderReceipt","streamOpen","streamPage","streamTurn","streamWindow","streamCancel","streamReceipt","saveSet"].includes(args.op))return;
    const api=editorApi(objectApi);PIANO_EDITOR.handle(api,args).then(saved=>{if(!api.editorCurrent())return;const c=cardsState(api);if((args.op==="save"||saved?.instrumentSet)&&saved&&saved.pageId&&c.view==="page"&&c.pageDoc&&c.pageDoc.pageId===saved.pageId)return loadPageDoc(api,{pianoMode:true});}).catch(e=>surface(api,e));return;
  }
  let ui = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
  // No early return: the same tap may also pick a book, save, or open another menu.
  if (a.uiDismiss) {
    const next = QUIET.dismiss(ui, d.uiDismiss);
    if (next !== ui) { ui = next; objectApi.patchState({ ui }); }
  }

  // Read BEFORE the latch below flips it: the hello branch needs to know whether a boot already
  // ran on an EARLIER input this module-life (a click that beat the hello), not whether this very
  // input is about to start one.
  const bootedBeforeThisInput = SESSION_BOOTED;
  if (!SESSION_BOOTED) {
    SESSION_BOOTED = true;
    bootLatch(objectApi, true);
    boot(objectApi);
  }

  // TAP-COMMIT ARRIVALS — processed BEFORE the returning branches and WITHOUT returning: both ride the same input frame as whatever button the tap landed on, and that button's own branch below must still run. draftFields folds typed-but-unblurred modal fields into the draft (so a same-frame draftDone saves them); renameField commits an inline rename box — card/folder tile taps-out on tablets never blur, and its own action name survives the engine's same-frame fold.
  if (a.draftFields) {
    try {
      draftOp(objectApi, "draftFields", d.draftFields || {});
    } catch (e) {
      surface(objectApi, e);
    }
  }
  if (a.renameField) {
    const rf = d.renameField || {};
    cardAct(objectApi, { op: "rename", id: String(rf.id || ""), value: String(rf.name == null ? "" : rf.name) })
      .catch((e) => surface(objectApi, e));
  }
  // The stash net's arrivals ride the realm's own clock and may share a frame with anything.
  if (a.pageStash) {
    try {
      stashPatch(objectApi, d.pageStash || {});
    } catch (e) {
      surface(objectApi, e);
    }
  }

  // js sessionLane), so the nonce only guards against a duplicate hello — the toggle/boot ruling is FRESH_CLIENT's (§ GOD SEAT AMNESIA): the first hello a fresh module hears is a real session boot and lands on the shelf (his ruling); every later hello is a realm rebuilt mid-session — adopt the nonce, keep the place.
  if (a.sessionHello) {
    const nonce = String(((d.sessionHello || {}).nonce) || "");
    if (nonce && String(ui.pageNonce || "") !== nonce) {
      // THE SEAT FACT (2026-09-01, the lost-page incident): a script save reloads this module AND rebuilds the realm — which a module-memory test cannot tell from a fresh page, so the hello landed a mid-write session on the shelf and closed the page under the pen.
      const seat = Number.isFinite(objectApi.sessionSeq) ? Number(objectApi.sessionSeq) : null;
      const samePage = seat !== null && Number(ui.pageSeat) === seat;
      const fresh = FRESH_CLIENT && !samePage;
      FRESH_CLIENT = false;
      ui.pageNonce = nonce;
      ui.pageSeat = seat;
      objectApi.log("[session] hello: seat=" + String(seat) + " samePage=" + samePage + " fresh=" + fresh);
      objectApi.patchState({ ui: shellSync(fresh ? shelfLanding(ui) : ui) });
      // THE NAV BLACKOUT (2026-08-30): on a slow realm (tablet), a click beats the hello by SECONDS — that click's boot commits the book list, then this strip empties it, and no lane ever re-reads: books:[] + loading:true forever, skeleton nav, no error. The strip itself is his boot ruling (fresh page lands on the shelf) — what it must never orphan is the LIST.
      if (BOOT_FAILURE) boot(objectApi, true);
      if (fresh && bootedBeforeThisInput) {
        Promise.resolve(BOOT_IN_FLIGHT || !BOOT_FAILURE).then((ok) => {
          if (ok && !(objectApi.getState().ui?.library?.loaded)) return refresh(objectApi);
        }).catch((e) => {
          const message = "[shelf] post-hello re-read failed: " + String(e?.message || e);
          objectApi.log(message);
          patchDoorState(objectApi, { booting: false, error: message });
        });
      }
    }
    return;
  }

  if (a.saviPing) {
    const savi = ui.savi || {};
    const token = (Number(savi.token) || 0) + 1;
    const joke = DOORBELL_JOKES[Math.floor(objectApi.random() * DOORBELL_JOKES.length) % DOORBELL_JOKES.length];
    ui.savi = { awake: true, token, line: joke, ask: false, sent: false };
    objectApi.patchState({ ui });
    objectApi.notifyDm(
      `[dock] ${objectApi.getUsername ? objectApi.getUsername() : "someone"} tapped your avatar in Worldwright Studio — they want you.`
    );
    objectApi.runInSeconds(DOORBELL_BEAT, () => {
      const mid = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
      if (mid.savi && mid.savi.token === token && mid.savi.awake) {
        // his ruling: ringing must actually prompt — ask is what makes ui.js grow the field and the Send.
        mid.savi = { awake: true, token, line: DOORBELL_TRUTH, ask: true, sent: false };
        objectApi.patchState({ ui: mid });
      }
    });
    objectApi.runInSeconds(9, () => {
      const now = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
      if (now.savi && now.savi.token === token && !now.savi.ask && !now.savi.sent) {
        now.savi = { awake: false, token, line: "", ask: false, sent: false };
        objectApi.patchState({ ui: now });
      }
    });
    return;
  }

  if (a.saviSend) {
    const said = String((d.saviSend && d.saviSend.text) || "").trim().slice(0, 400);
    if (!said) return;
    const who = objectApi.getUsername ? objectApi.getUsername() : "someone";
    objectApi.notifyDm(`[dock] ${who} says: ${said}`);
    const cur = Object.assign({}, DEFAULT_UI.savi, ui.savi || {});
    const token = Number(cur.token) || 0;
    ui.savi = { awake: true, token, line: DOORBELL_TRUTH, ask: false, sent: true };
    objectApi.patchState({ ui });
    objectApi.runInSeconds(4, () => {
      const now = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
      if (now.savi && now.savi.token === token && now.savi.sent) {
        now.savi = { awake: false, token, line: "", ask: false, sent: false };
        objectApi.patchState({ ui: now });
      }
    });
    return;
  }

  for (let i = 0; i < CHROME_KEYS.length; i++) {
    if (a[CHROME_KEYS[i]]) {
      SFX.play(objectApi, CHROME_CUE[CHROME_KEYS[i]]);
      break;
    }
  }

  if (a.sfxCue) {
    SFX.play(objectApi, String((d.sfxCue && d.sfxCue.event) || ""));
    return;
  }

  if (a.shelfOpen) {
    openShelf(objectApi, d.shelfOpen || {});
    return;
  }
  if (a.shelfMine) {
    myShelf(objectApi).catch((e) => patchShelf(objectApi, { error: String((e && e.message) || e) }));
    return;
  }
  if (a.shelfBoot) {
    patchShelf(objectApi, { owner: "", mine: true, name: "", error: "" });
    SHELF_OWNER = "";
    boot(objectApi);
    return;
  }

  if (a.penDrop || a.penGrab) {
    cardAct(objectApi, { op: a.penDrop ? "penDrop" : "penGrab" }).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.atmoPickOpen || a.atmoPickClose) {
    const p = (a.atmoPickOpen ? d.atmoPickOpen : d.atmoPickClose) || {};
    const st = cardsState(objectApi);
    const modal = Object.assign({}, st.modal || {}, {
      atmoPick: a.atmoPickOpen ? String(p.id || "") : "",
    });
    const secs = Array.isArray(modal.sections) ? modal.sections : [];
    for (let i = 0; i < secs.length; i++) secs[i].atmoPick = modal.atmoPick;
    patchCards(objectApi, { modal: modal });
    return;
  }
  if (a.atmoSet || a.atmoClear) {
    const p = (a.atmoSet ? d.atmoSet : d.atmoClear) || {};
    const sectionId = String(p.id || "");
    const value = a.atmoSet ? String(p.atmo == null ? "" : p.atmo) : "";
    const book = openBookOf(objectApi);
    if (!book || !sectionId) return;
    (async function () {
      await CARDS.setSectionAtmo(objectApi, book.id, sectionId, value, {});
      const st = cardsState(objectApi);
      const cardId = String((st.modal && (st.modal.cardId || (st.modal.card && st.modal.card.id))) || "");
      if (!cardId) return;
      const bundle = await cardBundle(objectApi, book, cardId);
      if (!bundle) return;
      patchCards(objectApi, {
        modal: Object.assign({}, st.modal || {}, bundle, { atmoPick: "" }),
      });
    })().catch((e) => surface(objectApi, e));
    return;
  }

  if (a.shootPreview || a.shootGo || a.shootStrike) {
    const verb = a.shootStrike ? "strike" : a.shootGo ? "shoot" : "preview";
    const p = (a.shootStrike ? d.shootStrike : a.shootGo ? d.shootGo : d.shootPreview) || {};
    shootAct(objectApi, verb, p).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.shootBack) {
    const min = (objectApi.getState().ui || {}).shootMin;
    if (min && min.playerId) objectApi.patchObjectState(min.playerId, { sbStage: null });
    setShootMin(objectApi, null);
    return;
  }

  if (a.cardImagePrompt || a.cardImageMake || a.cardImageClear) {
    cardPicture(objectApi, {
      prompt: a.cardImagePrompt ? d.cardImagePrompt || {} : null,
      make: a.cardImageMake ? d.cardImageMake || {} : null,
      clear: a.cardImageClear ? d.cardImageClear || {} : null,
    }).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.cardAct) {
    const cd = d.cardAct || {};
    const op = String(cd.op || "");
    if (CUE_NOW[op]) SFX.play(objectApi, CUE_NOW[op]);
    const landed = CUE_DONE[op] || "";
    const errWas = landed ? String(cardsState(objectApi).error || "") : "";
    const run = cardAct(objectApi, cd);
    if (landed) {
      run.then(
        () => {
          const errNow = String(cardsState(objectApi).error || "");
          if (errNow && errNow !== errWas) SFX.play(objectApi, "ui.error");
          else SFX.play(objectApi, landed);
        },
        (e) => surface(objectApi, e)
      );
    } else {
      run.catch((e) => surface(objectApi, e));
    }
    return;
  }

  if (a.tagDefAct) {
    TAGDEFS.handleAction(objectApi, "tagDefAct", d.tagDefAct || {})
      .then(() => {
        pageEnvDropAll();
        const openBookG = (((objectApi.getState().ui || {}).library) || {}).openBook;
        if (openBookG) pageEnvWarm(objectApi, openBookG);
      })
      .catch((e) => surface(objectApi, e));
    return;
  }

  if (a.bookAdd) {
    const pid = projectIdOf(objectApi);
    busyStart(objectApi, "book", "Creating book tables…");
    LIB.add(objectApi, pid, "Untitled Book", who(objectApi)).then((id) => {
      if (!id) return busyEnd(objectApi, "book");
      CONFIG.seedBook(objectApi, id, pid).then(() => {
        refresh(objectApi, { selected: id, openBook: id, renaming: id }).then(() =>
          loadFolder(objectApi, {
            folderId: id,
            selected: null,
            menu: false,
            meta: null,
            modal: null,
            view: "folder",
            error: "",
          })
            .catch((e) => surface(objectApi, e))
            .then(() => busyEnd(objectApi, "book"))
        );
      });
    }, (e) => {
      busyEnd(objectApi, "book");
      surface(objectApi, e);
    });
    return;
  }

  if (a.bookRemove) {
    // ── "Deleting a book should prompt a confirmation.
    const p = d.bookRemove || {};
    const step = String(p.confirm === true ? "1" : p.confirm == null ? "" : p.confirm);
    const cancelled = p.cancel === true || p.cancel === "true";
    const lib0 = Object.assign({}, DEFAULT_UI.library, ui.library || {});
    const pending = lib0.confirmRemove && typeof lib0.confirmRemove === "object" ? lib0.confirmRemove : null;

    if (cancelled) {
      if (pending) SFX.play(objectApi, "ui.windowClose");
      patchLibrary(objectApi, { confirmRemove: null });
      return;
    }

    // An answer is only ever an answer to the box that is standing: no pending prompt (a stale
    // click, a forged payload) falls back to the ask, so nothing burns without being asked twice.
    const answering = step === "1" || step === "2";
    const target = String(
      (answering && pending ? pending.id : "") || p.id || lib0.selected || ""
    );
    if (!target || target.indexOf(LIB.RESEARCH_ID) === 0) return;
    // THE PINNED BOOKS ARE NOT REMOVABLE. CODEX0000BOOK and RESEARCH0BOOK legitimately have no
    // `books` row at all, so LIB.remove would answer false while the drop burned their contents.
    if (IDS.isSentinel(target)) return;

    const shelfRow = (lib0.books || []).find((bk) => String(bk.id) === target) || null;
    const bookName = String((shelfRow && shelfRow.name) || (pending && pending.name) || target);

    // THE ASK — and the escalation. Both read the counts fresh: he may have emptied the book in the
    // seconds between the two boxes, and the second warning must name what is there NOW.
    if (!answering || !pending || String(pending.id) !== target) {
      askBookRemove(objectApi, target, bookName, 1).catch((e) => surface(objectApi, e));
      return;
    }
    if (step === "1") {
      const held = Number(pending.folders || 0) + Number(pending.cards || 0) +
        Number(pending.pages || 0) + Number(pending.trashed || 0);
      if (held > 0) {
        askBookRemove(objectApi, target, bookName, 2).catch((e) => surface(objectApi, e));
        return;
      }
      // An empty book takes one confirmation, exactly as he ruled — fall through to the burn.
    }

    // THE BURN. Only stage 2, or stage 1 on a book that holds nothing, ever reaches this line. The trash cue rides HERE, not on the action receipt: CHROME_CUE fires once per action, so leaving bookRemove in that map played the delete sound at the ask and at the cancel too.
    SFX.play(objectApi, "cards.trashed");
    const gone = STORE.book(target);
    if (!gone || typeof gone.drop !== "function") {
      patchLibrary(objectApi, { confirmRemove: null });
      surface(objectApi, new Error("book " + target + " has no statement set — nothing was deleted"));
      return;
    }
    // THE ORDER IS THE FIX (2026-08-29). The rows go FIRST and the index row only if they went: a refused drop used to be swallowed while `books` lost its row anyway, leaving a book nobody could reach and every row it owned still in the tables. Now a failed drop surfaces through the app's own error lane and the shelf entry stays standing, so the book is still openable.
    busyStart(objectApi, "book", "Deleting book tables…");
    Promise.resolve(gone.drop(objectApi)).then(() => {
      // The book's memory dies with its rows — nothing may write a mirror row back behind the burn.
      GRAPH.invalidate(target);
      return LIB.remove(objectApi, target);
    }).then(() => {
      CONFIG.clearBook(objectApi, target);
      pageEnvDrop(target);
      const lib = Object.assign({}, DEFAULT_UI.library, ui.library || {});
      return refresh(objectApi, {
        selected: lib.selected === target ? null : lib.selected,
        openBook: lib.openBook === target ? null : lib.openBook,
        metaFor: lib.metaFor === target ? null : lib.metaFor,
        renaming: null,
        // The box goes away with the book — and, below, with a failure too: a prompt left standing
        // over a book that is still there would take a second Delete as an answer to nothing.
        confirmRemove: null,
      });
    }).then(() => busyEnd(objectApi, "book"), (e) => {
      busyEnd(objectApi, "book");
      patchLibrary(objectApi, { confirmRemove: null });
      surface(objectApi, e);
    });
    return;
  }

  if (a.bookSelect) {
    const id = String((d.bookSelect && d.bookSelect.id) || "");
    if (!id || RESEARCH.isRetired(id)) return;
    if (cardsState(objectApi).folderLoading) return;
    const pin = RESEARCH.parse(id);
    if (pin) {
      patchLibrary(objectApi, { selected: id, openBook: pin.id, renaming: null });
      if(STUDIOPROJECTS.kind(pin.id))STUDIOPROJECTS.begin(objectApi,pin.id,pin.id);
      leavePageForFolder(objectApi, pin.id);
      patchCards(objectApi, { folderLoading: true });
      pageEnvWarm(objectApi, pin.id);
      openPinnedBook(objectApi, pin)
        .catch((e) => surface(objectApi, e))
        .finally(() => patchCards(objectApi, { folderLoading: false }));
      return;
    }
    // Selecting must not cancel a rename in flight — the first click of a double-click arrives after.
    const cur = Object.assign({}, DEFAULT_UI.library, ui.library || {});
    patchLibrary(objectApi, {
      selected: id,
      openBook: id,
      renaming: cur.renaming === id ? id : null,
    });
    const picked = (cur.books || []).find((b) => b.id === id) || null;
    if (picked) {
      leavePageForFolder(objectApi, id);
      patchCards(objectApi, { folderLoading: true });
      pageEnvWarm(objectApi, picked.id);
      loadFolder(
        objectApi,
        { folderId: id, folderPath: [], selected: null, menu: false, meta: null, modal: null, view: "folder", error: "" },
        { id: picked.id, name: picked.name }
      )
        .catch((e) => surface(objectApi, e))
        .finally(() => patchCards(objectApi, { folderLoading: false }));
    } else {
      patchCards(objectApi, { bookId: null, list: [], selected: null, meta: null, modal: null, view: "folder" });
    }
    return;
  }

  if (a.bookToggle) {
    const id = String((d.bookToggle && d.bookToggle.id) || "");
    if (!id) return;
    const inBook = String((d.bookToggle && d.bookToggle.bookId) || id);
    if (RESEARCH.isRetired(inBook)) return;
    const lib = Object.assign({}, DEFAULT_UI.library, ui.library || {});
    const expanded = Object.assign({}, lib.expanded || {});
    const kids = Object.assign({}, lib.kids || {});
    if (expanded[id]) {
      expanded[id] = false;
      kids[id] = null;
      patchLibrary(objectApi, { expanded, kids, selected: id });
      return;
    }
    expanded[id] = true;
    kids[id] = null;
    patchLibrary(objectApi, { expanded, kids, selected: id });
    loadKids(objectApi, id, inBook).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.bookMeta) {
    const id = String((d.bookMeta && d.bookMeta.id) || (ui.library || {}).selected || "");
    if (!id) return;
    ui.metaOpen = true;
    ui.menu = null;
    ui.library = Object.assign({}, DEFAULT_UI.library, ui.library || {}, { selected: id, metaFor: id });
    objectApi.patchState({ ui });
    return;
  }

  if (a.bookMetaSet) {
    const p = d.bookMetaSet || {};
    const id = String(p.id || (ui.library || {}).metaFor || "");
    if (!id) return;
    LIB.setMeta(objectApi, id, String(p.field || ""), p.value, who(objectApi)).then(() => refresh(objectApi));
    return;
  }

  if (a.bookRenameStart) {
    const id = String((d.bookRenameStart && d.bookRenameStart.id) || "");
    if (!id || RESEARCH.isPinned(id)) return;
    patchLibrary(objectApi, { renaming: id, selected: id });
    return;
  }

  if (a.bookRename) {
    const p = d.bookRename || {};
    const id = String(p.id || "");
    if (!id) return;
    LIB.rename(objectApi, id, String(p.name || ""), who(objectApi)).then(() => refresh(objectApi, { renaming: null }));
    return;
  }

  if (a.bookMove) {
    const p = d.bookMove || {};
    const id = String(p.id || "");
    if (!id) return;
    LIB.reorder(objectApi, id, Number(p.toIndex), projectIdOf(objectApi)).then(() => refresh(objectApi));
    return;
  }

  if (a.recoverOpen) {
    openRecover(objectApi).catch((e) => recoverFail(objectApi, e));
    return;
  }
  if (a.recoverClose) {
    ui.recover = Object.assign({}, DEFAULT_UI.recover);
    objectApi.patchState({ ui });
    return;
  }
  if (a.recoverRescan) {
    recoverPatch(objectApi, { open: true, loading: true, notice: "", error: "" });
    runRecoverScan(objectApi).catch((e) => recoverFail(objectApi, e));
    return;
  }
  if (a.recoverAdopt) {
    recoverAdoptAct(objectApi, d.recoverAdopt || {}).catch((e) => recoverFail(objectApi, e));
    return;
  }
  if (a.recoverRebuild) {
    recoverRebuildAct(objectApi, d.recoverRebuild || {}).catch((e) => recoverFail(objectApi, e));
    return;
  }
  if (a.recoverSweep) {
    recoverSweepAct(objectApi, d.recoverSweep || {}).catch((e) => recoverFail(objectApi, e));
    return;
  }

  if (a.cfgRemoveArm) {
    ui.config = Object.assign({}, DEFAULT_UI.config, ui.config || {}, {
      remove: Object.assign({}, (ui.config || {}).remove || {}, {
        armed: !!(d.cfgRemoveArm || {}).on,
        error: null,
      }),
    });
    objectApi.patchState({ ui });
    return;
  }

  if (a.cfgOpen) {
    // his ruling: a menu that needs to load opens instantly with a shell that fills on load.
    const requested = String((d.cfgOpen && d.cfgOpen.tab) || "user");
    const tab = ["user", "tags", "remove"].includes(requested) ? requested : "user";
    ui.menu = null;
    ui.config = Object.assign({}, DEFAULT_UI.config, ui.config || {}, { open: true, tab: tab, loading: true });
    objectApi.patchState({ ui });
    loadConfig(objectApi, { open: true, tab, loading: false }).catch((e) => {
      const now = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
      now.config = Object.assign({}, DEFAULT_UI.config, now.config || {}, { loading: false });
      objectApi.patchState({ ui: now });
      surface(objectApi, e);
    });
    return;
  }

  if (a.cfgClose) {
    ui.config = Object.assign({}, DEFAULT_UI.config, ui.config || {}, { open: false });
    objectApi.patchState({ ui });
    return;
  }

  if (a.cfgTab) {
    const requested = String((d.cfgTab && d.cfgTab.tab) || "user");
    const tab = ["user", "tags", "remove"].includes(requested) ? requested : "user";
    ui.config = Object.assign({}, DEFAULT_UI.config, ui.config || {}, { tab: tab });
    objectApi.patchState({ ui });
    if (tab === "tags") {
      TAGDEFS.handleAction(objectApi, "tagDefAct", { op: "load" }).catch((e) => surface(objectApi, e));
    }
    if (tab === "remove") {
      removeSurvey(objectApi).catch((e) => surface(objectApi, e));
    }
    return;
  }

  if (a.appRemove) {
    removeRun(objectApi, d.appRemove || {}).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.cfgSet) {
    const p = d.cfgSet || {};
    const scope = String(p.scope || "");
    const key = String(p.key || "");
    if (!key) return;
    let value = p.value;
    if (p.type === "number") value = Number(value);
    else if (p.type === "bool") value = value === true || value === "true";
    else if (p.type === "json") {
      try {
        value = JSON.parse(String(value));
      } catch (e) {
        return;
      }
    }
    if (p.type === "bool") SFX.play(objectApi, value ? "ui.toggleOn" : "ui.toggleOff");
    else SFX.play(objectApi, "ui.buttonPress");
    if (key === "audioMaster" || key === "audioCategories") SFX.invalidate();
    if (scope === "user" && key === "fontScale") {
      ui.fontScale = fontScaleOf(value);
      objectApi.patchState({ ui });
    }
    // Paper zoom nudges land instantly — he's calibrating against a real ruler, so the paper must move under the press, not after the SQL round trip. Only when the config mirror is already loaded: a sparse user object here would blank the settings rows until loadConfig refills it.
    if (scope === "user" && key === "paperZoom" && ui.config && ui.config.user && typeof ui.config.user === "object") {
      const u = Object.assign({}, ui.config.user);
      u.paperZoom = paperZoomOf(value);
      ui.config = Object.assign({}, DEFAULT_UI.config, ui.config || {}, { user: u });
      objectApi.patchState({ ui });
    }
    const afterSet = () => {
      pageEnvDropAll();
      const openBookS = (((objectApi.getState().ui || {}).library) || {}).openBook;
      if (openBookS) pageEnvWarm(objectApi, openBookS);
      loadConfig(objectApi);
      if (key === "depthLabels") refreshDepthLabels(objectApi);
    };
    if (scope === "user") {
      CONFIG.setUser(objectApi, myId(objectApi), key, value).then(afterSet).catch((e) => surface(objectApi, e));

    }
    return;
  }

  // THE COMPILE LANE's four presses. Every one of them lands here and nowhere else: ui.compile is
  // this file's to write, and the fragments only read it.
  if (a.docSet) {
    docSetPress(objectApi, d.docSet || {}).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.compileOpen) {
    compilePress(objectApi, d.compileOpen || {}).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.compileLand) {
    compileLandPress(objectApi).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.compileClose) {
    patchCompile(objectApi, {
      open: false,
      folderId: "",
      folderName: "",
      kind: "",
      plan: null,
      results: null,
      landing: false,
      error: "",
    });
    SFX.play(objectApi, "ui.buttonPress");
    return;
  }

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  if (a.searchRun) {
    const p = d.searchRun || {};
    startSearchWin(objectApi, p.query, { page: p.page, force: p.force === true });
    return;
  }

  if (a.searchOpt) {
    const p = d.searchOpt || {};
    const opt = String(p.opt || "");
    if (opt !== "matchCase" && opt !== "wholeWord") return;
    const on = p.on === true || p.on === "true";
    const cur = searchWinState(objectApi);
    const next = Object.assign({}, cur, { [opt]: on });
    startSearchWin(objectApi, p.query, { force: true, patch: { [opt]: on, page: 0 } });
    SEARCH.savePrefs(objectApi, myId(objectApi), {
      scope: next.scope,
      matchCase: next.matchCase,
      wholeWord: next.wholeWord,
    }).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.searchScope) {
    const p = d.searchScope || {};
    const scope = String(p.scope || "all");
    const cur = searchWinState(objectApi);
    startSearchWin(objectApi, p.query, { force: true, patch: { scope, page: 0 } });
    SEARCH.savePrefs(objectApi, myId(objectApi), {
      scope,
      matchCase: cur.matchCase,
      wholeWord: cur.wholeWord,
    }).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.searchGo) {
    searchGoTo(objectApi, d.searchGo || {}).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.searchBack) {
    patchSearchWin(objectApi, { open: true, stashed: false });
    return;
  }

  if (a.searchClose) {
    const keep = searchWinState(objectApi);
    ui.search = "";
    objectApi.patchState({ ui });
    patchSearchWin(
      objectApi,
      Object.assign({}, DEFAULT_UI.searchWin, {
        scope: keep.scope,
        matchCase: keep.matchCase,
        wholeWord: keep.wholeWord,
      })
    );
    return;
  }

  if (a.importWinOpen) {
    openImport(objectApi).catch((e) => importFail(objectApi, e));
    return;
  }

  if (a.importWinClose) {
    ui.importWin = Object.assign({}, DEFAULT_UI.importWin);
    objectApi.patchState({ ui });
    return;
  }

  if (a.importFile) {
    importFileAct(objectApi, d.importFile || {}).catch((e) => importFail(objectApi, e));
    return;
  }

  if (a.importParse || a.importMode || a.importTarget || a.importApply) {
    importAct(objectApi, d).catch((e) => importFail(objectApi, e));
    return;
  }

  if (a.refsAct) {
    const p = d.refsAct || {};
    REFS.fixDangling(objectApi, Object.assign({ projectId: projectIdOf(objectApi) }, p))
      .then(() => refreshCards(objectApi))
      .catch((e) => surface(objectApi, e));
    return;
  }

  // his ask: a clear button on the left of the error; no surface holds more than one error.
  if (a.errClear) {
    const where = String((d.errClear && (d.errClear.where || d.errClear.scope)) || "cards");
    
    
    if (where === "cardImage") {
      const m = cardsState(objectApi).modal;
      if (m) patchCards(objectApi, { modal: Object.assign({}, m, { imageError: "", imageBusy: false }) });
      return;
    }
    if (where === "findWin") {
      findPatch(objectApi, { error: "" });
      return;
    }
    if (where === "searchWin") {
      patchSearchWin(objectApi, { error: "" });
      return;
    }
    if (where === "importWin") {
      importPatch(objectApi, { error: "" });
      return;
    }
    
    
    
    if (where === "search") {
      const st = cardsState(objectApi);
      patchCards(objectApi, { search: Object.assign({}, st.search || {}, { error: "" }) });
    } else if (where === "cards" || where === "page") {
      patchCards(objectApi, { error: "" });
    } else if (where === "trash") {
      ui.trash = Object.assign({}, ui.trash || {}, { error: "" });
      objectApi.patchState({ ui });
    } else if (where === "export") {
      ui.exportWin = Object.assign({}, ui.exportWin || {}, { error: "" });
      objectApi.patchState({ ui });
    } else if (where === "coop") {
      if (ui.coop && typeof ui.coop === "object") ui.coop = Object.assign({}, ui.coop, { error: null });
      objectApi.patchState({ ui });
    } else if (where === "shelf") {
      patchShelf(objectApi, { error: "" });
    } else if (where === "door") {
      if (ui.door && typeof ui.door === "object") ui.door = Object.assign({}, ui.door, { error: "" });
      objectApi.patchState({ ui });
    } else if (where === "tags") {
      const cfg = Object.assign({}, ui.config || {});
      const tags = Object.assign({}, cfg.tags || {});
      tags.error = "";
      if (tags.draft && typeof tags.draft === "object") tags.draft = Object.assign({}, tags.draft, { reason: "" });
      cfg.tags = tags;
      ui.config = cfg;
      objectApi.patchState({ ui });
    }
    return;
  }

  
  
  
  
  
  

  if (a.findWinOpen) {
    openFind(objectApi);
    return;
  }
  if (a.findWinClose) {
    const p = d.findWinClose || {};
    ui.findWin = Object.assign({}, DEFAULT_UI.findWin, {
      query: String(p.query || (ui.findWin || {}).query || ""),
      replacement: String(p.replacement || (ui.findWin || {}).replacement || ""),
      opts: findState(objectApi).opts,
    });
    objectApi.patchState({ ui });
    SFX.play(objectApi, "ui.windowClose");
    return;
  }
  if (a.findRun) {
    findRun(objectApi, d.findRun || {}).catch((e) => surface(objectApi, e));
    return;
  }
  if (a.findOpt) {
    findOpt(objectApi, d.findOpt || {}).catch((e) => surface(objectApi, e));
    return;
  }
  if (a.findGo) {
    findGo(objectApi, d.findGo || {}).catch((e) => surface(objectApi, e));
    return;
  }
  if (a.findReplaceOne) {
    findReplaceOne(objectApi, d.findReplaceOne || {}).catch((e) => surface(objectApi, e));
    return;
  }
  if (a.findReplaceAll) {
    findReplaceAll(objectApi, d.findReplaceAll || {}).catch((e) => surface(objectApi, e));
    return;
  }

  if (a.uiMenu) {
    const name = d.uiMenu && d.uiMenu.menu;
    ui.menu = ui.menu === name ? null : name;
    objectApi.patchState({ ui });
    if (ui.menu) SFX.play(objectApi, "ui.menuOpen");
    return;
  }

  if (a.uiMenuItem) {
    const item = String((d.uiMenuItem && d.uiMenuItem.item) || "");
    ui.menu = null;
    objectApi.patchState({ ui });
    // matched before the Docs table so no article can swallow these items.
    
    
    
    if (item === "Piano Roll…") { surface(objectApi,new Error("Open a page, then enable Piano roll in Metadata")); return; }
    if (item === "Search…") {
      const keep = searchWinState(objectApi);
      patchSearchWin(objectApi, { open: true, stashed: false, error: "" });
      if (String(keep.query || "").trim().length >= SEARCH.MIN_CHARS) {
        startSearchWin(objectApi, keep.query, { force: true });
      }
      SFX.play(objectApi, "ui.windowOpen");
      return;
    }
    const topic = DOCSUI.topicForLabel(item);
    if (topic) {
      openDocsWindow(objectApi, topic);
      return;
    }
    if (item === "Undo" || item.indexOf("Undo ") === 0) {
      editStep(objectApi, "undo").catch((e) => surface(objectApi, e));
      return;
    }
    if (item === "Redo" || item.indexOf("Redo ") === 0) {
      editStep(objectApi, "redo").catch((e) => surface(objectApi, e));
      return;
    }
    if (item === "Import…") {
      openImport(objectApi).catch((e) => importFail(objectApi, e));
      return;
    }
    if (item === "Trash…") {
      cardAct(objectApi, { op: "trashOpen" }).catch((e) => surface(objectApi, e));
      return;
    }
    if (item === "Find & Replace…") {
      openFind(objectApi);
      return;
    }
    
    if (item === "Cut" || item === "Copy" || item.indexOf("Cut ") === 0 || item.indexOf("Copy ") === 0) {
      clipAct(objectApi, item.indexOf("Cut") === 0 ? "cut" : "copy").catch((e) => surface(objectApi, e));
      return;
    }
    if (item === "Paste" || item.indexOf("Paste ") === 0) {
      clipAct(objectApi, "paste").catch((e) => surface(objectApi, e));
      return;
    }
    if (item === "Preferences…") {
      const now = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
      now.menu = null;
      now.config = Object.assign({}, DEFAULT_UI.config, now.config || {}, { open: true, tab: "user", loading: true });
      objectApi.patchState({ ui: now });
      loadConfig(objectApi, { open: true, tab: "user", loading: false }).catch((e) => {
        const cur = Object.assign({}, DEFAULT_UI, objectApi.getState().ui || {});
        cur.config = Object.assign({}, DEFAULT_UI.config, cur.config || {}, { loading: false });
        objectApi.patchState({ ui: cur });
        surface(objectApi, e);
      });
    } else if (item === "Export…") {
      openExport(objectApi, "book");
    }
    return;
  }

  if (a.expOpen) {
    const now0 = Object.assign({}, DEFAULT_UI.exportWin, ui.exportWin || {});
    openExport(
      objectApi,
      String((d.expOpen && d.expOpen.scope) || "book"),
      String((d.expOpen && d.expOpen.format) || now0.format || "text"),
      String(d.expOpen?.bookId || "")
    );
    return;
  }

  if (a.expScope) {
    const now1 = Object.assign({}, DEFAULT_UI.exportWin, ui.exportWin || {});
    openExport(
      objectApi,
      String((d.expScope && d.expScope.scope) || now1.scope || "book"),
      String((d.expScope && d.expScope.format) || now1.format || "text"),
      d.expScope?.bookId !== undefined ? String(d.expScope.bookId) : String(now1.bookId || "")
    );
    return;
  }

  if (a.expClose) {
    require("lib/export-preview.js").clear(objectApi,"book");
    ui.exportWin = { open: false, loading: false, scope: "book", format: "text", text: "", addr: "", files: [], error: "" };
    objectApi.patchState({ ui });
    return;
  }

  if (a.docsOpen) {
    const topic = String((d.docsOpen && d.docsOpen.topic) || "");
    if (!topic) return;
    openDocsWindow(objectApi, topic);
    return;
  }

  if (a.docsClose) {
    ui.docs = null;
    objectApi.patchState({ ui });
    return;
  }

  if (a.uiShell) {
    const want = String((d.uiShell && d.uiShell.shell) || "");
    if (want !== "full" && want !== "notepad") return;
    shellSync(ui, want);
    ui.menu = null;
    objectApi.patchState({ ui });
    return;
  }

  if (a.uiNotepadPane) {
    const raw = d.uiNotepadPane && d.uiNotepadPane.pane;
    const want = raw === "nav" || raw === "meta" ? raw : null;
    ui.notepadPane = want && ui.notepadPane === want ? null : want;
    shellSync(ui);
    ui.menu = null;
    objectApi.patchState({ ui });
    if(ui.notepadPane==="meta")requestPageMeta(objectApi);
    return;
  }

  if (a.uiNotepadBox) {
    const p = d.uiNotepadBox || {};
    if (!Number.isFinite(Number(p.x)) || !Number.isFinite(Number(p.y))) return;
    ui.notepadBox = boxSane(p);
    objectApi.patchState({ ui });
    return;
  }

  if (a.uiMeta) {
    ui.metaOpen = !ui.metaOpen;
    ui.menu = null;
    objectApi.patchState({ ui });
    if(ui.metaOpen)requestPageMeta(objectApi);
    return;
  }

  if (a.uiPane) {
    const next = require("lib/ui-pane-resize.js").apply(ui,d.uiPane);
    if(next)objectApi.patchState({ ui: next });
    return;
  }

  if (a.uiSearch) {
    ui.search = String((d.uiSearch && d.uiSearch.q) || "");
    objectApi.patchState({ ui });
    if (!ui.search.trim()) {
      const keep = searchWinState(objectApi);
      patchSearchWin(
        objectApi,
        Object.assign({}, DEFAULT_UI.searchWin, {
          scope: keep.scope,
          matchCase: keep.matchCase,
          wholeWord: keep.wholeWord,
        })
      );
      return;
    }
    startSearchWin(objectApi, ui.search);
  }
}
