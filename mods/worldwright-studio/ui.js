const ARRANGEMENTUI=require('lib/ui-arrangement.js');
const STUDIOPROJECTUI=require('lib/ui-studio-projects.js');
const EDITOR_FOCUS=require("lib/ui-editor-lifecycle.js");
const WORKBENCHUI=require("lib/ui-workbench.js");
// Worldwright Studio — application shell: menu bar / left nav / centre panel / right metadata / footer.

const THEME = require("lib/data/ui-theme.yml");
const MODS = require("lib/ui-mods.js");
const COOP = require("lib/ui-coop.js");
const STATUS = require("lib/status.js");
const SETTINGS = require("lib/ui-settings.js");
const RESEARCH = require("lib/data/research-book.yml");
const PINREG = require("lib/pinned.js");
const CARDSUI = require("lib/ui-cards.js");
const META = require("lib/ui-meta.js");
const PAGEUI = require("lib/ui-page.js");
const PIANOUI = require("lib/ui-roll-editor.js");
const DOCSUI = require("lib/ui-docs.js");
const TRASHUI = require("lib/ui-trash.js");
const EXPORTUI = require("lib/ui-export.js");
const FINDUI = require("lib/ui-find.js");
const SEARCHUI = require("lib/ui-search.js");
const IMPORTUI = require("lib/ui-import.js");

const COMPILEUI = require("lib/ui-compile.js");



const BG = require("lib/backgrounds.js");
const NPDRAG = require("lib/npdrag.js");
const PANERESIZE = require("lib/ui-pane-resize.js");
const QUIET = require("lib/ui-quiet.js");
const LIVEMD = require("lib/livemd.js");
const RECOVERUI = require("lib/ui-recover.js");


const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// For text inside a JS string inside an HTML attribute — a raw apostrophe kills the whole render.
const jsq = (s) =>
  String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// his ruling: a footer notice that books, folders and pages may be slow until cached.
const COLD_LINE = "Books, folders and pages may take a moment to load until they're cached for the session.";

export function shelfStrip(ui) {
  const shelf = ui.shelf || {};
  if (shelf.mine !== false) return "";
  const who = String(shelf.name || "").trim();
  // his ruling (2026-08-26): read-only is the DEFAULT on someone else's shelf.
  const pen = shelf.canWrite === true ? "you may write here." : "read-only — their allow list decides who writes.";
  return `<div id="sb-shelf-strip">
    <span class="dot"></span>
    <span class="who">Reading <b>${esc(who ? who + "’s" : "another author’s")}</b> shelf — ${pen}</span>
    <button data-interactive onclick="sendAction('shelfMine', {}); this.blur();">Back to my shelf</button>
  </div>`;
}

const CHROME_FALLBACK = {
  appBg: "oklch(0.20 0.008 70)",
  ink: "oklch(0.88 0.012 85)",
  inkDim: "oklch(0.66 0.012 80)",
  line: "oklch(0.32 0.010 70)",
  panel: "oklch(0.235 0.008 70)",
  panel2: "oklch(0.255 0.009 72)",
  center: "oklch(0.215 0.007 70)",
  field: "oklch(0.185 0.006 70)",
  hover: "oklch(0.30 0.012 72)",
  hoverHi: "oklch(0.34 0.016 70)",
  status: "oklch(0.245 0.009 72)",
  accent: "oklch(0.78 0.105 68)",
  warn: "oklch(0.68 0.170 32)",
  ok: "oklch(0.76 0.110 148)",
  lift: "oklch(0.99 0.005 85)",
  menubar: "oklch(0.272 0.012 68)",
  footer: "oklch(0.262 0.011 68)",
  select: "oklch(0.36 0.030 68)",
  selectInk: "oklch(0.96 0.015 85)",
  banner: "oklch(0.335 0.020 70)",
  banner2: "oklch(0.288 0.016 70)",
  bannerEdge: "oklch(0.40 0.028 68)",
  bannerInk: "oklch(0.90 0.030 82)",
  chip: "oklch(0.285 0.015 70)",
  chipEdge: "oklch(0.38 0.022 70)",
  chipInk: "oklch(0.86 0.025 82)",
  mark: "oklch(0.62 0.130 72)",
  markInk: "oklch(0.16 0.020 70)",
  scroll: "oklch(0.40 0.018 70)",
};

const FONT_STEPS = [0.85, 1, 1.15, 1.3, 1.5];
export function fsOf(ui) {
  const n = Number((ui || {}).fontScale);
  for (const s of FONT_STEPS) if (Math.abs(s - n) < 0.001) return s;
  return 1;
}

export function chromeOf(ui) {
  const base = String(THEME.defaultThemeId || "0");
  const authored = (THEME.chrome && THEME.chrome[base]) || null;
  const live = (ui && ui.theme && ui.theme.chrome) || null;
  return Object.assign({}, CHROME_FALLBACK, authored || {}, live || {});
}

// Keep the active Slate backdrop and the legacy saved palette.
export function backdropCss(ui) {
  const id = String((ui && ui.theme && ui.theme.id) || THEME.defaultThemeId || "0");
  const theme = Object.assign({}, (THEME.themes || {})[id] || {}, (ui && ui.theme) || {});
  return BG.css(theme);
}

// SHELL CONTRACT v3 — notepad geometry in ONE place (ui-theme.json layout.notepad); npdrag.js's clamp and ui-page.js's measure read the same box.
const NPB = Object.assign(
  { w: 460, h: 560, strip: 50, bar: 46, foot: 28, rail: 48, pad: 16, railPad: 72, hazard: 96, x: 132, y: 76 },
  (THEME.layout && THEME.layout.notepad) || {}
);

// THE STUDIO CHROME MAP (jace, 2026-09-01 evening, screenshot in hand: "all the buttons at the top left are under spawn chrome now").
const STUDIO = (function () {
  const s = (THEME.layout && THEME.layout.studio) || {};
  const box = (v, d) => ({
    w: Math.max(0, Number((v && v.w) ?? d.w) || 0),
    h: Math.max(0, Number((v && v.h) ?? d.h) || 0),
  });
  return { topLeft: box(s.topLeft, { w: 330, h: 64 }), bottomRight: box(s.bottomRight, { w: 110, h: 96 }),
    rightRail: s.rightRail,
    menuDock: Object.assign({ columns: 3, buttonHeight: 44, padding: 8, gap: 4 }, s.menuDock || {}) };
})();

export function styles(ui) {
  const navW = ui.navWidth ?? THEME.layout.navWidth;
  const metaW = ui.metaWidth ?? THEME.layout.metaWidth;
  const c = chromeOf(ui);
  return `<style>
  /* THE HOLD (session lane) — #sb-app is born hidden AT PARSE TIME, before any script runs: the
     vigil-flash audit (jace, 2026-08-29 "10ms flash of a page... there was text") proved a
     script-injected hold loses the first-paint race. Woven into the markup it cannot lose it.
     Two layers because visibility alone leaks (a child declaring visibility:visible — ui-page's
     unsaved chip — paints through a hidden ancestor); opacity:0 at the root is absolute.
     The LIFT is #sb-hello-lift, head-injected by the session-lane bootstrap on nonce receipt
     (double-id, so it outranks this rule; head, so re-renders never clobber it). The animation is
     the dead-JS bail: if no script ever runs, the app unveils itself after 14s — a stale beat
     over a dead app, always. No !important anywhere here, or the bail could never win. */
  #sb-app { visibility: hidden; opacity: 0; animation: sbHelloBail 0s linear 14s forwards; }
  @keyframes sbHelloBail { to { visibility: visible; opacity: 1 } }
  /* Every font-size is a calc() off this multiplier; on :root too, for pieces outside the app box. */
  :root { --sb-fs: ${fsOf(ui)}; }
  #sb-app, #sb-app * { box-sizing: border-box; }
  /* ONE palette — nothing below hardcodes a shade. */
  #sb-app {
    --sb-bg: ${c.appBg};
    --sb-wash: none;
    --sb-stars: none;
    --sb-stars-size: 1000px 700px;
    --sb-ink: ${c.ink};
    --sb-ink-dim: ${c.inkDim};
    --sb-line: ${c.line};
    --sb-panel: ${c.panel};
    --sb-panel-2: ${c.panel2};
    --sb-center: ${c.center};
    --sb-field: ${c.field};
    --sb-hover: ${c.hover};
    --sb-hover-hi: ${c.hoverHi};
    --sb-status: ${c.status};
    --sb-accent: ${c.accent};
    --sb-warn: ${c.warn};
    --sb-ok: ${c.ok};
    --sb-lift: ${c.lift};
    --sb-menubar: ${c.menubar};
    --sb-footer: ${c.footer};
    --sb-select: ${c.select};
    --sb-select-ink: ${c.selectInk};
    --sb-banner: ${c.banner};
    --sb-banner-2: ${c.banner2};
    --sb-banner-edge: ${c.bannerEdge};
    --sb-banner-ink: ${c.bannerInk};
    --sb-chip: ${c.chip};
    --sb-chip-edge: ${c.chipEdge};
    --sb-chip-ink: ${c.chipInk};
    --sb-mark: ${c.mark};
    --sb-mark-ink: ${c.markInk};
    --sb-scroll: ${c.scroll};
    /* how hard a status hue tints a banner or a pill — the theme's lightness carries the rest */
    --sb-tint: 32%;
    /* derived from the theme's own base, never flat black — a cool theme casts cool shadows */
    --sb-shadow: color-mix(in oklch, var(--sb-bg) 45%, black);
    --sb-scrim: color-mix(in oklch, var(--sb-bg) 80%, black);
    --sb-ring: color-mix(in oklch, var(--sb-accent) 82%, var(--sb-select));
    /* red means red on every theme: the theme's own destructive slot, with a readable floor. */
    --sb-danger: ${c.warn};
    --sb-control-scheme: ${c.mode === 'light' ? 'light' : 'dark'};
    /* the older short names other fragment files already reference — aliases, not a second source */
    --line: var(--sb-line);
    --panel: var(--sb-panel);
    --panel-2: var(--sb-panel-2);
    --panel-3: color-mix(in oklch, var(--sb-panel-2) 55%, var(--sb-hover));
    --ink: var(--sb-ink);
    --ink-dim: var(--sb-ink-dim);
    --ink-2: var(--sb-ink-dim);
    --text: var(--sb-ink);
    --accent: var(--sb-accent);
  }
  #sb-app {
    /* Full-bleed on purpose. A 10px inset band did NOT stop the engine parking the world under a
       raised UI — don't re-try it; incident 971baaec has the full test ladder. */
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: calc(13px * var(--sb-fs, 1)); line-height: 1.35;
    color: var(--sb-ink);
    background: var(--sb-wash), var(--sb-stars) 0 0 / var(--sb-stars-size) repeat, var(--sb-bg);
    --nav-w: ${navW}px;
    --meta-w: ${metaW}px;
  }
  /* One reservation for prose, Piano Roll, Audio and every Asset Studio mode.
     The background remains full-bleed; only the content gets an empty rail gutter. */
  #sb-app:not(.sb-np) {
    --sb-chrome-clearance: calc(max(var(--spawn-chrome-reservation-right-inset, ${STUDIO.rightRail.fallback}px), var(--spawn-safe-area-right, 0px)) + ${STUDIO.rightRail.gap}px);
    padding-right: var(--sb-chrome-clearance);
  }
  #sb-app:not(.sb-np) #sb-sidepane { right: var(--sb-chrome-clearance); }
  #sb-app:not(.sb-np) #sb-blockveil { padding-right: var(--sb-chrome-clearance); }
  /* Native controls need explicit field AND popup colors; inherited pale text alone
     leaves an unreadable white option list on Chromium and Windows. */
  #sb-app select { color-scheme: var(--sb-control-scheme); font: inherit; color: var(--sb-ink); background-color: var(--sb-field); border: 1px solid var(--sb-line); border-radius: 3px; padding: 5px 7px; }
  #sb-app select option, #sb-app select optgroup { color: var(--sb-ink); background-color: var(--sb-field); }
  #sb-app select option:checked { color: var(--sb-select-ink); background-color: var(--sb-select); }
  #sb-app select:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: 1px; }
  #sb-app select:disabled { color: var(--sb-ink-dim); }
  #sb-menubar {
    /* THE STUDIO CHROME MAP (STUDIO.topLeft): the band is as tall as Spawn's top-left tool cluster
       and its contents start past it, so undo/redo/See controls/Exit god mode sit INSIDE this band
       and nothing under the menubar (the pen bar, the nav header) is ever covered again. */
    height: ${STUDIO.topLeft.h}px; flex: 0 0 ${STUDIO.topLeft.h}px;
    background: var(--sb-menubar); border-bottom: 1px solid var(--line);
    display: flex; align-items: center; user-select: none; position: relative;
    padding-left: ${STUDIO.topLeft.w}px;
  }
  #sb-app .menu-btn {
    display: flex; align-items: center; height: 34px; padding: 0 12px; cursor: pointer;
    color: color-mix(in oklch, var(--sb-ink) 91%, var(--sb-ink-dim)); background: transparent; border: 0; font: inherit;
  }
  #sb-app .menu-btn:hover { background: var(--sb-hover); }
  #sb-app .menu-btn.open { background: var(--sb-hover-hi); color: var(--accent); }
  #sb-app .menu-slot { position: relative; display: flex; }
  /* MINIMIZE IS STRUCK (SHELL CONTRACT v2, his words: "need to remove minimize button since the tab
     does it now"). The one shell control left is #sb-shell-toggle, further down, bottom-right. */
  /* his ask (2026-08-26): both shell pills half again larger — 22px → 33px, type and glyphs with them. */
  #sb-app .sb-metatoggle {
    display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font: inherit;
    font-size: calc(17px * var(--sb-fs, 1)); font-weight: 600; letter-spacing: 0.2px;
    height: 33px; padding: 0 16px 0 11px; border-radius: 999px; white-space: nowrap;
    background: var(--sb-chip); color: var(--sb-chip-ink);
    border: 1px solid var(--sb-chip-edge);
  }
  #sb-app .sb-metatoggle:hover {
    background: color-mix(in oklch, var(--sb-chip) 72%, var(--sb-accent));
    border-color: var(--sb-accent);
  }
  #sb-app .sb-metatoggle.on { border-color: var(--sb-accent); color: var(--sb-accent); }
  #sb-app .sb-metatoggle .sb-meta-glyph {
    display: inline-flex; align-items: center; justify-content: center;
    width: 21px; height: 21px; border-radius: 50%;
    background: var(--sb-accent); color: var(--sb-bg);
    font-weight: 800; line-height: 1; font-size: calc(13.5px * var(--sb-fs, 1)); font-style: normal;
  }
  #sb-app .dropdown {
    /* 60, above the page bar's 50 (ui-page.js) — a dropped menu outranks any window bar (his:
       "menu bar over drop down menu", 2026-08-26). Still under #sb-busy/leave-guard at 90. */
    position: absolute; top: 34px; left: 0; min-width: 210px; z-index: 60;
    background: var(--sb-menubar); border: 1px solid var(--line);
    box-shadow: 0 12px 28px color-mix(in oklch, var(--sb-shadow) 55%, transparent); padding: 4px 0;
  }
  #sb-app .dropdown .item {
    display: block; width: 100%; text-align: left; padding: 6px 14px;
    background: transparent; border: 0; color: inherit; font: inherit; cursor: pointer;
  }
  #sb-app .dropdown .item:hover { background: var(--sb-hover-hi); color: var(--accent); }
  #sb-body { flex: 1 1 auto; display: flex; min-height: 0; }
  /* position: relative is load-bearing — the delete-a-book confirm floats over this pane with
     inset: 0, and an unpositioned parent would send it to the app root instead. */
  #sb-nav { width: var(--nav-w); flex: 0 0 auto; background: var(--panel); display: flex; flex-direction: column; min-width: 0; position: relative; }
  /* --- the ask before the burn (his ruling, 2026-08-31) --------------------
     Same law as .sb-modal-veil: it floats over its container, it never lays out. */
  #sb-app .sb-book-burn {
    position: absolute; inset: 0; z-index: 40;
    display: flex; align-items: center; justify-content: center; padding: 14px;
    background: color-mix(in oklch, var(--sb-scrim) 74%, transparent);
  }
  #sb-app .sb-book-burn .burn-box {
    width: 100%; max-width: 260px; padding: 14px;
    background: var(--sb-panel-2); border: 1px solid var(--line); border-radius: 4px;
    box-shadow: 0 14px 34px color-mix(in oklch, var(--sb-shadow) 70%, transparent);
  }
  #sb-app .sb-book-burn.step-2 .burn-box { border-color: var(--sb-danger); }
  #sb-app .sb-book-burn .burn-title {
    font-size: calc(13px * var(--sb-fs, 1)); color: var(--sb-ink); margin-bottom: 7px; line-height: 1.35;
  }
  #sb-app .sb-book-burn.step-2 .burn-title { color: var(--sb-danger); }
  #sb-app .sb-book-burn .burn-note {
    font-size: calc(11.5px * var(--sb-fs, 1)); color: var(--ink-dim); line-height: 1.45; margin-bottom: 6px;
  }
  #sb-app .sb-book-burn .burn-held { color: var(--sb-ink); }
  #sb-app .sb-book-burn .burn-row { display: flex; gap: 8px; margin-top: 12px; }
  #sb-app .sb-book-burn .burn-btn {
    flex: 1 1 auto; padding: 7px 9px; cursor: pointer; font: inherit;
    font-size: calc(11.5px * var(--sb-fs, 1));
    background: var(--sb-field); color: var(--sb-ink);
    border: 1px solid var(--line); border-radius: 3px;
  }
  #sb-app .sb-book-burn .burn-btn:hover { background: var(--sb-hover); border-color: var(--accent); }
  #sb-app .sb-book-burn .burn-btn:active { transform: translateY(1px); }
  #sb-app .sb-book-burn .burn-btn.gone { color: var(--sb-danger); border-color: color-mix(in oklch, var(--sb-danger) 55%, var(--sb-line)); }
  #sb-app .sb-book-burn .burn-btn.gone:hover { border-color: var(--sb-danger); background: color-mix(in oklch, var(--sb-danger) 14%, var(--sb-hover)); }
  /* 2026-09-11: the creator's screenshot puts Spawn's thinking over the old menus.
     The book-column dock starts below the top tool band and left of the speech banner.
     Every dropdown anchors below the whole dock, inside the same safe column. */
  #sb-command-dock {
    display: grid; grid-template-columns: repeat(${STUDIO.menuDock.columns}, minmax(0, 1fr));
    flex: 0 0 auto; position: relative; gap: ${STUDIO.menuDock.gap}px;
    padding: ${STUDIO.menuDock.padding}px; background: var(--sb-menubar); border-bottom: 1px solid var(--line);
  }
  #sb-command-dock .menu-slot { position: static; min-width: 0; }
  #sb-command-dock .menu-btn {
    width: 100%; min-height: ${STUDIO.menuDock.buttonHeight}px; height: auto;
    justify-content: center; padding: 4px; border: 1px solid var(--line); border-radius: 3px;
    background: var(--sb-field); font-size: calc(12px * var(--sb-fs, 1));
  }
  #sb-command-dock .menu-btn:hover, #sb-command-dock .menu-btn.open { background: var(--sb-hover-hi); }
  #sb-command-dock .dropdown {
    top: 100%; left: ${STUDIO.menuDock.padding}px; right: ${STUDIO.menuDock.padding}px;
    min-width: 0; max-height: 60vh; overflow-y: auto;
  }
  #sb-command-dock .dropdown .item { min-height: ${STUDIO.menuDock.buttonHeight}px; }
  #sb-nav .search-wrap { padding: 8px; border-bottom: 1px solid var(--line); }
  #sb-nav input.search {
    width: 100%; padding: 6px 9px; font: inherit; color: inherit;
    background: var(--sb-field); border: 1px solid var(--line); border-radius: 3px; outline: none;
  }
  #sb-nav input.search:focus { border-color: var(--accent); }
  #sb-nav .tree { flex: 1 1 auto; overflow: auto; padding: 10px 12px; color: var(--ink-dim); }
  #sb-nav .dock {
    flex: 0 0 auto; height: 68px; display: flex; align-items: center;
    padding: 0 10px; gap: 10px; border-top: 1px solid var(--line);
    background: var(--sb-status);
    /* his ask (2026-08-26): chrome floats over the nav's bottom corner — the whole dock
       rides up by its own band; trash and the savi slot stay reachable. */
    margin-bottom: 68px; border-bottom: 1px solid var(--line);
  }
  #sb-nav .dock .dock-spacer { flex: 1 1 auto; min-width: 0; }
  #sb-nav .dock .dock-slot { width: 40px; height: 40px; flex: 0 0 40px; }
  #sb-nav .savi-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: url("/cdn/public.aHR0cHM6Ly9zdHVkaW8tY2hhdC1wcm9kLmphY29iLWEzNC53b3JrZXJzLmRldi93b3Jrc2hvcC9pby9pbmdlc3Qvc291cmNlL01tbDRRbkVaaE42THZ1bzltM0R5UHktZmdoX0tEUHNpd3h4Y3ozb1ljbjgvZWUwZWViOWYtZDIyZi00ZDRhLTgyNzUtYmQ1MTUzN2Y1ODVjLzU5Yjc5OTgwLTZhZDAtNGFjOS04MjMxLTY1MTdhYzZmMjU2Zi9zYXZpLWRvY2staWNvbi5wbmc.png") center 46% / 96% no-repeat,
      radial-gradient(circle at 50% 38%, color-mix(in oklch, var(--sb-accent) 34%, transparent), color-mix(in oklch, var(--sb-accent) 10%, var(--sb-hover)));
    border: 1px solid color-mix(in oklch, var(--sb-line) 70%, var(--sb-ink-dim)); position: relative;
    box-shadow: 0 0 12px color-mix(in oklch, var(--sb-accent) 28%, transparent);
  }
  /* Okabe–Ito: every state carries motion or glow beside its hue, so none hangs on colour alone. */
  #sb-nav .savi-avatar .spark {
    position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px;
    border-radius: 50%; border: 2px solid var(--sb-status);
    background: color-mix(in oklch, var(--sb-ink-dim) 55%, var(--sb-status));
  }
  #sb-nav .savi-avatar .spark.think {
    background: #e69f00;
    animation: sb-dot-think 0.9s ease-in-out infinite;
  }
  #sb-nav .savi-avatar .spark.done {
    background: #56b4e9;
    box-shadow: 0 0 9px #56b4e9;
  }
  @keyframes sb-dot-think {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.55); opacity: 0.6; }
  }
  /* THE BUBBLE IS A SIBLING of .savi-avatar, never a child (his report, 2026-08-27: "her chat
     bubble is behind the main pane still"): .awake runs an infinite transform animation, and a
     RUNNING transform makes .savi-avatar a stacking context — a child bubble's z-index 70 is
     trapped inside it and paints UNDER the center pane's positioned bars (and leans/scales with
     the avatar). As a slot child it lives in the root context, where 70 wins clean. */
  #sb-nav #sb-dock-savi { cursor: pointer; position: relative; }
  #sb-nav #sb-dock-savi:hover .savi-avatar {
    border-color: var(--accent); box-shadow: 0 0 16px color-mix(in oklch, var(--sb-accent) 45%, transparent);
  }
  #sb-nav #sb-dock-savi:active .savi-avatar { transform: scale(0.94); }
  #sb-nav .savi-avatar { transition: box-shadow 160ms ease, border-color 160ms ease, transform 90ms ease; }
  #sb-nav .savi-avatar.awake {
    border-color: var(--accent);
    box-shadow: 0 0 22px color-mix(in oklch, var(--sb-accent) 75%, transparent);
    animation: sb-savi-lean 1.6s ease-in-out infinite;
  }
  #sb-nav .savi-avatar.awake .spark { animation: sb-savi-spark 1.1s ease-in-out infinite; }
  @keyframes sb-savi-lean {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.07); }
  }
  @keyframes sb-savi-spark {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.7); opacity: 0.5; }
  }
  #sb-nav .savi-bubble {
    position: absolute; left: 50px; bottom: 4px; white-space: nowrap;
    padding: 6px 10px; font-size: calc(11px * var(--sb-fs, 1)); letter-spacing: 0.2px;
    color: color-mix(in oklch, var(--sb-ink) 90%, white); background: color-mix(in oklch, var(--sb-panel-2) 33%, var(--sb-hover));
    border: 1px solid var(--accent); border-radius: 3px; z-index: 70;
    box-shadow: 0 6px 18px color-mix(in oklch, var(--sb-shadow) 50%, transparent);
    animation: sb-savi-bubble 180ms ease-out;
  }
  #sb-nav .savi-bubble::before {
    content: ""; position: absolute; left: -5px; bottom: 12px; width: 8px; height: 8px;
    background: color-mix(in oklch, var(--sb-panel-2) 33%, var(--sb-hover)); border-left: 1px solid var(--accent);
    border-bottom: 1px solid var(--accent); transform: rotate(45deg);
  }
  @keyframes sb-savi-bubble {
    from { opacity: 0; transform: translateX(-6px); }
    to { opacity: 1; transform: translateX(0); }
  }
  #sb-app .pane-label { font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.4px; text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line)); }
  #sb-app .handle { flex: 0 0 10px; position:relative; cursor: col-resize; touch-action:none; user-select:none; background: linear-gradient(to right,transparent 4px,var(--line) 4px,var(--line) 6px,transparent 6px); }
  #sb-app .handle:focus-visible { outline:2px solid var(--accent); outline-offset:-2px; }
  @media(pointer:coarse){#sb-app .handle{flex-basis:14px;}#sb-app .handle::after{content:"";position:absolute;inset:0 -15px;z-index:4;}}
  #sb-app .handle:hover, #sb-app .handle.dragging { background: var(--accent); }
  #sb-center { flex: 1 1 auto; min-width: 0; background: var(--sb-center); display: flex; align-items: center; justify-content: center; }
  #sb-center .empty { color: color-mix(in oklch, var(--sb-ink-dim) 53%, var(--sb-line)); font-size: calc(12px * var(--sb-fs, 1)); letter-spacing: 0.6px; }
  #sb-meta { width: var(--meta-w); flex: 0 0 auto; background: var(--panel); min-width: 0; padding: 12px; }
  #sb-footer {
    /* 26px → 41px: the footer band holds the grown 33px pills with the same breathing room. */
    /* Left inset 50px: the studio's corner chrome covers the bottom-left (same dodge as the
       dock's) — nothing readable may start in that corner. Right inset STUDIO.bottomRight.w:
       the "work on it with Savi" button that lands there when a model is selected (jace's
       screenshot, 2026-09-01) was sitting on the Notepad toggle. */
    height: 41px; flex: 0 0 41px; display: flex; align-items: center; gap: 18px;
    padding: 0 ${STUDIO.bottomRight.w}px 0 50px; background: var(--sb-footer); border-top: 1px solid var(--line);
    color: var(--ink-dim); font-size: calc(11px * var(--sb-fs, 1));
  }
  #sb-footer .spacer { flex: 1 1 auto; }
  #sb-footer .chip { display: flex; align-items: center; gap: 6px; }
  #sb-footer .chip .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
  #sb-footer .chip.saved .dot { background: var(--sb-ok); }
  #sb-footer .chip.saving .dot { background: var(--accent); animation: sb-pulse 1s ease-in-out infinite; }
  #sb-footer .chip.bad { color: var(--sb-danger); }
  #sb-footer .chip.bad .dot { background: var(--sb-danger); }
  #sb-footer .stamp { color: var(--ink-dim); opacity: 0.75; }
  /* The first-open notice (his, 2026-08-26): loads are slow until a book is cached for the
     session. Bottom bar on his word — "top or bottom, whichever has space". Gives and clips
     like the vitals rather than shoving the chips. */
  #sb-footer .sb-coldnote {
    flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--ink-dim); opacity: 0.75; font-style: italic;
  }
  /* Only this region gives, and it clips rather than pushing the chips either side of it. */
  #sb-footer .chip, #sb-footer .stamp { flex: 0 0 auto; }
  #sb-footer .vitals {
    flex: 0 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px;
    overflow: hidden; white-space: nowrap;
  }
  #sb-footer .vchip {
    flex: 0 0 auto; border-radius: 3px; padding: 0 6px; line-height: calc(15px * var(--sb-fs, 1));
    font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 0.3px;
  }
  #sb-footer .vtot { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--ink-dim); opacity: 0.7; }
  /* A write the whole window has to wait on (his: "the screen should grey out and prevent further
     clicks; also a loading wheel"). Last child of the app, over everything, and it eats the click. */
  #sb-app #sb-blockveil {
    position: fixed; inset: 0; z-index: 9000; display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-panel) 62%, transparent);
    pointer-events: auto; cursor: progress;
  }
  @keyframes sb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
  #sb-app .dropdown .item.off { opacity: 0.36; cursor: default; }
  #sb-app .dropdown .item.off:hover { background: transparent; color: inherit; }
  @keyframes sb-boot-spin { to { transform: rotate(360deg); } }
  #sb-nav .boot-kid { display: flex; align-items: center; gap: 8px; }
  #sb-nav .savi-bubble.asking { min-width: 208px; }
  #sb-nav .boot-kid .kid-wheel {
    width: 12px; height: 12px; border-radius: 50%; flex: 0 0 auto;
    border: 2px solid color-mix(in oklch, var(--sb-ink) 18%, transparent);
    border-top-color: var(--accent); animation: sb-boot-spin 0.9s linear infinite;
  }
  #sb-shelf-strip {
    flex: 0 0 auto; display: flex; align-items: center; gap: 10px; padding: 5px 12px;
    background: var(--sb-banner); border-bottom: 1px solid var(--sb-banner-edge, var(--sb-line));
    color: var(--sb-banner-ink); font-size: calc(12px * var(--sb-fs, 1));
  }
  #sb-shelf-strip .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sb-accent); flex: 0 0 auto; }
  #sb-shelf-strip .who { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-shelf-strip button {
    font: inherit; font-size: calc(11px * var(--sb-fs, 1)); padding: 3px 10px; cursor: pointer; border-radius: 0;
    background: transparent; border: 1px solid var(--sb-chip-edge, var(--sb-line)); color: inherit;
  }
  #sb-shelf-strip button:hover { background: var(--sb-hover); }
  /* --- shell switch. THE PILL IS STRUCK (SHELL CONTRACT v2); ONE button walks full ↔ notepad.
     SHELL CONTRACT v4 (his words): "Maybe as a button next to show metadata instead so we can see
     it in page edit view?" In the notepad it sits inside the title strip instead. */
  #sb-shell-toggle {
    display: inline-flex; align-items: center; gap: 10px; flex: 0 0 auto;
    height: 33px; padding: 0 16px 0 11px; border-radius: 999px;
    font: inherit; font-size: calc(17px * var(--sb-fs, 1)); font-weight: 700; letter-spacing: 0.2px;
    white-space: nowrap; cursor: pointer;
    color: var(--sb-chip-ink); background: var(--sb-chip);
    border: 1px solid var(--sb-accent);
  }
  #sb-shell-toggle:hover {
    border-color: var(--sb-accent);
    background: color-mix(in oklch, var(--sb-chip) 72%, var(--sb-accent));
  }
  #sb-shell-toggle .sb-shell-glyph {
    display: inline-flex; align-items: center; justify-content: center;
    width: 21px; height: 21px; flex: 0 0 21px; color: var(--sb-accent);
  }
  #sb-shell-toggle .sb-shell-glyph svg { width: 21px; height: 21px; }

  /* --- notepad shell. SHELL CONTRACT v3, his words: "The notepad state should reduce the UI to a
     smaller box that can be dragged around." #sb-app IS the box (${NPB.w}×${NPB.h}, at
     ui.notepadBox). THE FULL SHELL IS UNTOUCHED — every rule here is scoped to #sb-app.sb-np. */
  #sb-app.sb-np {
    position: fixed; inset: auto;
    left: var(--np-x, ${NPB.x}px); top: var(--np-y, ${NPB.y}px);
    width: min(${NPB.w}px, calc(100vw - ${NPB.railPad + NPB.pad}px));
    height: min(${NPB.h}px, calc(100vh - ${NPB.pad * 2}px));
    border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
    box-shadow: 0 26px 70px color-mix(in oklch, var(--sb-scrim) 66%, transparent);
  }
  #sb-app.sb-np.np-dragging { user-select: none; }
  /* THE TITLE STRIP — the only drag handle, ${NPB.strip}px for a coarse pointer. touch-action:none
     is what makes a FINGER drag the box instead of panning the page. */
  #sb-app.sb-np #sb-np-titlebar {
    flex: 0 0 ${NPB.strip}px; height: ${NPB.strip}px; min-height: ${NPB.strip}px;
    display: flex; align-items: center; gap: 8px; padding: 0 8px 0 9px;
    position: relative; z-index: 50;
    background: var(--sb-menubar); border-bottom: 1px solid var(--line);
    touch-action: none; -webkit-user-select: none; user-select: none; cursor: grab;
  }
  #sb-app.sb-np.np-dragging #sb-np-titlebar { cursor: grabbing; }
  #sb-app.sb-np #sb-np-titlebar .np-grip {
    flex: 0 0 auto; display: inline-flex; align-items: center; color: var(--sb-ink-dim); opacity: 0.7;
  }
  #sb-app.sb-np #sb-np-titlebar .np-title {
    flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: calc(12.5px * var(--sb-fs, 1)); font-weight: 700; letter-spacing: 0.02em;
    color: var(--sb-ink);
  }
  #sb-app.sb-np #sb-np-titlebar .menu-slot { flex: 0 0 auto; }
  /* Inside the strip once the app is a small box — the screen's bottom-right is not ours then. */
  #sb-app.sb-np #sb-shell-toggle {
    position: static; right: auto; bottom: auto; z-index: auto; flex: 0 0 auto;
    height: 42px; min-height: 42px; padding: 0 13px 0 10px; border-radius: 21px;
    font-size: calc(12px * var(--sb-fs, 1)); box-shadow: none;
  }
  #sb-app.sb-np #sb-menubar {
    height: ${NPB.bar}px; flex: 0 0 ${NPB.bar}px; align-items: center; gap: 8px; padding: 0 8px;
  }
  #sb-app.sb-np .np-menu-btn {
    display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font: inherit;
    height: 42px; min-height: 42px; padding: 0 13px 0 10px; border-radius: 6px;
    font-size: calc(12px * var(--sb-fs, 1)); font-weight: 600; letter-spacing: 0.04em;
    color: var(--sb-ink); background: var(--sb-field); border: 1px solid var(--line);
  }
  #sb-app.sb-np .np-menu-btn:hover { background: var(--sb-hover); border-color: var(--accent); }
  #sb-app.sb-np .np-menu-btn.open {
    background: var(--sb-hover-hi); color: var(--accent); border-color: var(--accent);
  }
  #sb-app.sb-np .np-spacer { flex: 1 1 auto; min-width: 0; }
  /* Capped so it can never run past the box's floor — the box clips, and a cut-off list is a lie. */
  #sb-app.sb-np .dropdown.np-drop {
    top: calc(100% + 6px); left: 0; min-width: 244px; z-index: 60; /* over the page bar's 50, same law as .dropdown above */
    max-height: min(${NPB.h - NPB.strip - 22}px, calc(100vh - ${NPB.strip + NPB.pad * 2 + 22}px));
    overflow: auto;
  }
  #sb-app.sb-np .dropdown .item { display: flex; align-items: center; min-height: 46px; padding: 6px 16px; }
  #sb-app.sb-np .np-group {
    padding: 9px 16px 4px; border-top: 1px solid var(--line);
    font-size: calc(9.5px * var(--sb-fs, 1)); font-weight: 800; letter-spacing: 1.4px;
    text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 78%, var(--sb-line));
  }
  #sb-app.sb-np .np-group.first { border-top: 0; }
  /* ONE gutter for every view in the box — lib/ui-cards.js SHELL.notepad.rail is 0 for this reason */
  #sb-app.sb-np #sb-body { padding-left: ${NPB.rail}px; }
  #sb-app.sb-np #sb-footer { height: ${NPB.foot}px; flex: 0 0 ${NPB.foot}px; gap: 12px; padding: 0 10px; }
  /* Absolute against #sb-app, not fixed, and BELOW the title strip — the handle is never covered. */
  #sb-app.sb-np #sb-siderail {
    position: absolute; left: 0; top: ${NPB.strip + NPB.bar + 10}px; transform: none; z-index: 20;
  }
  #sb-app.sb-np #sb-siderail .np-tab { min-height: 92px; padding: 10px 0; }
  #sb-app.sb-np #sb-sidepane { position: absolute; left: 0; right: 0; bottom: 0; top: ${NPB.strip}px; z-index: 24; }
  /* THE PAGE BAR YIELDS IN THE BOX (his, 2026-08-26: the card-name/back bar overlapped the open
     dropdown and the side panels). The title strip is a 50-context, so its np-drop's 60 is
     internal — against the bar's 50 it was a TIE, settled by DOM order in the bar's favour.
     At 10 the bar still covers the paper and rulers (3/6) but sits under the rail (20), the
     pane (24) and the strip's dropdown. Full shell untouched — there the bar keeps its 50
     under the 60 dropdowns. */
  #sb-app.sb-np #sb-center .sbp-bar { z-index: 10; }
  #sb-app.sb-np #sb-sidepane .sp-panel {
    left: ${NPB.rail - 4}px; top: ${NPB.bar + 6}px; bottom: ${NPB.foot + 6}px;
    width: min(calc(100% - ${NPB.rail + 16}px), var(--sp-w, 300px));
  }

  /* --- side tabs. 48×118 — a thumb target, not a hover target. */
  #sb-siderail {
    position: fixed; left: 0; top: 50%; transform: translateY(-50%); z-index: 47;
    display: flex; flex-direction: column; gap: 10px;
  }
  #sb-siderail .np-tab {
    width: 48px; min-width: 48px; min-height: 118px; padding: 14px 0; cursor: pointer; font: inherit;
    writing-mode: vertical-rl; text-orientation: mixed;
    display: flex; align-items: center; justify-content: center;
    font-size: calc(11.5px * var(--sb-fs, 1)); font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--sb-ink-dim); background: var(--sb-panel);
    border: 1px solid var(--line); border-left: 0; border-radius: 0 10px 10px 0;
    box-shadow: 6px 0 18px color-mix(in oklch, var(--sb-scrim) 40%, transparent);
  }
  #sb-siderail .np-tab:hover { color: var(--sb-ink); background: var(--sb-hover); border-color: var(--accent); }
  #sb-siderail .np-tab.on {
    color: var(--sb-select-ink); background: var(--sb-select); border-color: var(--accent);
    box-shadow: 6px 0 22px color-mix(in oklch, var(--sb-accent) 32%, transparent);
  }

  /* --- the pane that slides in over the cards: same fragment the full shell draws, own scrim + X */
  #sb-sidepane { position: fixed; inset: 0; z-index: 44; }
  #sb-sidepane .sp-scrim {
    position: absolute; inset: 0; cursor: pointer;
    background: color-mix(in oklch, var(--sb-scrim) 52%, transparent);
  }
  #sb-sidepane .sp-panel {
    position: absolute; left: 48px; top: 52px; bottom: 28px;
    width: min(86vw, var(--sp-w, 300px));
    display: flex; flex-direction: column; min-width: 0;
    background: var(--panel); border: 1px solid var(--line); border-left: 0;
    box-shadow: 22px 0 46px color-mix(in oklch, var(--sb-scrim) 58%, transparent);
    animation: sb-sp-in 140ms ease-out 1;
  }
  @keyframes sb-sp-in { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
  #sb-sidepane .sp-head {
    flex: 0 0 auto; display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 6px 0 14px;
    background: var(--sb-status); border-bottom: 1px solid var(--line);
  }
  #sb-sidepane .sp-title {
    flex: 1 1 auto; min-width: 0; font-size: calc(10.5px * var(--sb-fs, 1)); font-weight: 800;
    letter-spacing: 1.5px; text-transform: uppercase; color: var(--sb-ink-dim);
  }
  #sb-sidepane .sp-close {
    flex: 0 0 46px; width: 46px; height: 46px; min-width: 46px; min-height: 46px;
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    background: transparent; border: 1px solid transparent; border-radius: 6px;
    color: var(--sb-ink-dim); font: inherit;
  }
  #sb-sidepane .sp-close:hover { color: var(--sb-ink); background: var(--sb-hover); border-color: var(--line); }
  #sb-sidepane .sp-body { flex: 1 1 auto; min-height: 0; display: flex; }
  #sb-sidepane .sp-body > #sb-nav { width: 100%; flex: 1 1 auto; }
  #sb-sidepane .sp-body > #sb-meta { width: 100%; flex: 1 1 auto; overflow: auto; }

  /* --- doorbell's mouth. jace, 2026-08-25: "It rings, but doesn't actually prompt you to say
     anything." The bubble GROWS a field and a Send. No modal, no veil, nothing blocked. */
  #sb-nav .savi-ask { display: flex; gap: 5px; margin-top: 7px; }
  #sb-nav .savi-ask input {
    flex: 1 1 auto; min-width: 0; padding: 5px 7px; border-radius: 4px;
    background: var(--panel-3); color: var(--ink); border: 1px solid var(--line);
    font: inherit; font-size: calc(11.5px * var(--sb-fs, 1)); }
  #sb-nav .savi-ask input:focus { outline: none; border-color: var(--accent); }
  #sb-nav .savi-ask button {
    flex: 0 0 auto; min-height: 28px; padding: 4px 10px; cursor: pointer; font: inherit;
    font-size: calc(11.5px * var(--sb-fs, 1)); border-radius: 4px;
    border: 1px solid var(--line); background: var(--panel-3); color: var(--ink); }
  #sb-nav .savi-ask button:hover { border-color: var(--accent); color: var(--accent); }
  #sb-nav .savi-sent { margin-top: 6px; font-size: calc(11px * var(--sb-fs, 1)); color: var(--accent); }

  /* --- library */
  #sb-nav .lib-bar {
    flex: 0 0 auto; display: flex; align-items: center; gap: 4px;
    /* The old 40px top dodge for the studio's undo/redo is gone: the menubar band (STUDIO.topLeft)
       is tall enough to hold that chrome now, so this row starts right under it. */
    padding: 8px 8px 6px; border-bottom: 1px solid var(--line); background: var(--sb-status);
  }
  #sb-nav .lib-bar .lib-spacer { flex: 1 1 auto; }
  #sb-app .lib-btn {
    display: flex; align-items: center; justify-content: center;
    width: 42px; height: 38px; padding: 0; cursor: pointer;
    font-size: calc(17px * var(--sb-fs, 1));
    background: transparent; border: 1px solid transparent; border-radius: 3px;
    color: color-mix(in oklch, var(--sb-ink-dim) 64%, var(--sb-ink));
  }
  #sb-app .lib-btn:hover { background: var(--sb-hover); border-color: var(--line); color: var(--accent); }
  #sb-app .lib-btn:active { transform: translateY(1px); }
  #sb-app .lib-btn.off { opacity: 0.35; }
  #sb-busy {
    position: absolute; inset: 0; z-index: 90;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; pointer-events: none;
    background: color-mix(in oklch, var(--sb-scrim) 34%, transparent);
    backdrop-filter: blur(1.5px);
  }
  /* The "connection lost" explainer pill lived here. Retired 2026-08-18 on his word:
     "Looks like we can remove the connection lost disclaimers." */
  #sb-busy .busy-note {
    display: flex; align-items: center; gap: 16px; padding: 20px 30px;
    background: color-mix(in oklch, var(--sb-panel-2) 94%, var(--sb-scrim));
    border: 1px solid var(--line); border-radius: 8px;
    box-shadow: 0 22px 60px color-mix(in oklch, var(--sb-shadow) 70%, transparent);
    font-size: calc(17px * var(--sb-fs, 1)); letter-spacing: 0.01em; color: var(--sb-ink); white-space: nowrap;
    animation: sb-busy-in 0.14s ease-out;
  }
  #sb-busy .busy-wheel {
    width: 26px; height: 26px; border-radius: 50%; flex: 0 0 auto;
    border: 3px solid color-mix(in oklch, var(--sb-ink) 18%, transparent);
    border-top-color: var(--accent); animation: sb-busy-spin 0.9s linear infinite;
  }
  @keyframes sb-busy-spin { to { transform: rotate(360deg); } }
  @keyframes sb-busy-in { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
  #sb-nav .tree { padding: 6px 4px 10px; }
  #sb-app .row {
    display: flex; align-items: center; gap: 5px;
    height: 24px; padding: 0 6px 0 2px; border-radius: 3px;
    color: color-mix(in oklch, var(--sb-ink) 73%, var(--sb-ink-dim)); cursor: pointer; user-select: none; white-space: nowrap;
  }
  #sb-app .row:hover { background: color-mix(in oklch, var(--sb-panel-2) 33%, var(--sb-hover)); }
  #sb-app .row.sel { background: var(--sb-select); color: var(--sb-select-ink); }
  #sb-app .row .name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; }
  #sb-app .row .glyph { flex: 0 0 auto; color: var(--accent); opacity: 0.9; }
  #sb-app .row .glyph.off { color: color-mix(in oklch, var(--sb-ink-dim) 68%, var(--sb-line)); opacity: 0.7; }
  #sb-app .row.drop-above { box-shadow: inset 0 2px 0 var(--accent); }
  #sb-app .row.drop-below { box-shadow: inset 0 -2px 0 var(--accent); }
  #sb-app .row.dragging { opacity: 0.45; }
  #sb-app .row.empty-kid { color: color-mix(in oklch, var(--sb-ink-dim) 53%, var(--sb-line)); font-size: calc(11px * var(--sb-fs, 1)); font-style: italic; cursor: default; padding-left: 26px; }
  #sb-app .row.empty-kid:hover { background: transparent; }
  #sb-app .twisty {
    flex: 0 0 14px; width: 14px; height: 14px; padding: 0; display: flex; align-items: center; justify-content: center;
    background: transparent; border: 0; color: color-mix(in oklch, var(--sb-ink-dim) 88%, var(--sb-line)); cursor: pointer;
    transition: transform 120ms ease;
  }
  #sb-app .twisty.open { transform: rotate(90deg); color: var(--accent); }
  #sb-app .twisty.ghost { display: inline-block; }
  #sb-app .row-btn {
    flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; padding: 0; background: transparent; border: 0;
    color: color-mix(in oklch, var(--sb-ink-dim) 82%, var(--sb-line)); cursor: pointer; opacity: 0;
  }
  #sb-app .row:hover .row-btn, #sb-app .row.sel .row-btn { opacity: 1; }
  #sb-app .row-btn:hover { color: var(--accent); }
  #sb-app .kids { padding-left: 16px; }
  #sb-app .row.kid { gap: 6px; padding-left: 10px; color: var(--sb-ink); }
  #sb-app .row.kid .name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-app .row.kid .glyph { flex: 0 0 auto; color: color-mix(in oklch, var(--sb-ink-dim) 80%, var(--accent)); }
  #sb-app .row.kid .kid-count { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-app .row.kid.folder .name { color: color-mix(in oklch, var(--sb-ink) 88%, var(--accent)); }
  #sb-app .row.kid.folder .twisty { margin-left: -2px; }
  #sb-app .row.kid.folder .glyph { color: color-mix(in oklch, var(--sb-accent) 72%, var(--sb-ink-dim)); }
  #sb-app input.rename {
    flex: 1 1 auto; min-width: 0; padding: 1px 5px; font: inherit; color: inherit;
    background: var(--sb-field); border: 1px solid var(--accent); border-radius: 2px; outline: none;
  }
  #sb-nav .research {
    flex: 0 0 auto; max-height: none; overflow: visible;
    padding: 4px 4px 8px; border-top: 1px solid var(--line);
    background: color-mix(in oklch, var(--sb-center) 50%, var(--sb-panel));
  }
  #sb-nav .research .row.pinned { cursor: default; }
  #sb-nav .dock .dock-slot.trash {
    width: 54px; height: 54px; flex: 0 0 54px;
    display: flex; align-items: center; justify-content: center;
    color: color-mix(in oklch, var(--sb-ink-dim) 82%, var(--sb-line)); cursor: pointer;
    border: 1px dashed color-mix(in oklch, var(--sb-line) 75%, var(--sb-ink-dim)); border-radius: 8px;
    background: color-mix(in oklch, var(--sb-center) 50%, var(--sb-panel));
    transition: color 140ms ease, border-color 140ms ease, background 140ms ease;
  }
  #sb-nav .dock .dock-slot.trash:hover,
  #sb-nav .dock .dock-slot.trash.drop-hot {
    color: var(--accent); border-color: var(--accent);
    background: color-mix(in oklch, var(--sb-panel-2) 66%, var(--sb-hover));
  }

  /* --- center + metadata */
  #sb-center.doc-open { position: relative; flex-direction: column; align-items: stretch; justify-content: flex-start; }
  /* Two rows: one row squeezed Back down to a sliver. */
  #sb-center .doc-head {
    flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px;
    padding: 9px 16px 10px; border-bottom: 1px solid var(--line); background: var(--panel-2);
  }
  #sb-center .doc-head .sb-bar-acts { order: 10; flex: 1 1 100%; flex-wrap: wrap; }
  #sb-center .doc-head .sb-btn { height: 28px; font-size: calc(12.5px * var(--sb-fs, 1)); padding: 0 11px; }
  #sb-center .doc-head #sb-stack-back, #sb-center .doc-head #sb-folder-back { flex: 0 0 auto; }
  #sb-center .crumb { flex: 1 1 auto; font-weight: 600; letter-spacing: 0.2px; }
  #sb-center .crumb .sep { color: var(--ink-dim); margin: 0 4px; }
  #sb-center .doc-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: calc(11px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 59%, var(--sb-line)); }
  #sb-center .doc-body { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; }
  /* Dim, never disabled (his ruling) — a clean click is a no-op; .sbp-save.on is the accent. */
  #sb-center .sbp-save:not(.on) { opacity: 0.45; cursor: pointer; }
  #sb-meta { overflow: auto; }
  #sb-meta .meta-title { margin: 8px 0 12px; font-weight: 600; letter-spacing: 0.2px; }
  #sb-meta .meta-empty { margin-top: 10px; color: color-mix(in oklch, var(--sb-ink-dim) 59%, var(--sb-line)); font-size: calc(12px * var(--sb-fs, 1)); font-style: italic; }
  #sb-meta .field { margin-bottom: 12px; }
  #sb-meta .field label { display: block; margin-bottom: 4px; font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.4px; text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line)); }
  #sb-meta textarea {
    width: 100%; padding: 6px 8px; font: inherit; color: inherit; resize: vertical;
    background: var(--sb-field); border: 1px solid var(--line); border-radius: 3px; outline: none;
  }
  #sb-meta textarea:focus { border-color: var(--accent); }
  #sb-meta .seg { display: flex; gap: 0; }
  #sb-meta .seg-btn {
    width: 34px; height: 24px; font: inherit; cursor: pointer;
    background: var(--sb-field); color: var(--ink-dim);
    border: 1px solid var(--line);
  }
  #sb-meta .seg-btn:first-child { border-radius: 3px 0 0 3px; }
  #sb-meta .seg-btn:last-child { border-radius: 0 3px 3px 0; border-left: 0; }
  #sb-meta .seg-btn.on { background: var(--accent); color: var(--sb-bg); border-color: var(--accent); font-weight: 600; }
  #sb-meta .meta-foot {
    margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--line);
    font-size: calc(11px * var(--sb-fs, 1)); color: var(--ink-dim);
  }
  #sb-meta .meta-foot div { display: flex; gap: 8px; padding: 2px 0; }
  #sb-meta .meta-foot span { flex: 0 0 84px; color: color-mix(in oklch, var(--sb-ink-dim) 53%, var(--sb-line)); text-transform: uppercase; letter-spacing: 0.8px; font-size: calc(10px * var(--sb-fs, 1)); align-self: center; }

  /* --- the waiting veil ---------------------------------------------------
     The card modal and the page view both open INSTANTLY on a skeleton and fill
     in when the database answers. Same veil, same spinner, both surfaces — the
     rules live here because ui.js's stylesheet is the one always on screen.
     Geometry never moves: the veil floats over its container, it does not lay out. */
  #sb-app .sb-modal-veil {
    position: absolute; inset: 0; z-index: 5;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-panel) 70%, transparent);
  }
  #sb-app .sb-spin {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid var(--sb-line); border-top-color: var(--sb-accent);
    animation: sb-spin 700ms linear infinite;
  }
  @keyframes sb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  #sb-app .sb-spin.mini { width: 13px; height: 13px; border-width: 2px; display: inline-block; vertical-align: -2px; margin-right: 7px; }
  #sb-app .sb-btn.busy { opacity: 0.7; pointer-events: none; }
  #sb-app .sb-tile.add.busy { pointer-events: none; opacity: 0.75; }
  /* A folder switch in the air: the pane darkens under a wheel. The veil blocks clicks from its
     first frame, but only becomes VISIBLE past 120ms — a fast switch never flashes. */
  #sb-app .sb-folder-veil { opacity: 0; animation: sb-veil-in 160ms ease-out 120ms forwards; }
  @keyframes sb-veil-in { to { opacity: 1; } }
  /* --- a book opening: the grid's dim shell --------------------------------
     Ghost tiles stand where the cards will, breathing on the save chip's pulse, under the
     shared veil-and-wheel. The veil keeps its 120ms entrance, so a small book that answers
     fast never flashes a wheel over its own arrival. */
  #sb-app .sb-open-shell { position: relative; overflow: hidden; align-items: flex-start; justify-content: flex-start; }
  #sb-app .sb-ghost-grid { display: flex; flex-wrap: wrap; gap: 14px; padding: 18px; opacity: 0.35; width: 100%; }
  #sb-app .sb-ghost-grid .ghost-tile {
    width: 150px; height: 96px; border-radius: 8px; flex: 0 0 auto;
    background: color-mix(in oklch, var(--sb-panel-2) 80%, var(--sb-line));
    border: 1px solid var(--sb-line);
    animation: sb-pulse 1.6s ease-in-out infinite;
  }
  #sb-app .sb-ghost-grid .ghost-tile:nth-child(2n) { animation-delay: 0.25s; }
  #sb-app .sb-ghost-grid .ghost-tile:nth-child(3n) { animation-delay: 0.5s; }

  /* --- an open menu holds the room still -----------------------------------
     A drawer, a dropdown, a contextual menu or a modal is open: every scrolling
     pane underneath it freezes, so a finger on the panel can never slide the work
     out from under the thing it is aiming at. */
  #sb-app.menus-open .sb-scroll,
  #sb-app.menus-open #sb-nav .tree,
  #sb-app.menus-open #sb-nav .research,
  #sb-app.menus-open #sb-meta,
  #sb-app.menus-open .sbp-stage {
    overflow: hidden !important;
    touch-action: none !important;
    overscroll-behavior: contain;
  }

  /* --- a card carried by a finger ------------------------------------------
     While a tile is up, the world under it holds still: nothing scrolls, nothing
     is selected, and the browser's own long-press drag never starts (the finger
     already owns this gesture). The ghost that follows the finger is never a hit
     target — the drop test has to see the tile UNDER it, not the label. */
  #sb-app.carrying,
  #sb-app.carrying .sb-scroll,
  #sb-app.carrying #sb-nav .tree,
  #sb-app.carrying #sb-nav .research,
  #sb-app.carrying #sb-meta {
    overflow: hidden !important;
    touch-action: none !important;
    overscroll-behavior: contain;
    user-select: none;
  }
  #sb-app.carrying .sb-tile.dragging { opacity: 0.34; }
  #sb-app.carrying, #sb-app.carrying * { cursor: grabbing !important; }
  #sb-app .row.drop-into {
    box-shadow: inset 0 0 0 1px var(--accent);
    background: color-mix(in oklch, var(--sb-accent) 18%, var(--sb-hover)) !important;
    color: var(--accent);
  }
  /* --- the ghost in hand ---------------------------------------------------
     It lives on <body>, OUTSIDE #sb-app, so a re-render of the app can never wipe
     the thing the finger is holding. That costs it the app's palette, so the
     machine copies the theme vars onto it when it is born. Never a hit target:
     the drop test has to see what is UNDER it, not the ghost. */
  .sb-carry-ghost {
    position: fixed; left: 0; top: 0; z-index: 99999;
    pointer-events: none; opacity: 0.95;
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: 5px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--sb-ink, oklch(0.88 0.012 85));
    background: var(--sb-panel, oklch(0.235 0.008 70));
    border: 1px solid var(--sb-accent, oklch(0.78 0.105 68));
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.5);
    transform: rotate(-1.6deg) scale(0.97);
    transform-origin: 50% 50%;
    transition: transform 90ms ease-out, opacity 90ms ease-out;
  }
  /* A card whose move is still in the air: dimmed where it sits, with a wheel over it, until the
     folder listing comes back without it. */
  #sb-app .sb-tile.moving { position: relative; pointer-events: none; }
  #sb-app .sb-tile.moving .sb-face { opacity: 0.35; filter: saturate(0.6); }
  #sb-app .sb-tile.moving::after {
    content: ""; position: absolute; left: 50%; top: 50%; width: 24px; height: 24px;
    margin: -12px 0 0 -12px; border-radius: 50%;
    border: 2px solid color-mix(in oklch, var(--sb-accent) 30%, transparent);
    border-top-color: var(--accent);
    animation: sb-spin 720ms linear infinite;
  }
  @keyframes sb-spin { to { transform: rotate(360deg); } }

  .sb-carry-ghost .g-kind {
    flex: 0 0 auto; padding: 4px 9px 3px;
    font-size: calc(10px * var(--sb-fs, 1)); font-weight: 600; letter-spacing: 1.3px; text-transform: uppercase;
    color: var(--sb-accent, oklch(0.78 0.105 68));
    background: color-mix(in oklch, var(--sb-accent, oklch(0.78 0.105 68)) 20%, transparent);
    border-bottom: 1px solid color-mix(in oklch, var(--sb-accent, oklch(0.78 0.105 68)) 34%, transparent);
  }
  .sb-carry-ghost .g-name {
    flex: 1 1 auto; padding: 9px 10px; min-height: 0;
    font-size: calc(13.5px * var(--sb-fs, 1)); font-weight: 600; line-height: 1.3; overflow: hidden;
  }
  .sb-carry-ghost.label { transform: translate(-50%, -50%) rotate(-1.2deg); max-width: 46vw; white-space: nowrap; }
  .sb-carry-ghost.label .g-name { padding: 6px 11px; font-size: calc(12px * var(--sb-fs, 1)); }

  /* --- scrollbars wear the theme too ---------------------------------------
     Firefox takes the two-colour form, WebKit the parts. Both read the same tokens. */
  #sb-app, #sb-app * { scrollbar-color: var(--sb-scroll) var(--sb-panel); scrollbar-width: thin; }
  #sb-app ::-webkit-scrollbar { width: 10px; height: 10px; }
  #sb-app ::-webkit-scrollbar-track { background: var(--sb-panel); }
  #sb-app ::-webkit-scrollbar-thumb { background: var(--sb-scroll); border-radius: 6px;
    border: 2px solid var(--sb-panel); }
  #sb-app ::-webkit-scrollbar-thumb:hover { background: var(--sb-accent); }
  #sb-app ::-webkit-scrollbar-corner { background: var(--sb-panel); }

  /* --- the ✕ that clears an error ------------------------------------------
     jace: "a button on the left of the error". One rule, every error box in the app —
     ui-err.js draws the same markup wherever an error is written. */
  #sb-app .sb-err-x {
    display: inline-flex; align-items: center; justify-content: center; vertical-align: -4px;
    width: 18px; height: 18px; margin-right: 6px; padding: 0; flex: 0 0 18px;
    font: inherit; font-size: calc(11px * var(--sb-fs, 1)); line-height: 1; cursor: pointer; color: inherit;
    background: transparent; border: 1px solid transparent; border-radius: 3px; opacity: 0.75;
  }
  #sb-app .sb-err-x:hover { opacity: 1; border-color: currentColor; }
  #sb-app .sb-err-t { vertical-align: baseline; }


  /* --- the metadata panel reads as its own band */
  #sb-meta { border-left: 1px solid var(--line); }
  #sb-meta .seg-btn { background: var(--sb-chip); color: var(--sb-chip-ink); border-color: var(--sb-chip-edge); }
  #sb-meta .seg-btn.on { background: var(--accent); color: var(--sb-bg); border-color: var(--accent); }
${backdropCss(ui)}
  </style>`;
}

// Formatted by hand, not by Date: the engine clock is deterministic; db stamps are real epoch ms.
export function stamp(ms) {
  const n = Number(ms) || 0;
  if (!n) return "—";
  const days = Math.floor(n / 86400000);
  const secs = Math.floor(n / 1000) % 86400;
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const yy = y + (m <= 2 ? 1 : 0);
  const p = (v) => (v < 10 ? "0" : "") + v;
  return `${yy}-${p(m)}-${p(d)} ${p(Math.floor(secs / 3600))}:${p(Math.floor(secs / 60) % 60)} UTC`;
}

export function bookIcon(cls) {
  return `<svg class="glyph ${cls || ""}" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
    <path d="M4.5 4.5h7a2 2 0 0 1 2 2v12a1.6 1.6 0 0 0-1.6-1.6H4.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M19.5 4.5h-6a2 2 0 0 0-2 2v12a1.6 1.6 0 0 1 1.6-1.6h6.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
}

export function bookSignIcon(sign) {
  const mark =
    sign === "plus"
      ? `<path d="M17.8 14.6v5.6M15 17.4h5.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
      : `<path d="M15 17.4h5.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  return `<svg class="booksign" viewBox="0 0 24 24" width="27" height="27" aria-hidden="true">
    <path d="M3.2 3.4h11.4a1.6 1.6 0 0 1 1.6 1.6v13.6a1.6 1.6 0 0 1-1.6 1.6H3.2z"
      fill="color-mix(in oklch, currentColor 16%, transparent)" stroke="currentColor"
      stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M6.4 3.4v16.8" stroke="currentColor" stroke-width="1.4"/>
    <path d="M9.4 7.6h4.2M9.4 10.6h4.2M9.4 13.6h2.6" stroke="currentColor" stroke-width="1.2"
      stroke-linecap="round" opacity="0.75"/>
    <circle cx="17.8" cy="17.4" r="5.2" fill="var(--sb-status, oklch(0.24 0.01 72))"
      stroke="none"/>
    ${mark}
  </svg>`;
}





export function busyStack(ui) {
  const busy = (ui && ui.busy) || {};
  // A cleared notice is a key set to null, never removed: session state MERGES.
  const keys = Object.keys(busy).filter((k) => !!busy[k]);
  if (!keys.length) return "";
  return `<div id="sb-busy">${keys
    .map(
      (k) => `<div class="busy-note"><span class="busy-wheel"></span><span class="busy-text">${esc(
        String(busy[k] || "Working…")
      )}</span></div>`
    )
    .join("")}</div>`;
}

export function folderIcon() {
  return `<svg class="glyph" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M3.5 6.5h5l1.6 2h10.4v9.5a1 1 0 0 1-1 1h-16a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
}

export function cardKidIcon(stacked) {
  return `<svg class="glyph" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
    ${stacked ? `<path d="M7.5 4.5h11a1 1 0 0 1 1 1v11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>` : ""}
    <rect x="4.5" y="7.5" width="12" height="12" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/>
  </svg>`;
}

export function tagIcon() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M11 3.5H20.5V13l-8.7 8.7a1.4 1.4 0 0 1-2 0l-7-7a1.4 1.4 0 0 1 0-2z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
    <circle cx="16.6" cy="7.4" r="1.5" fill="currentColor"/>
  </svg>`;
}

export function trashIcon() {
  return `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
    <path d="M4.5 6.5h15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <path d="M6.5 6.5l0.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l0.9-12.1z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M10.3 10v6.4M13.7 10v6.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`;
}

export function twisty(id, open, disabled, bookId) {
  if (disabled) return `<span class="twisty ghost"></span>`;
  const owner = bookId ? `, bookId: '${jsq(bookId)}'` : "";
  return `<button class="twisty${open ? " open" : ""}" data-interactive title="${open ? "Collapse" : "Expand"}"
    onclick="event.stopPropagation();sendAction('bookToggle', { id: '${jsq(id)}'${owner} })">
    <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true"><path d="M3.5 2 L8.5 6 L3.5 10 Z" fill="currentColor"/></svg>
  </button>`;
}

export function kidRows(nodeId, bookId, lib, depth) {
  const kids = (lib.kids || {})[nodeId];
  if (!kids) return `<div class="row empty-kid">opening…</div>`;
  if (!kids.length) return `<div class="row empty-kid">nothing in here yet</div>`;
  const pad = 8 + Math.max(0, Number(depth) || 0) * 11;
  return kids
    .map((k) => {
      if (!k.isFolder) {
        return `<div class="row kid" data-interactive style="padding-left:${pad}px"
          onclick="sendAction('cardAct', { op: 'openCard', id: '${jsq(k.id)}', bookId: '${jsq(bookId)}' })">
          ${cardKidIcon(!!k.isStack)}
          <span class="name">${esc(k.name)}</span>
          ${k.isStack && Number(k.size) > 1 ? `<span class="kid-count">${Number(k.size)}</span>` : ""}
        </div>`;
      }
      const open = !!(lib.expanded || {})[k.id];
      const counts = k.counts || {};
      const held = Math.max(0, Number(counts.folders) || 0) + Math.max(0, Number(counts.cards) || 0);
      const inner = open
        ? `<div class="kids">${kidRows(k.id, bookId, lib, (Number(depth) || 0) + 1)}</div>`
        : "";
      return `<div class="row kid folder" data-interactive style="padding-left:${pad}px"
          data-drop="row" data-row-kind="folder" data-folder-id="${esc(k.id)}" data-book-id="${esc(bookId)}"
          onclick="sendAction('cardAct', { op: 'folderOpen', id: '${jsq(k.id)}', bookId: '${jsq(bookId)}' })">
          ${twisty(k.id, open, false, bookId)}
          ${folderIcon()}
          <span class="name">${esc(k.name)}</span>
          ${held ? `<span class="kid-count">${held}</span>` : ""}
        </div>${inner}`;
    })
    .join("");
}

export function bookRow(b, lib, index) {
  const selected = lib.selected === b.id;
  const open = !!(lib.expanded || {})[b.id];
  const renaming = lib.renaming === b.id;
  const name = renaming
    ? `<input class="rename" type="text" value="${esc(b.name)}" data-interactive autofocus
        data-tapcommit-action="bookRename" data-tapcommit-id="${esc(b.id)}"
        onclick="event.stopPropagation()"
        onkeydown="if (event.key === 'Enter') { sendAction('bookRename', { id: '${jsq(b.id)}', name: this.value }); this.blur(); } else if (event.key === 'Escape') { this.dataset.esc='1'; sendAction('bookRename', { id: '${jsq(b.id)}', name: '${jsq(b.name)}' }); this.blur(); }"
        onblur="if (this.dataset.esc !== '1') { sendAction('bookRename', { id: '${jsq(b.id)}', name: this.value }); }" />`
    : `<span class="name">${esc(b.name)}</span>`;
  const rows = [
    `<div class="row book${selected ? " sel" : ""}" data-book-id="${esc(b.id)}" data-book-index="${index}"
      data-drop="row" data-row-kind="book"
      onclick="sendAction('bookSelect', { id: '${jsq(b.id)}' })">
      ${twisty(b.id, open)}
      ${bookIcon(b.compile ? "on" : "off")}
      ${name}
      <button class="row-btn" title="Edit metadata" data-interactive
        onclick="event.stopPropagation();sendAction('bookMeta', { id: '${jsq(b.id)}' })">${tagIcon()}</button>
    </div>`,
  ];
  if (open) {
    rows.push(`<div class="kids">${kidRows(b.id, b.id, lib, 0)}</div>`);
  }
  return rows.join("");
}

export function projectBarRemoved() {
  return "";
}

export function researchSection(lib) {
  const books = PINREG.all() || [];
  if (!books.length) return "";
  const one = (spec) => {
    const open = !!(lib.expanded || {})[spec.id];
    const selected = lib.selected === spec.id;
    const folders = open ? `<div class="kids">${kidRows(spec.id, spec.id, lib, 0)}</div>` : "";
    return `<div class="row book pinned${selected ? " sel" : ""}" data-book-id="${esc(spec.id)}"
      onclick="sendAction('bookSelect', { id: '${jsq(spec.id)}' })">
      ${twisty(spec.id, open)}
      ${bookIcon("on")}
      <span class="name">${esc(spec.name)}</span>
      <button class="row-btn" title="Edit metadata" data-interactive
        onclick="event.stopPropagation();sendAction('bookMeta', { id: '${jsq(spec.id)}' })">${tagIcon()}</button>
    </div>
    ${folders}`;
  };
  return `<div class="research">${books.map(one).join("")}</div>`;
}

// 'pre' is the id prefix — full shell 'sb-', notepad 'sb-np-': the DOM diff matches by id alone.


export function findBook(lib, id) {
  if (!id || PINREG.isRetired(id)) return null;
  const pin = PINREG.parse(id);
  if (pin) {
    return { id, name: pin.folder || pin.name, research: true, folder: pin.folder, compile: true, pinName: pin.name, pinId: pin.id };
  }
  return (lib.books || []).find((b) => b.id === id) || null;
}

export function vnum(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function footerVitals(ui) {
  const bs = ui.bookStats || null;
  if (!bs) return "";
  const counts = bs.statusCounts && typeof bs.statusCounts === "object" ? bs.statusCounts : {};
  const seen = {};
  const order = [];
  for (const s of STATUS.STATUSES || []) {
    if (Number(counts[s.name] || 0) > 0) {
      order.push(s.name);
      seen[String(s.name).toLowerCase()] = true;
    }
  }
  for (const k in counts) {
    if (Number(counts[k] || 0) > 0 && !seen[String(k).toLowerCase()]) order.push(k);
  }
  const chips = order
    .map(
      (k) =>
        `<span class="vchip" style="background:${STATUS.statusColor(k)};color:${STATUS.statusInk(k)}">${esc(
          k
        )} ${esc(vnum(counts[k]))}</span>`
    )
    .join("");
  const totals = `<span class="vtot">${vnum(bs.cards)} cards · ${vnum(bs.words)} words · ${vnum(bs.pages)} pages</span>`;
  const here = Number(bs.coopN || 0) > 0 ? `<span class="vtot">${vnum(bs.coopN)} here</span>` : "";
  return `<div class="vitals" id="sb-vitals">${chips}${totals}${here}</div>`;
}

// THE CONFIRM BEFORE A BOOK BURNS (his ruling, 2026-08-31: "Deleting a book should prompt a confirmation.
export function heldLine(c) {
  const parts = [];
  const say = (n, one, many) => { if (n > 0) parts.push(n + " " + (n === 1 ? one : many)); };
  say(Number(c.folders || 0), "folder", "folders");
  say(Number(c.cards || 0), "card", "cards");
  say(Number(c.pages || 0), "page", "pages");
  return parts.join(", ");
}

export function bookBurnBox(lib) {
  const c = lib.confirmRemove;
  if (!c || typeof c !== "object" || !c.id) return "";
  const name = esc(String(c.name || c.id));
  const step = Number(c.step || 1) === 2 ? 2 : 1;
  const trashed = Number(c.trashed || 0);
  const cancel = `onclick="sendAction('bookRemove', { cancel: true })"`;

  const body =
    step === 1
      ? `<div class="burn-title">Delete “${name}”?</div>
         <div class="burn-note">The book and everything filed under it leave this shelf.</div>
         <div class="burn-row">
           <button class="burn-btn" data-interactive ${cancel}>Cancel</button>
           <button class="burn-btn gone" data-interactive
             onclick="sendAction('bookRemove', { confirm: 1 })">Delete</button>
         </div>`
      : `<div class="burn-title">“${name}” is not empty.</div>
         <div class="burn-note">It still holds <span class="burn-held">${esc(heldLine(c) || "content")}</span>.</div>
         ${trashed > 0
           ? `<div class="burn-note">Its trash still holds ${trashed} ${trashed === 1 ? "item" : "items"} — they go too.</div>`
           : ""}
         <div class="burn-note">Deleting the book burns all of it out of the database. There is no
           undo for this one and no trash to fish it back out of.</div>
         <div class="burn-row">
           <button class="burn-btn" data-interactive ${cancel}>Keep it</button>
           <button class="burn-btn gone" data-interactive
             onclick="sendAction('bookRemove', { confirm: 2 })">Delete everything</button>
         </div>`;

  return `<div class="sb-book-burn step-${step}" id="sb-book-burn"><div class="burn-box">${body}</div></div>`;
}

export function navPane(ui, opts) {
  const o = opts || {};
  const door = ui.door || {};
  const libLoaded = !!((ui.library || {}).loaded);
  // 'loading' is the live shelf read; 'loaded' is saved state that returns true with a stale list behind it.
  const libLoading = !!((ui.library || {}).loading);
  const fetching = libLoading || !libLoaded || door.booting === true;
  const bootErr = String(door.error || "");

  const savi = ui.savi || {};
  const awake = !!savi.awake;
  const saviLine = String(savi.line || "I'm here.");
  const saviAsk = !!savi.ask && !savi.sent;
  const saviSent = !!savi.sent;
  const saviMouth = saviSent
    ? `<div class="savi-sent">Sent. She's reading it.</div>`
    : saviAsk
      ? `<div class="savi-ask">
           <input type="text" id="sb-savi-say" placeholder="What do you need?" maxlength="400"
             data-interactive data-autofocus
             onkeydown="if(event.key==='Enter'){event.preventDefault();sendAction('saviSend',{text:this.value});this.value='';}" />
           <button data-interactive
             onclick="event.stopPropagation(); var b=this.parentNode.querySelector('input'); sendAction('saviSend',{text:b.value}); b.value='';">Send</button>
         </div>`
      : "";
  const dotTitle = "Ring Savi";

  const lib = Object.assign({ books: [], expanded: {} }, ui.library || {});
  const books = (lib.books || []).filter(b=>!PINREG.isRetired(b.id));
  const shelf = fetching
    ? bootErr
      ? `<div class="row empty-kid">${esc(bootErr)}</div>`
      : `<div class="row empty-kid boot-kid"><span class="kid-wheel" aria-hidden="true"></span>fetching your data…</div>`
    : books.length
      ? books.map((b, i) => bookRow(b, lib, i)).join("")
      : `<div class="row empty-kid">no books yet — press the + book above</div>`;
  const shelfBody =
    fetching && books.length && !bootErr
      ? books.map((b, i) => bookRow(b, lib, i)).join("") +
        `<div class="row empty-kid boot-kid"><span class="kid-wheel" aria-hidden="true"></span>reading the shelf…</div>`
      : shelf;
  const canRemove = !!lib.selected && !PINREG.isPinned(lib.selected);
  // his ruling: a read-only seat never gets live + book / ✕ book / new folder buttons; canWrite absent = your own shelf.
  const canWrite = (ui.shelf || {}).canWrite !== false;
  const roTitle = "you can read this shelf — writing needs the owner's allow list";

  return `<div id="sb-nav">
    ${ui.shell === "notepad" ? "" : menuDock(ui)}
    <div class="lib-bar">
      <button class="lib-btn${canWrite ? "" : " off"}" id="sb-book-add" title="${canWrite ? "Add book" : roTitle}" data-interactive
        ${canWrite ? `onclick="sendAction('bookAdd', {})"` : ""}>${bookSignIcon("plus")}</button>
      <button class="lib-btn${canRemove && canWrite ? "" : " off"}" id="sb-book-remove" title="${canWrite ? "Remove book" : roTitle}" data-interactive
        ${canWrite ? `onclick="sendAction('bookRemove', {})"` : ""}>${bookSignIcon("minus")}</button>
      <span class="lib-spacer"></span>
      <button class="lib-btn${lib.selected ? "" : " off"}" id="sb-book-recover" data-interactive
        title="Find books and content that are in the database but not on this shelf"
        onclick="sendAction('recoverOpen', {})">⟲</button>
      <button class="lib-btn${lib.selected ? "" : " off"}" id="sb-book-meta" title="Edit metadata" data-interactive
        onclick="sendAction('bookMeta', {})">${tagIcon()}</button>
    </div>
    <div class="search-wrap">
      <input class="search" id="sb-search" type="text" placeholder="Search…" data-interactive
        oninput="sendAction('uiSearch', { q: this.value })" />
    </div>
    <div class="tree" id="sb-tree">${shelfBody}${researchSection(lib)}</div>
    ${o.mods === false ? "" : MODS.bar(ui)}
    <div class="dock" id="sb-nav-dock">
      <div class="dock-spacer"></div>
      <div class="dock-slot" id="sb-dock-savi" title="${esc(dotTitle)}" data-interactive
        onclick="sendAction('saviPing', {})">
        <div class="savi-avatar${awake ? " awake" : ""}"><span class="spark"></span></div>${
          awake ? `<div class="savi-bubble${saviAsk || saviSent ? " asking" : ""}"
            ${saviAsk || saviSent ? `data-interactive onclick="event.stopPropagation()"` : ""}>${esc(saviLine)}${saviMouth}</div>` : ""
        }
      </div>
      <div class="dock-slot trash" id="sb-dock-trash" title="Trash" data-interactive data-drop="trash"
        onclick="sendAction('cardAct', { op: 'trashOpen' })">${trashIcon()}</div>
    </div>
    ${bookBurnBox(lib)}
  </div>`;
}

export function centerPane(ui) {
  const body=centerPaneBody(ui),references=body.includes('id="sb-page-bar"')?'':PAGEUI.referenceBar(ui.cards);
  return body.replace(/(<div id="sb-center"[^>]*>)/,(_,opening)=>opening+require('lib/editor-switch.js').render(ui)+references);
}
function centerPaneBody(ui) {
  if(PINREG.isRetired(ui.library?.openBook))return '<div id="sb-center"><div class="empty">Studio Code has been removed. Choose another book.</div></div>';
  const session=ui.editorSession;
  if(session?.phase!=='error'&&ARRANGEMENTUI.active(ui))return `<div id="sb-center" class="wwr-center">${ARRANGEMENTUI.render(ui)}</div>`;
  if(session&&(session.phase==='loading'||session.phase==='error')){
    const doc=ui.cards?.pageDoc||{};
    return `<div id="sb-center" class="wwr-center">${require('lib/ui-editor-open.js').render({...doc,bookId:session.bookId,cardId:session.cardId,pageId:session.pageId,loading:session.phase==='loading'},session.editor||'',session.phase==='error'?(session.error||'The editor could not open this document'):'')}</div>`;
  }
  if(WORKBENCHUI.active(ui))return `<div id="sb-center" class="wwr-center">${WORKBENCHUI.render(ui)}</div>`;
  const lib = Object.assign({ books: [], expanded: {} }, ui.library || {});
  const book = findBook(lib, lib.openBook);
  if (!book) return `<div id="sb-center"><div class="empty">no book open</div></div>`;
  const crumb =
    book.research && book.folder
      ? `${esc(book.pinName || RESEARCH.name)} <span class="sep">›</span> ${esc(book.folder)}`
      : esc(book.name);

  const cards = ui.cards || {};
  if(STUDIOPROJECTUI.active(ui)&&ui.studioProjects.view!=="files")return `<div id="sb-center" class="wwr-center">${STUDIOPROJECTUI.render(ui,ARRANGEMENTUI.active(ui)?ARRANGEMENTUI.render(ui):undefined)}</div>`;
  if (String(cards.bookId || "") !== String(book.id)) {
    const body = `<div class="sb-ghost-grid">${`<div class="ghost-tile"></div>`.repeat(8)}</div>
        <div class="sb-modal-veil sb-folder-veil"><div class="sb-spin"></div></div>`;
    return `<div id="sb-center" class="doc-open">
      <div class="doc-head"><div class="crumb">${crumb}</div><div class="doc-id">${esc(book.id)}</div></div>
      <div class="doc-body sb-open-shell">${body}</div>
    </div>`;
  }

  const search = cards.search || null;
  const hunting = !!(search && String(search.query || "").trim() !== "" && !search.open);

  if (!hunting && String(cards.view || "folder") === "page") {
    const doc = cards.pageDoc || {};
    const selected=require('lib/editor-registry.js').value(doc.editor||cards.card?.editor);
    if(doc.loading||selected&&selected!=='source'&&!doc.pianoRoll)return `<div id="sb-center" class="wwr-center">${require('lib/ui-editor-open.js').render(doc,selected,cards.error||'')}</div>`;
    if(doc.pianoRoll)return `<div id="sb-center" class="wwr-center">${PIANOUI.workspace({...doc,bookName:book.name,projectId:ui.studioProjects?.bookId===book.id?ui.studioProjects.projectId:null,projectName:ui.studioProjects?.name||"",rollEditor:ui.pianoRoll,error:cards.error||""})}</div>`;
    return `<div id="sb-center" class="doc-open">${PAGEUI.render(
      Object.assign(
        {
          bookId: book.id,
          bookName: book.name,
          folderPath: cards.folderPath || [],
          folderTrail: cards.folderTrail || [],
        },
        doc,
        {
        // SHELL CONTRACT v2 — shell rides in the LAST object so a pageDoc key can never shadow it.
        shell: ui.shell,
        rollEditor: ui.pianoRoll,
        sizeMenu: !!cards.sizeMenu,
        error: cards.error || "",
        notice: cards.notice || "",
        shoot: cards.shoot || null,
        stash: ui.pageStash || null,
        referenceTrail: cards.referenceTrail || [],
        prefs: (ui.config && ui.config.user) || null,
      })
    )}</div>`;
  }

  const folderBody=CARDSUI.render({
    shell: ui.shell,
    view: cards.view || "folder",
    bookId: book.id,
    bookName: book.name,
    folderId: cards.folderId || book.id,
    folderPath: cards.folderPath || [],
    folders: cards.folders || [],
    list: cards.list || [],
    sort: cards.sort || { mode: "default", dir: "asc" },
    sortMenu: !!cards.sortMenu,
    selected: cards.selected || null,
    menu: !!cards.menu,
    // THE NAME EDITOR LIVES OR DIES ON THIS LINE. renaming, the pane never saw it, and the tile went on painting a plain span: "creating a folder does not let you set its name" / "clicking rename does nothing".
    renaming: cards.renaming || null,
    moveMenu: !!cards.moveMenu,
    card: cards.card || null,
    pages: cards.pages || [],
    stack: cards.stack || [],
    stackId: cards.stackId || null,
    modal: cards.modal || null,
    shoot: cards.shoot || null,
    draft: cards.draft || null,
    search: search,
    error: cards.error || "",
    prefs: (ui.config && ui.config.user) || null,
    theme: ui.theme || null,
    now: cards.now || 0,
    depthLabels: cards.depthLabels || null,
    folderBusy: !!cards.folderBusy,
    folderLoading: !!cards.folderLoading,
    canWrite: (ui.shelf || {}).canWrite !== false,
    // This pane hands ui-cards.js a NAMED set of keys: a new one not listed here never arrives.
    exportDoc: cards.exportDoc || null,
    phase: ui.phase || null,
  });
  return STUDIOPROJECTUI.active(ui)?`<div id="sb-center" class="wwr-center">${STUDIOPROJECTUI.render(ui,`<div class="doc-open">${folderBody}</div>`)}</div>`:`<div id="sb-center" class="doc-open">${folderBody}</div>`;
}

export function metaPane(ui) {
  const lib = Object.assign({ books: [], expanded: {} }, ui.library || {});
  const cards = ui.cards || {};
  if(cards.view==="page"&&cards.pageDoc&&cards.pageDoc.cardId){
    const doc=cards.pageDoc,locked=(ui.shelf||{}).canWrite===false||PINREG.isLocked(doc.bookId)||doc.pen&&doc.pen.mine===false;
    const ordinary=metaPane({...ui,cards:{...cards,view:"page-metadata"}});
    const w=ui.workbench||{},mode=require('lib/editor-registry.js').value(cards.card?.editor||doc.editor)||(WORKBENCHUI.active(ui)?w.data?.mode:doc.pianoRoll?'piano':'source');
    return `<section class="page-editor-meta"><div class="pane-label">Card editor</div><div style="padding:10px">${require('lib/editor-select.js').render(doc,mode,'ww-meta-editor',locked)}</div><p style="padding:0 10px;font-size:10px;opacity:.7">One editor choice, saved on this card and used across its pages. Existing content is preserved.</p>${w.error?`<p role="alert" style="padding:10px;color:var(--sb-warn)">${esc(w.error)}</p>`:""}</section>${ordinary}`;
  }
  if (cards.metaLoading) {
    return META.render({ view: cards.view || "folder", meta: null, metaLoading: true });
  }
  const canWrite = (ui.shelf || {}).canWrite !== false;
  if (cards.meta && cards.meta.card) {
    return META.render({
      view: cards.view || "folder",
      meta: cards.meta,
      bookId: cards.meta.bookId || cards.bookId || "",
      bookName: cards.bookName || "",
      canWrite,
    });
  }
  // A selected FOLDER gets the folder pane — it never falls through to the book's metadata.
  const sel = cards.selected || null;
  if (sel && String(sel.kind || "") === "folder") {
    const fm = cards.folderMeta && String(cards.folderMeta.id) === String(sel.id) ? cards.folderMeta : null;
    return META.renderFolder({
      folder: fm || { id: sel.id, name: sel.name, compile: true, counts: null },
      loading: !fm,
      bookId: cards.bookId || "",
      bookName: cards.bookName || "",
      path: cards.folderPath || [],
      canWrite,
    });
  }
  // his ruling (2026-08-28): nothing selected = the pane shows the folder you are STANDING IN.
  // An explicit book ask (metaFor) or a different nav-selected book still outranks it.
  const curId = String(cards.folderId || "");
  const inFolder = !sel && curId && curId !== String(cards.bookId || "");
  const bookAsked = lib.metaFor || (lib.selected && String(lib.selected) !== String(cards.bookId || ""));
  if (inFolder && !bookAsked) {
    const fm = cards.folderMeta && String(cards.folderMeta.id) === curId ? cards.folderMeta : null;
    const trail = cards.folderPath || [];
    return META.renderFolder({
      folder: fm || { id: curId, name: trail[trail.length - 1] || "Folder", compile: true, counts: null },
      loading: !fm,
      bookId: cards.bookId || "",
      bookName: cards.bookName || "",
      path: fm ? fm.path || [] : trail.slice(0, -1),
      canWrite,
    });
  }
  // At the book root with nothing selected, the pane falls to the OPEN book's metadata.
  const id = lib.metaFor || lib.selected || cards.bookId;
  const book = findBook(lib, id);
  if (!book) {
    return `<div class="pane-label">Metadata</div><div class="meta-empty">select a book to see its metadata</div>`;
  }
  if (book.research) {
    return `<div class="pane-label">Metadata</div>
      <div class="meta-title">${esc(book.folder ? `${book.pinName || RESEARCH.name} › ${book.folder}` : book.pinName || RESEARCH.name)}</div>
      <div class="meta-empty">the ${esc(book.pinName || RESEARCH.name)} book is permanent — its metadata is fixed.</div>
      <div class="meta-foot"><div><span>Key</span>${esc(book.pinId || RESEARCH.id)}</div></div>`;
  }
  const yes = book.compile;
  return `<div class="pane-label">Metadata</div>
    <div class="meta-title">${esc(book.name)}</div>
    <div class="field">
      <label>Compile</label>
      <div class="seg">
        <button class="seg-btn${yes ? " on" : ""}" data-interactive
          onclick="sendAction('bookMetaSet', { id: '${jsq(book.id)}', field: 'compile', value: true })">Y</button>
        <button class="seg-btn${yes ? "" : " on"}" data-interactive
          onclick="sendAction('bookMetaSet', { id: '${jsq(book.id)}', field: 'compile', value: false })">N</button>
      </div>
    </div>
    <div class="field">
      <label>Summary</label>
      <textarea rows="5" data-interactive placeholder="what happens in this book…"
        onchange="sendAction('bookMetaSet', { id: '${jsq(book.id)}', field: 'summary', value: this.value })">${esc(book.summary || "")}</textarea>
    </div>
    <div class="field">
      <label>Author Notes</label>
      <textarea rows="7" data-interactive placeholder="notes to yourself…"
        onchange="sendAction('bookMetaSet', { id: '${jsq(book.id)}', field: 'notes', value: this.value })">${esc(book.notes || "")}</textarea>
    </div>
    <div class="meta-foot">
      <div><span>Created</span>${esc(stamp(book.createdAt))}</div>
      <div><span>Modified</span>${esc(stamp(book.updatedAt))}</div>
      <div><span>Last editor</span>${esc(book.lastEditor || "—")}</div>
      <div><span>Key</span>${esc(book.id)}</div>
    </div>`;
}

export function menuItem(ui, menu, label) {
  if(menu==="Edit"&&(label==="Undo"||label==="Redo")&&(ui.cards||{}).view==="page"&&((ui.cards||{}).pageDoc||{}).pianoRoll){
    const op=label.toLowerCase();return `<button class="item" data-interactive title="${label} piano edits, including notes added or deleted" onclick="if(window.__WWROLL)window.__WWROLL.action('${op}',{});sendAction('uiMenu',{menu:'Edit'})">${label} piano edit</button>`;
  }
  const edit = ui.edit || {};
  let text = label;
  let off = false;
  if (menu === "Edit" && (label === "Undo" || label === "Redo")) {
    const undo = label === "Undo";
    const can = undo ? !!edit.canUndo : !!edit.canRedo;
    const what = String((undo ? edit.undoLabel : edit.redoLabel) || "");
    off = !can;
    if (can && what) text = `${label} ${what}`;
  }
  if (menu === "Edit" && (label === "Cut" || label === "Copy" || label === "Paste")) {
    const cards = ui.cards || {};
    const sel = cards.selected || null;
    const tile = sel ? ((cards.list || []).find((t) => String(t.id) === String(sel.id)) || null) : null;
    const isFolder = !!(tile ? tile.isFolder : sel && sel.kind === "folder");
    const clip = ui.clipboard || null;
    if (label === "Paste") {
      const sameBook = !!(clip && clip.id && String(clip.bookId || "") === String(cards.bookId || ""));
      off = !sameBook;
      if (sameBook && clip.name) text = `Paste “${clip.name}”`;
    } else {
      off = !sel || isFolder;
      if (!off && sel.name) text = `${label} “${sel.name}”`;
    }
  }
  if (off) return `<button class="item off" disabled>${esc(text)}</button>`;
  return `<button class="item" data-interactive
    onclick="sendAction('uiMenuItem', { menu: '${jsq(menu)}', item: '${jsq(label)}' })">${esc(text)}</button>`;
}

const MENU_EXTRA = {};

export function menuDock(ui) {
  const mine = (ui.shelf || {}).mine !== false;
  const ownerOnly = THEME.ownerOnlyMenus || [];
  const buttons = Object.keys(THEME.menus)
    .filter((name) => mine || ownerOnly.indexOf(name) < 0)
    .map((name) => {
      if (name === "Co-op")
        return `<div class="menu-slot" id="sb-slot-${esc(name)}">
        <button class="menu-btn" data-interactive
          onclick="sendAction('coopOpen', {})">${esc(name)}</button>
      </div>`;
      const open = ui.menu === name;
      const themed = THEME.menus[name] || [];
      const all = themed.concat((MENU_EXTRA[name] || []).filter((l) => themed.indexOf(l) < 0));
      const labels = all;
      const items = open
        ? `<div class="dropdown" id="sb-drop-${esc(name)}" data-sb-dismiss="menu" data-sb-menu-value="${esc(name)}">${labels
            .map((label) => menuItem(ui, name, label))
            .join("")}</div>`
        : "";
      return `<div class="menu-slot" data-sb-menu-scope id="sb-slot-${esc(name)}">
        <button class="menu-btn${open ? " open" : ""}" data-interactive
          onclick="sendAction('uiMenu', { menu: '${jsq(name)}' })">${esc(name)}</button>${items}
      </div>`;
    })
    .join("");
  // The command dock contains only the app’s own menus.
  return `<nav id="sb-command-dock" aria-label="Workspace menus">${buttons}</nav>`;
}

export function menubar(ui) {
  // Keep the platform chrome clearance, but no duplicate title beneath its own tab.
  return `<div id="sb-menubar" aria-hidden="true"></div>`;
}

export function menuGlyph() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M4.5 7h15M4.5 12h15M4.5 17h15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
}

export function closeGlyph() {
  return `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`;
}

export function notepadGlyph() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M6.2 3.4h8.6L19.4 8v12.6H6.2z" fill="color-mix(in oklch, currentColor 24%, transparent)"
      stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M14.8 3.4V8h4.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9.2 11.4h7M9.2 14.4h7M9.2 17.4h4.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

export function fullShellGlyph() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <rect x="3.2" y="4.6" width="17.6" height="14.8" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3.2 8.2h17.6" stroke="currentColor" stroke-width="1.3"/>
    <path d="M8.6 8.2v11.2M16.4 8.2v11.2" stroke="currentColor" stroke-width="1.3"/>
    <rect x="3.2" y="8.2" width="5.4" height="11.2" fill="color-mix(in oklch, currentColor 26%, transparent)" stroke="none"/>
  </svg>`;
}

// his ruling: bottom-right — the god-mode tab rail owns the top-right edge.
export function shellToggle(ui) {
  const np = ui.shell === "notepad";
  const title = np
    ? "Full — the whole workspace: books, cards and metadata side by side"
    : "Notepad — cards at full width, books and metadata behind side tabs";
  return `<button id="sb-shell-toggle" data-interactive title="${esc(title)}"
    onclick="sendAction('uiShell', { shell: '${np ? "full" : "notepad"}' })"><span class="sb-shell-glyph"
    >${np ? fullShellGlyph() : notepadGlyph()}</span>${np ? "Full" : "Notepad"}</button>`;
}

export function boxOf(ui) {
  const b = (ui && ui.notepadBox) || {};
  const n = (v, d) => {
    const f = Number(v);
    return Number.isFinite(f) ? Math.max(0, Math.round(f)) : d;
  };
  const p = { x: n(b.x, NPB.x), y: n(b.y, NPB.y) };
  // STUDIO.topLeft dodge, server-side too: a box stored with its title strip under Spawn's corner tools draws clear on the very first frame, before npdrag's clamp has had a tick to move it. The realm clamp (npdrag.js fit) applies the same rule, so the two never disagree.
  if (p.x < STUDIO.topLeft.w && p.y < STUDIO.topLeft.h) p.y = STUDIO.topLeft.h;
  return p;
}

// REALM LANE: <script> never executes here — an inline <img onerror> is the only way live JS reaches the realm, so the module stays versioned (REALM_V) and idempotent.
export function dragLane(ui) {
  const b = boxOf(ui);
  return `<img id="sb-npdrag-boot" alt="" aria-hidden="true" src="data:,v${NPDRAG.REALM_V}" style="display:none"
      onerror="${esc(NPDRAG.bootScript())}" />
    <div id="sb-npdrag-data" style="display:none" aria-hidden="true"
      data-x="${b.x}" data-y="${b.y}"></div>`;
}

export function paneResizeLane(ui){return `<img id="sb-pane-resize-boot" alt="" aria-hidden="true" src="data:,pane-v${PANERESIZE.VERSION}" style="display:none" onerror="${esc(PANERESIZE.bootScript())}" /><div id="sb-pane-resize-data" hidden data-nav-width="${Number(ui.navWidth)||THEME.layout.navWidth}" data-meta-width="${Number(ui.metaWidth)||THEME.layout.metaWidth}"></div>`;}

export function liveLane() {
  return `<img id="sb-livemd-boot" alt="" aria-hidden="true" src="data:,v${LIVEMD.REALM_V}" style="display:none"
      onerror="${esc(LIVEMD.bootScript())}" />
    <div id="sb-livemd-data" style="display:none" aria-hidden="true"></div>`;
}

// THE SESSION LANE: one nonce per realm window, one hello, and THE LIFT. Caps on both waits inject the lift anyway — a stale beat over a dead app, always. Latch and img src are VERSIONED now (P2/v2): a module swap on a live realm must re-run, or the new markup's hold would blank an already-ruled session until the CSS bail; the re-run resends the same nonce (seat no-ops it) and lifts on the instant receipt.
export function sessionLane(ui) {
  const boot =
    "(function(){try{var w=window,d=document;" +
    "if(w.__SB_HELLO_P2)return;w.__SB_HELLO_P2=1;" +
    "if(!w.__SB_SESSION){w.__SB_SESSION='s'+Date.now().toString(36)+Math.floor(Math.random()*1679616).toString(36);}" +
    "var done=function(){try{if(!d.getElementById('sb-hello-lift')){var s=d.createElement('style');s.id='sb-hello-lift';" +
    "s.textContent='#sb-app#sb-app{visibility:visible;opacity:1}';(d.head||d.documentElement).appendChild(s);}w.__SB_HELLO_DONE=1;}catch(x){}};" +
    "var n=w.__SB_SESSION,t=0,f=function(){try{" +
    "if(typeof w.sendAction==='function'){w.__SB_HELLO=n;w.sendAction('sessionHello',{nonce:n});g();}" +
    "else if(t++<40){w.setTimeout(f,250);}else{done();}}catch(e){done();}};" +
    "var k=0,g=function(){try{var b=d.getElementById('sb-session-boot');" +
    "if(b&&b.getAttribute('data-nonce')===n){done();}" +
    "else if(k++<50){w.setTimeout(g,120);}else{done();}}catch(e){done();}};f();}catch(e){}})()";
  return `<img id="sb-session-boot" alt="" aria-hidden="true" src="data:,v2" style="display:none"
      data-nonce="${esc(String((ui || {}).pageNonce || ""))}"
      onerror="${esc(boot)}" />`;
}

export function gripGlyph() {
  return `<svg viewBox="0 0 12 18" width="11" height="16" fill="currentColor" aria-hidden="true">
    <circle cx="3.5" cy="4" r="1.4"/><circle cx="8.5" cy="4" r="1.4"/>
    <circle cx="3.5" cy="9" r="1.4"/><circle cx="8.5" cy="9" r="1.4"/>
    <circle cx="3.5" cy="14" r="1.4"/><circle cx="8.5" cy="14" r="1.4"/>
  </svg>`;
}

// THE TITLE STRIP is the drag handle — lib/npdrag.js looks for exactly this id.
export function npTitlebar(ui) {
  const lib = Object.assign({ books: [], expanded: {} }, ui.library || {});
  const book = findBook(lib, lib.openBook);
  const name = book && book.name ? String(book.name) : "";
  return `<div id="sb-np-titlebar" data-interactive data-np-handle="1">
    ${npMenuSlot(ui)}
    <span class="np-grip">${gripGlyph()}</span>
    <div class="np-title" title="${esc(name)} — drag this strip to move the notepad">${esc(name)}</div>
    ${shellToggle(ui)}
  </div>`;
}

export function npMenuSlot(ui) {
  const mine = (ui.shelf || {}).mine !== false;
  const ownerOnly = THEME.ownerOnlyMenus || [];
  const names = Object.keys(THEME.menus).filter((name) => mine || ownerOnly.indexOf(name) < 0);
  const open = !!ui.menu;
  const target = open ? String(ui.menu) : String(names[0] || "");
  const list = open
    ? `<div class="dropdown np-drop" id="sb-np-drop" data-sb-dismiss="menu" data-sb-menu-value="${esc(ui.menu)}">${names
        .map((name, i) => {
          const themed = THEME.menus[name] || [];
          const all = themed.concat((MENU_EXTRA[name] || []).filter((l) => themed.indexOf(l) < 0));
          const labels = all;
          if (!labels.length) return "";
          return `<div class="np-group${i === 0 ? " first" : ""}">${esc(name)}</div>${labels
            .map((label) => menuItem(ui, name, label))
            .join("")}`;
        })
        .join("")}</div>`
    : "";
  return `<div class="menu-slot" data-sb-menu-scope id="sb-np-menuslot">
      <button class="np-menu-btn${open ? " open" : ""}" id="sb-np-menu" data-interactive title="Menus"
        onclick="sendAction('uiMenu', { menu: '${jsq(target)}' })">${menuGlyph()}Menu</button>${list}
    </div>`;
}



export function sideRail(ui) {
  const pane = ui.notepadPane === "nav" || ui.notepadPane === "meta" ? ui.notepadPane : null;
  const tab = (key, label) =>
    `<button class="np-tab${pane === key ? " on" : ""}" id="sb-tab-${key}" data-interactive
      title="${esc(label)}" aria-pressed="${pane === key ? "true" : "false"}"
      onclick="sendAction('uiNotepadPane', { pane: '${key}' })">${esc(label)}</button>`;
  return `<div id="sb-siderail">${tab("nav", "Books")}${tab("meta", "Card")}</div>`;
}

export function sidePane(ui) {
  const pane = ui.notepadPane === "nav" || ui.notepadPane === "meta" ? ui.notepadPane : null;
  if (!pane) return "";
  const isNav = pane === "nav";
  const body = isNav ? navPane(ui, { mods: true }) : `<div id="sb-meta">${metaPane(ui)}</div>`;
  return `<div id="sb-sidepane" data-pane="${pane}">
    <div class="sp-scrim" data-interactive title="Close" onclick="sendAction('uiNotepadPane', { pane: null })"></div>
    <div class="sp-panel" style="--sp-w: var(${isNav ? "--nav-w" : "--meta-w"})">
      <div class="sp-head">
        <span class="sp-title">${isNav ? "Books" : "Card"}</span>
        <button class="sp-close" id="sb-sidepane-close" data-interactive title="Close"
          onclick="sendAction('uiNotepadPane', { pane: '${pane}' })">${closeGlyph()}</button>
      </div>
      <div class="sp-body">${body}</div>
    </div>
  </div>`;
}

// THE OVERLAY SLOT — any behavior may publish a floating row into player state.overlays ([{ id, html }], absent = none) and it draws over the app. This file adds NO chrome and NO positioning and never names or branches on a consumer — each row's own html places itself (position:fixed is the row's business, not the panel's).
export function overlaySlot(localPlayer) {
  const rows = ((localPlayer && localPlayer.state) || {}).overlays;
  if (!Array.isArray(rows)) return "";
  let out = "";
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;
    if (typeof row.html === "string" && row.html) out += row.html;
  }
  return out;
}

export function renderApp(localPlayer) {
  const ui = (localPlayer && localPlayer.state && localPlayer.state.ui) || {};

  const min = ui.shootMin && typeof ui.shootMin === "object" ? ui.shootMin : null;
  if (min) {
    const secs = Math.round(Number(min.seconds || 0));
    return `<div id="sb-shoot-min" style="display:flex;flex-direction:column;gap:8px;width:13rem;max-width:80vw;
        padding:10px 12px;border-radius:2px;background:rgba(12,13,17,.92);color:#e3e8ef;
        border:1px solid rgba(255,255,255,.14);font:500 13px system-ui,sans-serif">
      <span>🎬 your cut is ready${secs ? ` — ~${secs}s` : ""}. Exit god mode (Tab+G) to watch.</span>
      <button data-interactive onclick="sendAction('shootBack', {})"
        style="min-height:44px;width:100%;border-radius:2px;cursor:pointer;font:inherit;
        background:rgba(255,255,255,.10);color:inherit;border:1px solid rgba(255,255,255,.22)">Cancel the clip</button>
    </div>`;
  }

  const editorKey=ui.editorSession?(ui.editorSession.phase==='closed'?'':[ui.editorSession.bookId,ui.editorSession.cardId,ui.editorSession.generation].join(':')):STUDIOPROJECTUI.active(ui)?'studio:'+ui.studioProjects.bookId+':'+(ui.studioProjects.projectId||'projects'):ui.cards?.view==='page'&&ui.cards.pageDoc?.pageId||ui.pianoRoll?.open&&'piano'||ui.workbench?.open&&'asset'||'';
  const editorAttrs=editorKey?'data-holds-keyboard tabindex="-1" data-editor-key="'+esc(editorKey)+'" aria-describedby="sb-keyboard-hint"':'';
  const libraryDoc=ui.cards?.view==='page'?ui.cards.pageDoc:null;
  const libraryData={context:libraryDoc?[libraryDoc.bookId,libraryDoc.cardId,libraryDoc.pageId].join('/'):'',cardId:libraryDoc?.cardId||'',library:ui.editorLibrary||null};
  const libraryBoot='<script id="wws-library-data" type="application/json">'+JSON.stringify(libraryData).replace(/</g,'\\u003c')+'</script><img hidden alt="" src="data:,wws-library" onerror="if(typeof bootEditorLibrary===\'function\')bootEditorLibrary()">';
  const dataWatch={bookId:String(ui.library?.openBook||''),booting:!!ui.booting};
  const dataWatchBoot='<script id="wws-data-watch" type="application/json">'+JSON.stringify(dataWatch).replace(/</g,'\\u003c')+'</script><img hidden alt="" src="data:,wws-data-watch-'+esc(dataWatch.bookId)+'-'+dataWatch.booting+'" onerror="if(typeof bootDataWatch===\'function\')bootDataWatch()">';
  const focusBoot=dataWatchBoot+'<img hidden alt="" src="data:,editor-focus" onerror="'+esc(EDITOR_FOCUS.CODE)+'">';
  const metaOpen = !!ui.metaOpen;
  const notepad = ui.shell === "notepad";

  const center = centerPane(ui);

  const meta = metaOpen
    ? `<div class="handle" id="sb-handle-meta" data-resize="meta" data-interactive role="separator" aria-label="Resize metadata" aria-orientation="vertical" tabindex="0" title="Drag left to expand metadata · arrow keys resize"></div>
       <div id="sb-meta">${metaPane(ui)}</div>`
    : "";

  const save = ui.save || {};
  const st = String(save.state || "idle");
  const err = String(save.error || "");
  const savedAt = Number(save.savedAt || 0);
  const chip =
    st === "error"
      ? { cls: "bad", text: `Not saved — ${err || "the write was refused"}` }
      : st === "saving"
        ? { cls: "saving", text: "Saving…" }
        : st === "unsaved"
          ? { cls: "saving", text: "Unsaved changes" }
          : { cls: "saved", text: "Saved" };

  const keyboardHint=editorKey?'<span id="sb-keyboard-hint" style="pointer-events:none;font-size:10px;line-height:1.2;max-width:28%;flex-shrink:1">Editor controls · Esc releases the keyboard</span>':'';
  const footer = `<div id="sb-footer">
    ${keyboardHint||`<span class="sb-coldnote" id="sb-cold-note" title="${COLD_LINE}">${esc(COLD_LINE)}</span>`}
    <div class="spacer"></div>
    ${footerVitals(ui)}
    <div class="spacer"></div>
    ${savedAt ? `<div class="stamp" id="sb-save-stamp">last saved ${esc(stamp(savedAt))}</div>` : ""}
    <div class="chip ${chip.cls}" id="sb-save-chip"><span class="dot"></span>${esc(chip.text)}</div>
    <button class="sb-metatoggle${metaOpen ? " on" : ""}" id="sb-meta-toggle" data-interactive
      onclick="sendAction('uiMeta', {})"><span class="sb-meta-glyph">i</span>${metaOpen ? "Hide" : "Show"} metadata</button>
    ${shellToggle(ui)}
  </div>`;

  const npFooter = `<div id="sb-footer">
    ${keyboardHint}
    <div class="spacer"></div>
    ${footerVitals(ui)}
    <div class="spacer"></div>
    <div class="chip ${chip.cls}" id="sb-save-chip"><span class="dot"></span>${esc(chip.text)}</div>
  </div>`;

  const coop = COOP.coopDialog(ui.coop || null) || "";

  // THE ROOT'S POINTERDOWN, one string for both roots. the TAP-COMMIT sweep (inline rename boxes, see ui-cards nameField) — a tap on a non-focusable surface never blurs a box here, so the tap itself commits it through the box's own declared action (survives the engine's same-frame action fold). CLICK-AWAY (jace, 2026-09-01 evening: "Clicking out of the editor box does not make it lose focus and show the text rendered"): the same law that eats the blur keeps the caret in a page zone when he clicks the paper or the chrome, so the raw layer never yields to the rendered one. When the press lands on nothing focusable we drop the focus by hand — the browser default that never ran.
  const rootDown =
    "var t=event.target,n=document.querySelectorAll('input[data-tapcommit-action]');" +
    "for(var i=0;i<n.length;i++){var el=n[i];if(el===t||el.dataset.esc==='1')continue;" +
    "if(String(el.value)!==String(el.defaultValue)){sendAction(el.getAttribute('data-tapcommit-action'),{id:el.getAttribute('data-tapcommit-id')||'',name:el.value});}}" +
    "var a=document.activeElement;" +
    "if(a&&a!==t&&!(a.contains&&a.contains(t))&&/^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName||'')){" +
    "var f=t&&t.closest?t.closest('input,textarea,select,button,a[href],[contenteditable],[tabindex]'):null;" +
    "if(!f){try{a.blur();}catch(e){}}}";

  const windows = `${coop}
    ${DOCSUI.render(ui) || ""}
    ${TRASHUI.render(ui) || ""}
    ${RECOVERUI.render(ui) || ""}
    ${EXPORTUI.render(ui) || ""}
    ${FINDUI.render(ui) || ""}
    ${SEARCHUI.render(ui) || ""}
    ${IMPORTUI.render(ui) || ""}
    ${COMPILEUI.render(ui) || ""}
    ${SETTINGS.settingsWindow(ui) || ""}`;
  // A compile LANDING is the other write the whole window has to wait on — same veil, same law.
  const blocking = !!(ui.cards || {}).pageBusy || !!(ui.compile || {}).landing;
  const blockveil = blocking ? `<div id="sb-blockveil"><div class="sb-spin"></div></div>` : "";

  if (notepad) {
    const box = boxOf(ui);
    return `${styles(ui)}
  ${focusBoot}${libraryBoot}<div id="sb-app" class="sb-np" data-modal data-interactive ${editorAttrs}
    onpointerdown="${esc(rootDown)}"
    style="--sb-fs: ${fsOf(ui)}; --np-x: ${box.x}px; --np-y: ${box.y}px">
    ${windows}
    ${liveLane()}
    ${paneResizeLane(ui)}
    ${sessionLane(ui)}
    ${dragLane(ui)}
    ${npTitlebar(ui)}
    <div id="sb-menubar"></div>
    ${shelfStrip(ui)}
    <div id="sb-body">
      ${center}
    </div>
    ${sideRail(ui)}
    ${sidePane(ui)}
    ${busyStack(ui)}
    ${npFooter}
    ${blockveil}
    ${overlaySlot(localPlayer)}
  </div>`;
  }

  // data-interactive on the root (his ruling): without it a drag on panel text reaches the god-mode camera.
  // The root's pointerdown is rootDown above: the TAP-COMMIT sweep plus the click-away blur.
  return `${styles(ui)}
  ${focusBoot}${libraryBoot}<div id="sb-app" data-modal data-interactive ${editorAttrs} style="--sb-fs: ${fsOf(ui)}"
    onpointerdown="${esc(rootDown)}">
    ${windows}
    ${liveLane()}
    ${paneResizeLane(ui)}
    ${sessionLane(ui)}
    ${menubar(ui)}
    ${shelfStrip(ui)}
    <div id="sb-body">
      ${navPane(ui)}
      <div class="handle" id="sb-handle-nav" data-resize="nav" data-interactive role="separator" aria-label="Resize shelf" aria-orientation="vertical" tabindex="0" title="Drag to resize the shelf · arrow keys resize"></div>
      ${center}
      ${meta}
    </div>
    ${busyStack(ui)}
    ${footer}
    ${blockveil}
    ${overlaySlot(localPlayer)}
  </div>`;
}

export default function (_ctx, localPlayer) {
  try {
    // The creator's input writes the god-mode control target. On 6.0 the render's
    // player is always the body; its controlling view carries the editor's state.
    const seat = (localPlayer && localPlayer.controlling) || localPlayer;
    const html = QUIET.render(seat, renderApp);
    QUIET.observeBudget(_ctx, seat, html);
    return html;
  } catch (e) {
    const msg = String((e && (e.stack || e.message)) || e || "unknown");
    return `<div style="width:34rem;max-width:90vw;border-radius:2px;background:#180a0a;
      border:1px solid #d9534f;color:#f6e7e7;padding:12px;font:12px/1.5 ui-monospace,monospace">
      <div style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ff9a95">
        Worldwright Studio could not draw</div>
      <div style="margin-top:6px;opacity:.85">The workspace threw while rendering. Everything you
        wrote is untouched — this is the drawing, not the books.</div>
      <pre style="margin-top:8px;white-space:pre-wrap;word-break:break-word;color:#ffd7d4">${esc(
        msg
      ).slice(0, 1400)}</pre>
    </div>`;
  }
}

import { mount as mountEditorLibrary } from "./lib/ui-editor-library.js";
const LIBRARY_TUNE=require("lib/data/workbench.yml");
export function bootEditorLibrary(){return mountEditorLibrary(LIBRARY_TUNE);}
export function openEditorLibrary(mode){const picker=bootEditorLibrary();if(mode==='source')picker.source();}

import { mount as mountSynth } from "./lib/ui-synth.js";
import { mount as mountInstrument } from "./lib/ui-instrument.js";
import { mount as mountRollSound } from "./lib/ui-roll-audio.js";
import { mount as mountRollFiles } from "./lib/ui-roll-file.js";
import { mount as mountRollStream } from "./lib/ui-roll-stream.js";
// A creator tab with onMount becomes mount-only and never calls the HTML renderer.
// This page global is called by the score's boot image, not by the tab lifecycle.
export function bootRollSound(){
  bootEditorLibrary();
  const fresh=window.__wwsRollClientRevision!==10;
  if(fresh||!window.__wwsRollSound)mountRollSound(()=>audio);
  if(fresh||!window.__wwsRollStream)mountRollStream();
  if(fresh||!window.__wwsRollFiles)mountRollFiles(()=>audio);
  if(fresh||!window.__wwsInstrument)mountInstrument(()=>audio);
  if(fresh||!window.__wwsSynth)mountSynth(()=>audio);
  window.__wwsRollClientRevision=10;
  const marker=document.getElementById("wwr-audio-boot");
  if(marker)marker.dataset.audioState="ready";
}

import { mount as mountNotation } from "./lib/ui-notation.js";
export function bootNotation(){mountNotation();}

import { boot as mountArrangement } from "./lib/arrangement-client.js";
export function bootArrangement(){mountArrangement(()=>typeof audio==="undefined"?null:audio);}
const EXPORTPREVIEW=require("lib/export-preview.js");
export function bootExportPreview(){return EXPORTPREVIEW.mount((x)=>EXPORTUI.buildZip(x,{}));}
export function exportPreviewAction(event,kind,op){bootExportPreview()?.action(event,kind,op);}

import { mount as mountDataWatch } from "./lib/ui-data-watch.js";
export function bootDataWatch(){mountDataWatch();}
import { watchEditors } from "./lib/ui-editor-lifecycle.js";
function connectEditorHosts(){return watchEditors([
 {id:'wws-data-watch',mount:bootDataWatch},
 {id:'sb-export-all-text',mount:bootExportPreview},
 {id:'sb-export-text',mount:bootExportPreview},
 {id:'wwarr2-data',mount:bootArrangement},
 {id:'wwr-audio-boot',mount:bootRollSound},
 {id:'wws-library-data',mount:bootEditorLibrary},
 {id:'sb-notation-count',mount:bootNotation}
]);}
if(typeof window!=="undefined"&&typeof document!=="undefined"){
 connectEditorHosts();
 if(window.__wwsEditorResume)window.removeEventListener('pageshow',window.__wwsEditorResume);
 window.__wwsEditorResume=()=>{if(!window.__wwsEditorHost)connectEditorHosts();};
 window.addEventListener('pageshow',window.__wwsEditorResume);
}

